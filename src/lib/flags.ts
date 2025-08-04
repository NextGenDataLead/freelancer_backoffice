// Feature flags configuration for A/B testing
import { flag } from 'flags/next'

// Pricing page experiments
export const pricingPageVariantFlag = flag<'control' | 'variant-a' | 'variant-b'>({
  key: 'pricing-page-variant',
  decide() {
    // Simple random assignment for A/B testing
    const random = Math.random()
    if (random < 0.33) return 'control'
    if (random < 0.66) return 'variant-a'
    return 'variant-b'
  },
  options: [
    { value: 'control', label: 'Control - Original pricing' },
    { value: 'variant-a', label: 'Variant A - Highlighted middle tier' },
    { value: 'variant-b', label: 'Variant B - Discount emphasis' }
  ]
})

// CTA button text experiment
export const ctaButtonTextFlag = flag<'Start Free Trial' | 'Get Started Free' | 'Try It Free'>({
  key: 'cta-button-text',
  decide() {
    const random = Math.random()
    if (random < 0.33) return 'Start Free Trial'
    if (random < 0.66) return 'Get Started Free'
    return 'Try It Free'
  },
  options: [
    { value: 'Start Free Trial', label: 'Original CTA' },
    { value: 'Get Started Free', label: 'Action-focused CTA' },
    { value: 'Try It Free', label: 'Simple CTA' }
  ]
})

// Pricing display experiment
export const pricingDisplayFlag = flag<'monthly-first' | 'yearly-first'>({
  key: 'pricing-display',
  decide() {
    return Math.random() < 0.5 ? 'monthly-first' : 'yearly-first'
  },
  options: [
    { value: 'monthly-first', label: 'Show monthly pricing first' },
    { value: 'yearly-first', label: 'Show yearly pricing first' }
  ]
})

// List all flags for precomputing
export const precomputeFlags = [
  pricingPageVariantFlag,
  ctaButtonTextFlag,
  pricingDisplayFlag,
]