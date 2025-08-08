'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface BarChartProps {
  data: Array<Record<string, any>>
  bars: Array<{
    key: string
    name: string
    color: string
  }>
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  xAxisKey?: string
  orientation?: 'vertical' | 'horizontal'
  className?: string
}

export function AnalyticsBarChart({
  data,
  bars,
  height = 400,
  showGrid = true,
  showLegend = true,
  xAxisKey = 'name',
  orientation = 'vertical',
  className = ''
}: BarChartProps) {
  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart 
          data={data} 
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          layout={orientation === 'horizontal' ? 'horizontal' : 'vertical'}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
          )}
          <XAxis 
            dataKey={xAxisKey}
            className="text-slate-600 text-sm"
            axisLine={false}
            tickLine={false}
            type={orientation === 'horizontal' ? 'number' : 'category'}
          />
          <YAxis 
            className="text-slate-600 text-sm"
            axisLine={false}
            tickLine={false}
            type={orientation === 'horizontal' ? 'category' : 'number'}
            dataKey={orientation === 'horizontal' ? xAxisKey : undefined}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              fontSize: '14px'
            }}
            labelStyle={{ color: '#475569', fontWeight: 'medium' }}
          />
          {showLegend && (
            <Legend 
              wrapperStyle={{ fontSize: '14px', color: '#475569' }}
            />
          )}
          {bars.map((bar) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              name={bar.name}
              fill={bar.color}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}