'use client'

import { useCallback, useMemo } from 'react'
import { useSession } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Hook to create an authenticated Supabase client on the client-side
 * This client will include the Clerk session token for RLS access
 */
export function useSupabaseClient() {
  const { session } = useSession()

  const getToken = useCallback(async () => {
    if (!session) return null
    return session.getToken({ template: 'supabase' })
  }, [session])

  const supabaseClient = useMemo(() => {
    return createClient(supabaseUrl, supabaseAnonKey, {
      accessToken: async () => {
        if (!session) return null
        return await session.getToken({ template: 'supabase' })
      }
    })
  }, [session])

  return {
    supabase: supabaseClient,
    getToken,
    isAuthenticated: !!session,
  }
}