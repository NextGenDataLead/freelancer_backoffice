'use client'

import * as React from "react"
import Link from 'next/link'
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  DollarSign,
  Activity,
  Settings,
  Bell,
  Menu,
  X,
  Home,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserButton } from '@clerk/nextjs'

// Sample dashboard data
const metricsData = [
  {
    title: "Monthly Revenue",
    value: "$45,231",
    change: "+20.1%",
    changeType: "positive" as const,
    icon: DollarSign,
    trend: [4000, 3000, 5000, 4500, 6000, 5500, 7000]
  },
  {
    title: "Active Users",
    value: "2,350",
    change: "+8.2%", 
    changeType: "positive" as const,
    icon: Users,
    trend: [2000, 2100, 2050, 2200, 2300, 2280, 2350]
  },
  {
    title: "Conversion Rate",
    value: "3.24%",
    change: "-0.4%",
    changeType: "negative" as const, 
    icon: TrendingUp,
    trend: [3.8, 3.6, 3.4, 3.2, 3.3, 3.1, 3.24]
  },
  {
    title: "Avg. Session",
    value: "4m 32s",
    change: "+12.5%",
    changeType: "positive" as const,
    icon: Activity,
    trend: [240, 250, 245, 260, 270, 268, 272]
  }
]

const navigationItems = [
  { name: 'Overview', icon: Home, href: '/dashboard', active: true },
  { name: 'Analytics', icon: BarChart3, href: '/dashboard/analytics', active: false },
  { name: 'Users', icon: Users, href: '/dashboard/users', active: false },
  { name: 'Revenue', icon: DollarSign, href: '/dashboard/revenue', active: false },
  { name: 'Settings', icon: Settings, href: '/dashboard/settings', active: false },
]

export function DashboardContent() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-violet-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">SaaS Template</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="mt-6 px-4">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={item.active ? "default" : "ghost"}
                  className="w-full justify-start text-left"
                  size="sm"
                >
                  <item.icon className="mr-3 h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navigation */}
        <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <Home className="h-4 w-4" />
                <ChevronRight className="h-4 w-4" />
                <span className="font-medium text-slate-900">Dashboard</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  3
                </Badge>
              </Button>
              
              {/* Clerk User Button with Sign Out */}
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="space-y-8">
            {/* Welcome section */}
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Welcome back!
              </h1>
              <p className="text-slate-600 mt-1">
                Here's what's happening with your business today.
              </p>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {metricsData.map((metric) => (
                <Card key={metric.title} className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      {metric.title}
                    </CardTitle>
                    <metric.icon className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900 mb-1">
                      {metric.value}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`flex items-center text-sm font-medium ${
                        metric.changeType === 'positive' ? 'text-green-600' :
                        metric.changeType === 'negative' ? 'text-red-600' :
                        'text-slate-600'
                      }`}>
                        {metric.changeType === 'positive' ? (
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                        ) : metric.changeType === 'negative' ? (
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                        ) : null}
                        {metric.change}
                      </div>
                      <span className="text-sm text-slate-500">vs last month</span>
                    </div>
                    
                    {/* Mini sparkline */}
                    <div className="mt-4 h-8 flex items-end space-x-1">
                      {metric.trend.map((value, i, arr) => {
                        const maxValue = Math.max(...arr)
                        const height = (value / maxValue) * 100
                        return (
                          <div
                            key={i}
                            className={`flex-1 rounded-sm transition-colors ${
                              metric.changeType === 'positive' ? 'bg-green-200 group-hover:bg-green-300' :
                              metric.changeType === 'negative' ? 'bg-red-200 group-hover:bg-red-300' :
                              'bg-blue-200 group-hover:bg-blue-300'
                            }`}
                            style={{ height: `${Math.max(height, 10)}%` }}
                          />
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts section placeholders */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="mr-2 h-5 w-5" />
                    Revenue Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg">
                    <div className="text-slate-600 text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2 text-blue-500" />
                      <p>Interactive Chart Coming Soon</p>
                      <p className="text-sm">Chart components will be added in Phase 2</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    User Growth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg">
                    <div className="text-slate-600 text-center">
                      <Users className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      <p>Interactive Chart Coming Soon</p>
                      <p className="text-sm">Chart components will be added in Phase 2</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}