// Smart Rules Engine for Financial Dashboard
// Analyzes business data and generates contextual, actionable insights

interface BusinessData {
  // Financial data
  revenue: {
    current: number
    target: number
    previousMonth: number
  }

  // Time tracking data
  hours: {
    thisMonth: number
    thisWeek: number
    target: number
    unbilledHours: number
    unbilledRevenue: number
  }

  // Invoice data
  invoices: {
    overdue: {
      count: number
      amount: number
    }
    pending: {
      count: number
      amount: number
    }
    averagePaymentDays: number
  }

  // Client data
  clients: {
    total: number
    activeThisMonth: number
    topClient?: {
      name: string
      revenueShare: number // percentage
    }
  }

  // Rate analysis
  rate: {
    current: number
    target: number
  }
}

interface SmartAlert {
  id: string
  type: 'critical' | 'warning' | 'opportunity' | 'info'
  category: 'cash_flow' | 'efficiency' | 'risk' | 'growth' | 'compliance'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  effort: 'low' | 'medium' | 'high'
  priority: number // 1-10, 10 being highest
  actionable: boolean
  actions: SmartAction[]
  metadata: {
    ruleId: string
    confidence: number // 0-1
    dataPoints: string[]
  }
}

interface SmartAction {
  label: string
  type: 'navigate' | 'api_call' | 'external' | 'modal'
  target?: string
  payload?: any
  primary?: boolean
}

class SmartRulesEngine {
  private rules: SmartRule[] = []

  constructor() {
    this.initializeRules()
  }

