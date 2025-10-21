/**
 * Recurring Expense Calculator
 *
 * Calculates future occurrences of recurring expenses for cash flow forecasting
 */

export interface RecurringExpenseTemplate {
  id: string
  name: string
  amount: number
  currency: string
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  start_date: string
  end_date: string | null
  next_occurrence: string
  day_of_month: number | null
  amount_escalation_percentage: number | null
  last_escalation_date: string | null
  is_active: boolean
  vat_rate: number
  is_vat_deductible: boolean
  business_use_percentage: number
}

export interface ExpenseOccurrence {
  date: string
  amount: number
  gross_amount: number
  vat_amount: number
  deductible_vat_amount: number
  template_id: string
  template_name: string
  description: string
  confidence: number
}

/**
 * Calculate all occurrences of a recurring expense template within a date range
 */
export function calculateOccurrences(
  template: RecurringExpenseTemplate,
  daysAhead: number,
  startDate: Date = new Date()
): ExpenseOccurrence[] {
  if (!template.is_active) {
    return []
  }

  const occurrences: ExpenseOccurrence[] = []
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + daysAhead)

  let currentDate = new Date(template.next_occurrence)

  // If next_occurrence is in the past, start from today
  if (currentDate < startDate) {
    currentDate = new Date(startDate)
  }

  let iteration = 0
  const maxIterations = 1000 // Safety limit

  while (currentDate <= endDate && iteration < maxIterations) {
    // Check if past template end_date
    if (template.end_date) {
      const templateEndDate = new Date(template.end_date)
      if (currentDate > templateEndDate) {
        break
      }
    }

    // Calculate amount with escalation
    const amount = calculateAmountWithEscalation(
      template.amount,
      template.amount_escalation_percentage,
      template.last_escalation_date,
      template.start_date,
      currentDate
    )

    // Calculate VAT amounts
    const vatCalc = calculateVATAmounts(
      amount,
      template.vat_rate,
      template.is_vat_deductible,
      template.business_use_percentage
    )

    occurrences.push({
      date: formatDate(currentDate),
      amount: amount,
      gross_amount: vatCalc.gross_amount,
      vat_amount: vatCalc.vat_amount,
      deductible_vat_amount: vatCalc.deductible_vat_amount,
      template_id: template.id,
      template_name: template.name,
      description: `${template.name} (${template.frequency})`,
      confidence: 0.95 // High confidence for scheduled recurring expenses
    })

    // Calculate next occurrence date
    currentDate = getNextOccurrenceDate(
      currentDate,
      template.frequency,
      template.day_of_month
    )

    iteration++
  }

  return occurrences
}

const MS_IN_DAY = 1000 * 60 * 60 * 24

/**
 * Calculate all occurrences from the template start date up to a given end date (inclusive)
 */
export function calculateOccurrencesFromStart(
  template: RecurringExpenseTemplate,
  untilDate: Date
): ExpenseOccurrence[] {
  if (!template.is_active) {
    return []
  }

  const normalizedUntil = new Date(untilDate)
  normalizedUntil.setHours(0, 0, 0, 0)

  const start = new Date(template.start_date)
  start.setHours(0, 0, 0, 0)

  if (normalizedUntil < start) {
    return []
  }

  const daysAhead = Math.max(
    0,
    Math.ceil((normalizedUntil.getTime() - start.getTime()) / MS_IN_DAY)
  )

  const templateForCalculation: RecurringExpenseTemplate = {
    ...template,
    next_occurrence: template.start_date
  }

  return calculateOccurrences(templateForCalculation, daysAhead, start)
}

/**
 * Calculate amount with annual escalation applied
 */
function calculateAmountWithEscalation(
  baseAmount: number,
  escalationPercentage: number | null,
  lastEscalationDate: string | null,
  startDate: string,
  currentDate: Date
): number {
  if (!escalationPercentage || escalationPercentage === 0) {
    return baseAmount
  }

  const start = new Date(startDate)
  const yearsSinceStart = (currentDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25)

  // Apply compound escalation
  const escalationMultiplier = Math.pow(1 + escalationPercentage / 100, Math.floor(yearsSinceStart))

  return Math.round(baseAmount * escalationMultiplier * 100) / 100
}

/**
 * Calculate VAT amounts considering deductibility and business use
 */
function calculateVATAmounts(
  netAmount: number,
  vatRate: number,
  isVatDeductible: boolean,
  businessUsePercentage: number
) {
  const vat_amount = Math.round(netAmount * (vatRate / 100) * 100) / 100
  const gross_amount = netAmount + vat_amount

  let deductible_vat_amount = 0
  if (isVatDeductible) {
    deductible_vat_amount = Math.round(vat_amount * (businessUsePercentage / 100) * 100) / 100
  }

  return {
    gross_amount,
    vat_amount,
    deductible_vat_amount
  }
}

