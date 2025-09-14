'use client'

import { ComposedChart, Area, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

interface SubscriptionDataPoint {
  month: string
  mau: number
  avgFee: number
  target?: number
  isCurrentMonth: boolean
}

interface SubscriptionChartProps {
  data: SubscriptionDataPoint[]
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
              <span className="text-xs text-muted-foreground">MAU:</span>
            </div>
            <span className="text-xs font-bold text-green-400">
              {data.mau}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-xs text-muted-foreground">Avg Fee:</span>
            </div>
            <span className="text-xs font-bold text-green-400">
              €{data.avgFee.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="text-xs text-muted-foreground">MRR:</span>
            </div>
            <span className="text-xs font-bold text-primary">
              €{(data.mau * data.avgFee).toFixed(2)}
            </span>
          </div>
          {data.target && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="text-xs text-muted-foreground">Target:</span>
              </div>
              <span className="text-xs font-bold text-accent">
                {data.target}
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

export function SubscriptionChart({ data }: SubscriptionChartProps) {
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
          
          {/* MAU Area */}
          <Area
            type="monotone"
            dataKey="mau"
            stroke="hsl(var(--success))"
            fill="hsl(var(--success))"
            fillOpacity={0.3}
            strokeWidth={1.5}
          />
          
          {/* MAU Target Line (if available) */}
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