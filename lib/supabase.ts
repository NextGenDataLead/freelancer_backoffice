import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Public client for client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // We'll use Clerk for session management
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Rate limiting for real-time
    },
  },
})

// Admin client for server-side operations
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// Helper function to create a client with JWT token for RLS
export function createSupabaseClient(token: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
    },
  })
}

// Database types (will be generated later)
export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          subdomain: string | null
          created_at: string
          updated_at: string
          settings: Record<string, any>
          subscription_status: 'active' | 'inactive' | 'suspended'
          billing_email: string | null
          max_users: number
          max_storage_gb: number
        }
        Insert: {
          id?: string
          name: string
          subdomain?: string | null
          created_at?: string
          updated_at?: string
          settings?: Record<string, any>
          subscription_status?: 'active' | 'inactive' | 'suspended'
          billing_email?: string | null
          max_users?: number
          max_storage_gb?: number
        }
        Update: {
          id?: string
          name?: string
          subdomain?: string | null
          created_at?: string
          updated_at?: string
          settings?: Record<string, any>
          subscription_status?: 'active' | 'inactive' | 'suspended'
          billing_email?: string | null
          max_users?: number
          max_storage_gb?: number
        }
      }
      profiles: {
        Row: {
          id: string
          tenant_id: string
          clerk_user_id: string
          email: string
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          role: 'owner' | 'admin' | 'member' | 'viewer'
          created_at: string
          updated_at: string
          last_sign_in_at: string | null
          is_active: boolean
          preferences: Record<string, any>
        }
        Insert: {
          id?: string
          tenant_id: string
          clerk_user_id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          created_at?: string
          updated_at?: string
          last_sign_in_at?: string | null
          is_active?: boolean
          preferences?: Record<string, any>
        }
        Update: {
          id?: string
          tenant_id?: string
          clerk_user_id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          created_at?: string
          updated_at?: string
          last_sign_in_at?: string | null
          is_active?: boolean
          preferences?: Record<string, any>
        }
      }
      organizations: {
        Row: {
          id: string
          tenant_id: string
          clerk_org_id: string
          name: string
          slug: string
          description: string | null
          settings: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          clerk_org_id: string
          name: string
          slug: string
          description?: string | null
          settings?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          clerk_org_id?: string
          name?: string
          slug?: string
          description?: string | null
          settings?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}