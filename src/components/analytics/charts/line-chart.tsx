'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface LineChartProps {
  data: Array<Record<string, any>>
  lines: Array<{
    key: string
    name: string
    color: string
    strokeDasharray?: string
  }>
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  xAxisKey?: string
  className?: string
}

export function AnalyticsLineChart({
  data,
  lines,
  height = 400,
  showGrid = true,
  showLegend = true,
  xAxisKey = 'name',
  className = ''
}: LineChartProps) {
  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
          )}
          <XAxis 
            dataKey={xAxisKey}
            className="text-slate-600 text-sm"
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            className="text-slate-600 text-sm"
            axisLine={false}
            tickLine={false}
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
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color}
              strokeWidth={2}
              strokeDasharray={line.strokeDasharray}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}