import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Basic client-side Supabase client (without authentication)
// This is safe for client-side use but won't have RLS access
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations (bypasses RLS)
// Only use this in server-side API routes, never on the client
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Client-side function to create authenticated Supabase client
// Must be called from within a React component that has access to Clerk session
export function createClientSupabaseClient(getToken: () => Promise<string | null>) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        async Authorization() {
          const token = await getToken()
          return token ? `Bearer ${token}` : ''
        },
      },
    },
  })
}