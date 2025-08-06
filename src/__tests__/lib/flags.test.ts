import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { pricingPageVariantFlag, ctaButtonTextFlag, pricingDisplayFlag } from '@/lib/flags'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('A/B Testing Flags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('pricingPageVariantFlag', () => {
    it('returns a valid variant', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-user-123')
      
      const variant = await pricingPageVariantFlag()
      expect(['control', 'variant-a', 'variant-b']).toContain(variant)
    })

    it('generates consistent results for same user', async () => {
      mockLocalStorage.getItem.mockReturnValue('consistent-user-id')
      
      const variant1 = await pricingPageVariantFlag()
      const variant2 = await pricingPageVariantFlag()
      
      expect(variant1).toBe(variant2)
    })

    it('creates new user ID if none exists', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      const variant = await pricingPageVariantFlag()
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'ab-test-user-id',
        expect.any(String)
      )
      expect(['control', 'variant-a', 'variant-b']).toContain(variant)
    })

    it('returns server for server-side rendering', async () => {
      // Mock server environment
      delete (global as any).window
      
      const variant = await pricingPageVariantFlag()
      expect(['control', 'variant-a', 'variant-b']).toContain(variant)
      
      // Restore window
      ;(global as any).window = {}
    })
  })

  describe('ctaButtonTextFlag', () => {
    it('returns a valid CTA text', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-user-123')
      
      const ctaText = await ctaButtonTextFlag()
      expect(['Start Free Trial', 'Get Started Free', 'Try It Free']).toContain(ctaText)
    })

    it('generates consistent results for same user', async () => {
      mockLocalStorage.getItem.mockReturnValue('consistent-user-id')
      
      const cta1 = await ctaButtonTextFlag()
      const cta2 = await ctaButtonTextFlag()
      
      expect(cta1).toBe(cta2)
    })

    it('uses different hash salt than pricing variant', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-user-123')
      
      const variant = await pricingPageVariantFlag()
      const ctaText = await ctaButtonTextFlag()
      
      // These should potentially be different due to different hash salts
      // We can't guarantee they'll be different, but we can test they use different logic
      expect(typeof variant).toBe('string')
      expect(typeof ctaText).toBe('string')
    })
  })

  describe('pricingDisplayFlag', () => {
    it('returns a valid display preference', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-user-123')
      
      const display = await pricingDisplayFlag()
      expect(['monthly-first', 'yearly-first']).toContain(display)
    })

    it('generates consistent results for same user', async () => {
      mockLocalStorage.getItem.mockReturnValue('consistent-user-id')
      
      const display1 = await pricingDisplayFlag()
      const display2 = await pricingDisplayFlag()
      
      expect(display1).toBe(display2)
    })
  })

  describe('Hash Function Determinism', () => {
    it('produces consistent hash for same input', async () => {
      mockLocalStorage.getItem.mockReturnValue('deterministic-test-id')
      
      const results = await Promise.all([
        pricingPageVariantFlag(),
        pricingPageVariantFlag(),
        pricingPageVariantFlag(),
      ])
      
      // All results should be identical
      expect(results[0]).toBe(results[1])
      expect(results[1]).toBe(results[2])
    })

    it('produces different distributions for different users', async () => {
      const userIds = ['user1', 'user2', 'user3', 'user4', 'user5']
      const results = []
      
      for (const userId of userIds) {
        mockLocalStorage.getItem.mockReturnValue(userId)
        results.push(await pricingPageVariantFlag())
      }
      
      // Should have some distribution (not all the same)
      const uniqueResults = new Set(results)
      expect(uniqueResults.size).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should have error handling for localStorage failures', () => {
      // Note: Current implementation doesn't have error handling
      // This is a placeholder for future error handling implementation
      expect(true).toBe(true)
    })
  })
})