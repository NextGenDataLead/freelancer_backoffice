'use client'

import { useEffect, useRef, useState } from 'react'
import { useClerkSupabaseClient } from '@/lib/supabase/client'
import { useAuth } from '@clerk/nextjs'
import { RealtimeChannel } from '@supabase/supabase-js'

// Dashboard metric type (matches database schema)
interface DashboardMetric {
  id: string
  tenant_id: string
  metric_key: string
  value: string
  change_value: string | null
  change_type: 'positive' | 'negative' | 'neutral' | null
  trend_data: number[]
  updated_at: string
}

// Frontend metric type for dashboard display
export interface MetricData {
  title: string
  value: string
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  icon: any
  trend: number[]
}

/**
 * Hook to manage real-time dashboard metrics from Supabase
 * Extends the existing realtime infrastructure from Task 22
 * Subscribes to dashboard_metrics table and provides real-time updates
 */
export function useRealtimeDashboard() {
  const supabase = useClerkSupabaseClient()
  const { userId, isLoaded } = useAuth()
  const isAuthenticated = isLoaded && !!userId
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [metrics, setMetrics] = useState<Record<string, DashboardMetric>>({})
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !userId || !supabase) {
      return
    }

    // Create a unique channel name for dashboard metrics
    const channelName = `dashboard:user-${userId}`
    
    console.log('Setting up real-time dashboard subscription for user:', userId)

    // Create the real-time subscription using the same pattern as notifications
    const channel = supabase.channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dashboard_metrics',
        },
        (payload) => {
          console.log('Real-time dashboard metric received:', payload)
          handleMetricEvent(payload)
        }
      )
      .subscribe((status) => {
        console.log('Real-time dashboard subscription status:', status)
        setIsConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    // Load initial metrics
    loadInitialMetrics()

    return () => {
      console.log('Cleaning up real-time dashboard subscription')
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsConnected(false)
    }
  }, [isAuthenticated, userId, supabase])

  const handleMetricEvent = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    switch (eventType) {
      case 'INSERT':
      case 'UPDATE':
        if (newRecord) {
          setMetrics(prev => ({
            ...prev,
            [newRecord.metric_key]: newRecord
          }))
          setLastUpdate(new Date())
        }
        break

      case 'DELETE':
        if (oldRecord) {
          setMetrics(prev => {
            const updated = { ...prev }
            delete updated[oldRecord.metric_key]
            return updated
          })
          setLastUpdate(new Date())
        }
        break

      default:
        console.log('Unknown dashboard metric event type:', eventType)
    }
  }

  const loadInitialMetrics = async () => {
    try {
      const { data: dashboardMetrics, error } = await supabase
        .from('dashboard_metrics')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error loading initial dashboard metrics:', error)
        return
      }

      if (dashboardMetrics) {
        console.log('Loaded initial dashboard metrics:', dashboardMetrics.length)
        const metricsMap: Record<string, DashboardMetric> = {}
        dashboardMetrics.forEach((metric) => {
          metricsMap[metric.metric_key] = metric
        })
        setMetrics(metricsMap)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Error in loadInitialMetrics:', error)
    }
  }

  // Update a specific metric (useful for simulating real-time updates)
  const updateMetric = async (
    metricKey: string,
    value: string,
    changeValue: string,
    changeType: 'positive' | 'negative' | 'neutral',
    trendData: number[] = []
  ) => {
    try {
      const { error } = await supabase
        .from('dashboard_metrics')
        .upsert({
          metric_key: metricKey,
          value,
          change_value: changeValue,
          change_type: changeType,
          trend_data: trendData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tenant_id,metric_key'
        })

      if (error) {
        console.error('Error updating dashboard metric:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in updateMetric:', error)
      throw error
    }
  }

  // Convert database metrics to frontend format
  const getFormattedMetrics = (): Record<string, Omit<MetricData, 'title' | 'icon'>> => {
    const formatted: Record<string, Omit<MetricData, 'title' | 'icon'>> = {}
    
    Object.values(metrics).forEach((metric) => {
      formatted[metric.metric_key] = {
        value: metric.value,
        change: metric.change_value || '+0.0%',
        changeType: metric.change_type || 'neutral',
        trend: Array.isArray(metric.trend_data) ? metric.trend_data : []
      }
    })
    
    return formatted
  }

  // Simulate real-time updates (useful for testing)
  const simulateMetricUpdate = async (metricKey: string) => {
    const baseValues = {
      revenue: { base: 45000, format: '$', suffix: '' },
      users: { base: 2300, format: '', suffix: '' },
      conversion: { base: 3.2, format: '', suffix: '%' },
      session: { base: 270, format: '', suffix: 's' }
    }

    const config = baseValues[metricKey as keyof typeof baseValues]
    if (!config) return

    // Generate slightly random values
    const variation = (Math.random() - 0.5) * 0.1 // ±5% variation
    const newValue = Math.round(config.base * (1 + variation))
    const changePercent = ((variation * 100) + Math.random() * 5).toFixed(1)
    const changeType = variation > 0 ? 'positive' : variation < 0 ? 'negative' : 'neutral'
    
    // Generate new trend data
    const currentMetric = metrics[metricKey]
    const currentTrend = currentMetric?.trend_data || []
    const newTrend = [...currentTrend.slice(-6), newValue] // Keep last 7 values

    const formattedValue = metricKey === 'session' 
      ? `${Math.floor(newValue / 60)}m ${newValue % 60}s`
      : `${config.format}${newValue.toLocaleString()}${config.suffix}`

    const formattedChange = `${variation > 0 ? '+' : ''}${changePercent}%`

    await updateMetric(metricKey, formattedValue, formattedChange, changeType, newTrend)
  }

  return {
    metrics: getFormattedMetrics(),
    isConnected,
    lastUpdate,
    updateMetric,
    simulateMetricUpdate,
    hasMetrics: Object.keys(metrics).length > 0
  }
}