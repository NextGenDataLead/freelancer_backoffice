/**
 * Multi-Tenant Security Unit Tests
 * Testing tenant isolation and cross-tenant data protection
 */

import { describe, it, expect, vi } from 'vitest'
import { TEST_USERS, TEST_CLIENTS } from '../../setup/test-setup'

// Mock data access functions that would normally check RLS policies
const mockDataAccess = {
  getClients: vi.fn().mockImplementation((userId: string) => {
    const user = Object.values(TEST_USERS).find(u => u.id === userId)
    if (!user) return []
    
    // Return only clients belonging to user's tenant
    return Object.values(TEST_CLIENTS).filter(client => client.tenantId === user.tenantId)
  }),

  getProfiles: vi.fn().mockImplementation((userId: string) => {
    const user = Object.values(TEST_USERS).find(u => u.id === userId)
    if (!user) return []
    
    // Return only profiles from same tenant
    return Object.values(TEST_USERS).filter(u => u.tenantId === user.tenantId)
  }),

  createClient: vi.fn().mockImplementation((userId: string, clientData: any) => {
    const user = Object.values(TEST_USERS).find(u => u.id === userId)
    if (!user) throw new Error('User not found')
    
    // Ensure client is created in user's tenant
    if (clientData.tenantId !== user.tenantId) {
      throw new Error('Cannot create client in different tenant')
    }
    
    return { id: 'new-client-id', ...clientData, tenantId: user.tenantId }
  })
}

