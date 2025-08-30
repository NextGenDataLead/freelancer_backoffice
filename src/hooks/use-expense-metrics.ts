'use client'

import { useState, useEffect } from 'react'

interface ExpenseMetrics {
  currentMonth: {
    totalAmount: number
    percentageChange: number
  }
  vatPaid: {
    totalVatAmount: number
    deductibleAmount: number
    breakdown: Array<{
      rate: number
      amount: number
    }>
  }
  ocrProcessed: {
    totalCount: number
    ocrCount: number
    percentageAutomatic: number
  }
  categories: {
    uniqueCount: number
    topCategories: Array<{
      category: string
      totalAmount: number
      count: number
    }>
  }
}

interface UseExpenseMetricsReturn {
  metrics: ExpenseMetrics | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useExpenseMetrics(): UseExpenseMetricsReturn {
  const [metrics, setMetrics] = useState<ExpenseMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/expenses/metrics', {
        cache: 'no-store'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch expense metrics')
      }

      const data = await response.json()
      setMetrics(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error fetching expense metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [])

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics
  }
}