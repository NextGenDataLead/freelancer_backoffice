/**
 * Template Integration Adapter
 * Bridges the new template system with existing invoice generation
 * Generated with Claude Code (https://claude.ai/code)
 */

import { getInvoiceGenerator } from './enhanced-invoice-generator'
import { templateService } from '../services/template-service'
import type { 
  TemplateRenderContext, 
  InvoiceTemplateConfig 
} from '../types/template'
import type { Client } from '../types/financial'

// Legacy invoice data interface (from existing system)
interface LegacyInvoiceData {
  invoice: any
  client: Client
  items: any[]
  businessProfile: any
}

/**
 * Generate PDF using new template system with legacy invoice data
 * This function provides backward compatibility while using the enhanced template engine
 */
export async function generateInvoicePDFWithTemplate(
  data: LegacyInvoiceData,
  templateId?: string
): Promise<Buffer> {
  // Get template configuration directly from database (server-side)
  let templateConfig: InvoiceTemplateConfig
  
  try {
    // Import supabase admin client
    const { supabaseAdmin } = await import('@/lib/supabase/financial-client')
    
    // Get active template configuration from database
    const { data: configData, error } = await supabaseAdmin
      .from('invoice_template_config')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error || !configData) {
      console.warn('No template configuration found, using default. Error:', error, 'ConfigData:', configData)
      templateConfig = getDefaultTemplateConfig()
    } else {
      console.log('✅ Using database template config with logo_url:', configData.brand_settings?.logo_url)
      templateConfig = {
        ...configData,
        created_at: new Date(configData.created_at),
        updated_at: new Date(configData.updated_at),
        last_used_at: configData.last_used_at ? new Date(configData.last_used_at) : undefined
      }
    }
  } catch (error) {
    console.error('❌ Failed to fetch template config from database:', error)
    templateConfig = getDefaultTemplateConfig()
  }

  // Convert legacy data to new template context and use enhanced generator
  // This ensures the same template compilation and enhancement as the preview system
  const baseContext = convertLegacyDataToTemplateContext(data, templateConfig)
  
  // Generate PDF using enhanced template engine (handles template compilation internally)
  const generator = getInvoiceGenerator()
  return await generator.generateInvoicePDF(baseContext)
}

/**
 * Generate invoice PDF with template preview
 */
export async function generateInvoicePreview(
  data: LegacyInvoiceData,
  templateConfig?: Partial<InvoiceTemplateConfig>
): Promise<string> {
  try {
    // Get current template config and apply any overrides
    const baseConfig = await templateService.getTemplateConfig()
    const mergedConfig = templateConfig 
      ? { ...baseConfig, ...templateConfig }
      : baseConfig

    // Convert to template context
    const baseContext = convertLegacyDataToTemplateContext(data, mergedConfig)
    
    // Generate preview using enhanced generator (handles template compilation internally)
    const generator = getInvoiceGenerator()
    const pdfBuffer = await generator.generateInvoicePDF(baseContext)
    
    // Convert to data URL
    const base64 = pdfBuffer.toString('base64')
    return `data:application/pdf;base64,${base64}`
    
  } catch (error) {
    console.error('Template preview generation failed:', error)
    throw error
  }
}

/**
 * Convert legacy invoice data to new template render context
 */
