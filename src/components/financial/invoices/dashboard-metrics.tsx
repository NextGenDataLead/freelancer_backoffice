'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Euro, Clock, FileText, TrendingUp, AlertTriangle } from 'lucide-react'

interface DashboardMetrics {
  factureerbaar: number
  totale_registratie: number
  achterstallig: number
  achterstallig_count: number
  period_info: {
    current_date: string
    previous_month: string
    previous_week: string
  }
}

interface DashboardMetricsProps {
  onRefresh?: () => void
}

export function DashboardMetrics({ onRefresh }: DashboardMetricsProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/invoices/dashboard-metrics')
      
      if (!response.ok) {
        throw new Error('Failed to fetch metrics')
      }
      
      const data = await response.json()
      setMetrics(data.data)
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load metrics')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [])

  // Allow parent to trigger refresh
  useEffect(() => {
    if (onRefresh) {
      onRefresh = fetchMetrics
    }
  }, [onRefresh])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const getMetricChange = (value: number) => {
    // For demo purposes, show some trend indicators
    if (value > 1000) return { change: '+12.3%', positive: true }
    if (value > 500) return { change: '+8.1%', positive: true }
    if (value === 0) return { change: '0%', positive: null }
    return { change: '-2.1%', positive: false }
  }

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-600">Error loading metrics</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Factureerbaar */}
      <Card className="border-blue-200 hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-700">
            Factureerbaar
          </CardTitle>
          <Euro className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-8 bg-blue-100 animate-pulse rounded w-32"></div>
              <div className="h-4 bg-blue-50 animate-pulse rounded w-40"></div>
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold text-blue-900">
                {metrics ? formatCurrency(metrics.factureerbaar) : '€0,00'}
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Klaar voor facturering volgens frequentie
              </p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-blue-500 mr-1" />
                <span className="text-xs text-blue-500">
                  {getMetricChange(metrics?.factureerbaar || 0).change}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Totale Registratie */}
      <Card className="border-green-200 hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-700">
            Totale Registratie
          </CardTitle>
          <Clock className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-8 bg-green-100 animate-pulse rounded w-32"></div>
              <div className="h-4 bg-green-50 animate-pulse rounded w-40"></div>
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold text-green-900">
                {metrics ? formatCurrency(metrics.totale_registratie) : '€0,00'}
              </div>
              <p className="text-xs text-green-600 mt-1">
                Alle onfactureert tijd registraties
              </p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-xs text-green-500">
                  {getMetricChange(metrics?.totale_registratie || 0).change}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Achterstallig */}
      <Card className="border-orange-200 hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-orange-700">
            Achterstallig
          </CardTitle>
          <FileText className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-8 bg-orange-100 animate-pulse rounded w-32"></div>
              <div className="h-4 bg-orange-50 animate-pulse rounded w-40"></div>
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold text-orange-900">
                {metrics ? formatCurrency(metrics.achterstallig) : '€0,00'}
              </div>
              <p className="text-xs text-orange-600 mt-1">
                {metrics?.achterstallig_count || 0} facturen over vervaldatum
              </p>
              {metrics && metrics.achterstallig > 0 && (
                <div className="flex items-center mt-2">
                  <AlertTriangle className="h-3 w-3 text-orange-500 mr-1" />
                  <span className="text-xs text-orange-500">
                    Actie vereist
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}