import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { DashboardStats } from '../../../components/financial/dashboard-stats'

/**
 * Dashboard Stats Component Tests
 * Testing the financial KPI dashboard component
 */

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('DashboardStats Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful API responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            revenue: { total_invoiced: 5000 },
            expenses: { total_expenses: 1500 },
            profit_summary: { net_profit: 3500 },
            vat_summary: { net_vat_position: 750 }
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [
            { status: 'sent', total_amount: 1200 },
            { status: 'overdue', total_amount: 800 },
            { status: 'draft', total_amount: 500 }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          pagination: { total: 25 }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [
            { hours: 8.5, billable: true, invoiced: false },
            { hours: 6.0, billable: true, invoiced: false }
          ]
        })
      })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render loading state initially', () => {
    render(<DashboardStats />)
    
    // Should show loading skeletons
    const skeletons = screen.getAllByTestId(/skeleton|animate-pulse/)
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('should fetch and display financial statistics', async () => {
    render(<DashboardStats />)

    await waitFor(() => {
      expect(screen.getByText('Omzet deze maand')).toBeInTheDocument()
      expect(screen.getByText('€5.000,00')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('Uitgaven deze maand')).toBeInTheDocument()
      expect(screen.getByText('€1.500,00')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('Netto winst')).toBeInTheDocument()
      expect(screen.getByText('€3.500,00')).toBeInTheDocument()
    })
  })

  it('should display outstanding invoices correctly', async () => {
    render(<DashboardStats />)

    await waitFor(() => {
      expect(screen.getByText('Openstaande facturen')).toBeInTheDocument()
      expect(screen.getByText('€2.000,00')).toBeInTheDocument() // 1200 + 800 outstanding
    })

    await waitFor(() => {
      expect(screen.getByText('1 concepten')).toBeInTheDocument() // 1 draft invoice
    })
  })

  it('should show client count', async () => {
    render(<DashboardStats />)

    await waitFor(() => {
      expect(screen.getByText('Actieve klanten')).toBeInTheDocument()
      expect(screen.getByText('25')).toBeInTheDocument()
    })
  })

  it('should display unbilled hours', async () => {
    render(<DashboardStats />)

    await waitFor(() => {
      expect(screen.getByText('Uren niet gefactureerd')).toBeInTheDocument()
      expect(screen.getByText('14.5h')).toBeInTheDocument() // 8.5 + 6.0
    })
  })

  it('should display VAT position', async () => {
    render(<DashboardStats />)

    await waitFor(() => {
      expect(screen.getByText('BTW te betalen')).toBeInTheDocument()
      expect(screen.getByText('€750,00')).toBeInTheDocument()
      expect(screen.getByText('Te betalen')).toBeInTheDocument()
    })
  })

  it('should handle negative profit correctly', async () => {
    // Mock negative profit scenario
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            revenue: { total_invoiced: 1000 },
            expenses: { total_expenses: 1500 },
            profit_summary: { net_profit: -500 },
            vat_summary: { net_vat_position: -200 }
          }
        })
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ pagination: { total: 0 } }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: [] }) })

    render(<DashboardStats />)

    await waitFor(() => {
      expect(screen.getByText('€-500,00')).toBeInTheDocument()
      expect(screen.getByText('Verlies')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('€-200,00')).toBeInTheDocument()
      expect(screen.getByText('Te ontvangen')).toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('API Error'))

    render(<DashboardStats />)

    // Should still render the component structure
    await waitFor(() => {
      expect(screen.getByText('Omzet deze maand')).toBeInTheDocument()
    })

    // Error values should default to 0
    await waitFor(() => {
      expect(screen.getByText('€0,00')).toBeInTheDocument()
    })
  })

  it('should format currency correctly for Dutch locale', async () => {
    render(<DashboardStats />)

    await waitFor(() => {
      // Check for Euro symbol and Dutch number formatting
      const currencyElements = screen.getAllByText(/€\d{1,3}(?:\.\d{3})*(?:,\d{2})?/)
      expect(currencyElements.length).toBeGreaterThan(0)
    })
  })

  it('should make correct API calls', () => {
    render(<DashboardStats />)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/reports/profit-loss')
    )
    expect(mockFetch).toHaveBeenCalledWith('/api/invoices?limit=1000')
    expect(mockFetch).toHaveBeenCalledWith('/api/clients?limit=1000')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/time-entries')
    )
  })

  it('should use current month for date range', () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

    render(<DashboardStats />)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`date_from=${startOfMonth.split('T')[0]}`)
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`date_to=${endOfMonth.split('T')[0]}`)
    )
  })
})