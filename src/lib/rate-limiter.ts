interface RateLimiterOptions {
  windowMs: number
  max: number
  message: string
}

export class RateLimiter {
  private requests = new Map<string, number[]>()

  constructor(private options: RateLimiterOptions) {}

  check(identifier: string): boolean {
    const now = Date.now()
    const windowStart = now - this.options.windowMs
    
    // Get existing requests for this identifier
    const requests = this.requests.get(identifier) || []
    
    // Filter out old requests
    const recentRequests = requests.filter(time => time > windowStart)
    
    // Check if limit exceeded
    if (recentRequests.length >= this.options.max) {
      return false
    }
    
    // Add current request
    recentRequests.push(now)
    this.requests.set(identifier, recentRequests)
    
    return true
  }

  reset(identifier: string) {
    this.requests.delete(identifier)
  }

  getAttempts(identifier: string): number {
    const now = Date.now()
    const windowStart = now - this.options.windowMs
    const requests = this.requests.get(identifier) || []
    return requests.filter(time => time > windowStart).length
  }
}

// Auth-specific rate limiters
export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many authentication attempts. Please try again later.'
})

export const webhookRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 webhook attempts per minute
  message: 'Too many webhook requests. Please try again later.'
})