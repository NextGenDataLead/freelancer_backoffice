'use client'

import * as React from "react"
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"

const data = [
  { name: "Jan", total: 2000, new: 300 },
  { name: "Feb", total: 2100, new: 250 },
  { name: "Mar", total: 2050, new: 280 },
  { name: "Apr", total: 2200, new: 320 },
  { name: "May", total: 2300, new: 350 },
  { name: "Jun", total: 2280, new: 310 },
  { name: "Jul", total: 2350, new: 380 },
]

export function UserGrowthChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total Users" />
        <Line type="monotone" dataKey="new" stroke="#a855f7" name="New Users" />
      </LineChart>
    </ResponsiveContainer>
  )
}
