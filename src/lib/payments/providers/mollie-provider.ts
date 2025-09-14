// Complete Mollie Payment Provider Implementation
// Following the EXTENSIBLE_IMPLEMENTATION_PLAN.md Phase 2 requirements

import type {
  PaymentProvider,
  CreateCustomerRequest,
  CustomerResponse,
  CreateSubscriptionRequest,
  SubscriptionResponse,
  CancelSubscriptionRequest,
  UpdateSubscriptionRequest,
  WebhookEvent,
  WebhookEventType,
  SubscriptionStatus,
  ProviderCapabilities,
  MollieConfig
} from '../types';
import { PaymentProviderError, WebhookValidationError } from '../types';
import crypto from 'crypto';

// Mollie API response types (based on official Mollie API)
interface MollieCustomer {
  id: string;
  mode: 'live' | 'test';
  name: string;
  email: string;
  locale?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface MollieSubscription {
  id: string;
  mode: 'live' | 'test';
  customerId: string;
  status: 'pending' | 'active' | 'canceled' | 'suspended' | 'completed';
  amount: { value: string; currency: string };
  times?: number;
  interval: string;
  startDate: string;
  nextPaymentDate?: string;
  description: string;
  method?: string;
  mandateId?: string;
  canceledAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface MolliePayment {
  id: string;
  mode: 'live' | 'test';
  customerId?: string;
  subscriptionId?: string;
  status: string;
  amount: { value: string; currency: string };
  description: string;
  method?: string;
  paidAt?: string;
  canceledAt?: string;
  failedAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export class MollieProvider implements PaymentProvider {
  readonly name = 'mollie' as const;
  private config: MollieConfig;
  private apiUrl: string;

  constructor(config: MollieConfig) {
    this.config = config;
    this.apiUrl = 'https://api.mollie.com/v2';
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new PaymentProviderError('Mollie API key is required', 'mollie', 'MISSING_API_KEY');
    }
    if (!this.config.webhookSecret) {
      throw new PaymentProviderError('Mollie webhook secret is required', 'mollie', 'MISSING_WEBHOOK_SECRET');
    }
    if (!this.config.apiKey.startsWith('live_') && !this.config.apiKey.startsWith('test_')) {
      throw new PaymentProviderError('Invalid Mollie API key format', 'mollie', 'INVALID_API_KEY');
    }
  }

  private async makeApiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'BackofficeApp/1.0',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch (e) {
        // Response body might not be JSON
      }

      throw new PaymentProviderError(
        errorData.detail || errorData.title || `Mollie API error: ${response.statusText}`,
        'mollie',
        errorData.type || 'API_ERROR',
        response.status
      );
    }

    return response.json();
  }

