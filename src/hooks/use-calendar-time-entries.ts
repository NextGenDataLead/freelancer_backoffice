'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import type { 
  CalendarTimeEntry, 
  CalendarMonthData,
  CalendarDayData
} from '@/lib/types/calendar'
import { 
  transformTimeEntriesToDayData, 
  createCalendarMonthData,
  formatDateKey 
} from '@/lib/utils/calendar'

interface UseCalendarTimeEntriesOptions {
  initialMonth?: Date
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseCalendarTimeEntriesReturn {
  // Data
  currentMonth: Date
  monthData: CalendarMonthData | null
  timeEntries: CalendarTimeEntry[]
  
  // Loading states
  loading: boolean
  error: string | null
  
  // Navigation
  goToMonth: (date: Date) => void
  goToNextMonth: () => void
  goToPreviousMonth: () => void
  goToToday: () => void
  
  // Data operations
  refreshData: () => Promise<void>
  addTimeEntry: (entry: Omit<CalendarTimeEntry, 'id' | 'createdAt'>) => Promise<CalendarTimeEntry | null>
  updateTimeEntry: (id: string, updates: Partial<CalendarTimeEntry>) => Promise<CalendarTimeEntry | null>
  deleteTimeEntry: (id: string) => Promise<boolean>
  
  // Utility methods
  getDayData: (date: Date) => CalendarDayData
  hasTimeEntries: (date: Date) => boolean
  getTimeEntriesForDate: (date: Date) => CalendarTimeEntry[]
}

export function useCalendarTimeEntries({
  initialMonth = new Date(),
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}: UseCalendarTimeEntriesOptions = {}): UseCalendarTimeEntriesReturn {
  
  // State management
  const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth)
  const [timeEntries, setTimeEntries] = useState<CalendarTimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Memoized calculations
  const monthData = useMemo(() => {
    if (timeEntries.length === 0) return null
    
    return createCalendarMonthData(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1, // Date.getMonth() is 0-indexed, our function expects 1-indexed
      timeEntries
    )
  }, [currentMonth, timeEntries])

