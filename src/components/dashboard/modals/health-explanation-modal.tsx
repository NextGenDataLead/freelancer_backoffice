'use client'

import { Target, Activity, Clock, Users, X } from 'lucide-react'
import { HealthScoreHierarchicalTree } from '../health-score-hierarchical-tree'
import type { HealthScoreOutputs } from '@/lib/health-score-engine'

interface HealthExplanationModalProps {
  pillar: 'profit' | 'cashflow' | 'efficiency' | 'risk' | null
  healthScoreResults: HealthScoreOutputs | null
  subscriptionEnabled: boolean
  onClose: () => void
  onShowCalculationDetail: (
    metricId: string,
    metricName: string,
    score: number,
    maxScore: number,
    detailedCalculation?: any
  ) => void
}

export function HealthExplanationModal({
  pillar,
  healthScoreResults,
  subscriptionEnabled,
  onClose,
  onShowCalculationDetail
}: HealthExplanationModalProps) {
  if (!pillar || !healthScoreResults) return null

  const getPillarConfig = () => {
    switch (pillar) {
      case 'profit':
        return {
          icon: Target,
          iconColor: 'text-primary',
          bgColor: 'bg-primary/20',
          title: 'Profit Health (Rolling 30d)',
          score: healthScoreResults.scores.profit,
          description: `Profit Health measures your business's ability to generate sustainable profit through effective revenue streams and value creation. It evaluates ${subscriptionEnabled ? 'subscription business performance, ' : ''}revenue quality, and value-generating activities that directly impact your bottom line.`
        }
      case 'cashflow':
        return {
          icon: Activity,
          iconColor: 'text-green-500',
          bgColor: 'bg-green-500/20',
          title: 'Cash Flow Health',
          score: healthScoreResults.scores.cashflow,
          description: 'Cash Flow Health focuses on your payment collection efficiency and outstanding invoices. It measures how quickly you collect payments and how well you manage overdue amounts, which directly affects your business liquidity and operational stability.'
        }
      case 'efficiency':
        return {
          icon: Clock,
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-500/20',
          title: 'Efficiency Health (Rolling 30d)',
          score: healthScoreResults.scores.efficiency,
          description: 'Efficiency Health tracks your time utilization patterns and billing effectiveness. It measures how consistently you track time, meet your hourly targets, and convert tracked time into billable revenue.'
        }
      case 'risk':
        return {
          icon: Users,
          iconColor: 'text-purple-500',
          bgColor: 'bg-purple-500/20',
          title: 'Risk Management Health',
          score: healthScoreResults.scores.risk,
          description: `Risk Management Health evaluates potential threats to business continuity including invoice processing backlogs, payment risks${subscriptionEnabled ? ', and subscription health' : ''}. It identifies areas where operational delays could impact your revenue flow.`
        }
    }
  }

  const config = getPillarConfig()
  const Icon = config.icon

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-card border rounded-xl max-w-[874px] w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${config.bgColor}`}>
                <Icon className={`h-5 w-5 ${config.iconColor}`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{config.title}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Current Score:</span>
                  <span className="text-lg font-bold text-primary">{config.score}/25</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {/* Overview Section */}
          <div className="mb-6">
            <p className="text-sm text-muted-foreground leading-relaxed">{config.description}</p>
          </div>

          {/* Score Breakdown Visualization */}
          <HealthScoreHierarchicalTree
            healthScoreResults={healthScoreResults}
            category={pillar}
            onMetricClick={(metricId, metricName, score, maxScore, currentValue) => {
              // Use calculation modal for all metric clicks
              onShowCalculationDetail(
                metricId,
                metricName,
                score,
                maxScore,
                undefined
              )
            }}
            onCalculationClick={(metricId, metricName, calculationValue, calculationDescription, score, maxScore, detailedCalculation) => {
              onShowCalculationDetail(
                metricId,
                metricName,
                score,
                maxScore,
                detailedCalculation
              )
            }}
            className="max-w-full"
          />
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t p-4 sm:p-6">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
