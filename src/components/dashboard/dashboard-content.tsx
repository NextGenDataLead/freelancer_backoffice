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
  ArrowDownRight,
  User,
  FileText,
  MessageSquare,
  Table,
  Shield
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserButton } from '@clerk/nextjs'
import { RevenueChart } from './widgets/revenue-chart'
import { UserGrowthChart } from './widgets/user-growth-chart'
import { ActivityFeed } from './widgets/activity-feed'
import { useSidebar } from '@/hooks/use-app-state'
import { useNotificationActions, useUnreadCount } from '@/store/notifications-store'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { NotificationToastContainer } from '@/components/notifications/notification-toast'
import { NotificationDemo } from '@/components/notifications/notification-demo'
import { useRealtimeDashboard } from '@/hooks/use-realtime-dashboard'
import { useUserSync } from '@/lib/user-sync'

// Static metric configuration (titles and icons)
const metricConfig = {
  revenue: { title: "Monthly Revenue", icon: DollarSign },
  users: { title: "Active Users", icon: Users },
  conversion: { title: "Conversion Rate", icon: TrendingUp },
  session: { title: "Avg. Session", icon: Activity }
}

// Fallback static data when no real-time data is available
const fallbackMetricsData = [
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
  { name: 'Forms', icon: FileText, href: '/dashboard/forms', active: false },
  { name: 'Modals', icon: MessageSquare, href: '/dashboard/modals', active: false },
  { name: 'Tables', icon: Table, href: '/dashboard/tables', active: false },
  { name: 'Users', icon: Users, href: '/dashboard/users', active: false },
  { name: 'Revenue', icon: DollarSign, href: '/dashboard/revenue', active: false },
  { name: 'Profile', icon: User, href: '/dashboard/profile', active: false },
  { name: 'Privacy', icon: Shield, href: '/dashboard/privacy', active: false },
  { name: 'Settings', icon: Settings, href: '/dashboard/settings', active: false },
]

export function DashboardContent() {
  const { sidebarOpen, toggleSidebar, closeSidebar } = useSidebar()
  const unreadCount = useUnreadCount()
  const { showInfo } = useNotificationActions()
  
  // Initialize user synchronization with Supabase for data fetching
  const { isAuthenticated } = useUserSync()
  
  // Initialize real-time dashboard metrics
  const { metrics: realtimeMetrics, isConnected: isDashboardConnected, lastUpdate, simulateMetricUpdate, hasMetrics } = useRealtimeDashboard()

  // Combine real-time metrics with static configuration and fallback data
  const metricsData = React.useMemo(() => {
    if (hasMetrics) {
      // Use real-time data when available
      return Object.entries(metricConfig).map(([key, config]) => {
        const realtimeData = realtimeMetrics[key]
        if (realtimeData) {
          return {
            title: config.title,
            icon: config.icon,
            ...realtimeData
          }
        }
        // Fallback to static data if specific metric not available
        return fallbackMetricsData.find(metric => metric.title === config.title) || fallbackMetricsData[0]
      })
    }
    // Use fallback data when no real-time data available
    return fallbackMetricsData
  }, [realtimeMetrics, hasMetrics])

  // Demo: Add a welcome notification on first load
  React.useEffect(() => {
    const hasShownWelcome = localStorage.getItem('welcome-notification-shown')
    if (!hasShownWelcome) {
      setTimeout(() => {
        showInfo(
          'Welcome to your Dashboard!',
          'Your enhanced dashboard with state management is ready. All your preferences will be saved automatically.'
        )
        localStorage.setItem('welcome-notification-shown', 'true')
      }, 2000)
    }
  }, [showInfo])

  // Demo: Real-time dashboard updates notification
  React.useEffect(() => {
    if (isDashboardConnected && lastUpdate) {
      showInfo(
        'Dashboard Updated!',
        `Live metrics refreshed at ${lastUpdate.toLocaleTimeString()}`
      )
    }
  }, [lastUpdate, isDashboardConnected, showInfo])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={closeSidebar}
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
            onClick={closeSidebar}
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
                onClick={toggleSidebar}
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
              {/* Dashboard connection indicator */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  isDashboardConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-xs text-slate-500">
                  {isDashboardConnected ? 'Live' : 'Offline'}
                </span>
              </div>
              
              <NotificationBell />
              
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

            {/* Charts section with real charts */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="mr-2 h-5 w-5" />
                    Revenue Trend
                  </CardTitle>
                  <p className="text-sm text-slate-600">
                    Monthly revenue vs target over the last 7 months
                  </p>
                </CardHeader>
                <CardContent>
                  <RevenueChart />
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="mr-2 h-5 w-5" />
                      User Growth
                    </CardTitle>
                    <p className="text-sm text-slate-600">
                      Total and new user acquisition
                    </p>
                  </CardHeader>
                  <CardContent>
                    <UserGrowthChart />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Activity Feed */}
            <ActivityFeed />
            
            {/* Dashboard Real-time Demo */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Notification Demo */}
              <NotificationDemo />
              
              {/* Dashboard Metrics Demo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="mr-2 h-5 w-5" />
                    Dashboard Real-time System Demo
                  </CardTitle>
                  <p className="text-sm text-slate-600">
                    Test the real-time dashboard metrics updates. Connection status: 
                    <span className={`ml-1 font-medium ${isDashboardConnected ? 'text-green-600' : 'text-red-600'}`}>
                      {isDashboardConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-3">Real-time Metric Updates</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => simulateMetricUpdate('revenue')}
                          className="text-xs"
                        >
                          Update Revenue
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => simulateMetricUpdate('users')}
                          className="text-xs"
                        >
                          Update Users
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => simulateMetricUpdate('conversion')}
                          className="text-xs"
                        >
                          Update Conversion
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => simulateMetricUpdate('session')}
                          className="text-xs"
                        >
                          Update Session
                        </Button>
                      </div>
                    </div>
                    
                    {lastUpdate && (
                      <div className="text-xs text-slate-500 pt-2 border-t">
                        <strong>Last Update:</strong> {lastUpdate.toLocaleString()}
                      </div>
                    )}
                    
                    <p className="text-xs text-slate-500">
                      <strong>Real-time dashboard metrics</strong> update the KPI cards above in real-time. 
                      <strong>Status: </strong>{hasMetrics ? 'Using live data' : 'Using fallback data'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      {/* Toast notifications container */}
      <NotificationToastContainer />
    </div>
  )
}