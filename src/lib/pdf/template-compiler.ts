// Template Compiler for Invoice PDF Generation
// Handlebars-based template compilation and rendering
// Generated with Claude Code (https://claude.ai/code)

import Handlebars from 'handlebars'
import type { 
  TemplateRenderContext,
  BrandSettings,
  LayoutSettings,
  ComplianceSettings,
  TemplateFeatures 
} from '@/lib/types/template'
import { generateColorPalette, generateCSSVariables } from '@/lib/utils/color-palette'

// =============================================================================
// HANDLEBARS HELPERS
// =============================================================================

// Register custom Handlebars helpers for invoice rendering
export function registerTemplateHelpers() {
  // Currency formatting helper
  Handlebars.registerHelper('formatCurrency', function(amount: number | string, currency = 'EUR') {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(num)) return '€0,00'
    
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: currency
    }).format(num)
  })

  // Date formatting helper
  Handlebars.registerHelper('formatDate', function(dateString: string, format = 'DD-MM-YYYY') {
    if (!dateString) return ''
    
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    
    switch (format) {
      case 'DD-MM-YYYY':
        return date.toLocaleDateString('nl-NL', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
      case 'MM-DD-YYYY':
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
      case 'YYYY-MM-DD':
        return date.toISOString().split('T')[0]
      default:
        return date.toLocaleDateString('nl-NL')
    }
  })

  // Number formatting helper
  Handlebars.registerHelper('formatNumber', function(number: number | string, decimals = 2) {
    const num = typeof number === 'string' ? parseFloat(number) : number
    if (isNaN(num)) return '0'
    
    return new Intl.NumberFormat('nl-NL', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num)
  })

  // Percentage formatting helper
  Handlebars.registerHelper('formatPercentage', function(rate: number | string) {
    const num = typeof rate === 'string' ? parseFloat(rate) : rate
    if (isNaN(num)) return '0%'
    
    return `${Math.round(num * 100)}%`
  })

  // VAT type translation helper
  Handlebars.registerHelper('translateVatType', function(vatType: string) {
    const translations: Record<string, string> = {
      'standard': 'Standaard BTW',
      'reverse_charge': 'BTW verlegd',
      'exempt': 'Vrijgesteld',
      'reduced': 'Verlaagd tarief'
    }
    return translations[vatType] || vatType
  })

  // Invoice status translation helper
  Handlebars.registerHelper('translateStatus', function(status: string) {
    const translations: Record<string, string> = {
      'draft': 'Concept',
      'sent': 'Verzonden',
      'paid': 'Betaald',
      'partial': 'Deels betaald',
      'overdue': 'Verlopen',
      'cancelled': 'Geannuleerd'
    }
    return translations[status] || status
  })

  // Conditional helpers
  Handlebars.registerHelper('ifEquals', function(this: any, arg1: any, arg2: any, options: any) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this)
  })

  Handlebars.registerHelper('ifNotEquals', function(this: any, arg1: any, arg2: any, options: any) {
    return (arg1 != arg2) ? options.fn(this) : options.inverse(this)
  })

  Handlebars.registerHelper('ifGreaterThan', function(this: any, arg1: number, arg2: number, options: any) {
    return (arg1 > arg2) ? options.fn(this) : options.inverse(this)
  })

  // Math helpers
  Handlebars.registerHelper('add', function(a: number, b: number) {
    return a + b
  })

  Handlebars.registerHelper('subtract', function(a: number, b: number) {
    return a - b
  })

  Handlebars.registerHelper('multiply', function(a: number, b: number) {
    return a * b
  })

  // String helpers
  Handlebars.registerHelper('uppercase', function(str: string) {
    return str ? str.toUpperCase() : ''
  })

  Handlebars.registerHelper('lowercase', function(str: string) {
    return str ? str.toLowerCase() : ''
  })

  Handlebars.registerHelper('truncate', function(str: string, length: number) {
    if (!str) return ''
    return str.length > length ? str.substring(0, length) + '...' : str
  })

  // Enhanced Logo helper with advanced styling
  Handlebars.registerHelper('logoImage', function(logoUrl: string, width = '120px') {
    if (!logoUrl) return ''
    
    return new Handlebars.SafeString(`
      <div class="logo-wrapper" style="
        position: relative;
        display: inline-block;
        background: rgba(255, 255, 255, 0.02);
        border-radius: var(--radius-md);
        padding: var(--spacing-xs);
      ">
        <img src="${logoUrl}" 
             style="
               width: ${width}; 
               height: auto; 
               max-height: 90px;
               object-fit: contain;
               filter: 
                 drop-shadow(0 2px 4px rgba(0, 0, 0, 0.08))
                 drop-shadow(0 1px 2px rgba(0, 0, 0, 0.04))
                 contrast(1.02)
                 saturate(1.05);
               border-radius: var(--radius-sm);
             " 
             alt="Business Logo" />
      </div>
    `)
  })

  // Advanced Logo helper with size optimization
  Handlebars.registerHelper('optimizedLogo', function(logoUrl: string, size = 'medium') {
    if (!logoUrl) return ''
    
    const sizeMap = {
      small: { width: '80px', maxHeight: '60px' },
      medium: { width: '120px', maxHeight: '90px' },
      large: { width: '160px', maxHeight: '120px' }
    }
    
    const dimensions = sizeMap[size as keyof typeof sizeMap] || sizeMap.medium
    
    return new Handlebars.SafeString(`
      <div class="optimized-logo-container" style="
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.95);
        border-radius: var(--radius-lg);
        padding: var(--spacing-sm);
        box-shadow: 
          0 0 0 1px rgba(255, 255, 255, 0.3),
          0 2px 8px rgba(0, 0, 0, 0.06),
          0 4px 16px rgba(0, 0, 0, 0.03);
        backdrop-filter: blur(4px);
      ">
        <img src="${logoUrl}" 
             style="
               width: ${dimensions.width}; 
               max-height: ${dimensions.maxHeight};
               height: auto;
               object-fit: contain;
               filter: 
                 drop-shadow(0 1px 3px rgba(0, 0, 0, 0.1))
                 contrast(1.03)
                 saturate(1.08);
             " 
             alt="Logo" />
      </div>
    `)
  })

  // QR Code helper (placeholder for now)
  Handlebars.registerHelper('qrCode', function(data: string, size = '100px') {
    if (!data) return ''
    // This will be implemented with the qrcode library
    return new Handlebars.SafeString(
      `<div class="qr-code" style="width: ${size}; height: ${size};" data-qr="${data}">QR Code</div>`
    )
  })
}

