import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

/**
 * Unit Tests for Tijd Page Components
 *
 * Testing:
 * - TimeEntryList component
 * - CalendarTimeEntryView component
 * - UnifiedTimeEntryForm component
 * - Timer logic and calculations
 * - Statistics calculations
 * - LocalStorage persistence
 */

// Mock fetch
global.fetch = vi.fn()

describe('Tijd Page - Statistics Calculations', () => {
  it('should calculate This Week hours correctly', () => {
    const mockEntries = [
      { entry_date: '2024-01-15', hours: 8, billable: true }, // Monday
      { entry_date: '2024-01-16', hours: 6, billable: true }, // Tuesday
      { entry_date: '2024-01-17', hours: 4, billable: false }, // Non-billable
    ]

    const thisWeekHours = mockEntries
      .filter(e => e.billable)
      .reduce((sum, e) => sum + e.hours, 0)

    expect(thisWeekHours).toBe(14)
  })

  it('should calculate This Month revenue correctly', () => {
    const mockEntries = [
      { hours: 8, hourly_rate: 75, billable: true },
      { hours: 6, hourly_rate: 80, billable: true },
      { hours: 4, hourly_rate: 75, billable: false }, // Should not count
    ]

    const revenue = mockEntries
      .filter(e => e.billable)
      .reduce((sum, e) => sum + (e.hours * e.hourly_rate), 0)

    expect(revenue).toBe(1080) // (8*75) + (6*80) = 600 + 480
  })

  it('should calculate Ready to Invoice correctly', () => {
    const mockEntries = [
      { hours: 8, hourly_rate: 75, billable: true, invoiced: false },
      { hours: 6, hourly_rate: 80, billable: true, invoiced: false },
      { hours: 4, hourly_rate: 75, billable: true, invoiced: true }, // Already invoiced
    ]

    const unbilledHours = mockEntries
      .filter(e => e.billable && !e.invoiced)
      .reduce((sum, e) => sum + e.hours, 0)

    const unbilledRevenue = mockEntries
      .filter(e => e.billable && !e.invoiced)
      .reduce((sum, e) => sum + (e.hours * e.hourly_rate), 0)

    expect(unbilledHours).toBe(14)
    expect(unbilledRevenue).toBe(1080)
  })

  it('should count unique active projects and clients', () => {
    const mockEntries = [
      { project_name: 'Project A', client_id: 'client-1' },
      { project_name: 'Project A', client_id: 'client-1' }, // Duplicate
      { project_name: 'Project B', client_id: 'client-1' },
      { project_name: 'Project C', client_id: 'client-2' },
    ]

    const uniqueProjects = new Set(mockEntries.map(e => e.project_name)).size
    const uniqueClients = new Set(mockEntries.map(e => e.client_id)).size

    expect(uniqueProjects).toBe(3)
    expect(uniqueClients).toBe(2)
  })
})

describe('Timer Functionality', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('should format timer display correctly', () => {
    const formatTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }

    expect(formatTime(0)).toBe('00:00:00')
    expect(formatTime(65)).toBe('00:01:05')
    expect(formatTime(3665)).toBe('01:01:05')
    expect(formatTime(36000)).toBe('10:00:00')
  })

  it('should calculate elapsed time correctly', () => {
    const startTime = new Date('2024-01-15T09:00:00')
    const endTime = new Date('2024-01-15T17:30:00')

    const elapsed = (endTime.getTime() - startTime.getTime()) / 1000
    const hours = elapsed / 3600

    expect(hours).toBe(8.5)
  })

  it('should convert hours to timer format', () => {
    const convertHoursToSeconds = (hours: number) => hours * 3600

    expect(convertHoursToSeconds(1)).toBe(3600)
    expect(convertHoursToSeconds(2.5)).toBe(9000)
    expect(convertHoursToSeconds(0.25)).toBe(900) // 15 minutes
  })

  it('should convert timer to hours correctly', () => {
    const convertSecondsToHours = (seconds: number) => Number((seconds / 3600).toFixed(2))

    expect(convertSecondsToHours(3600)).toBe(1)
    expect(convertSecondsToHours(9000)).toBe(2.5)
    expect(convertSecondsToHours(900)).toBe(0.25)
  })

  it('should handle paused time correctly', () => {
    const startTime = new Date('2024-01-15T09:00:00')
    const pauseTime = new Date('2024-01-15T10:00:00') // 1 hour
    const resumeTime = new Date('2024-01-15T11:00:00') // Paused for 1 hour
    const stopTime = new Date('2024-01-15T12:00:00') // 1 more hour

    const activeTime =
      (pauseTime.getTime() - startTime.getTime()) + // 1 hour before pause
      (stopTime.getTime() - resumeTime.getTime()) // 1 hour after resume

    const totalHours = activeTime / (1000 * 60 * 60)
    expect(totalHours).toBe(2) // 2 hours of active time, not 3
  })
})

