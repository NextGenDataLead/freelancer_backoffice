'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface PieChartProps {
  data: Array<{
    name: string
    value: number
    color: string
  }>
  height?: number
  innerRadius?: number
  outerRadius?: number
  showLegend?: boolean
  showLabels?: boolean
  className?: string
}

export function AnalyticsPieChart({
  data,
  height = 400,
  innerRadius = 0,
  outerRadius = 120,
  showLegend = true,
  showLabels = true,
  className = ''
}: PieChartProps) {
  const renderCustomLabel = (entry: any) => {
    if (!showLabels) return null
    const percent = ((entry.value / data.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)
    return `${percent}%`
  }

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey="value"
            stroke="white"
            strokeWidth={2}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              fontSize: '14px'
            }}
            labelStyle={{ color: '#475569', fontWeight: 'medium' }}
            formatter={(value: number) => [value.toLocaleString(), 'Value']}
          />
          {showLegend && (
            <Legend 
              wrapperStyle={{ fontSize: '14px', color: '#475569' }}
              iconType="circle"
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Donut chart variation
export function AnalyticsDonutChart(props: PieChartProps) {
  return <AnalyticsPieChart {...props} innerRadius={60} />
}