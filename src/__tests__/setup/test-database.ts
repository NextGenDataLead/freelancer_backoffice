import { createClient } from '@supabase/supabase-js'

/**
 * Test Database Setup and Utilities
 * Provides test database configuration and seed data for integration tests
 */

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'

export const testSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Test tenant and user data
export const testTenant = {
  id: 'test-tenant-123',
  name: 'Test ZZP Business',
  created_at: new Date().toISOString()
}

export const testUserProfile = {
  id: 'test-user-123',
  user_id: 'clerk-test-user',
  tenant_id: testTenant.id,
  email: 'test@example.com',
  business_name: 'Test ZZP',
  kvk_number: '12345678',
  vat_number: 'NL123456789B01',
  default_hourly_rate: 75.00,
  created_at: new Date().toISOString()
}

// Test client data
export const testClients = [
  {
    id: 'test-client-dutch',
    tenant_id: testTenant.id,
    name: 'Dutch Client',
    email: 'dutch@client.nl',
    company_name: 'Dutch Company BV',
    country_code: 'NL',
    is_business: true,
    vat_number: 'NL987654321B01',
    default_payment_terms: 30,
    is_supplier: false
  },
  {
    id: 'test-client-eu-b2b',
    tenant_id: testTenant.id,
    name: 'German Business',
    email: 'contact@german.de',
    company_name: 'German Tech GmbH',
    country_code: 'DE',
    is_business: true,
    vat_number: 'DE123456789',
    default_payment_terms: 14,
    is_supplier: false
  },
  {
    id: 'test-client-us',
    tenant_id: testTenant.id,
    name: 'US Client',
    email: 'hello@usclient.com',
    company_name: 'US Tech Inc',
    country_code: 'US',
    is_business: true,
    vat_number: null,
    default_payment_terms: 30,
    is_supplier: false
  }
]

// Test invoice data
export const testInvoices = [
  {
    id: 'test-invoice-1',
    tenant_id: testTenant.id,
    client_id: 'test-client-dutch',
    invoice_number: '2024-001',
    invoice_date: '2024-01-15',
    due_date: '2024-02-14',
    subtotal_amount: 1000.00,
    vat_amount: 210.00,
    total_amount: 1210.00,
    vat_type: 'standard',
    status: 'sent',
    reference: 'Website Development',
    notes: 'First test invoice'
  },
  {
    id: 'test-invoice-2',
    tenant_id: testTenant.id,
    client_id: 'test-client-eu-b2b',
    invoice_number: '2024-002',
    invoice_date: '2024-01-20',
    due_date: '2024-02-19',
    subtotal_amount: 500.00,
    vat_amount: 0.00,
    total_amount: 500.00,
    vat_type: 'reverse_charge',
    status: 'paid',
    reference: 'Consulting Services',
    notes: 'EU reverse-charge invoice'
  }
]

// Test invoice items
export const testInvoiceItems = [
  {
    id: 'test-item-1',
    invoice_id: 'test-invoice-1',
    description: 'Website development',
    quantity: 10,
    unit_price: 100.00,
    line_total: 1000.00
  },
  {
    id: 'test-item-2',
    invoice_id: 'test-invoice-2',
    description: 'Technical consulting',
    quantity: 5,
    unit_price: 100.00,
    line_total: 500.00
  }
]

// Test expense data
export const testExpenses = [
  {
    id: 'test-expense-1',
    tenant_id: testTenant.id,
    supplier_id: 'test-client-dutch',
    amount: 100.00,
    vat_amount: 21.00,
    total_amount: 121.00,
    vat_rate: 21,
    category: 'office_supplies',
    description: 'Office supplies',
    expense_date: '2024-01-10',
    is_vat_deductible: true,
    receipt_url: null,
    ocr_confidence: null
  }
]

// Test time entries
export const testTimeEntries = [
  {
    id: 'test-time-1',
    tenant_id: testTenant.id,
    client_id: 'test-client-dutch',
    project_name: 'Website Project',
    description: 'Frontend development',
    entry_date: '2024-01-15',
    hours: 8.0,
    hourly_rate: 75.00,
    total_value: 600.00,
    is_billable: true,
    is_invoiced: false,
    invoice_id: null
  },
  {
    id: 'test-time-2',
    tenant_id: testTenant.id,
    client_id: 'test-client-eu-b2b',
    project_name: 'Consulting Project',
    description: 'Technical advice',
    entry_date: '2024-01-20',
    hours: 4.0,
    hourly_rate: 125.00,
    total_value: 500.00,
    is_billable: true,
    is_invoiced: true,
    invoice_id: 'test-invoice-2'
  }
]

// Test kilometer entries
export const testKilometerEntries = [
  {
    id: 'test-km-1',
    tenant_id: testTenant.id,
    client_id: 'test-client-dutch',
    travel_date: '2024-01-15',
    from_address: 'Amsterdam',
    to_address: 'Utrecht',
    kilometers: 45,
    rate_per_km: 0.19,
    total_cost: 8.55,
    is_business_trip: true,
    description: 'Client meeting'
  }
]

