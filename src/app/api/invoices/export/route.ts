import { NextResponse, NextRequest } from 'next/server'
import {
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
} from '@/lib/supabase/financial-client'

/**
 * GET /api/invoices/export
 * Export invoices to CSV format
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const format = searchParams.get('format') || 'csv'

    // Build query
    let query = supabaseAdmin
      .from('invoices')
      .select(`
        *,
        client:clients!inner(
          id,
          company_name,
          email
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .order('invoice_date', { ascending: false })

    // Apply status filter if provided
    if (status) {
      query = query.eq('status', status)
    }

    const { data: invoices, error } = await query

    if (error) {
      console.error('Error fetching invoices for export:', error)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    if (!invoices || invoices.length === 0) {
      return NextResponse.json(
        { error: 'No invoices found to export' },
        { status: 404 }
      )
    }

    // Generate CSV
    const csv = generateCSV(invoices)

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="invoices-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })

  } catch (error) {
    console.error('API error exporting invoices:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * Generate CSV from invoices data
 */
function generateCSV(invoices: any[]): string {
  // CSV Headers
  const headers = [
    'Invoice Number',
    'Client Name',
    'Client Email',
    'Invoice Date',
    'Due Date',
    'Status',
    'Subtotal (EUR)',
    'VAT Amount (EUR)',
    'Total Amount (EUR)',
    'Reference',
    'Notes'
  ]

  // CSV Rows
  const rows = invoices.map(invoice => {
    const clientName = invoice.client?.company_name || 'Unknown'
    const clientEmail = invoice.client?.email || ''

    return [
      escapeCSV(invoice.invoice_number || ''),
      escapeCSV(clientName),
      escapeCSV(clientEmail),
      invoice.invoice_date || '',
      invoice.due_date || '',
      escapeCSV(invoice.status || ''),
      formatNumber(invoice.subtotal || 0),
      formatNumber(invoice.vat_amount || 0),
      formatNumber(invoice.total_amount_incl_vat || 0),
      escapeCSV(invoice.reference || ''),
      escapeCSV(invoice.notes || '')
    ]
  })

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  return csvContent
}

/**
 * Escape CSV field value
 */
function escapeCSV(value: string): string {
  if (!value) return ''

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}

/**
 * Format number to 2 decimal places
 */
function formatNumber(value: number): string {
  return value.toFixed(2)
}
