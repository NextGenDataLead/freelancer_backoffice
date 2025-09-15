'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  ArrowUpDown,
  ChevronRight,
  Building2
} from 'lucide-react'

// Client health scoring interfaces
interface ClientHealthData {
  id: string
  name: string
  revenue: {
    thisMonth: number
    lastMonth: number
    total: number
  }
  payment: {
    averageDays: number
    overdueAmount: number
    overdueCount: number
    lastPayment: string
  }
  projects: {
    active: number
    completed: number
    onHold: number
  }
  engagement: {
    lastActivity: string
    hoursThisMonth: number
    communicationScore: number // 1-10
  }
}

interface ClientHealthScore {
  client: ClientHealthData
  score: number // 0-100
  status: 'excellent' | 'good' | 'warning' | 'at_risk'
  riskFactors: string[]
  opportunities: string[]
  trends: {
    revenue: 'up' | 'down' | 'stable'
    engagement: 'up' | 'down' | 'stable'
    payment: 'improving' | 'declining' | 'stable'
  }
}

// Calculate client health score
const calculateClientHealth = (client: ClientHealthData): ClientHealthScore => {
  let score = 100
  const riskFactors: string[] = []
  const opportunities: string[] = []

  // Revenue analysis (30 points max)
  const revenueChange = client.revenue.thisMonth / Math.max(client.revenue.lastMonth, 1)
  let revenueTrend: 'up' | 'down' | 'stable' = 'stable'

  if (revenueChange > 1.1) {
    revenueTrend = 'up'
    opportunities.push('Revenue growing - consider upselling')
  } else if (revenueChange < 0.8) {
    revenueTrend = 'down'
    score -= 20
    riskFactors.push(`Revenue down ${Math.round((1-revenueChange)*100)}% this month`)
  }

  // Payment behavior (25 points max)
  let paymentTrend: 'improving' | 'declining' | 'stable' = 'stable'

  if (client.payment.averageDays > 45) {
    score -= 15
    paymentTrend = 'declining'
    riskFactors.push(`Slow payments (${client.payment.averageDays} days average)`)
  }

  if (client.payment.overdueAmount > 0) {
    score -= Math.min(client.payment.overdueCount * 5, 20)
    riskFactors.push(`€${client.payment.overdueAmount.toLocaleString()} overdue`)
  } else {
    paymentTrend = 'improving'
  }

  // Project activity (25 points max)
  if (client.projects.active === 0) {
    score -= 25
    riskFactors.push('No active projects')
  } else if (client.projects.active > 2) {
    opportunities.push('Multiple active projects - stable relationship')
  }

  if (client.projects.onHold > 0) {
    score -= client.projects.onHold * 5
    riskFactors.push(`${client.projects.onHold} projects on hold`)
  }

  // Engagement analysis (20 points max)
  const daysSinceActivity = Math.floor(
    (Date.now() - new Date(client.engagement.lastActivity).getTime()) / (1000 * 60 * 60 * 24)
  )

  let engagementTrend: 'up' | 'down' | 'stable' = 'stable'

  if (daysSinceActivity > 30) {
    score -= 15
    engagementTrend = 'down'
    riskFactors.push('No activity in 30+ days')
  } else if (client.engagement.hoursThisMonth > 40) {
    engagementTrend = 'up'
    opportunities.push('High engagement this month')
  }

  if (client.engagement.communicationScore < 5) {
    score -= 10
    riskFactors.push('Poor communication score')
  }

  // Determine overall status
  let status: ClientHealthScore['status']
  if (score >= 85) status = 'excellent'
  else if (score >= 70) status = 'good'
  else if (score >= 50) status = 'warning'
  else status = 'at_risk'

  return {
    client,
    score: Math.max(0, Math.round(score)),
    status,
    riskFactors,
    opportunities,
    trends: {
      revenue: revenueTrend,
      engagement: engagementTrend,
      payment: paymentTrend
    }
  }
}

