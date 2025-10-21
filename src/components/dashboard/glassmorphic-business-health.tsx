'use client'

import { useState } from 'react'
import { LucideIcon, DollarSign, CreditCard, Target, AlertTriangle, ChevronDown, Activity, TrendingUp, FileText } from 'lucide-react'

interface GlassmorphicBusinessHealthProps {
  healthScores: {
    totalRounded: number
    profit: number
    cashflow: number
    efficiency: number
    risk: number
  }
  className?: string
  onShowHealthReport?: () => void
  onShowExplanation?: (metric: string) => void
}

export function GlassmorphicBusinessHealth({
  healthScores,
  className = '',
  onShowHealthReport,
  onShowExplanation
}: GlassmorphicBusinessHealthProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getHealthBadge = (score: number) => {
    if (score >= 85) return { emoji: '👑', label: 'LEGEND', color: 'rgba(34, 197, 94, 0.3)', gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(74, 222, 128, 0.15))' }
    if (score >= 70) return { emoji: '⭐', label: 'CHAMPION', color: 'rgba(59, 130, 246, 0.3)', gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(96, 165, 250, 0.15))' }
    if (score >= 50) return { emoji: '📊', label: 'BUILDER', color: 'rgba(251, 146, 60, 0.3)', gradient: 'linear-gradient(135deg, rgba(251, 146, 60, 0.25), rgba(253, 186, 116, 0.15))' }
    return { emoji: '🎯', label: 'STARTER', color: 'rgba(239, 68, 68, 0.3)', gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(248, 113, 113, 0.15))' }
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'rgba(34, 197, 94, 1)'
    if (score >= 70) return 'rgba(59, 130, 246, 1)'
    if (score >= 50) return 'rgba(251, 146, 60, 1)'
    return 'rgba(239, 68, 68, 1)'
  }

  const getScoreGlow = (score: number) => {
    if (score >= 85) return '0 0 20px rgba(34, 197, 94, 0.4), 0 0 40px rgba(34, 197, 94, 0.2)'
    if (score >= 70) return '0 0 20px rgba(59, 130, 246, 0.4), 0 0 40px rgba(59, 130, 246, 0.2)'
    if (score >= 50) return '0 0 20px rgba(251, 146, 60, 0.4), 0 0 40px rgba(251, 146, 60, 0.2)'
    return '0 0 20px rgba(239, 68, 68, 0.4), 0 0 40px rgba(239, 68, 68, 0.2)'
  }

  const getPillarData = () => [
    {
      icon: DollarSign,
      name: 'Profit',
      metricKey: 'profit',
      score: healthScores.profit,
      color: 'rgba(99, 102, 241, 1)',
      gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(59, 130, 246, 0.15))'
    },
    {
      icon: CreditCard,
      name: 'Cash Flow',
      metricKey: 'cashflow',
      score: healthScores.cashflow,
      color: 'rgba(6, 182, 212, 1)',
      gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(34, 211, 238, 0.15))'
    },
    {
      icon: Target,
      name: 'Efficiency',
      metricKey: 'efficiency',
      score: healthScores.efficiency,
      color: 'rgba(34, 197, 94, 1)',
      gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(74, 222, 128, 0.15))'
    },
    {
      icon: AlertTriangle,
      name: 'Risk Mgmt',
      metricKey: 'risk',
      score: healthScores.risk,
      color: 'rgba(168, 85, 247, 1)',
      gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(192, 132, 252, 0.15))'
    }
  ]

  const badge = getHealthBadge(healthScores.totalRounded)
  const scoreColor = getScoreColor(healthScores.totalRounded)
  const scoreGlow = getScoreGlow(healthScores.totalRounded)
  const pillars = getPillarData()

  return (
    <div
      className={`metric-card ${className}`}
      style={{
        gridColumn: 'span 6',
        background: badge.gradient,
        minHeight: isExpanded ? '280px' : '140px',
        transition: 'all 0.3s ease',
        border: `1px solid ${badge.color}`,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Animated background glow */}
      <div
        style={{
          position: 'absolute',
          top: '-50%',
          right: '-50%',
          width: '200%',
          height: '200%',
          background: `radial-gradient(circle, ${badge.color} 0%, transparent 70%)`,
          opacity: 0.15,
          animation: 'pulse-glow 4s ease-in-out infinite',
          pointerEvents: 'none'
        }}
      />

      {/* Header with circular score gauge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px', position: 'relative', zIndex: 1 }}>
        <div style={{ flex: 1 }}>
          <h3 className="metric-card__title" style={{ marginBottom: '8px' }}>Business Health</h3>
          <span
            className="metric-card__badge"
            style={{
              background: badge.color,
              fontSize: '13px',
              fontWeight: 600,
              padding: '4px 10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {badge.emoji} {badge.label}
          </span>
        </div>

        {/* Circular score gauge */}
        <div style={{ position: 'relative', width: '80px', height: '80px' }}>
          {/* Background circle */}
          <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="40"
              cy="40"
              r="32"
              fill="none"
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="6"
            />
            {/* Progress circle */}
            <circle
              cx="40"
              cy="40"
              r="32"
              fill="none"
              stroke={scoreColor}
              strokeWidth="6"
              strokeDasharray={`${(healthScores.totalRounded / 100) * 201} 201`}
              strokeLinecap="round"
              style={{
                filter: `drop-shadow(${scoreGlow})`,
                transition: 'stroke-dasharray 0.6s ease'
              }}
            />
          </svg>
          {/* Score text */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
              {healthScores.totalRounded}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '2px' }}>
              /100
            </div>
          </div>
        </div>
      </div>

      {/* Subtitle */}
      <div style={{ marginBottom: '12px', position: 'relative', zIndex: 1 }}>
        <span className="metric-card__subtitle" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TrendingUp style={{ width: '14px', height: '14px' }} />
          Rolling 30-day performance
        </span>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', position: 'relative', zIndex: 1 }}>
        {/* Health Report Button */}
        {onShowHealthReport && (
          <button
            onClick={onShowHealthReport}
            style={{
              flex: '0 0 auto',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.95)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.transform = 'translateY(0px)'
            }}
          >
            <FileText style={{ width: '14px', height: '14px' }} />
            <span>Report</span>
          </button>
        )}

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: badge.color,
            border: `1px solid ${scoreColor}`,
            borderRadius: '10px',
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.95)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            justifyContent: 'center',
            boxShadow: `0 2px 8px ${badge.color}`
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = `0 4px 12px ${badge.color}`
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)'
            e.currentTarget.style.boxShadow = `0 2px 8px ${badge.color}`
          }}
        >
          <span>{isExpanded ? 'Hide' : 'View'} Pillars</span>
          <ChevronDown
            style={{
              width: '16px',
              height: '16px',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease'
            }}
          />
        </button>
      </div>

      {/* Collapsible Pillars */}
      {isExpanded && (
        <div
          style={{
            marginTop: '16px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            position: 'relative',
            zIndex: 1
          }}
        >
          {pillars.map((pillar, index) => (
            <button
              key={pillar.name}
              onClick={() => onShowExplanation?.(pillar.metricKey)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '12px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(8px)',
                position: 'relative',
                transition: 'all 0.2s ease',
                cursor: onShowExplanation ? 'pointer' : 'default',
                width: '100%',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
                e.currentTarget.style.borderColor = `${pillar.color}60`
                if (onShowExplanation) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'
                e.currentTarget.style.transform = 'translateY(0px)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', position: 'relative' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: `${pillar.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${pillar.color}40`
                  }}
                >
                  <pillar.icon style={{ width: '18px', height: '18px', color: pillar.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500, marginBottom: '2px' }}>
                    {pillar.name}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.95)', display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                    {pillar.score}
                    <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)' }}>/25</span>
                  </div>
                </div>
              </div>
              {/* Clean Progress Bar */}
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${(pillar.score / 25) * 100}%`,
                    height: '100%',
                    background: pillar.color,
                    borderRadius: '6px',
                    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                />
              </div>
            </button>
          ))}
        </div>
      )}

    </div>
  )
}