function convertLegacyDataToTemplateContext(
  data: LegacyInvoiceData,
  templateConfig: InvoiceTemplateConfig
): TemplateRenderContext {
  const { invoice, client, items, businessProfile } = data

  return {
    template_config: templateConfig,
    
    // Brand settings extracted from template config for easy access in template
    brand_settings: templateConfig.brand_settings,
    
    business_profile: {
      business_name: businessProfile.business_name || 
                    `${businessProfile.first_name || ''} ${businessProfile.last_name || ''}`.trim() ||
                    'Administratie',
      kvk_number: businessProfile.kvk_number || undefined,
      btw_number: businessProfile.btw_number || undefined,
      address: businessProfile.address || undefined,
      postal_code: businessProfile.postal_code || undefined,
      city: businessProfile.city || undefined,
      country_code: businessProfile.country_code || 'NL',
      email: businessProfile.email || undefined,
      phone: businessProfile.phone || undefined,
      website: businessProfile.website || undefined,
      logo_url: templateConfig.brand_settings.logo_url || undefined,
      // formatted_address removed as it's not in BusinessProfile interface
    },

    client: {
      name: client.name,
      company_name: client.company_name || undefined,
      address: client.address || undefined,
      postal_code: client.postal_code || undefined,
      city: client.city || undefined,
      country_code: client.country_code || 'NL',
      vat_number: client.vat_number || undefined,
      is_business: client.is_business || false,
      email: client.email || undefined,
      phone: client.phone || undefined,
      // formatted_address removed as it's not in ClientInfo interface
    },

    invoice: {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      status: invoice.status,
      reference: invoice.reference || null,
      notes: invoice.notes || null,
      currency: invoice.currency || 'EUR',
      vat_type: invoice.vat_type || 'standard',
      vat_rate: parseFloat(invoice.vat_rate || '0.21')
    },

    invoice_items: items.map(item => ({
      id: item.id,
      description: item.description,
      quantity: parseFloat(item.quantity),
      unit_price: parseFloat(item.unit_price),
      line_total: parseFloat(item.line_total)
    })),

    calculations: {
      subtotal: parseFloat(invoice.subtotal),
      vat_amount: parseFloat(invoice.vat_amount),
      total_amount: parseFloat(invoice.total_amount),
      discount_amount: parseFloat(invoice.discount_amount || '0')
    },

    render_options: {
      format: 'pdf'
    }
  }
}

/**
 * Check if template system is available and configured
 */
export async function isTemplateSystemAvailable(): Promise<boolean> {
  try {
    await templateService.getTemplateConfig()
    return true
  } catch (error) {
    return false
  }
}

/**
 * Get available templates for selection
 */
export async function getAvailableTemplates() {
  try {
    const themesData = await templateService.getThemes()
    return {
      themes: themesData.themes,
      current: await templateService.getTemplateConfig()
    }
  } catch (error) {
    console.error('Failed to get available templates:', error)
    return {
      themes: [],
      current: null
    }
  }
}

/**
 * Invoice PDF generation options
 */
export interface InvoicePDFOptions {
  templateId?: string
  previewMode?: boolean
}

/**
 * Smart PDF generator that automatically chooses between legacy and new template system
 */
export async function generateSmartInvoicePDF(
  data: LegacyInvoiceData,
  options: InvoicePDFOptions = {}
): Promise<Buffer> {
  const { templateId, previewMode = false } = options
  
  if (previewMode) {
    const previewUrl = await generateInvoicePreview(data)
    // Convert data URL back to buffer for consistency
    const base64Data = previewUrl.split(',')[1]
    return Buffer.from(base64Data, 'base64')
  }
  
  return await generateInvoicePDFWithTemplate(data, templateId)
}

/**
 * Helper function to format address string
 */
function formatAddressString(profile: any): string {
  const parts = []
  
  if (profile.address) parts.push(profile.address)
  if (profile.postal_code || profile.city || profile.country_code) {
    // Format: "1234 AB City, NL" (postal_code city, country_code)
    const cityParts = [
      profile.postal_code,
      profile.city,
    ].filter(Boolean).join(' ')
    
    const cityLine = profile.country_code 
      ? `${cityParts}, ${profile.country_code}`
      : cityParts
    
    if (cityLine) parts.push(cityLine)
  }
  
  return parts.join(', ')
}

/**
 * Get default template configuration for server-side usage
 */
function getDefaultTemplateConfig(): InvoiceTemplateConfig {
  return {
    id: 'default',
    tenant_id: 'default',
    created_by: 'system',
    name: 'Professional Template',
    description: 'Professional invoice template with Dutch compliance',
    brand_settings: {
      logo_url: "https://www.logoai.com/oss/icons/2021/10/27/gwBCTCVlpMwn55h.png",
      business_name_override: undefined,
      logo_width: '120px',
      logo_position: 'left',
      show_logo: true,
      primary_color: '#2563eb',
      secondary_color: '#64748b',
      accent_color: '#0ea5e9',
      text_color: '#1f2937',
      background_color: '#ffffff',
      font_family: 'Inter'
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
    created_at: new Date(),
    updated_at: new Date(),
    last_used_at: undefined
  }
}