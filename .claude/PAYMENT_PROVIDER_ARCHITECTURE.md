# Payment Provider Architecture - Extensible Design

## Overview
This document outlines a **payment provider abstraction layer** that implements **Mollie-only** functionality while being easily extensible to support **Stripe** and other providers in the future.

---

## 🏗️ Architecture Principles

### **1. Provider Abstraction**
- **Single interface** for all payment operations
- **Provider-specific implementations** behind common interface
- **Database schema** supports multiple providers without migration
- **Configuration-driven** provider selection

### **2. Current State**
- **✅ Mollie implementation**: Full feature set
- **🚧 Stripe interface**: Defined but not implemented
- **🔄 Easy extension**: Add new providers with minimal changes

### **3. Future Extensibility**
- **Zero downtime** provider additions
- **Tenant-level** provider selection
- **A/B testing** between providers
- **Gradual migration** capabilities

---

## 💾 Database Schema Design

### **Multi-Provider Platform Subscriptions**
```sql
-- Enhanced platform subscriptions supporting multiple providers
CREATE TABLE platform_subscription_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    price numeric NOT NULL CHECK (price >= 0),
    billing_interval text NOT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
    features jsonb DEFAULT '{}',
    limits jsonb DEFAULT '{}',
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    
    -- Multi-provider support
    supported_providers text[] DEFAULT ARRAY['mollie'], -- Future: ['mollie', 'stripe']
    provider_configs jsonb DEFAULT '{}', -- Provider-specific configurations
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Platform subscription instances with provider abstraction
CREATE TABLE tenant_platform_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id uuid NOT NULL REFERENCES platform_subscription_plans(id),
    
    -- Provider abstraction
    payment_provider text NOT NULL DEFAULT 'mollie' CHECK (payment_provider IN ('mollie', 'stripe')),
    
    -- Generic subscription data
    status text NOT NULL DEFAULT 'active' CHECK (status IN (
        'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'suspended'
    )),
    current_period_start timestamp with time zone NOT NULL,
    current_period_end timestamp with time zone NOT NULL,
    trial_start timestamp with time zone,
    trial_end timestamp with time zone,
    canceled_at timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false,
    
    -- Provider-specific data (flexible JSON structure)
    provider_data jsonb DEFAULT '{}', -- Store provider-specific IDs and metadata
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT valid_trial_period CHECK (trial_start IS NULL OR trial_end IS NULL OR trial_start <= trial_end),
    CONSTRAINT valid_billing_period CHECK (current_period_start <= current_period_end)
);

-- Example provider_data structures:
-- Mollie: {"subscription_id": "sub_123", "customer_id": "cst_456", "mandate_id": "mdt_789"}
-- Stripe: {"subscription_id": "sub_123", "customer_id": "cus_456", "payment_method_id": "pm_789"}

-- Payment records with provider abstraction
CREATE TABLE platform_subscription_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id uuid NOT NULL REFERENCES tenant_platform_subscriptions(id),
    
    -- Provider abstraction
    payment_provider text NOT NULL CHECK (payment_provider IN ('mollie', 'stripe')),
    
    -- Generic payment data
    amount numeric NOT NULL,
    currency text DEFAULT 'EUR',
    status text NOT NULL CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'canceled', 'refunded')),
    payment_date timestamp with time zone,
    failure_reason text,
    description text,
    
    -- Provider-specific data
    provider_data jsonb DEFAULT '{}', -- Store provider-specific IDs and metadata
    
    created_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Example provider_data for payments:
-- Mollie: {"payment_id": "tr_123", "mandate_id": "mdt_456"}
-- Stripe: {"payment_intent_id": "pi_123", "invoice_id": "in_456", "charge_id": "ch_789"}
```

---

## 🔧 Payment Provider Interface

