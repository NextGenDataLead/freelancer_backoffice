/**
 * Grace Period Hook
 * Checks if user is in account deletion grace period
 * and provides utilities for grace period state management
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'

interface GracePeriodStatus {
  isInGracePeriod: boolean
  scheduledDeletionAt?: string
  daysRemaining?: number
  canCancel?: boolean
  loading: boolean
  error?: string
}

export function useGracePeriod(): GracePeriodStatus & { refresh: () => void } {
  const { isLoaded } = useAuth()
  const [status, setStatus] = useState<GracePeriodStatus>({
    isInGracePeriod: false,
    loading: true,
  })

  const checkGracePeriodStatus = async () => {
    try {
      console.log('DEBUG: Checking grace period status...')
      const response = await fetch('/api/user/delete-account', {
        method: 'GET',
        cache: 'no-store', // Ensure fresh data
      })

      if (response.ok) {
        const data = await response.json()
        console.log('DEBUG: Grace period API response:', data)
        
        setStatus({
          isInGracePeriod: data.hasPendingDeletion || false,
          scheduledDeletionAt: data.scheduledDeletionAt,
          daysRemaining: data.daysRemaining,
          canCancel: data.canCancel,
          loading: false,
        })
      } else {
        console.log('DEBUG: Grace period API error:', response.status)
        setStatus({
          isInGracePeriod: false,
          loading: false,
          error: 'Failed to check grace period status',
        })
      }
    } catch (error) {
      console.error('Grace period check error:', error)
      setStatus({
        isInGracePeriod: false,
        loading: false,
        error: 'Failed to check grace period status',
      })
    }
  }

  useEffect(() => {
    if (!isLoaded) return
    checkGracePeriodStatus()

    // Listen for grace period status changes from other components
    const handleGracePeriodChange = (event: CustomEvent) => {
      console.log('DEBUG: Grace period status changed event received:', event.detail)
      checkGracePeriodStatus() // Refresh status
    }

    window.addEventListener('gracePeriodStatusChanged', handleGracePeriodChange as EventListener)
    
    return () => {
      window.removeEventListener('gracePeriodStatusChanged', handleGracePeriodChange as EventListener)
    }
  }, [isLoaded])

  return { ...status, refresh: checkGracePeriodStatus }
}

/**
 * Hook to prevent actions during grace period
 * Returns a function that shows appropriate error message
 */
export function useGracePeriodGuard() {
  const { isInGracePeriod, daysRemaining } = useGracePeriod()

  const preventAction = (actionName: string = 'this action'): boolean => {
    if (isInGracePeriod) {
      const message = `You cannot perform ${actionName} during the account deletion grace period. ${
        daysRemaining ? `${daysRemaining} days remaining until deletion.` : ''
      } You can cancel the deletion request in Privacy Settings.`
      
      alert(message) // TODO: Replace with proper toast notification
      return true // Action is prevented
    }
    return false // Action is allowed
  }

  return {
    isInGracePeriod,
    preventAction,
    daysRemaining,
  }
}