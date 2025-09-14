# Phase 2: Tenant Product Management Implementation

## Overview
Enable tenants to create, manage, and monetize their own subscription products for their existing clients, transforming your platform into a SaaS enablement tool.

## 📋 Reference Architecture Documents
This implementation follows the architectural decisions outlined in:
- **[Nested SaaS Subscription Architecture](./../NESTED_SAAS_SUBSCRIPTION_ARCHITECTURE.md)**: Multi-level subscription system design
- **[Nested SaaS Implementation Plan](./../NESTED_SAAS_IMPLEMENTATION_PLAN.md)**: Overall project roadmap and Phase 2 details
- **[Payment Provider Architecture](./../PAYMENT_PROVIDER_ARCHITECTURE.md)**: Provider abstraction for tenant products
- **[Extensible Implementation Plan](./../EXTENSIBLE_IMPLEMENTATION_PLAN.md)**: Provider-agnostic implementation strategy

---

## 📋 Detailed Task Breakdown

### **Product Creation System (Week 1-2)**

#### **Task 2.1: Tenant Subscription Products Table**
- [ ] Create migration `017_create_tenant_subscription_products.sql`
- [ ] Define product structure with flexible pricing
- [ ] Add JSONB features and metadata fields
- [ ] Include product categories and tags
- [ ] Add product status and lifecycle management
- [ ] Create search and filtering indexes

**SQL Schema:**
```sql
CREATE TABLE tenant_subscription_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by uuid NOT NULL REFERENCES profiles(id),
    
    -- Product Details
    name text NOT NULL,
    description text,
    short_description text,
    category text DEFAULT 'service', -- 'service', 'software', 'consultation', 'support'
    tags text[] DEFAULT '{}',
    
    -- Pricing Configuration
    price numeric NOT NULL CHECK (price >= 0),
    billing_interval text NOT NULL 
        CHECK (billing_interval IN ('monthly', 'yearly', 'weekly', 'one-time')),
    setup_fee numeric DEFAULT 0 CHECK (setup_fee >= 0),
    trial_period_days integer DEFAULT 0 CHECK (trial_period_days >= 0),
    
    -- Features and Benefits
    features jsonb DEFAULT '{}', -- {"hours_included": 10, "support_level": "premium"}
    benefits text[],
    limitations text[],
    
    -- Product Management
    is_active boolean DEFAULT true,
    is_featured boolean DEFAULT false,
    max_subscribers integer, -- NULL for unlimited
    sort_order integer DEFAULT 0,
    
    -- Marketing
    image_url text,
    marketing_copy text,
    terms_of_service text,
    
    -- Integration (provider-agnostic)
    provider_integrations jsonb DEFAULT '{}', -- {"mollie": {"plan_id": "..."}, "stripe": {"price_id": "..."}}
    external_product_id text,
    
    -- Audit
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    archived_at timestamp with time zone,
    
    -- Constraints
    CONSTRAINT unique_tenant_product_name UNIQUE (tenant_id, name) 
        WHERE archived_at IS NULL,
    CONSTRAINT valid_product_name CHECK (length(trim(name)) >= 2),
    CONSTRAINT valid_billing_interval_price CHECK (
        (billing_interval = 'one-time' AND price > 0) OR
        (billing_interval != 'one-time' AND price >= 0)
    )
);

-- Indexes for performance
CREATE INDEX idx_tenant_products_tenant_active ON tenant_subscription_products(tenant_id) 
    WHERE is_active = true AND archived_at IS NULL;
CREATE INDEX idx_tenant_products_category ON tenant_subscription_products(category);
CREATE INDEX idx_tenant_products_search ON tenant_subscription_products 
    USING gin(to_tsvector('english', name || ' ' || coalesce(description, '')));
```

#### **Task 2.2: Product Creation Interface**
- [ ] Create `/dashboard/financieel/products` page
- [ ] Design product creation form with validation
- [ ] Add rich text editor for descriptions
- [ ] Include image upload capability
- [ ] Add pricing calculator with preview
- [ ] Create product template system

**Component Structure:**
```typescript
// ProductCreationForm Component
interface ProductFormData {
  name: string;
  description: string;
  category: ProductCategory;
  price: number;
  billingInterval: BillingInterval;
  setupFee?: number;
  trialPeriodDays?: number;
  features: Record<string, any>;
  benefits: string[];
  limitations: string[];
}
```

#### **Task 2.3: Product Pricing Configuration**
- [ ] Create flexible pricing input components
- [ ] Add currency formatting and validation
- [ ] Include billing interval selection
- [ ] Add setup fee and trial period options
- [ ] Create pricing comparison widget
- [ ] Add discount and promotion system

#### **Task 2.4: Product Feature System**
- [ ] Design JSONB feature configuration UI
- [ ] Create feature template library
- [ ] Add feature comparison matrix
- [ ] Include feature usage tracking
- [ ] Create feature-based access controls
- [ ] Add feature analytics dashboard

### **Product Management Dashboard (Week 3-4)**

#### **Task 3.1: Product Catalog Interface**
- [ ] Create product listing with search/filter
- [ ] Add product performance metrics
- [ ] Include subscriber count tracking
- [ ] Add product activation controls
- [ ] Create bulk product operations
- [ ] Add product duplication feature

#### **Task 3.2: Product Analytics Dashboard**
- [ ] Track product signup conversion rates
- [ ] Monitor monthly recurring revenue per product
- [ ] Add subscriber growth analytics
- [ ] Create churn analysis per product
- [ ] Add feature usage heatmaps
- [ ] Include A/B testing framework

