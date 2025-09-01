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
  }
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
      if (code !== 0) {
        console.error('PaddleOCR script error:', stderr)
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
    }, 30000) // 30 seconds timeout
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

  // Detect reverse charge from OCR text patterns
  const reverseChargeDetected = detectReverseChargeFromText(data.raw_text || data.description || '')
  
  // Override supplier validation if reverse charge is explicitly mentioned in text
  const finalRequiresReverseCharge = reverseChargeDetected || supplierValidation.requiresReverseCharge
  const finalSuggestedVATType = reverseChargeDetected ? 'reverse_charge' : supplierValidation.suggestedVATType

  return {
    ...data,
    ...validatedAmounts,
    expense_type: expenseType,
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
 * Categorize expense based on vendor
 */
function categorizeExpense(vendorName: string): string {
  if (!vendorName) return 'other'
  
  const vendor = vendorName.toLowerCase()
  
  // Telecommunications/Internet (companies and services)
  const telecomCompanies = ['kpn', 'vodafone', 't-mobile', 'ziggo', 'xs4all', 'tele2', 'lebara', 'lycamobile']
  if (telecomCompanies.some(telecom => vendor.includes(telecom))) {
    return 'telecommunicatie'
  }
  
  // Telecom service keywords
  const telecomServices = ['mobiel', 'mobile', 'internet', 'telefoon', 'phone', 'gsm', 'data', 'wifi', 'broadband', 'abonnement']
  if (telecomServices.some(service => vendor.includes(service))) {
    return 'telecommunicatie'
  }
  
  // Utilities
  if (['eneco', 'essent', 'nuon', 'vattenfall', 'greenchoice', 'oxxio'].some(utility => vendor.includes(utility))) {
    return 'utilities'
  }
  
  // Grocery stores
  if (['albert heijn', 'jumbo', 'lidl', 'aldi', 'ah.nl', 'plus', 'spar', 'dirk', 'coop'].some(store => vendor.includes(store))) {
    return 'meals'
  }
  
  // Gas stations
  if (['shell', 'bp', 'total', 'esso', 'texaco', 'gulf'].some(station => vendor.includes(station))) {
    return 'travel'
  }
  
  // Electronics/Office supplies
  if (['mediamarkt', 'coolblue', 'bol.com', 'amazon', 'staples', 'office centre'].some(store => vendor.includes(store))) {
    return 'equipment'
  }
  
  // Pharmacy/health
  if (['kruidvat', 'etos', 'apotheek', 'boots'].some(store => vendor.includes(store))) {
    return 'medical'
  }
  
  // Banking/financial services
  if (['ing', 'rabobank', 'abn amro', 'sns', 'asn', 'triodos'].some(bank => vendor.includes(bank))) {
    return 'financial'
  }
  
  // Software/subscriptions and development services
  if (['microsoft', 'adobe', 'dropbox', 'google', 'zoom', 'slack', 'development', 'gaming', 'unity', 'unreal'].some(software => vendor.includes(software))) {
    return 'software'
  }

  // Professional services (including development, consulting, agencies)
  if (['consultancy', 'consulting', 'agency', 'solutions', 'services', 'freelancer'].some(service => vendor.includes(service))) {
    return 'professional_services'
  }
  
  return 'other'
}

/**
 * Validate and correct amounts
 */
function validateAmounts(data: any) {
  const { amount, vat_amount, total_amount, vat_rate } = data
  
  // If we have total and VAT rate, calculate amounts
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