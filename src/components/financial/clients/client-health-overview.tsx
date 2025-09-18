'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  HeartHandshake,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Users,
  Target
} from 'lucide-react'

interface ClientHealthOverviewProps {
  healthData: {
    excellent: number
    good: number
    warning: number
    atRisk: number
    totalOverdue: number
    growingClients: number
    totalClients: number
  }
  loading?: boolean
}

export function ClientHealthOverview({ healthData, loading }: ClientHealthOverviewProps) {
  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'good': return <TrendingUp className="h-4 w-4 text-blue-600" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'at_risk': return <AlertTriangle className="h-4 w-4 text-red-600" />
      default: return null
    }
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-700 border-green-200'
      case 'good': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'warning': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'at_risk': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-primary" />
            Client Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const healthStats = [
    { status: 'excellent', label: 'Excellent', count: healthData.excellent },
    { status: 'good', label: 'Good', count: healthData.good },
    { status: 'warning', label: 'Warning', count: healthData.warning },
    { status: 'at_risk', label: 'At Risk', count: healthData.atRisk }
  ]

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HeartHandshake className="h-5 w-5 text-primary" />
          Client Health Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Health Status Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {healthStats.map((stat) => (
            <div
              key={stat.status}
              className={`p-4 rounded-lg border ${getHealthColor(stat.status)}`}
            >
              <div className="flex items-center gap-2 mb-2">
                {getHealthIcon(stat.status)}
                <span className="text-sm font-medium">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold">{stat.count}</div>
              <div className="text-xs opacity-75">
                {stat.count === 1 ? 'client' : 'clients'}
              </div>
            </div>
          ))}
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-700">Growing Clients</p>
              <p className="text-lg font-bold text-green-800">{healthData.growingClients}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-700">Total Active</p>
              <p className="text-lg font-bold text-blue-800">{healthData.totalClients}</p>
            </div>
          </div>

          <div className={`flex items-center gap-3 p-3 rounded-lg border ${
            healthData.totalOverdue > 0
              ? 'bg-red-50 border-red-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className={`p-2 rounded-lg ${
              healthData.totalOverdue > 0
                ? 'bg-red-100'
                : 'bg-gray-100'
            }`}>
              <DollarSign className={`h-4 w-4 ${
                healthData.totalOverdue > 0
                  ? 'text-red-600'
                  : 'text-gray-600'
              }`} />
            </div>
            <div>
              <p className={`text-sm font-medium ${
                healthData.totalOverdue > 0
                  ? 'text-red-700'
                  : 'text-gray-700'
              }`}>
                Total Overdue
              </p>
              <p className={`text-lg font-bold ${
                healthData.totalOverdue > 0
                  ? 'text-red-800'
                  : 'text-gray-800'
              }`}>
                €{healthData.totalOverdue.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Alert for At-Risk Clients */}
        {healthData.atRisk > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">
                Action Required: {healthData.atRisk} client{healthData.atRisk === 1 ? '' : 's'} at risk
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}