// Mock data - replace with real API call
const mockClientData: ClientHealthData[] = [
  {
    id: '1',
    name: 'Acme Corporation',
    revenue: { thisMonth: 8500, lastMonth: 7200, total: 45000 },
    payment: { averageDays: 28, overdueAmount: 0, overdueCount: 0, lastPayment: '2024-01-10' },
    projects: { active: 2, completed: 8, onHold: 0 },
    engagement: { lastActivity: '2024-01-15', hoursThisMonth: 45, communicationScore: 8 }
  },
  {
    id: '2',
    name: 'Beta Tech Solutions',
    revenue: { thisMonth: 2100, lastMonth: 6800, total: 28000 },
    payment: { averageDays: 52, overdueAmount: 3200, overdueCount: 1, lastPayment: '2023-12-15' },
    projects: { active: 1, completed: 4, onHold: 1 },
    engagement: { lastActivity: '2024-01-05', hoursThisMonth: 12, communicationScore: 4 }
  },
  {
    id: '3',
    name: 'Gamma Industries',
    revenue: { thisMonth: 5200, lastMonth: 4800, total: 31000 },
    payment: { averageDays: 21, overdueAmount: 0, overdueCount: 0, lastPayment: '2024-01-12' },
    projects: { active: 3, completed: 6, onHold: 0 },
    engagement: { lastActivity: '2024-01-14', hoursThisMonth: 38, communicationScore: 9 }
  },
  {
    id: '4',
    name: 'Delta Consulting',
    revenue: { thisMonth: 1200, lastMonth: 1800, total: 15000 },
    payment: { averageDays: 35, overdueAmount: 0, overdueCount: 0, lastPayment: '2024-01-08' },
    projects: { active: 0, completed: 3, onHold: 0 },
    engagement: { lastActivity: '2023-12-20', hoursThisMonth: 8, communicationScore: 6 }
  },
  {
    id: '5',
    name: 'Echo Innovations',
    revenue: { thisMonth: 4800, lastMonth: 4200, total: 22000 },
    payment: { averageDays: 18, overdueAmount: 0, overdueCount: 0, lastPayment: '2024-01-13' },
    projects: { active: 2, completed: 5, onHold: 0 },
    engagement: { lastActivity: '2024-01-14', hoursThisMonth: 32, communicationScore: 7 }
  }
]

const formatCurrency = (amount: number) => `€${amount.toLocaleString()}`

interface ClientHealthDashboardProps {
  className?: string
  onViewAllClients?: () => void
}

