// Client-side A/B testing configuration
// Simple deterministic assignment based on user session

type VariantType = 'control' | 'variant-a' | 'variant-b'
type CTATextType = 'Start Free Trial' | 'Get Started Free' | 'Try It Free'
type PricingDisplayType = 'monthly-first' | 'yearly-first'

// Generate consistent user ID for session-based experiments
function getUserSessionId(): string {
  if (typeof window === 'undefined') return 'server'
  
  let userId = localStorage.getItem('ab-test-user-id')
  if (!userId) {
    userId = Math.random().toString(36).substring(2, 15)
    localStorage.setItem('ab-test-user-id', userId)
  }
  return userId
}

// Simple hash function for deterministic assignment
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

// Pricing page variant experiment
export async function pricingPageVariantFlag(): Promise<VariantType> {
  const userId = getUserSessionId()
  const hash = hashString(userId + 'pricing-variant')
  const bucket = hash % 100
  
  if (bucket < 33) return 'control'
  if (bucket < 66) return 'variant-a'
  return 'variant-b'
}

// CTA button text experiment
export async function ctaButtonTextFlag(): Promise<CTATextType> {
  const userId = getUserSessionId()
  const hash = hashString(userId + 'cta-text')
  const bucket = hash % 100
  
  if (bucket < 33) return 'Start Free Trial'
  if (bucket < 66) return 'Get Started Free'
  return 'Try It Free'
}

// Pricing display experiment
export async function pricingDisplayFlag(): Promise<PricingDisplayType> {
  const userId = getUserSessionId()
  const hash = hashString(userId + 'pricing-display')
  const bucket = hash % 100
  
  return bucket < 50 ? 'monthly-first' : 'yearly-first'
}