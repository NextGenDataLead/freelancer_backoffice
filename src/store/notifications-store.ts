import { create } from 'zustand'
import { nanoid } from 'nanoid'

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: number
  read: boolean
  persistent?: boolean
  actionLabel?: string
  actionUrl?: string
  duration?: number // in milliseconds, undefined = no auto-dismiss
}

interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => string
  removeNotification: (id: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  clearRead: () => void
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  // Initial state
  notifications: [],
  unreadCount: 0,
  
  // Actions
  addNotification: (notificationData) => {
    const id = nanoid()
    const notification: Notification = {
      ...notificationData,
      id,
      timestamp: Date.now(),
      read: false,
    }
    
    set((state) => {
      const newNotifications = [notification, ...state.notifications]
      return {
        notifications: newNotifications,
        unreadCount: newNotifications.filter(n => !n.read).length,
      }
    })
    
    // Auto-dismiss if duration is specified
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        get().removeNotification(id)
      }, notification.duration)
    }
    
    return id
  },
  
  removeNotification: (id) => set((state) => {
    const newNotifications = state.notifications.filter(n => n.id !== id)
    return {
      notifications: newNotifications,
      unreadCount: newNotifications.filter(n => !n.read).length,
    }
  }),
  
  markAsRead: (id) => set((state) => {
    const newNotifications = state.notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    )
    return {
      notifications: newNotifications,
      unreadCount: newNotifications.filter(n => !n.read).length,
    }
  }),
  
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
    unreadCount: 0,
  })),
  
  clearAll: () => set({
    notifications: [],
    unreadCount: 0,
  }),
  
  clearRead: () => set((state) => {
    const newNotifications = state.notifications.filter(n => !n.read)
    return {
      notifications: newNotifications,
      unreadCount: newNotifications.length,
    }
  }),
}))

// Selectors
export const useNotifications = () => useNotificationsStore((state) => state.notifications)
export const useUnreadCount = () => useNotificationsStore((state) => state.unreadCount)
export const useUnreadNotifications = () => useNotificationsStore((state) => 
  state.notifications.filter(n => !n.read)
)

// Convenience functions for common notification types
export const useNotificationActions = () => {
  const { addNotification } = useNotificationsStore()
  
  return {
    showSuccess: (title: string, message: string, duration = 5000) =>
      addNotification({ type: 'success', title, message, duration }),
      
    showError: (title: string, message: string, persistent = true) =>
      addNotification({ type: 'error', title, message, persistent }),
      
    showInfo: (title: string, message: string, duration = 8000) =>
      addNotification({ type: 'info', title, message, duration }),
      
    showWarning: (title: string, message: string, duration = 10000) =>
      addNotification({ type: 'warning', title, message, duration }),
      
    addNotification,
  }
}