export function ClientHealthDashboard({ className, onViewAllClients }: ClientHealthDashboardProps) {
  const [clientHealthScores, setClientHealthScores] = useState<ClientHealthScore[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'score' | 'revenue' | 'risk'>('score')

  useEffect(() => {
    // Fetch real client data from API
    const fetchClientHealth = async () => {
      try {
        setLoading(true)

        // Fetch real client data
        const response = await fetch('/api/clients')
        if (!response.ok) {
          throw new Error('Failed to fetch clients')
        }

        const clientsResult = await response.json()
        const clients = clientsResult.data || []

        // Transform real client data to health format
        const clientHealthData: ClientHealthData[] = await Promise.all(
          clients.map(async (client: any) => {
            // Fetch time entries for this client to calculate engagement
            const timeResponse = await fetch(`/api/time-entries?clientId=${client.id}`)
            const timeResult = timeResponse.ok ? await timeResponse.json() : { data: [] }
            const timeEntries = timeResult.data || []

            // Calculate this month's hours and revenue
            const thisMonth = new Date().getMonth()
            const thisYear = new Date().getFullYear()
            const thisMonthEntries = timeEntries.filter((entry: any) => {
              const entryDate = new Date(entry.entry_date)
              return entryDate.getMonth() === thisMonth && entryDate.getFullYear() === thisYear
            })

            const thisMonthHours = thisMonthEntries.reduce((sum: number, entry: any) => sum + entry.hours, 0)
            const thisMonthRevenue = thisMonthEntries.reduce((sum: number, entry: any) => sum + (entry.hours * (entry.effective_hourly_rate || entry.hourly_rate || 0)), 0)

            // Calculate last month's revenue for comparison
            const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
            const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear
            const lastMonthEntries = timeEntries.filter((entry: any) => {
              const entryDate = new Date(entry.entry_date)
              return entryDate.getMonth() === lastMonth && entryDate.getFullYear() === lastMonthYear
            })

            const lastMonthRevenue = lastMonthEntries.reduce((sum: number, entry: any) => sum + (entry.hours * (entry.effective_hourly_rate || entry.hourly_rate || 0)), 0)

            return {
              id: client.id,
              name: client.name,
              revenue: {
                thisMonth: thisMonthRevenue,
                lastMonth: lastMonthRevenue,
                total: timeEntries.reduce((sum: number, entry: any) => sum + (entry.hours * (entry.effective_hourly_rate || entry.hourly_rate || 0)), 0)
              },
              payment: {
                averageDays: client.default_payment_terms || 30,
                overdueAmount: 0, // TODO: Calculate from invoices
                overdueCount: 0, // TODO: Calculate from invoices
                lastPayment: new Date().toISOString().split('T')[0] // Mock - TODO: Get from last invoice payment
              },
              projects: {
                active: 1, // TODO: Count active projects for this client
                completed: 0, // TODO: Count completed projects
                onHold: 0
              },
              engagement: {
                lastActivity: thisMonthEntries.length > 0 ? thisMonthEntries[thisMonthEntries.length - 1].entry_date : new Date().toISOString().split('T')[0],
                hoursThisMonth: thisMonthHours,
                communicationScore: thisMonthHours > 10 ? 8 : thisMonthHours > 5 ? 6 : 4 // Simple scoring based on hours
              }
            }
          })
        )

        // Calculate health scores for all clients
        const scores = clientHealthData.map(calculateClientHealth)

        // Sort by default criteria
        const sortedScores = scores.sort((a, b) => {
          if (sortBy === 'score') return b.score - a.score
          if (sortBy === 'revenue') return b.client.revenue.thisMonth - a.client.revenue.thisMonth
          if (sortBy === 'risk') return a.score - b.score // Higher risk first (lower scores)
          return 0
        })

        setClientHealthScores(sortedScores)
      } catch (error) {
        console.error('Failed to fetch client health data:', error)

        // Fallback to mock data if API fails
        const scores = mockClientData.map(calculateClientHealth)
        const sortedScores = scores.sort((a, b) => {
          if (sortBy === 'score') return b.score - a.score
          if (sortBy === 'revenue') return b.client.revenue.thisMonth - a.client.revenue.thisMonth
          if (sortBy === 'risk') return a.score - b.score
          return 0
        })
        setClientHealthScores(sortedScores)
      } finally {
        setLoading(false)
      }
    }

    fetchClientHealth()
  }, [sortBy])

  const getStatusColor = (status: ClientHealthScore['status']) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100 border-green-200'
      case 'good': return 'text-blue-600 bg-blue-100 border-blue-200'
      case 'warning': return 'text-orange-600 bg-orange-100 border-orange-200'
      case 'at_risk': return 'text-red-600 bg-red-100 border-red-200'
    }
  }

  const getStatusIcon = (status: ClientHealthScore['status']) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'good': return <TrendingUp className="h-4 w-4 text-blue-600" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'at_risk': return <AlertTriangle className="h-4 w-4 text-red-600" />
    }
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable' | 'improving' | 'declining') => {
    if (trend === 'up' || trend === 'improving') return <TrendingUp className="h-3 w-3 text-green-500" />
    if (trend === 'down' || trend === 'declining') return <TrendingDown className="h-3 w-3 text-red-500" />
    return <div className="h-3 w-3 rounded-full bg-gray-400"></div>
  }

  if (loading) {
    return (
      <Card className={`mobile-card-glass ${className}`}>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 bg-muted animate-pulse rounded"></div>
            <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-3 rounded-lg border animate-pulse">
              <div className="flex justify-between items-start mb-2">
                <div className="h-4 w-24 bg-muted rounded"></div>
                <div className="h-5 w-12 bg-muted rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-muted rounded"></div>
                <div className="h-3 w-3/4 bg-muted rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  // Calculate overview stats
  const atRiskClients = clientHealthScores.filter(c => c.status === 'at_risk').length
  const totalRevenue = clientHealthScores.reduce((sum, c) => sum + c.client.revenue.thisMonth, 0)
  const topClient = clientHealthScores.length > 0 ? clientHealthScores[0] : null

  return (
    <Card className={`mobile-card-glass ${className}`}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <h3 className="text-base font-semibold">Client Health</h3>
            {atRiskClients > 0 && (
              <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                {atRiskClients} at risk
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortBy(sortBy === 'score' ? 'risk' : sortBy === 'risk' ? 'revenue' : 'score')}
              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              <ArrowUpDown className="h-4 w-4" />
              {sortBy === 'score' ? 'Score' : sortBy === 'risk' ? 'Risk' : 'Revenue'}
            </button>
            <button
              onClick={onViewAllClients}
              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              View All
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-bold text-blue-600">{clientHealthScores.length}</p>
            <p className="text-xs text-blue-600">Active</p>
          </div>
          <div className="p-2 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-green-600">Revenue</p>
          </div>
          <div className={`p-2 rounded-lg border ${
            atRiskClients > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
          }`}>
            <p className={`text-sm font-bold ${atRiskClients > 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {atRiskClients}
            </p>
            <p className={`text-xs ${atRiskClients > 0 ? 'text-red-600' : 'text-gray-600'}`}>At Risk</p>
          </div>
        </div>

        {/* Top Clients */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Top Clients by {sortBy === 'score' ? 'Health Score' : sortBy === 'risk' ? 'Risk Level' : 'Revenue'}
          </h4>
          <div className="space-y-2">
            {clientHealthScores.slice(0, 4).map((clientScore, index) => (
              <div key={clientScore.client.id} className="p-3 rounded-lg border border-border/30 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">{clientScore.client.name}</p>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(clientScore.status)}
                        <span className="text-xs font-medium">{clientScore.score}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(clientScore.client.revenue.thisMonth)}
                      </div>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(clientScore.trends.revenue)}
                        Rev
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {clientScore.client.payment.averageDays}d
                      </div>
                    </div>
                  </div>
                  <Badge className={`text-xs ${getStatusColor(clientScore.status)}`}>
                    {clientScore.status.toUpperCase()}
                  </Badge>
                </div>

                {/* Risk Factors or Opportunities */}
                {(clientScore.riskFactors.length > 0 || clientScore.opportunities.length > 0) && (
                  <div className="mt-2">
                    {clientScore.riskFactors.length > 0 && (
                      <p className="text-xs text-red-600">
                        ⚠️ {clientScore.riskFactors[0]}
                      </p>
                    )}
                    {clientScore.opportunities.length > 0 && !clientScore.riskFactors.length && (
                      <p className="text-xs text-green-600">
                        💡 {clientScore.opportunities[0]}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-2 border-t border-border/20">
          <div className="flex gap-2">
            <button
              onClick={onViewAllClients}
              className="flex-1 text-sm text-primary hover:bg-primary/10 py-2 px-3 rounded-lg transition-colors"
            >
              View All Clients
            </button>
            {atRiskClients > 0 && (
              <button
                onClick={() => onViewAllClients?.()}
                className="text-sm text-red-600 hover:bg-red-50 py-2 px-3 rounded-lg transition-colors"
              >
                Review At-Risk
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}