**Analytics Components:**
```typescript
interface ProductAnalytics {
  totalRevenue: number;
  monthlyRevenue: number;
  subscriberCount: number;
  conversionRate: number;
  churnRate: number;
  averageLifetimeValue: number;
  featureUsage: Record<string, number>;
}
```

#### **Task 3.3: Product Performance Optimization**
- [ ] Add pricing optimization suggestions
- [ ] Create subscriber engagement scoring
- [ ] Include product health indicators
- [ ] Add automated alerts for underperforming products
- [ ] Create competitive analysis tools
- [ ] Add seasonal trend analysis

#### **Task 3.4: Product Catalog for Clients**
- [ ] Create public product catalog page
- [ ] Add client-facing product comparison
- [ ] Include product testimonials/reviews
- [ ] Add product recommendation engine
- [ ] Create mobile-optimized product pages
- [ ] Add social sharing capabilities

---

## 🎨 User Experience Design

### **Tenant Product Management Flow**
```
1. Dashboard → Products → Create New Product
2. Product Details Form (Name, Description, Category)
3. Pricing Configuration (Price, Billing, Trial)
4. Features Setup (JSONB Configuration)
5. Marketing Content (Images, Copy, Benefits)
6. Preview & Test → Publish
7. Product Analytics & Management
```

### **Client Discovery Flow**
```
1. Client Portal → Available Products
2. Product Catalog with Filtering
3. Product Detail Page with Features
4. Pricing Comparison & Calculator
5. Subscription Signup (Next Phase)
```

---

## 🔧 API Architecture

### **Product Management Endpoints**
```typescript
// Product CRUD Operations
POST   /api/tenant/products              // Create product
GET    /api/tenant/products              // List tenant products
GET    /api/tenant/products/{id}         // Get product details
PUT    /api/tenant/products/{id}         // Update product
DELETE /api/tenant/products/{id}         // Archive product

// Product Management
POST   /api/tenant/products/{id}/activate    // Activate product
POST   /api/tenant/products/{id}/deactivate  // Deactivate product
POST   /api/tenant/products/{id}/duplicate   // Duplicate product
GET    /api/tenant/products/{id}/analytics   // Product analytics

// Client-facing Endpoints
GET    /api/client/products              // List available products
GET    /api/client/products/{id}         // Get product details
GET    /api/client/products/recommended  // Recommended products
```

### **Product Data Models**
```typescript
interface TenantSubscriptionProduct {
  id: string;
  tenantId: string;
  createdBy: string;
  name: string;
  description: string;
  shortDescription?: string;
  category: ProductCategory;
  tags: string[];
  price: number;
  billingInterval: BillingInterval;
  setupFee?: number;
  trialPeriodDays?: number;
  features: Record<string, any>;
  benefits: string[];
  limitations: string[];
  isActive: boolean;
  isFeatured: boolean;
  maxSubscribers?: number;
  sortOrder: number;
  imageUrl?: string;
  marketingCopy?: string;
  termsOfService?: string;
  providerIntegrations?: Record<string, any>; // {"mollie": {"plan_id": "..."}, "stripe": {"price_id": "..."}}
  externalProductId?: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}

type ProductCategory = 'service' | 'software' | 'consultation' | 'support';
type BillingInterval = 'monthly' | 'yearly' | 'weekly' | 'one-time';
```

---

## 🧪 Testing Strategy

### **Unit Tests**
- [ ] Product creation form validation
- [ ] Pricing calculation utilities
- [ ] Feature configuration helpers
- [ ] Product search and filtering
- [ ] Analytics calculation functions
- [ ] API endpoint validation

### **Integration Tests**
- [ ] Product CRUD operations with database
- [ ] Multi-provider price synchronization
- [ ] Multi-tenant product isolation
- [ ] Product analytics data accuracy
- [ ] Client catalog API responses
- [ ] Product recommendation engine

### **E2E Tests**
- [ ] Complete product creation workflow
- [ ] Product editing and management
- [ ] Client product discovery flow
- [ ] Product analytics dashboard
- [ ] Product activation/deactivation
- [ ] Bulk product operations

---

## 📊 Success Criteria

### **Functional Requirements**
✅ Tenants can create unlimited subscription products  
✅ Products support flexible pricing and billing intervals  
✅ Product catalog is discoverable by clients  
✅ Analytics provide actionable product insights  
✅ System handles 1000+ products across all tenants  
✅ Product management is intuitive and efficient

### **Performance Requirements**
✅ Product creation form saves < 2s  
✅ Product catalog loads < 1.5s  
✅ Product search results < 500ms  
✅ Analytics dashboard renders < 3s  
✅ API responses average < 400ms

### **Business Impact**
✅ 40%+ tenant adoption of product creation  
✅ Average 3+ products per active tenant  
✅ Product-based revenue constitutes 15%+ of tenant income  
✅ Client engagement increases with product availability  
✅ Tenant retention improves with product monetization

---

## 🚀 Feature Enhancements (Future Phases)

### **Advanced Product Features**
- Product bundling and packages
- Usage-based pricing models
- Tiered pricing structures
- Product add-ons and upsells
- Seasonal pricing campaigns
- Group/team subscriptions

### **Marketing Tools**
- Product landing page builder
- Email marketing integration
- Affiliate/referral programs
- Product review system
- Social proof widgets
- SEO optimization tools

---

*Phase 2 Task Breakdown Created: 2025-01-10*  
*Estimated Duration: 4 weeks*  
*Priority: High - Enables tenant monetization*