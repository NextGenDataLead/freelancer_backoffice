# Nested SaaS Subscription Architecture Analysis

## Overview
This system requires **three-tier subscription management** to support:
1. **Your SaaS Platform** billing tenants
2. **Tenant SaaS Products** billing their clients  
3. **Flexible subscription models** for all levels

---

## Current Database State

### ✅ What Exists:
- `tenants` table with basic `subscription_status`
- `clients` table (tenant's customers) with invoicing capability
- Basic tenant isolation via RLS

### ❌ What's Missing:
- **No subscription plans/tiers for any level**
- **No payment provider integration**
- **No billing cycle management**
- **No usage tracking or limits enforcement**

---

## Required Architecture: 3-Tier Subscription System

### **Level 1: Platform → Tenants**
Your SaaS platform charges tenants for using your system.

```sql
-- Platform subscription plans with multi-provider support (your revenue model)
CREATE TABLE platform_subscription_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL, -- 'Starter', 'Professional', 'Enterprise'
    description text,
    price numeric NOT NULL,
    billing_interval text NOT NULL, -- 'monthly', 'yearly'
    features jsonb DEFAULT '{}', -- {"max_clients": 50, "api_calls": 10000}
    limits jsonb DEFAULT '{}', -- {"storage_gb": 10, "users": 5}
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    
    -- Multi-provider support (extensible for Stripe later)
    supported_providers text[] DEFAULT ARRAY['mollie'], -- Future: ['mollie', 'stripe']
    provider_configs jsonb DEFAULT '{}', -- Provider-specific configurations
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enhanced tenant subscriptions with provider abstraction (replaces basic subscription_status)
CREATE TABLE tenant_platform_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id uuid NOT NULL REFERENCES platform_subscription_plans(id),
    
    -- Provider abstraction (extensible for Stripe later)
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
    
    -- Provider-specific data (flexible for any provider)
    provider_data jsonb DEFAULT '{}', -- Mollie: {"subscription_id": "sub_123", "customer_id": "cst_456"}
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT valid_trial_period CHECK (trial_start IS NULL OR trial_end IS NULL OR trial_start <= trial_end),
    CONSTRAINT valid_billing_period CHECK (current_period_start <= current_period_end)
);
```

### **Level 2: Tenants → External SaaS Revenue**
Tenants can track revenue from their own SaaS platforms while maintaining GDPR compliance.

```sql
-- GDPR-compliant external subscription tracking (revenue only)
CREATE TABLE tenant_external_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- GDPR-safe customer identification (no PII)
    external_customer_id text NOT NULL, -- Tenant's anonymized customer ID
    subscription_category text NOT NULL, -- 'software', 'service', 'consultation'
    subscription_name text NOT NULL, -- 'Pro Plan', 'Enterprise Support'
    
    -- Revenue tracking data
    monthly_revenue numeric NOT NULL CHECK (monthly_revenue >= 0),
    currency text DEFAULT 'EUR',
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'paused', 'trial')),
    
    -- Minimal subscription metadata (no personal data)
    billing_cycle text DEFAULT 'monthly', -- 'monthly', 'yearly', 'one-time'
    subscription_tier text, -- 'basic', 'pro', 'enterprise'
    
    -- Timestamps
    subscription_start_date timestamp with time zone NOT NULL,
    last_updated timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    
    -- Constraints
    CONSTRAINT unique_tenant_external_customer UNIQUE (tenant_id, external_customer_id),
    CONSTRAINT valid_customer_id CHECK (length(trim(external_customer_id)) >= 3),
    CONSTRAINT no_pii_in_customer_id CHECK (external_customer_id ~ '^[a-zA-Z0-9_-]+$') -- Only alphanumeric, no email/names
);

-- Revenue analytics aggregation table
CREATE TABLE tenant_revenue_analytics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Time period
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    
    -- Aggregated metrics (no individual customer data)
    total_monthly_revenue numeric DEFAULT 0,
    active_subscriptions_count integer DEFAULT 0,
    new_subscriptions_count integer DEFAULT 0,
    cancelled_subscriptions_count integer DEFAULT 0,
    
    -- Category breakdown
    revenue_by_category jsonb DEFAULT '{}', -- {"software": 1500, "service": 800}
    subscriptions_by_tier jsonb DEFAULT '{}', -- {"basic": 10, "pro": 5, "enterprise": 2}
    
    created_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT valid_period CHECK (period_start <= period_end)
);
```

### **Level 3: Platform Payment Management**
Payment tracking for platform subscriptions only (tenant external revenue is tracked separately).

```sql
-- Platform subscription payments with provider abstraction
CREATE TABLE platform_subscription_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id uuid NOT NULL REFERENCES tenant_platform_subscriptions(id),
    
    -- Provider abstraction (extensible for Stripe later)
    payment_provider text NOT NULL CHECK (payment_provider IN ('mollie', 'stripe')),
    
    -- Generic payment data
    amount numeric NOT NULL,
    currency text DEFAULT 'EUR',
    status text NOT NULL CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'canceled', 'refunded')),
    payment_date timestamp with time zone,
    failure_reason text,
    description text,
    
    -- Provider-specific data (flexible for any provider)
    provider_data jsonb DEFAULT '{}', -- Mollie: {"payment_id": "tr_123", "mandate_id": "mdt_456"}
    
    created_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Usage tracking for platform limits enforcement
CREATE TABLE platform_usage_tracking (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    
    -- Platform usage (your limits)
    api_calls integer DEFAULT 0,
    storage_used_gb numeric DEFAULT 0,
    active_users integer DEFAULT 0,
    
    -- Tenant's platform business metrics
    clients_count integer DEFAULT 0,
    time_entries_count integer DEFAULT 0,
    invoices_sent integer DEFAULT 0,
    
    -- External SaaS metrics (aggregated, no PII)
    external_saas_revenue numeric DEFAULT 0,
    external_subscriptions_count integer DEFAULT 0,
    
    created_at timestamp with time zone DEFAULT now()
);
```

---

## Business Model Benefits

### **For You (Platform Owner):**
- Recurring revenue from tenant subscriptions
- Usage-based pricing models
- Plan upgrades/downgrades
- Complete billing automation

### **For Tenants:**
- Can monetize their client relationships
- Subscription revenue in addition to hourly billing
- Professional billing management
- Client retention through subscriptions

### **For Clients:**
- Predictable pricing for ongoing services
- Service bundles and packages
- Professional subscription management
- Multiple payment options

---

## Implementation Priority

### **Phase 1: Platform Subscriptions (Your Revenue)**
1. `platform_subscription_plans` table
2. `tenant_platform_subscriptions` table  
3. Basic Stripe integration
4. Usage limits enforcement

### **Phase 2: Tenant Products**
1. `tenant_subscription_products` table
2. Product management interface
3. Pricing configuration tools

### **Phase 3: External Revenue Tracking** 
1. `tenant_external_subscriptions` table (GDPR-compliant)
2. Revenue analytics and reporting interface
3. API integration for external SaaS platforms

### **Phase 4: Advanced Features**
1. `platform_subscription_payments` unified tracking
2. `tenant_revenue_analytics` advanced analytics
3. Revenue forecasting models
4. Multi-currency support

---

## Technical Considerations

### **RLS Policies Required:**
- All tables need tenant isolation
- Clients can only see their own subscriptions
- Platform admin access for your subscriptions

### **API Endpoints Needed:**
```
/api/platform/subscriptions     # Your tenant billing
/api/tenant/products           # Tenant product management  
/api/tenant/external-revenue   # External SaaS revenue tracking (GDPR-safe)
/api/tenant/analytics          # Revenue analytics dashboard
```

### **Webhook Integration:**
- **Provider-agnostic webhook handling**: `/api/webhooks/[provider]`
- **Mollie webhooks**: Pull-based payment/subscription events
- **Future Stripe webhooks**: Push-based event system
- **Automatic subscription status updates** across all providers
- **Usage limit notifications** and billing failure handling

---

*Analysis Date: 2025-01-10*  
*Database: Supabase PostgreSQL*  
*Architecture: Nested Multi-Tenant B2B SaaS*