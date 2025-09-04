import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink } from 'fs/promises'
import { spawn } from 'child_process'
import path from 'path'
import { nanoid } from 'nanoid'
import { 
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'
import { validateSupplierForExpense } from '@/lib/utils/supplier-validation'

interface VATValidationResult {
  vat_number: string
  country_code: string
  valid: boolean | null
  company_name?: string
  company_address?: string
  validation_date?: string
  user_error?: string
  error?: string
  extraction_context?: string
  line_number?: number
  extraction_method?: string
}

interface OCRResult {
  success: boolean
  error?: string
  confidence: number
  raw_text?: string
  extracted_data?: {
    vendor_name?: string
    expense_date?: string
    amount?: number
    vat_amount?: number
    vat_rate?: number
    total_amount?: number
    currency?: string
    requires_manual_review?: boolean
    expense_type?: string
    reverse_charge_detected_in_text?: boolean
    reverse_charge_detected_from_vat?: boolean
    suggested_vat_type?: string
    suggested_vat_rate?: number
    suggested_payment_method?: string
    vat_validation_status?: string
    vat_validation_message?: string
    validated_supplier?: {
      vat_number: string
      country_code: string
      company_name?: string
      company_address?: string
      vies_validation_date?: string
    }
  }
  vat_numbers?: {
    extracted: Array<{
      vat_number: string
      country_code: string
      raw_match: string
      line_context: string
      line_number: number
      extraction_method: string
    }>
    vies_validation: VATValidationResult[]
    validation_count: number
    total_extracted: number
  }
  extraction_method?: string
  ocr_metadata?: {
    line_count: number
    processing_engine: string
    language: string
    confidence_scores: number[]
  }
}

/**
 * POST /api/expenses/ocr-process
 * Process receipt image using PaddleOCR and extract structured data
 */
export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null
  
  try {
    // Check authentication
    const profile = await getCurrentUserProfile()
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('receipt') as File
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Validate file type - support images and PDFs
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload a JPEG, PNG, WebP image, or PDF document.' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Create temporary file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || (file.type === 'application/pdf' ? 'pdf' : 'jpg')
    const tempFileName = `receipt_${nanoid()}.${fileExtension}`
    tempFilePath = path.join('/tmp', tempFileName)
    
    await writeFile(tempFilePath, buffer)

    // Process with PaddleOCR Python script
    const ocrResult = await processImageWithPaddleOCR(tempFilePath)

    if (!ocrResult.success) {
      return NextResponse.json(
        { success: false, error: ocrResult.error || 'OCR processing failed' },
        { status: 500 }
      )
    }

    // Enhance the extracted data with additional processing
    let enhancedData
    try {
      enhancedData = await enhanceExtractedData(ocrResult.extracted_data)
    } catch (enhanceError) {
      console.error('Enhancement failed:', enhanceError)
      // Fallback to original data if enhancement fails
      enhancedData = ocrResult.extracted_data
    }

    const response = createApiResponse({
      success: ocrResult.success,
      confidence: ocrResult.confidence,
      extracted_data: enhancedData, // Use enhanced data instead of original
      ocr_metadata: ocrResult.ocr_metadata
    }, 'Receipt processed successfully')

    return NextResponse.json(response)

  } catch (error) {
    console.error('OCR processing error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error during OCR processing' },
      { status: 500 }
    )
  } finally {
    // Clean up temporary file
    if (tempFilePath) {
      try {
        await unlink(tempFilePath)
      } catch (error) {
        console.warn('Failed to delete temporary file:', tempFilePath)
      }
    }
  }
}

/**
 * Process image using PaddleOCR Python script
 */
function processImageWithPaddleOCR(imagePath: string): Promise<OCRResult> {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'ocr_processor.py')
    const pythonProcess = spawn('python3', [scriptPath, imagePath])

    let stdout = ''
    let stderr = ''

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    pythonProcess.on('close', (code) => {
      console.log(`Python process completed with code: ${code}`)
      console.log(`Stdout length: ${stdout.length} chars`)
      console.log(`Stderr length: ${stderr.length} chars`)
      
      if (code !== 0) {
        console.error('PaddleOCR script error code:', code)
        console.error('PaddleOCR stderr:', stderr)
        console.error('PaddleOCR stdout:', stdout.substring(0, 500) + '...')
        resolve({
          success: false,
          error: `OCR processing failed with code ${code}: ${stderr}`,
          confidence: 0
        })
        return
      }

      try {
        const result = JSON.parse(stdout) as OCRResult
        resolve(result)
      } catch (parseError) {
        console.error('Failed to parse OCR result:', parseError)
        resolve({
          success: false,
          error: 'Failed to parse OCR result',
          confidence: 0
        })
      }
    })

    pythonProcess.on('error', (error) => {
      console.error('Failed to start PaddleOCR process:', error)
      resolve({
        success: false,
        error: `Failed to start OCR process: ${error.message}`,
        confidence: 0
      })
    })

    // Set timeout
    setTimeout(() => {
      pythonProcess.kill('SIGTERM')
      resolve({
        success: false,
        error: 'OCR processing timeout',
        confidence: 0
      })
    }, 90000) // 90 seconds timeout for large documents with LLM-enhanced processing
  })
}

