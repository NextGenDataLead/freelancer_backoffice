'use client'

// Enhanced clients tab with health insights integration
// Combines client management with comprehensive health analytics

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientForm } from '@/components/financial/clients/client-form'
import { ClientHealthOverview } from '@/components/financial/clients/client-health-overview'
import { ActionableInsights } from '@/components/financial/clients/actionable-insights'
import { ClientHealthCard } from '@/components/financial/clients/client-health-card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Users, Plus, FolderOpen, Euro, Loader2, Filter, Search, LayoutGrid, List,
  TrendingUp, AlertTriangle, CheckCircle, Mail
} from 'lucide-react'

// Health calculation function (copied from client-health-dashboard)
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
    // Enhanced penalty based on amount
    const countPenalty = Math.min(client.payment.overdueCount * 5, 15)
    let amountPenalty = 0
    if (client.payment.overdueAmount > 2000) amountPenalty = 20
    else if (client.payment.overdueAmount > 1000) amountPenalty = 15
    else if (client.payment.overdueAmount > 500) amountPenalty = 10
    else amountPenalty = 5

    score -= (countPenalty + amountPenalty)
    riskFactors.push(`€${client.payment.overdueAmount.toLocaleString()} overdue`)
    paymentTrend = 'declining'
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
    communicationScore: number
  }
}

interface ClientHealthScore {
  client: ClientHealthData
  score: number
  status: 'excellent' | 'good' | 'warning' | 'at_risk'
  riskFactors: string[]
  opportunities: string[]
  trends: {
    revenue: 'up' | 'down' | 'stable'
    engagement: 'up' | 'down' | 'stable'
    payment: 'improving' | 'declining' | 'stable'
  }
}

interface ClientStats {
  activeClients: number
  activeProjects: number
  averageHourlyRate: number | null
  totalClients: number
  totalProjects: number
}

interface ActionableInsight {
  id: string
  type: 'urgent' | 'opportunity' | 'warning' | 'info'
  priority: 'high' | 'medium' | 'low'
  clientId: string
  clientName: string
  title: string
  description: string
  action?: string
  value?: number
  daysOverdue?: number
}

