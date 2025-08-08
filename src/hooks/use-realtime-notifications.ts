'use client'

import { useEffect, useRef } from 'react'
import { useSupabaseClient } from './use-supabase-client'
import { useAuth } from '@clerk/nextjs'
import { useNotificationsStore, type Notification } from '@/store/notifications-store'
import { RealtimeChannel } from '@supabase/supabase-js'

// Database notification type (matches what comes from Supabase)
interface DatabaseNotification {
  id: string
  tenant_id: string
  user_id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  data: Record<string, any>
  read_at: string | null
  created_at: string
  updated_at: string
  expires_at: string | null
  priority: number
  category: string
}

/**
 * Hook to manage real-time notifications from Supabase
 * Subscribes to the notifications table and updates the local store
 */
export function useRealtimeNotifications() {
  const { supabase, isAuthenticated } = useSupabaseClient()
  const { userId } = useAuth()
  const { addNotification, removeNotification, markAsRead } = useNotificationsStore()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !userId || !supabase) {
      return
    }

    // Create a unique channel name for this user
    const channelName = `notifications:user-${userId}`
    
    console.log('Setting up real-time notifications subscription for user:', userId)

    // Create the real-time subscription
    const channel = supabase.channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          console.log('Real-time notification received:', payload)
          handleNotificationEvent(payload)
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status)
      })

    channelRef.current = channel

    // Load initial notifications
    loadInitialNotifications()

    return () => {
      console.log('Cleaning up real-time notifications subscription')
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [isAuthenticated, userId, supabase])

  const handleNotificationEvent = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    switch (eventType) {
      case 'INSERT':
        if (newRecord) {
          const notification = transformDatabaseNotification(newRecord)
          // Store the database ID for future operations
          addNotification({
            ...notification,
            duration: undefined // Don't auto-dismiss real-time notifications
          })
        }
        break

      case 'UPDATE':
        if (newRecord && oldRecord) {
          // Check if notification was marked as read
          if (!oldRecord.read_at && newRecord.read_at) {
            markAsRead(newRecord.id)
          }
        }
        break

      case 'DELETE':
        if (oldRecord) {
          removeNotification(oldRecord.id)
        }
        break

      default:
        console.log('Unknown notification event type:', eventType)
    }
  }

  const loadInitialNotifications = async () => {
    try {
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50) // Load last 50 notifications

      if (error) {
        console.error('Error loading initial notifications:', error)
        return
      }

      if (notifications) {
        console.log('Loaded initial notifications:', notifications.length)
        // Add notifications to store (most recent first)
        notifications.forEach((dbNotification) => {
          const notification = transformDatabaseNotification(dbNotification)
          addNotification({
            ...notification,
            duration: undefined // Don't auto-dismiss existing notifications
          })
        })
      }
    } catch (error) {
      console.error('Error in loadInitialNotifications:', error)
    }
  }

  const transformDatabaseNotification = (dbNotification: DatabaseNotification): Omit<Notification, 'timestamp' | 'read'> => {
    return {
      id: dbNotification.id, // Use database ID
      type: dbNotification.type,
      title: dbNotification.title,
      message: dbNotification.message,
      persistent: dbNotification.expires_at === null,
      actionLabel: dbNotification.data?.actionLabel,
      actionUrl: dbNotification.data?.actionUrl,
    }
  }

  const createNotification = async (
    userId: string,
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    data: Record<string, any> = {},
    category: string = 'general',
    priority: number = 5,
    expiresAt?: string
  ) => {
    try {
      const { data: result, error } = await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_type: type,
        p_title: title,
        p_message: message,
        p_data: data,
        p_category: category,
        p_priority: priority,
        p_expires_at: expiresAt || null
      })

      if (error) {
        console.error('Error creating notification:', error)
        throw error
      }

      return result
    } catch (error) {
      console.error('Error in createNotification:', error)
      throw error
    }
  }

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) {
        console.error('Error marking notification as read:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in markNotificationAsRead:', error)
      throw error
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) {
        console.error('Error deleting notification:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in deleteNotification:', error)
      throw error
    }
  }

  return {
    createNotification,
    markNotificationAsRead,
    deleteNotification,
    isConnected: channelRef.current !== null
  }
}