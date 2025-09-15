'use client'

import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  ComposedChart
} from 'recharts'

// Mock financial data for charts
const revenueData = [
  { month: 'Jan', revenue: 6800, expenses: 2100, profit: 4700, target: 7000 },
  { month: 'Feb', revenue: 7200, expenses: 1950, profit: 5250, target: 7000 },
  { month: 'Mar', revenue: 8100, expenses: 2200, profit: 5900, target: 7000 },
  { month: 'Apr', revenue: 7800, expenses: 2050, profit: 5750, target: 7000 },
  { month: 'May', revenue: 8500, expenses: 1800, profit: 6700, target: 7000 },
  { month: 'Jun', revenue: 9200, expenses: 2400, profit: 6800, target: 7000 },
  { month: 'Jul', revenue: 8900, expenses: 2150, profit: 6750, target: 7000 },
  { month: 'Aug', revenue: 9800, expenses: 2300, profit: 7500, target: 7000 },
  { month: 'Sep', revenue: 10200, expenses: 2500, profit: 7700, target: 7000 },
  { month: 'Oct', revenue: 8500, expenses: 1200, profit: 7300, target: 7000 }
]

const clientRevenueData = [
  { name: 'Tech Corp', revenue: 12500, growth: 15.2, color: '#10B981' },
  { name: 'Design Studio', revenue: 8900, growth: 8.7, color: '#F59E0B' },
  { name: 'Marketing Inc', revenue: 7200, growth: -2.1, color: '#EF4444' },
  { name: 'Startup Labs', revenue: 6800, growth: 22.5, color: '#8B5CF6' },
  { name: 'Others', revenue: 4200, growth: 5.3, color: '#6B7280' }
]

const timeTrackingData = [
  { week: 'W1', billable: 32, nonBillable: 8, target: 35 },
  { week: 'W2', billable: 35, nonBillable: 5, target: 35 },
  { week: 'W3', billable: 28, nonBillable: 12, target: 35 },
  { week: 'W4', billable: 38, nonBillable: 7, target: 35 },
  { week: 'W5', billable: 33, nonBillable: 9, target: 35 },
  { week: 'W6', billable: 41, nonBillable: 4, target: 35 },
  { week: 'W7', billable: 36, nonBillable: 6, target: 35 },
  { week: 'W8', billable: 39, nonBillable: 8, target: 35 }
]

const cashFlowData = [
  { date: '2024-01', incoming: 15200, outgoing: 4800, net: 10400 },
  { date: '2024-02', incoming: 18500, outgoing: 5200, net: 13300 },
  { date: '2024-03', incoming: 14200, outgoing: 6100, net: 8100 },
  { date: '2024-04', incoming: 19800, outgoing: 4900, net: 14900 },
  { date: '2024-05', incoming: 21200, outgoing: 5800, net: 15400 },
  { date: '2024-06', incoming: 17600, outgoing: 6200, net: 11400 },
  { date: '2024-07', incoming: 22800, outgoing: 5100, net: 17700 },
  { date: '2024-08', incoming: 19400, outgoing: 7200, net: 12200 },
  { date: '2024-09', incoming: 24100, outgoing: 5900, net: 18200 },
  { date: '2024-10', incoming: 20500, outgoing: 4600, net: 15900 }
]

