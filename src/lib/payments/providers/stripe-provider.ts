// Stripe Provider Stub - Future Implementation
// Interface-compliant stub for future Stripe integration

import type {
  PaymentProvider,
  CreateCustomerRequest,
  CustomerResponse,
  CreateSubscriptionRequest,
  SubscriptionResponse,
  CancelSubscriptionRequest,
  UpdateSubscriptionRequest,
  WebhookEvent,
  ProviderCapabilities,
  StripeConfig
} from '../types';
import { PaymentProviderError } from '../types';

export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe' as const;
  private config: StripeConfig;

  constructor(config: StripeConfig) {
    this.config = config;
    // NOTE: Stripe implementation not yet available
    // This stub ensures interface compliance for future extension
  }

  async createCustomer(data: CreateCustomerRequest): Promise<CustomerResponse> {
    throw new PaymentProviderError(
      'Stripe provider not yet implemented. Use Mollie provider instead.',
      'stripe',
      'NOT_IMPLEMENTED'
    );
  }

  async updateCustomer(customerId: string, data: Partial<CreateCustomerRequest>): Promise<CustomerResponse> {
    throw new PaymentProviderError(
      'Stripe provider not yet implemented. Use Mollie provider instead.',
      'stripe',
      'NOT_IMPLEMENTED'
    );
  }

  async getCustomer(customerId: string): Promise<CustomerResponse> {
    throw new PaymentProviderError(
      'Stripe provider not yet implemented. Use Mollie provider instead.',
      'stripe',
      'NOT_IMPLEMENTED'
    );
  }

  async createSubscription(data: CreateSubscriptionRequest): Promise<SubscriptionResponse> {
    throw new PaymentProviderError(
      'Stripe provider not yet implemented. Use Mollie provider instead.',
      'stripe',
      'NOT_IMPLEMENTED'
    );
  }

  async updateSubscription(data: UpdateSubscriptionRequest): Promise<SubscriptionResponse> {
    throw new PaymentProviderError(
      'Stripe provider not yet implemented. Use Mollie provider instead.',
      'stripe',
      'NOT_IMPLEMENTED'
    );
  }

  async cancelSubscription(data: CancelSubscriptionRequest): Promise<SubscriptionResponse> {
    throw new PaymentProviderError(
      'Stripe provider not yet implemented. Use Mollie provider instead.',
      'stripe',
      'NOT_IMPLEMENTED'
    );
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionResponse> {
    throw new PaymentProviderError(
      'Stripe provider not yet implemented. Use Mollie provider instead.',
      'stripe',
      'NOT_IMPLEMENTED'
    );
  }

  async processWebhook(payload: string, signature: string): Promise<WebhookEvent> {
    throw new PaymentProviderError(
      'Stripe provider not yet implemented. Use Mollie provider instead.',
      'stripe',
      'NOT_IMPLEMENTED'
    );
  }

  getCapabilities(): ProviderCapabilities {
    // Return Stripe's future capabilities for comparison purposes
    return {
      supportedPaymentMethods: [
        'card', 
        'sepa_debit', 
        'ideal', 
        'bancontact', 
        'sofort', 
        'giropay',
        'eps',
        'p24',
        'alipay',
        'wechat_pay'
      ],
      supportedCountries: [
        // Global coverage - 40+ countries
        'US', 'CA', 'GB', 'AU', 'NZ', 'JP', 'SG', 'HK', 'MY', 'TH',
        'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
        'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
        'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'CH', 'NO', 'IS'
      ],
      supportsBillingPortal: true, // Stripe's customer portal
      supportsUsageBasedBilling: true, // Stripe's usage-based pricing
      supportsTrials: true,
      supportsProration: true, // Advanced proration support
      webhookDeliveryMethod: 'push', // Stripe uses push-based webhooks
      costStructure: {
        transactionFee: 0, // No fixed fee
        percentageFee: 0.014, // 1.4% for EU cards
        monthlyFee: 0
      }
    };
  }

  // Future Stripe-specific methods (placeholders)
  async getBillingPortalUrl(customerId: string): Promise<string> {
    throw new PaymentProviderError(
      'Stripe provider not yet implemented.',
      'stripe',
      'NOT_IMPLEMENTED'
    );
  }

  async createPaymentIntent(amount: number, currency: string, customerId: string): Promise<any> {
    throw new PaymentProviderError(
      'Stripe provider not yet implemented.',
      'stripe',
      'NOT_IMPLEMENTED'
    );
  }
}

/* 
 * FUTURE IMPLEMENTATION NOTES:
 * 
 * When implementing Stripe provider:
 * 
 * 1. Install Stripe SDK: npm install stripe
 * 2. Replace PaymentProviderError throws with actual Stripe API calls
 * 3. Map Stripe objects to our standardized interfaces
 * 4. Implement push-based webhook signature verification
 * 5. Add Stripe-specific features like Customer Portal URLs
 * 6. Test dual-provider functionality with feature flags
 * 
 * Migration path from Mollie:
 * 1. Update platform_subscription_plans.supported_providers to include 'stripe'
 * 2. Allow tenant-by-tenant provider selection
 * 3. Migrate subscriptions using provider-agnostic SubscriptionService
 * 4. Compare costs and features for optimization
 * 
 * The extensible architecture ensures zero downtime migration!
 */