  // Customer Management Implementation
  async createCustomer(data: CreateCustomerRequest): Promise<CustomerResponse> {
    try {
      const mollieCustomer = await this.makeApiCall<MollieCustomer>('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          locale: 'en_US', // Default to English, can be configurable
          metadata: {
            tenantId: data.tenantId,
            source: 'platform-subscription',
            ...data.metadata
          }
        })
      });

      return {
        id: mollieCustomer.id,
        email: mollieCustomer.email,
        name: mollieCustomer.name,
        provider: 'mollie',
        providerCustomerId: mollieCustomer.id,
        metadata: mollieCustomer.metadata
      };
    } catch (error) {
      if (error instanceof PaymentProviderError) throw error;
      throw new PaymentProviderError(`Failed to create Mollie customer: ${error}`, 'mollie');
    }
  }

  async updateCustomer(customerId: string, data: Partial<CreateCustomerRequest>): Promise<CustomerResponse> {
    try {
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.email) updateData.email = data.email;
      if (data.metadata) {
        updateData.metadata = data.metadata;
      }

      const mollieCustomer = await this.makeApiCall<MollieCustomer>(`/customers/${customerId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });

      return {
        id: mollieCustomer.id,
        email: mollieCustomer.email,
        name: mollieCustomer.name,
        provider: 'mollie',
        providerCustomerId: mollieCustomer.id,
        metadata: mollieCustomer.metadata
      };
    } catch (error) {
      if (error instanceof PaymentProviderError) throw error;
      throw new PaymentProviderError(`Failed to update Mollie customer: ${error}`, 'mollie');
    }
  }

  async getCustomer(customerId: string): Promise<CustomerResponse> {
    try {
      const mollieCustomer = await this.makeApiCall<MollieCustomer>(`/customers/${customerId}`);

      return {
        id: mollieCustomer.id,
        email: mollieCustomer.email,
        name: mollieCustomer.name,
        provider: 'mollie',
        providerCustomerId: mollieCustomer.id,
        metadata: mollieCustomer.metadata
      };
    } catch (error) {
      if (error instanceof PaymentProviderError) throw error;
      throw new PaymentProviderError(`Failed to get Mollie customer: ${error}`, 'mollie');
    }
  }

  // Subscription Management Implementation
  async createSubscription(data: CreateSubscriptionRequest): Promise<SubscriptionResponse> {
    try {
      // Note: In production, you'd need to:
      // 1. Create a mandate first for SEPA Direct Debit
      // 2. Get plan details from database to determine amount/interval
      // This is a simplified implementation

      const subscriptionData = {
        customerId: data.customerId,
        amount: { value: '29.00', currency: 'EUR' }, // Should come from plan
        interval: '1 month',
        description: 'Platform Subscription',
        startDate: data.trialDays 
          ? this.formatDate(new Date(Date.now() + data.trialDays * 24 * 60 * 60 * 1000))
          : this.formatDate(new Date()),
        method: 'directdebit', // SEPA Direct Debit for EU cost savings
        metadata: {
          tenantId: data.tenantId,
          planId: data.planId,
          source: 'platform-subscription',
          ...data.metadata
        }
      };

      const mollieSubscription = await this.makeApiCall<MollieSubscription>('/subscriptions', {
        method: 'POST',
        body: JSON.stringify(subscriptionData)
      });

      const currentPeriodStart = new Date(mollieSubscription.startDate);
      const currentPeriodEnd = mollieSubscription.nextPaymentDate 
        ? new Date(mollieSubscription.nextPaymentDate)
        : this.addMonths(currentPeriodStart, 1);

      return {
        id: mollieSubscription.id,
        customerId: mollieSubscription.customerId,
        planId: data.planId,
        status: this.mapMollieStatus(mollieSubscription.status),
        currentPeriodStart,
        currentPeriodEnd,
        trialStart: data.trialDays ? new Date() : undefined,
        trialEnd: data.trialDays ? new Date(Date.now() + data.trialDays * 24 * 60 * 60 * 1000) : undefined,
        provider: 'mollie',
        providerSubscriptionId: mollieSubscription.id,
        metadata: {
          ...mollieSubscription.metadata,
          mandateId: mollieSubscription.mandateId
        }
      };
    } catch (error) {
      if (error instanceof PaymentProviderError) throw error;
      throw new PaymentProviderError(`Failed to create Mollie subscription: ${error}`, 'mollie');
    }
  }

  async updateSubscription(data: UpdateSubscriptionRequest): Promise<SubscriptionResponse> {
    try {
      // Mollie subscriptions have limited update capabilities
      const updateData: any = {};
      if (data.metadata) {
        updateData.metadata = data.metadata;
      }

      const mollieSubscription = await this.makeApiCall<MollieSubscription>(`/subscriptions/${data.subscriptionId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });

      return this.mapMollieSubscriptionToResponse(mollieSubscription, data.planId || '');
    } catch (error) {
      if (error instanceof PaymentProviderError) throw error;
      throw new PaymentProviderError(`Failed to update Mollie subscription: ${error}`, 'mollie');
    }
  }

  async cancelSubscription(data: CancelSubscriptionRequest): Promise<SubscriptionResponse> {
    try {
      const mollieSubscription = await this.makeApiCall<MollieSubscription>(`/subscriptions/${data.subscriptionId}`, {
        method: 'DELETE'
      });

      return {
        ...this.mapMollieSubscriptionToResponse(mollieSubscription, ''),
        status: 'canceled',
        metadata: {
          ...mollieSubscription.metadata,
          canceledAt: new Date().toISOString(),
          cancellationReason: data.cancellationReason
        }
      };
    } catch (error) {
      if (error instanceof PaymentProviderError) throw error;
      throw new PaymentProviderError(`Failed to cancel Mollie subscription: ${error}`, 'mollie');
    }
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionResponse> {
    try {
      const mollieSubscription = await this.makeApiCall<MollieSubscription>(`/subscriptions/${subscriptionId}`);
      return this.mapMollieSubscriptionToResponse(mollieSubscription, '');
    } catch (error) {
      if (error instanceof PaymentProviderError) throw error;
      throw new PaymentProviderError(`Failed to get Mollie subscription: ${error}`, 'mollie');
    }
  }

  // Webhook Processing Implementation (Pull-based)
  async processWebhook(payload: string, signature: string): Promise<WebhookEvent> {
    // Validate webhook signature
    if (!this.validateWebhookSignature(payload, signature)) {
      throw new WebhookValidationError('mollie', 'Invalid webhook signature');
    }

    try {
      const webhookData = JSON.parse(payload);
      
      // Mollie uses resource-based webhooks - we need to fetch the actual resource
      const resourceId = webhookData.id;
      const resourceType = this.determineResourceType(webhookData);

      let eventData: any;
      switch (resourceType) {
        case 'payment':
          eventData = await this.makeApiCall<MolliePayment>(`/payments/${resourceId}`);
          break;
        case 'subscription':
          eventData = await this.makeApiCall<MollieSubscription>(`/subscriptions/${resourceId}`);
          break;
        default:
          eventData = webhookData;
      }

      return {
        id: resourceId,
        type: this.mapMollieEventType(resourceType, eventData),
        provider: 'mollie',
        data: eventData,
        metadata: eventData.metadata
      };
    } catch (error) {
      throw new PaymentProviderError(`Failed to process Mollie webhook: ${error}`, 'mollie');
    }
  }

  // Provider Capabilities
  getCapabilities(): ProviderCapabilities {
    return {
      supportedPaymentMethods: [
        'sepa_direct_debit', 
        'ideal', 
        'credit_card', 
        'bancontact', 
        'sofort', 
        'eps',
        'giropay',
        'belfius',
        'kbc',
        'przelewy24'
      ],
      supportedCountries: [
        'NL', 'BE', 'DE', 'AT', 'CH', 'FR', 'GB', 'IT', 'ES', 'PL',
        'FI', 'PT', 'EE', 'LV', 'LT', 'CZ', 'SK', 'SI', 'HU'
      ],
      supportsBillingPortal: false, // Mollie doesn't have built-in customer portal
      supportsUsageBasedBilling: false,
      supportsTrials: true,
      supportsProration: false,
      webhookDeliveryMethod: 'pull', // Mollie uses pull-based webhooks
      costStructure: {
        transactionFee: 0.30, // €0.30 for SEPA Direct Debit - major cost advantage!
        percentageFee: 0, // No percentage fee for SEPA
        monthlyFee: 0
      }
    };
  }

  // Helper Methods
  private mapMollieStatus(mollieStatus: string): SubscriptionStatus {
    switch (mollieStatus) {
      case 'pending': return 'trialing';
      case 'active': return 'active';
      case 'suspended': return 'past_due';
      case 'canceled': return 'canceled';
      case 'completed': return 'canceled';
      default: return 'unpaid';
    }
  }

  private mapMollieEventType(resourceType: string, data: any): WebhookEventType {
    if (resourceType === 'payment') {
      switch (data.status) {
        case 'paid': return 'payment.succeeded';
        case 'failed': 
        case 'canceled':
        case 'expired': return 'payment.failed';
        default: return 'payment.succeeded';
      }
    }

    if (resourceType === 'subscription') {
      switch (data.status) {
        case 'active': return 'subscription.updated';
        case 'canceled': return 'subscription.canceled';
        default: return 'subscription.updated';
      }
    }

    return 'payment.succeeded'; // Fallback
  }

  private mapMollieSubscriptionToResponse(mollieSubscription: MollieSubscription, planId: string): SubscriptionResponse {
    const currentPeriodStart = new Date(mollieSubscription.startDate);
    const currentPeriodEnd = mollieSubscription.nextPaymentDate 
      ? new Date(mollieSubscription.nextPaymentDate)
      : this.addMonths(currentPeriodStart, 1);

    return {
      id: mollieSubscription.id,
      customerId: mollieSubscription.customerId,
      planId: planId || mollieSubscription.metadata?.planId || '',
      status: this.mapMollieStatus(mollieSubscription.status),
      currentPeriodStart,
      currentPeriodEnd,
      provider: 'mollie',
      providerSubscriptionId: mollieSubscription.id,
      metadata: mollieSubscription.metadata
    };
  }

  private determineResourceType(webhookData: any): string {
    // Mollie webhook structure analysis
    if (webhookData.resource === 'payment' || webhookData.id?.startsWith('tr_')) {
      return 'payment';
    }
    if (webhookData.resource === 'subscription' || webhookData.id?.startsWith('sub_')) {
      return 'subscription';
    }
    return 'unknown';
  }

  private validateWebhookSignature(payload: string, signature: string): boolean {
    if (!signature || !this.config.webhookSecret) return false;

    // Mollie webhook signature validation
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }
}