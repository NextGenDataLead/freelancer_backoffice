import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMocks } from 'node-mocks-http'
import { auth } from '@clerk/nextjs/server'

/**
 * Financial API Integration Tests
 * Testing full API request-response cycle with database operations
 * Focus: Multi-tenant security, validation, and Dutch VAT compliance
 */

// Mock dependencies
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
  })),
  rpc: vi.fn()
}

// Mock user profile for multi-tenant testing
const mockUserProfile = {
  id: 'user-123',
  user_id: 'clerk-user-123',
  tenant_id: 'tenant-abc',
  business_name: 'Test ZZP',
  kvk_number: '12345678',
  vat_number: 'NL123456789B01',
  default_hourly_rate: 75.00
}

describe('Client API Integration Tests', () => {
  beforeEach(() => {
    mockAuth.mockReturnValue({
      userId: 'clerk-user-123',
      sessionId: 'session-123'
    })

    // Reset mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/clients', () => {
    it('should return paginated client list with tenant isolation', async () => {
      const mockClients = [
        {
          id: 'client-1',
          name: 'Jan Janssen',
          email: 'jan@example.com',
          tenant_id: 'tenant-abc',
          is_business: false
        },
        {
          id: 'client-2', 
          name: 'Acme BV',
          email: 'info@acme.nl',
          tenant_id: 'tenant-abc',
          is_business: true,
          vat_number: 'NL987654321B01'
        }
      ]

      mockSupabaseClient.from().select().eq().data = mockClients
      mockSupabaseClient.from().select().eq().error = null

      const { req, res } = createMocks({
        method: 'GET',
        query: { page: '1', limit: '10' }
      })

      // Import and call the API handler
      const handler = await import('../../app/api/clients/route')
      await handler.GET(req as any)

      // Verify tenant isolation query
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('clients')
      expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('tenant_id', 'tenant-abc')
      
      // Verify pagination
      expect(mockSupabaseClient.from().select).toHaveBeenCalledWith(
        expect.stringContaining('id, name, email')
      )
    })

    it('should filter clients by search query', async () => {
      const { req } = createMocks({
        method: 'GET',
        query: { search: 'jan', limit: '10' }
      })

      const handler = await import('../../app/api/clients/route')
      await handler.GET(req as any)

      // Verify search filter applied
      expect(mockSupabaseClient.from().select).toHaveBeenCalledWith(
        expect.stringContaining('name.ilike')
      )
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.from().select().eq().data = null
      mockSupabaseClient.from().select().eq().error = { message: 'Database connection error' }

      const { req } = createMocks({
        method: 'GET'
      })

      const handler = await import('../../app/api/clients/route')
      const response = await handler.GET(req as any)

      expect(response.status).toBe(500)
      const responseData = await response.json()
      expect(responseData.message).toContain('Database error')
    })
  })

  describe('POST /api/clients', () => {
    it('should create new client with proper validation', async () => {
      const newClientData = {
        name: 'New Client',
        email: 'client@example.com',
        is_business: false,
        is_supplier: false,
        default_payment_terms: 30
      }

      const createdClient = {
        id: 'client-new',
        ...newClientData,
        tenant_id: 'tenant-abc',
        created_at: new Date().toISOString()
      }

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: createdClient,
        error: null
      })

      const { req } = createMocks({
        method: 'POST',
        body: newClientData
      })

      const handler = await import('../../app/api/clients/route')
      const response = await handler.POST(req as any)

      expect(response.status).toBe(201)
      const responseData = await response.json()
      expect(responseData.data.name).toBe('New Client')
      expect(responseData.data.tenant_id).toBe('tenant-abc')
    })

    it('should validate business client VAT numbers', async () => {
      const businessClientData = {
        name: 'Business Client',
        email: 'business@example.com', 
        company_name: 'Business BV',
        vat_number: 'INVALID-VAT',
        is_business: true,
        is_supplier: false,
        default_payment_terms: 30
      }

      const { req } = createMocks({
        method: 'POST',
        body: businessClientData
      })

      const handler = await import('../../app/api/clients/route')
      const response = await handler.POST(req as any)

      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.message).toContain('validation')
    })

    it('should prevent duplicate client emails within tenant', async () => {
      const duplicateClientData = {
        name: 'Duplicate Client',
        email: 'existing@example.com',
        is_business: false,
        is_supplier: false,
        default_payment_terms: 30
      }

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { 
          code: '23505', 
          message: 'duplicate key value violates unique constraint' 
        }
      })

      const { req } = createMocks({
        method: 'POST',
        body: duplicateClientData
      })

      const handler = await import('../../app/api/clients/route')
      const response = await handler.POST(req as any)

      expect(response.status).toBe(409)
      const responseData = await response.json()
      expect(responseData.message).toContain('already exists')
    })
  })
})

