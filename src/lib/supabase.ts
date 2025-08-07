import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Basic client-side Supabase client (without authentication)
// This is safe for client-side use but won't have RLS access
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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