  // Fetch time entries for the current month
  const fetchTimeEntries = useCallback(async (month: Date) => {
    try {
      setLoading(true)
      setError(null)
      
      const startDate = startOfMonth(month)
      const endDate = endOfMonth(month)
      
      const searchParams = new URLSearchParams({
        date_from: startDate.toISOString(),
        date_to: endDate.toISOString(),
        limit: '100', // Maximum allowed by API
        page: '1'
      })
      
      const url = `/api/time-entries?${searchParams.toString()}`
      console.log('Fetching calendar time entries:', url)
      
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', errorText)
        throw new Error(`Failed to fetch time entries: ${response.status} - ${errorText}`)
      }
      
      const result = await response.json()
      console.log('API Response:', result)
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch time entries')
      }
      
      // Transform API response to calendar format
      const calendarEntries: CalendarTimeEntry[] = result.data.map((entry: any) => ({
        id: entry.id,
        date: entry.entry_date,
        clientId: entry.client_id,
        clientName: entry.client?.name || 'Unknown Client',
        projectId: entry.project_id,
        projectName: entry.project?.name || 'No Project',
        description: entry.description || '',
        hours: entry.hours,
        hourlyRate: entry.effective_hourly_rate || entry.hourly_rate || 0,
        billable: entry.billable,
        invoiced: entry.invoiced,
        createdAt: entry.created_at
      }))
      
      setTimeEntries(calendarEntries)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error fetching calendar time entries:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Navigation methods
  const goToMonth = useCallback((date: Date) => {
    setCurrentMonth(date)
  }, [])

  const goToNextMonth = useCallback(() => {
    setCurrentMonth(prev => {
      const next = new Date(prev)
      next.setMonth(next.getMonth() + 1)
      return next
    })
  }, [])

  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth(prev => {
      const previous = new Date(prev)
      previous.setMonth(previous.getMonth() - 1)
      return previous
    })
  }, [])

  const goToToday = useCallback(() => {
    setCurrentMonth(new Date())
  }, [])

  // Data operations
  const refreshData = useCallback(() => {
    return fetchTimeEntries(currentMonth)
  }, [currentMonth, fetchTimeEntries])

  const addTimeEntry = useCallback(async (
    entry: Omit<CalendarTimeEntry, 'id' | 'createdAt'>
  ): Promise<CalendarTimeEntry | null> => {
    try {
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: entry.clientId,
          project_id: entry.projectId,
          entry_date: entry.date,
          description: entry.description,
          hours: entry.hours,
          hourly_rate: entry.hourlyRate,
          billable: entry.billable,
          invoiced: entry.invoiced
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to create time entry: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to create time entry')
      }

      // Transform response and add to current entries
      const newCalendarEntry: CalendarTimeEntry = {
        id: result.data.id,
        date: result.data.entry_date,
        clientId: result.data.client_id,
        clientName: result.data.client?.name || entry.clientName,
        projectId: result.data.project_id,
        projectName: result.data.project?.name || entry.projectName,
        description: result.data.description || '',
        hours: result.data.hours,
        hourlyRate: result.data.effective_hourly_rate || result.data.hourly_rate || 0,
        billable: result.data.billable,
        invoiced: result.data.invoiced,
        createdAt: result.data.created_at
      }

      setTimeEntries(prev => [...prev, newCalendarEntry])
      return newCalendarEntry

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add time entry'
      setError(errorMessage)
      console.error('Error adding time entry:', err)
      return null
    }
  }, [])

  const updateTimeEntry = useCallback(async (
    id: string, 
    updates: Partial<CalendarTimeEntry>
  ): Promise<CalendarTimeEntry | null> => {
    try {
      const updatePayload: any = {}
      
      if (updates.clientId) updatePayload.client_id = updates.clientId
      if (updates.projectId) updatePayload.project_id = updates.projectId
      if (updates.date) updatePayload.entry_date = updates.date
      if (updates.description !== undefined) updatePayload.description = updates.description
      if (updates.hours !== undefined) updatePayload.hours = updates.hours
      if (updates.hourlyRate !== undefined) updatePayload.hourly_rate = updates.hourlyRate
      if (updates.billable !== undefined) updatePayload.billable = updates.billable
      if (updates.invoiced !== undefined) updatePayload.invoiced = updates.invoiced

      const response = await fetch(`/api/time-entries/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      })

      if (!response.ok) {
        throw new Error(`Failed to update time entry: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to update time entry')
      }

      // Transform response and update current entries
      const updatedCalendarEntry: CalendarTimeEntry = {
        id: result.data.id,
        date: result.data.entry_date,
        clientId: result.data.client_id,
        clientName: result.data.client?.name || updates.clientName || '',
        projectId: result.data.project_id,
        projectName: result.data.project?.name || updates.projectName || '',
        description: result.data.description || '',
        hours: result.data.hours,
        hourlyRate: result.data.effective_hourly_rate || result.data.hourly_rate || 0,
        billable: result.data.billable,
        invoiced: result.data.invoiced,
        createdAt: result.data.created_at
      }

      setTimeEntries(prev => prev.map(entry => 
        entry.id === id ? updatedCalendarEntry : entry
      ))
      
      return updatedCalendarEntry

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update time entry'
      setError(errorMessage)
      console.error('Error updating time entry:', err)
      return null
    }
  }, [])

  const deleteTimeEntry = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/time-entries/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`Failed to delete time entry: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete time entry')
      }

      // Remove from current entries
      setTimeEntries(prev => prev.filter(entry => entry.id !== id))
      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete time entry'
      setError(errorMessage)
      console.error('Error deleting time entry:', err)
      return false
    }
  }, [])

  // Utility methods
  const getDayData = useCallback((date: Date): CalendarDayData => {
    const dateKey = formatDateKey(date)
    
    if (monthData?.days.has(dateKey)) {
      return monthData.days.get(dateKey)!
    }
    
    // Return empty day data
    return {
      date: dateKey,
      entries: [],
      totalHours: 0,
      totalValue: 0,
      entryCount: 0,
      hasEntries: false,
      clientColors: []
    }
  }, [monthData])

  const hasTimeEntries = useCallback((date: Date): boolean => {
    const dateKey = formatDateKey(date)
    return monthData?.days.has(dateKey) ?? false
  }, [monthData])

  const getTimeEntriesForDate = useCallback((date: Date): CalendarTimeEntry[] => {
    const dayData = getDayData(date)
    return dayData.entries
  }, [getDayData])

  // Effects
  useEffect(() => {
    fetchTimeEntries(currentMonth)
  }, [currentMonth, fetchTimeEntries])

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return

    const interval = setInterval(() => {
      fetchTimeEntries(currentMonth)
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, currentMonth, fetchTimeEntries])

  return {
    // Data
    currentMonth,
    monthData,
    timeEntries,
    
    // Loading states
    loading,
    error,
    
    // Navigation
    goToMonth,
    goToNextMonth,
    goToPreviousMonth,
    goToToday,
    
    // Data operations
    refreshData,
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    
    // Utility methods
    getDayData,
    hasTimeEntries,
    getTimeEntriesForDate
  }
}