describe('Invoice API Integration Tests', () => {
  beforeEach(() => {
    mockAuth.mockReturnValue({
      userId: 'clerk-user-123',
      sessionId: 'session-123'
    })
  })

  describe('POST /api/invoices', () => {
    it('should create invoice with automatic VAT calculation', async () => {
      const invoiceData = {
        client_id: 'client-123',
        invoice_date: '2024-01-15',
        due_date: '2024-02-14',
        reference: 'Project ABC',
        items: [
          {
            description: 'Web development',
            quantity: 40,
            unit_price: 75.00
          }
        ]
      }

      const mockClient = {
        id: 'client-123',
        name: 'Dutch Client',
        country_code: 'NL',
        is_business: false,
        tenant_id: 'tenant-abc'
      }

      const createdInvoice = {
        id: 'invoice-123',
        invoice_number: '2024-001',
        ...invoiceData,
        subtotal_amount: 3000.00,
        vat_amount: 630.00,
        total_amount: 3630.00,
        vat_type: 'standard',
        tenant_id: 'tenant-abc'
      }

      // Mock client lookup
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: mockClient,
        error: null
      })

      // Mock invoice creation
      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: createdInvoice,
        error: null
      })

      const { req } = createMocks({
        method: 'POST',
        body: invoiceData
      })

      const handler = await import('../../app/api/invoices/route')
      const response = await handler.POST(req as any)

      expect(response.status).toBe(201)
      const responseData = await response.json()
      
      // Verify Dutch VAT calculation
      expect(responseData.data.vat_type).toBe('standard')
      expect(responseData.data.vat_amount).toBe(630.00) // 21% of 3000
      expect(responseData.data.total_amount).toBe(3630.00)
    })

    it('should apply reverse-charge VAT for EU B2B clients', async () => {
      const invoiceData = {
        client_id: 'client-eu-b2b',
        invoice_date: '2024-01-15',
        due_date: '2024-02-14',
        items: [{ description: 'Consulting', quantity: 10, unit_price: 100.00 }]
      }

      const mockEuB2BClient = {
        id: 'client-eu-b2b',
        name: 'German Business',
        country_code: 'DE',
        is_business: true,
        vat_number: 'DE123456789',
        tenant_id: 'tenant-abc'
      }

      const createdInvoice = {
        id: 'invoice-eu',
        ...invoiceData,
        subtotal_amount: 1000.00,
        vat_amount: 0.00,
        total_amount: 1000.00,
        vat_type: 'reverse_charge',
        tenant_id: 'tenant-abc'
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: mockEuB2BClient,
        error: null
      })

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: createdInvoice,
        error: null
      })

      const { req } = createMocks({
        method: 'POST',
        body: invoiceData
      })

      const handler = await import('../../app/api/invoices/route')
      const response = await handler.POST(req as any)

      expect(response.status).toBe(201)
      const responseData = await response.json()

      // Verify reverse-charge VAT (BTW verlegd)
      expect(responseData.data.vat_type).toBe('reverse_charge')
      expect(responseData.data.vat_amount).toBe(0.00)
      expect(responseData.data.total_amount).toBe(1000.00)
    })

    it('should prevent invoice creation for non-existent clients', async () => {
      const invoiceData = {
        client_id: 'non-existent-client',
        invoice_date: '2024-01-15',
        due_date: '2024-02-14',
        items: [{ description: 'Test', quantity: 1, unit_price: 100.00 }]
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'No rows returned' }
      })

      const { req } = createMocks({
        method: 'POST',
        body: invoiceData
      })

      const handler = await import('../../app/api/invoices/route')
      const response = await handler.POST(req as any)

      expect(response.status).toBe(404)
      const responseData = await response.json()
      expect(responseData.message).toContain('Client not found')
    })
  })

  describe('PUT /api/invoices/[id]/status', () => {
    it('should update invoice status with validation', async () => {
      const mockInvoice = {
        id: 'invoice-123',
        status: 'draft',
        tenant_id: 'tenant-abc'
      }

      const updatedInvoice = {
        ...mockInvoice,
        status: 'sent',
        sent_at: new Date().toISOString()
      }

      // Mock current invoice lookup
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: mockInvoice,
        error: null
      })

      // Mock status update
      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: updatedInvoice,
        error: null
      })

      const { req } = createMocks({
        method: 'PUT',
        query: { id: 'invoice-123' },
        body: { status: 'sent' }
      })

      const handler = await import('../../app/api/invoices/[id]/status/route')
      await handler.PUT(req as any, { params: { id: 'invoice-123' } })

      // Verify status transition validation
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'sent',
          sent_at: expect.any(String)
        })
      )
    })

    it('should prevent invalid status transitions', async () => {
      const mockPaidInvoice = {
        id: 'invoice-paid',
        status: 'paid',
        tenant_id: 'tenant-abc'
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockPaidInvoice,
        error: null
      })

      const { req } = createMocks({
        method: 'PUT',
        query: { id: 'invoice-paid' },
        body: { status: 'draft' }
      })

      const handler = await import('../../app/api/invoices/[id]/status/route')
      const response = await handler.PUT(req as any, { params: { id: 'invoice-paid' } })

      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.message).toContain('Cannot change status')
    })
  })
})

