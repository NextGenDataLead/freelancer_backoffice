import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '@/app/api/time-entries/stats/route'
import { getCurrentDate } from '@/lib/current-date'

/**
 * Integration Tests for Time Entries Stats API
 *
 * Tests the /api/time-entries/stats endpoint including:
 * - Weekly stats calculation
 * - Monthly stats calculation
 * - Ready to Invoice (factureerbaar) calculation with frequency rules
 * - Active projects counting
 * - Rolling 30-day metrics
 */

// Mock dependencies
vi.mock('@/lib/supabase/financial-client', () => ({
  getCurrentUserProfile: vi.fn(),
  supabaseAdmin: {
    from: vi.fn()
  },
  ApiErrors: {
    Unauthorized: { status: 401, message: 'Unauthorized' },
    InternalError: { status: 500, message: 'Internal Server Error' }
  },
  createApiResponse: vi.fn((data) => ({ success: true, data }))
}))

vi.mock('@/lib/current-date', () => ({
  getCurrentDate: vi.fn()
}))

const mockGetCurrentUserProfile = vi.mocked(await import('@/lib/supabase/financial-client')).getCurrentUserProfile
const mockSupabaseAdmin = vi.mocked(await import('@/lib/supabase/financial-client')).supabaseAdmin
const mockGetCurrentDate = vi.mocked(getCurrentDate)

