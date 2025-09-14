'use client'

import * as React from 'react'
import { MetricCard } from './MetricCard'
import { 
  DollarSign,
  Users,
  TrendingUp,
  Activity
} from "lucide-react"

// Static metric configuration (titles and icons)
const metricConfig = {
  revenue: { title: "Monthly Revenue", icon: DollarSign },
  users: { title: "Active Users", icon: Users },
  conversion: { title: "Conversion Rate", icon: TrendingUp },
  session: { title: "Avg. Session", icon: Activity }
}

// Fallback static data when no real-time data is available
const fallbackMetricsData = [
  {
    title: "Monthly Revenue",
    value: "$45,231",
    change: "+20.1%",
    changeType: "positive" as const,
    icon: DollarSign,
    trend: [4000, 3000, 5000, 4500, 6000, 5500, 7000]
  },
  {
    title: "Active Users",
    value: "2,350",
    change: "+8.2%", 
    changeType: "positive" as const,
    icon: Users,
    trend: [2000, 2100, 2050, 2200, 2300, 2280, 2350]
  },
  {
    title: "Conversion Rate",
    value: "3.24%",
    change: "-0.4%",
    changeType: "negative" as const, 
    icon: TrendingUp,
    trend: [3.8, 3.6, 3.4, 3.2, 3.3, 3.1, 3.24]
  },
  {
    title: "Avg. Session",
    value: "4m 32s",
    change: "+12.5%",
    changeType: "positive" as const,
    icon: Activity,
    trend: [240, 250, 245, 260, 270, 268, 272]
  }
]

interface MetricsGridProps {
  realtimeMetrics: any;
  hasMetrics: boolean;
}

export function MetricsGrid({ realtimeMetrics, hasMetrics }: MetricsGridProps) {
  const metricsData = React.useMemo(() => {
    if (hasMetrics) {
      // Use real-time data when available
      return Object.entries(metricConfig).map(([key, config]) => {
        const realtimeData = realtimeMetrics[key]
        if (realtimeData) {
          return {
            title: config.title,
            icon: config.icon,
            ...realtimeData
          }
        }
        // Fallback to static data if specific metric not available
        return fallbackMetricsDatal.find(metric => metric.title === config.title) || fallbackMetricsData[0]
      })
    }
    // Use fallback data when no real-time data available
    return fallbackMetricsData
  }, [realtimeMetrics, hasMetrics])

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {metricsData.map((metric) => (
        <MetricCard key={metric.title} {...metric} />
      ))}
    </div>
  )
}
