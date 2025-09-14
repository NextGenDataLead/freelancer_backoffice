'use client'

import { ComposedChart, Area, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

interface RateDataPoint {
  month: string
  rate: number
  target?: number
  isCurrentMonth: boolean
}

interface RateChartProps {
  data: RateDataPoint[]
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
              <span className="text-xs text-muted-foreground">Rate:</span>
            </div>
            <span className="text-xs font-bold text-green-400">
              €{data.rate}/hour
            </span>
          </div>
          {data.target && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="text-xs text-muted-foreground">Target:</span>
              </div>
              <span className="text-xs font-bold text-accent">
                €{data.target}/hour
              </span>
            </div>
          )}
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

export function RateChart({ data }: RateChartProps) {
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
          
          {/* Hourly Rate Area - matching Revenue MTD */}
          <Area
            type="monotone"
            dataKey="rate"
            stroke="hsl(var(--success))"
            fill="hsl(var(--success))"
            fillOpacity={0.3}
            strokeWidth={1.5}
          />
          
          {/* Rate Target Line - matching Revenue MTD */}
          {data.some(point => point.target) && (
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
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}