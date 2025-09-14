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
  Euro, 
  Calendar,
  DollarSign,
  BarChart3,
  PieChartIcon,
  Activity
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

// Mock data (simplified for main component)
const clientRevenueData = [
  { name: 'Tech Corp', revenue: 12500, growth: 15.2, color: '#10B981' },
  { name: 'Design Studio', revenue: 8900, growth: 8.7, color: '#F59E0B' },
  { name: 'Marketing Inc', revenue: 7200, growth: -2.1, color: '#EF4444' },
  { name: 'Startup Labs', revenue: 6800, growth: 22.5, color: '#8B5CF6' },
  { name: 'Others', revenue: 4200, growth: 5.3, color: '#6B7280' }
]

export function FinancialCharts() {
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
              <h3 className="text-lg font-semibold mobile-sharp-text">Revenue & Profit Trend</h3>
              <p className="text-sm text-muted-foreground">Monthly performance overview</p>
            </div>
          </div>
          <div className="mobile-status-indicator status-active">
            <span>+12.5% YoY</span>
          </div>
        </div>
        
        <RevenueTrendChart />
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/20">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Avg Revenue</p>
            <p className="text-sm font-bold text-primary">€8,610</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Avg Expenses</p>
            <p className="text-sm font-bold text-red-400">€2,067</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Avg Profit</p>
            <p className="text-sm font-bold text-green-400">€6,543</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Growth</p>
            <p className="text-sm font-bold text-green-400">+12.5%</p>
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
          
          <ClientRevenueChart />
          
          <div className="space-y-2">
            {clientRevenueData.map((client, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
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
                    client.growth > 0 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {client.growth > 0 ? '+' : ''}{client.growth}%
                  </span>
                </div>
              </div>
            ))}
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
              <p className="text-sm text-muted-foreground">Weekly billable hours</p>
            </div>
          </div>
          
          <TimeTrackingChart />
          
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/20">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Avg Billable</p>
              <p className="text-sm font-bold text-green-400">35.2h</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Efficiency</p>
              <p className="text-sm font-bold text-primary">82%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Target</p>
              <p className="text-sm font-bold text-yellow-400">35h</p>
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
              <h3 className="text-lg font-semibold mobile-sharp-text">Cash Flow Analysis</h3>
              <p className="text-sm text-muted-foreground">Monthly cash flow trends</p>
            </div>
          </div>
          <div className="mobile-status-indicator status-active">
            <span>€158K Net</span>
          </div>
        </div>
        
        <CashFlowChart />
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/20">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Incoming</p>
            <p className="text-sm font-bold text-green-400">€193.3K</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Outgoing</p>
            <p className="text-sm font-bold text-red-400">€55.8K</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Net Cash Flow</p>
            <p className="text-sm font-bold text-primary">€137.5K</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Avg Monthly</p>
            <p className="text-sm font-bold text-yellow-400">€13.8K</p>
          </div>
        </div>
      </div>
    </div>
  )
}