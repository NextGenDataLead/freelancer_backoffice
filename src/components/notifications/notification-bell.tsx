'use client'

import * as React from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useUnreadCount } from '@/store/notifications-store'
import { NotificationCenter } from './notification-center'
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications'

interface NotificationBellProps {
  className?: string
}

export function NotificationBell({ className }: NotificationBellProps) {
  const unreadCount = useUnreadCount()
  const [isOpen, setIsOpen] = React.useState(false)
  
  // Initialize real-time notifications
  const { isConnected } = useRealtimeNotifications()

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`relative ${className}`}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          {/* Connection indicator */}
          <div
            className={`absolute -bottom-1 -left-1 h-2 w-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-gray-400'
            }`}
            title={isConnected ? 'Real-time connected' : 'Real-time disconnected'}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-96 p-0" 
        align="end"
        sideOffset={8}
      >
        <NotificationCenter />
      </PopoverContent>
    </Popover>
  )
}