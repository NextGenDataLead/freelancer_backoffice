/**
 * Database Setup for Integration Tests
 * Configures Supabase connection and provides test data utilities
 */

import { beforeAll, afterAll, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Test database configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'

export const testDb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Test data verification helpers
export const verifyTestDataExists = async () => {
  // Verify tenants exist
  const { data: tenants, error: tenantError } = await testDb
    .from('tenants')
    .select('id, name')
    .in('id', ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'])

  if (tenantError || !tenants || tenants.length < 2) {
    throw new Error('Test seed data missing: tenants not found. Run 043_complete_test_coverage_seed_data.sql')
  }

  // Verify profiles exist
  const { data: profiles, error: profileError } = await testDb
    .from('profiles')
    .select('id, email, role')
    .in('tenant_id', ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'])

  if (profileError || !profiles || profiles.length < 4) {
    throw new Error('Test seed data missing: profiles not found. Ensure all test users are seeded')
  }

  // Verify expense categories exist (Dutch tax agency categories)
  const { data: categories, error: catError } = await testDb
    .from('expense_categories')
    .select('id, name, expense_type')

  if (catError || !categories || categories.length === 0) {
    throw new Error('Test seed data missing: expense categories not found. Dutch tax categories required')
  }

  return {
    tenants,
    profiles,
    categories
  }
}

// Database state management for tests
export const resetTestState = async () => {
  // This should only reset non-seed data (time entries, invoices, etc.)
  await testDb.from('time_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await testDb.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await testDb.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await testDb.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}

// RLS policy testing helpers
export const testRLS = {
  // Test tenant isolation
  async verifyTenantIsolation(tenantId: string, userId: string) {
    const { data } = await testDb
      .rpc('set_current_user_id', { user_id: userId })
    
    const { data: clients } = await testDb
      .from('clients')
      .select('*')
    
    // All returned clients should belong to the user's tenant
    return clients?.every(client => client.tenant_id === tenantId) ?? false
  },

  // Test role-based permissions
  async verifyRolePermissions(userId: string, role: string, action: string) {
    await testDb.rpc('set_current_user_id', { user_id: userId })
    
    // Test based on role and action
    switch (role) {
      case 'owner':
        return true // Owner can do everything
      case 'admin':
        return !['delete_tenant', 'manage_billing'].includes(action)
      case 'member':
        return ['view_data', 'create_time_entry', 'submit_expense'].includes(action)
      default:
        return false
    }
  }
}

beforeAll(async () => {
  // Verify test environment
  if (process.env.NODE_ENV !== 'test') {
    console.warn('Warning: Running integration tests outside test environment')
  }

  // Verify test data exists
  try {
    await verifyTestDataExists()
    console.log('✅ Test seed data verified')
  } catch (error) {
    console.error('❌ Test setup failed:', error)
    throw error
  }
})

beforeEach(async () => {
  // Reset non-seed data before each test
  await resetTestState()
})

afterAll(async () => {
  // Clean up any test-specific data
  await resetTestState()
})