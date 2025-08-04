import { createClient } from '@supabase/supabase-js'
import { useSession } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Server-side Supabase client with Clerk integration
export function createServerSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      async accessToken() {
        return (await auth()).getToken()
      },
    },
  })
}

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

// Hook for using authenticated Supabase client on client-side
export const useSupabaseClient = () => {
  const { session } = useSession()
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      async accessToken() {
        return session?.getToken({ template: 'supabase' }) ?? null
      },
    },
  })
}