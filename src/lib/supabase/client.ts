'use client'

import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@clerk/nextjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * React hook to get a Clerk-authenticated Supabase client
 * Uses the official Clerk-Supabase integration pattern with accessToken
 * This automatically handles token refresh and RLS policy enforcement
 */
export function useClerkSupabaseClient() {
  const { getToken } = useAuth()
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    accessToken: async () => {
      const token = await getToken({ template: 'supabase' })
      return token ?? null
    },
  })
}

/**
 * Create a basic Supabase client for public/unauthenticated access
 * Use this for operations that don't require user authentication
 */
export function createPublicSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}