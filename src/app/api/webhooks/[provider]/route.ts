// Universal Webhook Handler - Provider Agnostic
// Handles webhooks from any payment provider (Mollie, Stripe, etc.)

import { NextRequest, NextResponse } from 'next/server';
import { PaymentProviderFactory } from '@/lib/payments/payment-provider-factory';
import type { PaymentProviderName, WebhookEvent } from '@/lib/payments/types';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Webhook event processors
class WebhookProcessor {
  static async processEvent(event: WebhookEvent): Promise<void> {
    console.log(`Processing webhook event: ${event.type} from ${event.provider}`);

    try {
      switch (event.type) {
        case 'payment.succeeded':
          await this.handlePaymentSucceeded(event);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(event);
          break;
        case 'subscription.created':
          await this.handleSubscriptionCreated(event);
          break;
        case 'subscription.updated':
          await this.handleSubscriptionUpdated(event);
          break;
        case 'subscription.canceled':
          await this.handleSubscriptionCanceled(event);
          break;
        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }

      // Log successful webhook processing
      await this.logWebhookEvent(event, 'processed');
    } catch (error) {
      console.error(`Error processing webhook event ${event.id}:`, error);
      await this.logWebhookEvent(event, 'failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private static async handlePaymentSucceeded(event: WebhookEvent): Promise<void> {
    // Find subscription by provider payment ID
    const providerPaymentId = this.extractPaymentId(event);
    if (!providerPaymentId) return;

    // Record successful payment
    await supabase.from('platform_subscription_payments').insert({
      tenant_id: await this.getTenantIdFromEvent(event),
      subscription_id: await this.getSubscriptionIdFromEvent(event),
      payment_provider: event.provider,
      amount: this.extractAmount(event),
      currency: this.extractCurrency(event) || 'EUR',
      status: 'paid',
      payment_date: new Date().toISOString(),
      description: 'Platform subscription payment',
      provider_data: {
        payment_id: providerPaymentId,
        webhook_event_id: event.id,
        raw_event: event.data
      }
    });

    // Update subscription status if needed
    await this.updateSubscriptionStatus(event, 'active');
  }

  private static async handlePaymentFailed(event: WebhookEvent): Promise<void> {
    const providerPaymentId = this.extractPaymentId(event);
    if (!providerPaymentId) return;

    // Record failed payment
    await supabase.from('platform_subscription_payments').insert({
      tenant_id: await this.getTenantIdFromEvent(event),
      subscription_id: await this.getSubscriptionIdFromEvent(event),
      payment_provider: event.provider,
      amount: this.extractAmount(event),
      currency: this.extractCurrency(event) || 'EUR',
      status: 'failed',
      failure_reason: this.extractFailureReason(event),
      description: 'Platform subscription payment failed',
      provider_data: {
        payment_id: providerPaymentId,
        webhook_event_id: event.id,
        raw_event: event.data
      }
    });

    // Update subscription to past_due
    await this.updateSubscriptionStatus(event, 'past_due');

    // TODO: Trigger payment failure notifications
  }

  private static async handleSubscriptionCreated(event: WebhookEvent): Promise<void> {
    // Subscription creation is typically handled by the SubscriptionService
    // This webhook confirms the provider-side creation
    await this.updateSubscriptionStatus(event, 'active');
  }

  private static async handleSubscriptionUpdated(event: WebhookEvent): Promise<void> {
    // Sync subscription details with provider
    const providerSubscriptionId = this.extractSubscriptionId(event);
    if (!providerSubscriptionId) return;

    const { data: subscription } = await supabase
      .from('tenant_platform_subscriptions')
      .select('*')
      .eq(`provider_data->subscription_id`, providerSubscriptionId)
      .eq('payment_provider', event.provider)
      .single();

    if (subscription) {
      // Update with latest provider data
      await supabase
        .from('tenant_platform_subscriptions')
        .update({
          provider_data: {
            ...subscription.provider_data,
            last_webhook_update: new Date().toISOString(),
            latest_provider_data: event.data
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);
    }
  }

  private static async handleSubscriptionCanceled(event: WebhookEvent): Promise<void> {
    await this.updateSubscriptionStatus(event, 'canceled');
  }

  // Helper methods for extracting data from provider-specific events
  private static extractPaymentId(event: WebhookEvent): string | null {
    switch (event.provider) {
      case 'mollie':
        return event.data.id || null;
      case 'stripe':
        return event.data.object?.id || null;
      default:
        return null;
    }
  }

  private static extractSubscriptionId(event: WebhookEvent): string | null {
    switch (event.provider) {
      case 'mollie':
        return event.data.subscriptionId || event.data.subscription_id || null;
      case 'stripe':
        return event.data.object?.subscription || event.data.object?.id || null;
      default:
        return null;
    }
  }

  private static extractAmount(event: WebhookEvent): number {
    switch (event.provider) {
      case 'mollie':
        return parseFloat(event.data.amount?.value || '0');
      case 'stripe':
        return (event.data.object?.amount || 0) / 100; // Stripe uses cents
      default:
        return 0;
    }
  }

  private static extractCurrency(event: WebhookEvent): string | null {
    switch (event.provider) {
      case 'mollie':
        return event.data.amount?.currency || null;
      case 'stripe':
        return event.data.object?.currency || null;
      default:
        return null;
    }
  }

  private static extractFailureReason(event: WebhookEvent): string | null {
    switch (event.provider) {
      case 'mollie':
        return event.data.details?.failureReason || 'Payment failed';
      case 'stripe':
        return event.data.object?.failure_message || 'Payment failed';
      default:
        return 'Payment failed';
    }
  }

  private static async getTenantIdFromEvent(event: WebhookEvent): Promise<string | null> {
    // Extract tenant ID from metadata or find it via subscription
    const metadata = event.metadata || event.data.metadata;
    if (metadata?.tenantId) return metadata.tenantId;

    // Fallback: find via subscription
    const subscriptionId = this.extractSubscriptionId(event);
    if (subscriptionId) {
      const { data } = await supabase
        .from('tenant_platform_subscriptions')
        .select('tenant_id')
        .eq(`provider_data->subscription_id`, subscriptionId)
        .single();
      return data?.tenant_id || null;
    }

    return null;
  }

  private static async getSubscriptionIdFromEvent(event: WebhookEvent): Promise<string | null> {
    const providerSubscriptionId = this.extractSubscriptionId(event);
    if (!providerSubscriptionId) return null;

    const { data } = await supabase
      .from('tenant_platform_subscriptions')
      .select('id')
      .eq(`provider_data->subscription_id`, providerSubscriptionId)
      .eq('payment_provider', event.provider)
      .single();

    return data?.id || null;
  }

  private static async updateSubscriptionStatus(event: WebhookEvent, status: string): Promise<void> {
    const providerSubscriptionId = this.extractSubscriptionId(event);
    if (!providerSubscriptionId) return;

    await supabase
      .from('tenant_platform_subscriptions')
      .update({
        status,
        provider_data: {
          last_webhook_update: new Date().toISOString(),
          webhook_event_id: event.id
        },
        updated_at: new Date().toISOString()
      })
      .eq(`provider_data->subscription_id`, providerSubscriptionId)
      .eq('payment_provider', event.provider);
  }

  private static async logWebhookEvent(event: WebhookEvent, status: 'processed' | 'failed', error?: string): Promise<void> {
    // TODO: Implement webhook event logging table
    console.log(`Webhook ${event.id} (${event.provider}): ${status}${error ? ` - ${error}` : ''}`);
  }
}

// Main webhook handler
export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const provider = params.provider as PaymentProviderName;

  try {
    // Validate provider
    if (!PaymentProviderFactory.isProviderAvailable(provider)) {
      return NextResponse.json(
        { error: `Provider ${provider} is not available` },
        { status: 400 }
      );
    }

    // Get request body and signature
    const body = await request.text();
    const signature = request.headers.get('authorization') || 
                     request.headers.get('stripe-signature') || 
                     request.headers.get('mollie-signature') || '';

    // Process webhook with provider
    const paymentProvider = PaymentProviderFactory.getProvider(provider);
    const webhookEvent = await paymentProvider.processWebhook(body, signature);

    // Process the event
    await WebhookProcessor.processEvent(webhookEvent);

    return NextResponse.json({ received: true, eventId: webhookEvent.id });

  } catch (error) {
    console.error(`Webhook processing error for ${provider}:`, error);
    
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const provider = params.provider as PaymentProviderName;

  try {
    const health = await PaymentProviderFactory.checkProviderHealth(provider);
    
    return NextResponse.json({
      provider,
      status: health.healthy ? 'healthy' : 'unhealthy',
      latency: health.latency,
      error: health.error
    });

  } catch (error) {
    return NextResponse.json(
      { 
        provider,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}