describe('VAT Calculation API Integration Tests', () => {
  describe('POST /api/vat/calculate', () => {
    it('should calculate VAT with detailed explanation', async () => {
      const calculationRequest = {
        amount: 1000,
        client_country: 'NL',
        is_business_client: false
      }

      const { req } = createMocks({
        method: 'POST',
        body: calculationRequest
      })

      const handler = await import('../../app/api/vat/calculate/route')
      const response = await handler.POST(req as any)

      expect(response.status).toBe(200)
      const responseData = await response.json()
      
      expect(responseData.data).toEqual({
        subtotal: 1000,
        vat_type: 'standard',
        vat_rate: 0.21,
        vat_amount: 210,
        total_amount: 1210,
        explanation: expect.stringContaining('Nederlandse standaard BTW')
      })
    })

    it('should detect reverse-charge scenario for EU B2B', async () => {
      const calculationRequest = {
        amount: 500,
        client_country: 'FR',
        is_business_client: true
      }

      const { req } = createMocks({
        method: 'POST',
        body: calculationRequest
      })

      const handler = await import('../../app/api/vat/calculate/route')
      const response = await handler.POST(req as any)

      const responseData = await response.json()
      expect(responseData.data.vat_type).toBe('reverse_charge')
      expect(responseData.data.vat_amount).toBe(0)
      expect(responseData.data.explanation).toContain('BTW verlegd naar FR')
    })

    it('should handle VAT exempt for non-EU clients', async () => {
      const calculationRequest = {
        amount: 800,
        client_country: 'US',
        is_business_client: true
      }

      const { req } = createMocks({
        method: 'POST',
        body: calculationRequest
      })

      const handler = await import('../../app/api/vat/calculate/route')
      const response = await handler.POST(req as any)

      const responseData = await response.json()
      expect(responseData.data.vat_type).toBe('exempt')
      expect(responseData.data.vat_amount).toBe(0)
      expect(responseData.data.explanation).toContain('export naar US buiten EU')
    })
  })
})

describe('Multi-tenant Security Integration Tests', () => {
  it('should isolate data between tenants', async () => {
    // Mock different tenant
    mockAuth.mockReturnValue({
      userId: 'other-user',
      sessionId: 'other-session'
    })

    const otherTenantProfile = {
      ...mockUserProfile,
      id: 'user-456',
      user_id: 'other-user',
      tenant_id: 'tenant-xyz'
    }

    const { req } = createMocks({
      method: 'GET'
    })

    const handler = await import('../../app/api/clients/route')
    await handler.GET(req as any)

    // Verify query uses different tenant ID
    expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('tenant_id', 'tenant-xyz')
  })

  it('should prevent cross-tenant data access', async () => {
    const { req } = createMocks({
      method: 'GET',
      query: { id: 'client-from-other-tenant' }
    })

    // Mock client from different tenant
    mockSupabaseClient.from().select().eq().single.mockResolvedValue({
      data: null,
      error: { message: 'No rows returned' }
    })

    const handler = await import('../../app/api/clients/[id]/route')
    const response = await handler.GET(req as any, { params: { id: 'client-from-other-tenant' } })

    expect(response.status).toBe(404)
  })

  it('should handle unauthenticated requests', async () => {
    mockAuth.mockReturnValue({
      userId: null,
      sessionId: null
    })

    const { req } = createMocks({
      method: 'GET'
    })

    const handler = await import('../../app/api/clients/route')
    const response = await handler.GET(req as any)

    expect(response.status).toBe(401)
    const responseData = await response.json()
    expect(responseData.message).toContain('Unauthorized')
  })
})

