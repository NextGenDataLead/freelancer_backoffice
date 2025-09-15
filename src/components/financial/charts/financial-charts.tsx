'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'

// Dynamically import Recharts components to avoid SSR issues
const RechartsComponents = dynamic(() => import('./recharts-components'), {
  ssr: false,
  loading: () => (
    <div className="h-64 sm:h-80 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
})
import {
  TrendingUp,
  TrendingDown,
  PieChartIcon,
  Activity,
  BarChart3
} from 'lucide-react'

// Import data and components dynamically
const RevenueTrendChart = dynamic(() => 
  import('./recharts-components').then(mod => ({ default: mod.RevenueTrendChart })), 
  { ssr: false, loading: () => <ChartSkeleton /> }
)

const ClientRevenueChart = dynamic(() => 
  import('./recharts-components').then(mod => ({ default: mod.ClientRevenueChart })), 
  { ssr: false, loading: () => <ChartSkeleton /> }
)

const TimeTrackingChart = dynamic(() => 
  import('./recharts-components').then(mod => ({ default: mod.TimeTrackingChart })), 
  { ssr: false, loading: () => <ChartSkeleton /> }
)

const CashFlowChart = dynamic(() => 
  import('./recharts-components').then(mod => ({ default: mod.CashFlowChart })), 
  { ssr: false, loading: () => <ChartSkeleton /> }
)

// Loading skeleton component
const ChartSkeleton = () => (
  <div className="h-48 sm:h-64 lg:h-80 flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
)


interface FinancialData {
  revenueData: any[]
  clientRevenueData: any[]
  timeAnalyticsData: any[]
  cashFlowData: any[]
  summary: {
    totalRevenue: number
    totalClients: number
    averageRevenuePerClient: number
    topClient: {
      name: string
      revenue: number
      percentage: number
    } | null
  }
  timeAnalyticsSummary: {
    averageBillable: number
    averageEfficiency: number
    target: number
  } | null
  cashFlowSummary: {
    totalIncoming: number
    totalOutgoing: number
    totalNet: number
    averageMonthlyNet: number
  } | null
}


export function FinancialCharts() {
  const [loading, setLoading] = useState(true)
  const [financialData, setFinancialData] = useState<FinancialData>({
    revenueData: [],
    clientRevenueData: [],
    timeAnalyticsData: [],
    cashFlowData: [],
    summary: {
      totalRevenue: 0,
      totalClients: 0,
      averageRevenuePerClient: 0,
      topClient: null
    },
    timeAnalyticsSummary: null,
    cashFlowSummary: null
  })


  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        setLoading(true)

        // Fetch all financial data
        const [revenueResponse, clientResponse, timeAnalyticsResponse, cashFlowResponse] = await Promise.all([
          fetch('/api/financial/revenue-trend'),
          fetch('/api/financial/client-revenue'),
          fetch('/api/time-entries/analytics'),
          fetch('/api/cash-flow/analytics')
        ])

        if (!revenueResponse.ok || !clientResponse.ok || !timeAnalyticsResponse.ok || !cashFlowResponse.ok) {
          throw new Error('Failed to fetch financial data')
        }

        const revenueResult = await revenueResponse.json()
        const clientResult = await clientResponse.json()
        const timeAnalyticsResult = await timeAnalyticsResponse.json()
        const cashFlowResult = await cashFlowResponse.json()

        if (revenueResult.success && clientResult.success) {
          setFinancialData({
            revenueData: revenueResult.data || [],
            clientRevenueData: clientResult.data.clients || [],
            timeAnalyticsData: timeAnalyticsResult.success ? timeAnalyticsResult.data.weeklyData || [] : [],
            cashFlowData: cashFlowResult.success ? cashFlowResult.data.monthlyData || [] : [],
            summary: clientResult.data.summary || {
              totalRevenue: 0,
              totalClients: 0,
              averageRevenuePerClient: 0,
              topClient: null
            },
            timeAnalyticsSummary: timeAnalyticsResult.success ? timeAnalyticsResult.data.summary : null,
            cashFlowSummary: cashFlowResult.success ? cashFlowResult.data.summary : null
          })
        }

      } catch (error) {
        console.error('Failed to fetch financial data:', error)
        // Keep default empty state on error
      } finally {
        setLoading(false)
      }
    }

    fetchFinancialData()
  }, [])
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Revenue & Profit Trend */}
      <div className="mobile-card-glass space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-primary chart-glow-blue" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mobile-sharp-text">Revenue & Profit Trend (YTD)</h3>
              <p className="text-sm text-muted-foreground">Year-to-date performance overview</p>
            </div>
          </div>
          <div className="mobile-status-indicator status-active">
            <span>+12.5% YoY</span>
          </div>
        </div>
        
        {loading ? <ChartSkeleton /> : <RevenueTrendChart data={financialData.revenueData} />}

        {/* Chart Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground mb-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-primary"></div>
            <span>Total Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-400"></div>
            <span>Expenses</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-green-400"></div>
            <span>Profit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 border-t-2 border-dashed border-primary"></div>
            <span>Time Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 border-t-2 border-dashed border-purple-400"></div>
            <span>Platform Revenue</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/20">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Avg Revenue</p>
            <p className="text-sm font-bold text-primary">
              €{loading ? '...' : Math.round((financialData.revenueData.reduce((sum, item) => sum + (item.revenue || 0), 0) / Math.max(financialData.revenueData.length, 1))).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Avg Expenses</p>
            <p className="text-sm font-bold text-red-400">
              €{loading ? '...' : Math.round((financialData.revenueData.reduce((sum, item) => sum + (item.expenses || 0), 0) / Math.max(financialData.revenueData.length, 1))).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Avg Profit</p>
            <p className="text-sm font-bold text-green-400">
              €{loading ? '...' : Math.round((financialData.revenueData.reduce((sum, item) => sum + ((item.revenue || 0) - (item.expenses || 0)), 0) / Math.max(financialData.revenueData.length, 1))).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Growth</p>
            <p className="text-sm font-bold text-green-400">
              {loading ? '...' : financialData.revenueData.length > 1 ?
                `${financialData.revenueData[financialData.revenueData.length - 1]?.growth || 0}%` : '0%'}
            </p>
          </div>
        </div>
      </div>

      {/* Client Revenue Distribution & Time Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Client Revenue Distribution */}
        <div className="mobile-card-glass space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/20 rounded-lg">
              <PieChartIcon className="h-5 w-5 text-green-400 chart-glow-green" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mobile-sharp-text">Client Revenue</h3>
              <p className="text-sm text-muted-foreground">Top performing clients</p>
            </div>
          </div>
          
          {loading ? <ChartSkeleton /> : <ClientRevenueChart data={financialData.clientRevenueData} />}

          <div className="space-y-2">
            {loading ? (
              // Loading skeleton for client list
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-muted animate-pulse" />
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-12 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))
            ) : (
              financialData.clientRevenueData.slice(0, 5).map((client, index) => (
                <div key={client.id || index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: client.color }}
                    />
                    <span className="font-medium truncate">{client.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">€{client.revenue.toLocaleString()}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      client.percentage > 20
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {client.percentage}%
                    </span>
                  </div>
                </div>
              ))
            )}
            {!loading && financialData.clientRevenueData.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No client revenue data available
              </div>
            )}
          </div>
        </div>

        {/* Time Tracking Analytics */}
        <div className="mobile-card-glass space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Activity className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mobile-sharp-text">Time Analytics</h3>
              <p className="text-sm text-muted-foreground">Rolling 8 weeks billable hours</p>
            </div>
          </div>
          
          <TimeTrackingChart data={financialData.timeAnalyticsData} />
          
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/20">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Avg Billable</p>
              <p className="text-sm font-bold text-green-400">
                {loading ? '...' : financialData.timeAnalyticsSummary ? `${financialData.timeAnalyticsSummary.averageBillable}h` : '0h'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Efficiency</p>
              <p className="text-sm font-bold text-primary">
                {loading ? '...' : financialData.timeAnalyticsSummary ? `${financialData.timeAnalyticsSummary.averageEfficiency}%` : '0%'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Target</p>
              <p className="text-sm font-bold text-yellow-400">
                {loading ? '...' : financialData.timeAnalyticsSummary ? `${financialData.timeAnalyticsSummary.target}h` : '35h'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow Analysis */}
      <div className="mobile-card-glass space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/20 rounded-lg">
              <BarChart3 className="h-5 w-5 text-accent chart-glow-orange" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mobile-sharp-text">Cash Flow Analysis (YTD)</h3>
              <p className="text-sm text-muted-foreground">Year-to-date cash flow trends</p>
            </div>
          </div>
          <div className="mobile-status-indicator status-active">
            <span>€{loading ? '...' : financialData.cashFlowSummary ? `${(financialData.cashFlowSummary.totalNet / 1000).toFixed(0)}K Net` : '0K Net'}</span>
          </div>
        </div>
        
        <CashFlowChart data={financialData.cashFlowData} />
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/20">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Incoming</p>
            <p className="text-sm font-bold text-green-400">
              {loading ? '...' : financialData.cashFlowSummary ? `€${(financialData.cashFlowSummary.totalIncoming / 1000).toFixed(1)}K` : '€0K'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Outgoing</p>
            <p className="text-sm font-bold text-red-400">
              {loading ? '...' : financialData.cashFlowSummary ? `€${(financialData.cashFlowSummary.totalOutgoing / 1000).toFixed(1)}K` : '€0K'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Net Cash Flow</p>
            <p className="text-sm font-bold text-primary">
              {loading ? '...' : financialData.cashFlowSummary ? `€${(financialData.cashFlowSummary.totalNet / 1000).toFixed(1)}K` : '€0K'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Avg Monthly</p>
            <p className="text-sm font-bold text-yellow-400">
              {loading ? '...' : financialData.cashFlowSummary ? `€${(financialData.cashFlowSummary.averageMonthlyNet / 1000).toFixed(1)}K` : '€0K'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}