import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'

// Health score calculation interfaces (matching the component)
interface HealthScoreData {
  revenue: {
    current: number
    target: number
    trend: 'positive' | 'negative' | 'neutral'
  }
  hours: {
    current: number
    target: number
    progress: number
  }
  rate: {
    current: number
    target: number
  }
  overdue: {
    amount: number
    count: number
  }
  unbilled: {
    hours: number
    amount: number
  }
}

interface HealthScoreResult {
  score: number // 0-100
  status: 'excellent' | 'good' | 'warning' | 'critical'
  message: string
  recommendations: string[]
  breakdown: {
    revenue: number    // 0-25 points
    cashflow: number   // 0-25 points
    efficiency: number // 0-25 points
    risk: number       // 0-25 points
  }
  lastCalculated: string
}

// Enhanced health score calculation algorithm
const calculateHealthScore = (data: HealthScoreData): HealthScoreResult => {
  // Revenue Health (25 points max)
  const revenueProgress = Math.min(data.revenue.current / data.revenue.target, 1)
  let revenueScore = Math.round(revenueProgress * 20)

  // Bonus for exceeding target
  if (revenueProgress > 1) {
    revenueScore = Math.min(25, revenueScore + 5)
  }

  // Trend bonus/penalty
  if (data.revenue.trend === 'positive' && revenueScore < 25) {
    revenueScore = Math.min(25, revenueScore + 2)
  } else if (data.revenue.trend === 'negative' && revenueScore > 0) {
    revenueScore = Math.max(0, revenueScore - 3)
  }

  // Cash Flow Health (25 points max) - penalize overdue invoices heavily
  const overdueRatio = data.overdue.amount / Math.max(data.revenue.current, 1)
  let cashflowScore = 25

  // Penalize based on overdue ratio and count
  if (data.overdue.count > 0) {
    const overdueCountPenalty = Math.min(data.overdue.count * 4, 15)
    const overdueAmountPenalty = Math.min(overdueRatio * 60, 15)
    cashflowScore = Math.max(0, 25 - overdueCountPenalty - overdueAmountPenalty)
  }

  // Efficiency Health (25 points max)
  const hoursEfficiency = Math.min(data.hours.progress / 100, 1)
  const rateEfficiency = Math.min(data.rate.current / data.rate.target, 1)

  // Hours component (15 points max)
  let hoursPoints = Math.round(hoursEfficiency * 15)
  if (data.hours.progress > 100) {
    hoursPoints = Math.min(15, hoursPoints + 2) // Bonus for exceeding hours target
  }

  // Rate component (10 points max)
  let ratePoints = Math.round(rateEfficiency * 10)
  if (data.rate.current > data.rate.target) {
    ratePoints = Math.min(10, ratePoints + 2) // Bonus for exceeding rate target
  }

  const efficiencyScore = hoursPoints + ratePoints

  // Risk Management (25 points max)
  let riskScore = 25

  // Unbilled hours risk (higher penalty for longer unbilled time)
  const unbilledRatio = data.unbilled.amount / Math.max(data.revenue.current, 1)
  const unbilledHoursPenalty = Math.min(data.unbilled.hours * 0.5, 10)
  const unbilledAmountPenalty = Math.min(unbilledRatio * 20, 10)

  // Additional penalty for high overdue count (risk management failure)
  const riskManagementPenalty = data.overdue.count > 2 ? Math.min(data.overdue.count - 2, 5) : 0

  riskScore = Math.max(0, 25 - unbilledHoursPenalty - unbilledAmountPenalty - riskManagementPenalty)

  // Total score
  const totalScore = Math.min(100, revenueScore + cashflowScore + efficiencyScore + riskScore)

  // Determine status and contextual message
  let status: HealthScoreResult['status']
  let message: string
  let recommendations: string[] = []

  if (totalScore >= 85) {
    status = 'excellent'
    message = `Outstanding financial performance! Score: ${totalScore}/100`
    recommendations = [
      'Consider scaling operations or raising rates',
      'Explore new revenue streams or market expansion',
      'Build emergency fund with excess cash flow'
    ]
  } else if (totalScore >= 70) {
    status = 'good'
    message = `Solid financial health with optimization opportunities. Score: ${totalScore}/100`

    // Contextual recommendations based on weak areas
    if (revenueScore < 20) recommendations.push('Focus on increasing revenue to meet monthly targets')
    if (efficiencyScore < 20) {
      if (data.hours.progress < 75) recommendations.push('Increase billable hours to improve efficiency')
      if (data.rate.current < data.rate.target * 0.8) recommendations.push('Review and optimize hourly rates')
    }
    if (data.unbilled.hours > 10) recommendations.push('Invoice unbilled hours within 7 days')
    if (data.overdue.count > 0) recommendations.push(`Follow up on ${data.overdue.count} overdue invoice(s)`)

    // Default recommendations if none added
    if (recommendations.length === 0) {
      recommendations = ['Maintain current performance and look for growth opportunities']
    }
  } else if (totalScore >= 50) {
    status = 'warning'
    message = `Financial health needs attention. Action required. Score: ${totalScore}/100`

    // Prioritized recommendations for warning state
    if (data.overdue.count > 0) recommendations.push(`URGENT: Follow up on ${data.overdue.count} overdue invoices (€${data.overdue.amount.toLocaleString()})`)
    if (data.unbilled.hours > 20) recommendations.push(`Invoice ${data.unbilled.hours}h of unbilled time immediately`)
    if (data.hours.progress < 60) recommendations.push('Significantly increase billable hours this month')
    if (cashflowScore < 15) recommendations.push('Implement stricter payment terms and follow-up processes')
    if (data.rate.current < data.rate.target * 0.7) recommendations.push('Review pricing strategy - rates may be too low')
  } else {
    status = 'critical'
    message = `CRITICAL: Immediate financial intervention required. Score: ${totalScore}/100`

    // Critical action items
    recommendations = [
      'IMMEDIATE: Contact all clients with overdue invoices today',
      'Invoice ALL unbilled hours within 24 hours',
      'Review cash flow and consider short-term financing if needed',
      'Implement emergency cash flow management plan',
      'Consider raising rates on new projects immediately'
    ]

    // Add specific critical alerts
    if (data.overdue.amount > data.revenue.current * 0.3) {
      recommendations.unshift(`CRITICAL: €${data.overdue.amount.toLocaleString()} overdue (${Math.round((data.overdue.amount/data.revenue.current)*100)}% of monthly revenue)`)
    }
  }

  return {
    score: totalScore,
    status,
    message,
    recommendations: recommendations.slice(0, 4), // Limit to 4 recommendations
    breakdown: {
      revenue: revenueScore,
      cashflow: cashflowScore,
      efficiency: efficiencyScore,
      risk: riskScore
    },
    lastCalculated: new Date().toISOString()
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get URL parameters for custom targets (optional)
    const searchParams = request.nextUrl.searchParams
    const revenueTarget = parseInt(searchParams.get('revenueTarget') || '12000')
    const hoursTarget = parseInt(searchParams.get('hoursTarget') || '160')
    const rateTarget = parseInt(searchParams.get('rateTarget') || '100')

    // Fetch data from existing endpoints (parallel requests)
    const [dashboardResponse, timeResponse] = await Promise.all([
      fetch(`${request.nextUrl.origin}/api/invoices/dashboard-metrics`, {
        headers: { Cookie: request.headers.get('cookie') || '' }
      }),
      fetch(`${request.nextUrl.origin}/api/time-entries/stats`, {
        headers: { Cookie: request.headers.get('cookie') || '' }
      })
    ])

    if (!dashboardResponse.ok || !timeResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch required data for health score calculation' },
        { status: 500 }
      )
    }

    const dashboardData = await dashboardResponse.json()
    const timeData = await timeResponse.json()

    // Transform existing API data into health score format
    const healthData: HealthScoreData = {
      revenue: {
        current: dashboardData.data.totale_registratie,
        target: revenueTarget,
        trend: timeData.data.thisWeek.trend
      },
      hours: {
        current: timeData.data.thisMonth.hours,
        target: hoursTarget,
        progress: (timeData.data.thisMonth.hours / hoursTarget) * 100
      },
      rate: {
        current: timeData.data.thisMonth.hours > 0
          ? Math.round(timeData.data.thisMonth.revenue / timeData.data.thisMonth.hours)
          : 0,
        target: rateTarget
      },
      overdue: {
        amount: dashboardData.data.achterstallig,
        count: dashboardData.data.achterstallig_count
      },
      unbilled: {
        hours: timeData.data.unbilled.hours,
        amount: timeData.data.unbilled.revenue
      }
    }

    // Calculate health score
    const healthScore = calculateHealthScore(healthData)

    return NextResponse.json({
      success: true,
      data: healthScore,
      meta: {
        calculatedAt: new Date().toISOString(),
        targets: {
          revenue: revenueTarget,
          hours: hoursTarget,
          rate: rateTarget
        },
        inputData: healthData
      }
    })

  } catch (error) {
    console.error('Health score calculation error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate health score' },
      { status: 500 }
    )
  }
}

// POST endpoint for updating targets
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { revenueTarget, hoursTarget, rateTarget } = body

    // Validate inputs
    if (!revenueTarget || !hoursTarget || !rateTarget) {
      return NextResponse.json(
        { error: 'Missing required targets' },
        { status: 400 }
      )
    }

    // TODO: Save user's custom targets to database
    // For now, return success - targets can be passed via query params to GET

    return NextResponse.json({
      success: true,
      message: 'Targets updated successfully',
      targets: {
        revenueTarget,
        hoursTarget,
        rateTarget
      }
    })

  } catch (error) {
    console.error('Health score targets update error:', error)
    return NextResponse.json(
      { error: 'Failed to update targets' },
      { status: 500 }
    )
  }
}