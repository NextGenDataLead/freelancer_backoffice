import { NextResponse } from 'next/server'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors
} from '@/lib/supabase/financial-client'
import { generateSmartInvoicePDF } from '@/lib/pdf/template-integration'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/invoices/[id]/pdf
 * Generates and returns PDF for a specific invoice
 */
export async function GET(request: Request, { params }: RouteParams) {
  console.log('🚀 PDF Generation started for invoice:', params.id)
  
  try {
    // Get authenticated user profile
    console.log('📋 Getting user profile...')
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      console.log('❌ No authenticated user profile found')
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }
    console.log('✅ User profile found:', profile.id)

    const invoiceId = params.id

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(invoiceId)) {
      console.log('❌ Invalid invoice ID format:', invoiceId)
      return NextResponse.json({ error: 'Invalid invoice ID format' }, { status: 400 })
    }

    // Fetch invoice with client and items
    console.log('📄 Fetching invoice data...')
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
        client:clients(*),
        invoice_items(*)
      `)
      .eq('id', invoiceId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (invoiceError || !invoice) {
      console.error('❌ Error fetching invoice:', invoiceError)
      if (invoiceError?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
      }
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }
    console.log('✅ Invoice data fetched:', invoice.invoice_number)

    // Get user profile for business details
    console.log('👤 Fetching business profile...')
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', profile.id)
      .single()

    if (profileError) {
      console.error('❌ Error fetching user profile:', profileError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }
    console.log('✅ Business profile fetched')

    // Generate PDF using template system
    console.log('📝 Starting PDF generation with template system...')
    const pdfBuffer = await generateSmartInvoicePDF({
      invoice,
      client: invoice.client,
      items: invoice.invoice_items || [],
      businessProfile: userProfile
    }, {
      previewMode: false
    })
    console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes')

    // Return PDF as download
    const response = new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      }
    })

    console.log('✅ PDF response ready')
    return response

  } catch (error) {
    console.error('❌ PDF generation error:', error)
    console.error('❌ Error name:', error.name)
    console.error('❌ Error message:', error.message)
    console.error('❌ Error stack:', error.stack)
    
    // Log specific template error details if available
    if (error.name === 'TemplateRenderError') {
      console.error('❌ Template ID:', error.template_id)
      console.error('❌ Template context keys:', Object.keys(error.render_context || {}))
    }
    
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}