'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const userGrowthData = [
  { month: 'Jan', users: 2000, newUsers: 150 },
  { month: 'Feb', users: 2100, newUsers: 180 },
  { month: 'Mar', users: 2050, newUsers: 120 },
  { month: 'Apr', users: 2200, newUsers: 220 },
  { month: 'May', users: 2300, newUsers: 190 },
  { month: 'Jun', users: 2280, newUsers: 160 },
  { month: 'Jul', users: 2350, newUsers: 210 }
]

export function UserGrowthChart() {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={userGrowthData}>
        <defs>
          <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorNewUsers" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
          </linearGradient>
        </defs>
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
          tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
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
            value.toLocaleString(), 
            name === 'users' ? 'Total Users' : 'New Users'
          ]}
        />
        <Area 
          type="monotone" 
          dataKey="users" 
          stackId="1"
          stroke="#10b981" 
          strokeWidth={2}
          fill="url(#colorUsers)"
        />
        <Area 
          type="monotone" 
          dataKey="newUsers" 
          stackId="2"
          stroke="#f59e0b" 
          strokeWidth={2}
          fill="url(#colorNewUsers)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}