/**
 * Working Days Calculator Utilities
 * Calculates expected and actual working days based on target working schedule
 */

interface TimeEntry {
  entry_date: string | Date
  hours: number
}

/**
 * Calculate the number of expected working days in a date range based on target working days
 * @param startDate - Start of date range (inclusive)
 * @param endDate - End of date range (inclusive)
 * @param targetWorkingDays - Array of ISO weekday numbers (1=Monday, 7=Sunday)
 * @returns Number of expected working days in the range
 *
 * @example
 * // Calculate expected working days for Sept 1-8 with Mon-Thu schedule
 * calculateExpectedWorkingDays(
 *   new Date('2025-09-01'),
 *   new Date('2025-09-08'),
 *   [1,2,3,4] // Mon-Thu
 * ) // Returns 5 (Sept 1,2,4,5,8 are Mon-Thu)
 */
export function calculateExpectedWorkingDays(
  startDate: Date,
  endDate: Date,
  targetWorkingDays: number[]
): number {
  if (!targetWorkingDays || targetWorkingDays.length === 0) {
    return 0
  }

  let count = 0
  const current = new Date(startDate)
  current.setHours(0, 0, 0, 0)

  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)

  while (current <= end) {
    // getDay() returns 0 for Sunday, 1 for Monday, etc.
    // ISO weekday is 1 for Monday, 7 for Sunday
    const dayOfWeek = current.getDay()
    const isoWeekday = dayOfWeek === 0 ? 7 : dayOfWeek

    if (targetWorkingDays.includes(isoWeekday)) {
      count++
    }

    current.setDate(current.getDate() + 1)
  }

  return count
}

/**
 * Count actual working days from time entries (days where hours were tracked)
 * @param timeEntries - Array of time entries with entry_date and hours
 * @param startDate - Start of date range (inclusive)
 * @param endDate - End of date range (inclusive)
 * @returns Number of unique days with time entries in the range
 *
 * @example
 * countActualWorkingDays(
 *   [
 *     { entry_date: '2025-09-01', hours: 8 },
 *     { entry_date: '2025-09-01', hours: 2 }, // Same day
 *     { entry_date: '2025-09-02', hours: 6 }
 *   ],
 *   new Date('2025-09-01'),
 *   new Date('2025-09-08')
 * ) // Returns 2 (Sept 1 and 2)
 */
export function countActualWorkingDays(
  timeEntries: TimeEntry[],
  startDate: Date,
  endDate: Date
): number {
  if (!timeEntries || timeEntries.length === 0) {
    return 0
  }

  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)

  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)

  // Use Set to track unique days
  const uniqueDays = new Set<string>()

  for (const entry of timeEntries) {
    const entryDate = new Date(entry.entry_date)
    entryDate.setHours(0, 0, 0, 0)

    if (entryDate >= start && entryDate <= end && entry.hours > 0) {
      // Store as ISO date string (YYYY-MM-DD)
      uniqueDays.add(entryDate.toISOString().split('T')[0])
    }
  }

  return uniqueDays.size
}

/**
 * Get total hours from time entries up to a specific date (inclusive)
 * @param timeEntries - Array of time entries
 * @param endDate - End date (inclusive)
 * @returns Total hours tracked up to and including the end date
 *
 * @example
 * getTotalHoursUpToDate(
 *   [
 *     { entry_date: '2025-09-01', hours: 8 },
 *     { entry_date: '2025-09-02', hours: 6 },
 *     { entry_date: '2025-09-10', hours: 7 }
 *   ],
 *   new Date('2025-09-02')
 * ) // Returns 14 (8 + 6, excludes Sept 10)
 */
export function getTotalHoursUpToDate(
  timeEntries: TimeEntry[],
  endDate: Date
): number {
  if (!timeEntries || timeEntries.length === 0) {
    return 0
  }

  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999) // Include the entire end date

  let totalHours = 0

  for (const entry of timeEntries) {
    const entryDate = new Date(entry.entry_date)

    if (entryDate <= end && entry.hours > 0) {
      totalHours += Number(entry.hours)
    }
  }

  return totalHours
}

/**
 * Get yesterday's date (used for MTD calculations excluding today)
 * @returns Yesterday's date at midnight
 */
export function getYesterday(): Date {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  return yesterday
}

/**
 * Get the first day of the current month
 * @returns First day of current month at midnight
 */
export function getStartOfMonth(date: Date = new Date()): Date {
  const start = new Date(date)
  start.setDate(1)
  start.setHours(0, 0, 0, 0)
  return start
}

/**
 * Get the last day of the current month
 * @returns Last day of current month at 23:59:59
 */
export function getEndOfMonth(date: Date = new Date()): Date {
  const end = new Date(date)
  end.setMonth(end.getMonth() + 1)
  end.setDate(0) // Sets to last day of previous month
  end.setHours(23, 59, 59, 999)
  return end
}

/**
 * Calculate dynamic daily hours target based on working days
 * @param monthlyHoursTarget - Total hours target for the month
 * @param targetWorkingDays - Array of ISO weekday numbers
 * @param month - Optional month to calculate for (defaults to current month)
 * @returns Target hours per working day
 *
 * @example
 * // 120h target, Mon-Thu schedule, September 2025
 * calculateDailyHoursTarget(120, [1,2,3,4], new Date('2025-09-01'))
 * // September 2025 has 18 Mon-Thu days
 * // Returns 120 / 18 = 6.67h/day
 */
export function calculateDailyHoursTarget(
  monthlyHoursTarget: number,
  targetWorkingDays: number[],
  month: Date = new Date()
): number {
  const startOfMonth = getStartOfMonth(month)
  const endOfMonth = getEndOfMonth(month)

  const totalWorkingDays = calculateExpectedWorkingDays(
    startOfMonth,
    endOfMonth,
    targetWorkingDays
  )

  if (totalWorkingDays === 0) {
    return 0
  }

  return monthlyHoursTarget / totalWorkingDays
}
