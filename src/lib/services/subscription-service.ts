// Provider-Agnostic Subscription Service
// Uses provider abstraction layer for payment processing

import { PaymentProviderFactory } from '../payments/payment-provider-factory';
import type { 
  PaymentProvider, 
  CreateSubscriptionRequest,
  SubscriptionResponse,
  CancelSubscriptionRequest,
  PaymentProviderName 
} from '../payments/types';
import { createClient } from '@supabase/supabase-js';

// Database types
interface PlatformSubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billing_interval: 'monthly' | 'yearly';
  features: Record<string, any>;
  limits: Record<string, any>;
  supported_providers: PaymentProviderName[];
  provider_configs: Record<string, any>;
}

interface TenantPlatformSubscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  payment_provider: PaymentProviderName;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_start?: string;
  trial_end?: string;
  canceled_at?: string;
  cancel_at_period_end: boolean;
  provider_data: Record<string, any>;
}

export class SubscriptionService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Create a new subscription using provider abstraction
  async createSubscription({
    tenantId,
    planId,
    paymentProvider,
    paymentMethodId,
    trialDays
  }: {
    tenantId: string;
    planId: string;
    paymentProvider?: PaymentProviderName;
    paymentMethodId?: string;
    trialDays?: number;
  }): Promise<SubscriptionResponse> {
    try {
      // 1. Get plan details
      const { data: plan, error: planError } = await this.supabase
        .from('platform_subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError || !plan) {
        throw new Error(`Plan not found: ${planId}`);
      }

      // 2. Determine optimal provider
      const provider = paymentProvider || this.getOptimalProvider(plan, tenantId);
      
      if (!plan.supported_providers.includes(provider)) {
        throw new Error(`Plan ${plan.name} does not support provider ${provider}`);
      }

      // 3. Get tenant details for customer creation
      const { data: tenant, error: tenantError } = await this.supabase
        .from('tenants')
        .select('name, billing_email')
        .eq('id', tenantId)
        .single();

      if (tenantError || !tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      // 4. Get provider instance
      const paymentProvider = PaymentProviderFactory.getProvider(provider);

      // 5. Create or get customer
      const customer = await this.getOrCreateCustomer(paymentProvider, {
        tenantId,
        email: tenant.billing_email || 'billing@tenant.com',
        name: tenant.name
      });

      // 6. Create subscription with provider
      const subscriptionRequest: CreateSubscriptionRequest = {
        customerId: customer.providerCustomerId,
        planId: planId,
        tenantId: tenantId,
        trialDays: trialDays,
        metadata: {
          plan_name: plan.name,
          tenant_name: tenant.name
        }
      };

      const providerSubscription = await paymentProvider.createSubscription(subscriptionRequest);

      // 7. Store subscription in database
      const { data: dbSubscription, error: dbError } = await this.supabase
        .from('tenant_platform_subscriptions')
        .insert({
          tenant_id: tenantId,
          plan_id: planId,
          payment_provider: provider,
          status: providerSubscription.status,
          current_period_start: providerSubscription.currentPeriodStart.toISOString(),
          current_period_end: providerSubscription.currentPeriodEnd.toISOString(),
          trial_start: providerSubscription.trialStart?.toISOString(),
          trial_end: providerSubscription.trialEnd?.toISOString(),
          provider_data: {
            subscription_id: providerSubscription.providerSubscriptionId,
            customer_id: customer.providerCustomerId,
            plan_id: planId,
            provider_metadata: providerSubscription.metadata
          }
        })
        .select()
        .single();

      if (dbError) {
        // TODO: Rollback provider subscription if DB insert fails
        throw new Error(`Failed to store subscription: ${dbError.message}`);
      }

      return providerSubscription;

    } catch (error) {
      console.error('Subscription creation failed:', error);
      throw error;
    }
  }

  // Cancel a subscription using provider abstraction
  async cancelSubscription({
    subscriptionId,
    cancelAtPeriodEnd = true,
    cancellationReason
  }: {
    subscriptionId: string;
    cancelAtPeriodEnd?: boolean;
    cancellationReason?: string;
  }): Promise<void> {
    try {
      // 1. Get subscription from database
      const { data: subscription, error } = await this.supabase
        .from('tenant_platform_subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (error || !subscription) {
        throw new Error(`Subscription not found: ${subscriptionId}`);
      }

      // 2. Get provider instance
      const paymentProvider = PaymentProviderFactory.getProvider(subscription.payment_provider);

      // 3. Cancel with provider
      const cancelRequest: CancelSubscriptionRequest = {
        subscriptionId: subscription.provider_data.subscription_id,
        cancelAtPeriodEnd,
        cancellationReason
      };

      await paymentProvider.cancelSubscription(cancelRequest);

      // 4. Update database
      await this.supabase
        .from('tenant_platform_subscriptions')
        .update({
          status: cancelAtPeriodEnd ? subscription.status : 'canceled',
          cancel_at_period_end: cancelAtPeriodEnd,
          canceled_at: new Date().toISOString(),
          provider_data: {
            ...subscription.provider_data,
            cancellation_reason: cancellationReason,
            canceled_at: new Date().toISOString()
          }
        })
        .eq('id', subscriptionId);

    } catch (error) {
      console.error('Subscription cancellation failed:', error);
      throw error;
    }
  }

  // Get subscription details
  async getSubscription(subscriptionId: string): Promise<TenantPlatformSubscription | null> {
    const { data, error } = await this.supabase
      .from('tenant_platform_subscriptions')
      .select(`
        *,
        platform_subscription_plans (
          name,
          price,
          billing_interval,
          features,
          limits
        )
      `)
      .eq('id', subscriptionId)
      .single();

    if (error) return null;
    return data;
  }

  // List tenant subscriptions
  async getTenantSubscriptions(tenantId: string): Promise<TenantPlatformSubscription[]> {
    const { data, error } = await this.supabase
      .from('tenant_platform_subscriptions')
      .select(`
        *,
        platform_subscription_plans (
          name,
          price,
          billing_interval,
          features,
          limits
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Sync subscription status with provider
  async syncSubscriptionStatus(subscriptionId: string): Promise<void> {
    try {
      const subscription = await this.getSubscription(subscriptionId);
      if (!subscription) return;

      const paymentProvider = PaymentProviderFactory.getProvider(subscription.payment_provider);
      const providerSubscription = await paymentProvider.getSubscription(
        subscription.provider_data.subscription_id
      );

      // Update database with provider status
      await this.supabase
        .from('tenant_platform_subscriptions')
        .update({
          status: providerSubscription.status,
          current_period_start: providerSubscription.currentPeriodStart.toISOString(),
          current_period_end: providerSubscription.currentPeriodEnd.toISOString(),
          provider_data: {
            ...subscription.provider_data,
            last_sync: new Date().toISOString(),
            provider_metadata: providerSubscription.metadata
          }
        })
        .eq('id', subscriptionId);

    } catch (error) {
      console.error('Subscription sync failed:', error);
      throw error;
    }
  }

  // Helper: Get or create customer
  private async getOrCreateCustomer(
    paymentProvider: PaymentProvider, 
    data: { tenantId: string; email: string; name: string }
  ) {
    // Check if customer exists in provider_data
    const { data: existingSubscription } = await this.supabase
      .from('tenant_platform_subscriptions')
      .select('provider_data')
      .eq('tenant_id', data.tenantId)
      .eq('payment_provider', paymentProvider.name)
      .not('provider_data->customer_id', 'is', null)
      .limit(1)
      .single();

    if (existingSubscription?.provider_data?.customer_id) {
      return paymentProvider.getCustomer(existingSubscription.provider_data.customer_id);
    }

    // Create new customer
    return paymentProvider.createCustomer({
      email: data.email,
      name: data.name,
      tenantId: data.tenantId
    });
  }

  // Helper: Get optimal provider for a plan
  private getOptimalProvider(plan: PlatformSubscriptionPlan, tenantId: string): PaymentProviderName {
    // For now, use first supported provider (Mollie)
    // In future, this could be based on tenant geography, preferences, etc.
    return plan.supported_providers[0] || 'mollie';
  }
}