/**
 * Enhance extracted data with additional processing
 */
async function enhanceExtractedData(data: any) {
  if (!data) return data

  // Validate amounts first
  const validatedAmounts = validateAmounts(data)

  // Validate supplier for reverse charge detection
  const supplierValidation = await validateSupplierForExpense(
    data.vendor_name,
    undefined, // VAT number not extracted from OCR yet
    undefined  // Country code not extracted from OCR yet
  )

  // Set expense category based on vendor
  let expenseType = 'other'
  if (data?.vendor_name && typeof data.vendor_name === 'string') {
    expenseType = categorizeExpense(data.vendor_name)
  }

  // Detect reverse charge from OCR text patterns and preserve OCR processor detection
  const ocrDetectedReverseCharge = data.reverse_charge_detected_in_text || false
  const textDetectedReverseCharge = detectReverseChargeFromText(data.raw_text || data.description || '')
  const reverseChargeDetected = ocrDetectedReverseCharge || textDetectedReverseCharge
  
  // Debug logging
  console.log('Reverse charge detection:', {
    ocrDetectedReverseCharge,
    textDetectedReverseCharge,
    reverseChargeDetected,
    hasRawText: !!(data.raw_text),
    rawTextLength: (data.raw_text || '').length,
    suggestedVATType: data.suggested_vat_type
  })
  
  // Override supplier validation if reverse charge is explicitly mentioned in text
  const finalRequiresReverseCharge = reverseChargeDetected || supplierValidation.requiresReverseCharge
  const finalSuggestedVATType = reverseChargeDetected ? 'reverse_charge' : supplierValidation.suggestedVATType

  // Format date for HTML date input (YYYY-MM-DD)
  let formattedDate = new Date().toISOString().split('T')[0] // Default to today
  if (data.expense_date) {
    try {
      const dateObj = new Date(data.expense_date)
      formattedDate = dateObj.toISOString().split('T')[0]
    } catch (error) {
      console.warn('Invalid date format from OCR:', data.expense_date)
    }
  }

  return {
    ...data,
    ...validatedAmounts,
    expense_type: expenseType,
    expense_date: formattedDate, // HTML date input format (YYYY-MM-DD)
    description: cleanDescription(data.description) || '', // Clean up OCR description
    is_likely_foreign_supplier: supplierValidation.isEUSupplier || finalRequiresReverseCharge,
    requires_vat_number: finalRequiresReverseCharge,
    requires_reverse_charge: finalRequiresReverseCharge,
    suggested_vat_type: finalSuggestedVATType,
    reverse_charge_detected_in_text: reverseChargeDetected,
    supplier_warnings: supplierValidation.foreignSupplierWarnings,
    suggested_payment_method: 'bank_transfer'
  }
}


/**
 * Clean up OCR-extracted description to make it more readable
 */
function cleanDescription(rawDescription: string): string {
  if (!rawDescription) return ''
  
  // Remove common OCR noise and formatting artifacts
  let cleaned = rawDescription
    .replace(/\n+/g, ' ') // Replace multiple newlines with single space
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[|]+/g, ' ') // Remove pipe characters (common OCR artifacts)
    .replace(/^\W+|\W+$/g, '') // Remove leading/trailing non-word characters
    .trim()
  
  // Try to extract meaningful service description for invoices
  const servicePatterns = [
    /factuur.*?([a-z\s]+)/i,
    /invoice.*?([a-z\s]+)/i,
    /service.*?([a-z\s]+)/i,
    /abonnement.*?([a-z\s]+)/i
  ]
  
  for (const pattern of servicePatterns) {
    const match = cleaned.match(pattern)
    if (match && match[1] && match[1].trim().length > 3) {
      return match[1].trim()
    }
  }
  
  // If no service pattern found, return first reasonable chunk (max 150 chars)
  if (cleaned.length > 150) {
    const truncated = cleaned.substring(0, 150)
    const lastSpace = truncated.lastIndexOf(' ')
    return lastSpace > 100 ? truncated.substring(0, lastSpace) + '...' : truncated + '...'
  }
  
  return cleaned
}

/**
 * Detect reverse charge patterns in OCR text
 */
