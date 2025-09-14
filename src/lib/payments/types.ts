// Payment Provider Abstraction Layer
// Extensible interfaces for multiple payment providers (Mollie → Stripe)

export type PaymentProviderName = 'mollie' | 'stripe';

// Base request/response types
export interface CreateCustomerRequest {
  email: string;
  name: string;
  tenantId: string;
  metadata?: Record<string, any>;
}

export interface CustomerResponse {
  id: string;
  email: string;
  name: string;
  provider: PaymentProviderName;
  providerCustomerId: string;
  metadata?: Record<string, any>;
}

export interface CreateSubscriptionRequest {
  customerId: string;
  planId: string;
  tenantId: string;
  trialDays?: number;
  metadata?: Record<string, any>;
}

export interface SubscriptionResponse {
  id: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  provider: PaymentProviderName;
  providerSubscriptionId: string;
  metadata?: Record<string, any>;
}

export interface CancelSubscriptionRequest {
  subscriptionId: string;
  cancelAtPeriodEnd?: boolean;
  cancellationReason?: string;
}

export interface UpdateSubscriptionRequest {
  subscriptionId: string;
  planId?: string;
  metadata?: Record<string, any>;
}

// Webhook event types (standardized across providers)
export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  provider: PaymentProviderName;
  data: any;
  metadata?: Record<string, any>;
}

export type WebhookEventType = 
  | 'payment.succeeded'
  | 'payment.failed' 
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'customer.created'
  | 'customer.updated'
  | 'invoice.created'
  | 'invoice.paid'
  | 'invoice.payment_failed';

export type SubscriptionStatus = 
  | 'trialing'
  | 'active' 
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'suspended';

// Provider capabilities interface
export interface ProviderCapabilities {
  supportedPaymentMethods: string[];
  supportedCountries: string[];
  supportsBillingPortal: boolean;
  supportsUsageBasedBilling: boolean;
  supportsTrials: boolean;
  supportsProration: boolean;
  webhookDeliveryMethod: 'push' | 'pull';
  costStructure: {
    transactionFee?: number;
    percentageFee?: number;
    monthlyFee?: number;
  };
}

// Main payment provider interface
export interface PaymentProvider {
  readonly name: PaymentProviderName;
  
  // Customer management
  createCustomer(data: CreateCustomerRequest): Promise<CustomerResponse>;
  updateCustomer(customerId: string, data: Partial<CreateCustomerRequest>): Promise<CustomerResponse>;
  getCustomer(customerId: string): Promise<CustomerResponse>;
  
  // Subscription management
  createSubscription(data: CreateSubscriptionRequest): Promise<SubscriptionResponse>;
  updateSubscription(data: UpdateSubscriptionRequest): Promise<SubscriptionResponse>;
  cancelSubscription(data: CancelSubscriptionRequest): Promise<SubscriptionResponse>;
  getSubscription(subscriptionId: string): Promise<SubscriptionResponse>;
  
  // Webhook processing
  processWebhook(payload: string, signature: string): Promise<WebhookEvent>;
  
  // Provider info
  getCapabilities(): ProviderCapabilities;
  
  // Optional: Provider-specific methods
  getBillingPortalUrl?(customerId: string): Promise<string>;
  createPaymentIntent?(amount: number, currency: string, customerId: string): Promise<any>;
}

// Error types
export class PaymentProviderError extends Error {
  constructor(
    message: string,
    public provider: PaymentProviderName,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'PaymentProviderError';
  }
}

export class WebhookValidationError extends PaymentProviderError {
  constructor(provider: PaymentProviderName, message = 'Webhook signature validation failed') {
    super(message, provider, 'WEBHOOK_VALIDATION_FAILED');
    this.name = 'WebhookValidationError';
  }
}

// Provider configuration types
export interface MollieConfig {
  apiKey: string;
  webhookSecret: string;
  environment: 'sandbox' | 'production';
  partnerId?: string; // For Mollie Connect
}

export interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  environment: 'test' | 'live';
}

export type ProviderConfig = {
  mollie: MollieConfig;
  stripe: StripeConfig;
};