### **Abstract Payment Provider Interface**
```typescript
// src/lib/payments/types.ts
export interface PaymentProvider {
  readonly name: 'mollie' | 'stripe';
  
  // Customer Management
  createCustomer(data: CreateCustomerRequest): Promise<CustomerResponse>;
  getCustomer(customerId: string): Promise<CustomerResponse>;
  updateCustomer(customerId: string, data: UpdateCustomerRequest): Promise<CustomerResponse>;
  deleteCustomer(customerId: string): Promise<void>;
  
  // Subscription Management
  createSubscription(data: CreateSubscriptionRequest): Promise<SubscriptionResponse>;
  getSubscription(subscriptionId: string): Promise<SubscriptionResponse>;
  updateSubscription(subscriptionId: string, data: UpdateSubscriptionRequest): Promise<SubscriptionResponse>;
  cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<SubscriptionResponse>;
  
  // Payment Management
  createPayment(data: CreatePaymentRequest): Promise<PaymentResponse>;
  getPayment(paymentId: string): Promise<PaymentResponse>;
  refundPayment(paymentId: string, amount?: number): Promise<RefundResponse>;
  
  // Webhook Processing
  processWebhook(payload: string, signature: string): Promise<WebhookEvent>;
  verifyWebhook(payload: string, signature: string): boolean;
  
  // Provider-specific features
  getCapabilities(): ProviderCapabilities;
  getSupportedPaymentMethods(): string[];
}

// Standardized request/response types
export interface CreateCustomerRequest {
  name: string;
  email: string;
  metadata?: Record<string, any>;
}

export interface CustomerResponse {
  id: string;
  name: string;
  email: string;
  provider: 'mollie' | 'stripe';
  providerData: Record<string, any>;
  createdAt: Date;
}

export interface CreateSubscriptionRequest {
  customerId: string;
  planId: string;
  amount: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  description: string;
  trialDays?: number;
  metadata?: Record<string, any>;
}

export interface SubscriptionResponse {
  id: string;
  customerId: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
  amount: number;
  currency: string;
  interval: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  canceledAt?: Date;
  provider: 'mollie' | 'stripe';
  providerData: Record<string, any>;
  checkoutUrl?: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  provider: 'mollie' | 'stripe';
  data: Record<string, any>;
  processedAt: Date;
}

export interface ProviderCapabilities {
  subscriptions: boolean;
  oneTimePayments: boolean;
  refunds: boolean;
  partialRefunds: boolean;
  hostedCheckout: boolean;
  customerPortal: boolean;
  webhooks: boolean;
  marketplace: boolean;
  supportedCurrencies: string[];
  supportedCountries: string[];
}
```

### **Payment Provider Factory**
```typescript
// src/lib/payments/payment-provider-factory.ts
import { PaymentProvider } from './types';
import { MollieProvider } from './providers/mollie-provider';
import { StripeProvider } from './providers/stripe-provider'; // Future implementation

export class PaymentProviderFactory {
  private static providers = new Map<string, PaymentProvider>();
  
  static initialize() {
    // Register available providers
    this.registerProvider(new MollieProvider());
    
    // Future: this.registerProvider(new StripeProvider());
  }
  
  private static registerProvider(provider: PaymentProvider) {
    this.providers.set(provider.name, provider);
  }
  
  static getProvider(name: 'mollie' | 'stripe'): PaymentProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Payment provider '${name}' not found or not registered`);
    }
    return provider;
  }
  
  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
  
  static getDefaultProvider(): PaymentProvider {
    // Currently defaults to Mollie, configurable via environment
    const defaultProviderName = process.env.DEFAULT_PAYMENT_PROVIDER || 'mollie';
    return this.getProvider(defaultProviderName as 'mollie' | 'stripe');
  }
  
  static getProviderForTenant(tenantId: string): PaymentProvider {
    // Future: tenant-specific provider selection logic
    // For now, everyone gets Mollie
    return this.getProvider('mollie');
  }
}
```

---

## 🔧 Mollie Implementation (Current)

### **Mollie Provider Implementation**
```typescript
// src/lib/payments/providers/mollie-provider.ts
import createMollieClient from '@mollie/api-client';
import { PaymentProvider, CreateCustomerRequest, CustomerResponse, CreateSubscriptionRequest, SubscriptionResponse } from '../types';

export class MollieProvider implements PaymentProvider {
  readonly name = 'mollie' as const;
  private client = createMollieClient({
    apiKey: process.env.MOLLIE_API_KEY!,
  });
  
  async createCustomer(data: CreateCustomerRequest): Promise<CustomerResponse> {
    const mollieCustomer = await this.client.customers.create({
      name: data.name,
      email: data.email,
      metadata: data.metadata || {},
    });
    
    return {
      id: mollieCustomer.id,
      name: mollieCustomer.name!,
      email: mollieCustomer.email!,
      provider: 'mollie',
      providerData: {
        mollieId: mollieCustomer.id,
        locale: mollieCustomer.locale,
      },
      createdAt: new Date(mollieCustomer.createdAt!),
    };
  }
  