function detectReverseChargeFromText(text: string): boolean {
  if (!text) return false
  
  const normalizedText = text.toLowerCase()
  
  // Common reverse charge indicators in multiple languages
  const reverseChargePatterns = [
    // English
    'reverse charge', 'reverse taxation', 'reverse vat', 'customer vat liable',
    'vat reverse charge', 'reverse charge mechanism', 'customer liable for vat',
    // Dutch
    'btw verlegd', 'verlegde btw', 'btw verlegging', 'klant verschuldigd btw',
    'omgekeerde btw', 'btw naar klant', 'btw door klant',
    // German (common in EU invoices)
    'reverse charge verfahren', 'umkehrung der steuerschuldnerschaft',
    // French (common in EU invoices)
    'autoliquidation', 'auto-liquidation'
  ]
  
  return reverseChargePatterns.some(pattern => normalizedText.includes(pattern))
}

/**
 * Categorize expense based on vendor using official Belastingdienst categories
 */
function categorizeExpense(vendorName: string): string {
  if (!vendorName) return 'overige_zakelijk'
  
  const vendor = vendorName.toLowerCase()
  
  // Telecommunications/Internet (companies and services)
  const telecomCompanies = ['kpn', 'vodafone', 't-mobile', 'ziggo', 'xs4all', 'tele2', 'lebara', 'lycamobile']
  if (telecomCompanies.some(telecom => vendor.includes(telecom))) {
    return 'telefoon_communicatie'
  }
  
  // Telecom service keywords
  const telecomServices = ['mobiel', 'mobile', 'internet', 'telefoon', 'phone', 'gsm', 'data', 'wifi', 'broadband', 'abonnement']
  if (telecomServices.some(service => vendor.includes(service))) {
    return 'telefoon_communicatie'
  }
  
  // Utilities - map to workspace costs
  if (['eneco', 'essent', 'nuon', 'vattenfall', 'greenchoice', 'oxxio'].some(utility => vendor.includes(utility))) {
    return 'werkruimte_kantoor'
  }
  
  // Grocery stores - business meals
  if (['albert heijn', 'jumbo', 'lidl', 'aldi', 'ah.nl', 'plus', 'spar', 'dirk', 'coop'].some(store => vendor.includes(store))) {
    return 'maaltijden_zakelijk'
  }
  
  // Gas stations - travel costs
  if (['shell', 'bp', 'total', 'esso', 'texaco', 'gulf'].some(station => vendor.includes(station))) {
    return 'reiskosten'
  }
  
  // Electronics/Office supplies
  if (['mediamarkt', 'coolblue', 'bol.com', 'amazon', 'staples', 'office centre'].some(store => vendor.includes(store))) {
    return 'kantoorbenodigdheden'
  }
  
  // Pharmacy/health - other business costs
  if (['kruidvat', 'etos', 'apotheek', 'boots'].some(store => vendor.includes(store))) {
    return 'overige_zakelijk'
  }
  
  // Banking/financial services - professional services
  if (['ing', 'rabobank', 'abn amro', 'sns', 'asn', 'triodos'].some(bank => vendor.includes(bank))) {
    return 'professionele_diensten'
  }
  
  // Software/subscriptions and development services
  if (['microsoft', 'adobe', 'dropbox', 'google', 'zoom', 'slack', 'development', 'gaming', 'unity', 'unreal'].some(software => vendor.includes(software))) {
    return 'software_ict'
  }

  // Professional services (including development, consulting, agencies)
  if (['consultancy', 'consulting', 'agency', 'solutions', 'services', 'freelancer'].some(service => vendor.includes(service))) {
    return 'professionele_diensten'
  }
  
  return 'overige_zakelijk'
}

/**
 * Validate and correct amounts
 */
function validateAmounts(data: any) {
  const { amount, vat_amount, total_amount, vat_rate, reverse_charge_detected_in_text } = data
  
  // For reverse charge scenarios, net amount equals total amount (no VAT)
  if (reverse_charge_detected_in_text && total_amount) {
    return {
      amount: Math.round(total_amount * 100) / 100,
      vat_amount: 0,
      vat_rate: 0
    }
  }
  
  // If we have total and no explicit VAT calculation, assume 21% standard rate
  if (total_amount && !reverse_charge_detected_in_text && !amount && !vat_amount) {
    const vatRate = vat_rate || 0.21 // Default to 21% Dutch VAT
    const netAmount = total_amount / (1 + vatRate)
    const calculatedVat = total_amount - netAmount
    
    return {
      amount: Math.round(netAmount * 100) / 100,
      vat_amount: Math.round(calculatedVat * 100) / 100,
      vat_rate: vatRate
    }
  }
  
  // If we have total and VAT rate explicitly, calculate amounts
  if (total_amount && vat_rate && !amount) {
    const netAmount = total_amount / (1 + vat_rate)
    const calculatedVat = total_amount - netAmount
    
    return {
      amount: Math.round(netAmount * 100) / 100,
      vat_amount: Math.round(calculatedVat * 100) / 100
    }
  }
  
  // If we have net amount and VAT amount, calculate total
  if (amount && vat_amount && !total_amount) {
    return {
      total_amount: Math.round((amount + vat_amount) * 100) / 100
    }
  }
  
  return {}
}