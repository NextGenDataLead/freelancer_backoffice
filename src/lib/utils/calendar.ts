import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns'
import type {
  CalendarTimeEntry,
  CalendarDayData,
  CalendarMonthData,
  ClientColorMap,
  CalendarColorKey
} from '@/lib/types/calendar'
import { CALENDAR_COLORS } from '@/lib/types/calendar'
import { getCurrentDate } from '@/lib/current-date'

/**
 * Format date to YYYY-MM-DD string for consistent date keys
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse date key back to Date object
 * Parse in local time to match how formatDateKey works
 */
export function parseDateKey(dateKey: string): Date {
  return new Date(dateKey + 'T00:00:00')
}

/**
 * Get all days in a given month
 */
export function getMonthDays(date: Date): Date[] {
  const start = startOfMonth(date)
  const end = endOfMonth(date)
  return eachDayOfInterval({ start, end })
}

/**
 * Generate client color mapping with consistent colors
 */
export function generateClientColors(clientIds: string[]): ClientColorMap {
  const colors = Object.values(CALENDAR_COLORS)
  const colorMap: ClientColorMap = {}
  
  clientIds.forEach((clientId, index) => {
    colorMap[clientId] = colors[index % colors.length]
  })
  
  return colorMap
}

/**
 * Get color for a specific client
 */
export function getClientColor(clientId: string, colorMap: ClientColorMap): string {
  return colorMap[clientId] || CALENDAR_COLORS.muted
}

/**
 * Transform raw time entries into calendar day data
 */
export function transformTimeEntriesToDayData(entries: CalendarTimeEntry[]): Map<string, CalendarDayData> {
  const dayDataMap = new Map<string, CalendarDayData>()

  // Get unique client IDs for color mapping
  const uniqueClientIds = [...new Set(entries.map(entry => entry.clientId))]
  const clientColors = generateClientColors(uniqueClientIds)

  entries.forEach(entry => {
    const dateKey = entry.date
    const existingDay = dayDataMap.get(dateKey)
    
    if (existingDay) {
      // Add to existing day
      existingDay.entries.push(entry)
      existingDay.totalHours += entry.hours
      existingDay.totalValue += entry.hours * entry.hourlyRate
      existingDay.entryCount += 1
      
      // Add client color if not already present
      const clientColor = getClientColor(entry.clientId, clientColors)
      if (!existingDay.clientColors.includes(clientColor)) {
        existingDay.clientColors.push(clientColor)
      }
    } else {
      // Create new day data
      const dayData: CalendarDayData = {
        date: dateKey,
        entries: [entry],
        totalHours: entry.hours,
        totalValue: entry.hours * entry.hourlyRate,
        entryCount: 1,
        hasEntries: true,
        clientColors: [getClientColor(entry.clientId, clientColors)]
      }
      dayDataMap.set(dateKey, dayData)
    }
  })

  return dayDataMap
}

/**
 * Create calendar month data from time entries
 */
export function createCalendarMonthData(
  year: number, 
  month: number, 
  entries: CalendarTimeEntry[]
): CalendarMonthData {
  const dayDataMap = transformTimeEntriesToDayData(entries)
  
  // Calculate totals
  let totalHours = 0
  let totalValue = 0
  let totalEntries = 0
  
  dayDataMap.forEach(dayData => {
    totalHours += dayData.totalHours
    totalValue += dayData.totalValue
    totalEntries += dayData.entryCount
  })
  
  return {
    year,
    month,
    days: dayDataMap,
    totalHours,
    totalValue,
    totalEntries
  }
}

/**
 * Get day data for a specific date, or create empty day data
 */
export function getDayData(date: Date, monthData?: CalendarMonthData): CalendarDayData {
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
}

/**
 * Check if a date has time entries
 */
export function hasTimeEntries(date: Date, monthData?: CalendarMonthData): boolean {
  const dateKey = formatDateKey(date)
  return monthData?.days.has(dateKey) ?? false
}

/**
 * Get time entries for a specific date
 */
export function getTimeEntriesForDate(date: Date, monthData?: CalendarMonthData): CalendarTimeEntry[] {
  const dayData = getDayData(date, monthData)
  return dayData.entries
}

/**
 * Format hours for display
 */
export function formatHours(hours: number): string {
  if (hours === 0) return '0h'
  if (hours < 1) return `${Math.round(hours * 60)}m`
  
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/**
 * Format currency value for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Get calendar modifiers for react-day-picker
 */
export function getCalendarModifiers(monthData?: CalendarMonthData) {
  if (!monthData) {
    return {
      hasEntries: [],
      today: getCurrentDate()
    }
  }

  const daysWithEntries = Array.from(monthData.days.keys()).map(dateKey => parseDateKey(dateKey))

  return {
    hasEntries: daysWithEntries,
    today: getCurrentDate()
  }
}

/**
 * Get readable tooltip content for a calendar day
 */
export function getDayTooltipContent(date: Date, monthData?: CalendarMonthData): string {
  const dayData = getDayData(date, monthData)
  
  if (!dayData.hasEntries) {
    return format(date, 'dd MMMM yyyy')
  }
  
  const dateStr = format(date, 'dd MMMM yyyy')
  const hoursStr = formatHours(dayData.totalHours)
  const valueStr = formatCurrency(dayData.totalValue)
  const entriesStr = dayData.entryCount === 1 ? '1 registratie' : `${dayData.entryCount} registraties`
  
  return `${dateStr}\n${hoursStr} • ${valueStr}\n${entriesStr}`
}

/**
 * Check if we should show multiple entry indicators
 */
export function shouldShowMultipleIndicators(date: Date, monthData?: CalendarMonthData): boolean {
  const dayData = getDayData(date, monthData)
  return dayData.entryCount > 1
}

/**
 * Get the primary client color for a day (most time spent)
 */
export function getPrimaryClientColor(date: Date, monthData?: CalendarMonthData): string {
  const dayData = getDayData(date, monthData)
  
  if (dayData.clientColors.length === 0) {
    return CALENDAR_COLORS.muted
  }
  
  // For now, return the first color. In future, could be enhanced to show 
  // the color of the client with the most hours
  return dayData.clientColors[0]
}
