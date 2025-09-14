export interface CalendarTimeEntry {
  id: string
  date: string // YYYY-MM-DD format
  clientId: string
  clientName: string
  projectId: string
  projectName: string
  description: string
  hours: number
  hourlyRate: number
  billable: boolean
  invoiced: boolean
  createdAt: string
}

export interface CalendarDayData {
  date: string // YYYY-MM-DD format
  entries: CalendarTimeEntry[]
  totalHours: number
  totalValue: number
  entryCount: number
  hasEntries: boolean
  clientColors: string[] // Colors representing different clients
}

export interface CalendarMonthData {
  year: number
  month: number // 1-12
  days: Map<string, CalendarDayData> // date string -> day data
  totalHours: number
  totalValue: number
  totalEntries: number
}

export interface CalendarTimeEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate?: Date
  prefilledData?: Partial<CalendarTimeEntry>
  onSuccess?: (entry: CalendarTimeEntry) => void
  calendarMode?: boolean
}

export interface CalendarViewProps {
  selectedMonth: Date
  onMonthChange: (date: Date) => void
  onDateSelect: (date: Date) => void
  onCreateTimeEntry: (date: Date) => void
  monthData?: CalendarMonthData
  loading?: boolean
}

export type CalendarMode = 'month' | 'week'
export type CalendarViewType = 'list' | 'calendar'

// Utility type for calendar navigation
export interface CalendarNavigation {
  currentMonth: Date
  previousMonth: () => void
  nextMonth: () => void
  goToToday: () => void
  goToMonth: (date: Date) => void
}

// Client color mapping for visual consistency
export interface ClientColorMap {
  [clientId: string]: string
}

// Calendar event colors
export const CALENDAR_COLORS = {
  primary: '#3b82f6',    // Blue
  secondary: '#10b981',  // Green
  accent: '#f59e0b',     // Amber
  warning: '#ef4444',    // Red
  info: '#8b5cf6',       // Purple
  success: '#06b6d4',    // Cyan
  muted: '#64748b',      // Slate
} as const

export type CalendarColorKey = keyof typeof CALENDAR_COLORS