describe('GET /api/time-entries/stats', () => {
  const mockProfile = {
    id: 'user-123',
    tenant_id: 'tenant-abc',
    email: 'test@example.com'
  }

  const fixedDate = new Date('2024-01-15T12:00:00Z')

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCurrentDate.mockReturnValue(fixedDate)
    mockGetCurrentUserProfile.mockResolvedValue(mockProfile as any)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should return 401 if user is not authenticated', async () => {
    mockGetCurrentUserProfile.mockResolvedValue(null)

    const request = new Request('http://localhost:3000/api/time-entries/stats')
    const response = await GET(request)

    expect(response.status).toBe(401)
  })

  it('should calculate weekly stats correctly', async () => {
    // Mock this week's entries
    const thisWeekEntries = [
      { hours: 8, billable: true, hourly_rate: 75, effective_hourly_rate: null },
      { hours: 6.5, billable: true, hourly_rate: 75, effective_hourly_rate: null },
      { hours: 2, billable: false, hourly_rate: 75, effective_hourly_rate: null }
    ]

    // Mock previous week's entries
    const previousWeekEntries = [
      { hours: 7, billable: true },
      { hours: 5, billable: true }
    ]

    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockGte = vi.fn().mockReturnThis()
    const mockLte = vi.fn().mockReturnThis()

    let callCount = 0
    mockSupabaseAdmin.from.mockImplementation(() => ({
      select: mockSelect,
      eq: mockEq,
      gte: mockGte,
      lte: mockLte
    } as any))

    mockLte.mockImplementation(async () => {
      callCount++
      // First call: this week's entries
      if (callCount === 1) {
        return { data: thisWeekEntries, error: null }
      }
      // Second call: previous week's entries
      if (callCount === 2) {
        return { data: previousWeekEntries, error: null }
      }
      // Other calls return empty
      return { data: [], error: null }
    })

    const request = new Request('http://localhost:3000/api/time-entries/stats')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.thisWeek).toBeDefined()
    expect(data.data.thisWeek.billableHours).toBe(14.5) // 8 + 6.5
    expect(data.data.thisWeek.difference).toBe(2.5) // 14.5 - 12
  })

  it('should calculate "Ready to Invoice" (factureerbaar) correctly with frequency rules', async () => {
    const unbilledEntries = [
      {
        id: 'entry-1',
        hours: 8,
        hourly_rate: 75,
        effective_hourly_rate: null,
        entry_date: '2024-01-01', // 14 days ago
        billable: true,
        invoiced: false,
        client_id: 'client-weekly',
        clients: {
          id: 'client-weekly',
          invoicing_frequency: 'weekly'
        }
      },
      {
        id: 'entry-2',
        hours: 5,
        hourly_rate: 100,
        effective_hourly_rate: null,
        entry_date: '2024-01-14', // 1 day ago
        billable: true,
        invoiced: false,
        client_id: 'client-weekly-2',
        clients: {
          id: 'client-weekly-2',
          invoicing_frequency: 'weekly'
        }
      },
      {
        id: 'entry-3',
        hours: 10,
        hourly_rate: 80,
        effective_hourly_rate: null,
        entry_date: '2023-12-20', // Previous month
        billable: true,
        invoiced: false,
        client_id: 'client-monthly',
        clients: {
          id: 'client-monthly',
          invoicing_frequency: 'monthly'
        }
      },
      {
        id: 'entry-4',
        hours: 4,
        hourly_rate: 90,
        effective_hourly_rate: null,
        entry_date: '2024-01-10', // Current month
        billable: true,
        invoiced: false,
        client_id: 'client-monthly-2',
        clients: {
          id: 'client-monthly-2',
          invoicing_frequency: 'monthly'
        }
      },
      {
        id: 'entry-5',
        hours: 3,
        hourly_rate: 85,
        effective_hourly_rate: null,
        entry_date: '2024-01-15', // Today
        billable: true,
        invoiced: false,
        client_id: 'client-ondemand',
        clients: {
          id: 'client-ondemand',
          invoicing_frequency: 'on_demand'
        }
      }
    ]

    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockGte = vi.fn().mockReturnThis()
    const mockLte = vi.fn().mockReturnThis()

    let callCount = 0
    mockSupabaseAdmin.from.mockImplementation(() => ({
      select: mockSelect,
      eq: mockEq,
      gte: mockGte,
      lte: mockLte
    } as any))

    mockLte.mockImplementation(async () => {
      callCount++
      // Return unbilled entries on the appropriate call
      if (callCount === 3) {
        return { data: unbilledEntries, error: null }
      }
      return { data: [], error: null }
    })

    const request = new Request('http://localhost:3000/api/time-entries/stats')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)

    // Ready to invoice should include:
    // - entry-1: weekly, 14 days old (ready)
    // - entry-3: monthly, from previous month (ready)
    // - entry-5: on_demand (always ready)
    // Total: 8 + 10 + 3 = 21 hours
    expect(data.data.factureerbaar).toBeDefined()
    expect(data.data.factureerbaar.hours).toBe(21)

    // Revenue calculation: (8 * 75) + (10 * 80) + (3 * 85) = 600 + 800 + 255 = 1655
    expect(data.data.factureerbaar.revenue).toBe(1655)

    // Unbilled should include all entries
    expect(data.data.unbilled.hours).toBe(30) // 8 + 5 + 10 + 4 + 3
  })

  it('should calculate monthly stats correctly', async () => {
    const thisMonthEntries = [
      { hours: 40, billable: true, hourly_rate: 75, effective_hourly_rate: null, entry_date: '2024-01-05' },
      { hours: 35, billable: true, hourly_rate: 80, effective_hourly_rate: null, entry_date: '2024-01-10' },
      { hours: 8, billable: false, hourly_rate: 75, effective_hourly_rate: null, entry_date: '2024-01-12' }
    ]

    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockGte = vi.fn().mockReturnThis()
    const mockLte = vi.fn().mockReturnThis()

    let callCount = 0
    mockSupabaseAdmin.from.mockImplementation(() => ({
      select: mockSelect,
      eq: mockEq,
      gte: mockGte,
      lte: mockLte
    } as any))

    mockLte.mockImplementation(async () => {
      callCount++
      // Third call: this month's entries
      if (callCount === 3) {
        return { data: thisMonthEntries, error: null }
      }
      return { data: [], error: null }
    })

    const request = new Request('http://localhost:3000/api/time-entries/stats')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.thisMonth).toBeDefined()
    expect(data.data.thisMonth.hours).toBe(83) // 40 + 35 + 8
    expect(data.data.thisMonth.billableHours).toBe(75) // 40 + 35
    expect(data.data.thisMonth.nonBillableHours).toBe(8)

    // Revenue: (40 * 75) + (35 * 80) = 3000 + 2800 = 5800
    expect(data.data.thisMonth.billableRevenue).toBe(5800)
  })

  it('should count active projects correctly', async () => {
    const projectStats = [
      { project_id: 'proj-1', client_id: 'client-1', project_name: 'Website' },
      { project_id: 'proj-1', client_id: 'client-1', project_name: 'Website' }, // Duplicate
      { project_id: 'proj-2', client_id: 'client-1', project_name: 'Mobile App' },
      { project_id: null, client_id: 'client-2', project_name: 'Consulting' }, // Free text project
      { project_id: null, client_id: 'client-3', project_name: 'Support' } // Another free text
    ]

    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockGte = vi.fn().mockReturnThis()
    const mockLte = vi.fn().mockReturnThis()

    let callCount = 0
    mockSupabaseAdmin.from.mockImplementation(() => ({
      select: mockSelect,
      eq: mockEq,
      gte: mockGte,
      lte: mockLte
    } as any))

    mockLte.mockImplementation(async () => {
      callCount++
      // Last call before the projects query
      if (callCount === 8) {
        return { data: projectStats, error: null }
      }
      return { data: [], error: null }
    })

    const request = new Request('http://localhost:3000/api/time-entries/stats')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.projects).toBeDefined()

    // Should count unique projects: proj-1, proj-2, Consulting, Support = 4
    expect(data.data.projects.count).toBe(4)

    // Should count unique clients: client-1, client-2, client-3 = 3
    expect(data.data.projects.clients).toBe(3)
  })

  it('should handle errors gracefully', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockGte = vi.fn().mockReturnThis()
    const mockLte = vi.fn().mockImplementation(async () => ({
      data: null,
      error: { message: 'Database error' }
    }))

    mockSupabaseAdmin.from.mockImplementation(() => ({
      select: mockSelect,
      eq: mockEq,
      gte: mockGte,
      lte: mockLte
    } as any))

    const request = new Request('http://localhost:3000/api/time-entries/stats')
    const response = await GET(request)

    expect(response.status).toBe(500)
  })

  it('should calculate rolling 30-day metrics', async () => {
    const current30DaysEntries = [
      { hours: 20, billable: true, hourly_rate: 75, effective_hourly_rate: null, entry_date: '2024-01-10' },
      { hours: 15, billable: true, hourly_rate: 80, effective_hourly_rate: null, entry_date: '2024-01-05' },
      { hours: 5, billable: false, hourly_rate: 75, effective_hourly_rate: null, entry_date: '2024-01-12' }
    ]

    const previous30DaysEntries = [
      { hours: 18, billable: true, hourly_rate: 75, effective_hourly_rate: null, entry_date: '2023-12-20' },
      { hours: 12, billable: true, hourly_rate: 80, effective_hourly_rate: null, entry_date: '2023-12-25' }
    ]

    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockGte = vi.fn().mockReturnThis()
    const mockLte = vi.fn().mockReturnThis()
    const mockLt = vi.fn().mockReturnThis()

    let callCount = 0
    mockSupabaseAdmin.from.mockImplementation(() => ({
      select: mockSelect,
      eq: mockEq,
      gte: mockGte,
      lte: mockLte,
      lt: mockLt
    } as any))

    mockLte.mockImplementation(async () => {
      callCount++
      if (callCount === 5) {
        return { data: current30DaysEntries, error: null }
      }
      return { data: [], error: null }
    })

    mockLt.mockImplementation(async () => {
      return { data: previous30DaysEntries, error: null }
    })

    const request = new Request('http://localhost:3000/api/time-entries/stats')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.rolling30Days).toBeDefined()
    expect(data.data.rolling30Days.current).toBeDefined()
    expect(data.data.rolling30Days.previous).toBeDefined()

    // Current 30 days: 20 + 15 = 35 billable hours
    expect(data.data.rolling30Days.current.billableHours).toBe(35)

    // Previous 30 days: 18 + 12 = 30 billable hours
    expect(data.data.rolling30Days.previous.billableHours).toBe(30)
  })

  it('should use effective_hourly_rate when available', async () => {
    const entries = [
      {
        hours: 10,
        billable: true,
        hourly_rate: 75,
        effective_hourly_rate: 100, // Overridden rate
        entry_date: '2024-01-01',
        invoiced: false,
        client_id: 'client-1',
        clients: {
          id: 'client-1',
          invoicing_frequency: 'on_demand'
        }
      }
    ]

    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockGte = vi.fn().mockReturnThis()
    const mockLte = vi.fn().mockReturnThis()

    let callCount = 0
    mockSupabaseAdmin.from.mockImplementation(() => ({
      select: mockSelect,
      eq: mockEq,
      gte: mockGte,
      lte: mockLte
    } as any))

    mockLte.mockImplementation(async () => {
      callCount++
      if (callCount === 3) {
        return { data: entries, error: null }
      }
      return { data: [], error: null }
    })

    const request = new Request('http://localhost:3000/api/time-entries/stats')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)

    // Should use effective_hourly_rate: 10 * 100 = 1000
    expect(data.data.factureerbaar.revenue).toBe(1000)
  })
})
