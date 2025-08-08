'use client'

import * as React from 'react'
import { Bell, Check, X, Trash2, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  useNotifications, 
  useUnreadCount, 
  useNotificationsStore 
} from '@/store/notifications-store'
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications'
import { cn } from '@/lib/utils'

interface NotificationItemProps {
  notification: {
    id: string
    type: 'info' | 'success' | 'warning' | 'error'
    title: string
    message: string
    timestamp: number
    read: boolean
    persistent?: boolean
    actionLabel?: string
    actionUrl?: string
  }
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
}

function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const { markNotificationAsRead, deleteNotification } = useRealtimeNotifications()

  const handleMarkAsRead = async () => {
    try {
      await markNotificationAsRead(notification.id)
      onMarkAsRead(notification.id)
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      // Fallback to local state update
      onMarkAsRead(notification.id)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteNotification(notification.id)
      onDelete(notification.id)
    } catch (error) {
      console.error('Failed to delete notification:', error)
      // Fallback to local state update
      onDelete(notification.id)
    }
  }

  const typeColors = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800'
  }

  const typeIcons = {
    info: '💡',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  }

  return (
    <Card className={cn(
      'mb-3 transition-all duration-200 hover:shadow-md',
      !notification.read && 'ring-2 ring-blue-500 ring-opacity-50',
      typeColors[notification.type]
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-lg">{typeIcons[notification.type]}</span>
              <h4 className="font-semibold text-sm">{notification.title}</h4>
              {!notification.read && (
                <Badge variant="secondary" className="h-5 px-2 text-xs">
                  New
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-600 mb-2">{notification.message}</p>
            <p className="text-xs text-slate-400">
              {new Date(notification.timestamp).toLocaleString()}
            </p>
            {notification.actionLabel && notification.actionUrl && (
              <Button
                variant="link"
                size="sm"
                className="px-0 h-auto mt-2"
                onClick={() => window.open(notification.actionUrl, '_blank')}
              >
                {notification.actionLabel}
              </Button>
            )}
          </div>
          <div className="flex items-center space-x-1 ml-4">
            {!notification.read && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAsRead}
                className="h-8 w-8 p-0"
                title="Mark as read"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
              title="Delete notification"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const notifications = useNotifications()
  const unreadCount = useUnreadCount()
  const { markAsRead, removeNotification, markAllAsRead, clearAll } = useNotificationsStore()
  
  // Initialize real-time notifications
  useRealtimeNotifications()

  const unreadNotifications = notifications.filter(n => !n.read)
  const readNotifications = notifications.filter(n => n.read)

  if (notifications.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Bell className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-500">No notifications yet</p>
            <p className="text-sm text-slate-400 mt-1">
              You'll see notifications here when they arrive
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex space-x-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="mr-1 h-3 w-3" />
                Mark all read
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="text-xs"
            >
              <X className="mr-1 h-3 w-3" />
              Clear all
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="max-h-96 overflow-y-auto">
        {/* Unread notifications first */}
        {unreadNotifications.length > 0 && (
          <div className="mb-4">
            <h5 className="text-sm font-medium text-slate-700 mb-3">
              Unread ({unreadNotifications.length})
            </h5>
            {unreadNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDelete={removeNotification}
              />
            ))}
          </div>
        )}

        {/* Read notifications */}
        {readNotifications.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-slate-700 mb-3">
              Read ({readNotifications.length})
            </h5>
            {readNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDelete={removeNotification}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}