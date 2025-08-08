'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Metric {
  id: string
  title: string
  value: string | number
  change?: {
    value: string
    type: 'positive' | 'negative' | 'neutral'
    period: string
  }
  icon?: React.ReactNode
  description?: string
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray'
}

interface MetricsOverviewProps {
  metrics: Metric[]
  className?: string
}

export function MetricsOverview({ metrics, className = '' }: MetricsOverviewProps) {
  const getChangeIcon = (type: 'positive' | 'negative' | 'neutral') => {
    switch (type) {
      case 'positive':
        return <TrendingUp className="h-3 w-3" />
      case 'negative':
        return <TrendingDown className="h-3 w-3" />
      case 'neutral':
        return <Minus className="h-3 w-3" />
    }
  }

  const getChangeColor = (type: 'positive' | 'negative' | 'neutral') => {
    switch (type) {
      case 'positive':
        return 'text-green-600'
      case 'negative':
        return 'text-red-600'
      case 'neutral':
        return 'text-slate-600'
    }
  }

  const getCardColor = (color?: string) => {
    switch (color) {
      case 'blue':
        return 'border-l-4 border-l-blue-500'
      case 'green':
        return 'border-l-4 border-l-green-500'
      case 'red':
        return 'border-l-4 border-l-red-500'
      case 'yellow':
        return 'border-l-4 border-l-yellow-500'
      case 'purple':
        return 'border-l-4 border-l-purple-500'
      case 'gray':
        return 'border-l-4 border-l-gray-500'
      default:
        return ''
    }
  }

  return (
    <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {metrics.map((metric) => (
        <Card 
          key={metric.id} 
          className={`hover:shadow-lg transition-shadow ${getCardColor(metric.color)}`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              {metric.title}
            </CardTitle>
            {metric.icon && (
              <div className="text-slate-400">
                {metric.icon}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {typeof metric.value === 'number' 
                ? metric.value.toLocaleString() 
                : metric.value
              }
            </div>
            
            {metric.change && (
              <div className="flex items-center space-x-2">
                <div className={`flex items-center text-sm font-medium ${getChangeColor(metric.change.type)}`}>
                  {getChangeIcon(metric.change.type)}
                  <span className="ml-1">{metric.change.value}</span>
                </div>
                <span className="text-sm text-slate-500">{metric.change.period}</span>
              </div>
            )}
            
            {metric.description && (
              <p className="text-xs text-slate-500 mt-2">{metric.description}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Individual metric card component for more flexibility
interface MetricCardProps {
  metric: Metric
  className?: string
}

export function MetricCard({ metric, className = '' }: MetricCardProps) {
  return (
    <MetricsOverview metrics={[metric]} className={className} />
  )
}