/**
 * Unified Health Score Status Constants
 *
 * Phase 1 implementation - ensures consistent status display across all components
 */

export const HEALTH_STATUS_CONFIG = {
  excellent: {
    threshold: 85,
    color: 'text-green-500',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
    message: '🚀 Crushing your targets! Keep it up!',
    badge: '👑 LEGEND',
    badgeClass: 'bg-green-500/10 text-green-500'
  },
  good: {
    threshold: 70,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    message: '💪 Strong performance this month',
    badge: '⭐ CHAMPION',
    badgeClass: 'bg-blue-500/10 text-blue-500'
  },
  warning: {
    threshold: 50,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    message: '📈 Room for improvement - you got this!',
    badge: '📊 BUILDER',
    badgeClass: 'bg-orange-500/10 text-orange-500'
  },
  critical: {
    threshold: 0,
    color: 'text-red-500',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    message: '🎯 Let\'s turn this around together!',
    badge: '🎯 STARTER',
    badgeClass: 'bg-red-500/10 text-red-500'
  }
} as const

export type HealthStatus = keyof typeof HEALTH_STATUS_CONFIG

/**
 * Get status configuration for a given score
 */
export function getStatusForScore(score: number): HealthStatus {
  if (score >= HEALTH_STATUS_CONFIG.excellent.threshold) return 'excellent'
  if (score >= HEALTH_STATUS_CONFIG.good.threshold) return 'good'
  if (score >= HEALTH_STATUS_CONFIG.warning.threshold) return 'warning'
  return 'critical'
}

/**
 * Get progress to next achievement level
 */
export function getNextMilestone(score: number) {
  if (score >= 85) return null

  const milestones = [50, 70, 85]
  const nextLevel = milestones.find(level => level > score)

  if (!nextLevel) return null

  const currentBase = nextLevel === 50 ? 0 : nextLevel === 70 ? 50 : 70
  const range = nextLevel - currentBase
  const progress = ((score - currentBase) / range) * 100

  return {
    target: nextLevel,
    pointsNeeded: nextLevel - score,
    progress: Math.max(0, Math.min(100, progress)),
    status: getStatusForScore(nextLevel)
  }
}

/**
 * Animation constants for consistent UI transitions
 */
export const HEALTH_ANIMATIONS = {
  scoreUpdate: 'transition-all duration-500 ease-out',
  modalSlide: 'transition-transform duration-300 ease-in-out',
  cardHover: 'transition-all duration-200 ease-in-out',
  progressBar: 'transition-all duration-700 ease-in-out',
  achievement: 'animate-bounce duration-1000'
} as const