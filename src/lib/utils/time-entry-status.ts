import type { TimeEntry, Client } from '@/lib/types/financial'
import { getCurrentDate } from '@/lib/current-date'

export type TimeEntryStatus = 'niet-factureerbaar' | 'factureerbaar' | 'gefactureerd'

export interface TimeEntryStatusInfo {
  status: TimeEntryStatus
  label: string
  color: 'red' | 'orange' | 'green' | 'purple'
  reason: string
}

/**
 * Shared function to check if a date meets invoicing frequency requirements
 */
export function isReadyForInvoicing(
  entryDate: Date,
  client: Client,
  currentDate: Date = getCurrentDate()
): { ready: boolean; reason: string } {
  const frequency = client.invoicing_frequency || 'on_demand'
  
  switch (frequency) {
    case 'on_demand':
      return { ready: true, reason: 'Client invoices on demand - always ready' }
      
    case 'weekly': {
      const daysDiff = Math.floor((currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff >= 7) {
        return { ready: true, reason: `Weekly invoicing - entry is ${daysDiff} days old` }
      } else {
        return { ready: false, reason: `Weekly invoicing - ${7 - daysDiff} days remaining` }
      }
    }
    
    case 'monthly': {
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() // Keep 0-based for consistency
      const entryYear = entryDate.getFullYear()  
      const entryMonth = entryDate.getMonth() // Keep 0-based for consistency
      
      const isFromPreviousMonth = (entryYear < currentYear) ||
        (entryYear === currentYear && entryMonth < currentMonth)

      if (isFromPreviousMonth) {
        return { ready: true, reason: `Monthly invoicing - entry from ${getMonthName(entryMonth + 1)} ${entryYear}` }
      } else {
        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1 // 0-based months
        const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear
        return { ready: false, reason: `Monthly invoicing - will be billable in ${getMonthName(nextMonth + 1)} ${nextYear}` }
      }
    }
    
    default:
      return { ready: true, reason: 'Unknown invoicing frequency' }
  }
}

/**
 * Determines the status of a time entry based on business rules
 *
 * Three mutually exclusive statuses:
 * 1. Niet-factureerbaar (red) - Cannot be invoiced (billable=false)
 * 2. Factureerbaar (orange/green) - Ready to be invoiced based on frequency rules
 * 3. Gefactureerd (purple) - Already invoiced (edit prevention applies)
 */
export function getTimeEntryStatus(
  timeEntry: TimeEntry,
  client: Client,
  currentDate: Date = getCurrentDate()
): TimeEntryStatusInfo {

  // Status 3: Already invoiced (purple) - prevents editing
  if (timeEntry.invoiced || timeEntry.invoice_id) {
    return {
      status: 'gefactureerd',
      label: 'Invoiced',
      color: 'purple',
      reason: timeEntry.invoice_id
        ? `Invoiced on invoice ${timeEntry.invoice_id}`
        : 'Already invoiced'
    }
  }
  
  // Status 1: Not billable (red)
  if (!timeEntry.billable) {
    return {
      status: 'niet-factureerbaar',
      label: 'Non-billable',
      color: 'red',
      reason: 'Marked as non-billable'
    }
  }
  
  // Status 2: Billable and ready based on frequency
  // For billable=true AND invoiced=false entries, check frequency rules
  const entryDate = new Date(timeEntry.entry_date || timeEntry.date)
  const { ready, reason } = isReadyForInvoicing(entryDate, client, currentDate)
  
  if (ready) {
    return {
      status: 'factureerbaar',
      label: 'Billable',
      color: 'green',
      reason
    }
  } else {
    return {
      status: 'factureerbaar',
      label: 'Not yet billable',
      color: 'orange',
      reason
    }
  }
}

/**
 * Helper function to get month names
 */
function getMonthName(month: number): string {
  const monthNames = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return monthNames[month] || 'unknown'
}

/**
 * Batch status determination for multiple time entries
 */
export function getTimeEntriesStatus(
  timeEntries: TimeEntry[],
  client: Client,
  currentDate: Date = getCurrentDate()
): Map<string, TimeEntryStatusInfo> {
  const statusMap = new Map<string, TimeEntryStatusInfo>()
  
  timeEntries.forEach(entry => {
    if (entry.id) {
      statusMap.set(entry.id, getTimeEntryStatus(entry, client, currentDate))
    }
  })
  
  return statusMap
}

/**
 * Get summary counts of time entries by status
 */
export function getTimeEntryStatusSummary(
  timeEntries: TimeEntry[],
  client: Client,
  currentDate: Date = getCurrentDate()
): {
  nietFactureerbaar: number
  factureerbaar: number
  gefactureerd: number
  totaal: number
} {
  const summary = {
    nietFactureerbaar: 0,
    factureerbaar: 0,
    gefactureerd: 0,
    totaal: timeEntries.length
  }

  timeEntries.forEach(entry => {
    const statusInfo = getTimeEntryStatus(entry, client, currentDate)
    switch (statusInfo.status) {
      case 'niet-factureerbaar':
        summary.nietFactureerbaar++
        break
      case 'factureerbaar':
        summary.factureerbaar++
        break
      case 'gefactureerd':
        summary.gefactureerd++
        break
    }
  })

  return summary
}