/**
 * Financial APIs Integration Tests
 * Testing invoice and expense APIs with real database operations
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { testDb, verifyTestDataExists, resetTestState } from '../../setup/database-setup'
import { TEST_USERS, TEST_CLIENTS, TEST_EXPENSE_CATEGORIES } from '../../setup/test-setup'

// Simulate financial API operations with database
const financialApiService = {
  // Invoice operations
  async createInvoice(userId: string, invoiceData: any) {
    const user = Object.values(TEST_USERS).find(u => u.id === userId)
    if (!user) throw new Error('User not found')

    // Calculate VAT
    const vatAmount = invoiceData.subtotal * (invoiceData.vat_rate || 0.21)
    const totalAmount = invoiceData.subtotal + vatAmount

    const { data, error } = await testDb
      .from('invoices')
      .insert([{
        tenant_id: user.tenantId,
        created_by: userId,
        client_id: invoiceData.client_id,
        invoice_number: `TEST-${Date.now()}`,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: invoiceData.subtotal,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        vat_type: invoiceData.vat_type || 'standard',
        vat_rate: invoiceData.vat_rate || 0.21,
        currency: 'EUR',
        reference: invoiceData.reference || 'Integration test invoice',
        paid_amount: 0
      }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateInvoiceStatus(userId: string, invoiceId: string, status: string) {
    const user = Object.values(TEST_USERS).find(u => u.id === userId)
    if (!user) throw new Error('User not found')

    const { data, error } = await testDb
      .from('invoices')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', invoiceId)
      .eq('tenant_id', user.tenantId) // Ensure tenant isolation
      .select()
      .single()

    if (error) throw error
    return data
  },

  async processPayment(userId: string, invoiceId: string, paymentAmount: number) {
    const user = Object.values(TEST_USERS).find(u => u.id === userId)
    if (!user) throw new Error('User not found')

    // Get current invoice
    const { data: invoice, error: fetchError } = await testDb
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('tenant_id', user.tenantId)
      .single()

    if (fetchError) throw fetchError

    const newPaidAmount = (invoice.paid_amount || 0) + paymentAmount
    let newStatus = invoice.status

    if (newPaidAmount >= invoice.total_amount) {
      newStatus = 'paid'
    } else if (newPaidAmount > 0) {
      newStatus = 'partial'
    }

    const { data, error } = await testDb
      .from('invoices')
      .update({
        paid_amount: newPaidAmount,
        status: newStatus,
        paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Expense operations
  async createExpense(userId: string, expenseData: any) {
    const user = Object.values(TEST_USERS).find(u => u.id === userId)
    if (!user) throw new Error('User not found')

    // Calculate VAT based on category
    const vatAmount = expenseData.amount * (expenseData.vat_rate || 0.21)

    const { data, error } = await testDb
      .from('expenses')
      .insert([{
        tenant_id: user.tenantId,
        user_id: userId,
        category_id: expenseData.category_id,
        description: expenseData.description,
        amount: expenseData.amount,
        currency: 'EUR',
        expense_date: new Date().toISOString().split('T')[0],
        payment_method: expenseData.payment_method || 'personal_card',
        status: 'submitted',
        vat_rate: expenseData.vat_rate || 0.21,
        vat_amount: vatAmount,
        is_billable: expenseData.is_billable || false,
        requires_receipt: expenseData.requires_receipt || true,
        client_id: expenseData.client_id || null,
        project_code: expenseData.project_code || null,
        vendor: expenseData.vendor || 'Test Vendor'
      }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async approveExpense(approverId: string, expenseId: string) {
    const approver = Object.values(TEST_USERS).find(u => u.id === approverId)
    if (!approver || !['owner', 'admin'].includes(approver.role)) {
      throw new Error('Insufficient permissions to approve expense')
    }

    const { data, error } = await testDb
      .from('expenses')
      .update({
        status: 'approved',
        approved_by: approverId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', expenseId)
      .eq('tenant_id', approver.tenantId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Time tracking operations
  async createTimeEntry(userId: string, timeData: any) {
    const user = Object.values(TEST_USERS).find(u => u.id === userId)
    if (!user) throw new Error('User not found')

    const { data, error } = await testDb
      .from('time_entries')
      .insert([{
        tenant_id: user.tenantId,
        user_id: userId,
        client_id: timeData.client_id,
        project_id: timeData.project_id || null,
        description: timeData.description,
        date: new Date().toISOString().split('T')[0],
        hours: timeData.hours,
        hourly_rate: timeData.hourly_rate || 75.00,
        is_billable: timeData.is_billable !== false,
        is_invoiced: false,
        total_amount: timeData.hours * (timeData.hourly_rate || 75.00)
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }
}

describe('Financial APIs Integration Tests', () => {
  beforeAll(async () => {
    await verifyTestDataExists()
  })

  afterEach(async () => {
    await resetTestState()
  })

  describe('Invoice Lifecycle API', () => {
    it('should create invoice with standard VAT calculation', async () => {
      const owner = TEST_USERS.OWNER_TENANT1

      const invoiceData = {
        client_id: TEST_CLIENTS.NEXTGEN_DATA_LEAD.id,
        subtotal: 1000,
        vat_rate: 0.21,
        vat_type: 'standard',
        reference: 'API Integration Test'
      }

      const invoice = await financialApiService.createInvoice(owner.id, invoiceData)

      expect(invoice).toBeDefined()
      expect(invoice.subtotal).toBe(1000)
      expect(invoice.vat_amount).toBe(210)
      expect(invoice.total_amount).toBe(1210)
      expect(invoice.status).toBe('draft')
      expect(invoice.tenant_id).toBe(owner.tenantId)
      expect(invoice.created_by).toBe(owner.id)
    })

    it('should create reverse charge invoice for EU clients', async () => {
      const owner = TEST_USERS.OWNER_TENANT2

      const invoiceData = {
        client_id: TEST_CLIENTS.MASTER_DATA_PARTNERS.id,
        subtotal: 1500,
        vat_rate: 0,
        vat_type: 'reverse_charge',
        reference: 'EU B2B Service'
      }

      const invoice = await financialApiService.createInvoice(owner.id, invoiceData)

      expect(invoice.subtotal).toBe(1500)
      expect(invoice.vat_amount).toBe(0)
      expect(invoice.total_amount).toBe(1500)
      expect(invoice.vat_type).toBe('reverse_charge')
    })

    it('should process complete invoice workflow', async () => {
      const admin = TEST_USERS.ADMIN_TENANT1

      // 1. Create invoice
      let invoice = await financialApiService.createInvoice(admin.id, {
        client_id: TEST_CLIENTS.ID_DATA_SOLUTIONS.id,
        subtotal: 800,
        reference: 'Complete workflow test'
      })

      expect(invoice.status).toBe('draft')

      // 2. Send invoice
      invoice = await financialApiService.updateInvoiceStatus(admin.id, invoice.id, 'sent')
      expect(invoice.status).toBe('sent')

      // 3. Partial payment
      invoice = await financialApiService.processPayment(admin.id, invoice.id, 500)
      expect(invoice.status).toBe('partial')
      expect(invoice.paid_amount).toBe(500)

      // 4. Complete payment
      const remainingAmount = invoice.total_amount - invoice.paid_amount
      invoice = await financialApiService.processPayment(admin.id, invoice.id, remainingAmount)
      expect(invoice.status).toBe('paid')
      expect(invoice.paid_amount).toBe(invoice.total_amount)
      expect(invoice.paid_at).toBeDefined()
    })

    it('should enforce tenant isolation for invoices', async () => {
      const tenant1Owner = TEST_USERS.OWNER_TENANT1
      const tenant2Owner = TEST_USERS.OWNER_TENANT2

      // Create invoice in tenant 1
      const invoice = await financialApiService.createInvoice(tenant1Owner.id, {
        client_id: TEST_CLIENTS.NEXTGEN_DATA_LEAD.id,
        subtotal: 500,
        reference: 'Tenant isolation test'
      })

      // Tenant 2 owner should not be able to access tenant 1's invoice
      await expect(
        financialApiService.updateInvoiceStatus(tenant2Owner.id, invoice.id, 'sent')
      ).rejects.toThrow()
    })
  })

  describe('Expense Management API', () => {
    it('should create expense with Dutch tax category', async () => {
      const member = TEST_USERS.MEMBER_TENANT1

      const expenseData = {
        category_id: TEST_EXPENSE_CATEGORIES.REISKOSTEN,
        description: 'Train tickets for client meeting',
        amount: 45.50,
        payment_method: 'personal_card',
        vat_rate: 0.21,
        requires_receipt: true,
        client_id: TEST_CLIENTS.NEXTGEN_DATA_LEAD.id
      }

      const expense = await financialApiService.createExpense(member.id, expenseData)

      expect(expense).toBeDefined()
      expect(expense.amount).toBe(45.50)
      expect(expense.vat_amount).toBeCloseTo(9.56, 2)
      expect(expense.status).toBe('submitted')
      expect(expense.tenant_id).toBe(member.tenantId)
      expect(expense.category_id).toBe(TEST_EXPENSE_CATEGORIES.REISKOSTEN)
    })

    it('should handle expense approval workflow', async () => {
      const member = TEST_USERS.MEMBER_TENANT1
      const admin = TEST_USERS.ADMIN_TENANT1

      // Create expense
      const expense = await financialApiService.createExpense(member.id, {
        category_id: TEST_EXPENSE_CATEGORIES.SOFTWARE_ICT,
        description: 'Development tools subscription',
        amount: 199.99,
        payment_method: 'corporate_card'
      })

      expect(expense.status).toBe('submitted')

      // Admin approves expense
      const approvedExpense = await financialApiService.approveExpense(admin.id, expense.id)

      expect(approvedExpense.status).toBe('approved')
      expect(approvedExpense.approved_by).toBe(admin.id)
      expect(approvedExpense.approved_at).toBeDefined()
    })

    it('should prevent member from approving expenses', async () => {
      const member = TEST_USERS.MEMBER_TENANT1

      const expense = await financialApiService.createExpense(member.id, {
        category_id: TEST_EXPENSE_CATEGORIES.KANTOORBENODIGDHEDEN,
        description: 'Office supplies',
        amount: 75.00
      })

      await expect(
        financialApiService.approveExpense(member.id, expense.id)
      ).rejects.toThrow('Insufficient permissions to approve expense')
    })

    it('should enforce tenant isolation for expenses', async () => {
      const tenant1Member = TEST_USERS.MEMBER_TENANT1
      const tenant2Owner = TEST_USERS.OWNER_TENANT2

      const expense = await financialApiService.createExpense(tenant1Member.id, {
        category_id: TEST_EXPENSE_CATEGORIES.MARKETING_RECLAME,
        description: 'Marketing materials',
        amount: 150.00
      })

      // Tenant 2 owner cannot approve tenant 1's expense
      await expect(
        financialApiService.approveExpense(tenant2Owner.id, expense.id)
      ).rejects.toThrow()
    })
  })

  describe('Time Tracking API', () => {
    it('should create billable time entry', async () => {
      const member = TEST_USERS.MEMBER_TENANT1

      const timeData = {
        client_id: TEST_CLIENTS.NEXTGEN_DATA_LEAD.id,
        description: 'API development work',
        hours: 6.5,
        hourly_rate: 85.00,
        is_billable: true
      }

      const timeEntry = await financialApiService.createTimeEntry(member.id, timeData)

      expect(timeEntry).toBeDefined()
      expect(timeEntry.hours).toBe(6.5)
      expect(timeEntry.hourly_rate).toBe(85.00)
      expect(timeEntry.total_amount).toBe(552.50) // 6.5 * 85
      expect(timeEntry.is_billable).toBe(true)
      expect(timeEntry.is_invoiced).toBe(false)
      expect(timeEntry.tenant_id).toBe(member.tenantId)
    })

    it('should create non-billable time entry', async () => {
      const admin = TEST_USERS.ADMIN_TENANT1

      const timeEntry = await financialApiService.createTimeEntry(admin.id, {
        client_id: TEST_CLIENTS.ID_DATA_SOLUTIONS.id,
        description: 'Internal meeting and planning',
        hours: 2.0,
        hourly_rate: 90.00,
        is_billable: false
      })

      expect(timeEntry.is_billable).toBe(false)
      expect(timeEntry.total_amount).toBe(180.00)
    })
  })

  describe('Financial Reporting & Aggregation', () => {
    it('should calculate tenant revenue metrics', async () => {
      const owner = TEST_USERS.OWNER_TENANT1

      // Create multiple invoices
      await Promise.all([
        financialApiService.createInvoice(owner.id, {
          client_id: TEST_CLIENTS.NEXTGEN_DATA_LEAD.id,
          subtotal: 1000,
          reference: 'Project A'
        }),
        financialApiService.createInvoice(owner.id, {
          client_id: TEST_CLIENTS.ID_DATA_SOLUTIONS.id,
          subtotal: 1500,
          reference: 'Project B'
        })
      ])

      // Query tenant revenue
      const { data: invoices } = await testDb
        .from('invoices')
        .select('subtotal, vat_amount, total_amount')
        .eq('tenant_id', owner.tenantId)

      expect(invoices).toBeDefined()
      expect(invoices.length).toBeGreaterThanOrEqual(2)

      const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total_amount, 0)
      expect(totalRevenue).toBeGreaterThan(0)
    })

    it('should aggregate expense data by category', async () => {
      const member = TEST_USERS.MEMBER_TENANT1

      // Create expenses in different categories
      await Promise.all([
        financialApiService.createExpense(member.id, {
          category_id: TEST_EXPENSE_CATEGORIES.REISKOSTEN,
          description: 'Travel expense 1',
          amount: 50.00
        }),
        financialApiService.createExpense(member.id, {
          category_id: TEST_EXPENSE_CATEGORIES.SOFTWARE_ICT,
          description: 'Software subscription',
          amount: 99.00
        })
      ])

      // Query expenses by tenant
      const { data: expenses } = await testDb
        .from('expenses')
        .select('amount, category_id')
        .eq('tenant_id', member.tenantId)

      expect(expenses).toBeDefined()
      expect(expenses.length).toBeGreaterThanOrEqual(2)

      const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
      expect(totalExpenses).toBeGreaterThan(0)
    })
  })

  describe('Database Constraints & Validation', () => {
    it('should enforce foreign key constraints', async () => {
      const owner = TEST_USERS.OWNER_TENANT1

      // Try to create invoice with non-existent client
      await expect(
        financialApiService.createInvoice(owner.id, {
          client_id: 'non-existent-client-id',
          subtotal: 1000
        })
      ).rejects.toThrow()
    })

    it('should validate required fields', async () => {
      const member = TEST_USERS.MEMBER_TENANT1

      // Try to create expense without required fields
      await expect(
        testDb.from('expenses').insert([{
          tenant_id: member.tenantId,
          user_id: member.id,
          // Missing required fields like amount, description, etc.
        }])
      ).rejects.toThrow()
    })

    it('should handle concurrent operations correctly', async () => {
      const admin = TEST_USERS.ADMIN_TENANT1

      const promises = Array.from({ length: 5 }, (_, i) =>
        financialApiService.createTimeEntry(admin.id, {
          client_id: TEST_CLIENTS.NEXTGEN_DATA_LEAD.id,
          description: `Concurrent work ${i}`,
          hours: 1 + i * 0.5,
          hourly_rate: 85.00
        })
      )

      const timeEntries = await Promise.all(promises)

      expect(timeEntries).toHaveLength(5)
      timeEntries.forEach((entry, i) => {
        expect(entry.description).toBe(`Concurrent work ${i}`)
        expect(entry.hours).toBe(1 + i * 0.5)
      })
    })
  })
})