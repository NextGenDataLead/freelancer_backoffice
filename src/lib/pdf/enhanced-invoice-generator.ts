// Enhanced Invoice PDF Generator with Puppeteer + Handlebars
// Replaces the basic Playwright implementation with professional features
// Generated with Claude Code (https://claude.ai/code)

import puppeteer, { Browser, Page } from 'puppeteer'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import QRCode from 'qrcode'
import { templateCompiler } from './template-compiler'
import type { 
  TemplateRenderContext, 
  InvoiceTemplateConfig,
  RenderOptions,
  PdfOptions
} from '@/lib/types/template'
import { TemplateRenderError } from '@/lib/types/template'

// =============================================================================
// PDF GENERATOR CLASS
// =============================================================================

export class EnhancedInvoiceGenerator {
  private browser: Browser | null = null
  private templateCache: Map<string, string> = new Map()

  constructor() {
    // Initialize template cache
    this.loadTemplates()
  }

  /**
   * Generate PDF for an invoice using enhanced Puppeteer engine
   */
  async generateInvoicePDF(
    context: TemplateRenderContext,
    options?: Partial<RenderOptions>
  ): Promise<Buffer> {
    const startTime = Date.now()
    
    try {
      // Force reload templates in development to pick up changes
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔄 Reloading templates for development')
        this.reloadTemplates()
      }
      
      // Ensure browser is running
      await this.ensureBrowser()
      
      // Prepare render options
      const renderOptions = this.prepareRenderOptions(options)
      
      // Generate HTML content
      const htmlContent = await this.generateHTML(context, renderOptions)
      
      // Generate PDF
      const pdfBuffer = await this.renderPDF(htmlContent, renderOptions.pdf_options!)
      
      // Update template usage statistics
      await this.updateTemplateUsage(context.template_config.id, Date.now() - startTime)
      
      return pdfBuffer
    } catch (error) {
      throw new TemplateRenderError(
        `PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context.template_config.id,
        context
      )
    }
  }

  /**
   * Generate HTML content for preview or email
   */
  async generateHTML(
    context: TemplateRenderContext,
    options?: Partial<RenderOptions>
  ): Promise<string> {
    try {
      // Get template source
      const templateSource = await this.getTemplateSource(context.template_config)
      
      // Enhance context with additional data
      const enhancedContext = await this.enhanceContext(context, options)
      
      // Compile and render template
      const htmlContent = templateCompiler.compileAndRender(templateSource, enhancedContext)
      
      // Debug: Check if logo HTML is being generated
      console.log('🔍 Checking logo generation in HTML...')
      const logoMatch = htmlContent.match(/<img[^>]*src="[^"]*"[^>]*alt="Logo"[^>]*>/gi)
      if (logoMatch) {
        console.log('✅ Logo HTML found:', logoMatch[0])
      } else {
        console.log('❌ No logo HTML found in generated template')
        console.log('📋 Template context logo info:', {
          business_logo_url: enhancedContext.business_profile?.logo_url,
          brand_settings_logo_url: enhancedContext.template_config?.brand_settings?.logo_url,
          show_logo: enhancedContext.template_config?.brand_settings?.show_logo
        })
      }
      
      // Post-process HTML (QR codes, image optimization, etc.)
      return await this.postProcessHTML(htmlContent, enhancedContext)
    } catch (error) {
      throw new TemplateRenderError(
        `HTML generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context.template_config.id,
        context
      )
    }
  }

  /**
   * Generate preview image for template configuration
   */
  async generatePreviewImage(
    context: TemplateRenderContext,
    width = 800,
    height = 1200
  ): Promise<Buffer> {
    try {
      await this.ensureBrowser()
      
      const htmlContent = await this.generateHTML(context, { 
        format: 'preview',
        preview_mode: 'desktop' 
      })
      
      const page = await this.browser!.newPage()
      await page.setViewport({ width, height, deviceScaleFactor: 2 })
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' })
      
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false,
        clip: { x: 0, y: 0, width, height }
      })
      
      await page.close()
      
      // Optimize image with Sharp
      return await sharp(screenshot)
        .png({ quality: 90, compressionLevel: 9 })
        .resize(width, height, { fit: 'contain', background: '#ffffff' })
        .toBuffer()
    } catch (error) {
      throw new TemplateRenderError(
        `Preview generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context.template_config.id,
        context
      )
    }
  }

  /**
   * Validate template configuration
   */
  async validateTemplate(config: InvoiceTemplateConfig): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Validate brand settings
      const brandSettings = config.brand_settings
      if (!this.isValidColor(brandSettings.primary_color)) {
        errors.push('Invalid primary color format')
      }
      if (!this.isValidColor(brandSettings.secondary_color)) {
        errors.push('Invalid secondary color format')
      }
      
      // Validate layout settings
      const layoutSettings = config.layout_settings
      if (!['A4', 'Letter'].includes(layoutSettings.format)) {
        errors.push('Invalid page format')
      }
      
      // Validate compliance settings
      const complianceSettings = config.compliance_settings
      if (!['nl', 'en'].includes(complianceSettings.language)) {
        errors.push('Unsupported language')
      }
      
      // Logo validation
      if (brandSettings.logo_url && !await this.validateImageUrl(brandSettings.logo_url)) {
        warnings.push('Logo URL may not be accessible')
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      }
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
    this.templateCache.clear()
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Ensure browser is running
   */
  private async ensureBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080'
        ]
      })
    }
  }

  /**
   * Force reload templates from filesystem (clears cache first)
   */
  public reloadTemplates(): void {
    this.templateCache.clear()
    this.loadTemplates()
  }

  /**
   * Load templates from filesystem
   */
  private loadTemplates(): void {
    try {
      const templatesDir = path.join(process.cwd(), 'src/lib/pdf/templates')
      
      // Load professional template
      const professionalTemplate = fs.readFileSync(
        path.join(templatesDir, 'professional-template.hbs'),
        'utf8'
      )
      this.templateCache.set('professional', professionalTemplate)
      
    } catch (error) {
      console.warn('Failed to load templates from filesystem:', error)
      // Fallback to embedded template would go here
    }
  }

  /**
   * Get template source based on configuration
   */
  private async getTemplateSource(config: InvoiceTemplateConfig): Promise<string> {
    // For MVP, always use professional template
    const templateSource = this.templateCache.get('professional')
    
    if (!templateSource) {
      throw new Error('Professional template not found')
    }
    
    return templateSource
  }

  /**
   * Enhance context with additional computed data
   */
  private async enhanceContext(
    context: TemplateRenderContext,
    options?: Partial<RenderOptions>
  ): Promise<TemplateRenderContext> {
    const enhanced = { ...context }

    // Add QR code for payments if enabled
    if (context.template_config.compliance_settings.payment_qr_code) {
      const paymentData = this.generatePaymentQRData(context)
      const qrCode = await this.generateQRCode(paymentData)
      // Add to enhanced context (will be used in template)
      ;(enhanced as any).payment_qr_code = qrCode
    }

    // Debug: Check logo URL sources
    console.log('🔍 Logo URL debugging:')
    console.log('  - template_config.brand_settings.logo_url:', context.template_config?.brand_settings?.logo_url)
    console.log('  - business_profile.logo_url (before):', context.business_profile?.logo_url)
    console.log('  - brand_settings.show_logo:', context.template_config?.brand_settings?.show_logo)

    // Ensure logo URL is properly set in business profile from template config if missing
    if (!enhanced.business_profile.logo_url && context.template_config?.brand_settings?.logo_url) {
      console.log('🔧 Logo URL missing in business profile, copying from template config')
      enhanced.business_profile = {
        ...enhanced.business_profile,
        logo_url: context.template_config.brand_settings.logo_url
      }
    }

    // Optimize logo image if present
    const logoUrl = enhanced.business_profile.logo_url
    if (logoUrl) {
      console.log('✅ Processing logo URL:', logoUrl)
      try {
        const optimizedUrl = await this.optimizeImage(logoUrl, { width: 240, height: 120 })
        // Keep the original logo URL (optimization is just for display)
        enhanced.business_profile = {
          ...enhanced.business_profile,
          logo_url: optimizedUrl
        }
        console.log('✅ Logo URL set in enhanced context:', optimizedUrl)
      } catch (error) {
        console.warn('❌ Logo optimization failed:', error)
      }
    } else {
      console.log('❌ No logo URL found in business profile or template config')
    }

    // Add render timestamp and options as extended properties
    ;(enhanced as any).render_timestamp = new Date().toISOString()
    enhanced.render_options = { 
      format: options?.format || 'pdf',
      pdf_options: options?.pdf_options,
      preview_mode: options?.preview_mode,
      include_debug_info: options?.include_debug_info
    }

    return enhanced
  }

  /**
   * Post-process HTML content
   */
  private async postProcessHTML(html: string, context: TemplateRenderContext): Promise<string> {
    let processedHtml = html

    // Replace QR code placeholders with actual SVG
    const qrCode = (context as any).payment_qr_code
    if (qrCode) {
      processedHtml = processedHtml.replace(
        /<div class="qr-code"[^>]*data-qr="([^"]*)"[^>]*>.*?<\/div>/g,
        `<div class="qr-code">${qrCode}</div>`
      )
    }

    // Inline critical CSS for better rendering
    processedHtml = this.inlineCriticalStyles(processedHtml)

    return processedHtml
  }

  /**
   * Render HTML to PDF using Puppeteer
   */
  private async renderPDF(html: string, pdfOptions: PdfOptions): Promise<Buffer> {
    const page = await this.browser!.newPage()
    
    try {
      console.log('🔍 Setting HTML content for PDF generation...')
      
      // Set desktop viewport to ensure proper layout (prevents mobile CSS from stacking boxes)
      await page.setViewport({ 
        width: 1200, 
        height: 1600, 
        deviceScaleFactor: 2 
      })
      
      // Set optimal page settings
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      })

      // Add pdf-generation class to body to force desktop layout
      console.log('🔧 Adding pdf-generation class to force desktop layout...')
      await page.evaluate(() => {
        document.body.classList.add('pdf-generation')
      })

      // Emulate screen media type for better image rendering (per Puppeteer docs)
      console.log('📺 Emulating screen media type for image rendering...')
      await page.emulateMediaType('screen')

      // Debug: Check if logo images are present in the DOM
      const logoImages = await page.$$eval('img', imgs => 
        imgs.map(img => ({ src: img.src, alt: img.alt, loaded: img.complete }))
      )
      console.log('🖼️ Found images in HTML:', logoImages)

      // Wait a bit more for any lazy-loaded images
      console.log('⏱️ Waiting for additional image loading...')
      await page.waitForTimeout(2000)

      console.log('📄 Generating PDF with options:', {
        format: pdfOptions.format,
        printBackground: pdfOptions.print_background,
        timeout: 30000
      })

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: pdfOptions.format,
        printBackground: pdfOptions.print_background,
        displayHeaderFooter: pdfOptions.display_header_footer,
        margin: pdfOptions.margin,
        scale: pdfOptions.scale || 1,
        landscape: pdfOptions.landscape || false,
        preferCSSPageSize: true,
        timeout: 30000
      })

      console.log('✅ PDF generation complete, buffer size:', pdfBuffer.length)
      return Buffer.from(pdfBuffer)
    } finally {
      await page.close()
    }
  }

  /**
   * Prepare render options with defaults
   */
  private prepareRenderOptions(options?: Partial<RenderOptions>): RenderOptions {
    return {
      format: 'pdf',
      pdf_options: {
        format: 'A4',
        print_background: true,
        display_header_footer: false,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        },
        scale: 1,
        landscape: false
      },
      preview_mode: 'desktop',
      include_debug_info: false,
      ...options
    }
  }

  /**
   * Generate QR code for payment information
   */
  private async generateQRCode(data: string): Promise<string> {
    try {
      return await QRCode.toString(data, {
        type: 'svg',
        width: 100,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
    } catch (error) {
      console.warn('QR code generation failed:', error)
      return ''
    }
  }

  /**
   * Generate payment QR data (SEPA format)
   */
  private generatePaymentQRData(context: TemplateRenderContext): string {
    // Basic SEPA QR format - would need proper implementation
    const { invoice, calculations, business_profile } = context
    
    return [
      'BCD', // Service Tag
      '002', // Version
      '1', // Character set (UTF-8)
      'SCT', // Identification
      business_profile.business_name || '', // Beneficiary Name
      '', // Beneficiary IBAN (would need to be configured)
      `EUR${calculations.total_amount.toFixed(2)}`, // Amount
      '', // Purpose
      invoice.invoice_number, // Remittance Information
    ].join('\n')
  }

  /**
   * Optimize image for better rendering
   */
  private async optimizeImage(
    imageUrl: string, 
    options: { width: number; height: number }
  ): Promise<string> {
    try {
      // For now, return original URL
      // In production, this would download, optimize, and cache the image
      return imageUrl
    } catch (error) {
      console.warn('Image optimization failed:', error)
      return imageUrl
    }
  }

  /**
   * Inline critical CSS for better rendering
   */
  private inlineCriticalStyles(html: string): string {
    // For MVP, return as-is
    // In production, this would extract and inline critical CSS
    return html
  }

  /**
   * Validate color format
   */
  private isValidColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color)
  }

  /**
   * Validate image URL accessibility
   */
  private async validateImageUrl(url: string): Promise<boolean> {
    try {
      // Basic URL validation for MVP
      return /^https?:\/\/.+\.(jpg|jpeg|png|gif|svg)$/i.test(url)
    } catch (error) {
      return false
    }
  }

  /**
   * Update template usage statistics
   */
  private async updateTemplateUsage(templateId: string, generationTimeMs: number): Promise<void> {
    try {
      // This would update the database with usage statistics
      console.log(`Template ${templateId} used, generation time: ${generationTimeMs}ms`)
    } catch (error) {
      console.warn('Failed to update template usage:', error)
    }
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create singleton instance of the enhanced generator
 */
let generatorInstance: EnhancedInvoiceGenerator | null = null

export function getInvoiceGenerator(): EnhancedInvoiceGenerator {
  if (!generatorInstance) {
    generatorInstance = new EnhancedInvoiceGenerator()
  }
  return generatorInstance
}

/**
 * Clean up the singleton instance
 */
export async function cleanupInvoiceGenerator(): Promise<void> {
  if (generatorInstance) {
    await generatorInstance.cleanup()
    generatorInstance = null
  }
}

/**
 * Generate invoice PDF with simplified interface (for compatibility)
 */
export async function generateInvoicePDF(data: {
  invoice: any
  client: any
  items: any[]
  businessProfile: any
  templateConfig?: InvoiceTemplateConfig
}): Promise<Buffer> {
  const generator = getInvoiceGenerator()
  
  // Convert old format to new context format
  const templateConfig = data.templateConfig || await getDefaultTemplateConfig()
  const context: TemplateRenderContext = {
    template_config: templateConfig,
    brand_settings: templateConfig.brand_settings,
    business_profile: {
      business_name: data.businessProfile.business_name,
      kvk_number: data.businessProfile.kvk_number,
      btw_number: data.businessProfile.btw_number,
      address: data.businessProfile.address,
      postal_code: data.businessProfile.postal_code,
      city: data.businessProfile.city,
      country_code: data.businessProfile.country_code || 'NL',
      email: data.businessProfile.email,
      phone: data.businessProfile.phone,
      logo_url: data.businessProfile.logo_url
    },
    client: {
      name: data.client.name,
      company_name: data.client.company_name,
      address: data.client.address,
      postal_code: data.client.postal_code,
      city: data.client.city,
      country_code: data.client.country_code || 'NL',
      vat_number: data.client.vat_number,
      is_business: data.client.is_business || false,
      email: data.client.email,
      phone: data.client.phone
    },
    invoice: {
      id: data.invoice.id,
      invoice_number: data.invoice.invoice_number,
      invoice_date: data.invoice.invoice_date,
      due_date: data.invoice.due_date,
      status: data.invoice.status,
      reference: data.invoice.reference,
      notes: data.invoice.notes,
      currency: data.invoice.currency || 'EUR',
      vat_type: data.invoice.vat_type || 'standard',
      vat_rate: data.invoice.vat_rate || 0.21
    },
    invoice_items: data.items.map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total
    })),
    calculations: {
      subtotal: data.invoice.subtotal,
      vat_amount: data.invoice.vat_amount,
      total_amount: data.invoice.total_amount,
      discount_amount: 0
    },
    render_options: {
      format: 'pdf'
    }
  }
  
  return generator.generateInvoicePDF(context)
}

/**
 * Get default template configuration
 */
async function getDefaultTemplateConfig(): Promise<InvoiceTemplateConfig> {
  // Return default configuration
  // In production, this would fetch from database
  return {
    id: 'default',
    tenant_id: 'default',
    created_by: 'system',
    name: 'Professional Template',
    description: 'Professional invoice template with Dutch compliance',
    brand_settings: {
      logo_url: undefined,
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