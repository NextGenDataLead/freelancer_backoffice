'use client'

import { ComposedChart, Area, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

interface ChartDataPoint {
  month: string
  revenue: number
  target: number
  isCurrentMonth: boolean
}

interface RevenueChartProps {
  data: ChartDataPoint[]
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="mobile-card-glass border border-border/50 p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground mb-1">Month {label}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-xs text-muted-foreground">Revenue:</span>
            </div>
            <span className="text-xs font-bold text-green-400">
              €{payload[0].value.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-accent rounded-full"></div>
              <span className="text-xs text-muted-foreground">Target:</span>
            </div>
            <span className="text-xs font-bold text-accent">
              €{payload[1].value.toLocaleString()}
            </span>
          </div>
          {data.isCurrentMonth && (
            <p className="text-xs text-accent font-medium mt-2 pt-1 border-t border-border/30">
              Current Month
            </p>
          )}
        </div>
      </div>
    )
  }
  return null
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="h-16">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <XAxis 
            dataKey="month" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} />
          
          {/* MTD Revenue Area */}
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="hsl(var(--success))"
            fill="hsl(var(--success))"
            fillOpacity={0.3}
            strokeWidth={1.5}
            dot={{ fill: 'hsl(var(--success))', strokeWidth: 0, r: 3 }}
            activeDot={{ 
              r: 4, 
              fill: 'hsl(var(--success))', 
              strokeWidth: 2, 
              stroke: 'hsl(var(--background))' 
            }}
          />
          
          {/* MTD Target Line */}
          <Line
            type="monotone"
            dataKey="target"
            stroke="hsl(var(--accent))"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ fill: 'hsl(var(--accent))', strokeWidth: 0, r: 2 }}
            activeDot={{ 
              r: 3, 
              fill: 'hsl(var(--accent))', 
              strokeWidth: 2, 
              stroke: 'hsl(var(--background))' 
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}