describe('Expense API Integration Tests', () => {
  describe('POST /api/expenses', () => {
    it('should create expense with automatic VAT calculation', async () => {
      const expenseData = {
        supplier_id: 'client-supplier',
        amount: 100.00,
        vat_rate: 21,
        category: 'office_supplies',
        description: 'Office chairs',
        expense_date: '2024-01-15',
        is_vat_deductible: true
      }

      const createdExpense = {
        id: 'expense-123',
        ...expenseData,
        vat_amount: 21.00,
        total_amount: 121.00,
        tenant_id: 'tenant-abc'
      }

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: createdExpense,
        error: null
      })

      const { req } = createMocks({
        method: 'POST',
        body: expenseData
      })

      const handler = await import('../../app/api/expenses/route')
      const response = await handler.POST(req as any)

      expect(response.status).toBe(201)
      const responseData = await response.json()
      expect(responseData.data.vat_amount).toBe(21.00)
      expect(responseData.data.total_amount).toBe(121.00)
    })
  })

  describe('POST /api/expenses/ocr/process', () => {
    it('should process OCR data and suggest fields', async () => {
      const ocrData = {
        extracted_text: 'FACTUUR\nMediaMarkt BV\nBTW: NL123456789B01\nDatum: 15-01-2024\nBedrag: €299,00\nBTW: €62,79',
        confidence: 85
      }

      const { req } = createMocks({
        method: 'POST',
        body: ocrData
      })

      const handler = await import('../../app/api/expenses/ocr/process/route')
      const response = await handler.POST(req as any)

      expect(response.status).toBe(200)
      const responseData = await response.json()
      
      expect(responseData.data.extracted_amount).toBe(299.00)
      expect(responseData.data.confidence_level).toBe('high')
      expect(responseData.data.suggested_category).toBe('office_supplies')
    })

    it('should handle low confidence OCR results', async () => {
      const lowConfidenceData = {
        extracted_text: 'unclear receipt text...',
        confidence: 45
      }

      const { req } = createMocks({
        method: 'POST',
        body: lowConfidenceData
      })

      const handler = await import('../../app/api/expenses/ocr/process/route')
      const response = await handler.POST(req as any)

      const responseData = await response.json()
      expect(responseData.data.confidence_level).toBe('low')
      expect(responseData.data.requires_manual_review).toBe(true)
    })
  })
})

describe('Financial Reports Integration Tests', () => {
  describe('GET /api/reports/profit-loss', () => {
    it('should generate P&L report with VAT breakdown', async () => {
      const mockReportData = {
        revenue: {
          total_invoiced: 10000,
          standard_vat_revenue: 8000,
          reverse_charge_revenue: 2000,
          exempt_revenue: 0
        },
        expenses: {
          total_expenses: 3000,
          vat_paid: 630
        },
        profit_summary: {
          gross_profit: 7000,
          net_profit: 6370
        }
      }

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockReportData,
        error: null
      })

      const { req } = createMocks({
        method: 'GET',
        query: {
          date_from: '2024-01-01',
          date_to: '2024-03-31'
        }
      })

      const handler = await import('../../app/api/reports/profit-loss/route')
      const response = await handler.GET(req as any)

      expect(response.status).toBe(200)
      const responseData = await response.json()
      
      expect(responseData.data.revenue.total_invoiced).toBe(10000)
      expect(responseData.data.profit_summary.net_profit).toBe(6370)
    })
  })

  describe('GET /api/reports/vat-return', () => {
    it('should generate quarterly VAT return', async () => {
      const mockVatReturn = {
        period: { year: 2024, quarter: 1 },
        vat_collected: 1680,
        vat_paid: 630,
        net_vat_position: 1050,
        reverse_charge_amount: 2000,
        icp_declaration: {
          total_eu_services: 2000,
          countries: [{ country: 'DE', amount: 2000 }]
        }
      }

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockVatReturn,
        error: null
      })

      const { req } = createMocks({
        method: 'GET',
        query: { year: '2024', quarter: '1' }
      })

      const handler = await import('../../app/api/reports/vat-return/route')
      const response = await handler.GET(req as any)

      const responseData = await response.json()
      expect(responseData.data.vat_collected).toBe(1680)
      expect(responseData.data.net_vat_position).toBe(1050)
      expect(responseData.data.icp_declaration.total_eu_services).toBe(2000)
    })
  })
})