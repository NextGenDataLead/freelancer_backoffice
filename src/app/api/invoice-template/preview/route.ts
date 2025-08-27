// Invoice Template Preview API
// POST endpoint for generating template previews (PDF/HTML/Image)
// Generated with Claude Code (https://claude.ai/code)

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  supabaseAdmin, 
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'
import { getInvoiceGenerator } from '@/lib/pdf/enhanced-invoice-generator'
import type { 
  TemplateRenderContext,
  TemplatePreviewRequest,
  InvoiceTemplateConfig
} from '@/lib/types/template'

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const PreviewRequestSchema = z.object({
  template_id: z.string().uuid().optional(),
  template_config: z.any().optional(), // Partial template config
  format: z.enum(['pdf', 'html', 'image']).default('pdf'),
  use_sample_data: z.boolean().default(true),
  sample_data: z.object({
    invoice_number: z.string().optional(),
    client_name: z.string().optional(),
    amount: z.number().optional()
  }).optional(),
  render_options: z.object({
    preview_mode: z.enum(['desktop', 'mobile', 'print']).optional(),
    include_debug_info: z.boolean().optional(),
    watermark_override: z.string().optional()
  }).optional()
})

// =============================================================================
// GENERATE TEMPLATE PREVIEW
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Parse and validate request
    const body = await request.json()
    const validation = PreviewRequestSchema.safeParse(body)
    
    if (!validation.success) {
      const validationError = ApiErrors.ValidationError(validation.error.issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    const { 
      template_id, 
      template_config, 
      format, 
      use_sample_data, 
      sample_data,
      render_options 
    } = validation.data

    // Using supabaseAdmin for server-side operations

    // Get user's detailed profile and business information
    const { data: businessProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select(`
        tenant_id, 
        id,
        business_name,
        kvk_number,
        btw_number,
        first_name,
        last_name,
        email
      `)
      .eq('id', profile.id)
      .single()

    if (profileError || !businessProfile?.tenant_id) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get template configuration
    let templateConfig: InvoiceTemplateConfig

    if (template_id) {
      // Fetch specific template
      const { data: config, error } = await supabaseAdmin
        .from('invoice_template_config')
        .select('*')
        .eq('id', template_id)
        .eq('tenant_id', businessProfile.tenant_id)
        .single()

      if (error || !config) {
        return NextResponse.json(
          { success: false, error: 'Template not found' },
          { status: 404 }
        )
      }

      templateConfig = config as InvoiceTemplateConfig
    } else {
      // Get active template or use provided config
      if (template_config) {
        // Merge provided config with defaults
        const defaultConfig = getDefaultTemplateConfig(businessProfile.tenant_id, businessProfile.id)
        templateConfig = mergeTemplateConfigs(defaultConfig, template_config)
      } else {
        // Get active template from database
        const { data: config } = await supabaseAdmin
          .from('invoice_template_config')
          .select('*')
          .eq('tenant_id', businessProfile.tenant_id)
          .eq('is_active', true)
          .order('is_default', { ascending: false })
          .limit(1)
          .single()

        templateConfig = config as InvoiceTemplateConfig || getDefaultTemplateConfig(businessProfile.tenant_id, businessProfile.id)
      }
    }

    // Generate sample data
    const context: TemplateRenderContext = use_sample_data 
      ? generateSampleContext(templateConfig, businessProfile, sample_data)
      : await generateRealContext(templateConfig, businessProfile, supabaseAdmin)

    // Add render options
    context.render_options = {
      format: format as any,
      preview_mode: render_options?.preview_mode || 'desktop',
      include_debug_info: render_options?.include_debug_info || false,
      watermark_override: render_options?.watermark_override
    }

    const generator = getInvoiceGenerator()

    // Generate preview based on format
    switch (format) {
      case 'html': {
        const html = await generator.generateHTML(context)
        
        // Debug: Check if logo HTML is being generated (similar to invoice generator)
        console.log('🔍 Checking logo generation in template preview HTML...')
        const logoMatch = html.match(/<img[^>]*src="[^"]*"[^>]*alt="Logo"[^>]*>/gi)
        if (logoMatch) {
          console.log('✅ Logo HTML found in preview:', logoMatch[0])
        } else {
          console.log('❌ No logo HTML found in generated template preview')
          console.log('📋 Template preview context logo info:', {
            business_logo_url: context.business_profile?.logo_url,
            brand_settings_logo_url: context.template_config?.brand_settings?.logo_url,
            show_logo: context.template_config?.brand_settings?.show_logo
          })
        }
        
        return NextResponse.json({
          success: true,
          data: {
            html_content: html,
            generation_time_ms: Date.now() - startTime,
            template_id: templateConfig.id,
            format: 'html'
          },
          message: 'HTML preview generated successfully'
        })
      }

      case 'image': {
        const imageBuffer = await generator.generatePreviewImage(context, 800, 1200)
        
        // Convert buffer to base64 for JSON response
        const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`
        
        return NextResponse.json({
          success: true,
          data: {
            image_data: base64Image,
            generation_time_ms: Date.now() - startTime,
            file_size_bytes: imageBuffer.length,
            template_id: templateConfig.id,
            format: 'image'
          },
          message: 'Image preview generated successfully'
        })
      }

      case 'pdf':
      default: {
        const pdfBuffer = await generator.generateInvoicePDF(context)
        
        // Convert PDF to base64 for response
        const base64Pdf = pdfBuffer.toString('base64')
        
        return NextResponse.json({
          success: true,
          data: {
            pdf_data: base64Pdf,
            generation_time_ms: Date.now() - startTime,
            file_size_bytes: pdfBuffer.length,
            template_id: templateConfig.id,
            format: 'pdf'
          },
          message: 'PDF preview generated successfully'
        })
      }
    }

  } catch (error) {
    console.error('Preview generation error:', error)
    
    // Determine error type for better user feedback
    let errorMessage = 'Preview generation failed'
    let statusCode = 500

    if (error instanceof Error) {
      if (error.message.includes('Template')) {
        errorMessage = 'Template compilation error'
        statusCode = 400
      } else if (error.message.includes('PDF')) {
        errorMessage = 'PDF generation error'
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Preview generation timed out'
        statusCode = 408
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        generation_time_ms: Date.now() - startTime,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: statusCode }
    )
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate sample context for preview
 */
function generateSampleContext(
  templateConfig: InvoiceTemplateConfig,
  businessProfile: any,
  customSampleData?: any
): TemplateRenderContext {
  const now = new Date()
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 30)

  // Debug: Check logo URL sources (similar to invoice generator)
  console.log('🔍 Template Preview Logo URL debugging:')
  console.log('  - templateConfig.brand_settings.logo_url:', templateConfig.brand_settings?.logo_url)
  console.log('  - templateConfig.brand_settings.show_logo:', templateConfig.brand_settings?.show_logo)

  const context: TemplateRenderContext = {
    template_config: templateConfig,
    brand_settings: templateConfig.brand_settings,
    business_profile: {
      business_name: businessProfile.business_name || `${businessProfile.first_name} ${businessProfile.last_name}`.trim(),
      kvk_number: businessProfile.kvk_number || '12345678',
      btw_number: businessProfile.btw_number || 'NL123456789B01',
      address: 'Voorbeeldstraat 123',
      postal_code: '1234 AB',
      city: 'Amsterdam',
      country_code: 'NL',
      email: businessProfile.email || 'voorbeeld@bedrijf.nl',
      phone: '+31 20 123 4567',
      logo_url: templateConfig.brand_settings.logo_url
    },
    client: {
      name: customSampleData?.client_name || 'Voorbeeld Klant B.V.',
      company_name: 'Voorbeeld Klant B.V.',
      address: 'Klantstraat 456',
      postal_code: '5678 CD',
      city: 'Rotterdam',
      country_code: 'NL',
      vat_number: 'NL987654321B01',
      is_business: true,
      email: 'klant@voorbeeldbedrijf.nl',
      phone: '+31 10 987 6543'
    },
    invoice: {
      id: 'preview-invoice',
      invoice_number: customSampleData?.invoice_number || 'F2024-001',
      invoice_date: now.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      status: 'draft',
      reference: 'PROJECT-2024-001',
      notes: 'Dit is een voorbeeld factuur voor template preview doeleinden.',
      currency: 'EUR',
      vat_type: 'standard',
      vat_rate: 0.21
    },
    invoice_items: [
      {
        id: 'item-1',
        description: 'Webdesign en ontwikkeling',
        quantity: 40,
        unit_price: 75.00,
        line_total: 3000.00
      },
      {
        id: 'item-2',
        description: 'Projectmanagement',
        quantity: 8,
        unit_price: 85.00,
        line_total: 680.00
      },
      {
        id: 'item-3',
        description: 'Hosting en onderhoud (1 jaar)',
        quantity: 1,
        unit_price: 480.00,
        line_total: 480.00
      }
    ],
    calculations: {
      subtotal: customSampleData?.amount || 4160.00,
      vat_amount: (customSampleData?.amount || 4160.00) * 0.21,
      total_amount: (customSampleData?.amount || 4160.00) * 1.21,
      discount_amount: 0
    },
    render_options: {
      format: 'pdf'
    }
  }

  // Debug: Check final logo URL in context (similar to invoice generator)
  console.log('✅ Template Preview Context created with logo_url:', context.business_profile.logo_url)

  return context
}

/**
 * Generate real context using actual invoice data (for authenticated previews)
 */
async function generateRealContext(
  templateConfig: InvoiceTemplateConfig,
  businessProfile: any,
  supabase: any
): Promise<TemplateRenderContext> {
  // For MVP, fall back to sample data
  // In production, this would fetch real invoice data
  return generateSampleContext(templateConfig, businessProfile)
}

/**
 * Get default template configuration
 */
function getDefaultTemplateConfig(tenantId: string, userId: string): InvoiceTemplateConfig {
  const now = new Date()
  
  return {
    id: `default-${tenantId}`,
    tenant_id: tenantId,
    created_by: userId,
    name: 'Professional Template',
    description: 'Professional invoice template with Dutch VAT compliance',
    brand_settings: {
      logo_url: undefined,
      business_name_override: undefined,
      primary_color: '#2563eb',
      secondary_color: '#64748b',
      accent_color: '#0ea5e9',
      text_color: '#1f2937',
      background_color: '#ffffff',
      font_family: 'Inter',
      show_logo: true,
      logo_width: '120px',
      logo_position: 'left'
    },
    layout_settings: {
      format: 'A4',
      orientation: 'portrait',
      margins: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      header_style: 'modern',
      footer_style: 'simple',
      color_scheme: 'blue',
      spacing: 'comfortable',
      border_style: 'subtle'
    },
    compliance_settings: {
      language: 'nl',
      currency: 'EUR',
      date_format: 'DD-MM-YYYY',
      number_format: 'nl-NL',
      vat_display: 'detailed',
      show_payment_terms: true,
      include_kvk: true,
      include_btw: true,
      eu_compliant: true,
      show_reverse_charge_notice: true,
      payment_qr_code: false
    },
    features: {
      watermark_enabled: false,
      watermark_text: 'CONCEPT',
      custom_footer_text: undefined,
      show_page_numbers: false,
      include_terms_conditions: false,
      show_generation_info: false,
      email_template: 'professional'
    },
    is_active: true,
    is_default: true,
    created_at: now,
    updated_at: now
  }
}

/**
 * Merge template configurations (deep merge)
 */
function mergeTemplateConfigs(
  defaultConfig: InvoiceTemplateConfig, 
  partialConfig: any
): InvoiceTemplateConfig {
  return {
    ...defaultConfig,
    ...partialConfig,
    brand_settings: {
      ...defaultConfig.brand_settings,
      ...(partialConfig.brand_settings || {})
    },
    layout_settings: {
      ...defaultConfig.layout_settings,
      ...(partialConfig.layout_settings || {})
    },
    compliance_settings: {
      ...defaultConfig.compliance_settings,
      ...(partialConfig.compliance_settings || {})
    },
    features: {
      ...defaultConfig.features,
      ...(partialConfig.features || {})
    }
  }
}