// Custom tooltip for dark theme
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="mobile-card-glass p-3 border border-border/20 shadow-lg">
        <p className="text-sm font-medium text-foreground mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.dataKey}:</span>
            <span className="font-medium text-foreground">
              {typeof entry.value === 'number' ?
                (typeof entry.dataKey === 'string' && (entry.dataKey.includes('rate') || entry.dataKey.includes('growth'))) ?
                  `${entry.value}%` :
                  `€${entry.value.toLocaleString()}`
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

// Chart color scheme for dark theme
const chartColors = {
  primary: 'hsl(var(--chart-blue))',
  success: 'hsl(var(--chart-green))', 
  warning: 'hsl(var(--chart-orange))',
  danger: '#EF4444',
  purple: 'hsl(var(--chart-purple))',
  grid: 'hsl(var(--border))',
  text: 'hsl(var(--muted-foreground))'
}

// Revenue & Profit Trend Chart
export function RevenueTrendChart({
  data
}: {
  data?: any[]
}) {
  const chartData = data && data.length > 0 ? data.map(item => ({
    ...item,
    revenue: item.revenue || 0,
    // Add breakdown lines - use actual data if available, otherwise estimate
    timeRevenue: item.timeRevenue || item.revenue * 0.85 || 0,
    platformRevenue: item.subscriptionRevenue || item.revenue * 0.15 || 0
  })) : revenueData.map(item => ({
    ...item,
    timeRevenue: item.revenue * 0.85,
    platformRevenue: item.revenue * 0.15
  }))
  return (
    <div className="h-64 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} opacity={0.3} />
          <XAxis 
            dataKey="month" 
            stroke={chartColors.text}
            fontSize={12}
            tickLine={false}
          />
          <YAxis 
            stroke={chartColors.text}
            fontSize={12}
            tickLine={false}
            tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Target line */}
          <ReferenceLine 
            y={7000} 
            stroke={chartColors.warning} 
            strokeDasharray="5 5" 
            opacity={0.7}
          />
          
          {/* Revenue area */}
          <Area
            type="monotone"
            dataKey="revenue"
            fill={`url(#revenueGradient)`}
            stroke={chartColors.primary}
            strokeWidth={2}
            fillOpacity={0.1}
          />
          
          {/* Expenses area */}
          <Area
            type="monotone"
            dataKey="expenses"
            fill={`url(#expenseGradient)`}
            stroke={chartColors.danger}
            strokeWidth={2}
            fillOpacity={0.1}
          />
          
          {/* Profit line */}
          <Line
            type="monotone"
            dataKey="profit"
            stroke={chartColors.success}
            strokeWidth={3}
            dot={{ fill: chartColors.success, strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: chartColors.success, stroke: 'none' }}
          />

          {/* Time Revenue dotted line */}
          <Line
            type="monotone"
            dataKey="timeRevenue"
            stroke={chartColors.primary}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{ r: 4, fill: chartColors.primary, stroke: 'none' }}
          />

          {/* Platform Revenue dotted line */}
          <Line
            type="monotone"
            dataKey="platformRevenue"
            stroke={chartColors.purple}
            strokeWidth={2}
            strokeDasharray="8 3"
            dot={false}
            activeDot={{ r: 4, fill: chartColors.purple, stroke: 'none' }}
          />
          
          {/* Gradients */}
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColors.danger} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={chartColors.danger} stopOpacity={0}/>
            </linearGradient>
          </defs>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// Client Revenue Distribution Chart
export function ClientRevenueChart({
  data
}: {
  data?: any[]
}) {
  const chartData = data && data.length > 0 ? data : clientRevenueData
  return (
    <div className="h-48 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            paddingAngle={2}
            dataKey="revenue"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Time Tracking Analytics Chart
export function TimeTrackingChart({
  data
}: {
  data?: any[]
}) {
  const chartData = data && data.length > 0 ? data : timeTrackingData
  return (
    <div className="h-48 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} opacity={0.3} />
          <XAxis 
            dataKey="week" 
            stroke={chartColors.text}
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke={chartColors.text}
            fontSize={12}
            tickLine={false}
            tickFormatter={(value) => `${value}h`}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Target line */}
          <ReferenceLine 
            y={35} 
            stroke={chartColors.warning} 
            strokeDasharray="5 5"
            opacity={0.7}
          />
          
          <Bar
            dataKey="billable"
            stackId="hours"
            fill={chartColors.success}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="nonBillable"
            stackId="hours"
            fill={chartColors.danger}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Cash Flow Analysis Chart
export function CashFlowChart({
  data
}: {
  data?: any[]
}) {
  const chartData = data && data.length > 0 ? data : cashFlowData
  return (
    <div className="h-64 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} opacity={0.3} />
          <XAxis 
            dataKey="date" 
            stroke={chartColors.text}
            fontSize={12}
            tickLine={false}
            tickFormatter={(value) => value.slice(-2)}
          />
          <YAxis 
            stroke={chartColors.text}
            fontSize={12}
            tickLine={false}
            tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Incoming bars */}
          <Bar
            dataKey="incoming"
            fill={chartColors.success}
            opacity={0.8}
            radius={[2, 2, 0, 0]}
          />

          {/* Outgoing bars */}
          <Bar
            dataKey="outgoing"
            fill={chartColors.danger}
            opacity={0.8}
            radius={[2, 2, 0, 0]}
          />

          {/* Net line */}
          <Line
            type="monotone"
            dataKey="net"
            stroke={chartColors.primary}
            strokeWidth={3}
            dot={{ fill: chartColors.primary, strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: chartColors.primary, stroke: 'none' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// Export data for use in the main component
export { revenueData, clientRevenueData, timeTrackingData, cashFlowData }

// Default export for dynamic import
export default function RechartsComponents() {
  return {
    RevenueTrendChart,
    ClientRevenueChart, 
    TimeTrackingChart,
    CashFlowChart
  }
}