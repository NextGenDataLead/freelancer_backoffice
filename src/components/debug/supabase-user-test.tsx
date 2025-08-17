'use client'

import { useUser } from '@clerk/nextjs'
import { useClerkSupabaseClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function SupabaseUserTest() {
  const { user: clerkUser, isLoaded } = useUser()
  const supabase = useClerkSupabaseClient()
  const isAuthenticated = isLoaded && !!clerkUser
  const [supabaseProfile, setSupabaseProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testSupabaseConnection = async () => {
    if (!isAuthenticated || !clerkUser) {
      setError('User not authenticated')
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('🔍 Testing Supabase connection with Clerk user:', clerkUser.id)
      
      // Try to fetch the current user's profile from Supabase
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('clerk_user_id', clerkUser.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        
        // If profile doesn't exist, try to create one automatically via INSERT
        console.log('🔧 Profile not found, attempting to create via Supabase auth...')
        
        // Test auth.users() to see if Supabase recognizes the Clerk user
        const { data: authData, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          setError(`Auth error: ${authError.message}`)
          return
        }
        
        console.log('Auth data:', authData)
        setError(`Profile not found in Supabase. Clerk user: ${clerkUser.id}. Auth user: ${authData.user?.id || 'none'}`)
      } else {
        console.log('✅ Profile found:', profile)
        setSupabaseProfile(profile)
      }
      
    } catch (err) {
      console.error('Test error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isLoaded && clerkUser && isAuthenticated) {
      // Check if we're coming from onboarding (recent redirect)
      const fromOnboarding = document.referrer.includes('/onboarding') || 
                            sessionStorage.getItem('just-completed-onboarding')
      
      if (fromOnboarding) {
        console.log('🔄 Coming from onboarding, waiting 3 seconds for profile to be ready...')
        // Clear the flag
        sessionStorage.removeItem('just-completed-onboarding')
        // Wait a bit for profile to be fully ready
        setTimeout(() => {
          testSupabaseConnection()
        }, 3000)
      } else {
        testSupabaseConnection()
      }
    }
  }, [isLoaded, clerkUser, isAuthenticated])

  if (!isLoaded) {
    return <div>Loading...</div>
  }

  if (!clerkUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Supabase-Clerk Integration Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please sign in to test the integration</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Supabase-Clerk Integration Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold">Clerk User Info:</h3>
          <p>ID: {clerkUser.id}</p>
          <p>Email: {clerkUser.primaryEmailAddress?.emailAddress || 'No email'}</p>
          <p>Name: {clerkUser.firstName} {clerkUser.lastName}</p>
        </div>

        <div>
          <h3 className="font-semibold">Supabase Integration:</h3>
          <p>Authenticated: {isAuthenticated ? '✅ Yes' : '❌ No'}</p>
          
          {supabaseProfile ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <p className="font-semibold text-green-800">✅ Profile Found in Supabase!</p>
              <pre className="text-sm mt-2 text-green-700">
                {JSON.stringify(supabaseProfile, null, 2)}
              </pre>
            </div>
          ) : error ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <p className="font-semibold text-red-800">❌ Profile Not Found</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          ) : loading ? (
            <p>Testing connection...</p>
          ) : null}
        </div>

        <Button onClick={testSupabaseConnection} disabled={loading}>
          {loading ? 'Testing...' : 'Test Connection'}
        </Button>
      </CardContent>
    </Card>
  )
}