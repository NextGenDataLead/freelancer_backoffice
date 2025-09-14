/**
 * Test Setup for Comprehensive B2B SaaS Testing
 * Configures test environment for unit tests with jsdom
 */

import { beforeAll, afterEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Test user data from our comprehensive seed data
export const TEST_USERS = {
  // Tenant 1: TechFlow Solutions
  OWNER_TENANT1: {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'imre.iddatasolutions@gmail.com',
    role: 'owner',
    tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    firstName: 'Imre',
    lastName: 'van der Berg'
  },
  ADMIN_TENANT1: {
    id: '11111111-1111-1111-1111-111111111112',
    email: 'dekker.i@gmail.com',
    role: 'admin',
    tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    firstName: 'Imre',
    lastName: 'Dekker'
  },
  MEMBER_TENANT1: {
    id: '11111111-1111-1111-1111-111111111113',
    email: 'test.nextgendatalead@gmail.com',
    role: 'member',
    tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    firstName: 'Emma',
    lastName: 'Johnson'
  },
  // Tenant 2: Data Analytics Pro
  OWNER_TENANT2: {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'imre@dappastra.com',
    role: 'owner',
    tenantId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    firstName: 'Imre',
    lastName: 'Dappastra'
  }
} as const

// Test client data from seed
export const TEST_CLIENTS = {
  NEXTGEN_DATA_LEAD: {
    id: 'c1111111-1111-1111-1111-111111111111',
    email: 'nextgendatalead@gmail.com',
    tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    name: 'NextGen Data Lead'
  },
  ID_DATA_SOLUTIONS: {
    id: 'c1111111-1111-1111-1111-111111111112',
    email: 'info.iddatasolutions@gmail.com',
    tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    name: 'ID Data Solutions Branch'
  },
  MASTER_DATA_PARTNERS: {
    id: 'c2222222-2222-2222-2222-222222222222',
    email: 'imre@masterdatapartners.be',
    tenantId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    name: 'Master Data Partners'
  }
} as const

// Test expense categories (Dutch tax agency compliant)
export const TEST_EXPENSE_CATEGORIES = {
  KANTOORBENODIGDHEDEN: 'a1111111-1111-1111-1111-111111111111',
  REISKOSTEN: 'a1111111-1111-1111-1111-111111111112',
  SOFTWARE_ICT: 'a1111111-1111-1111-1111-111111111113',
  MARKETING_RECLAME: 'a1111111-1111-1111-1111-111111111114',
  ZAKELIJKE_MAALTIJDEN: 'a1111111-1111-1111-1111-111111111115',
  TELEFOON_COMMUNICATIE: 'a1111111-1111-1111-1111-111111111116'
} as const

beforeAll(() => {
  // Setup test environment
  process.env.NODE_ENV = 'test'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'test-url'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
})

afterEach(() => {
  // Cleanup after each test
  cleanup()
})

afterAll(() => {
  // Global cleanup
})

// Helper functions for testing
export const createMockUser = (overrides: Partial<typeof TEST_USERS.OWNER_TENANT1> = {}) => ({
  ...TEST_USERS.OWNER_TENANT1,
  ...overrides
})

export const createMockClient = (overrides: Partial<typeof TEST_CLIENTS.NEXTGEN_DATA_LEAD> = {}) => ({
  ...TEST_CLIENTS.NEXTGEN_DATA_LEAD,
  ...overrides
})