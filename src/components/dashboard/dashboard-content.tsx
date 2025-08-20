'use client'

import * as React from "react"
import { useNotificationActions, useUnreadCount } from '@/store/notifications-store'
import { NotificationToastContainer } from '@/components/notifications/notification-toast'
import { useRealtimeDashboard } from '@/hooks/use-realtime-dashboard'
import { useUserSync } from '@/lib/user-sync'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { MetricsGrid } from './MetricsGrid'
import { RevenueChart } from './widgets/revenue-chart'
import { UserGrowthChart } from './widgets/user-growth-chart'
import { ActivityFeed } from './widgets/activity-feed'
import { RealtimeDemo } from './RealtimeDemo'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Users } from 'lucide-react'

export function DashboardContent() {
  const { showInfo } = useNotificationActions()
  
  // Initialize user synchronization with Supabase for data fetching
  const { isAuthenticated } = useUserSync()
  
  // Initialize real-time dashboard metrics
  const { metrics: realtimeMetrics, isConnected: isDashboardConnected, lastUpdate, simulateMetricUpdate, hasMetrics } = useRealtimeDashboard()

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
      <Sidebar />

      {/* Main content */}
      <div className="lg:pl-64">
        <Header isDashboardConnected={isDashboardConnected} />

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

            <MetricsGrid realtimeMetrics={realtimeMetrics} hasMetrics={hasMetrics} />

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
            
            <RealtimeDemo 
              isDashboardConnected={isDashboardConnected} 
              lastUpdate={lastUpdate} 
              simulateMetricUpdate={simulateMetricUpdate} 
              hasMetrics={hasMetrics} 
            />
          </div>
        </div>
      </div>
      
      {/* Toast notifications container */}
      <NotificationToastContainer />
    </div>
  )
}
