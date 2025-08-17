'use client'

import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { AccountPreparationLoading } from '@/components/ui/account-preparation-loading'
import { useUserSync } from '@/lib/user-sync'
import { useEffect, useState } from 'react'

export default function LoadingPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [profileSyncComplete, setProfileSyncComplete] = useState(false)
  const [syncAttempted, setSyncAttempted] = useState(false)

  // Initialize user sync to ensure profile creation
  const { isAuthenticated } = useUserSync()

  // Run profile sync and check after user is loaded
  useEffect(() => {
    if (!isLoaded || !user || !isAuthenticated || syncAttempted) return

    setSyncAttempted(true)
    
    const completeProfileSync = async () => {
      console.log('🔄 Starting profile sync process during loading...')
      
      try {
        // First, trigger user sync via the sync endpoint
        const syncResponse = await fetch('/api/user/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })

        if (syncResponse.ok) {
          console.log('✅ User sync completed')
        } else {
          console.log('⚠️ User sync had issues, but continuing...')
        }

        // Wait a moment for any async operations to complete
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Now check if profile is ready
        let profileReady = false
        let attempts = 0
        const maxAttempts = 8 // 16 seconds max

        while (!profileReady && attempts < maxAttempts) {
          try {
            const response = await fetch('/api/user/profile-status')
            const data = await response.json()
            
            if (data.ready) {
              profileReady = true
              console.log('✅ Profile is ready!')
              setProfileSyncComplete(true)
              break
            } else {
              console.log(`🔄 Profile not ready yet, attempt ${attempts + 1}/${maxAttempts}`)
              await new Promise(resolve => setTimeout(resolve, 2000))
              attempts++
            }
          } catch (error) {
            console.error('Error checking profile status:', error)
            attempts++
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }

        // If profile still not ready after all attempts, proceed anyway
        if (!profileReady) {
          console.log('⚠️ Profile sync incomplete, but proceeding to dashboard')
          setProfileSyncComplete(true)
        }

      } catch (error) {
        console.error('Error during profile sync:', error)
        // Fallback: proceed after a delay
        setTimeout(() => setProfileSyncComplete(true), 5000)
      }
    }

    completeProfileSync()
  }, [isLoaded, user, isAuthenticated, syncAttempted])

  const handleLoadingComplete = () => {
    // Only redirect after profile sync is complete or timeout
    if (profileSyncComplete) {
      console.log('🚀 Redirecting to dashboard - profile should be ready!')
      router.push('/dashboard')
    } else {
      // Wait a bit more and then redirect anyway
      console.log('⏰ Loading timeout - redirecting to dashboard anyway')
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }

  return (
    <AccountPreparationLoading 
      onComplete={handleLoadingComplete}
      initialCount={20}
    />
  )
}