  async createSubscription(data: CreateSubscriptionRequest): Promise<SubscriptionResponse> {
    const mollieSubscription = await this.client.customers.createSubscription(data.customerId, {
      amount: {
        currency: data.currency,
        value: data.amount.toFixed(2),
      },
      interval: data.interval,
      description: data.description,
      webhookUrl: `${process.env.APP_URL}/api/webhooks/mollie`,
      metadata: data.metadata || {},
    });
    
    return {
      id: mollieSubscription.id,
      customerId: data.customerId,
      status: this.mapMollieStatus(mollieSubscription.status),
      amount: data.amount,
      currency: data.currency,
      interval: data.interval,
      currentPeriodStart: new Date(), // Mollie doesn't provide this directly
      currentPeriodEnd: new Date(Date.now() + (data.interval === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
      provider: 'mollie',
      providerData: {
        subscriptionId: mollieSubscription.id,
        nextPaymentDate: mollieSubscription.nextPaymentDate,
      },
      checkoutUrl: mollieSubscription.links?.checkout?.href,
    };
  }
  
  async processWebhook(payload: string, signature: string): Promise<WebhookEvent> {
    // Mollie webhook processing (pull-based)
    const params = new URLSearchParams(payload);
    const resourceId = params.get('id');
    
    if (!resourceId) {
      throw new Error('Invalid webhook payload');
    }
    
    let eventData: any;
    let eventType: string;
    
    if (resourceId.startsWith('tr_')) {
      // Payment webhook
      eventData = await this.client.payments.get(resourceId);
      eventType = `payment.${eventData.status}`;
    } else if (resourceId.startsWith('sub_')) {
      // Subscription webhook - need customer ID
      const payment = await this.client.payments.get(resourceId);
      eventData = await this.client.customers.getSubscription(payment.customerId!, resourceId);
      eventType = `subscription.${eventData.status}`;
    } else {
      throw new Error('Unknown resource type');
    }
    
    return {
      id: resourceId,
      type: eventType,
      provider: 'mollie',
      data: eventData,
      processedAt: new Date(),
    };
  }
  
  getCapabilities(): ProviderCapabilities {
    return {
      subscriptions: true,
      oneTimePayments: true,
      refunds: true,
      partialRefunds: true,
      hostedCheckout: true,
      customerPortal: false, // Mollie doesn't provide this
      webhooks: true,
      marketplace: true, // Via Connect for Platforms
      supportedCurrencies: ['EUR', 'USD', 'GBP', 'CHF', 'PLN'],
      supportedCountries: ['NL', 'BE', 'DE', 'AT', 'FR', 'ES', 'IT', 'PL', 'CH'],
    };
  }
  
  getSupportedPaymentMethods(): string[] {
    return ['ideal', 'bancontact', 'sofort', 'creditcard', 'directdebit', 'paypal', 'klarna'];
  }
  
  private mapMollieStatus(status: string): 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' {
    switch (status) {
      case 'active': return 'active';
      case 'canceled': return 'canceled';
      case 'suspended': return 'past_due';
      case 'completed': return 'canceled';
      default: return 'unpaid';
    }
  }
  
  // Implement remaining interface methods...
  async getCustomer(customerId: string): Promise<CustomerResponse> { /* ... */ }
  async updateCustomer(customerId: string, data: UpdateCustomerRequest): Promise<CustomerResponse> { /* ... */ }
  async deleteCustomer(customerId: string): Promise<void> { /* ... */ }
  async getSubscription(subscriptionId: string): Promise<SubscriptionResponse> { /* ... */ }
  async updateSubscription(subscriptionId: string, data: UpdateSubscriptionRequest): Promise<SubscriptionResponse> { /* ... */ }
  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<SubscriptionResponse> { /* ... */ }
  async createPayment(data: CreatePaymentRequest): Promise<PaymentResponse> { /* ... */ }
  async getPayment(paymentId: string): Promise<PaymentResponse> { /* ... */ }
  async refundPayment(paymentId: string, amount?: number): Promise<RefundResponse> { /* ... */ }
  verifyWebhook(payload: string, signature: string): boolean { /* ... */ }
}
```

---

## 🚧 Stripe Interface (Future Implementation)

### **Stripe Provider Stub**
```typescript
// src/lib/payments/providers/stripe-provider.ts
export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe' as const;
  
