// Invoice Template System Types
// Generated with Claude Code (https://claude.ai/code)

// =============================================================================
// TEMPLATE CONFIGURATION TYPES
// =============================================================================

export interface InvoiceTemplateConfig {
  id: string
  tenant_id: string
  created_by: string
  name: string
  description?: string
  
  // Template Settings
  brand_settings: BrandSettings
  layout_settings: LayoutSettings
  compliance_settings: ComplianceSettings
  features: TemplateFeatures
  
  // Status and Metadata
  is_active: boolean
  is_default: boolean
  created_at: Date
  updated_at: Date
  last_used_at?: Date
}

// =============================================================================
// BRAND SETTINGS
// =============================================================================

export interface BrandSettings {
  // Logo and Branding
  logo_url?: string
  business_name_override?: string
  logo_width: string
  logo_position: 'left' | 'center' | 'right'
  show_logo: boolean
  
  // Color Palette
  primary_color: string      // Main brand color
  secondary_color: string    // Supporting color
  accent_color: string       // Accent/highlight color
  text_color: string         // Primary text color
  background_color: string   // Background color
  
  // Typography
  font_family: string        // Main font family
}

// =============================================================================
// LAYOUT SETTINGS
// =============================================================================

export interface LayoutSettings {
  // Page Format
  format: 'A4' | 'Letter'
  orientation: 'portrait' | 'landscape'
  
  // Margins
  margins: PageMargins
  
  // Header and Footer Styles
  header_style: 'modern' | 'classic' | 'minimal' | 'premium' | 'executive' | 'corporate' | 'fintech'
  footer_style: 'simple' | 'detailed' | 'minimal' | 'modern' | 'sophisticated'
  
  // Design Elements
  color_scheme: 'blue' | 'black' | 'orange' | 'gray' | 'green' | 'stripe' | 'platinum' | 'emerald' | 'purple' | 'burgundy'
  spacing: 'compact' | 'comfortable' | 'spacious' | 'optimal'
  border_style: 'none' | 'subtle' | 'bold' | 'premium' | 'sophisticated' | 'refined' | 'professional' | 'warm'
}

export interface PageMargins {
  top: string    // e.g., "20mm"
  right: string  // e.g., "20mm"
  bottom: string // e.g., "20mm"
  left: string   // e.g., "20mm"
}

// =============================================================================
// COMPLIANCE SETTINGS
// =============================================================================

export interface ComplianceSettings {
  // Localization
  language: 'nl' | 'en'
  currency: 'EUR' // MVP only supports EUR
  date_format: 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD'
  number_format: 'nl-NL' | 'en-US' | 'en-GB'
  
  // VAT and Tax Display
  vat_display: 'detailed' | 'summary' | 'minimal'
  show_payment_terms: boolean
  include_kvk: boolean              // Show Dutch Chamber of Commerce number
  include_btw: boolean              // Show Dutch VAT number
  eu_compliant: boolean             // Follow EU invoice regulations
  show_reverse_charge_notice: boolean
  
  // Payment Features
  payment_qr_code: boolean          // Include payment QR code
}

// =============================================================================
// TEMPLATE FEATURES
// =============================================================================

export interface TemplateFeatures {
  // Watermarks and Draft Indicators
  watermark_enabled: boolean
  watermark_text: string
  
  // Additional Content
  custom_footer_text?: string
  show_page_numbers: boolean
  include_terms_conditions: boolean
  show_generation_info: boolean
  
  // Email Integration
  email_template: 'professional' | 'friendly' | 'formal'
}

// =============================================================================
// TEMPLATE THEMES AND PRESETS
// =============================================================================

export type TemplateTheme = 
  | 'stripe_inspired'    // Stripe professional design with premium gradients
  | 'modern_blue'        // Enhanced professional blue theme
  | 'executive_black'    // Premium executive design with sophisticated shadows
  | 'dutch_orange'       // Netherlands-themed with enhanced gradients
  | 'minimalist_platinum'// Ultra-refined minimal design with platinum tones
  | 'corporate_emerald'  // Professional eco-conscious theme with trust elements
  | 'fintech_purple'     // Modern fintech-inspired design with sophisticated gradients
  | 'warm_burgundy'      // Sophisticated burgundy theme with executive presence
  | 'classic_black'      // Legacy: Traditional black and white
  | 'minimalist_gray'    // Legacy: Ultra-clean minimal design
  | 'corporate_green'    // Legacy: Professional eco-friendly theme

export interface TemplateThemeConfig {
  id: TemplateTheme
  name: string
  description: string
  preview_url?: string
  brand_settings: Partial<BrandSettings>
  layout_settings: Partial<LayoutSettings>
}

// =============================================================================
// TEMPLATE RENDERING CONTEXT
// =============================================================================

export interface TemplateRenderContext {
  // Template Configuration
  template_config: InvoiceTemplateConfig
  
  // Brand Settings (extracted from template config for easy template access)
  brand_settings: BrandSettings
  
  // Business Data
  business_profile: BusinessProfile
  client: ClientInfo
  invoice: InvoiceData
  invoice_items: InvoiceItem[]
  
  // Calculated Fields
  calculations: InvoiceCalculations
  
  // Rendering Options
  render_options: RenderOptions
}