  private initializeRules() {
    this.rules = [
      // CRITICAL RULES (Priority 8-10)

      // Cash flow critical
      {
        id: 'cash_flow_critical',
        name: 'Critical Cash Flow Risk',
        priority: 10,
        condition: (data) => {
          const overdueRatio = data.invoices.overdue.amount / Math.max(data.revenue.current, 1)
          return overdueRatio > 0.4 && data.invoices.overdue.count > 2
        },
        generate: (data) => ({
          id: 'cash_flow_critical',
          type: 'critical' as const,
          category: 'cash_flow' as const,
          title: 'URGENT: Severe Cash Flow Risk',
          description: `€${data.invoices.overdue.amount.toLocaleString()} overdue (${Math.round((data.invoices.overdue.amount/Math.max(data.revenue.current,1))*100)}% of monthly revenue). Immediate action required to prevent cash flow crisis.`,
          impact: 'high' as const,
          effort: 'medium' as const,
          priority: 10,
          actionable: true,
          actions: [
            { label: 'Call All Overdue Clients Today', type: 'navigate', target: '/dashboard/financieel?tab=facturen&filter=overdue&action=call_clients', primary: true },
            { label: 'Review Payment Terms', type: 'navigate', target: '/dashboard/financieel?tab=facturen&action=review_terms' },
            { label: 'Consider Factoring/Financing', type: 'external', target: 'https://business.gov.nl/financing/' }
          ],
          metadata: {
            ruleId: 'cash_flow_critical',
            confidence: 0.95,
            dataPoints: ['overdue_amount', 'overdue_count', 'revenue_current']
          }
        })
      },

      // Large unbilled hours (lost revenue)
      {
        id: 'unbilled_revenue_risk',
        name: 'Significant Unbilled Revenue',
        priority: 9,
        condition: (data) => {
          const unbilledRatio = data.hours.unbilledRevenue / Math.max(data.revenue.current, 1)
          return data.hours.unbilledHours > 40 || unbilledRatio > 0.25
        },
        generate: (data) => ({
          id: 'unbilled_revenue_risk',
          type: 'critical' as const,
          category: 'cash_flow' as const,
          title: 'Major Unbilled Revenue Loss',
          description: `${data.hours.unbilledHours}h unbilled (€${data.hours.unbilledRevenue.toLocaleString()}) - ${Math.round((data.hours.unbilledRevenue/Math.max(data.revenue.current,1))*100)}% of monthly revenue at risk.`,
          impact: 'high' as const,
          effort: 'low' as const,
          priority: 9,
          actionable: true,
          actions: [
            { label: 'Invoice All Unbilled Hours Now', type: 'navigate', target: '/dashboard/financieel?tab=facturen&action=create&prebill=all', primary: true },
            { label: 'Set Weekly Billing Reminder', type: 'modal', payload: { type: 'billing_reminder' } }
          ],
          metadata: {
            ruleId: 'unbilled_revenue_risk',
            confidence: 0.9,
            dataPoints: ['unbilled_hours', 'unbilled_revenue', 'revenue_current']
          }
        })
      },

      // WARNING RULES (Priority 5-7)

      // Client concentration risk
      {
        id: 'client_concentration_risk',
        name: 'Client Concentration Risk',
        priority: 7,
        condition: (data) => {
          return data.clients.topClient && data.clients.topClient.revenueShare > 50
        },
        generate: (data) => ({
          id: 'client_concentration_risk',
          type: 'warning' as const,
          category: 'risk' as const,
          title: 'High Client Concentration Risk',
          description: `${Math.round(data.clients.topClient!.revenueShare)}% of revenue from ${data.clients.topClient!.name}. Business vulnerable to single client loss.`,
          impact: 'high' as const,
          effort: 'high' as const,
          priority: 7,
          actionable: true,
          actions: [
            { label: 'Develop New Client Pipeline', type: 'navigate', target: '/dashboard/financieel?tab=klanten&action=lead_generation', primary: true },
            { label: 'Diversification Strategy', type: 'modal', payload: { type: 'diversification_plan' } }
          ],
          metadata: {
            ruleId: 'client_concentration_risk',
            confidence: 0.85,
            dataPoints: ['top_client_share']
          }
        })
      },

      // Efficiency warning
      {
        id: 'efficiency_declining',
        name: 'Declining Efficiency',
        priority: 6,
        condition: (data) => {
          const hoursProgress = (data.hours.thisMonth / data.hours.target) * 100
          return hoursProgress < 60 && data.revenue.current < data.revenue.previousMonth * 0.8
        },
        generate: (data) => ({
          id: 'efficiency_declining',
          type: 'warning' as const,
          category: 'efficiency' as const,
          title: 'Productivity Below Target',
          description: `Only ${Math.round((data.hours.thisMonth/data.hours.target)*100)}% of monthly hour target. Revenue down ${Math.round((1-(data.revenue.current/data.revenue.previousMonth))*100)}% vs last month.`,
          impact: 'medium' as const,
          effort: 'medium' as const,
          priority: 6,
          actionable: true,
          actions: [
            { label: 'Review Time Tracking', type: 'navigate', target: '/dashboard/financieel?tab=tijd&action=analysis', primary: true },
            { label: 'Optimize Schedule', type: 'modal', payload: { type: 'schedule_optimization' } }
          ],
          metadata: {
            ruleId: 'efficiency_declining',
            confidence: 0.8,
            dataPoints: ['hours_progress', 'revenue_decline']
          }
        })
      },

      // Rate optimization opportunity
      {
        id: 'rate_optimization',
        name: 'Rate Below Target',
        priority: 5,
        condition: (data) => {
          return data.rate.current < data.rate.target * 0.8
        },
        generate: (data) => ({
          id: 'rate_optimization',
          type: 'opportunity' as const,
          category: 'growth' as const,
          title: 'Rate Optimization Opportunity',
          description: `Current rate €${data.rate.current}/h is ${Math.round((1-(data.rate.current/data.rate.target))*100)}% below target. Potential €${Math.round((data.rate.target - data.rate.current) * data.hours.thisMonth)} extra revenue this month.`,
          impact: 'medium' as const,
          effort: 'low' as const,
          priority: 5,
          actionable: true,
          actions: [
            { label: 'Review Rate Strategy', type: 'navigate', target: '/dashboard/settings?tab=rates', primary: true },
            { label: 'Market Rate Analysis', type: 'external', target: 'https://freelancermap.com/rates' }
          ],
          metadata: {
            ruleId: 'rate_optimization',
            confidence: 0.75,
            dataPoints: ['current_rate', 'target_rate', 'monthly_hours']
          }
        })
      },

      // OPPORTUNITY RULES (Priority 2-4)

      // Growth opportunity
      {
        id: 'capacity_available',
        name: 'Available Capacity for Growth',
        priority: 4,
        condition: (data) => {
          const hoursProgress = (data.hours.thisMonth / data.hours.target) * 100
          return hoursProgress > 100 && data.revenue.current > data.revenue.target
        },
        generate: (data) => ({
          id: 'capacity_available',
          type: 'opportunity' as const,
          category: 'growth' as const,
          title: 'Growth Opportunity: Excess Capacity',
          description: `Exceeding targets by ${Math.round((data.hours.thisMonth/data.hours.target)*100-100)}% hours and €${Math.round(data.revenue.current - data.revenue.target)} revenue. Consider scaling up.`,
          impact: 'medium' as const,
          effort: 'high' as const,
          priority: 4,
          actionable: true,
          actions: [
            { label: 'Explore New Services', type: 'modal', payload: { type: 'service_expansion' } },
            { label: 'Raise Rates', type: 'navigate', target: '/dashboard/settings?tab=rates', primary: true }
          ],
          metadata: {
            ruleId: 'capacity_available',
            confidence: 0.7,
            dataPoints: ['hours_excess', 'revenue_excess']
          }
        })
      },

      // Payment terms optimization
      {
        id: 'payment_terms_slow',
        name: 'Slow Payment Terms',
        priority: 3,
        condition: (data) => {
          return data.invoices.averagePaymentDays > 30
        },
        generate: (data) => ({
          id: 'payment_terms_slow',
          type: 'opportunity' as const,
          category: 'cash_flow' as const,
          title: 'Optimize Payment Terms',
          description: `Average payment time ${data.invoices.averagePaymentDays} days. Improving by 10 days could improve cash flow by €${Math.round(data.revenue.current * 0.33)}.`,
          impact: 'low' as const,
          effort: 'low' as const,
          priority: 3,
          actionable: true,
          actions: [
            { label: 'Review Payment Terms', type: 'navigate', target: '/dashboard/financieel?tab=facturen&action=payment_terms' },
            { label: 'Offer Early Payment Discount', type: 'modal', payload: { type: 'early_payment_discount' } }
          ],
          metadata: {
            ruleId: 'payment_terms_slow',
            confidence: 0.6,
            dataPoints: ['average_payment_days']
          }
        })
      }
    ]
  }

  // Main analysis method
  analyzeData(data: BusinessData): SmartAlert[] {
    const alerts: SmartAlert[] = []

    for (const rule of this.rules) {
      if (rule.condition(data)) {
        alerts.push(rule.generate(data))
      }
    }

    // Sort by priority (highest first) and return top 5
    return alerts
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5)
  }

  // Get specific category alerts
  getAlertsByCategory(data: BusinessData, category: SmartAlert['category']): SmartAlert[] {
    return this.analyzeData(data).filter(alert => alert.category === category)
  }

  // Get actionable alerts only
  getActionableAlerts(data: BusinessData): SmartAlert[] {
    return this.analyzeData(data).filter(alert => alert.actionable)
  }
}

// Helper types
interface SmartRule {
  id: string
  name: string
  priority: number
  condition: (data: BusinessData) => boolean
  generate: (data: BusinessData) => SmartAlert
}

// Export singleton instance
export const smartRulesEngine = new SmartRulesEngine()

// Export types
export type { BusinessData, SmartAlert, SmartAction }