  // TODO: Implement when Stripe integration is needed
  async createCustomer(data: CreateCustomerRequest): Promise<CustomerResponse> {
    throw new Error('Stripe provider not yet implemented');
  }
  
  getCapabilities(): ProviderCapabilities {
    return {
      subscriptions: true,
      oneTimePayments: true,
      refunds: true,
      partialRefunds: true,
      hostedCheckout: true,
      customerPortal: true, // Stripe's advantage
      webhooks: true,
      marketplace: true,
      supportedCurrencies: ['EUR', 'USD', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'DKK', 'NOK', 'SEK', 'PLN'],
      supportedCountries: ['US', 'CA', 'GB', 'AU', 'NZ', 'SG', 'HK', 'JP', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'AT', 'CH', 'DK', 'NO', 'SE', 'FI', 'PL'],
    };
  }
  
  getSupportedPaymentMethods(): string[] {
    return ['card', 'sepa_debit', 'ideal', 'bancontact', 'sofort', 'giropay', 'eps', 'p24', 'paypal', 'klarna'];
  }
  
  // All other methods throw "not implemented" for now
}
```

---

## 🔄 Service Layer Implementation

### **Subscription Service with Provider Abstraction**
```typescript
// src/lib/services/subscription-service.ts
import { PaymentProviderFactory } from '../payments/payment-provider-factory';

export class SubscriptionService {
  async createPlatformSubscription(request: CreatePlatformSubscriptionRequest) {
    const { tenantId, planId, paymentProvider = 'mollie' } = request;
    
    // Get the appropriate payment provider
    const provider = PaymentProviderFactory.getProvider(paymentProvider);
    
    // Get tenant and plan data
    const tenant = await this.getTenant(tenantId);
    const plan = await this.getPlatformPlan(planId);
    
    // Create or get customer through provider abstraction
    let customer;
    const existingSubscription = await this.getTenantSubscription(tenantId);
    
    if (existingSubscription?.provider_data?.customer_id) {
      customer = await provider.getCustomer(existingSubscription.provider_data.customer_id);
    } else {
      customer = await provider.createCustomer({
        name: tenant.organization_name,
        email: tenant.billing_email,
        metadata: {
          tenantId: tenant.id,
          environment: process.env.NODE_ENV,
        },
      });
    }
    
    // Create subscription through provider
    const providerSubscription = await provider.createSubscription({
      customerId: customer.id,
      planId: plan.id,
      amount: plan.price,
      currency: 'EUR',
      interval: plan.billing_interval,
      description: `${plan.name} subscription for ${tenant.organization_name}`,
      metadata: {
        tenantId: tenant.id,
        planId: plan.id,
      },
    });
    
    // Save to database with provider abstraction
    const subscription = await this.saveTenantSubscription({
      tenant_id: tenantId,
      plan_id: planId,
      payment_provider: paymentProvider,
      status: providerSubscription.status,
      current_period_start: providerSubscription.currentPeriodStart,
      current_period_end: providerSubscription.currentPeriodEnd,
      trial_end: providerSubscription.trialEnd,
      provider_data: {
        subscription_id: providerSubscription.id,
        customer_id: customer.id,
        ...providerSubscription.providerData,
      },
    });
    
    return {
      subscription,
      checkoutUrl: providerSubscription.checkoutUrl,
    };
  }
  
  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd = true) {
    const subscription = await this.getSubscription(subscriptionId);
    const provider = PaymentProviderFactory.getProvider(subscription.payment_provider);
    
    const providerSubscription = await provider.cancelSubscription(
      subscription.provider_data.subscription_id,
      cancelAtPeriodEnd
    );
    
    // Update database
    await this.updateSubscription(subscriptionId, {
      status: providerSubscription.status,
      canceled_at: providerSubscription.canceledAt,
      cancel_at_period_end: cancelAtPeriodEnd,
    });
    
    return providerSubscription;
  }
}
```

### **Universal Webhook Handler**
```typescript
// src/app/api/webhooks/[provider]/route.ts
import { PaymentProviderFactory } from '@/lib/payments/payment-provider-factory';