export interface BusinessProfile {
  business_name?: string
  kvk_number?: string
  btw_number?: string
  address?: string
  postal_code?: string
  city?: string
  country_code: string
  email?: string
  phone?: string
  website?: string
  logo_url?: string
}

export interface ClientInfo {
  name: string
  company_name?: string
  address?: string
  postal_code?: string
  city?: string
  country_code: string
  vat_number?: string
  is_business: boolean
  email?: string
  phone?: string
}

export interface InvoiceData {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  status: string
  reference?: string
  notes?: string
  currency: string
  vat_type: string
  vat_rate: number
}

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
}

export interface InvoiceCalculations {
  subtotal: number
  vat_amount: number
  total_amount: number
  discount_amount?: number
  vat_breakdown?: VatBreakdown[]
}

export interface VatBreakdown {
  rate: number
  amount: number
  description: string
}

// =============================================================================
// RENDERING OPTIONS
// =============================================================================

export interface RenderOptions {
  // Output Format
  format: 'pdf' | 'html' | 'preview'
  
  // PDF-specific Options
  pdf_options?: PdfOptions
  
  // Preview Options
  preview_mode?: 'desktop' | 'mobile' | 'print'
  
  // Debug Options
  include_debug_info?: boolean
  watermark_override?: string
}

export interface PdfOptions {
  format: 'A4' | 'Letter'
  print_background: boolean
  display_header_footer: boolean
  margin: {
    top: string
    right: string
    bottom: string
    left: string
  }
  scale?: number
  landscape?: boolean
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface CreateTemplateConfigRequest {
  name: string
  description?: string
  brand_settings?: Partial<BrandSettings>
  layout_settings?: Partial<LayoutSettings>
  compliance_settings?: Partial<ComplianceSettings>
  features?: Partial<TemplateFeatures>
}

export interface UpdateTemplateConfigRequest {
  id: string
  name?: string
  description?: string
  brand_settings?: Partial<BrandSettings>
  layout_settings?: Partial<LayoutSettings>
  compliance_settings?: Partial<ComplianceSettings>
  features?: Partial<TemplateFeatures>
  is_active?: boolean
  is_default?: boolean
}

export interface TemplatePreviewRequest {
  template_id?: string
  template_config?: Partial<InvoiceTemplateConfig>
  sample_data?: Partial<TemplateRenderContext>
  render_options?: Partial<RenderOptions>
  format?: 'pdf' | 'html' | 'image'
}

export interface TemplatePreviewResponse {
  success: boolean
  pdf_url?: string
  html_content?: string
  preview_url?: string
  generation_time_ms: number
  file_size_bytes?: number
  error_message?: string
}

// =============================================================================
// TEMPLATE VALIDATION
// =============================================================================

export interface TemplateValidationResult {
  is_valid: boolean
  errors: TemplateValidationError[]
  warnings: TemplateValidationWarning[]
}

export interface TemplateValidationError {
  field: string
  message: string
  code: string
  suggested_fix?: string
}

export interface TemplateValidationWarning {
  field: string
  message: string
  code: string
  impact: 'low' | 'medium' | 'high'
}

// =============================================================================
// TEMPLATE USAGE ANALYTICS
// =============================================================================

export interface TemplateUsageStats {
  template_id: string
  template_name: string
  times_used: number
  last_used_at?: Date
  avg_generation_time_ms?: number
  success_rate: number
  most_common_errors?: string[]
}

export interface TemplateAnalytics {
  total_templates: number
  active_templates: number
  most_used_template: TemplateUsageStats
  average_generation_time: number
  success_rate: number
  usage_by_theme: Record<TemplateTheme, number>
  monthly_usage: Array<{
    month: string
    usage_count: number
    unique_templates: number
  }>
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type TemplateConfigPartial = Partial<InvoiceTemplateConfig>

export type TemplateWithUsage = InvoiceTemplateConfig & {
  usage_stats: TemplateUsageStats
}

// Form data types for UI components
export interface TemplateFormData {
  name: string
  description: string
  
  // Brand settings form
  logo_file?: File
  business_name_override: string
  primary_color: string
  secondary_color: string
  accent_color: string
  font_family: string
  show_logo: boolean
  
  // Layout settings form
  format: LayoutSettings['format']
  header_style: LayoutSettings['header_style']
  footer_style: LayoutSettings['footer_style']
  color_scheme: LayoutSettings['color_scheme']
  spacing: LayoutSettings['spacing']
  
  // Compliance settings form
  language: ComplianceSettings['language']
  vat_display: ComplianceSettings['vat_display']
  show_payment_terms: boolean
  include_kvk: boolean
  include_btw: boolean
  payment_qr_code: boolean
  
  // Features form
  watermark_enabled: boolean
  watermark_text: string
  custom_footer_text: string
  show_page_numbers: boolean
  include_terms_conditions: boolean
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export class TemplateError extends Error {
  constructor(
    message: string,
    public code: string,
    public field?: string
  ) {
    super(message)
    this.name = 'TemplateError'
  }
}

export class TemplateRenderError extends Error {
  constructor(
    message: string,
    public template_id: string,
    public render_context?: Partial<TemplateRenderContext>
  ) {
    super(message)
    this.name = 'TemplateRenderError'
  }
}

export class TemplateValidationException extends Error {
  constructor(
    message: string,
    public validation_errors: TemplateValidationError[]
  ) {
    super(message)
    this.name = 'TemplateValidationException'
  }
}