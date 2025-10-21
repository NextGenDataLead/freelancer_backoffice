'use client'

import { FileText, X, DollarSign, Activity, Clock, Users, Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { HealthScoreOutputs } from '@/lib/health-score-engine'

interface DashboardMetrics {
  factureerbaar: number
  factureerbaar_count: number
  totale_registratie: number
  achterstallig: number
  achterstallig_count: number
  actual_dso: number
  average_payment_terms: number
  average_dri: number
  rolling30DaysRevenue?: {
    current: number
    previous: number
  }
}

interface HealthReportModalProps {
  healthScoreResults: HealthScoreOutputs | null
  dashboardMetrics: DashboardMetrics | null
  subscriptionEnabled: boolean
  onClose: () => void
  onShowExplanation: (pillar: string) => void
  onNavigateToTab?: (tabId: string) => void
}

export function HealthReportModal({
  healthScoreResults,
  dashboardMetrics,
  subscriptionEnabled,
  onClose,
  onShowExplanation,
  onNavigateToTab
}: HealthReportModalProps) {
  if (!healthScoreResults) return null

  const healthScores = healthScoreResults.scores

  const getHealthBadge = () => {
    if (healthScores.totalRounded >= 85) return { emoji: '👑', label: 'LEGEND', color: 'bg-green-500', gradientClass: 'from-green-500/10 to-green-600/5 border-green-500/20' }
    if (healthScores.totalRounded >= 70) return { emoji: '⭐', label: 'CHAMPION', color: 'bg-blue-500', gradientClass: 'from-blue-500/10 to-blue-600/5 border-blue-500/20' }
    if (healthScores.totalRounded >= 50) return { emoji: '📊', label: 'BUILDER', color: 'bg-orange-500', gradientClass: 'from-orange-500/10 to-orange-600/5 border-orange-500/20' }
    return { emoji: '🎯', label: 'STARTER', color: 'bg-red-500', gradientClass: 'from-red-500/10 to-red-600/5 border-red-500/20' }
  }

  const getMessage = () => {
    if (healthScores.totalRounded >= 85) return '🚀 Exceptional Performance - You\'re crushing it!'
    if (healthScores.totalRounded >= 70) return '💪 Strong Performance - Keep up the great work!'
    if (healthScores.totalRounded >= 50) return '📈 Room for Growth - You\'re on the right track!'
    return '🎯 Action Required - Let\'s turn this around together!'
  }

  const badge = getHealthBadge()

  const topRecommendations = (() => {
    const allRecommendations = [
      ...(healthScoreResults.recommendations.profit || []),
      ...(healthScoreResults.recommendations.cashflow || []),
      ...(healthScoreResults.recommendations.efficiency || []),
      ...(healthScoreResults.recommendations.risk || [])
    ]

    return allRecommendations
      .sort((a, b) => {
        if (b.impact !== a.impact) return b.impact - a.impact
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
      .slice(0, 3)
  })()

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-600 border-red-200'
      case 'medium': return 'bg-orange-500/20 text-orange-600 border-orange-200'
      case 'low': return 'bg-blue-500/20 text-blue-600 border-blue-200'
      default: return 'bg-gray-500/20 text-gray-600 border-gray-200'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-card border rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${badge.color}/20`}>
              <FileText className={`h-6 w-6 ${badge.color.replace('bg-', 'text-')}`} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Business Health Report</h2>
              <p className="text-muted-foreground">Complete analysis & recommended actions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Overall Score Summary */}
        <div className={`p-6 rounded-xl mb-6 bg-gradient-to-r ${badge.gradientClass} border`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold mb-2">Overall Business Health</h3>
              <p className={`font-medium ${badge.color.replace('bg-', 'text-')}`}>
                {getMessage()}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-black ${badge.color.replace('bg-', 'text-')}`}>
                {healthScores.totalRounded}/100
              </div>
              <Badge className={`${badge.color} text-white`}>
                {badge.emoji} {badge.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* 4 Pillar Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Profit Health */}
          <button
            onClick={() => onShowExplanation('profit')}
            className="p-4 border rounded-lg hover:shadow-md hover:border-primary/40 transition-all duration-200 text-left w-full"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <h4 className="font-semibold">Profit Health (Rolling 30d)</h4>
              </div>
              <span className="text-lg font-bold text-primary">{healthScores.profit}/25</span>
            </div>
            <div className="w-full bg-primary/20 rounded-full h-2 mb-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${(healthScores.profit / 25) * 100}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {healthScores.profit >= 20 ? 'Excellent profit performance!' :
               healthScores.profit >= 15 ? 'Strong profit growth' :
               healthScores.profit >= 10 ? 'Steady progress, room to improve' : 'Profit needs immediate attention'}
            </p>
          </button>

          {/* Cash Flow Health */}
          <button
            onClick={() => onShowExplanation('cashflow')}
            className="p-4 border rounded-lg hover:shadow-md hover:border-green-500/40 transition-all duration-200 text-left w-full"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                <h4 className="font-semibold">Cash Flow Health</h4>
              </div>
              <span className="text-lg font-bold text-green-600">{healthScores.cashflow}/25</span>
            </div>
            <div className="w-full bg-green-500/20 rounded-full h-2 mb-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(healthScores.cashflow / 25) * 100}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {healthScores.cashflow >= 20 ? 'Outstanding cash management!' :
               healthScores.cashflow >= 15 ? 'Healthy cash flow patterns' :
               healthScores.cashflow >= 10 ? 'Some collection delays' : 'Cash flow requires urgent attention'}
            </p>
          </button>

          {/* Efficiency Health */}
          <button
            onClick={() => onShowExplanation('efficiency')}
            className="p-4 border rounded-lg hover:shadow-md hover:border-blue-500/40 transition-all duration-200 text-left w-full"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <h4 className="font-semibold">Efficiency Health (Rolling 30d)</h4>
              </div>
              <span className="text-lg font-bold text-blue-600">{healthScores.efficiency}/25</span>
            </div>
            <div className="w-full bg-blue-500/20 rounded-full h-2 mb-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(healthScores.efficiency / 25) * 100}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {healthScores.efficiency >= 20 ? 'Peak productivity achieved!' :
               healthScores.efficiency >= 15 ? 'Strong efficiency levels' :
               healthScores.efficiency >= 10 ? 'Building momentum' : 'Efficiency needs improvement'}
            </p>
          </button>

          {/* Risk Management */}
          <button
            onClick={() => onShowExplanation('risk')}
            className="p-4 border rounded-lg hover:shadow-md hover:border-purple-500/40 transition-all duration-200 text-left w-full"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                <h4 className="font-semibold">Risk Management</h4>
              </div>
              <span className="text-lg font-bold text-purple-600">{healthScores.risk}/25</span>
            </div>
            <div className="w-full bg-purple-500/20 rounded-full h-2 mb-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(healthScores.risk / 25) * 100}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {healthScores.risk >= 20 ? 'Well-protected business!' :
               healthScores.risk >= 15 ? 'Manageable risk levels' :
               healthScores.risk >= 10 ? 'Some risk concerns' : 'High-risk areas need attention'}
            </p>
          </button>
        </div>

        {/* Top 3 Recommended Actions */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Top 3 Recommended Actions
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {topRecommendations.map((rec, index) => (
              <div key={rec.id} className="p-4 bg-muted/30 rounded-lg border border-muted">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">{rec.title}</h4>
                      <p className="text-xs text-muted-foreground mb-2">{rec.description}</p>
                      <div className={`inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                        {rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)} Priority
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    +{rec.impact} pts
                  </Badge>
                </div>

                {/* Action Items */}
                <div className="space-y-1">
                  {rec.actionItems.slice(0, 3).map((action, actionIndex) => (
                    <div key={actionIndex} className="flex items-start gap-2 text-xs">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-muted-foreground">{action}</span>
                    </div>
                  ))}
                </div>

                {/* Metrics */}
                <div className="mt-3 pt-3 border-t border-muted">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Current: </span>
                      <span className="font-medium">{rec.metrics?.current}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Target: </span>
                      <span className="font-medium">{rec.metrics?.target}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
