'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'

interface ProfitTarget {
  id: string
  monthly_revenue_target: number
  monthly_cost_target: number
  monthly_profit_target: number
  // Component-based targets
  monthly_hours_target: number
  target_hourly_rate: number
  target_monthly_active_users: number
  target_avg_subscription_fee: number
  currency_code?: string
  setup_completed: boolean
  setup_step_completed: number
}

export function useProfitTargets() {
  const [targets, setTargets] = useState<ProfitTarget | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchTargets = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/profit-targets')

      if (!response.ok) {
        throw new Error('Failed to fetch profit targets')
      }

      const result = await response.json()
      console.log('Fetched profit targets:', result.data)
      setTargets(result.data)
      setError(null)
    } catch (err) {
      console.error('Error fetching profit targets:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const updateTargets = async (data: {
    monthly_revenue_target_cents: number
    monthly_cost_target_cents: number
    monthly_hours_target?: number
    target_hourly_rate_cents?: number
    target_monthly_active_users?: number
    target_avg_subscription_fee_cents?: number
    setup_step_completed?: number
  }) => {
    try {
      const response = await fetch('/api/profit-targets', {
        method: targets ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Failed to update profit targets')
      }

      const result = await response.json()

      // Refresh targets after update
      await fetchTargets()

      return result.data
    } catch (err) {
      console.error('Error updating profit targets:', err)
      toast({
        title: "Error",
        description: "Failed to update profit targets. Please try again.",
        variant: "destructive"
      })
      throw err
    }
  }

  const hasCompletedSetup = Boolean(targets?.setup_completed)
  const needsSetup = !hasCompletedSetup

  console.log('useProfitTargets state:', { targets, hasCompletedSetup, needsSetup, isLoading })

  useEffect(() => {
    fetchTargets()
  }, [])

  return {
    targets,
    isLoading,
    error,
    hasCompletedSetup,
    needsSetup,
    updateTargets,
    refetch: fetchTargets
  }
}