export async function POST(
  request: Request,
  { params }: { params: { provider: string } }
) {
  try {
    const providerName = params.provider as 'mollie' | 'stripe';
    const provider = PaymentProviderFactory.getProvider(providerName);
    
    const payload = await request.text();
    const signature = request.headers.get('authorization') || request.headers.get('mollie-signature') || '';
    
    // Verify webhook signature
    if (!provider.verifyWebhook(payload, signature)) {
      return new Response('Invalid signature', { status: 400 });
    }
    
    // Process webhook event
    const webhookEvent = await provider.processWebhook(payload, signature);
    
    // Handle event based on type (provider-agnostic)
    await this.handleWebhookEvent(webhookEvent);
    
    return new Response('OK');
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response('Webhook processing failed', { status: 500 });
  }
}

async function handleWebhookEvent(event: WebhookEvent) {
  switch (event.type) {
    case 'payment.paid':
    case 'payment_intent.succeeded': // Stripe equivalent
      await handlePaymentSuccess(event);
      break;
      
    case 'payment.failed':
    case 'payment_intent.payment_failed': // Stripe equivalent
      await handlePaymentFailure(event);
      break;
      
    case 'subscription.active':
    case 'customer.subscription.created': // Stripe equivalent
      await handleSubscriptionActivated(event);
      break;
      
    case 'subscription.canceled':
    case 'customer.subscription.deleted': // Stripe equivalent
      await handleSubscriptionCanceled(event);
      break;
      
    default:
      console.log(`Unhandled webhook event type: ${event.type}`);
  }
}
```

---

## 🎯 Future Stripe Integration

### **Adding Stripe Later (Zero Downtime)**
```typescript
// 1. Implement StripeProvider class
// 2. Register in PaymentProviderFactory
// 3. Update environment configuration
// 4. No database migration needed!

PaymentProviderFactory.initialize();
// Now automatically supports both providers

// Tenant-specific provider selection
const provider = PaymentProviderFactory.getProviderForTenant(tenantId);
// Can return either Mollie or Stripe based on tenant preferences
```

### **Migration Strategy**
```typescript
// src/lib/services/migration-service.ts
export class PaymentProviderMigrationService {
  async migrateSubscriptionToStripe(subscriptionId: string) {
    const subscription = await this.getSubscription(subscriptionId);
    
    if (subscription.payment_provider === 'stripe') {
      throw new Error('Subscription already uses Stripe');
    }
    
    // 1. Create Stripe customer
    const stripeProvider = PaymentProviderFactory.getProvider('stripe');
    const stripeCustomer = await stripeProvider.createCustomer({...});
    
    // 2. Cancel Mollie subscription
    const mollieProvider = PaymentProviderFactory.getProvider('mollie');
    await mollieProvider.cancelSubscription(subscription.provider_data.subscription_id);
    
    // 3. Create Stripe subscription
    const stripeSubscription = await stripeProvider.createSubscription({...});
    
    // 4. Update database record
    await this.updateSubscription(subscriptionId, {
      payment_provider: 'stripe',
      provider_data: {
        subscription_id: stripeSubscription.id,
        customer_id: stripeCustomer.id,
        // Migration metadata
        migrated_from: 'mollie',
        migrated_at: new Date(),
      },
    });
  }
}
```

---

## ✅ Implementation Benefits

### **Current (Mollie-only) Benefits:**
✅ **Clean abstraction**: All payment logic isolated  
✅ **Type-safe**: Full TypeScript interfaces  
✅ **Testable**: Easy to mock payment providers  
✅ **Maintainable**: Single service layer API  
✅ **Provider-agnostic**: Database and business logic independent  

### **Future Extension Benefits:**
✅ **Zero downtime**: Add Stripe without database changes  
✅ **A/B testing**: Test providers per tenant  
✅ **Gradual migration**: Move tenants provider by provider  
✅ **Best of both**: Use Mollie for EU, Stripe for global  
✅ **Risk mitigation**: Multi-provider redundancy  

This architecture gives you **Mollie's cost benefits now** with **Stripe's advanced features later**, all behind a clean, maintainable abstraction layer!

---

*Payment Provider Architecture Created: 2025-01-10*  
*Current: Mollie-only implementation*  
*Future: Easy Stripe extension*