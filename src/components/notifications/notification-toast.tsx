'use client'

import * as React from 'react'
import { X, Check, AlertTriangle, Info, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useNotifications, useNotificationsStore } from '@/store/notifications-store'
import { cn } from '@/lib/utils'

interface ToastNotificationProps {
  notification: {
    id: string
    type: 'info' | 'success' | 'warning' | 'error'
    title: string
    message: string
    duration?: number
    actionLabel?: string
    actionUrl?: string
  }
  onDismiss: (id: string) => void
}

function ToastNotification({ notification, onDismiss }: ToastNotificationProps) {
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    // Wait for exit animation before removing
    setTimeout(() => onDismiss(notification.id), 300)
  }

  const typeConfig = {
    info: {
      icon: Info,
      className: 'border-blue-200 bg-blue-50 text-blue-800',
      iconColor: 'text-blue-500'
    },
    success: {
      icon: Check,
      className: 'border-green-200 bg-green-50 text-green-800',
      iconColor: 'text-green-500'
    },
    warning: {
      icon: AlertTriangle,
      className: 'border-yellow-200 bg-yellow-50 text-yellow-800',
      iconColor: 'text-yellow-500'
    },
    error: {
      icon: AlertCircle,
      className: 'border-red-200 bg-red-50 text-red-800',
      iconColor: 'text-red-500'
    }
  }

  const config = typeConfig[notification.type]
  const Icon = config.icon

  return (
    <Card
      className={cn(
        'mb-2 p-4 shadow-lg transition-all duration-300 ease-in-out transform',
        config.className,
        isVisible 
          ? 'translate-x-0 opacity-100' 
          : 'translate-x-full opacity-0'
      )}
    >
      <div className="flex items-start space-x-3">
        <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', config.iconColor)} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{notification.title}</p>
          <p className="text-sm mt-1">{notification.message}</p>
          {notification.actionLabel && notification.actionUrl && (
            <Button
              variant="link"
              size="sm"
              className="px-0 h-auto mt-2 text-sm"
              onClick={() => window.open(notification.actionUrl, '_blank')}
            >
              {notification.actionLabel}
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}

export function NotificationToastContainer() {
  const notifications = useNotifications()
  const { removeNotification } = useNotificationsStore()

  // Only show notifications with duration (auto-dismiss toasts)
  const toastNotifications = notifications.filter(n => n.duration !== undefined)

  if (toastNotifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-96 max-w-sm space-y-2">
      {toastNotifications.slice(0, 5).map((notification) => (
        <ToastNotification
          key={notification.id}
          notification={notification}
          onDismiss={removeNotification}
        />
      ))}
    </div>
  )
}