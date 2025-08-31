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
    const enhancedData = await enhanceExtractedData(ocrResult.extracted_data)

    const response = createApiResponse({
      ...ocrResult,
      extracted_data: enhancedData
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
  const expenseType = categorizeExpense(data.vendor_name)

  return {
    ...data,
    ...validatedAmounts,
    expense_type: expenseType,
    is_likely_foreign_supplier: supplierValidation.isEUSupplier || supplierValidation.requiresReverseCharge,
    requires_vat_number: supplierValidation.requiresReverseCharge,
    requires_reverse_charge: supplierValidation.requiresReverseCharge,
    suggested_vat_type: supplierValidation.suggestedVATType,
    supplier_warnings: supplierValidation.foreignSupplierWarnings,
    suggested_payment_method: 'bank_transfer'
  }
}


/**
 * Categorize expense based on vendor
 */
function categorizeExpense(vendorName: string): string {
  if (!vendorName) return 'other'
  
  const vendor = vendorName.toLowerCase()
  
  // Grocery stores
  if (['albert heijn', 'jumbo', 'lidl', 'aldi'].some(store => vendor.includes(store))) {
    return 'meals'
  }
  
  // Gas stations
  if (['shell', 'bp', 'total', 'esso'].some(station => vendor.includes(station))) {
    return 'travel'
  }
  
  // Electronics
  if (['mediamarkt', 'coolblue', 'bol.com', 'amazon'].some(store => vendor.includes(store))) {
    return 'equipment'
  }
  
  // Pharmacy/health
  if (['kruidvat', 'etos', 'apotheek'].some(store => vendor.includes(store))) {
    return 'other'
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