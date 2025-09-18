'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Building2,
  User,
  MapPin,
  Mail,
  Phone,
  Euro,
  FolderOpen,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle,
  Edit,
  ExternalLink,
  Lightbulb
} from 'lucide-react'

interface ClientHealthScore {
  score: number
  status: 'excellent' | 'good' | 'warning' | 'at_risk'
  riskFactors: string[]
  opportunities: string[]
  trends: {
    revenue: 'up' | 'down' | 'stable'
    engagement: 'up' | 'down' | 'stable'
    payment: 'improving' | 'declining' | 'stable'
  }
  revenue: {
    thisMonth: number
    lastMonth: number
    total: number
  }
  payment: {
    averageDays: number
    overdueAmount: number
    overdueCount: number
  }
  projects: {
    active: number
    completed: number
  }
  engagement: {
    hoursThisMonth: number
  }
}

interface Client {
  id: string
  name: string
  company_name?: string
  is_business: boolean
  email?: string
  phone?: string
  city?: string
  country_code?: string
  hourly_rate?: number
  active?: boolean
}

interface ClientHealthCardProps {
  client: Client
  healthScore?: ClientHealthScore
  onEdit?: (client: Client) => void
  onViewProjects?: (client: Client) => void
  onContact?: (client: Client) => void
  compact?: boolean
}

export function ClientHealthCard({
  client,
  healthScore,
  onEdit,
  onViewProjects,
  onContact,
  compact = false
}: ClientHealthCardProps) {
  const getHealthBadge = (status: ClientHealthScore['status'], score: number) => {
    const configs = {
      excellent: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle },
      good: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: TrendingUp },
      warning: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', icon: AlertTriangle },
      at_risk: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: AlertTriangle }
    }

    const config = configs[status]
    const Icon = config.icon

    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bg} ${config.text} ${config.border}`}>
        <Icon className="h-3 w-3" />
        <span className="text-xs font-medium">{score}</span>
      </div>
    )
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'up' || trend === 'improving') {
      return <TrendingUp className="h-3 w-3 text-green-500" />
    }
    if (trend === 'down' || trend === 'declining') {
      return <TrendingDown className="h-3 w-3 text-red-500" />
    }
    return <div className="h-3 w-3 rounded-full bg-gray-400"></div>
  }

  const formatCurrency = (amount: number) => `€${amount.toLocaleString()}`

  const getClientDisplayName = () => {
    if (client.is_business) {
      return client.company_name || client.name
    }
    return `${client.name} (Particulier)`
  }

  const getLocationText = () => {
    const parts = []
    if (client.city) parts.push(client.city)
    if (client.country_code && client.country_code !== 'NL') {
      parts.push(client.country_code)
    }
    return parts.join(', ') || 'Nederland'
  }

  const calculateRevenueChange = () => {
    if (!healthScore?.revenue?.lastMonth || healthScore.revenue.lastMonth === 0) {
      return { percentage: 0, trend: 'stable' as const }
    }

    const thisMonth = healthScore.revenue.thisMonth || 0
    const change = ((thisMonth - healthScore.revenue.lastMonth) / healthScore.revenue.lastMonth) * 100
    return {
      percentage: Math.abs(Math.round(change)),
      trend: change > 5 ? 'up' as const : change < -5 ? 'down' as const : 'stable' as const
    }
  }

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="p-1.5 bg-primary/10 rounded-lg flex-shrink-0">
                {client.is_business ? (
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <User className="h-3.5 w-3.5 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{getClientDisplayName()}</p>
                <p className="text-xs text-muted-foreground truncate">{getLocationText()}</p>
              </div>
            </div>
            {healthScore && getHealthBadge(healthScore.status, healthScore.score)}
          </div>

          {healthScore && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>€{(healthScore.revenue?.thisMonth || 0).toLocaleString()}</span>
              <span>{healthScore.projects?.active || 0} projects</span>
              <span>{healthScore.payment?.averageDays || 0}d payment</span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
              {client.is_business ? (
                <Building2 className="h-5 w-5 text-primary" />
              ) : (
                <User className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-lg truncate">{getClientDisplayName()}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{getLocationText()}</span>
                </div>
                {client.hourly_rate && (
                  <div className="flex items-center gap-1">
                    <Euro className="h-3 w-3" />
                    <span>€{client.hourly_rate}/uur</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {healthScore && getHealthBadge(healthScore.status, healthScore.score)}
            <Button variant="ghost" size="sm" onClick={() => onEdit?.(client)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Health Metrics */}
        {healthScore && (
          <div className="space-y-4">
            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(healthScore.revenue?.thisMonth || 0)}
                  </span>
                  {getTrendIcon(calculateRevenueChange().trend)}
                </div>
                <p className="text-xs text-muted-foreground">This month</p>
                {calculateRevenueChange().percentage > 0 && (
                  <p className="text-xs text-green-600">
                    {calculateRevenueChange().trend === 'up' ? '+' : ''}{calculateRevenueChange().percentage}%
                  </p>
                )}
              </div>

              <div className="text-center">
                <div className="text-lg font-bold text-blue-600 mb-1">
                  {healthScore.projects?.active || 0}
                </div>
                <p className="text-xs text-muted-foreground">Active projects</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="text-lg font-bold text-orange-600">
                    {healthScore.payment?.averageDays || 0}d
                  </span>
                  {getTrendIcon(healthScore.trends?.payment || 'stable')}
                </div>
                <p className="text-xs text-muted-foreground">Avg payment</p>
              </div>

              <div className="text-center">
                <div className={`text-lg font-bold mb-1 ${
                  (healthScore.payment?.overdueAmount || 0) > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {formatCurrency(healthScore.payment?.overdueAmount || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>

            {/* Insights */}
            {((healthScore.riskFactors?.length || 0) > 0 || (healthScore.opportunities?.length || 0) > 0) && (
              <div className="space-y-2">
                {(healthScore.riskFactors || []).slice(0, 1).map((risk, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <span className="text-sm text-red-700">{risk}</span>
                  </div>
                ))}
                {(healthScore.opportunities || []).slice(0, 1).map((opportunity, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <Lightbulb className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-green-700">{opportunity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contact Info */}
        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          {client.email && (
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              <span>{client.phone}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewProjects?.(client)}
            className="flex-1"
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Projects
          </Button>
          {client.email && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onContact?.(client)}
            >
              <Mail className="h-4 w-4 mr-2" />
              Contact
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit?.(client)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}