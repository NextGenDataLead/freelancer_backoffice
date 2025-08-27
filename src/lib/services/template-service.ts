// Template Service
// Client-side service for template management and API interactions
// Generated with Claude Code (https://claude.ai/code)

import type { 
  InvoiceTemplateConfig,
  UpdateTemplateConfigRequest,
  TemplatePreviewRequest,
  TemplatePreviewResponse,
  TemplateThemeConfig,
  TemplateValidationResult,
  TemplateValidationError
} from '@/lib/types/template'

// =============================================================================
// TEMPLATE SERVICE CLASS
// =============================================================================

export class TemplateService {
  private baseUrl = '/api/invoice-template'

  /**
   * Get current template configuration
   */
  async getTemplateConfig(): Promise<InvoiceTemplateConfig> {
    const response = await fetch(`${this.baseUrl}/config`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch template config: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch template config')
    }
    
    return data.data
  }

  /**
   * Update template configuration
   */
  async updateTemplateConfig(
    updates: Partial<UpdateTemplateConfigRequest>
  ): Promise<InvoiceTemplateConfig> {
    const response = await fetch(`${this.baseUrl}/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to update template config: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to update template config')
    }
    
    return data.data
  }

  /**
   * Generate template preview
   */
  async generatePreview(
    request: TemplatePreviewRequest
  ): Promise<TemplatePreviewResponse> {
    const response = await fetch(`${this.baseUrl}/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to generate preview: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to generate preview')
    }
    
    return {
      success: data.success,
      pdf_url: data.data.pdf_data ? `data:application/pdf;base64,${data.data.pdf_data}` : undefined,
      html_content: data.data.html_content,
      preview_url: data.data.image_data,
      generation_time_ms: data.data.generation_time_ms,
      file_size_bytes: data.data.file_size_bytes,
      error_message: data.error
    }
  }

  /**
   * Get available themes and configuration options
   */
  async getThemes(): Promise<{
    themes: TemplateThemeConfig[]
    fonts: Array<{ family: string; name: string; category: string }>
    color_palettes: Record<string, Array<{ name: string; hex: string }>>
    layout_options: any
    compliance_options: any
    feature_options: any
    recommendations: any
  }> {
    const response = await fetch(`${this.baseUrl}/themes`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch themes: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch themes')
    }
    
    return data.data
  }

  /**
   * Apply a theme to current configuration
   */
  async applyTheme(themeId: string): Promise<InvoiceTemplateConfig> {
    const themes = await this.getThemes()
    const theme = themes.themes.find(t => t.id === themeId)
    
    if (!theme) {
      throw new Error(`Theme ${themeId} not found`)
    }
    
    // Get current config
    const currentConfig = await this.getTemplateConfig()
    
    // Apply theme settings
    const updatedConfig = {
      brand_settings: {
        ...currentConfig.brand_settings,
        ...theme.brand_settings
      },
      layout_settings: {
        ...currentConfig.layout_settings,
        ...theme.layout_settings
      }
    }
    
    // Update configuration
    return this.updateTemplateConfig(updatedConfig)
  }

  /**
   * Generate PDF preview with current settings
   */
  async generatePDFPreview(
    customSettings?: Partial<InvoiceTemplateConfig>
  ): Promise<string> {
    const preview = await this.generatePreview({
      template_config: customSettings,
      format: 'pdf'
    })
    
    if (!preview.pdf_url) {
      throw new Error('PDF preview generation failed')
    }
    
    return preview.pdf_url
  }

  /**
   * Generate HTML preview for live editing
   */
  async generateHTMLPreview(
    customSettings?: Partial<InvoiceTemplateConfig>
  ): Promise<string> {
    const preview = await this.generatePreview({
      template_config: customSettings,
      format: 'html'
    })
    
    if (!preview.html_content) {
      throw new Error('HTML preview generation failed')
    }
    
    return preview.html_content
  }

