'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Clock, 
  Users, 
  Euro, 
  TrendingUp, 
  Calendar,
  Target,
  AlertCircle,
  CheckCircle2,
  Activity,
  DollarSign,
  Timer
} from 'lucide-react'
import Link from 'next/link'

// Freelancer-specific metrics interface
interface FreelancerMetrics {
  // Time & Productivity
  todayHours: number
  weekHours: number
  monthHours: number
  billableHours: number
  utilization: number
  
  // Financial
  monthlyRevenue: number
  pendingInvoices: number
  overdueInvoices: number
  unpaidAmount: number
  
  // Clients & Projects
  activeClients: number
  activeProjects: number
  completedTasks: number
  upcomingDeadlines: number
  
  // Health Indicators
  burnoutRisk: 'low' | 'medium' | 'high'
  workLifeBalance: number
  avgResponseTime: number
}

// Mock data - in real implementation this would come from your API
const mockMetrics: FreelancerMetrics = {
  todayHours: 6.5,
  weekHours: 32,
  monthHours: 128,
  billableHours: 120,
  utilization: 85,
  monthlyRevenue: 8500,
  pendingInvoices: 3,
  overdueInvoices: 1,
  unpaidAmount: 2400,
  activeClients: 7,
  activeProjects: 12,
  completedTasks: 45,
  upcomingDeadlines: 4,
  burnoutRisk: 'medium',
  workLifeBalance: 72,
  avgResponseTime: 4.2
}

