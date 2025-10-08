import { NextResponse } from 'next/server'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'
import { getCurrentDate } from '@/lib/current-date'

/**
 * GET /api/invoices/dashboard-metrics
 * Retrieves comprehensive dashboard metrics for invoice management
 */
export async function GET(request: Request) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Authentication verified - user profile loaded successfully

    // Get current date and calculate periods
    const now = getCurrentDate()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // 1-12

    // Calculate rolling 30-day periods for health score
    const last30DaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const previous30DaysStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    const previous30DaysEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    // Calculate previous month boundaries for "Factureerbaar"
    // For monthly frequency: everything up to and including the last day of previous month
    // Example: On August 22nd, everything up to July 31st is factureerbaar
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear
    
    // Create date string directly to avoid timezone issues
    // Get the last day of the previous month
    const tempDate = new Date(currentYear, currentMonth - 1, 0) // This gives last day of prev month
    const lastDay = tempDate.getDate()
    const prevMonthEnd = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    
    // For start, we can use January 1st of a reasonable past year to include all historical entries
    const prevMonthStart = '2020-01-01' // Include all historical entries up to end of previous month
    
    // Calculate previous week boundaries for weekly clients
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const prevWeekStart = new Date(oneWeekAgo.getFullYear(), oneWeekAgo.getMonth(), oneWeekAgo.getDate() - oneWeekAgo.getDay()).toISOString().split('T')[0]
    const prevWeekEnd = new Date(oneWeekAgo.getFullYear(), oneWeekAgo.getMonth(), oneWeekAgo.getDate() - oneWeekAgo.getDay() + 6).toISOString().split('T')[0]

    // 1. Get all clients with their invoicing frequencies
    const { data: clients, error: clientsError } = await supabaseAdmin
      .from('clients')
      .select('id, name, invoicing_frequency, default_payment_terms')
      .eq('tenant_id', profile.tenant_id)

    if (clientsError) {
      console.error('Error fetching clients:', clientsError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // 2. Get all time entries for metric calculations
    const { data: timeEntries, error: timeEntriesError } = await supabaseAdmin
      .from('time_entries')
      .select('id, client_id, hours, hourly_rate, entry_date, billable, invoiced')
      .eq('tenant_id', profile.tenant_id)
      .eq('billable', true)
      .eq('invoiced', false)

    if (timeEntriesError) {
      console.error('Error fetching time entries:', timeEntriesError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // 3. Get all invoices with their payment status
    const { data: invoices, error: invoicesError } = await supabaseAdmin
      .from('invoices')
      .select(`
        id, 
        client_id, 
        total_amount, 
        status,
        due_date,
        invoice_date,
        invoice_payments(amount, payment_date)
      `)
      .eq('tenant_id', profile.tenant_id)

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Derive tenant-wide payment term baseline (default 30 days)
    const tenantPaymentTermsBaseline = (() => {
      const clientTerms = (clients || [])
        .map(client => client?.default_payment_terms)
        .filter((term): term is number => typeof term === 'number' && !Number.isNaN(term))

      if (clientTerms.length === 0) {
        return 30
      }

      return Math.max(30, ...clientTerms)
    })()

    // 4. Calculate metrics
    const metrics = calculateDashboardMetrics(clients, timeEntries, invoices, {
      prevMonthStart,
      prevMonthEnd,
      prevWeekStart,
      prevWeekEnd,
      today: now.toISOString().split('T')[0],
      last30DaysStart: last30DaysStart.toISOString().split('T')[0],
      previous30DaysStart: previous30DaysStart.toISOString().split('T')[0],
      previous30DaysEnd: previous30DaysEnd.toISOString().split('T')[0],
      tenantPaymentTermsBaseline
    })

    // Dashboard metrics calculated successfully

    const response = createApiResponse(metrics, 'Dashboard metrics retrieved successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('Dashboard metrics error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * Calculate dashboard metrics based on business logic
 */
function calculateDashboardMetrics(
  clients: any[],
  timeEntries: any[],
  invoices: any[],
  periods: {
    prevMonthStart: string
    prevMonthEnd: string
    prevWeekStart: string
    prevWeekEnd: string
    today: string
    last30DaysStart?: string
    previous30DaysStart?: string
    previous30DaysEnd?: string
    tenantPaymentTermsBaseline?: number
  }
) {
  // Create client lookup map
  const clientMap = new Map(clients.map(c => [c.id, c]))
  
  // Process invoices to determine payment status
  const processedInvoices = invoices.map(invoice => {
    const totalPayments = (invoice.invoice_payments || [])
      .reduce((sum: number, payment: any) => sum + parseFloat(payment.amount), 0)
    
    const totalAmount = parseFloat(invoice.total_amount)
    
    let paymentStatus = invoice.status
    if (totalPayments > 0 && totalPayments < totalAmount) {
      paymentStatus = 'partial'
    } else if (totalPayments >= totalAmount) {
      paymentStatus = 'paid'
    }
    
    return {
      ...invoice,
      total_payments: totalPayments,
      payment_status: paymentStatus,
      outstanding_amount: Math.max(0, totalAmount - totalPayments)
    }
  })

  // Calculate paid amounts per client to deduct from time entry totals
  const paidAmountsByClient = new Map<string, number>()
  processedInvoices
    .filter(inv => inv.payment_status === 'paid' || inv.payment_status === 'partial')
    .forEach(invoice => {
      const clientId = invoice.client_id
      const paidAmount = invoice.total_payments
      paidAmountsByClient.set(
        clientId, 
        (paidAmountsByClient.get(clientId) || 0) + paidAmount
      )
    })

  // 1. FACTUREERBAAR - Time entries ready for invoicing based on frequency
  let factureerbaar = 0
  const readyToInvoiceEntries: Array<{ entryDate: string; readyDate: string; amount: number }> = []
  const readyToInvoiceClients = new Set<string>()

  timeEntries.forEach(entry => {
    const client = clientMap.get(entry.client_id)
    if (!client) return

    const entryDate = entry.entry_date
    const entryAmount = (entry.hours || 0) * (entry.hourly_rate || 0)
    let shouldInclude = false
    let readyDate = entryDate // When this entry became ready to invoice

    switch (client.invoicing_frequency) {
      case 'monthly':
        // Include everything up to and including the last day of previous month
        shouldInclude = entryDate <= periods.prevMonthEnd
        // Ready date is the last day of the month the entry was made
        if (shouldInclude) {
          const entryDateObj = new Date(entryDate)
          const lastDayOfMonth = new Date(entryDateObj.getFullYear(), entryDateObj.getMonth() + 1, 0)
          readyDate = lastDayOfMonth.toISOString().split('T')[0]
        }
        break
      case 'weekly':
        // Include if entry is from previous complete week
        shouldInclude = entryDate >= periods.prevWeekStart && entryDate <= periods.prevWeekEnd
        // Ready date is the last day of that week
        if (shouldInclude) {
          readyDate = periods.prevWeekEnd
        }
        break
      case 'on_demand':
        // Include all unbilled entries for on-demand
        shouldInclude = true
        // Ready date is the entry date itself (can be invoiced immediately)
        readyDate = entryDate
        break
    }

    if (shouldInclude) {
      factureerbaar += entryAmount
      readyToInvoiceEntries.push({ entryDate, readyDate, amount: entryAmount })
      readyToInvoiceClients.add(entry.client_id)
    }
  })

  // Deduct paid amounts from factureerbaar
  paidAmountsByClient.forEach(paidAmount => {
    factureerbaar = Math.max(0, factureerbaar - paidAmount)
  })

  // 2. TOTALE REGISTRATIE - All unbilled time entries regardless of frequency
  let totaleRegistratie = timeEntries.reduce((sum, entry) => {
    return sum + ((entry.hours || 0) * (entry.hourly_rate || 0))
  }, 0)

  // Deduct paid amounts from total registration
  paidAmountsByClient.forEach(paidAmount => {
    totaleRegistratie = Math.max(0, totaleRegistratie - paidAmount)
  })

  // 3. ACHTERSTALLIG - Overdue invoices past client payment terms
  let achterstallig = 0
  let achterstalligCount = 0
  let oldestOverdueDueDate: string | null = null

  processedInvoices
    .filter(inv =>
      inv.status === 'overdue'  // FIXED: Only count invoices explicitly marked as overdue
    )
    .forEach(invoice => {
      const client = clientMap.get(invoice.client_id)
      if (!client) return

      achterstallig += invoice.outstanding_amount
      achterstalligCount++

      // Track oldest overdue due date (earliest date = longest overdue)
      if (!oldestOverdueDueDate || invoice.due_date < oldestOverdueDueDate) {
        oldestOverdueDueDate = invoice.due_date
      }
    })

  // 4. ACTUAL DSO CALCULATION - Average days from invoice to payment
  let totalDSO = 0
  let dsoInvoiceCount = 0
  let totalPaymentTerms = 0
  let paymentTermsCount = 0

  processedInvoices.forEach(invoice => {
    const invoiceDate = new Date(invoice.invoice_date)
    const dueDate = new Date(invoice.due_date)

    // Calculate payment terms for this invoice
    const paymentTerms = Math.round((dueDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
    if (paymentTerms > 0) {
      totalPaymentTerms += paymentTerms
      paymentTermsCount++
    }

    // Calculate actual DSO (days to payment or current date if unpaid)
    let actualDays = 0

    if (invoice.payment_status === 'paid' && invoice.invoice_payments && invoice.invoice_payments.length > 0) {
      // For paid invoices, use the payment date
      const paymentDate = new Date(invoice.invoice_payments[0].payment_date)
      actualDays = Math.round((paymentDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
    } else if (invoice.status === 'sent' || invoice.status === 'overdue' || invoice.status === 'partial') {
      // For unpaid/partially paid invoices, use current date
      const currentDate = new Date(periods.today)
      actualDays = Math.round((currentDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
    }
    // Skip draft and cancelled invoices

    if (actualDays > 0) {
      totalDSO += actualDays
      dsoInvoiceCount++
    }
  })

  const averageDSO = dsoInvoiceCount > 0 ? Math.round((totalDSO / dsoInvoiceCount) * 10) / 10 : 0
  const rawAveragePaymentTerms = paymentTermsCount > 0 ? Math.round(totalPaymentTerms / paymentTermsCount) : 30
  const baselinePaymentTerms = periods.tenantPaymentTermsBaseline ?? 30
  const averagePaymentTerms = Math.max(baselinePaymentTerms, rawAveragePaymentTerms)

  // Calculate DIO (Days Invoice Overdue) - Days since oldest overdue invoice's due date
  let actualDIO = 0
  if (oldestOverdueDueDate) {
    const oldestDueDateObj = new Date(oldestOverdueDueDate)
    const todayDate = new Date(periods.today)
    actualDIO = Math.round((todayDate.getTime() - oldestDueDateObj.getTime()) / (1000 * 60 * 60 * 24) * 10) / 10
  }

  // 5. DRI (Days Ready to Invoice) - Days since the oldest unbilled work became ready
  let averageDRI = 0
  const currentDate = new Date(periods.today)

  if (readyToInvoiceEntries.length > 0) {
    // Find the oldest ready date across all entries
    const oldestReadyDate = readyToInvoiceEntries.reduce((oldest, entry) => {
      return entry.readyDate < oldest ? entry.readyDate : oldest
    }, readyToInvoiceEntries[0].readyDate)

    const oldestReadyDateObj = new Date(oldestReadyDate)
    averageDRI = Math.round((currentDate.getTime() - oldestReadyDateObj.getTime()) / (1000 * 60 * 60 * 24) * 10) / 10
  }

  // 6. ROLLING 30-DAY INVOICE REVENUE - For health score Profit calculations
  // Calculate total invoice revenue for rolling 30-day periods
  let current30DaysRevenue = 0
  let previous30DaysRevenue = 0

  if (periods.last30DaysStart && periods.previous30DaysStart && periods.previous30DaysEnd) {
    // Current 30 days: Invoices created in the last 30 days
    processedInvoices.forEach(invoice => {
      const invoiceDate = invoice.invoice_date
      if (invoiceDate >= periods.last30DaysStart! && invoiceDate <= periods.today) {
        // Count total invoice amount (not just paid amount)
        current30DaysRevenue += parseFloat(invoice.total_amount)
      }
    })

    // Previous 30 days: Invoices created in days 31-60
    processedInvoices.forEach(invoice => {
      const invoiceDate = invoice.invoice_date
      if (invoiceDate >= periods.previous30DaysStart! && invoiceDate < periods.previous30DaysEnd!) {
        previous30DaysRevenue += parseFloat(invoice.total_amount)
      }
    })
  }

  // Round up to 2 decimals as requested
  return {
    factureerbaar: Math.ceil(factureerbaar * 100) / 100,
    factureerbaar_count: readyToInvoiceClients.size,
    totale_registratie: Math.ceil(totaleRegistratie * 100) / 100,
    achterstallig: Math.ceil(achterstallig * 100) / 100,
    achterstallig_count: achterstalligCount,
    actual_dso: averageDSO,
    actual_dio: actualDIO,
    average_payment_terms: averagePaymentTerms,
    average_dri: averageDRI,
    rolling30DaysRevenue: {
      current: Math.ceil(current30DaysRevenue * 100) / 100,
      previous: Math.ceil(previous30DaysRevenue * 100) / 100
    },
    period_info: {
      current_date: periods.today,
      previous_month: `${periods.prevMonthStart} to ${periods.prevMonthEnd}`,
      previous_week: `${periods.prevWeekStart} to ${periods.prevWeekEnd}`
    }
  }
}
