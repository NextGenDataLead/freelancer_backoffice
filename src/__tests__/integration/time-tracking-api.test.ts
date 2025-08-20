import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMocks } from 'node-mocks-http'
import { auth } from '@clerk/nextjs/server'

/**
 * Time & Kilometer Tracking API Integration Tests
 * Testing time entries and travel expense tracking with business logic
 */

vi.mock('@clerk/nextjs/server')
vi.mock('../../lib/supabase/financial-client')

const mockAuth = vi.mocked(auth)
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    data: null,
    error: null
  }))
}

const mockUserProfile = {
  id: 'user-123',
  tenant_id: 'tenant-abc',
  default_hourly_rate: 75.00
}

describe('Time Entry API Integration Tests', () => {
  beforeEach(() => {
    mockAuth.mockReturnValue({
      userId: 'clerk-user-123',
      sessionId: 'session-123'
    })
    vi.clearAllMocks()
  })

  describe('POST /api/time-entries', () => {
    it('should create time entry with automatic rate calculation', async () => {
      const timeEntryData = {
        client_id: 'client-123',
        project_name: 'Website Redesign',
        description: 'Frontend development',
        start_time: '2024-01-15T09:00:00Z',
        end_time: '2024-01-15T17:30:00Z',
        hours: 8.5,
        is_billable: true,
        hourly_rate: null // Should use default rate
      }

      const createdTimeEntry = {
        id: 'time-entry-123',
        ...timeEntryData,
        hourly_rate: 75.00, // From user profile
        total_value: 637.50, // 8.5 * 75.00
        tenant_id: 'tenant-abc',
        is_invoiced: false
      }

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: createdTimeEntry,
        error: null
      })

      const { req } = createMocks({
        method: 'POST',
        body: timeEntryData
      })

      const handler = await import('../../app/api/time-entries/route')
      const response = await handler.POST(req as any)

      expect(response.status).toBe(201)
      const responseData = await response.json()
      
      expect(responseData.data.hourly_rate).toBe(75.00)
      expect(responseData.data.total_value).toBe(637.50)
      expect(responseData.data.is_billable).toBe(true)
    })

    it('should allow custom hourly rate override', async () => {
      const timeEntryData = {
        client_id: 'client-premium',
        project_name: 'Premium Project',
        description: 'Specialized consulting',
        hours: 4.0,
        is_billable: true,
        hourly_rate: 125.00 // Custom rate
      }

      const createdTimeEntry = {
        id: 'time-entry-premium',
        ...timeEntryData,
        total_value: 500.00, // 4.0 * 125.00
        tenant_id: 'tenant-abc',
        is_invoiced: false
      }

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: createdTimeEntry,
        error: null
      })

      const { req } = createMocks({
        method: 'POST',
        body: timeEntryData
      })

      const handler = await import('../../app/api/time-entries/route')
      const response = await handler.POST(req as any)

      const responseData = await response.json()
      expect(responseData.data.hourly_rate).toBe(125.00)
      expect(responseData.data.total_value).toBe(500.00)
    })

    it('should handle non-billable time entries', async () => {
      const nonBillableData = {
        client_id: 'client-123',
        project_name: 'Internal Training',
        description: 'Team meeting',
        hours: 2.0,
        is_billable: false,
        hourly_rate: 0
      }

      const createdTimeEntry = {
        id: 'time-entry-nonbillable',
        ...nonBillableData,
        total_value: 0.00,
        tenant_id: 'tenant-abc'
      }

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: createdTimeEntry,
        error: null
      })

      const { req } = createMocks({
        method: 'POST',
        body: nonBillableData
      })

      const handler = await import('../../app/api/time-entries/route')
      const response = await handler.POST(req as any)

      const responseData = await response.json()
      expect(responseData.data.is_billable).toBe(false)
      expect(responseData.data.total_value).toBe(0.00)
      expect(responseData.data.hourly_rate).toBe(0)
    })

    it('should validate time entry data', async () => {
      const invalidData = {
        // Missing required fields
        project_name: '',
        hours: -1, // Invalid negative hours
        is_billable: true
      }

      const { req } = createMocks({
        method: 'POST',
        body: invalidData
      })

      const handler = await import('../../app/api/time-entries/route')
      const response = await handler.POST(req as any)

      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.message).toContain('validation')
    })

    it('should prevent time overlap validation', async () => {
      const overlappingData = {
        client_id: 'client-123',
        project_name: 'Project A',
        description: 'Work',
        start_time: '2024-01-15T09:00:00Z',
        end_time: '2024-01-15T17:00:00Z',
        hours: 8.0,
        is_billable: true
      }

      // Mock existing overlapping entry check
      mockSupabaseClient.from().select().eq().data = [{
        id: 'existing-entry',
        start_time: '2024-01-15T08:00:00Z',
        end_time: '2024-01-15T16:00:00Z'
      }]

      const { req } = createMocks({
        method: 'POST',
        body: overlappingData
      })

      const handler = await import('../../app/api/time-entries/route')
      const response = await handler.POST(req as any)

      expect(response.status).toBe(409)
      const responseData = await response.json()
      expect(responseData.message).toContain('overlapping')
    })
  })

  describe('GET /api/time-entries', () => {
    it('should return paginated time entries with client info', async () => {
      const mockTimeEntries = [
        {
          id: 'entry-1',
          client_id: 'client-123',
          project_name: 'Project A',
          hours: 8.0,
          hourly_rate: 75.00,
          total_value: 600.00,
          is_billable: true,
          is_invoiced: false,
          client: {
            name: 'Client A',
            company_name: 'Company A BV'
          }
        },
        {
          id: 'entry-2',
          client_id: 'client-456',
          project_name: 'Project B',
          hours: 4.5,
          hourly_rate: 80.00,
          total_value: 360.00,
          is_billable: true,
          is_invoiced: true,
          client: {
            name: 'Client B',
            company_name: null
          }
        }
      ]

      mockSupabaseClient.from().select().eq().data = mockTimeEntries
      mockSupabaseClient.from().select().eq().error = null

      const { req } = createMocks({
        method: 'GET',
        query: { page: '1', limit: '10' }
      })

      const handler = await import('../../app/api/time-entries/route')
      await handler.GET(req as any)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('time_entries')
      expect(mockSupabaseClient.from().select).toHaveBeenCalledWith(
        expect.stringContaining('client:clients(name,company_name)')
      )
    })

    it('should filter unbilled time entries', async () => {
      const { req } = createMocks({
        method: 'GET',
        query: { unbilled_only: 'true' }
      })

      const handler = await import('../../app/api/time-entries/route')
      await handler.GET(req as any)

      expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('is_invoiced', false)
      expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('is_billable', true)
    })

    it('should filter by date range', async () => {
      const { req } = createMocks({
        method: 'GET',
        query: {
          date_from: '2024-01-01',
          date_to: '2024-01-31'
        }
      })

      const handler = await import('../../app/api/time-entries/route')
      await handler.GET(req as any)

      // Verify date range filtering is applied
      expect(mockSupabaseClient.from().select).toHaveBeenCalledWith(
        expect.stringContaining('entry_date.gte')
      )
    })
  })

  describe('PUT /api/time-entries/[id]', () => {
    it('should update time entry and recalculate total value', async () => {
      const existingEntry = {
        id: 'entry-123',
        hours: 8.0,
        hourly_rate: 75.00,
        total_value: 600.00,
        tenant_id: 'tenant-abc',
        is_invoiced: false
      }

      const updateData = {
        hours: 6.5,
        hourly_rate: 80.00
      }

      const updatedEntry = {
        ...existingEntry,
        ...updateData,
        total_value: 520.00 // 6.5 * 80.00
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: existingEntry,
        error: null
      })

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: updatedEntry,
        error: null
      })

      const { req } = createMocks({
        method: 'PUT',
        query: { id: 'entry-123' },
        body: updateData
      })

      const handler = await import('../../app/api/time-entries/[id]/route')
      const response = await handler.PUT(req as any, { params: { id: 'entry-123' } })

      expect(response.status).toBe(200)
      const responseData = await response.json()
      expect(responseData.data.total_value).toBe(520.00)
    })

    it('should prevent updating invoiced time entries', async () => {
      const invoicedEntry = {
        id: 'entry-invoiced',
        is_invoiced: true,
        invoice_id: 'invoice-123',
        tenant_id: 'tenant-abc'
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: invoicedEntry,
        error: null
      })

      const { req } = createMocks({
        method: 'PUT',
        query: { id: 'entry-invoiced' },
        body: { hours: 10.0 }
      })

      const handler = await import('../../app/api/time-entries/[id]/route')
      const response = await handler.PUT(req as any, { params: { id: 'entry-invoiced' } })

      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.message).toContain('already invoiced')
    })
  })
})

