'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { getCurrentDate } from '../../../lib/current-date'
import {  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  ArrowUpDown,
  ChevronRight,
  Building2,
  HelpCircle,
  Activity,
  CreditCard,
  Target
} from 'lucide-react'

// Client health scoring interfaces
interface ClientHealthData {
  id: string
  name: string
  paymentTerms?: number // Client's default payment terms in days
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

// Help Modal Component for Client Health
function ClientHealthHelpModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Client Health Dashboard Explained</DialogTitle>
          <DialogDescription>
            Understanding how we measure and track your client relationships
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {/* Health Score System */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Health Score System</h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="font-medium text-purple-700">How Scores Work</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Client health scores range from 0-100, calculated using multiple factors:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 ml-4 list-disc space-y-1">
                  <li>Payment behavior and timing</li>
                  <li>Revenue consistency and growth</li>
                  <li>Project engagement levels</li>
                  <li>Activity recency and hours worked</li>
                </ul>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-medium text-blue-700">Score Categories</h4>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span><strong>Excellent (80-100):</strong> Top-tier clients</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span><strong>Good (60-79):</strong> Solid relationships</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span><strong>Warning (40-59):</strong> Needs attention</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span><strong>At Risk (0-39):</strong> Immediate action required</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Key Metrics Tracked</h3>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <h4 className="font-medium text-green-700 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Revenue Metrics
                </h4>
                <ul className="text-sm text-green-600 mt-2 space-y-1">
                  <li>• Monthly revenue trends</li>
                  <li>• Total lifetime value</li>
                  <li>• Growth patterns</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-medium text-blue-700 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Behavior
                </h4>
                <ul className="text-sm text-blue-600 mt-2 space-y-1">
                  <li>• Average payment days</li>
                  <li>• Overdue amounts</li>
                  <li>• Payment reliability</li>
                </ul>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 md:col-span-2 lg:col-span-1">
                <h4 className="font-medium text-purple-700 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Engagement Level
                </h4>
                <ul className="text-sm text-purple-600 mt-2 space-y-1">
                  <li>• Recent activity</li>
                  <li>• Billable hours</li>
                  <li>• Project involvement</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sorting Options */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Sorting & Views</h3>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center">
                  <Target className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <h4 className="font-medium text-blue-700">Score</h4>
                  <p className="text-sm text-muted-foreground">Sort by overall health score</p>
                </div>
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <h4 className="font-medium text-green-700">Revenue</h4>
                  <p className="text-sm text-muted-foreground">Sort by monthly revenue</p>
                </div>
                <div className="text-center">
                  <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <h4 className="font-medium text-red-700">Risk</h4>
                  <p className="text-sm text-muted-foreground">Show highest risk clients first</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Guidelines */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Taking Action</h3>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-700">Excellent Clients</h4>
                  <p className="text-sm text-green-600">Maintain relationships, consider upselling opportunities, request referrals</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-700">Warning Clients</h4>
                  <p className="text-sm text-orange-600">Increase communication, address any concerns, monitor payment behavior</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg md:col-span-2 lg:col-span-1">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-700">At-Risk Clients</h4>
                  <p className="text-sm text-red-600">Immediate follow-up required, review contracts, consider payment terms adjustment</p>
                </div>
              </div>
            </div>
          </div>

          {/* Data Sources */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Data Sources</h3>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground mb-2">
                Health scores are calculated from real business data:
              </p>
              <ul className="text-sm text-muted-foreground ml-4 list-disc space-y-1">
                <li><strong>Invoice Data:</strong> Payment timing, amounts, and overdue status</li>
                <li><strong>Project Activity:</strong> Active projects, completion rates, and engagement</li>
                <li><strong>Time Tracking:</strong> Billable hours, activity recency, and project involvement</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
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

  // Payment behavior (25 points max) - Relative to client's payment terms
  let paymentTrend: 'improving' | 'declining' | 'stable' = 'stable'

  // Get client's payment terms (default to 30 days if not specified)
  const clientPaymentTerms = client.paymentTerms || 30

  // Calculate payment performance relative to their terms
  const paymentPerformance = client.payment.averageDays / clientPaymentTerms

  if (paymentPerformance <= 1.0) {
    // At par or better (e.g., 28 days on 30-day terms)
    paymentTrend = 'improving'
    // No penalty - EXCELLENT
  } else if (paymentPerformance <= 1.1) {
    // Within 10% of terms (e.g., 33 days on 30-day terms)
    paymentTrend = 'stable'
    score -= 5
    // Small penalty - GOOD
  } else {
    // More than 10% over terms (e.g., 40+ days on 30-day terms)
    paymentTrend = 'declining'
    score -= 15
    const percentageOver = Math.round((paymentPerformance - 1) * 100)
    riskFactors.push(`Slow payments (${percentageOver}% over terms)`)
    // Full penalty - POOR
  }

  if (client.payment.overdueAmount > 0) {
    score -= Math.min(client.payment.overdueCount * 5, 20)
    riskFactors.push(`€${client.payment.overdueAmount.toLocaleString()} overdue`)
    paymentTrend = 'declining'
  }

  // Project activity (25 points max) - Updated for status system (Enhancement #2)
  if (client.projects.active === 0) {
    score -= 25
    riskFactors.push('No active projects')
  } else if (client.projects.active > 2) {
    opportunities.push('Multiple active projects - stable relationship')
  }

  // Penalty for on-hold projects
  if (client.projects.onHold > 0) {
    score -= client.projects.onHold * 5
    riskFactors.push(`${client.projects.onHold} projects on hold`)
  }

  // Engagement analysis (20 points max)
  const daysSinceActivity = Math.floor(
    (getCurrentDate().getTime() - new Date(client.engagement.lastActivity).getTime()) / (1000 * 60 * 60 * 24)
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
    paymentTerms: 30,
    revenue: { thisMonth: 8500, lastMonth: 7200, total: 45000 },
    payment: { averageDays: 28, overdueAmount: 0, overdueCount: 0, lastPayment: '2024-01-10' },
    projects: { active: 2, completed: 8, onHold: 0 },
    engagement: { lastActivity: '2024-01-15', hoursThisMonth: 45 }
  },
  {
    id: '2',
    name: 'Beta Tech Solutions',
    paymentTerms: 30,
    revenue: { thisMonth: 2100, lastMonth: 6800, total: 28000 },
    payment: { averageDays: 52, overdueAmount: 3200, overdueCount: 1, lastPayment: '2023-12-15' },
    projects: { active: 1, completed: 4, onHold: 1 },
    engagement: { lastActivity: '2024-01-05', hoursThisMonth: 12 }
  },
  {
    id: '3',
    name: 'Gamma Industries',
    paymentTerms: 30,
    revenue: { thisMonth: 5200, lastMonth: 4800, total: 31000 },
    payment: { averageDays: 21, overdueAmount: 0, overdueCount: 0, lastPayment: '2024-01-12' },
    projects: { active: 3, completed: 6, onHold: 0 },
    engagement: { lastActivity: '2024-01-14', hoursThisMonth: 38 }
  },
  {
    id: '4',
    name: 'Delta Consulting',
    paymentTerms: 30,
    revenue: { thisMonth: 1200, lastMonth: 1800, total: 15000 },
    payment: { averageDays: 35, overdueAmount: 0, overdueCount: 0, lastPayment: '2024-01-08' },
    projects: { active: 0, completed: 3, onHold: 0 },
    engagement: { lastActivity: '2023-12-20', hoursThisMonth: 8 }
  },
  {
    id: '5',
    name: 'Echo Innovations',
    paymentTerms: 30,
    revenue: { thisMonth: 4800, lastMonth: 4200, total: 22000 },
    payment: { averageDays: 18, overdueAmount: 0, overdueCount: 0, lastPayment: '2024-01-13' },
    projects: { active: 2, completed: 5, onHold: 0 },
    engagement: { lastActivity: '2024-01-14', hoursThisMonth: 32 }
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

        // Fetch real client data - only active and on_hold clients (Enhancement #2)
        const response = await fetch('/api/clients?status=active,on_hold')
        if (!response.ok) {
          throw new Error('Failed to fetch clients')
        }

        const clientsResult = await response.json()
        const clients = clientsResult.data || []

        // Transform real client data to health format
        const clientHealthData: ClientHealthData[] = await Promise.all(
          clients.map(async (client: any) => {
            // Fetch time entries for this client to calculate engagement
            // FIXED: Use client_id (snake_case) instead of clientId (camelCase)
            const timeResponse = await fetch(`/api/time-entries?client_id=${client.id}`)
            const timeResult = timeResponse.ok ? await timeResponse.json() : { data: [] }
            const timeEntries = timeResult.data || []

            // Fetch projects for this client
            const projectsResponse = await fetch(`/api/projects?client_id=${client.id}`)
            const projectsResult = projectsResponse.ok ? await projectsResponse.json() : { data: [] }
            const projects = projectsResult.data || []

            // Fetch invoices for this client to calculate overdue amounts
            const invoicesResponse = await fetch(`/api/invoices?client_id=${client.id}`)
            const invoicesResult = invoicesResponse.ok ? await invoicesResponse.json() : { data: [] }
            const invoices = invoicesResult.data || []

            // Calculate this month's hours and revenue
            const thisMonth = getCurrentDate().getMonth()
            const thisYear = getCurrentDate().getFullYear()
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

            // Calculate project counts by status (Enhancement #2)
            const activeProjects = projects.filter((p: any) => p.status === 'active').length
            const onHoldProjects = projects.filter((p: any) => p.status === 'on_hold').length
            const completedProjects = projects.filter((p: any) => p.status === 'completed').length
            const prospectProjects = projects.filter((p: any) => p.status === 'prospect').length

            // Calculate overdue amounts from invoices (exclude cancelled invoices)
            const currentDate = getCurrentDate()
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

            // Get last payment date from invoices
            const paidInvoices = invoices.filter((inv: any) => inv.paid_at).sort((a: any, b: any) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
            const lastPaymentDate = paidInvoices.length > 0 ? paidInvoices[0].paid_at.split('T')[0] : getCurrentDate().toISOString().split('T')[0]

            // Calculate average payment days from paid invoices
            const averagePaymentDays = paidInvoices.length > 0
              ? Math.round(paidInvoices.reduce((sum: number, inv: any) => {
                  const dueDate = new Date(inv.due_date)
                  const paidDate = new Date(inv.paid_at)
                  const daysDiff = Math.floor((paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
                  return sum + Math.max(0, daysDiff) // Don't count early payments as negative days
                }, 0) / paidInvoices.length)
              : (client.default_payment_terms || 30)

            return {
              id: client.id,
              name: client.name,
              paymentTerms: client.default_payment_terms || 30, // Client's payment terms from database
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
                completed: completedProjects,
                onHold: onHoldProjects // Now properly tracked (Enhancement #2)
              },
              engagement: {
                lastActivity: thisMonthEntries.length > 0 ? thisMonthEntries[thisMonthEntries.length - 1].entry_date : getCurrentDate().toISOString().split('T')[0],
                hoursThisMonth: thisMonthHours
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
      <div className={`glass-card ${className}`}>
        <div className="space-y-4">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg animate-pulse" style={{
                background: 'rgba(148, 163, 184, 0.2)'
              }}></div>
              <div>
                <div className="h-5 w-32 rounded animate-pulse" style={{
                  background: 'rgba(148, 163, 184, 0.2)'
                }}></div>
              </div>
            </div>
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-3 rounded-lg animate-pulse" style={{
              background: 'rgba(15, 23, 42, 0.45)',
              border: '1px solid rgba(148, 163, 184, 0.16)'
            }}>
              <div className="flex justify-between items-start mb-2">
                <div className="h-4 w-24 rounded" style={{ background: 'rgba(148, 163, 184, 0.2)' }}></div>
                <div className="h-5 w-12 rounded" style={{ background: 'rgba(148, 163, 184, 0.2)' }}></div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full rounded" style={{ background: 'rgba(148, 163, 184, 0.15)' }}></div>
                <div className="h-3 w-3/4 rounded" style={{ background: 'rgba(148, 163, 184, 0.15)' }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Calculate overview stats
  const atRiskClients = clientHealthScores.filter(c => c.status === 'at_risk').length
  const totalRevenue = clientHealthScores.reduce((sum, c) => sum + c.client.revenue.thisMonth, 0)
  const topClient = clientHealthScores.length > 0 ? clientHealthScores[0] : null

  return (
    <div className={`glass-card ${className}`}>
      <div className="space-y-4">
        {/* Header - Glassmorphic */}
        <div className="card-header">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg" style={{
              background: 'linear-gradient(120deg, rgba(139, 92, 246, 0.22), rgba(124, 58, 237, 0.18))',
              border: '1px solid rgba(139, 92, 246, 0.35)'
            }}>
              <Users className="h-5 w-5" style={{ color: 'rgba(139, 92, 246, 0.9)' }} />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="card-header__title">Client Health</h3>
              {atRiskClients > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: 'rgba(239, 68, 68, 0.95)'
                }}>
                  {atRiskClients} at risk
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ClientHealthHelpModal />
            <button
              onClick={() => setSortBy(sortBy === 'score' ? 'risk' : sortBy === 'risk' ? 'revenue' : 'score')}
              className="action-chip secondary"
              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
            >
              <ArrowUpDown className="h-3 w-3" />
              {sortBy === 'score' ? 'Score' : sortBy === 'risk' ? 'Risk' : 'Revenue'}
            </button>
            <button
              onClick={onViewAllClients}
              className="action-chip"
              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
            >
              View All
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Quick Stats - Glassmorphic */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2 rounded-lg" style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            backdropFilter: 'blur(8px)'
          }}>
            <p className="text-sm font-bold" style={{ color: 'rgba(59, 130, 246, 0.95)' }}>
              {clientHealthScores.length}
            </p>
            <p className="text-xs" style={{ color: 'rgba(59, 130, 246, 0.85)' }}>Active</p>
          </div>
          <div className="p-2 rounded-lg" style={{
            background: 'rgba(52, 211, 153, 0.15)',
            border: '1px solid rgba(52, 211, 153, 0.25)',
            backdropFilter: 'blur(8px)'
          }}>
            <p className="text-sm font-bold" style={{ color: 'rgba(52, 211, 153, 0.95)' }}>
              {formatCurrency(totalRevenue)}
            </p>
            <p className="text-xs" style={{ color: 'rgba(52, 211, 153, 0.85)' }}>Revenue</p>
          </div>
          <div className="p-2 rounded-lg" style={{
            background: atRiskClients > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(148, 163, 184, 0.15)',
            border: atRiskClients > 0 ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(148, 163, 184, 0.25)',
            backdropFilter: 'blur(8px)'
          }}>
            <p className="text-sm font-bold" style={{
              color: atRiskClients > 0 ? 'rgba(239, 68, 68, 0.95)' : 'var(--color-text-muted)'
            }}>
              {atRiskClients}
            </p>
            <p className="text-xs" style={{
              color: atRiskClients > 0 ? 'rgba(239, 68, 68, 0.85)' : 'var(--color-text-muted)'
            }}>At Risk</p>
          </div>
        </div>

        {/* Top Clients - Glassmorphic */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
            <Building2 className="h-4 w-4" />
            Top Clients by {sortBy === 'score' ? 'Health Score' : sortBy === 'risk' ? 'Risk Level' : 'Revenue'}
          </h4>
          <div className="space-y-2">
            {clientHealthScores.slice(0, 4).map((clientScore, index) => (
              <div key={clientScore.client.id} className="p-3 rounded-lg transition-all duration-200" style={{
                background: 'rgba(15, 23, 42, 0.45)',
                border: '1px solid rgba(148, 163, 184, 0.16)',
                cursor: 'pointer'
              }} onMouseEnter={(e) => {
                e.currentTarget.style.border = '1px solid rgba(96, 165, 250, 0.35)'
              }} onMouseLeave={(e) => {
                e.currentTarget.style.border = '1px solid rgba(148, 163, 184, 0.16)'
              }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">{clientScore.client.name}</p>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(clientScore.status)}
                        <span className="text-xs font-medium">{clientScore.score}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
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
                  <span className="text-xs px-2 py-1 rounded-md font-semibold" style={{
                    background: clientScore.status === 'excellent' ? 'rgba(52, 211, 153, 0.15)' :
                               clientScore.status === 'good' ? 'rgba(59, 130, 246, 0.15)' :
                               clientScore.status === 'warning' ? 'rgba(251, 146, 60, 0.15)' :
                               'rgba(239, 68, 68, 0.15)',
                    border: clientScore.status === 'excellent' ? '1px solid rgba(52, 211, 153, 0.25)' :
                           clientScore.status === 'good' ? '1px solid rgba(59, 130, 246, 0.25)' :
                           clientScore.status === 'warning' ? '1px solid rgba(251, 146, 60, 0.25)' :
                           '1px solid rgba(239, 68, 68, 0.25)',
                    color: clientScore.status === 'excellent' ? 'rgba(52, 211, 153, 0.95)' :
                          clientScore.status === 'good' ? 'rgba(59, 130, 246, 0.95)' :
                          clientScore.status === 'warning' ? 'rgba(251, 146, 60, 0.95)' :
                          'rgba(239, 68, 68, 0.95)'
                  }}>
                    {clientScore.status.toUpperCase()}
                  </span>
                </div>

                {/* Risk Factors or Opportunities */}
                {(clientScore.riskFactors.length > 0 || clientScore.opportunities.length > 0) && (
                  <div className="mt-2">
                    {clientScore.riskFactors.length > 0 && (
                      <p className="text-xs" style={{ color: 'rgba(239, 68, 68, 0.95)' }}>
                        ⚠️ {clientScore.riskFactors[0]}
                      </p>
                    )}
                    {clientScore.opportunities.length > 0 && !clientScore.riskFactors.length && (
                      <p className="text-xs" style={{ color: 'rgba(52, 211, 153, 0.95)' }}>
                        💡 {clientScore.opportunities[0]}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions - Glassmorphic */}
        <div className="pt-2" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.12)' }}>
          <div className="flex gap-2">
            <button
              onClick={onViewAllClients}
              className="flex-1 text-sm py-2 px-3 rounded-lg transition-all duration-200"
              style={{
                color: 'rgba(96, 165, 250, 0.95)',
                background: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(96, 165, 250, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              View All Clients
            </button>
            {atRiskClients > 0 && (
              <button
                onClick={() => onViewAllClients?.()}
                className="text-sm py-2 px-3 rounded-lg transition-all duration-200"
                style={{
                  color: 'rgba(239, 68, 68, 0.95)',
                  background: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                Review At-Risk
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}