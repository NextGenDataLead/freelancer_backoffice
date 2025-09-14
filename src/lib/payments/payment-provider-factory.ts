// Payment Provider Factory - Provider Registration & Selection
// Handles switching between Mollie (current) and Stripe (future)

import type { PaymentProvider, PaymentProviderName, ProviderConfig } from './types';
import { PaymentProviderError } from './types';

export class PaymentProviderFactory {
  private static providers = new Map<PaymentProviderName, new (config: any) => PaymentProvider>();
  private static configs: Partial<ProviderConfig> = {};
  private static defaultProvider: PaymentProviderName = 'mollie';

  // Register a payment provider
  static registerProvider<T extends PaymentProvider>(
    name: PaymentProviderName,
    providerClass: new (config: any) => T,
    config?: any
  ): void {
    this.providers.set(name, providerClass);
    if (config) {
      this.configs[name] = config;
    }
  }

  // Set the default provider
  static setDefaultProvider(provider: PaymentProviderName): void {
    if (!this.providers.has(provider)) {
      throw new PaymentProviderError(
        `Provider ${provider} is not registered`,
        provider,
        'PROVIDER_NOT_REGISTERED'
      );
    }
    this.defaultProvider = provider;
  }

  // Get a provider instance
  static getProvider(provider?: PaymentProviderName): PaymentProvider {
    const providerName = provider || this.defaultProvider;
    
    if (!this.providers.has(providerName)) {
      throw new PaymentProviderError(
        `Provider ${providerName} is not registered`,
        providerName,
        'PROVIDER_NOT_REGISTERED'
      );
    }

    const ProviderClass = this.providers.get(providerName)!;
    const config = this.configs[providerName];

    if (!config) {
      throw new PaymentProviderError(
        `No configuration found for provider ${providerName}`,
        providerName,
        'PROVIDER_NOT_CONFIGURED'
      );
    }

    return new ProviderClass(config);
  }

  // Get optimal provider based on tenant preferences, geography, or features
  static getOptimalProvider(
    tenantId: string,
    countryCode?: string,
    featureRequirements?: string[]
  ): PaymentProvider {
    // Future: Add intelligent provider selection logic
    // For now, always return Mollie as it's our only implementation
    
    // EU tenants benefit from Mollie's lower SEPA costs
    if (countryCode && EU_COUNTRIES.includes(countryCode)) {
      return this.getProvider('mollie');
    }
    
    // Check if specific features are required
    if (featureRequirements?.includes('customer_portal')) {
      // Stripe has better customer portal, but we'll use Mollie for now
      return this.getProvider('mollie');
    }
    
    // Default to Mollie for cost optimization
    return this.getProvider('mollie');
  }

  // Get all registered providers
  static getAvailableProviders(): PaymentProviderName[] {
    return Array.from(this.providers.keys());
  }

  // Check if a provider is available
  static isProviderAvailable(provider: PaymentProviderName): boolean {
    return this.providers.has(provider) && !!this.configs[provider];
  }

  // Provider health check
  static async checkProviderHealth(provider?: PaymentProviderName): Promise<{
    provider: PaymentProviderName;
    healthy: boolean;
    latency?: number;
    error?: string;
  }> {
    const providerName = provider || this.defaultProvider;
    const startTime = Date.now();

    try {
      const providerInstance = this.getProvider(providerName);
      
      // Basic health check - get capabilities (should be fast)
      const capabilities = providerInstance.getCapabilities();
      
      return {
        provider: providerName,
        healthy: true,
        latency: Date.now() - startTime
      };
    } catch (error) {
      return {
        provider: providerName,
        healthy: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Initialize providers from environment
  static async initializeFromEnvironment(): Promise<void> {
    // Initialize Mollie if configured
    if (process.env.MOLLIE_API_KEY) {
      const { MollieProvider } = await import('./providers/mollie-provider');
      this.registerProvider('mollie', MollieProvider, {
        apiKey: process.env.MOLLIE_API_KEY,
        webhookSecret: process.env.MOLLIE_WEBHOOK_SECRET,
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
        partnerId: process.env.MOLLIE_PARTNER_ID
      });
    }

    // Initialize Stripe if configured (future)
    if (process.env.STRIPE_SECRET_KEY) {
      const { StripeProvider } = await import('./providers/stripe-provider');
      this.registerProvider('stripe', StripeProvider, {
        secretKey: process.env.STRIPE_SECRET_KEY,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        environment: process.env.STRIPE_SECRET_KEY.startsWith('sk_live_') ? 'live' : 'test'
      });
    }

    // Set default provider from environment or fallback to Mollie
    const defaultProvider = (process.env.DEFAULT_PAYMENT_PROVIDER as PaymentProviderName) || 'mollie';
    if (this.isProviderAvailable(defaultProvider)) {
      this.setDefaultProvider(defaultProvider);
    }
  }
}

// EU countries where Mollie has cost advantages
const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

// Provider comparison utilities
export class ProviderComparison {
  static compareCosts(amount: number, currency: string = 'EUR'): {
    mollie: number;
    stripe: number;
    recommendation: PaymentProviderName;
    savings: number;
  } {
    // Mollie SEPA Direct Debit: €0.30 fixed
    const mollieCost = 0.30;
    
    // Stripe SEPA: 1.4% capped at €5.00
    const stripeCost = Math.min(amount * 0.014, 5.00);
    
    const recommendation: PaymentProviderName = mollieCost < stripeCost ? 'mollie' : 'stripe';
    const savings = Math.abs(mollieCost - stripeCost);

    return {
      mollie: mollieCost,
      stripe: stripeCost,
      recommendation,
      savings
    };
  }

  static getFeatureComparison(): Record<string, { mollie: boolean; stripe: boolean }> {
    return {
      sepaDirectDebit: { mollie: true, stripe: true },
      ideal: { mollie: true, stripe: false },
      creditCards: { mollie: true, stripe: true },
      customerPortal: { mollie: false, stripe: true },
      usageBasedBilling: { mollie: false, stripe: true },
      webhooks: { mollie: true, stripe: true },
      recurringPayments: { mollie: true, stripe: true },
      multiPartyPayments: { mollie: true, stripe: true }
    };
  }
}