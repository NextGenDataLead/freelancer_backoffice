'use client'

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity } from "lucide-react"
import { NotificationDemo } from '@/components/notifications/notification-demo'

interface RealtimeDemoProps {
  isDashboardConnected: boolean;
  lastUpdate: Date | null;
  simulateMetricUpdate: (metric: string) => void;
  hasMetrics: boolean;
}

export function RealtimeDemo({ isDashboardConnected, lastUpdate, simulateMetricUpdate, hasMetrics }: RealtimeDemoProps) {
  return (
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
  )
}
