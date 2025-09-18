import { NextResponse } from 'next/server'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'

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

    // Get current date and calculate periods
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // 1-12
    
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

    // 4. Calculate metrics
    const metrics = calculateDashboardMetrics(clients, timeEntries, invoices, {
      prevMonthStart,
      prevMonthEnd,
      prevWeekStart,
      prevWeekEnd,
      today: now.toISOString().split('T')[0]
    })

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
  
  timeEntries.forEach(entry => {
    const client = clientMap.get(entry.client_id)
    if (!client) return
    
    const entryDate = entry.entry_date
    const entryAmount = (entry.hours || 0) * (entry.hourly_rate || 0)
    let shouldInclude = false
    
    switch (client.invoicing_frequency) {
      case 'monthly':
        // Include everything up to and including the last day of previous month
        shouldInclude = entryDate <= periods.prevMonthEnd
        break
      case 'weekly':  
        // Include if entry is from previous complete week
        shouldInclude = entryDate >= periods.prevWeekStart && entryDate <= periods.prevWeekEnd
        break
      case 'on_demand':
        // Include all unbilled entries for on-demand
        shouldInclude = true
        break
    }
    
    if (shouldInclude) {
      factureerbaar += entryAmount
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

  processedInvoices
    .filter(inv =>
      inv.payment_status !== 'paid' &&
      inv.status !== 'draft' &&
      inv.status !== 'cancelled'
    )
    .forEach(invoice => {
      const client = clientMap.get(invoice.client_id)
      if (!client) return

      const dueDate = new Date(invoice.due_date)
      const today = new Date(periods.today)

      if (dueDate < today) {
        achterstallig += invoice.outstanding_amount
        achterstalligCount++
      }
    })

  // Round up to 2 decimals as requested
  return {
    factureerbaar: Math.ceil(factureerbaar * 100) / 100,
    totale_registratie: Math.ceil(totaleRegistratie * 100) / 100,
    achterstallig: Math.ceil(achterstallig * 100) / 100,
    achterstallig_count: achterstalligCount,
    period_info: {
      current_date: periods.today,
      previous_month: `${periods.prevMonthStart} to ${periods.prevMonthEnd}`,
      previous_week: `${periods.prevWeekStart} to ${periods.prevWeekEnd}`
    }
  }
}