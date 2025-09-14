'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  ArrowUpRight,
  ArrowDownRight,
  LucideIcon
} from "lucide-react"

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: LucideIcon;
  trend: number[];
}

export function MetricCard({ title, value, change, changeType, icon: Icon, trend }: MetricCardProps) {
  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900 mb-1">
          {value}
        </div>
        <div className="flex items-center space-x-2">
          <div className={`flex items-center text-sm font-medium ${
            changeType === 'positive' ? 'text-green-600' :
            changeType === 'negative' ? 'text-red-600' :
            'text-slate-600'
          }`}>
            {changeType === 'positive' ? (
              <ArrowUpRight className="h-3 w-3 mr-1" />
            ) : changeType === 'negative' ? (
              <ArrowDownRight className="h-3 w-3 mr-1" />
            ) : null}
            {change}
          </div>
          <span className="text-sm text-slate-500">vs last month</span>
        </div>
        
        {/* Mini sparkline */}
        <div className="mt-4 h-8 flex items-end space-x-1">
          {trend.map((value, i, arr) => {
            const maxValue = Math.max(...arr)
            const height = (value / maxValue) * 100
            return (
              <div
                key={i}
                className={`flex-1 rounded-sm transition-colors ${
                  changeType === 'positive' ? 'bg-green-200 group-hover:bg-green-300' :
                  changeType === 'negative' ? 'bg-red-200 group-hover:bg-red-300' :
                  'bg-blue-200 group-hover:bg-blue-300'
                }`}
                style={{ height: `${Math.max(height, 10)}%` }}
              />
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