  /**
   * Generate image preview for thumbnails
   */
  async generateImagePreview(
    customSettings?: Partial<InvoiceTemplateConfig>
  ): Promise<string> {
    const preview = await this.generatePreview({
      template_config: customSettings,
      format: 'image'
    })
    
    if (!preview.preview_url) {
      throw new Error('Image preview generation failed')
    }
    
    return preview.preview_url
  }

  /**
   * Validate template configuration
   */
  async validateTemplate(
    config: Partial<InvoiceTemplateConfig>
  ): Promise<TemplateValidationResult> {
    // Client-side validation
    const errors: TemplateValidationError[] = []
    const warnings: Array<{ field: string; message: string; code: string; impact: 'low' | 'medium' | 'high' }> = []

    // Validate brand settings
    if (config.brand_settings) {
      const { brand_settings } = config
      
      if (brand_settings.primary_color && !this.isValidHexColor(brand_settings.primary_color)) {
        errors.push({
          field: 'brand_settings.primary_color',
          message: 'Invalid hex color format',
          code: 'INVALID_COLOR'
        })
      }
      
      if (brand_settings.logo_url && !this.isValidUrl(brand_settings.logo_url)) {
        warnings.push({
          field: 'brand_settings.logo_url',
          message: 'Logo URL format may be invalid',
          code: 'INVALID_URL',
          impact: 'medium'
        })
      }
    }

    // Validate layout settings
    if (config.layout_settings) {
      const { layout_settings } = config
      
      if (layout_settings.format && !['A4', 'Letter'].includes(layout_settings.format)) {
        errors.push({
          field: 'layout_settings.format',
          message: 'Invalid page format',
          code: 'INVALID_FORMAT'
        })
      }
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Reset to default configuration
   */
  async resetToDefault(): Promise<InvoiceTemplateConfig> {
    return this.updateTemplateConfig({
      brand_settings: {
        primary_color: '#2563eb',
        secondary_color: '#64748b',
        accent_color: '#0ea5e9',
        text_color: '#1f2937',
        background_color: '#ffffff',
        font_family: 'Inter',
        show_logo: true,
        logo_position: 'left'
      },
      layout_settings: {
        format: 'A4',
        orientation: 'portrait',
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
        show_page_numbers: false,
        include_terms_conditions: false,
        email_template: 'professional'
      }
    })
  }

  // =============================================================================
  // PRIVATE UTILITY METHODS
  // =============================================================================

  private isValidHexColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color)
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const templateService = new TemplateService()

// =============================================================================
// UTILITY FUNCTIONS FOR COMPONENTS
// =============================================================================

/**
 * Download a data URL as a file
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

/**
 * Calculate color contrast ratio
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)
  
  if (!rgb1 || !rgb2) return 1

  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b)
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b)
  
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Get luminance value for contrast calculation
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Generate color variations (lighter/darker)
 */
export function generateColorVariations(baseColor: string): {
  lighter: string
  darker: string
  lightest: string
  darkest: string
} {
  const rgb = hexToRgb(baseColor)
  if (!rgb) throw new Error('Invalid color format')

  return {
    lighter: rgbToHex(
      Math.min(255, rgb.r + 30),
      Math.min(255, rgb.g + 30),
      Math.min(255, rgb.b + 30)
    ),
    darker: rgbToHex(
      Math.max(0, rgb.r - 30),
      Math.max(0, rgb.g - 30),
      Math.max(0, rgb.b - 30)
    ),
    lightest: rgbToHex(
      Math.min(255, rgb.r + 60),
      Math.min(255, rgb.g + 60),
      Math.min(255, rgb.b + 60)
    ),
    darkest: rgbToHex(
      Math.max(0, rgb.r - 60),
      Math.max(0, rgb.g - 60),
      Math.max(0, rgb.b - 60)
    )
  }
}

/**
 * Convert RGB values to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(x => {
    const hex = Math.round(x).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')}`
}