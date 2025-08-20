'use client'

import * as React from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"

const data = [
  { name: "Jan", revenue: 4000, target: 5000 },
  { name: "Feb", revenue: 3000, target: 4500 },
  { name: "Mar", revenue: 5000, target: 5200 },
  { name: "Apr", revenue: 4500, target: 4800 },
  { name: "May", revenue: 6000, target: 5500 },
  { name: "Jun", revenue: 5500, target: 5800 },
  { name: "Jul", revenue: 7000, target: 6500 },
]

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
        <Bar dataKey="target" fill="#a855f7" name="Target" />
      </BarChart>
    </ResponsiveContainer>
  )
}