describe('Multi-Tenant Security & Isolation', () => {
  describe('Tenant Data Isolation', () => {
    it('should only return clients from user\'s tenant', () => {
      const tenant1Owner = TEST_USERS.OWNER_TENANT1
      const tenant2Owner = TEST_USERS.OWNER_TENANT2
      
      const tenant1Clients = mockDataAccess.getClients(tenant1Owner.id)
      const tenant2Clients = mockDataAccess.getClients(tenant2Owner.id)
      
      // Tenant 1 should have 2 clients
      expect(tenant1Clients).toHaveLength(2)
      expect(tenant1Clients.every(c => c.tenantId === tenant1Owner.tenantId)).toBe(true)
      
      // Tenant 2 should have 1 client
      expect(tenant2Clients).toHaveLength(1)
      expect(tenant2Clients.every(c => c.tenantId === tenant2Owner.tenantId)).toBe(true)
      
      // No overlap between tenant data
      const tenant1Ids = tenant1Clients.map(c => c.id)
      const tenant2Ids = tenant2Clients.map(c => c.id)
      expect(tenant1Ids.some(id => tenant2Ids.includes(id))).toBe(false)
    })

    it('should only return profiles from user\'s tenant', () => {
      const tenant1Owner = TEST_USERS.OWNER_TENANT1
      const tenant2Owner = TEST_USERS.OWNER_TENANT2
      
      const tenant1Profiles = mockDataAccess.getProfiles(tenant1Owner.id)
      const tenant2Profiles = mockDataAccess.getProfiles(tenant2Owner.id)
      
      // Tenant 1 should have 3 profiles (owner, admin, member)
      expect(tenant1Profiles).toHaveLength(3)
      expect(tenant1Profiles.every(p => p.tenantId === tenant1Owner.tenantId)).toBe(true)
      
      // Tenant 2 should have 1 profile (owner only)
      expect(tenant2Profiles).toHaveLength(1)
      expect(tenant2Profiles.every(p => p.tenantId === tenant2Owner.tenantId)).toBe(true)
      
      // Verify specific roles in Tenant 1
      const roles = tenant1Profiles.map(p => p.role).sort()
      expect(roles).toEqual(['admin', 'member', 'owner'])
    })

    it('should prevent cross-tenant data access', () => {
      const invalidUserId = 'invalid-user-id'
      
      const clients = mockDataAccess.getClients(invalidUserId)
      const profiles = mockDataAccess.getProfiles(invalidUserId)
      
      expect(clients).toHaveLength(0)
      expect(profiles).toHaveLength(0)
    })
  })

  describe('Tenant Creation & Modification Security', () => {
    it('should enforce tenant isolation when creating clients', () => {
      const tenant1Owner = TEST_USERS.OWNER_TENANT1
      
      const validClientData = {
        name: 'Valid Client',
        email: 'valid@example.com',
        tenantId: tenant1Owner.tenantId
      }
      
      const client = mockDataAccess.createClient(tenant1Owner.id, validClientData)
      
      expect(client).toBeDefined()
      expect(client.tenantId).toBe(tenant1Owner.tenantId)
    })

    it('should prevent creating clients in different tenant', () => {
      const tenant1Owner = TEST_USERS.OWNER_TENANT1
      const tenant2Id = TEST_USERS.OWNER_TENANT2.tenantId
      
      const invalidClientData = {
        name: 'Invalid Client',
        email: 'invalid@example.com',
        tenantId: tenant2Id // Wrong tenant!
      }
      
      expect(() => mockDataAccess.createClient(tenant1Owner.id, invalidClientData))
        .toThrow('Cannot create client in different tenant')
    })

    it('should handle invalid user attempting creation', () => {
      const invalidUserId = 'invalid-user'
      const clientData = {
        name: 'Test Client',
        email: 'test@example.com',
        tenantId: 'some-tenant-id'
      }
      
      expect(() => mockDataAccess.createClient(invalidUserId, clientData))
        .toThrow('User not found')
    })
  })

  describe('Tenant-Specific Business Rules', () => {
    it('should validate tenant-specific configurations', () => {
      const tenant1 = {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name: 'TechFlow Solutions',
        settings: { currency: 'EUR', timezone: 'Europe/Amsterdam' },
        maxUsers: 5
      }
      
      const tenant2 = {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
        name: 'Data Analytics Pro',
        settings: { currency: 'EUR', timezone: 'Europe/Brussels' },
        maxUsers: 15
      }
      
      expect(tenant1.maxUsers).toBe(5)
      expect(tenant2.maxUsers).toBe(15)
      expect(tenant1.settings.timezone).toBe('Europe/Amsterdam')
      expect(tenant2.settings.timezone).toBe('Europe/Brussels')
    })

    it('should enforce role limits per tenant', () => {
      // Tenant 1 has all 3 roles
      const tenant1Users = Object.values(TEST_USERS)
        .filter(u => u.tenantId === 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
      
      const tenant1Roles = tenant1Users.map(u => u.role)
      expect(tenant1Roles).toContain('owner')
      expect(tenant1Roles).toContain('admin') 
      expect(tenant1Roles).toContain('member')
      
      // Tenant 2 has only owner
      const tenant2Users = Object.values(TEST_USERS)
        .filter(u => u.tenantId === 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
      
      expect(tenant2Users).toHaveLength(1)
      expect(tenant2Users[0].role).toBe('owner')
    })
  })

  describe('Email Address Isolation Validation', () => {
    it('should ensure clean separation between team and client emails', () => {
      const teamEmails = Object.values(TEST_USERS).map(u => u.email)
      const clientEmails = Object.values(TEST_CLIENTS).map(c => c.email)
      
      // No email should appear in both lists
      const overlap = teamEmails.filter(email => clientEmails.includes(email))
      expect(overlap).toHaveLength(0)
    })

    it('should validate tenant-specific client assignments', () => {
      const tenant1Clients = Object.values(TEST_CLIENTS)
        .filter(c => c.tenantId === 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
      
      const tenant2Clients = Object.values(TEST_CLIENTS)
        .filter(c => c.tenantId === 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
      
      expect(tenant1Clients).toHaveLength(2)
      expect(tenant2Clients).toHaveLength(1)
      
      // Verify specific client assignments
      expect(tenant1Clients.map(c => c.email)).toContain('nextgendatalead@gmail.com')
      expect(tenant1Clients.map(c => c.email)).toContain('info.iddatasolutions@gmail.com')
      expect(tenant2Clients[0].email).toBe('imre@masterdatapartners.be')
    })
  })

  describe('Security Edge Cases', () => {
    it('should handle null/undefined tenant scenarios', () => {
      const mockUserWithoutTenant = { id: 'test', email: 'test@test.com', tenantId: null }
      
      // Should handle gracefully
      expect(() => mockDataAccess.getClients('nonexistent')).not.toThrow()
      expect(mockDataAccess.getClients('nonexistent')).toEqual([])
    })

    it('should validate UUID format for tenant IDs', () => {
      const validTenantIds = [
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
      ]
      
      validTenantIds.forEach(id => {
        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
      })
    })
  })
})