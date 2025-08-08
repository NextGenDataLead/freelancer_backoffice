'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNotificationActions } from '@/store/notifications-store'
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications'
import { useAuth } from '@clerk/nextjs'

export function NotificationDemo() {
  const { showSuccess, showError, showInfo, showWarning } = useNotificationActions()
  const { createNotification } = useRealtimeNotifications()
  const { userId } = useAuth()

  const handleLocalNotification = (type: 'info' | 'success' | 'warning' | 'error') => {
    const notifications = {
      info: () => showInfo('Info Notification', 'This is an informational message that will auto-dismiss in 8 seconds.'),
      success: () => showSuccess('Success!', 'Your action was completed successfully.'),
      warning: () => showWarning('Warning', 'Please review this important information.'),
      error: () => showError('Error Occurred', 'Something went wrong. Please try again.', true)
    }
    
    notifications[type]()
  }

  const handleDatabaseNotification = async (type: 'info' | 'success' | 'warning' | 'error') => {
    if (!userId) {
      showError('Authentication Error', 'You must be signed in to create database notifications.')
      return
    }

    try {
      const notifications = {
        info: {
          title: 'System Update',
          message: 'A new feature has been added to your dashboard. Check it out!',
          data: { actionLabel: 'View Feature', actionUrl: '/dashboard' }
        },
        success: {
          title: 'Payment Processed',
          message: 'Your monthly subscription payment has been processed successfully.',
          data: { actionLabel: 'View Receipt', actionUrl: '/billing' }
        },
        warning: {
          title: 'Storage Warning',
          message: 'You are approaching your storage limit. Consider upgrading your plan.',
          data: { actionLabel: 'Upgrade Plan', actionUrl: '/pricing' }
        },
        error: {
          title: 'Backup Failed',
          message: 'Your scheduled backup could not be completed. Please check your settings.',
          data: { actionLabel: 'Check Settings', actionUrl: '/settings' }
        }
      }

      const notification = notifications[type]
      
      await createNotification(
        userId,
        type,
        notification.title,
        notification.message,
        notification.data,
        'system',
        type === 'error' ? 1 : type === 'warning' ? 3 : 5, // Priority based on type
        type === 'info' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined // Info expires in 24h
      )

      showSuccess('Notification Created', 'Database notification created successfully!')
    } catch (error) {
      console.error('Failed to create notification:', error)
      showError('Creation Failed', 'Failed to create database notification.')
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Notification System Demo</CardTitle>
        <p className="text-sm text-slate-600">
          Test the notification system with local (immediate) and database (real-time) notifications.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Local Notifications */}
        <div>
          <h3 className="font-semibold mb-3">Local Notifications (Immediate)</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => handleLocalNotification('info')}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              Info Toast
            </Button>
            <Button
              variant="outline"
              onClick={() => handleLocalNotification('success')}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              Success Toast
            </Button>
            <Button
              variant="outline"
              onClick={() => handleLocalNotification('warning')}
              className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
            >
              Warning Toast
            </Button>
            <Button
              variant="outline"
              onClick={() => handleLocalNotification('error')}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Error Toast
            </Button>
          </div>
        </div>

        {/* Database Notifications */}
        <div>
          <h3 className="font-semibold mb-3">Database Notifications (Real-time)</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleDatabaseNotification('info')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              System Update
            </Button>
            <Button
              onClick={() => handleDatabaseNotification('success')}
              className="bg-green-600 hover:bg-green-700"
            >
              Payment Success
            </Button>
            <Button
              onClick={() => handleDatabaseNotification('warning')}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Storage Warning
            </Button>
            <Button
              onClick={() => handleDatabaseNotification('error')}
              className="bg-red-600 hover:bg-red-700"
            >
              Backup Failed
            </Button>
          </div>
        </div>

        <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
          <p><strong>Local notifications</strong> appear immediately as toast messages and auto-dismiss.</p>
          <p><strong>Database notifications</strong> are saved to the database, appear in the notification center, and sync in real-time across devices.</p>
        </div>
      </CardContent>
    </Card>
  )
}