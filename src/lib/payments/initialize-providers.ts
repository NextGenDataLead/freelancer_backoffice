// Provider Initialization - Environment-based Setup
// Initializes payment providers based on available configuration

import { PaymentProviderFactory } from './payment-provider-factory';

let isInitialized = false;

export async function initializePaymentProviders(): Promise<void> {
  if (isInitialized) return;

  try {
    // Initialize Mollie if configured
    if (process.env.MOLLIE_API_KEY) {
      const { MollieProvider } = await import('./providers/mollie-provider');
      
      PaymentProviderFactory.registerProvider('mollie', MollieProvider, {
        apiKey: process.env.MOLLIE_API_KEY,
        webhookSecret: process.env.MOLLIE_WEBHOOK_SECRET || 'development-secret',
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
        partnerId: process.env.MOLLIE_PARTNER_ID // Optional for Mollie Connect
      });

      console.log('✅ Mollie provider initialized');
    }

    // Initialize Stripe if configured (future)
    if (process.env.STRIPE_SECRET_KEY) {
      const { StripeProvider } = await import('./providers/stripe-provider');
      
      PaymentProviderFactory.registerProvider('stripe', StripeProvider, {
        secretKey: process.env.STRIPE_SECRET_KEY,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'development-secret',
        environment: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'live' : 'test'
      });

      console.log('✅ Stripe provider initialized (future-ready)');
    }

    // Set default provider from environment or fallback to Mollie
    const defaultProvider = process.env.DEFAULT_PAYMENT_PROVIDER as any || 'mollie';
    if (PaymentProviderFactory.isProviderAvailable(defaultProvider)) {
      PaymentProviderFactory.setDefaultProvider(defaultProvider);
      console.log(`✅ Default payment provider set to: ${defaultProvider}`);
    } else {
      console.warn(`⚠️ Default provider ${defaultProvider} not available, using first available`);
    }

    // Health check all providers
    const availableProviders = PaymentProviderFactory.getAvailableProviders();
    console.log(`✅ Available payment providers: ${availableProviders.join(', ')}`);

    for (const provider of availableProviders) {
      const health = await PaymentProviderFactory.checkProviderHealth(provider);
      console.log(`Provider ${provider}: ${health.healthy ? '✅ Healthy' : '❌ Unhealthy'} (${health.latency}ms)`);
    }

    isInitialized = true;
  } catch (error) {
    console.error('❌ Failed to initialize payment providers:', error);
    throw error;
  }
}

// Utility function to get provider status
export function getProviderStatus() {
  return {
    initialized: isInitialized,
    availableProviders: PaymentProviderFactory.getAvailableProviders(),
    mollieAvailable: PaymentProviderFactory.isProviderAvailable('mollie'),
    stripeAvailable: PaymentProviderFactory.isProviderAvailable('stripe')
  };
}