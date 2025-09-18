'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  DollarSign,
  Mail,
  Phone,
  ExternalLink,
  Lightbulb
} from 'lucide-react'

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

interface ActionableInsightsProps {
  insights: ActionableInsight[]
  loading?: boolean
  onContactClient?: (clientId: string) => void
  onViewClient?: (clientId: string) => void
}

export function ActionableInsights({
  insights,
  loading,
  onContactClient,
  onViewClient
}: ActionableInsightsProps) {
  const getInsightIcon = (type: ActionableInsight['type']) => {
    switch (type) {
      case 'urgent': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'opportunity': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'warning': return <Clock className="h-4 w-4 text-orange-500" />
      case 'info': return <Lightbulb className="h-4 w-4 text-blue-500" />
    }
  }

  const getInsightColor = (type: ActionableInsight['type']) => {
    switch (type) {
      case 'urgent': return 'bg-red-50 border-red-200'
      case 'opportunity': return 'bg-green-50 border-green-200'
      case 'warning': return 'bg-orange-50 border-orange-200'
      case 'info': return 'bg-blue-50 border-blue-200'
    }
  }

  const getPriorityBadge = (priority: ActionableInsight['priority']) => {
    switch (priority) {
      case 'high': return <Badge className="bg-red-100 text-red-700 border-red-200">High</Badge>
      case 'medium': return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Medium</Badge>
      case 'low': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Low</Badge>
    }
  }

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Actionable Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (insights.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Actionable Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Great job! No urgent actions required at the moment.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Sort by priority and type
  const sortedInsights = [...insights].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    const typeOrder = { urgent: 4, warning: 3, opportunity: 2, info: 1 }

    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    }
    return typeOrder[b.type] - typeOrder[a.type]
  })

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          Actionable Insights
          {insights.length > 0 && (
            <Badge className="ml-2 bg-primary/10 text-primary border-primary/20">
              {insights.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedInsights.slice(0, 5).map((insight) => (
            <div
              key={insight.id}
              className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getInsightIcon(insight.type)}
                  <span className="font-medium text-sm">{insight.clientName}</span>
                  {getPriorityBadge(insight.priority)}
                </div>
                {insight.value && (
                  <span className="text-sm font-bold">
                    €{insight.value.toLocaleString()}
                  </span>
                )}
              </div>

              <h4 className="font-medium text-sm mb-1">{insight.title}</h4>
              <p className="text-xs text-muted-foreground mb-3">{insight.description}</p>

              {insight.daysOverdue && (
                <p className="text-xs text-red-600 mb-3">
                  {insight.daysOverdue} days overdue
                </p>
              )}

              <div className="flex gap-2">
                {insight.type === 'urgent' && (
                  <Button
                    size="sm"
                    onClick={() => onContactClient?.(insight.clientId)}
                    className="h-7 text-xs"
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    Contact
                  </Button>
                )}

                {insight.type === 'opportunity' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewClient?.(insight.clientId)}
                    className="h-7 text-xs"
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onViewClient?.(insight.clientId)}
                  className="h-7 text-xs"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View
                </Button>
              </div>
            </div>
          ))}

          {insights.length > 5 && (
            <div className="text-center pt-2">
              <Button variant="ghost" size="sm" className="text-xs">
                View {insights.length - 5} more insights
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}