describe('Kilometer Entry API Integration Tests', () => {
  beforeEach(() => {
    mockAuth.mockReturnValue({
      userId: 'clerk-user-123',
      sessionId: 'session-123'
    })
    vi.clearAllMocks()
  })

  describe('POST /api/kilometer-entries', () => {
    it('should create kilometer entry with automatic cost calculation', async () => {
      const kmEntryData = {
        client_id: 'client-123',
        travel_date: '2024-01-15',
        from_address: 'Amsterdam',
        to_address: 'Utrecht', 
        kilometers: 45,
        is_business_trip: true,
        description: 'Client meeting',
        rate_per_km: 0.19 // Dutch standard rate
      }

      const createdKmEntry = {
        id: 'km-entry-123',
        ...kmEntryData,
        total_cost: 8.55, // 45 * 0.19
        tenant_id: 'tenant-abc'
      }

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: createdKmEntry,
        error: null
      })

      const { req } = createMocks({
        method: 'POST',
        body: kmEntryData
      })

      const handler = await import('../../app/api/kilometer-entries/route')
      const response = await handler.POST(req as any)

      expect(response.status).toBe(201)
      const responseData = await response.json()
      
      expect(responseData.data.total_cost).toBe(8.55)
      expect(responseData.data.is_business_trip).toBe(true)
    })

    it('should use default Dutch kilometer rate', async () => {
      const kmEntryData = {
        client_id: 'client-123',
        travel_date: '2024-01-15',
        from_address: 'Amsterdam',
        to_address: 'Rotterdam',
        kilometers: 60,
        is_business_trip: true,
        description: 'Business visit'
        // No rate_per_km specified - should use default
      }

      const createdKmEntry = {
        id: 'km-entry-default',
        ...kmEntryData,
        rate_per_km: 0.19, // Default Dutch rate
        total_cost: 11.40, // 60 * 0.19
        tenant_id: 'tenant-abc'
      }

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: createdKmEntry,
        error: null
      })

      const { req } = createMocks({
        method: 'POST',
        body: kmEntryData
      })

      const handler = await import('../../app/api/kilometer-entries/route')
      const response = await handler.POST(req as any)

      const responseData = await response.json()
      expect(responseData.data.rate_per_km).toBe(0.19)
      expect(responseData.data.total_cost).toBe(11.40)
    })

    it('should handle private trips with zero cost', async () => {
      const privateKmData = {
        client_id: null,
        travel_date: '2024-01-15',
        from_address: 'Home',
        to_address: 'Grocery Store',
        kilometers: 5,
        is_business_trip: false,
        description: 'Personal errands'
      }

      const createdKmEntry = {
        id: 'km-entry-private',
        ...privateKmData,
        rate_per_km: 0.00,
        total_cost: 0.00,
        tenant_id: 'tenant-abc'
      }

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: createdKmEntry,
        error: null
      })

      const { req } = createMocks({
        method: 'POST',
        body: privateKmData
      })

      const handler = await import('../../app/api/kilometer-entries/route')
      const response = await handler.POST(req as any)

      const responseData = await response.json()
      expect(responseData.data.is_business_trip).toBe(false)
      expect(responseData.data.total_cost).toBe(0.00)
    })

    it('should validate kilometer entry data', async () => {
      const invalidData = {
        // Missing required fields
        travel_date: '2024-01-15',
        kilometers: -10, // Invalid negative kilometers
        is_business_trip: true
      }

      const { req } = createMocks({
        method: 'POST',
        body: invalidData
      })

      const handler = await import('../../app/api/kilometer-entries/route')
      const response = await handler.POST(req as any)

      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.message).toContain('validation')
    })

    it('should require business trip classification for client billing', async () => {
      const businessTripData = {
        client_id: 'client-123',
        travel_date: '2024-01-15',
        from_address: 'Office',
        to_address: 'Client Site',
        kilometers: 25,
        is_business_trip: false, // Inconsistent: has client but marked as private
        description: 'Client meeting'
      }

      const { req } = createMocks({
        method: 'POST',
        body: businessTripData
      })

      const handler = await import('../../app/api/kilometer-entries/route')
      const response = await handler.POST(req as any)

      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.message).toContain('Business trip required for client billing')
    })
  })

  describe('GET /api/kilometer-entries', () => {
    it('should return paginated kilometer entries with client info', async () => {
      const mockKmEntries = [
        {
          id: 'km-1',
          client_id: 'client-123',
          travel_date: '2024-01-15',
          from_address: 'Amsterdam',
          to_address: 'Utrecht',
          kilometers: 45,
          total_cost: 8.55,
          is_business_trip: true,
          client: {
            name: 'Client A',
            company_name: 'Company A BV'
          }
        },
        {
          id: 'km-2',
          client_id: null,
          travel_date: '2024-01-16',
          from_address: 'Home',
          to_address: 'Supermarket',
          kilometers: 8,
          total_cost: 0.00,
          is_business_trip: false,
          client: null
        }
      ]

      mockSupabaseClient.from().select().eq().data = mockKmEntries
      mockSupabaseClient.from().select().eq().error = null

      const { req } = createMocks({
        method: 'GET',
        query: { page: '1', limit: '10' }
      })

      const handler = await import('../../app/api/kilometer-entries/route')
      await handler.GET(req as any)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('kilometer_entries')
      expect(mockSupabaseClient.from().select).toHaveBeenCalledWith(
        expect.stringContaining('client:clients(name,company_name)')
      )
    })

    it('should filter business trips only', async () => {
      const { req } = createMocks({
        method: 'GET',
        query: { business_only: 'true' }
      })

      const handler = await import('../../app/api/kilometer-entries/route')
      await handler.GET(req as any)

      expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('is_business_trip', true)
    })

    it('should filter by travel date range', async () => {
      const { req } = createMocks({
        method: 'GET',
        query: {
          date_from: '2024-01-01',
          date_to: '2024-01-31'
        }
      })

      const handler = await import('../../app/api/kilometer-entries/route')
      await handler.GET(req as any)

      // Verify date filtering is applied
      expect(mockSupabaseClient.from().select).toHaveBeenCalledWith(
        expect.stringContaining('travel_date.gte')
      )
    })

    it('should calculate monthly kilometer totals', async () => {
      const mockSummary = [
        {
          month: '2024-01',
          total_kilometers: 450,
          business_kilometers: 380,
          private_kilometers: 70,
          total_cost: 72.20
        }
      ]

      mockSupabaseClient.from().select().eq().data = mockSummary

      const { req } = createMocks({
        method: 'GET',
        query: { 
          summary: 'true',
          year: '2024'
        }
      })

      const handler = await import('../../app/api/kilometer-entries/route')
      await handler.GET(req as any)

      // Verify summary calculation query
      expect(mockSupabaseClient.from().select).toHaveBeenCalledWith(
        expect.stringContaining('sum(kilometers)')
      )
    })
  })
})