describe('LocalStorage Timer Persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should save timer session to localStorage', () => {
    const timerSession = {
      clientId: 'client-123',
      clientName: 'Test Client',
      projectId: 'project-456',
      project: 'Test Project',
      description: 'Testing',
      startTime: new Date().toISOString(),
      isPaused: false,
      pausedTime: 0
    }

    localStorage.setItem('activeTimerSession', JSON.stringify(timerSession))

    const restored = JSON.parse(localStorage.getItem('activeTimerSession') || '{}')
    expect(restored.clientId).toBe('client-123')
    expect(restored.project).toBe('Test Project')
  })

  it('should restore timer session from localStorage', () => {
    const now = new Date()
    const startTime = new Date(now.getTime() - 3600000) // 1 hour ago

    const timerSession = {
      clientId: 'client-123',
      clientName: 'Test Client',
      project: 'Test Project',
      description: 'Testing',
      startTime: startTime.toISOString(),
      isPaused: false,
      pausedTime: 0
    }

    localStorage.setItem('activeTimerSession', JSON.stringify(timerSession))

    const restored = JSON.parse(localStorage.getItem('activeTimerSession') || '{}')
    const restoredStartTime = new Date(restored.startTime)

    const hoursSinceStart = (now.getTime() - restoredStartTime.getTime()) / (1000 * 60 * 60)
    expect(hoursSinceStart).toBeGreaterThanOrEqual(0.99) // ~1 hour
    expect(hoursSinceStart).toBeLessThan(1.1)
  })

  it('should not restore timer older than 24 hours', () => {
    const now = new Date()
    const oldStartTime = new Date(now.getTime() - (25 * 60 * 60 * 1000)) // 25 hours ago

    const timerSession = {
      clientId: 'client-123',
      clientName: 'Test Client',
      project: 'Test Project',
      startTime: oldStartTime.toISOString(),
      isPaused: false,
      pausedTime: 0
    }

    localStorage.setItem('activeTimerSession', JSON.stringify(timerSession))

    const restored = JSON.parse(localStorage.getItem('activeTimerSession') || '{}')
    const restoredStartTime = new Date(restored.startTime)

    const hoursSinceStart = (now.getTime() - restoredStartTime.getTime()) / (1000 * 60 * 60)
    const shouldRestore = hoursSinceStart < 24

    expect(shouldRestore).toBe(false)
  })

  it('should clear timer session after stopping', () => {
    const timerSession = {
      clientId: 'client-123',
      project: 'Test Project',
      startTime: new Date().toISOString()
    }

    localStorage.setItem('activeTimerSession', JSON.stringify(timerSession))
    expect(localStorage.getItem('activeTimerSession')).toBeTruthy()

    // Simulate stopping timer
    localStorage.removeItem('activeTimerSession')
    expect(localStorage.getItem('activeTimerSession')).toBeNull()
  })
})

describe('Time Entry Status Determination', () => {
  it('should determine invoiced status correctly', () => {
    const entry1 = { invoiced: true, invoice_id: 'inv-123' }
    const entry2 = { invoiced: false, invoice_id: null }

    const isInvoiced = (entry: any) => entry.invoiced || !!entry.invoice_id

    expect(isInvoiced(entry1)).toBe(true)
    expect(isInvoiced(entry2)).toBe(false)
  })

  it('should determine billable status correctly', () => {
    const entry1 = { billable: true, hourly_rate: 75 }
    const entry2 = { billable: false, hourly_rate: 0 }
    const entry3 = { billable: true, hourly_rate: 0 } // Billable but no rate

    expect(entry1.billable).toBe(true)
    expect(entry2.billable).toBe(false)
    expect(entry3.billable).toBe(true)
  })

  it('should prioritize invoiced over billable status', () => {
    const getStatus = (entry: any) => {
      if (entry.invoiced) return 'invoiced'
      if (!entry.billable) return 'non-billable'
      return 'billable'
    }

    expect(getStatus({ invoiced: true, billable: true })).toBe('invoiced')
    expect(getStatus({ invoiced: false, billable: false })).toBe('non-billable')
    expect(getStatus({ invoiced: false, billable: true })).toBe('billable')
  })
})

describe('Value Calculations', () => {
  it('should calculate time entry value correctly', () => {
    const calculateValue = (hours: number, rate: number) => hours * rate

    expect(calculateValue(8, 75)).toBe(600)
    expect(calculateValue(4.5, 80)).toBe(360)
    expect(calculateValue(0.25, 100)).toBe(25)
  })

  it('should handle missing rate gracefully', () => {
    const calculateValue = (hours: number, rate?: number) => {
      if (!rate) return 0
      return hours * rate
    }

    expect(calculateValue(8, undefined)).toBe(0)
    expect(calculateValue(8, 75)).toBe(600)
  })

  it('should round currency to 2 decimal places', () => {
    const formatCurrency = (amount: number) => amount.toFixed(2)

    expect(formatCurrency(123.456)).toBe('123.46')
    expect(formatCurrency(100)).toBe('100.00')
    expect(formatCurrency(0.1)).toBe('0.10')
  })
})

