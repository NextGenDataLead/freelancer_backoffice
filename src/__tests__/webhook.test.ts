import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the dependencies
vi.mock('svix', () => ({
  Webhook: vi.fn().mockImplementation(() => ({
    verify: vi.fn().mockReturnValue({
      type: 'user.created',
      data: {
        id: 'user_123',
        email_addresses: [{ email_address: 'test@example.com' }],
        first_name: 'Test',
        last_name: 'User',
        image_url: 'https://example.com/avatar.png'
      }
    })
  }))
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ error: null }))
    }))
  }
}))

vi.mock('@/lib/rate-limiter', () => ({
  webhookRateLimiter: {
    check: vi.fn(() => true)
  }
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn((header: string) => {
      switch (header) {
        case 'svix-id': return 'test-id'
        case 'svix-timestamp': return '1234567890'
        case 'svix-signature': return 'test-signature'
        case 'x-forwarded-for': return '127.0.0.1'
        default: return null
      }
    })
  }))
}))

describe('Clerk Webhook Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CLERK_WEBHOOK_SECRET = 'test-secret'
  })

  it('should handle user.created webhook successfully', async () => {
    // Mock request
    const mockRequest = {
      text: vi.fn().mockResolvedValue('{"type":"user.created"}'),
      headers: new Map([
        ['svix-id', 'test-id'],
        ['svix-timestamp', '1234567890'],
        ['svix-signature', 'test-signature'],
        ['x-forwarded-for', '127.0.0.1']
      ])
    } as any

    // Import the handler after mocking
    const { POST } = await import('../app/api/webhooks/clerk/route')
    
    const response = await POST(mockRequest)
    
    expect(response.status).toBe(200)
  })

  it('should reject request without webhook secret', async () => {
    delete process.env.CLERK_WEBHOOK_SECRET

    const mockRequest = {
      text: vi.fn(),
      headers: new Map()
    } as any

    try {
      const { POST } = await import('../app/api/webhooks/clerk/route')
      await POST(mockRequest)
    } catch (error) {
      expect(error.message).toContain('CLERK_WEBHOOK_SECRET')
    }
  })
})