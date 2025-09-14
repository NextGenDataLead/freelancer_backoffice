# Mollie Integration Guide for Multi-Tenant B2B SaaS

## Overview
This guide covers integrating Mollie payment processing into your multi-tenant B2B SaaS platform, replacing Stripe with Mollie's European-focused payment solutions.

---

## 🚀 Why Mollie for European B2B SaaS

### **Cost Advantages:**
- **EU Cards**: 1.80% + €0.25 (competitive with Stripe's 1.4% + €0.25)
- **SEPA Direct Debit**: €0.30 per transaction (vs Stripe's 1% capped at €5)
- **No monthly fees**: Pure pay-as-you-go pricing
- **No setup fees**: for standard integration

### **European Focus Benefits:**
- **Native PSD2/SCA compliance**: Built for European regulations
- **35+ local payment methods**: iDEAL, Bancontact, SOFORT, EPS, etc.
- **SEPA Direct Debit**: Native support with automatic mandate handling
- **Localized onboarding**: EU-specific compliance and languages

### **Technical Trade-offs:**
- **✅ Simpler pricing structure**: Transparent, no hidden fees
- **✅ Strong European payment methods**: Better than Stripe for EU
- **⚠️ Basic subscription features**: Less advanced than Stripe Billing
- **⚠️ No hosted customer portal**: Must build custom UI
- **⚠️ Limited marketplace docs**: Connect for Platforms needs enterprise contact

---

## 🔧 Technical Implementation

### **1. Installation & Setup**

```bash
# Install Mollie Node.js client
npm install @mollie/api-client

# For TypeScript support
npm install @types/node
```

### **2. Client Initialization**

```typescript
import createMollieClient from '@mollie/api-client';

const mollieClient = createMollieClient({
  apiKey: process.env.MOLLIE_API_KEY, // Live: live_... Test: test_...
});

// Recommended: Add to your service layer
export class MollieService {
  private client = createMollieClient({
    apiKey: process.env.MOLLIE_API_KEY!,
  });

  async createCustomer(tenantData: TenantData) {
    return await this.client.customers.create({
      name: tenantData.organizationName,
      email: tenantData.billingEmail,
      metadata: {
        tenantId: tenantData.id,
        environment: process.env.NODE_ENV,
      },
    });
  }
}
```

### **3. Subscription Management Schema Updates**

```sql
-- Update platform subscriptions for Mollie
ALTER TABLE tenant_platform_subscriptions 
  DROP COLUMN IF EXISTS stripe_subscription_id,
  DROP COLUMN IF EXISTS stripe_customer_id,
  ADD COLUMN mollie_subscription_id text UNIQUE,
  ADD COLUMN mollie_customer_id text;

-- Update payments for Mollie
ALTER TABLE platform_subscription_payments
  DROP COLUMN IF EXISTS stripe_invoice_id,
  DROP COLUMN IF EXISTS stripe_payment_intent_id,
  ADD COLUMN mollie_payment_id text,
  ADD COLUMN mollie_mandate_id text;

-- Add indexes for Mollie IDs
CREATE INDEX idx_tenant_platform_subs_mollie_sub 
  ON tenant_platform_subscriptions(mollie_subscription_id);
CREATE INDEX idx_platform_payments_mollie_payment 
  ON platform_subscription_payments(mollie_payment_id);
```

---

## 🔄 Subscription Workflow Implementation

### **1. Creating Platform Subscriptions**

```typescript
interface PlatformSubscriptionRequest {
  tenantId: string;
  planId: string;
  paymentMethod?: 'ideal' | 'bancontact' | 'creditcard' | 'directdebit';
  trialDays?: number;
}

export class SubscriptionService {
  async createPlatformSubscription(request: PlatformSubscriptionRequest) {
    const tenant = await this.getTenant(request.tenantId);
    const plan = await this.getPlatformPlan(request.planId);

    // 1. Create or get Mollie customer
    let mollieCustomer;
    if (!tenant.mollie_customer_id) {
      mollieCustomer = await mollieClient.customers.create({
        name: tenant.organization_name,
        email: tenant.billing_email,
        metadata: {
          tenantId: tenant.id,
          environment: process.env.NODE_ENV,
        },
      });
      
      // Save customer ID
      await this.updateTenant(tenant.id, {
        mollie_customer_id: mollieCustomer.id,
      });
    } else {
      mollieCustomer = await mollieClient.customers.get(tenant.mollie_customer_id);
    }

    // 2. Create subscription (Mollie's simpler approach)
    const mollieSubscription = await mollieClient.customers.createSubscription(mollieCustomer.id, {
      amount: {
        currency: 'EUR',
        value: plan.price.toFixed(2),
      },
      interval: plan.billing_interval, // 'monthly' or 'yearly'
      description: `${plan.name} subscription for ${tenant.organization_name}`,
      webhookUrl: `${process.env.APP_URL}/api/webhooks/mollie`,
      metadata: {
        tenantId: tenant.id,
        planId: plan.id,
      },
    });

    // 3. Save to database
    const subscription = await this.createTenantSubscription({
      tenant_id: tenant.id,
      plan_id: plan.id,
      mollie_subscription_id: mollieSubscription.id,
      mollie_customer_id: mollieCustomer.id,
      status: 'active',
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + (plan.billing_interval === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
    });

    return {
      subscription,
      checkoutUrl: mollieSubscription.links?.checkout?.href,
    };
  }
}
```

### **2. Webhook Handler Implementation**

```typescript
// /api/webhooks/mollie/route.ts
import { NextRequest, NextResponse } from 'next/server';
import createMollieClient from '@mollie/api-client';

const mollieClient = createMollieClient({
  apiKey: process.env.MOLLIE_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const payload = new URLSearchParams(body);
    const resourceId = payload.get('id');
    
    if (!resourceId) {
      return NextResponse.json({ error: 'No resource ID' }, { status: 400 });
    }

    // Mollie sends minimal data - must fetch full object
    if (resourceId.startsWith('tr_')) {
      // Payment webhook
      const payment = await mollieClient.payments.get(resourceId);
      await handlePaymentWebhook(payment);
    } else if (resourceId.startsWith('sub_')) {
      // Subscription webhook
      const subscription = await mollieClient.customers.getSubscription(
        payment.customerId!, // Mollie subscriptions are customer-scoped
        resourceId
      );
      await handleSubscriptionWebhook(subscription);
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Mollie webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handlePaymentWebhook(payment: any) {
  const tenantId = payment.metadata?.tenantId;
  if (!tenantId) return;

  await updatePaymentStatus({
    mollie_payment_id: payment.id,
    status: payment.status, // 'paid', 'failed', 'canceled', 'expired'
    amount: parseFloat(payment.amount.value),
    currency: payment.amount.currency,
    payment_date: payment.paidAt ? new Date(payment.paidAt) : null,
    failure_reason: payment.details?.failureReason || null,
  });

  // Handle subscription payment success/failure
  if (payment.status === 'paid' && payment.subscriptionId) {
    await handleSubscriptionPaymentSuccess(payment.subscriptionId, tenantId);
  } else if (payment.status === 'failed' && payment.subscriptionId) {
    await handleSubscriptionPaymentFailure(payment.subscriptionId, tenantId);
  }
}

async function handleSubscriptionWebhook(subscription: any) {
  const tenantId = subscription.metadata?.tenantId;
  if (!tenantId) return;

  await updateSubscriptionStatus({
    mollie_subscription_id: subscription.id,
    status: subscription.status, // 'active', 'canceled', 'suspended', 'completed'
    current_period_start: new Date(subscription.nextPaymentDate),
    current_period_end: new Date(
      new Date(subscription.nextPaymentDate).getTime() + 
      (subscription.interval.includes('month') ? 30 : 365) * 24 * 60 * 60 * 1000
    ),
  });
}
```

### **3. Payment Method Management**

```typescript
// Since Mollie doesn't have a unified payment method system like Stripe,
// handle different European payment methods directly

export class PaymentMethodService {
  async createPaymentForSubscription(
    subscriptionId: string, 
    paymentMethod: 'ideal' | 'bancontact' | 'directdebit' | 'creditcard'
  ) {
    const subscription = await this.getSubscription(subscriptionId);
    
    const payment = await mollieClient.customers.createPayment(subscription.mollie_customer_id, {
      amount: {
        currency: 'EUR',
        value: subscription.amount.toFixed(2),
      },
      description: `Subscription payment - ${subscription.plan_name}`,
      redirectUrl: `${process.env.APP_URL}/dashboard/billing/success`,
      webhookUrl: `${process.env.APP_URL}/api/webhooks/mollie`,
      method: paymentMethod,
      sequenceType: 'recurring', // For subscription payments
      metadata: {
        tenantId: subscription.tenant_id,
        subscriptionId: subscription.id,
      },
    });

    return payment;
  }

  // For SEPA Direct Debit (popular in EU)
  async setupDirectDebitMandate(customerId: string, tenantId: string) {
    const mandate = await mollieClient.customers.createMandate(customerId, {
      method: 'directdebit',
      consumerName: 'Tenant Organization Name',
      consumerAccount: 'NL53INGB0618033988', // IBAN
      webhookUrl: `${process.env.APP_URL}/api/webhooks/mollie`,
      metadata: {
        tenantId,
      },
    });

    return mandate;
  }
}
```

---

## 🛡️ Security & Compliance Considerations

### **Webhook Security**
```typescript
// Mollie webhook verification (simpler than Stripe)
export function verifyMollieWebhook(payload: string, signature: string): boolean {
  // Mollie uses simpler webhook verification
  // For production, implement proper signature verification
  const expectedSignature = crypto
    .createHmac('sha256', process.env.MOLLIE_WEBHOOK_SECRET!)
    .update(payload)
    .digest('hex');
    
  return signature === expectedSignature;
}
```

### **GDPR Compliance**
- Mollie handles PCI compliance for payment data
- Customer data stored in Mollie can be deleted via API
- Metadata fields should not contain PII for external subscriptions
- SEPA mandates automatically comply with EU regulations

### **Rate Limiting**
```typescript
// Mollie rate limit: 60 requests per minute per API key
const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // Leave buffer for other operations
  message: 'Too many requests to Mollie API',
});
```

---

## 📊 Migration Strategy from Stripe

### **Phase 1: Dual Integration (Recommended)**
```typescript
// Support both payment providers during transition
export class PaymentProviderService {
  private stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
  private mollieClient = createMollieClient({
    apiKey: process.env.MOLLIE_API_KEY!,
  });

  async createSubscription(tenantId: string, planId: string, provider: 'stripe' | 'mollie') {
    if (provider === 'mollie') {
      return this.createMollieSubscription(tenantId, planId);
    } else {
      return this.createStripeSubscription(tenantId, planId);
    }
  }
}
```

### **Phase 2: Feature Mapping**
| Stripe Feature | Mollie Alternative | Implementation Notes |
|---|---|---|
| Stripe Connect | Connect for Platforms | Requires enterprise contact |
| Customer Portal | Custom UI | Build subscription management interface |
| Billing Portal | Custom implementation | Payment method updates, invoices |
| Proration | Manual calculation | Implement proration logic |
| Usage-based billing | Custom tracking | Track usage, create charges |
| Multiple subscriptions | Multiple Mollie subscriptions | Handle separately |

### **Phase 3: Data Migration**
```sql
-- Migration script for existing Stripe data
UPDATE tenant_platform_subscriptions 
SET mollie_customer_id = 'cst_new_mollie_id'
WHERE stripe_customer_id = 'cus_stripe_id';

-- Keep both IDs during transition period for rollback capability
```

---

## 🎯 Recommended Implementation Approach

### **For your B2B SaaS, I recommend:**

1. **Start with Mollie for EU tenants**: Lower SEPA costs, better EU compliance
2. **Keep Stripe for non-EU**: Global coverage, advanced features
3. **Custom subscription portal**: Build once, works with both providers
4. **Gradual migration**: Move existing EU customers over time

### **Next Steps:**
1. Set up Mollie test environment
2. Implement basic subscription creation
3. Build custom billing portal
4. Test SEPA Direct Debit integration
5. Implement webhook handling
6. Plan gradual customer migration

This approach gives you the cost benefits of Mollie for European customers while maintaining Stripe's advanced features for complex billing scenarios.

---

*Mollie Integration Guide Created: 2025-01-10*  
*Focus: European B2B SaaS Multi-tenant Architecture*  
*Recommendation: Hybrid approach with gradual migration*