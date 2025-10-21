// Invoice Template Configuration API
// GET/PUT endpoints for template configuration management
// Generated with Claude Code (https://claude.ai/code)

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'
import { getCurrentDate } from '@/lib/current-date'
import type { 
  InvoiceTemplateConfig, 
  CreateTemplateConfigRequest, 
  UpdateTemplateConfigRequest 
} from '@/lib/types/template'

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const BrandSettingsSchema = z.object({
  logo_url: z.string().url().optional().nullable(),
  business_name_override: z.string().max(100).optional().nullable(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  text_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  background_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  font_family: z.string().min(1).max(50),
  show_logo: z.boolean(),
  logo_width: z.string().max(20),
  logo_position: z.enum(['left', 'center', 'right'])
}).partial()

const LayoutSettingsSchema = z.object({
  format: z.enum(['A4', 'Letter']),
  orientation: z.enum(['portrait', 'landscape']),
  margins: z.object({
    top: z.string().max(20),
    right: z.string().max(20),
    bottom: z.string().max(20),
    left: z.string().max(20)
  }),
  header_style: z.enum(['modern', 'classic', 'minimal', 'premium', 'executive', 'corporate', 'fintech']),
  footer_style: z.enum(['simple', 'detailed', 'minimal', 'modern', 'sophisticated']),
  color_scheme: z.enum(['blue', 'black', 'orange', 'gray', 'green', 'stripe', 'platinum', 'emerald', 'purple', 'burgundy']),
  spacing: z.enum(['compact', 'comfortable', 'spacious', 'optimal']),
  border_style: z.enum(['none', 'subtle', 'bold', 'premium', 'sophisticated', 'refined', 'professional', 'warm'])
}).partial()

const ComplianceSettingsSchema = z.object({
  language: z.enum(['nl', 'en']),
  currency: z.literal('EUR'), // MVP only supports EUR
  date_format: z.enum(['DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD']),
  number_format: z.enum(['nl-NL', 'en-US', 'en-GB']),
  vat_display: z.enum(['detailed', 'summary', 'minimal']),
  show_payment_terms: z.boolean(),
  include_kvk: z.boolean(),
  include_btw: z.boolean(),
  eu_compliant: z.boolean(),
  show_reverse_charge_notice: z.boolean(),
  payment_qr_code: z.boolean()
}).partial()

const FeaturesSchema = z.object({
  watermark_enabled: z.boolean(),
  watermark_text: z.string().max(50),
  custom_footer_text: z.string().max(200).optional().nullable(),
  show_page_numbers: z.boolean(),
  include_terms_conditions: z.boolean(),
  show_generation_info: z.boolean(),
  email_template: z.enum(['professional', 'friendly', 'formal'])
}).partial()

const UpdateConfigSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  brand_settings: BrandSettingsSchema.optional(),
  layout_settings: LayoutSettingsSchema.optional(),
  compliance_settings: ComplianceSettingsSchema.optional(),
  features: FeaturesSchema.optional(),
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional()
})

// =============================================================================
// GET TEMPLATE CONFIGURATION
// =============================================================================