export function ClientsTabContent() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingClient, setEditingClient] = useState<any>(null)
  const [clientStats, setClientStats] = useState<ClientStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Health-related state
  const [clientHealthScores, setClientHealthScores] = useState<ClientHealthScore[]>([])
  const [healthLoading, setHealthLoading] = useState(true)
  const [actionableInsights, setActionableInsights] = useState<ActionableInsight[]>([])

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'score' | 'revenue' | 'risk' | 'name'>('score')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const fetchClientStats = async () => {
    try {
      setStatsLoading(true)
      const response = await fetch('/api/clients/stats')
      if (response.ok) {
        const data = await response.json()
        setClientStats(data.data)
      } else {
        console.error('Failed to fetch client stats')
      }
    } catch (error) {
      console.error('Error fetching client stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchClientHealthData = async () => {
    try {
      setHealthLoading(true)

      // Fetch clients
      const clientsResponse = await fetch('/api/clients?limit=100&active=true')
      if (!clientsResponse.ok) throw new Error('Failed to fetch clients')
      const clientsResult = await clientsResponse.json()
      const clients = clientsResult.data || []

      // Calculate health for each client (similar to client health dashboard logic)
      const clientHealthData: ClientHealthData[] = await Promise.all(
        clients.map(async (client: any) => {
          // Fetch time entries
          const timeResponse = await fetch(`/api/time-entries?clientId=${client.id}`)
          const timeResult = timeResponse.ok ? await timeResponse.json() : { data: [] }
          const timeEntries = timeResult.data || []

          // Fetch projects
          const projectsResponse = await fetch(`/api/projects?client_id=${client.id}`)
          const projectsResult = projectsResponse.ok ? await projectsResponse.json() : { data: [] }
          const projects = projectsResult.data || []

          // Fetch invoices
          const invoicesResponse = await fetch(`/api/invoices?client_id=${client.id}`)
          const invoicesResult = invoicesResponse.ok ? await invoicesResponse.json() : { data: [] }
          const invoices = invoicesResult.data || []

          // Calculate metrics (same logic as client health dashboard)
          const thisMonth = new Date().getMonth()
          const thisYear = new Date().getFullYear()
          const thisMonthEntries = timeEntries.filter((entry: any) => {
            const entryDate = new Date(entry.entry_date)
            return entryDate.getMonth() === thisMonth && entryDate.getFullYear() === thisYear
          })

          const thisMonthHours = thisMonthEntries.reduce((sum: number, entry: any) => sum + entry.hours, 0)
          const thisMonthRevenue = thisMonthEntries.reduce((sum: number, entry: any) =>
            sum + (entry.hours * (entry.effective_hourly_rate || entry.hourly_rate || 0)), 0)

          const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
          const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear
          const lastMonthEntries = timeEntries.filter((entry: any) => {
            const entryDate = new Date(entry.entry_date)
            return entryDate.getMonth() === lastMonth && entryDate.getFullYear() === lastMonthYear
          })

          const lastMonthRevenue = lastMonthEntries.reduce((sum: number, entry: any) =>
            sum + (entry.hours * (entry.effective_hourly_rate || entry.hourly_rate || 0)), 0)

          // Calculate project counts
          const activeProjects = projects.filter((p: any) => p.active === true).length
          const inactiveProjects = projects.filter((p: any) => p.active === false).length

          // Calculate overdue amounts
          const currentDate = new Date()
          const overdueInvoices = invoices.filter((invoice: any) => {
            const dueDate = new Date(invoice.due_date)
            const isPastDue = dueDate < currentDate
            const isUnpaid = !invoice.paid_at || (invoice.paid_amount < invoice.total_amount)
            const isNotCancelled = invoice.status !== 'cancelled'
            const isNotDraft = invoice.status !== 'draft'
            return isPastDue && isUnpaid && isNotCancelled && isNotDraft
          })

          const overdueAmount = overdueInvoices.reduce((sum: number, invoice: any) => {
            return sum + (invoice.total_amount - (invoice.paid_amount || 0))
          }, 0)

          // Payment behavior calculation
          const paidInvoices = invoices.filter((inv: any) => inv.paid_at)
            .sort((a: any, b: any) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
          const lastPaymentDate = paidInvoices.length > 0 ? paidInvoices[0].paid_at.split('T')[0] : new Date().toISOString().split('T')[0]

          const averagePaymentDays = paidInvoices.length > 0
            ? Math.round(paidInvoices.reduce((sum: number, inv: any) => {
                const dueDate = new Date(inv.due_date)
                const paidDate = new Date(inv.paid_at)
                const daysDiff = Math.floor((paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
                return sum + Math.max(0, daysDiff)
              }, 0) / paidInvoices.length)
            : (client.default_payment_terms || 30)

          return {
            id: client.id,
            name: client.name,
            revenue: {
              thisMonth: thisMonthRevenue,
              lastMonth: lastMonthRevenue,
              total: timeEntries.reduce((sum: number, entry: any) => sum + (entry.hours * (entry.effective_hourly_rate || entry.hourly_rate || 0)), 0)
            },
            payment: {
              averageDays: averagePaymentDays,
              overdueAmount: Math.round(overdueAmount * 100) / 100,
              overdueCount: overdueInvoices.length,
              lastPayment: lastPaymentDate
            },
            projects: {
              active: activeProjects,
              completed: inactiveProjects,
              onHold: 0
            },
            engagement: {
              lastActivity: thisMonthEntries.length > 0 ? thisMonthEntries[thisMonthEntries.length - 1].entry_date : new Date().toISOString().split('T')[0],
              hoursThisMonth: thisMonthHours,
              communicationScore: thisMonthHours > 10 ? 8 : thisMonthHours > 5 ? 6 : 4
            }
          }
        })
      )

      // Calculate health scores
      const scores = clientHealthData.map(calculateClientHealth)
      setClientHealthScores(scores)

      // Generate actionable insights
      const insights = generateActionableInsights(scores)
      setActionableInsights(insights)

    } catch (error) {
      console.error('Failed to fetch client health data:', error)
    } finally {
      setHealthLoading(false)
    }
  }

  const generateActionableInsights = (scores: ClientHealthScore[]): ActionableInsight[] => {
    const insights: ActionableInsight[] = []

    scores.forEach(score => {
      // High priority: Overdue payments
      if (score.client.payment.overdueAmount > 0) {
        insights.push({
          id: `overdue-${score.client.id}`,
          type: 'urgent',
          priority: score.client.payment.overdueAmount > 1000 ? 'high' : 'medium',
          clientId: score.client.id,
          clientName: score.client.name,
          title: 'Overdue Payment',
          description: `${score.client.payment.overdueCount} invoice(s) overdue`,
          value: score.client.payment.overdueAmount,
          daysOverdue: score.client.payment.averageDays
        })
      }

      // Opportunities: Growing revenue
      if (score.trends.revenue === 'up') {
        insights.push({
          id: `growth-${score.client.id}`,
          type: 'opportunity',
          priority: 'medium',
          clientId: score.client.id,
          clientName: score.client.name,
          title: 'Upselling Opportunity',
          description: 'Revenue growing - consider expanding services',
          value: score.client.revenue.thisMonth
        })
      }

      // Warnings: Inactive clients
      if (score.client.projects.active === 0) {
        insights.push({
          id: `inactive-${score.client.id}`,
          type: 'warning',
          priority: 'medium',
          clientId: score.client.id,
          clientName: score.client.name,
          title: 'No Active Projects',
          description: 'Client has no active projects - risk of churn'
        })
      }
    })

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  useEffect(() => {
    fetchClientStats()
    fetchClientHealthData()
  }, [])

  const handleClientCreated = (client: any) => {
    setShowCreateForm(false)
    fetchClientStats()
    fetchClientHealthData()
  }

  const handleClientUpdated = (client: any) => {
    setEditingClient(null)
    fetchClientStats()
    fetchClientHealthData()
  }

  const handleEditClient = (client: any) => {
    setEditingClient(client)
  }

  // Filtered and sorted clients
  const filteredAndSortedClients = useMemo(() => {
    let filtered = clientHealthScores

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(score =>
        score.client.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(score => score.status === statusFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.score - a.score
        case 'revenue':
          return b.client.revenue.thisMonth - a.client.revenue.thisMonth
        case 'risk':
          return a.score - b.score
        case 'name':
          return a.client.name.localeCompare(b.client.name)
        default:
          return 0
      }
    })

    return filtered
  }, [clientHealthScores, searchQuery, statusFilter, sortBy])

  // Health overview data
  const healthOverviewData = useMemo(() => {
    const statusCounts = clientHealthScores.reduce((acc, score) => {
      acc[score.status] = (acc[score.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const totalOverdue = clientHealthScores.reduce((sum, score) =>
      sum + score.client.payment.overdueAmount, 0)

    const growingClients = clientHealthScores.filter(score =>
      score.trends.revenue === 'up').length

    return {
      excellent: statusCounts.excellent || 0,
      good: statusCounts.good || 0,
      warning: statusCounts.warning || 0,
      atRisk: statusCounts.at_risk || 0,
      totalOverdue: Math.round(totalOverdue * 100) / 100,
      growingClients,
      totalClients: clientHealthScores.length
    }
  }, [clientHealthScores])

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Client Health Management</h3>
          <p className="text-muted-foreground text-sm">
            Monitor client relationships and identify opportunities
          </p>
        </div>

        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe Klant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nieuwe Klant Toevoegen</DialogTitle>
            </DialogHeader>
            <ClientForm
              onSuccess={handleClientCreated}
              onCancel={() => setShowCreateForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Health Overview */}
      <ClientHealthOverview
        healthData={healthOverviewData}
        loading={healthLoading}
      />

      {/* Actionable Insights */}
      <ActionableInsights
        insights={actionableInsights}
        loading={healthLoading}
        onContactClient={(clientId) => {
          const client = clientHealthScores.find(s => s.client.id === clientId)
          if (client?.client.name) {
            window.open(`mailto:?subject=Follow-up regarding ${client.client.name}`)
          }
        }}
        onViewClient={(clientId) => {
          const client = clientHealthScores.find(s => s.client.id === clientId)?.client
          if (client) {
            setEditingClient(client)
          }
        }}
      />

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="at_risk">At Risk</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">Health Score</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="risk">Risk Level</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy Clients</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <div className="h-7 bg-muted animate-pulse rounded w-12"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {healthOverviewData.excellent + healthOverviewData.good}
                </div>
                <p className="text-xs text-muted-foreground">
                  Score 70+
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <div className="h-7 bg-muted animate-pulse rounded w-12"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">
                  {healthOverviewData.atRisk + healthOverviewData.warning}
                </div>
                <p className="text-xs text-muted-foreground">
                  Need attention
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <Euro className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <div className="h-7 bg-muted animate-pulse rounded w-16"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-primary">
                  €{clientHealthScores.reduce((sum, score) => sum + score.client.revenue.thisMonth, 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  This month
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growing</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <div className="h-7 bg-muted animate-pulse rounded w-12"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {healthOverviewData.growingClients}
                </div>
                <p className="text-xs text-muted-foreground">
                  Revenue up
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Client List with Health Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">
            Clients ({filteredAndSortedClients.length})
          </h4>
          {statusFilter !== 'all' && (
            <Badge variant="outline">
              Filtered by: {statusFilter}
            </Badge>
          )}
        </div>

        {healthLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded mb-4"></div>
                  <div className="h-16 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAndSortedClients.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No clients found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Add your first client to get started'
                }
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Client
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2' : 'space-y-4'}>
            {filteredAndSortedClients.map((clientScore) => (
              <ClientHealthCard
                key={clientScore.client.id}
                client={{
                  id: clientScore.client.id,
                  name: clientScore.client.name,
                  is_business: true, // Assume business for now
                  active: true
                }}
                healthScore={clientScore}
                onEdit={() => setEditingClient(clientScore.client)}
                compact={viewMode === 'list'}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Client Dialog */}
      <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Klant Bewerken</DialogTitle>
          </DialogHeader>
          {editingClient && (
            <ClientForm
              client={editingClient}
              onSuccess={handleClientUpdated}
              onCancel={() => setEditingClient(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}