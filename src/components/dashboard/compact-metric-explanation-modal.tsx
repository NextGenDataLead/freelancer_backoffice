/**
 * Compact Metric Explanation Modal
 * A more compact, contextual modal for individual metric explanations
 * that blends with the hierarchical tree modal but remains distinctive
 */

import React from 'react'
import { X, Lightbulb, Target, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { getMetricDefinition } from '@/lib/health-score-metric-definitions'

interface CompactMetricExplanationModalProps {
  metricId: string
  metricName: string
  currentValue?: number
  currentScore: number
  maxScore: number
  isOpen: boolean
  onClose: () => void
  className?: string
}

// Compact explanations for metrics
const COMPACT_EXPLANATIONS: Record<string, {
  whatItMeans: string
  quickTips: string[]
  benchmark: string
}> = {
  time_utilization_efficiency: {
    whatItMeans: "How well you're hitting your monthly hour targets. This shows if you're on track to meet your planned work schedule.",
    quickTips: [
      "Time-block your calendar with specific work sessions",
      "Set daily hour targets (like 6-7 hours) instead of just monthly goals",
      "Track distractions and eliminate the biggest time-wasters"
    ],
    benchmark: "85-90% progress is excellent, 70-85% is good"
  },
  billing_efficiency: {
    whatItMeans: "What percentage of your completed work gets invoiced quickly. High efficiency means less money sitting 'on the table' uninvoiced.",
    quickTips: [
      "Invoice completed work within 24-48 hours",
      "Set up weekly billing sessions to stay consistent",
      "Create invoice templates to speed up the process"
    ],
    benchmark: ">90% is excellent, 80-90% is good"
  },
  daily_consistency: {
    whatItMeans: "How consistently you work each day. Higher consistency means more predictable income and better work-life balance.",
    quickTips: [
      "Aim for 5-7 hours of work per day rather than cramming",
      "Establish a regular work schedule and stick to it",
      "Use the 'no zero days' rule - do at least some work every workday"
    ],
    benchmark: "5+ hours/day is excellent, 3-5 hours is good"
  },
  collection_speed: {
    whatItMeans: "How quickly you collect payments after sending invoices. Faster collection means better cash flow and less stress.",
    quickTips: [
      "Follow up within 3 days of payment due date",
      "Offer convenient payment methods (bank transfer, PayPal)",
      "Ask for 25-50% upfront on larger projects"
    ],
    benchmark: "<7 days is excellent, 7-15 days is good"
  },
  volume_efficiency: {
    whatItMeans: "How many outstanding invoices you're juggling. Fewer is better - it means less administrative overhead and stress.",
    quickTips: [
      "Set aside 30 minutes every Monday for payment follow-ups",
      "Prioritize the highest-value overdue invoices first",
      "Be selective about clients with poor payment history"
    ],
    benchmark: "<3 invoices is excellent, 3-5 is manageable"
  },
  absolute_amount_control: {
    whatItMeans: "Total money owed to you. Keeping this low means predictable cash flow and less financial stress.",
    quickTips: [
      "Set maximum credit limits per client (e.g., €2,000)",
      "Stop new work for clients with large overdue amounts",
      "Consider offering payment plans for struggling clients"
    ],
    benchmark: "<€1,000 is excellent, €1-3k is manageable"
  },
  invoice_processing_risk: {
    whatItMeans: "How much completed work you have sitting unbilled. Less is better - it represents money you should have already received.",
    quickTips: [
      "Review unbilled work daily and invoice within 48 hours",
      "Set calendar reminders for billing sessions",
      "Create a simple invoicing workflow to speed up the process"
    ],
    benchmark: "<€2,000 is excellent, €2-5k needs attention"
  },
  payment_collection_risk: {
    whatItMeans: "Your risk from overdue payments. Lower amounts mean less financial vulnerability and better cash flow predictability.",
    quickTips: [
      "Follow up professionally but persistently on overdue amounts",
      "Set up automated payment reminders",
      "Ask for deposits on future work from slow-paying clients"
    ],
    benchmark: "<€1,000 is low risk, €1-3k is moderate risk"
  },
  client_concentration_risk: {
    whatItMeans: "How dependent you are on a small number of clients. Lower concentration means more stable business.",
    quickTips: [
      "Gradually diversify your client base",
      "Aim for no single client representing >40% of revenue",
      "Develop multiple service offerings to attract different clients"
    ],
    benchmark: "No client >30% of revenue is excellent"
  },
  business_continuity_risk: {
    whatItMeans: "Your business's resilience to disruptions. This includes your service model stability and operational backup plans.",
    quickTips: [
      "Develop multiple revenue streams when possible",
      "Build an emergency fund equal to 2-3 months expenses",
      "Document your key processes and client information"
    ],
    benchmark: "Diversified revenue and emergency fund is ideal"
  }
}

export function CompactMetricExplanationModal({
  metricId,
  metricName,
  currentValue,
  currentScore,
  maxScore,
  isOpen,
  onClose,
  className = ''
}: CompactMetricExplanationModalProps) {
  if (!isOpen) return null

  const scorePercentage = Math.round((currentScore / maxScore) * 100)
  const explanation = COMPACT_EXPLANATIONS[metricId]
  const metricDefinition = getMetricDefinition(metricId)

  const getScoreColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-green-600 dark:text-green-400'
    if (percentage >= 70) return 'text-blue-600 dark:text-blue-400'
    if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreIcon = (percentage: number) => {
    if (percentage >= 90) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (percentage >= 70) return <Target className="h-4 w-4 text-blue-500" />
    if (percentage >= 50) return <Info className="h-4 w-4 text-yellow-500" />
    return <AlertTriangle className="h-4 w-4 text-red-500" />
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10002]">
      <div className={`bg-card/95 border-2 rounded-lg shadow-lg max-w-lg w-full max-h-[80vh] overflow-y-auto ${className}`}>
        {/* Header - More compact */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            {getScoreIcon(scorePercentage)}
            <div>
              <h3 className="font-semibold text-base">{metricName}</h3>
              <div className="flex items-center gap-2 text-sm">
                <span className={`font-bold ${getScoreColor(scorePercentage)}`}>
                  {currentScore.toFixed(1)}/{maxScore}
                </span>
                <span className="text-muted-foreground">
                  ({scorePercentage}%)
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content - Compact sections */}
        <div className="p-4 space-y-4">
          {explanation && (
            <>
              {/* What it means */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  <h4 className="font-medium text-sm">What this means</h4>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {explanation.whatItMeans}
                </p>
              </div>

              {/* Quick tips */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  <h4 className="font-medium text-sm">Quick improvements</h4>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {explanation.quickTips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="leading-relaxed">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Benchmark */}
              <div className="bg-muted/50 rounded-md p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <h4 className="font-medium text-sm">Performance benchmark</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {explanation.benchmark}
                </p>
              </div>
            </>
          )}

          {/* Fallback to metric definition if no custom explanation */}
          {!explanation && metricDefinition && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {metricDefinition.description}
              </p>
              <div className="bg-muted/50 rounded-md p-3">
                <h4 className="font-medium text-sm mb-2">Benchmarks</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-green-600">
                    <span className="font-medium">Excellent:</span> {metricDefinition.benchmarks.excellent}
                  </div>
                  <div className="text-blue-600">
                    <span className="font-medium">Good:</span> {metricDefinition.benchmarks.good}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Current value if available */}
          {currentValue !== undefined && (
            <div className="bg-primary/10 rounded-md p-3 border border-primary/20">
              <div className="text-sm">
                <span className="font-medium text-primary">Current value:</span>
                <span className="ml-2">{currentValue}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Compact */}
        <div className="border-t bg-muted/30 px-4 py-3">
          <button
            onClick={onClose}
            className="w-full px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}