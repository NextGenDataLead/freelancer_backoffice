import { describe, it, expect } from 'vitest'
import { RateLimiter } from '../lib/rate-limiter'

describe('Authentication Components', () => {
  describe('RateLimiter', () => {
    it('should allow requests within limit', () => {
      const limiter = new RateLimiter({
        windowMs: 60000, // 1 minute
        max: 3,
        message: 'Rate limit exceeded'
      })

      const identifier = 'test-user'
      
      expect(limiter.check(identifier)).toBe(true)
      expect(limiter.check(identifier)).toBe(true)
      expect(limiter.check(identifier)).toBe(true)
    })

    it('should block requests over limit', () => {
      const limiter = new RateLimiter({
        windowMs: 60000, // 1 minute
        max: 2,
        message: 'Rate limit exceeded'
      })

      const identifier = 'test-user-2'
      
      expect(limiter.check(identifier)).toBe(true)
      expect(limiter.check(identifier)).toBe(true)
      expect(limiter.check(identifier)).toBe(false) // Should be blocked
    })

    it('should reset attempts for identifier', () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        max: 1,
        message: 'Rate limit exceeded'
      })

      const identifier = 'test-user-3'
      
      expect(limiter.check(identifier)).toBe(true)
      expect(limiter.check(identifier)).toBe(false)
      
      limiter.reset(identifier)
      expect(limiter.check(identifier)).toBe(true)
    })

    it('should track attempts correctly', () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        max: 5,
        message: 'Rate limit exceeded'
      })

      const identifier = 'test-user-4'
      
      limiter.check(identifier)
      limiter.check(identifier)
      
      expect(limiter.getAttempts(identifier)).toBe(2)
    })
  })
})