export function FreelancerMetricsBar({ metrics = mockMetrics }: { metrics?: FreelancerMetrics }) {
  const formatCurrency = (amount: number) => `€${amount.toLocaleString()}`
  const formatHours = (hours: number) => `${hours}h`
  
  const getBurnoutColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 85) return 'text-green-600'
    if (utilization >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Status Banner with glassmorphism */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-accent/5 to-success/10 border border-primary/20 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-green-500/10 animate-pulse"></div>
        <div className="relative p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-primary/20 rounded-lg">
                  <Timer className="h-4 w-4 text-primary chart-glow-blue" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Today</p>
                  <p className="font-bold metric-number text-primary">{formatHours(metrics.todayHours)}</p>
                </div>
              </div>
              <div className="h-8 w-px bg-border/50" />
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-success/20 rounded-lg">
                  <DollarSign className="h-4 w-4 text-green-400 chart-glow-green" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Month</p>
                  <p className="font-bold metric-number text-green-400">{formatCurrency(metrics.monthlyRevenue)}</p>
                </div>
              </div>
              <div className="h-8 w-px bg-border/50" />
              <div className={`status-indicator ${metrics.burnoutRisk === 'low' ? 'status-active' : metrics.burnoutRisk === 'medium' ? 'status-warning' : 'status-inactive'}`}>
                <Activity className="h-3 w-3" />
                <span className="capitalize">{metrics.burnoutRisk} Risk</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button className="btn-primary-glow" size="sm" asChild>
                <Link href="/dashboard/financieel/tijd">
                  <Clock className="h-3 w-3 mr-2" />
                  Track Time
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Main Metrics Grid with micro-interactions */}
      <div className="dashboard-grid-dense">
        {/* Time Tracking Metrics with enhanced visuals */}
        <div className="kpi-card dashboard-card-glass p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Week Hours</p>
              <p className="text-xl font-bold metric-number">{formatHours(metrics.weekHours)}</p>
            </div>
            <div className="p-2 bg-primary/20 rounded-lg">
              <Clock className="h-5 w-5 text-primary chart-glow-blue" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="progress-bar">
              <div 
                className="progress-fill progress-fill-primary"
                style={{ width: `${Math.min((metrics.weekHours / 40) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{Math.round((metrics.weekHours / 40) * 100)}% of 40h target</p>
          </div>
        </div>

        <div className="kpi-card dashboard-card-glass p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Utilization</p>
              <p className={`text-xl font-bold metric-number ${getUtilizationColor(metrics.utilization)}`}>
                {metrics.utilization}%
              </p>
            </div>
            <div className="p-2 bg-accent/20 rounded-lg">
              <Target className="h-5 w-5 text-accent chart-glow-orange" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="progress-bar">
              <div 
                className={`progress-fill ${
                  metrics.utilization >= 85 ? 'progress-fill-success' : 
                  metrics.utilization >= 70 ? 'progress-fill-warning' : 'bg-red-500'
                }`}
                style={{ width: `${metrics.utilization}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Target: 85%</p>
          </div>
        </div>

        {/* Financial Metrics with enhanced visualization */}
        <div className="kpi-card dashboard-card-glass p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Pending Payment</p>
              <p className="text-xl font-bold metric-number text-orange-400">{formatCurrency(metrics.unpaidAmount)}</p>
            </div>
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Euro className="h-5 w-5 text-orange-400 chart-glow-orange" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Badge variant={metrics.overdueInvoices > 0 ? "destructive" : "secondary"} className="text-xs">
              {metrics.pendingInvoices} pending
            </Badge>
            {metrics.overdueInvoices > 0 && (
              <div className="notification-badge text-xs">
                {metrics.overdueInvoices}
              </div>
            )}
          </div>
        </div>

        <div className="mobile-kpi-card mobile-card-glass space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <p className="mobile-metric-title">Monthly Revenue</p>
              <p className="mobile-metric-number text-green-400">{formatCurrency(metrics.monthlyRevenue)}</p>
            </div>
            <div className="p-1.5 sm:p-2 bg-success/20 rounded-lg flex-shrink-0">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 chart-glow-green" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-green-400 font-medium">↗ +12%</div>
            <div className="text-xs text-muted-foreground">vs last month</div>
          </div>
        </div>

        {/* Mobile-optimized Client & Project Metrics with enhanced styling */}
        <div className="mobile-kpi-card mobile-card-glass space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <p className="mobile-metric-title">Active Clients</p>
              <p className="mobile-metric-number text-purple-400">{metrics.activeClients}</p>
            </div>
            <div className="p-1.5 sm:p-2 bg-purple-500/20 rounded-lg flex-shrink-0">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{metrics.activeProjects} active projects</p>
          </div>
        </div>

        <div className="mobile-kpi-card mobile-card-glass space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <p className="mobile-metric-title">Tasks Completed</p>
              <p className="mobile-metric-number text-green-400">{metrics.completedTasks}</p>
            </div>
            <div className="p-1.5 sm:p-2 bg-success/20 rounded-lg flex-shrink-0">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 chart-glow-green" />
            </div>
          </div>
          <div>
            <p className="text-xs text-green-400 font-medium">This month</p>
          </div>
        </div>

        <div className="mobile-kpi-card mobile-card-glass space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <p className="mobile-metric-title">Upcoming Deadlines</p>
              <p className="mobile-metric-number text-orange-400">{metrics.upcomingDeadlines}</p>
            </div>
            <div className="p-1.5 sm:p-2 bg-orange-500/20 rounded-lg relative flex-shrink-0">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400 chart-glow-orange" />
              {metrics.upcomingDeadlines > 3 && (
                <div className="notification-badge">!</div>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </div>
        </div>

        <div className="mobile-kpi-card mobile-card-glass space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <p className="mobile-metric-title">Work-Life Balance</p>
              <p className={`mobile-metric-number ${metrics.workLifeBalance >= 75 ? 'text-green-400' : 'text-yellow-400'}`}>
                {metrics.workLifeBalance}%
              </p>
            </div>
            <div className="p-1.5 sm:p-2 bg-primary/20 rounded-lg flex-shrink-0">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="mobile-progress-bar">
              <div 
                className={`progress-fill ${
                  metrics.workLifeBalance >= 75 ? 'progress-fill-success' : 'progress-fill-warning'
                }`}
                style={{ width: `${metrics.workLifeBalance}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Target: 75%+</p>
          </div>
        </div>
      </div>

      {/* Mobile-optimized Enhanced Critical Alerts with glassmorphism */}
      {(metrics.overdueInvoices > 0 || metrics.burnoutRisk === 'high' || metrics.upcomingDeadlines > 3) && (
        <div className="mobile-card-glass border-red-500/30 bg-gradient-to-r from-red-500/10 to-orange-500/10">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-red-500/20 rounded-lg flex-shrink-0">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
            </div>
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-red-400 truncate">Action Required</p>
                <div className="notification-badge bg-red-500 flex-shrink-0">
                  {(metrics.overdueInvoices > 0 ? 1 : 0) + 
                   (metrics.burnoutRisk === 'high' ? 1 : 0) + 
                   (metrics.upcomingDeadlines > 3 ? 1 : 0)}
                </div>
              </div>
              <div className="space-y-2">
                {metrics.overdueInvoices > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                    <div className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0"></div>
                    <p className="text-xs sm:text-sm text-red-300">
                      {metrics.overdueInvoices} overdue invoice{metrics.overdueInvoices > 1 ? 's' : ''} need follow-up
                    </p>
                  </div>
                )}
                {metrics.burnoutRisk === 'high' && (
                  <div className="flex items-center gap-2 p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse flex-shrink-0"></div>
                    <p className="text-xs sm:text-sm text-orange-300">
                      High burnout risk detected - consider taking a break
                    </p>
                  </div>
                )}
                {metrics.upcomingDeadlines > 3 && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full flex-shrink-0"></div>
                    <p className="text-xs sm:text-sm text-yellow-300">
                      {metrics.upcomingDeadlines} deadlines approaching - prioritize workload
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}