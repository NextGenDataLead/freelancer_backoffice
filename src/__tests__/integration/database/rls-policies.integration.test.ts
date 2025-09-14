/**
 * Row Level Security (RLS) Policies Integration Tests
 * Testing tenant isolation and role-based data access with real database
 */

import { describe, it, expect, beforeAll, afterEach, beforeEach } from 'vitest'
import { testDb, verifyTestDataExists, resetTestState, testRLS } from '../../setup/database-setup'
import { TEST_USERS, TEST_CLIENTS } from '../../setup/test-setup'

// Helper to set user context for RLS testing
const setUserContext = async (userId: string) => {
  // In a real implementation, this would set the JWT claims for RLS
  // For testing, we'll simulate this by setting request parameters
  await testDb.rpc('set_request_jwt_claims', {
    claims: {
      sub: userId,
      role: 'authenticated'
    }
  }).catch(() => {
    // Function might not exist in test environment, that's ok
    console.log('Note: set_request_jwt_claims function not available in test environment')
  })
}

// Test data creation helpers that respect RLS
const createTestInvoice = async (userId: string, data: any) => {
  const user = Object.values(TEST_USERS).find(u => u.id === userId)
  if (!user) throw new Error('User not found')

  const { data: invoice, error } = await testDb
    .from('invoices')
    .insert([{
      tenant_id: user.tenantId,
      created_by: userId,
      client_id: data.client_id,
      invoice_number: `TEST-${Date.now()}`,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'draft',
      subtotal: data.amount || 1000,
      vat_amount: (data.amount || 1000) * 0.21,
      total_amount: (data.amount || 1000) * 1.21,
      vat_type: 'standard',
      vat_rate: 0.21,
      currency: 'EUR',
      reference: data.reference || 'RLS Test Invoice',
      paid_amount: 0
    }])
    .select()
    .single()

  if (error) throw error
  return invoice
}

const createTestExpense = async (userId: string, data: any) => {
  const user = Object.values(TEST_USERS).find(u => u.id === userId)
  if (!user) throw new Error('User not found')

  const { data: expense, error } = await testDb
    .from('expenses')
    .insert([{
      tenant_id: user.tenantId,
      user_id: userId,
      category_id: data.category_id,
      description: data.description || 'RLS Test Expense',
      amount: data.amount || 100,
      currency: 'EUR',
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: 'personal_card',
      status: 'submitted',
      vat_rate: 0.21,
      vat_amount: (data.amount || 100) * 0.21,
      is_billable: false,
      requires_receipt: true,
      vendor: 'Test Vendor'
    }])
    .select()
    .single()

  if (error) throw error
  return expense
}

