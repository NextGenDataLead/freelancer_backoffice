import { supabaseAdmin } from './supabase'

// Tenant management utilities
export class TenantManager {
  static async createTenant(data: {
    name: string
    subdomain?: string
    billing_email?: string
    max_users?: number
    max_storage_gb?: number
  }) {
    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .insert([data])
      .select()
      .single()

    if (error) throw error
    return tenant
  }

  static async getTenant(id: string) {
    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return tenant
  }

  static async updateTenantSettings(id: string, settings: Record<string, any>) {
    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .update({ settings })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return tenant
  }
}

// Profile management utilities
export class ProfileManager {
  static async createProfile(data: {
    tenant_id: string
    clerk_user_id: string
    email: string
    first_name?: string
    last_name?: string
    role?: 'owner' | 'admin' | 'member' | 'viewer'
  }) {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .insert([data])
      .select()
      .single()

    if (error) throw error
    return profile
  }

  static async getProfileByClerkId(clerkUserId: string) {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*, tenants(*)')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (error) throw error
    return profile
  }

  static async updateProfile(id: string, data: {
    first_name?: string
    last_name?: string
    avatar_url?: string
    preferences?: Record<string, any>
  }) {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return profile
  }

  static async updateLastSignIn(clerkUserId: string) {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update({ last_sign_in_at: new Date().toISOString() })
      .eq('clerk_user_id', clerkUserId)
      .select()
      .single()

    if (error) throw error
    return profile
  }
}

// Organization management utilities
export class OrganizationManager {
  static async createOrganization(data: {
    tenant_id: string
    clerk_org_id: string
    name: string
    slug: string
    description?: string
  }) {
    const { data: organization, error } = await supabaseAdmin
      .from('organizations')
      .insert([data])
      .select()
      .single()

    if (error) throw error
    return organization
  }

  static async addMember(organizationId: string, userId: string, role: 'owner' | 'admin' | 'member' | 'viewer' = 'member') {
    const { data: membership, error } = await supabaseAdmin
      .from('organization_memberships')
      .insert([{
        organization_id: organizationId,
        user_id: userId,
        role
      }])
      .select()
      .single()

    if (error) throw error
    return membership
  }

  static async updateMemberRole(organizationId: string, userId: string, role: 'owner' | 'admin' | 'member' | 'viewer') {
    const { data: membership, error } = await supabaseAdmin
      .from('organization_memberships')
      .update({ role })
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return membership
  }

  static async removeMember(organizationId: string, userId: string) {
    const { error } = await supabaseAdmin
      .from('organization_memberships')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId)

    if (error) throw error
  }
}

// GDPR compliance utilities
export class GDPRManager {
  static async logAuditEvent(data: {
    user_id?: string
    action: 'data_export' | 'data_access' | 'deletion_requested' | 'deletion_completed' | 'consent_given' | 'consent_withdrawn'
    ip_address?: string
    user_agent?: string
    metadata?: Record<string, any>
  }) {
    const { data: log, error } = await supabaseAdmin
      .from('gdpr_audit_logs')
      .insert([data])
      .select()
      .single()

    if (error) throw error
    return log
  }

  static async createDeletionRequest(userId: string, scheduledFor: Date) {
    const cancellationToken = crypto.randomUUID()
    
    const { data: request, error } = await supabaseAdmin
      .from('deletion_requests')
      .insert([{
        user_id: userId,
        scheduled_for: scheduledFor.toISOString(),
        cancellation_token: cancellationToken
      }])
      .select()
      .single()

    if (error) throw error
    return request
  }

  static async cancelDeletionRequest(cancellationToken: string) {
    const { data: request, error } = await supabaseAdmin
      .from('deletion_requests')
      .update({ status: 'cancelled' })
      .eq('cancellation_token', cancellationToken)
      .eq('status', 'pending')
      .select()
      .single()

    if (error) throw error
    return request
  }
}

// Database health check utility
export async function checkDatabaseHealth() {
  try {
    const start = Date.now()
    
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .limit(1)
    
    const duration = Date.now() - start
    
    if (error) {
      throw new Error(`Database query failed: ${error.message}`)
    }
    
    return {
      status: 'healthy',
      responseTime: duration,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}