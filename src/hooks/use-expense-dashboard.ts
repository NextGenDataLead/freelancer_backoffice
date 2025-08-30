import { useState, useEffect } from 'react'
import { ExpenseDashboardStats } from '@/lib/types/expenses'

interface UseExpenseDashboardReturn {
  stats: ExpenseDashboardStats | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useExpenseDashboard(): UseExpenseDashboardReturn {
  const [stats, setStats] = useState<ExpenseDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/expense-management/dashboard/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.data) {
        throw new Error('Invalid response format')
      }

      setStats(data.data)
    } catch (err) {
      console.error('Error fetching expense dashboard stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard stats')
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const refetch = async () => {
    await fetchStats()
  }

  return {
    stats,
    loading,
    error,
    refetch
  }
}