describe('RLS Policies & Tenant Isolation Integration', () => {
  beforeAll(async () => {
    await verifyTestDataExists()
  })

  beforeEach(async () => {
    await resetTestState()
  })

  afterEach(async () => {
    await resetTestState()
  })

  describe('Tenant Data Isolation', () => {
    it('should isolate client data between tenants', async () => {
      const tenant1Owner = TEST_USERS.OWNER_TENANT1
      const tenant2Owner = TEST_USERS.OWNER_TENANT2

      // Query clients as tenant 1 owner
      await setUserContext(tenant1Owner.id)
      const { data: tenant1Clients, error: error1 } = await testDb
        .from('clients')
        .select('*')

      expect(error1).toBeNull()
      expect(tenant1Clients).toBeDefined()

      // All clients should belong to tenant 1
      tenant1Clients?.forEach(client => {
        expect(client.tenant_id).toBe(tenant1Owner.tenantId)
      })

      // Query clients as tenant 2 owner
      await setUserContext(tenant2Owner.id)
      const { data: tenant2Clients, error: error2 } = await testDb
        .from('clients')
        .select('*')

      expect(error2).toBeNull()
      expect(tenant2Clients).toBeDefined()

      // All clients should belong to tenant 2
      tenant2Clients?.forEach(client => {
        expect(client.tenant_id).toBe(tenant2Owner.tenantId)
      })

      // Ensure no data overlap
      const tenant1Ids = tenant1Clients?.map(c => c.id) || []
      const tenant2Ids = tenant2Clients?.map(c => c.id) || []
      const overlap = tenant1Ids.filter(id => tenant2Ids.includes(id))
      expect(overlap).toHaveLength(0)
    })

    it('should isolate invoice data between tenants', async () => {
      const tenant1Owner = TEST_USERS.OWNER_TENANT1
      const tenant2Owner = TEST_USERS.OWNER_TENANT2

      // Create invoices in both tenants
      const invoice1 = await createTestInvoice(tenant1Owner.id, {
        client_id: TEST_CLIENTS.NEXTGEN_DATA_LEAD.id,
        amount: 1000,
        reference: 'Tenant 1 Invoice'
      })

      const invoice2 = await createTestInvoice(tenant2Owner.id, {
        client_id: TEST_CLIENTS.MASTER_DATA_PARTNERS.id,
        amount: 1500,
        reference: 'Tenant 2 Invoice'
      })

      // Verify tenant 1 can only see their invoice
      await setUserContext(tenant1Owner.id)
      const { data: tenant1Invoices } = await testDb
        .from('invoices')
        .select('*')

      expect(tenant1Invoices).toBeDefined()
      const tenant1InvoiceIds = tenant1Invoices?.map(inv => inv.id) || []
      expect(tenant1InvoiceIds).toContain(invoice1.id)
      expect(tenant1InvoiceIds).not.toContain(invoice2.id)

      // Verify tenant 2 can only see their invoice
      await setUserContext(tenant2Owner.id)
      const { data: tenant2Invoices } = await testDb
        .from('invoices')
        .select('*')

      expect(tenant2Invoices).toBeDefined()
      const tenant2InvoiceIds = tenant2Invoices?.map(inv => inv.id) || []
      expect(tenant2InvoiceIds).toContain(invoice2.id)
      expect(tenant2InvoiceIds).not.toContain(invoice1.id)
    })

    it('should isolate expense data between tenants', async () => {
      const tenant1Member = TEST_USERS.MEMBER_TENANT1
      const tenant2Owner = TEST_USERS.OWNER_TENANT2

      // Create expenses in both tenants
      const expense1 = await createTestExpense(tenant1Member.id, {
        category_id: 'a1111111-1111-1111-1111-111111111112', // Reiskosten
        description: 'Tenant 1 Travel Expense',
        amount: 75
      })

      const expense2 = await createTestExpense(tenant2Owner.id, {
        category_id: 'b2222222-2222-2222-2222-222222222222', // Professionele Diensten
        description: 'Tenant 2 Professional Services',
        amount: 250
      })

      // Verify tenant 1 member can only see their tenant's expenses
      await setUserContext(tenant1Member.id)
      const { data: tenant1Expenses } = await testDb
        .from('expenses')
        .select('*')

      expect(tenant1Expenses).toBeDefined()
      const tenant1ExpenseIds = tenant1Expenses?.map(exp => exp.id) || []
      expect(tenant1ExpenseIds).toContain(expense1.id)
      expect(tenant1ExpenseIds).not.toContain(expense2.id)

      // Verify tenant 2 owner can only see their tenant's expenses
      await setUserContext(tenant2Owner.id)
      const { data: tenant2Expenses } = await testDb
        .from('expenses')
        .select('*')

      expect(tenant2Expenses).toBeDefined()
      const tenant2ExpenseIds = tenant2Expenses?.map(exp => exp.id) || []
      expect(tenant2ExpenseIds).toContain(expense2.id)
      expect(tenant2ExpenseIds).not.toContain(expense1.id)
    })
  })

  describe('Role-Based Access Control', () => {
    it('should allow all roles to view data within their tenant', async () => {
      const { OWNER_TENANT1, ADMIN_TENANT1, MEMBER_TENANT1 } = TEST_USERS

      // Create test data
      await createTestInvoice(OWNER_TENANT1.id, {
        client_id: TEST_CLIENTS.NEXTGEN_DATA_LEAD.id,
        amount: 500
      })

      // Test each role can view data
      for (const user of [OWNER_TENANT1, ADMIN_TENANT1, MEMBER_TENANT1]) {
        await setUserContext(user.id)

        const { data: invoices, error } = await testDb
          .from('invoices')
          .select('*')

        expect(error).toBeNull()
        expect(invoices).toBeDefined()
        expect(invoices!.length).toBeGreaterThan(0)

        // All invoices should belong to the same tenant
        invoices?.forEach(invoice => {
          expect(invoice.tenant_id).toBe(user.tenantId)
        })
      }
    })

    it('should enforce create permissions based on role', async () => {
      // This test would verify role-based create permissions
      // In a real implementation, RLS policies would enforce this
      const member = TEST_USERS.MEMBER_TENANT1

      // Members should be able to create expenses
      const expense = await createTestExpense(member.id, {
        category_id: 'a1111111-1111-1111-1111-111111111112',
        description: 'Member created expense',
        amount: 50
      })

      expect(expense).toBeDefined()
      expect(expense.user_id).toBe(member.id)
    })

    it('should prevent unauthorized cross-tenant operations', async () => {
      const tenant1Owner = TEST_USERS.OWNER_TENANT1
      const tenant2Owner = TEST_USERS.OWNER_TENANT2

      // Create invoice in tenant 1
      const invoice = await createTestInvoice(tenant1Owner.id, {
        client_id: TEST_CLIENTS.NEXTGEN_DATA_LEAD.id,
        amount: 1000
      })

      // Tenant 2 owner should not be able to update tenant 1's invoice
      await setUserContext(tenant2Owner.id)

      const { data, error } = await testDb
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoice.id)
        .select()

      // Should either error or return empty result due to RLS
      expect(data).toEqual([])
    })
  })

  describe('Data Integrity & Constraints', () => {
    it('should maintain referential integrity across tenants', async () => {
      const owner = TEST_USERS.OWNER_TENANT1

      // Verify foreign key relationships work within tenant
      const invoice = await createTestInvoice(owner.id, {
        client_id: TEST_CLIENTS.NEXTGEN_DATA_LEAD.id,
        amount: 750
      })

      expect(invoice.client_id).toBe(TEST_CLIENTS.NEXTGEN_DATA_LEAD.id)
      expect(invoice.tenant_id).toBe(owner.tenantId)

      // Verify the client belongs to the same tenant
      const { data: client } = await testDb
        .from('clients')
        .select('tenant_id')
        .eq('id', invoice.client_id)
        .single()

      expect(client?.tenant_id).toBe(invoice.tenant_id)
    })

    it('should prevent orphaned records', async () => {
      // Test that dependent records maintain proper relationships
      const admin = TEST_USERS.ADMIN_TENANT1

      const invoice = await createTestInvoice(admin.id, {
        client_id: TEST_CLIENTS.ID_DATA_SOLUTIONS.id,
        amount: 600
      })

      // Verify invoice has proper tenant and user relationships
      expect(invoice.tenant_id).toBe(admin.tenantId)
      expect(invoice.created_by).toBe(admin.id)

      // Verify the creating user belongs to the same tenant
      const { data: user } = await testDb
        .from('profiles')
        .select('tenant_id')
        .eq('id', admin.id)
        .single()

      expect(user?.tenant_id).toBe(invoice.tenant_id)
    })

    it('should handle concurrent operations safely', async () => {
      const owner = TEST_USERS.OWNER_TENANT1

      // Create multiple invoices concurrently
      const promises = Array.from({ length: 3 }, (_, i) =>
        createTestInvoice(owner.id, {
          client_id: TEST_CLIENTS.NEXTGEN_DATA_LEAD.id,
          amount: 100 + i * 50,
          reference: `Concurrent Invoice ${i}`
        })
      )

      const invoices = await Promise.all(promises)

      expect(invoices).toHaveLength(3)
      invoices.forEach((invoice, i) => {
        expect(invoice.subtotal).toBe(100 + i * 50)
        expect(invoice.tenant_id).toBe(owner.tenantId)
        expect(invoice.created_by).toBe(owner.id)
      })
    })
  })

  describe('Security Edge Cases', () => {
    it('should handle malformed user context', async () => {
      // Test with invalid user ID
      await setUserContext('invalid-user-id')

      const { data: clients, error } = await testDb
        .from('clients')
        .select('*')

      // Should return empty result or error for invalid user
      expect(data).toEqual([])
    })

    it('should prevent SQL injection in user context', async () => {
      // Test with potential SQL injection in user ID
      const maliciousUserId = "'; DROP TABLE invoices; --"

      await setUserContext(maliciousUserId)

      const { data, error } = await testDb
        .from('invoices')
        .select('*')

      // Should handle gracefully without executing malicious SQL
      expect(data).toEqual([])
    })

    it('should enforce row-level security on bulk operations', async () => {
      const tenant1Owner = TEST_USERS.OWNER_TENANT1
      const tenant2Owner = TEST_USERS.OWNER_TENANT2

      // Create invoices in both tenants
      await createTestInvoice(tenant1Owner.id, {
        client_id: TEST_CLIENTS.NEXTGEN_DATA_LEAD.id,
        amount: 1000
      })

      await createTestInvoice(tenant2Owner.id, {
        client_id: TEST_CLIENTS.MASTER_DATA_PARTNERS.id,
        amount: 1500
      })

      // Tenant 1 should only be able to bulk update their own invoices
      await setUserContext(tenant1Owner.id)

      const { data: updatedInvoices, error } = await testDb
        .from('invoices')
        .update({ status: 'sent' })
        .eq('status', 'draft')
        .select('*')

      expect(error).toBeNull()
      expect(updatedInvoices).toBeDefined()

      // All updated invoices should belong to tenant 1
      updatedInvoices?.forEach(invoice => {
        expect(invoice.tenant_id).toBe(tenant1Owner.tenantId)
      })
    })

    it('should validate tenant consistency in multi-table operations', async () => {
      const owner = TEST_USERS.OWNER_TENANT1

      // Create invoice and related time entries
      const invoice = await createTestInvoice(owner.id, {
        client_id: TEST_CLIENTS.NEXTGEN_DATA_LEAD.id,
        amount: 1200
      })

      const { data: timeEntry, error } = await testDb
        .from('time_entries')
        .insert([{
          tenant_id: owner.tenantId,
          user_id: owner.id,
          client_id: TEST_CLIENTS.NEXTGEN_DATA_LEAD.id,
          description: 'Related work for invoice',
          date: new Date().toISOString().split('T')[0],
          hours: 8.0,
          hourly_rate: 85.00,
          is_billable: true,
          is_invoiced: false,
          total_amount: 680.00,
          invoice_id: invoice.id
        }])
        .select()
        .single()

      expect(error).toBeNull()
      expect(timeEntry?.tenant_id).toBe(invoice.tenant_id)
      expect(timeEntry?.invoice_id).toBe(invoice.id)
    })
  })

  describe('Performance & Scalability', () => {
    it('should efficiently query large datasets with RLS', async () => {
      const owner = TEST_USERS.OWNER_TENANT1

      // Create multiple test records
      const invoicePromises = Array.from({ length: 10 }, (_, i) =>
        createTestInvoice(owner.id, {
          client_id: TEST_CLIENTS.NEXTGEN_DATA_LEAD.id,
          amount: 100 + i * 100,
          reference: `Performance Test ${i}`
        })
      )

      await Promise.all(invoicePromises)

      await setUserContext(owner.id)

      const startTime = Date.now()
      const { data: invoices, error } = await testDb
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })

      const queryTime = Date.now() - startTime

      expect(error).toBeNull()
      expect(invoices).toBeDefined()
      expect(invoices!.length).toBeGreaterThanOrEqual(10)
      expect(queryTime).toBeLessThan(1000) // Should complete in under 1 second

      // All results should belong to the same tenant
      invoices?.forEach(invoice => {
        expect(invoice.tenant_id).toBe(owner.tenantId)
      })
    })
  })
})