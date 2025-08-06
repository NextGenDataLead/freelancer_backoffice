'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const revenueData = [
  { month: 'Jan', revenue: 42000, target: 45000 },
  { month: 'Feb', revenue: 38000, target: 45000 },
  { month: 'Mar', revenue: 51000, target: 45000 },
  { month: 'Apr', revenue: 47500, target: 45000 },
  { month: 'May', revenue: 62000, target: 45000 },
  { month: 'Jun', revenue: 58500, target: 45000 },
  { month: 'Jul', revenue: 70000, target: 45000 }
]

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={revenueData}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="month" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#64748b' }}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e2e8f0', 
            borderRadius: '8px',
            fontSize: '12px'
          }}
          labelStyle={{ color: '#0f172a', fontWeight: '500' }}
          formatter={(value: number, name: string) => [
            `$${value.toLocaleString()}`, 
            name === 'revenue' ? 'Revenue' : 'Target'
          ]}
        />
        <Line 
          type="monotone" 
          dataKey="revenue" 
          stroke="#3b82f6" 
          strokeWidth={3}
          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, fill: '#3b82f6' }}
        />
        <Line 
          type="monotone" 
          dataKey="target" 
          stroke="#e2e8f0" 
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
          activeDot={{ r: 4, fill: '#94a3b8' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}