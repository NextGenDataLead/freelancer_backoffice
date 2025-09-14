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
    <div className="space-y-4">
      {/* Quick Status Banner */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border border-border">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Timer className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Today: {formatHours(metrics.todayHours)}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Month: {formatCurrency(metrics.monthlyRevenue)}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <Badge variant="outline" className={getBurnoutColor(metrics.burnoutRisk)}>
            <Activity className="h-3 w-3 mr-1" />
            Burnout Risk: {metrics.burnoutRisk}
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/financieel/tijd">
              <Clock className="h-3 w-3 mr-1" />
              Track Time
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Time Tracking Metrics */}
        <Card className="p-3 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Week Hours</p>
              <p className="text-lg font-bold">{formatHours(metrics.weekHours)}</p>
            </div>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <div className="w-full bg-muted rounded-full h-1.5">
              <div 
                className="bg-blue-600 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min((metrics.weekHours / 40) * 100, 100)}%` }}
              />
            </div>
          </div>
        </Card>

        <Card className="p-3 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Utilization</p>
              <p className={`text-lg font-bold ${getUtilizationColor(metrics.utilization)}`}>
                {metrics.utilization}%
              </p>
            </div>
            <Target className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2">
            <div className="w-full bg-muted rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all ${
                  metrics.utilization >= 85 ? 'bg-green-600' : 
                  metrics.utilization >= 70 ? 'bg-yellow-600' : 'bg-red-600'
                }`}
                style={{ width: `${metrics.utilization}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Financial Metrics */}
        <Card className="p-3 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Pending €</p>
              <p className="text-lg font-bold">{formatCurrency(metrics.unpaidAmount)}</p>
            </div>
            <Euro className="h-4 w-4 text-green-600" />
          </div>
          <div className="mt-2 flex items-center">
            <Badge variant={metrics.overdueInvoices > 0 ? "destructive" : "secondary"} className="text-xs">
              {metrics.pendingInvoices} pending
            </Badge>
          </div>
        </Card>

        <Card className="p-3 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(metrics.monthlyRevenue)}</p>
            </div>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">+12% vs last month</p>
          </div>
        </Card>

        {/* Client & Project Metrics */}
        <Card className="p-3 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Clients</p>
              <p className="text-lg font-bold">{metrics.activeClients}</p>
            </div>
            <Users className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">{metrics.activeProjects} active projects</p>
          </div>
        </Card>

        <Card className="p-3 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Tasks Done</p>
              <p className="text-lg font-bold">{metrics.completedTasks}</p>
            </div>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </div>
          <div className="mt-2">
            <p className="text-xs text-green-600">This month</p>
          </div>
        </Card>

        {/* Deadlines & Alerts */}
        <Card className="p-3 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Deadlines</p>
              <p className="text-lg font-bold text-orange-600">{metrics.upcomingDeadlines}</p>
            </div>
            <Calendar className="h-4 w-4 text-orange-600" />
          </div>
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </div>
        </Card>

        {/* Work-Life Balance Score */}
        <Card className="p-3 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className={`text-lg font-bold ${metrics.workLifeBalance >= 75 ? 'text-green-600' : 'text-yellow-600'}`}>
                {metrics.workLifeBalance}%
              </p>
            </div>
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2">
            <div className="w-full bg-muted rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all ${
                  metrics.workLifeBalance >= 75 ? 'bg-green-600' : 'bg-yellow-600'
                }`}
                style={{ width: `${metrics.workLifeBalance}%` }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Critical Alerts */}
      {(metrics.overdueInvoices > 0 || metrics.burnoutRisk === 'high' || metrics.upcomingDeadlines > 3) && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">Action Required</p>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-0.5">
                {metrics.overdueInvoices > 0 && (
                  <li>• {metrics.overdueInvoices} overdue invoice{metrics.overdueInvoices > 1 ? 's' : ''} need follow-up</li>
                )}
                {metrics.burnoutRisk === 'high' && (
                  <li>• High burnout risk detected - consider taking a break</li>
                )}
                {metrics.upcomingDeadlines > 3 && (
                  <li>• {metrics.upcomingDeadlines} deadlines approaching - prioritize workload</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}