/**
 * Seed the test database with sample data
 */
export async function seedTestDatabase() {
  try {
    // Insert test tenant
    await testSupabase.from('tenants').upsert(testTenant)
    
    // Insert test user profile  
    await testSupabase.from('profiles').upsert(testUserProfile)
    
    // Insert test clients
    await testSupabase.from('clients').upsert(testClients)
    
    // Insert test invoices
    await testSupabase.from('invoices').upsert(testInvoices)
    
    // Insert test invoice items
    await testSupabase.from('invoice_items').upsert(testInvoiceItems)
    
    // Insert test expenses
    await testSupabase.from('expenses').upsert(testExpenses)
    
    // Insert test time entries
    await testSupabase.from('time_entries').upsert(testTimeEntries)
    
    // Insert test kilometer entries
    await testSupabase.from('kilometer_entries').upsert(testKilometerEntries)
    
    console.log('✅ Test database seeded successfully')
  } catch (error) {
    console.error('❌ Error seeding test database:', error)
    throw error
  }
}

/**
 * Clean up test database
 */
export async function cleanupTestDatabase() {
  try {
    // Delete in reverse order of dependencies
    await testSupabase.from('kilometer_entries').delete().eq('tenant_id', testTenant.id)
    await testSupabase.from('time_entries').delete().eq('tenant_id', testTenant.id)
    await testSupabase.from('expenses').delete().eq('tenant_id', testTenant.id)
    await testSupabase.from('invoice_items').delete().in('invoice_id', testInvoices.map(i => i.id))
    await testSupabase.from('invoices').delete().eq('tenant_id', testTenant.id)
    await testSupabase.from('clients').delete().eq('tenant_id', testTenant.id)
    await testSupabase.from('profiles').delete().eq('tenant_id', testTenant.id)
    await testSupabase.from('tenants').delete().eq('id', testTenant.id)
    
    console.log('✅ Test database cleaned up successfully')
  } catch (error) {
    console.error('❌ Error cleaning up test database:', error)
    throw error
  }
}

/**
 * Create a test transaction for financial calculations
 */
export function createTestTransaction(type: 'revenue' | 'expense', amount: number, vatRate: number = 21) {
  const vatAmount = Math.round(amount * (vatRate / 100) * 100) / 100
  const totalAmount = amount + vatAmount
  
  return {
    type,
    amount,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    total_amount: totalAmount,
    tenant_id: testTenant.id,
    created_at: new Date().toISOString()
  }
}

/**
 * Mock Supabase client for unit tests
 */
export function createMockSupabaseClient() {
  const mockData: any = {}
  const mockError: any = null
  
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockData, error: mockError }),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockData, error: mockError }),
      then: vi.fn().mockResolvedValue({ data: [mockData], error: mockError })
    })),
    rpc: vi.fn().mockResolvedValue({ data: mockData, error: mockError }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: testUserProfile.user_id } },
        error: null
      })
    }
  }
}

/**
 * Dutch VAT calculation test utilities
 */
export const dutchVatTestUtils = {
  standardRate: 0.21,
  reducedRate: 0.09,
  
  calculateStandardVat: (amount: number) => ({
    subtotal: amount,
    vat_rate: 0.21,
    vat_amount: Math.round(amount * 0.21 * 100) / 100,
    total: Math.round((amount * 1.21) * 100) / 100
  }),
  
  calculateReverseChargeVat: (amount: number) => ({
    subtotal: amount,
    vat_rate: 0.00,
    vat_amount: 0.00,
    total: amount,
    explanation: 'BTW verlegd - EU B2B service'
  }),
  
  calculateExemptVat: (amount: number) => ({
    subtotal: amount,
    vat_rate: 0.00,
    vat_amount: 0.00,
    total: amount,
    explanation: 'BTW vrijgesteld - export buiten EU'
  })
}

/**
 * EU country validation utilities
 */
export const euCountryCodes = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
]

export const nonEuCountryCodes = ['US', 'CA', 'AU', 'JP', 'UK', 'CH', 'NO']

/**
 * Test assertion helpers for financial data
 */
export const financialAssertions = {
  expectValidDutchVATNumber: (vatNumber: string) => {
    const nlVatRegex = /^NL\d{9}B\d{2}$/
    expect(vatNumber).toMatch(nlVatRegex)
  },
  
  expectValidEuroAmount: (amount: number) => {
    expect(amount).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(amount)).toBe(true)
    expect(amount).toEqual(Math.round(amount * 100) / 100) // Max 2 decimal places
  },
  
  expectValidVATRate: (rate: number) => {
    const validRates = [0, 0.09, 0.21]
    expect(validRates).toContain(rate)
  },
  
  expectValidInvoiceStatus: (status: string) => {
    const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled']
    expect(validStatuses).toContain(status)
  }
}