/**
 * Calculate the next occurrence date based on frequency
 */
function getNextOccurrenceDate(
  currentDate: Date,
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  dayOfMonth: number | null
): Date {
  const nextDate = new Date(currentDate)

  switch (frequency) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7)
      break

    case 'monthly':
      // If day_of_month is specified, use it
      if (dayOfMonth) {
        nextDate.setMonth(nextDate.getMonth() + 1)
        nextDate.setDate(Math.min(dayOfMonth, getDaysInMonth(nextDate)))
      } else {
        // Otherwise, add 1 month maintaining the same day
        nextDate.setMonth(nextDate.getMonth() + 1)
      }
      break

    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3)
      if (dayOfMonth) {
        nextDate.setDate(Math.min(dayOfMonth, getDaysInMonth(nextDate)))
      }
      break

    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1)
      if (dayOfMonth) {
        nextDate.setDate(Math.min(dayOfMonth, getDaysInMonth(nextDate)))
      }
      break
  }

  return nextDate
}

/**
 * Get number of days in a month
 */
function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Calculate total projected recurring expenses for a period
 */
export function calculateTotalRecurringExpenses(
  templates: RecurringExpenseTemplate[],
  daysAhead: number
): {
  total: number
  by_category: Map<string, number>
  by_frequency: Map<string, number>
  occurrences: ExpenseOccurrence[]
} {
  const allOccurrences: ExpenseOccurrence[] = []
  const byFrequency = new Map<string, number>()

  for (const template of templates) {
    const occurrences = calculateOccurrences(template, daysAhead)
    allOccurrences.push(...occurrences)

    // Sum by frequency
    const frequencyTotal = occurrences.reduce((sum, occ) => sum + occ.gross_amount, 0)
    byFrequency.set(
      template.frequency,
      (byFrequency.get(template.frequency) || 0) + frequencyTotal
    )
  }

  const total = allOccurrences.reduce((sum, occ) => sum + occ.gross_amount, 0)

  return {
    total,
    by_category: new Map(), // TODO: Add category tracking
    by_frequency: byFrequency,
    occurrences: allOccurrences
  }
}

/**
 * Generate preview of next N occurrences for a template
 */
export function previewOccurrences(
  template: RecurringExpenseTemplate,
  count: number = 6
): ExpenseOccurrence[] {
  if (!template.is_active) {
    return []
  }

  const occurrences: ExpenseOccurrence[] = []
  let currentDate = new Date(template.next_occurrence)

  for (let i = 0; i < count; i++) {
    // Check if past template end_date
    if (template.end_date) {
      const templateEndDate = new Date(template.end_date)
      if (currentDate > templateEndDate) {
        break
      }
    }

    const amount = calculateAmountWithEscalation(
      template.amount,
      template.amount_escalation_percentage,
      template.last_escalation_date,
      template.start_date,
      currentDate
    )

    const vatCalc = calculateVATAmounts(
      amount,
      template.vat_rate,
      template.is_vat_deductible,
      template.business_use_percentage
    )

    occurrences.push({
      date: formatDate(currentDate),
      amount: amount,
      gross_amount: vatCalc.gross_amount,
      vat_amount: vatCalc.vat_amount,
      deductible_vat_amount: vatCalc.deductible_vat_amount,
      template_id: template.id,
      template_name: template.name,
      description: `${template.name}`,
      confidence: 0.95
    })

    currentDate = getNextOccurrenceDate(
      currentDate,
      template.frequency,
      template.day_of_month
    )
  }

  return occurrences
}

/**
 * Calculate annual cost of a recurring expense
 */
export function calculateAnnualCost(template: RecurringExpenseTemplate): number {
  const occurrencesPerYear = {
    weekly: 52,
    monthly: 12,
    quarterly: 4,
    yearly: 1
  }

  const count = occurrencesPerYear[template.frequency]
  const amount = template.amount
  const vatCalc = calculateVATAmounts(
    amount,
    template.vat_rate,
    template.is_vat_deductible,
    template.business_use_percentage
  )

  return vatCalc.gross_amount * count
}

/**
 * Calculate the next occurrence date after a given date
 * Public wrapper for getNextOccurrenceDate
 */
export function calculateNextOccurrence(
  template: RecurringExpenseTemplate,
  fromDate: Date = new Date()
): Date {
  return getNextOccurrenceDate(fromDate, template.frequency, template.day_of_month)
}
