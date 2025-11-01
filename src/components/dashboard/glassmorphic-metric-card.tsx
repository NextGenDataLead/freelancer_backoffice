'use client'

import { LucideIcon } from 'lucide-react'

interface GlassmorphicMetricCardProps {
  icon: LucideIcon
  iconColor: string
  title: string
  value: string | number
  subtitle: string
  progress?: number // 0-100
  progressColor?: string
  targetLine?: number // 0-100 - position of target line on progress bar
  badge?: {
    label: string
    color?: string
  }
  trendComparison?: {
    icon: LucideIcon
    value: string
    label: string
    isPositive: boolean
    inline?: boolean // if true, renders inline with subtitle instead of separate section
  }
  splitMetrics?: {
    label1: string
    value1: string
    label2: string
    value2: string
  }
  categoryBreakdown?: {
    categories: Array<{
      label: string
      amount: number
      percentage: number
      color?: string
      key?: string // for filtering
    }>
    onClick?: (categoryKey: string) => void
  }
  gradient?: string
  className?: string
}

export function GlassmorphicMetricCard({
  icon: Icon,
  iconColor,
  title,
  value,
  subtitle,
  progress,
  progressColor = 'var(--color-accent)',
  targetLine,
  badge,
  trendComparison,
  splitMetrics,
  categoryBreakdown,
  gradient,
  className = ''
}: GlassmorphicMetricCardProps) {
  return (
    <div
      className={`metric-card ${className}`}
      style={{
        gridColumn: 'span 6',
        background: gradient || 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(59, 130, 246, 0.08))'
      }}
    >
      {/* Header with Icon and Badge */}
      <div className="metric-card__header">
        <div className="metric-card__icon-wrapper" style={{ background: iconColor }}>
          <Icon className="metric-card__icon" />
        </div>
        {badge && (
          <span
            className="metric-card__badge"
            style={{ background: badge.color || 'rgba(255, 255, 255, 0.2)' }}
          >
            {badge.label}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="metric-card__title">{title}</h3>

      {/* Main Value and Subtitle */}
      <div className="metric-card__value-wrapper">
        <span className="metric-card__value">{value}</span>
        {trendComparison?.inline ? (
          <div className="metric-card__trend" style={{ marginTop: '0.5rem' }}>
            <trendComparison.icon
              className="metric-card__trend-icon"
              style={{ color: trendComparison.isPositive ? 'var(--color-success)' : 'var(--color-danger)' }}
            />
            <span
              className="metric-card__trend-value"
              style={{ color: trendComparison.isPositive ? 'var(--color-success)' : 'var(--color-danger)' }}
            >
              {trendComparison.value}
            </span>
            <span className="metric-card__trend-label">{trendComparison.label}</span>
          </div>
        ) : (
          <span className="metric-card__subtitle">{subtitle}</span>
        )}
      </div>

      {/* Trend Comparison - Only show if not inline */}
      {trendComparison && !trendComparison.inline && (
        <div className="metric-card__trend">
          <trendComparison.icon
            className="metric-card__trend-icon"
            style={{ color: trendComparison.isPositive ? 'var(--color-success)' : 'var(--color-danger)' }}
          />
          <span
            className="metric-card__trend-value"
            style={{ color: trendComparison.isPositive ? 'var(--color-success)' : 'var(--color-danger)' }}
          >
            {trendComparison.value}
          </span>
          <span className="metric-card__trend-label">{trendComparison.label}</span>
        </div>
      )}

      {/* Progress Bar */}
      {progress !== undefined && (
        <div className="metric-card__progress-container">
          <div className="metric-card__progress-bar">
            <div
              className="metric-card__progress-fill"
              style={{
                width: `${Math.min(progress, 100)}%`,
                background: progressColor
              }}
            />
            {targetLine !== undefined && (
              <div
                className="metric-card__target-line"
                style={{ left: `${Math.min(targetLine, 100)}%` }}
              />
            )}
          </div>
        </div>
      )}

      {/* Split Metrics */}
      {splitMetrics && (
        <div className="metric-card__split">
          <div className="metric-card__split-item">
            <span className="metric-card__split-label">{splitMetrics.label1}</span>
            <span className="metric-card__split-value">{splitMetrics.value1}</span>
          </div>
          <div className="metric-card__split-divider" />
          <div className="metric-card__split-item">
            <span className="metric-card__split-label">{splitMetrics.label2}</span>
            <span className="metric-card__split-value">{splitMetrics.value2}</span>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {categoryBreakdown && categoryBreakdown.categories.length > 0 && (
        <div className="metric-card__category-breakdown">
          {categoryBreakdown.categories.map((category, index) => (
            <div
              key={category.key || index}
              className="metric-card__category-item"
              onClick={() => category.key && categoryBreakdown.onClick?.(category.key)}
              style={{ cursor: categoryBreakdown.onClick ? 'pointer' : 'default' }}
            >
              <span className="metric-card__category-label">{category.label}</span>
              <div className="metric-card__category-bar">
                <div
                  className="metric-card__category-bar-fill"
                  style={{
                    width: `${category.percentage}%`,
                    background: category.color || 'rgba(251, 146, 60, 0.7)'
                  }}
                />
              </div>
              <span className="metric-card__category-amount">
                €{category.amount.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