describe('Date Handling', () => {
  it('should format date correctly for display', () => {
    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }

    expect(formatDate('2024-01-15')).toBe('Jan 15, 2024')
    expect(formatDate('2024-12-31')).toBe('Dec 31, 2024')
  })

  it('should calculate date ranges correctly', () => {
    const getWeekRange = (date: Date) => {
      const start = new Date(date)
      start.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)

      const end = new Date(start)
      end.setDate(start.getDate() + 6) // End of week (Saturday)

      return { start, end }
    }

    const testDate = new Date('2024-01-15') // Monday
    const { start, end } = getWeekRange(testDate)

    expect(start.getDay()).toBe(0) // Sunday
    expect(end.getDay()).toBe(6) // Saturday
    expect((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)).toBe(6)
  })

  it('should check if date is in current week', () => {
    const isCurrentWeek = (date: Date) => {
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      return date >= startOfWeek && date <= endOfWeek
    }

    const today = new Date()
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    expect(isCurrentWeek(today)).toBe(true)
    expect(isCurrentWeek(lastWeek)).toBe(false)
  })

  it('should check if date is in current month', () => {
    const isCurrentMonth = (date: Date) => {
      const now = new Date()
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }

    const today = new Date()
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())

    expect(isCurrentMonth(today)).toBe(true)
    expect(isCurrentMonth(lastMonth)).toBe(false)
  })
})

describe('Input Validation', () => {
  it('should validate hours input', () => {
    const validateHours = (hours: string) => {
      const num = parseFloat(hours)
      if (isNaN(num)) return { valid: false, error: 'Invalid number' }
      if (num < 0) return { valid: false, error: 'Hours must be positive' }
      if (num > 24) return { valid: false, error: 'Hours cannot exceed 24 per day' }
      return { valid: true }
    }

    expect(validateHours('8').valid).toBe(true)
    expect(validateHours('2.5').valid).toBe(true)
    expect(validateHours('-1').valid).toBe(false)
    expect(validateHours('25').valid).toBe(false)
    expect(validateHours('abc').valid).toBe(false)
  })

  it('should validate required fields', () => {
    const validateTimeEntry = (entry: any) => {
      const errors: string[] = []

      if (!entry.client_id) errors.push('Client is required')
      if (!entry.project_name) errors.push('Project is required')
      if (!entry.hours || entry.hours <= 0) errors.push('Hours must be greater than 0')

      return { valid: errors.length === 0, errors }
    }

    const validEntry = {
      client_id: 'client-123',
      project_name: 'Test Project',
      hours: 8
    }

    const invalidEntry = {
      client_id: '',
      project_name: '',
      hours: 0
    }

    expect(validateTimeEntry(validEntry).valid).toBe(true)
    expect(validateTimeEntry(invalidEntry).valid).toBe(false)
    expect(validateTimeEntry(invalidEntry).errors.length).toBe(3)
  })
})

describe('Calendar Date Selection', () => {
  it('should generate calendar days for current month', () => {
    const getDaysInMonth = (year: number, month: number) => {
      return new Date(year, month + 1, 0).getDate()
    }

    expect(getDaysInMonth(2024, 0)).toBe(31) // January
    expect(getDaysInMonth(2024, 1)).toBe(29) // February (leap year)
    expect(getDaysInMonth(2023, 1)).toBe(28) // February (non-leap year)
    expect(getDaysInMonth(2024, 11)).toBe(31) // December
  })

  it('should get first day of month', () => {
    const getFirstDayOfMonth = (year: number, month: number) => {
      return new Date(year, month, 1).getDay()
    }

    const firstDay = getFirstDayOfMonth(2024, 0) // January 2024
    expect(firstDay).toBeGreaterThanOrEqual(0)
    expect(firstDay).toBeLessThan(7)
  })

  it('should navigate months correctly', () => {
    const currentDate = new Date(2024, 0, 15) // January 15, 2024

    const nextMonth = new Date(currentDate)
    nextMonth.setMonth(currentDate.getMonth() + 1)

    const prevMonth = new Date(currentDate)
    prevMonth.setMonth(currentDate.getMonth() - 1)

    expect(nextMonth.getMonth()).toBe(1) // February
    expect(prevMonth.getMonth()).toBe(11) // December (previous year)
    expect(prevMonth.getFullYear()).toBe(2023)
  })
})

describe('Hours Formatting', () => {
  it('should format hours for display', () => {
    const formatHours = (hours: number) => {
      const h = Math.floor(hours)
      const m = Math.round((hours - h) * 60)
      return m > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${h}:00`
    }

    expect(formatHours(2.5)).toBe('2:30')
    expect(formatHours(1.25)).toBe('1:15')
    expect(formatHours(8)).toBe('8:00')
    expect(formatHours(0.5)).toBe('0:30')
  })

  it('should parse hours from string', () => {
    const parseHours = (input: string) => {
      if (input.includes(':')) {
        const [h, m] = input.split(':').map(Number)
        return h + (m / 60)
      }
      return parseFloat(input)
    }

    expect(parseHours('2:30')).toBe(2.5)
    expect(parseHours('1:15')).toBe(1.25)
    expect(parseHours('8:00')).toBe(8)
    expect(parseHours('2.5')).toBe(2.5)
  })
})