export async function GET() {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Get active template configuration
    const { data: config, error } = await supabaseAdmin
      .from('invoice_template_config')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Database error fetching template config:', error)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // If no config found, return default configuration
    if (!config) {
      const defaultConfig = getDefaultTemplateConfig(profile.tenant_id, profile.id)
      const response = createApiResponse(defaultConfig, 'Using default template configuration')
      return NextResponse.json(response)
    }

    // Ensure backward compatibility by adding missing fields
    const normalizedConfig = normalizeTemplateConfig(config)
    const response = createApiResponse(normalizedConfig, 'Template configuration retrieved successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

// =============================================================================
// UPDATE TEMPLATE CONFIGURATION  
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = UpdateConfigSchema.safeParse(body)
    
    if (!validation.success) {
      const validationError = ApiErrors.ValidationError(validation.error.issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    // Get existing configuration
    const { data: existingConfig } = await supabaseAdmin
      .from('invoice_template_config')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('is_active', true)
      .single()

    const updateData = validation.data
    const now = new Date(getCurrentDate().getTime()).toISOString()

    if (existingConfig) {
      // Update existing configuration
      const { data: updatedConfig, error } = await supabaseAdmin
        .from('invoice_template_config')
        .update({
          name: updateData.name || existingConfig.name,
          description: updateData.description !== undefined ? updateData.description : existingConfig.description,
          brand_settings: updateData.brand_settings 
            ? { ...existingConfig.brand_settings, ...updateData.brand_settings }
            : existingConfig.brand_settings,
          layout_settings: updateData.layout_settings
            ? { ...existingConfig.layout_settings, ...updateData.layout_settings }
            : existingConfig.layout_settings,
          compliance_settings: updateData.compliance_settings
            ? { ...existingConfig.compliance_settings, ...updateData.compliance_settings }
            : existingConfig.compliance_settings,
          features: updateData.features
            ? { ...existingConfig.features, ...updateData.features }
            : existingConfig.features,
          is_active: updateData.is_active !== undefined ? updateData.is_active : existingConfig.is_active,
          is_default: updateData.is_default !== undefined ? updateData.is_default : existingConfig.is_default,
          updated_at: now
        })
        .eq('id', existingConfig.id)
        .select()
        .single()

      if (error) {
        console.error('Database error updating template config:', error)
        return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
      }

      const normalizedConfig = normalizeTemplateConfig(updatedConfig)
      const response = createApiResponse(normalizedConfig, 'Template configuration updated successfully')
      return NextResponse.json(response)

    } else {
      // Create new configuration
      const defaultConfig = getDefaultTemplateConfig(profile.tenant_id, profile.id)
      
      const { data: newConfig, error } = await supabaseAdmin
        .from('invoice_template_config')
        .insert({
          tenant_id: profile.tenant_id,
          created_by: profile.id,
          name: updateData.name || defaultConfig.name,
          description: updateData.description || defaultConfig.description,
          brand_settings: updateData.brand_settings 
            ? { ...defaultConfig.brand_settings, ...updateData.brand_settings }
            : defaultConfig.brand_settings,
          layout_settings: updateData.layout_settings
            ? { ...defaultConfig.layout_settings, ...updateData.layout_settings }
            : defaultConfig.layout_settings,
          compliance_settings: updateData.compliance_settings
            ? { ...defaultConfig.compliance_settings, ...updateData.compliance_settings }
            : defaultConfig.compliance_settings,
          features: updateData.features
            ? { ...defaultConfig.features, ...updateData.features }
            : defaultConfig.features,
          is_active: updateData.is_active !== undefined ? updateData.is_active : true,
          is_default: updateData.is_default !== undefined ? updateData.is_default : true,
          created_at: now,
          updated_at: now
        })
        .select()
        .single()

      if (error) {
        console.error('Database error creating template config:', error)
        return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
      }

      const normalizedConfig = normalizeTemplateConfig(newConfig)
      const response = createApiResponse(normalizedConfig, 'Template configuration created successfully')
      return NextResponse.json(response, { status: 201 })
    }

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function getDefaultTemplateConfig(tenantId: string, userId: string): Partial<InvoiceTemplateConfig> {
  return {
    tenant_id: tenantId,
    created_by: userId,
    name: 'Professional Template',
    description: 'Professional invoice template with Dutch VAT compliance and modern design',
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
    is_default: true
  }
}

/**
 * Normalize template configuration for backward compatibility
 */
function normalizeTemplateConfig(config: any): InvoiceTemplateConfig {
  // Ensure features object has all required fields
  const features = {
    watermark_enabled: false,
    watermark_text: 'CONCEPT',
    custom_footer_text: undefined,
    show_page_numbers: false,
    include_terms_conditions: false,
    show_generation_info: false,
    email_template: 'professional' as const,
    ...config.features
  }

  return {
    ...config,
    features
  }
}