// =============================================================================
// TEMPLATE COMPILER CLASS
// =============================================================================

export class InvoiceTemplateCompiler {
  private compiledTemplates: Map<string, HandlebarsTemplateDelegate> = new Map()
  
  constructor() {
    // Register helpers on instantiation
    registerTemplateHelpers()
  }

  /**
   * Compile a Handlebars template string
   */
  compileTemplate(templateSource: string, templateId?: string): HandlebarsTemplateDelegate {
    try {
      const compiled = Handlebars.compile(templateSource)
      
      if (templateId) {
        this.compiledTemplates.set(templateId, compiled)
      }
      
      return compiled
    } catch (error) {
      throw new Error(`Template compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get a compiled template from cache
   */
  getCompiledTemplate(templateId: string): HandlebarsTemplateDelegate | null {
    return this.compiledTemplates.get(templateId) || null
  }

  /**
   * Render a template with context data
   */
  renderTemplate(
    template: HandlebarsTemplateDelegate, 
    context: TemplateRenderContext
  ): string {
    try {
      // Prepare the context with additional computed fields
      const enhancedContext = this.enhanceRenderContext(context)
      
      return template(enhancedContext)
    } catch (error) {
      throw new Error(`Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Compile and render a template in one step
   */
  compileAndRender(templateSource: string, context: TemplateRenderContext): string {
    const compiled = this.compileTemplate(templateSource)
    return this.renderTemplate(compiled, context)
  }

  /**
   * Clear compiled template cache
   */
  clearCache(): void {
    this.compiledTemplates.clear()
  }

  /**
   * Enhance the render context with computed fields and utilities
   */
  private enhanceRenderContext(context: TemplateRenderContext): any {
    const { template_config, business_profile, client, invoice, invoice_items, calculations } = context

    // Generate theme CSS variables
    const cssVariables = this.generateCssVariables(template_config.brand_settings)
    
    // Calculate additional fields
    const paymentDueDays = this.calculatePaymentDueDays(invoice.invoice_date, invoice.due_date)
    const isOverdue = new Date(invoice.due_date) < new Date()
    
    // Format business address
    const businessAddress = this.formatAddress({
      address: business_profile.address,
      postal_code: business_profile.postal_code,
      city: business_profile.city,
      country_code: business_profile.country_code
    })
    
    // Format client address
    const clientAddress = this.formatAddress({
      address: client.address,
      postal_code: client.postal_code,
      city: client.city,
      country_code: client.country_code
    })

    return {
      ...context,
      
      // Add brand_settings at top level for template access
      brand_settings: template_config.brand_settings,
      
      // Enhanced business profile
      business_profile: {
        ...business_profile,
        formatted_address: businessAddress,
        display_name: business_profile.business_name || `${business_profile.business_name || ''} ${business_profile.business_name || ''}`.trim()
      },
      
      // Enhanced client info
      client: {
        ...client,
        formatted_address: clientAddress,
        display_name: client.company_name || client.name
      },
      
      // Enhanced invoice data
      invoice: {
        ...invoice,
        payment_due_days: paymentDueDays,
        is_overdue: isOverdue,
        formatted_total: this.formatCurrency(calculations.total_amount),
        formatted_subtotal: this.formatCurrency(calculations.subtotal),
        formatted_vat: this.formatCurrency(calculations.vat_amount)
      },
      
      // Enhanced calculations
      calculations: {
        ...calculations,
        has_discount: (calculations.discount_amount || 0) > 0,
        vat_rate_percentage: Math.round((invoice.vat_rate || 0) * 100)
      },
      
      // Template utilities
      template: {
        css_variables: cssVariables,
        theme_class: this.getThemeClass(template_config.layout_settings.color_scheme),
        current_date: new Date().toISOString(),
        generation_id: Math.random().toString(36).substring(7),
        debug_mode: false
      },
      
      // Localization
      translations: this.getTranslations(template_config.compliance_settings.language),
      
      // Feature flags
      features: {
        ...template_config.features,
        should_show_watermark: template_config.features.watermark_enabled && invoice.status === 'draft'
      }
    }
  }

  /**
   * Generate enhanced CSS custom properties from brand settings
   * Uses smart color palette generation for coordinated colors
   */
  private generateCssVariables(brandSettings: BrandSettings): string {
    // Generate smart color palette from primary color
    const colorPalette = generateColorPalette(brandSettings.primary_color)
    
    return `
      /* Smart Color Palette (Generated from Primary: ${brandSettings.primary_color}) */
      ${generateCSSVariables(colorPalette)}
      
      /* Original Brand Settings (For Backward Compatibility) */
      --brand-font: ${brandSettings.font_family};
      
      /* Enhanced Typography Scale */
      --font-hero: 36px;
      --font-heading: 28px;
      --font-subheading: 20px;
      --font-body: 14px;
      --font-caption: 12px;
      --font-small: 11px;
      
      /* Font Weights */
      --weight-light: 300;
      --weight-normal: 400;
      --weight-medium: 500;
      --weight-semibold: 600;
      --weight-bold: 700;
      --weight-black: 800;
      
      /* Spacing Scale (Based on 8px grid) */
      --spacing-xs: 4px;
      --spacing-sm: 8px;
      --spacing-md: 16px;
      --spacing-lg: 24px;
      --spacing-xl: 32px;
      --spacing-2xl: 48px;
      --spacing-3xl: 64px;
      
      /* Border Radius */
      --radius-sm: 4px;
      --radius-md: 8px;
      --radius-lg: 12px;
      --radius-xl: 16px;
      
      /* Professional Shadows */
      --shadow-soft: 0 2px 8px rgba(0, 0, 0, 0.04);
      --shadow-medium: 0 4px 16px rgba(0, 0, 0, 0.06);
      --shadow-strong: 0 8px 32px rgba(0, 0, 0, 0.08);
      --shadow-glow: 0 0 20px rgba(var(--brand-primary-rgb), 0.15);
      
      /* Success and Error Colors */
      --success-color: #10b981;
      --error-color: #ef4444;
      --warning-color: #f59e0b;
      
      /* Modern Gradients */
      --gradient-brand: linear-gradient(135deg, var(--brand-primary) 0%, rgba(var(--brand-primary-rgb), 0.8) 100%);
      --gradient-subtle: linear-gradient(135deg, rgba(var(--brand-primary-rgb), 0.05) 0%, rgba(var(--brand-primary-rgb), 0.02) 100%);
      --gradient-surface: linear-gradient(135deg, rgba(250, 250, 250, 0.8) 0%, rgba(248, 248, 248, 0.9) 100%);
    `.trim()
  }

  /**
   * Convert hex color to RGB values for gradient usage
   */
  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return '0, 0, 0'
    
    const r = parseInt(result[1], 16)
    const g = parseInt(result[2], 16)
    const b = parseInt(result[3], 16)
    
    return `${r}, ${g}, ${b}`
  }

  /**
   * Get theme CSS class based on color scheme
   */
  private getThemeClass(colorScheme: string): string {
    return `theme-${colorScheme}`
  }

  /**
   * Calculate days between invoice date and due date
   */
  private calculatePaymentDueDays(invoiceDate: string, dueDate: string): number {
    const invoice = new Date(invoiceDate)
    const due = new Date(dueDate)
    const diffTime = due.getTime() - invoice.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * Format address components into a readable string
   */
  private formatAddress(address: {
    address?: string
    postal_code?: string
    city?: string
    country_code?: string
  }): string {
    const parts: string[] = []
    
    if (address.address) parts.push(address.address)
    if (address.postal_code && address.city) {
      parts.push(`${address.postal_code} ${address.city}`)
    } else if (address.city) {
      parts.push(address.city)
    }
    if (address.country_code && address.country_code !== 'NL') {
      parts.push(address.country_code)
    }
    
    return parts.join('\n')
  }

  /**
   * Format currency amount
   */
  private formatCurrency(amount: number, currency = 'EUR'): string {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  /**
   * Get localized translations
   */
  private getTranslations(language: 'nl' | 'en'): Record<string, string> {
    const translations = {
      nl: {
        invoice: 'FACTUUR',
        invoice_to: 'Factureren aan:',
        invoice_details: 'Factuurgegevens:',
        invoice_date: 'Factuurdatum:',
        due_date: 'Vervaldatum:',
        payment_terms: 'Betalingstermijn:',
        reference: 'Referentie:',
        status: 'Status:',
        description: 'Beschrijving',
        quantity: 'Aantal',
        unit_price: 'Prijs p/e',
        total: 'Totaal',
        subtotal: 'Subtotaal:',
        vat: 'BTW',
        total_amount: 'Totaal:',
        payment_info: 'Betalingsinformatie',
        payment_notice: 'Gelieve het verschuldigde bedrag over te maken voor de vervaldatum.',
        notes: 'Opmerkingen:',
        days: 'dagen',
        footer_text: 'Factuur gegenereerd op'
      },
      en: {
        invoice: 'INVOICE',
        invoice_to: 'Invoice to:',
        invoice_details: 'Invoice details:',
        invoice_date: 'Invoice date:',
        due_date: 'Due date:',
        payment_terms: 'Payment terms:',
        reference: 'Reference:',
        status: 'Status:',
        description: 'Description',
        quantity: 'Quantity',
        unit_price: 'Unit price',
        total: 'Total',
        subtotal: 'Subtotal:',
        vat: 'VAT',
        total_amount: 'Total:',
        payment_info: 'Payment information',
        payment_notice: 'Please pay the amount due before the due date.',
        notes: 'Notes:',
        days: 'days',
        footer_text: 'Invoice generated on'
      }
    }
    
    return translations[language] || translations.nl
  }
}

// Export singleton instance
export const templateCompiler = new InvoiceTemplateCompiler()