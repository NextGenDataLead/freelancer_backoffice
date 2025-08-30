import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getCurrentUserProfile, ApiErrors, createApiResponse } from '@/lib/supabase/financial-client'
import { OCRData, ReceiptStatus } from '@/lib/types/expenses'

interface OCRRequest {
  receipt_id: string
  file_url: string
  mime_type: string
}

/**
 * POST /api/expense-management/receipts/process-ocr - Process OCR for receipt
 */
export async function POST(request: NextRequest) {
  try {
    const body: OCRRequest = await request.json()
    const { receipt_id, file_url, mime_type } = body

    if (!receipt_id || !file_url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = supabaseAdmin;

    try {
      // Process OCR based on file type
      let ocrResult: OCRData
      let confidence = 0

      if (mime_type.startsWith('image/')) {
        ocrResult = await processImageOCR(file_url)
        confidence = calculateConfidence(ocrResult)
      } else if (mime_type === 'application/pdf') {
        ocrResult = await processPDFOCR(file_url)
        confidence = calculateConfidence(ocrResult)
      } else {
        throw new Error('Unsupported file type for OCR')
      }

      // Determine OCR status based on confidence
      let ocrStatus: ReceiptStatus = 'processed'
      if (confidence < 0.5) {
        ocrStatus = 'manual_review'
      }

      // Update receipt with OCR results
      const { error: updateError } = await supabase
        .from('expense_receipts')
        .update({
          ocr_status: ocrStatus,
          ocr_data: ocrResult,
          ocr_confidence: confidence,
          ocr_processed_at: new Date().toISOString()
        })
        .eq('id', receipt_id)

      if (updateError) {
        console.error('Error updating receipt with OCR results:', updateError)
        throw new Error('Failed to update receipt')
      }

      // Try to auto-populate expense fields if confidence is high
      if (confidence > 0.8) {
        await autoPopulateExpenseFields(receipt_id, ocrResult)
      }

      return NextResponse.json({
        message: 'OCR processing completed',
        receipt_id,
        status: ocrStatus,
        confidence,
        extracted_data: ocrResult
      })

    } catch (ocrError) {
      console.error('OCR processing failed:', ocrError)
      
      // Update receipt status to failed
      await supabase
        .from('expense_receipts')
        .update({
          ocr_status: 'failed',
          ocr_processed_at: new Date().toISOString()
        })
        .eq('id', receipt_id)

      return NextResponse.json({
        message: 'OCR processing failed',
        receipt_id,
        status: 'failed',
        error: ocrError instanceof Error ? ocrError.message : 'Unknown error'
      })
    }

  } catch (error) {
    console.error('Error in OCR processing endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Process OCR for image files
 * In a real implementation, you'd integrate with services like:
 * - Google Cloud Vision API
 * - AWS Textract
 * - Azure Computer Vision
 * - Tesseract.js (client-side)
 */
async function processImageOCR(fileUrl: string): Promise<OCRData> {
  // Mock implementation - replace with actual OCR service
  // For demo purposes, we'll return mock data
  return {
    vendor: 'Sample Vendor',
    total_amount: 25.99,
    currency: 'EUR',
    date: new Date().toISOString().split('T')[0],
    items: [
      {
        description: 'Business Lunch',
        amount: 25.99,
        quantity: 1
      }
    ],
    tax_amount: 4.64,
    confidence_scores: {
      vendor: 0.85,
      amount: 0.92,
      date: 0.78
    },
    raw_text: 'RECEIPT\nSample Vendor\nBusiness Lunch €25.99\nTax €4.64\nTotal €30.63'
  }

  // Example integration with Google Cloud Vision:
  /*
  try {
    const vision = new ImageAnnotatorClient()
    const [result] = await vision.textDetection(fileUrl)
    const detections = result.textAnnotations
    
    if (!detections || detections.length === 0) {
      throw new Error('No text detected in image')
    }
    
    const rawText = detections[0].description || ''
    
    // Parse extracted text to find structured data
    const parsedData = parseReceiptText(rawText)
    
    return {
      ...parsedData,
      raw_text: rawText,
      confidence_scores: calculateFieldConfidence(detections)
    }
  } catch (error) {
    throw new Error(`OCR processing failed: ${error.message}`)
  }
  */
}

/**
 * Process OCR for PDF files
 */
async function processPDFOCR(fileUrl: string): Promise<OCRData> {
  // Mock implementation - replace with actual PDF OCR service
  return {
    vendor: 'PDF Vendor',
    total_amount: 150.00,
    currency: 'EUR',
    date: new Date().toISOString().split('T')[0],
    items: [
      {
        description: 'Software License',
        amount: 150.00,
        quantity: 1
      }
    ],
    confidence_scores: {
      vendor: 0.90,
      amount: 0.95,
      date: 0.85
    },
    raw_text: 'INVOICE\nPDF Vendor\nSoftware License €150.00'
  }
}

/**
 * Calculate overall confidence score from OCR data
 */
function calculateConfidence(ocrData: OCRData): number {
  const scores = ocrData.confidence_scores
  if (!scores) return 0.5

  const values = Object.values(scores).filter(score => typeof score === 'number')
  if (values.length === 0) return 0.5

  return values.reduce((sum, score) => sum + score, 0) / values.length
}

/**
 * Auto-populate expense fields based on OCR results
 */
async function autoPopulateExpenseFields(receiptId: string, ocrData: OCRData) {
  try {
    const supabase = supabaseAdmin;

    // Get the expense associated with this receipt
    const { data: receipt, error: receiptError } = await supabase
      .from('expense_receipts')
      .select('expense_id')
      .eq('id', receiptId)
      .single()

    if (receiptError || !receipt) {
      console.error('Could not find expense for receipt:', receiptId)
      return
    }

    // Get current expense data
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', receipt.expense_id)
      .single()

    if (expenseError || !expense) {
      console.error('Could not find expense:', receipt.expense_id)
      return
    }

    // Only update if expense is still in draft status
    if (expense.status !== 'draft') {
      return
    }

    // Prepare updates (only update empty fields)
    const updates: any = {}

    if (!expense.vendor_name && ocrData.vendor) {
      updates.vendor_name = ocrData.vendor
    }

    if (!expense.amount && ocrData.total_amount) {
      updates.amount = ocrData.total_amount
    }

    if (!expense.expense_date && ocrData.date) {
      updates.expense_date = ocrData.date
    }

    // Try to guess expense type based on vendor/description
    if (!expense.expense_type && ocrData.vendor) {
      const guessedType = guessExpenseType(ocrData.vendor, ocrData.raw_text || '')
      if (guessedType) {
        updates.expense_type = guessedType
      }
    }

    // Update expense if we have any updates
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('expenses')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', receipt.expense_id)

      if (updateError) {
        console.error('Failed to auto-populate expense fields:', updateError)
      }
    }

  } catch (error) {
    console.error('Error in auto-populate:', error)
  }
}

/**
 * Guess expense type based on vendor name and text content
 */
function guessExpenseType(vendor: string, text: string): string | null {
  const lowerVendor = vendor.toLowerCase()
  const lowerText = text.toLowerCase()

  // Travel-related keywords
  if (lowerVendor.includes('airline') || 
      lowerVendor.includes('hotel') || 
      lowerVendor.includes('uber') ||
      lowerVendor.includes('taxi') ||
      lowerText.includes('flight') ||
      lowerText.includes('accommodation')) {
    return 'travel'
  }

  // Restaurant/meal keywords
  if (lowerVendor.includes('restaurant') ||
      lowerVendor.includes('cafe') ||
      lowerVendor.includes('bar') ||
      lowerText.includes('food') ||
      lowerText.includes('meal') ||
      lowerText.includes('lunch') ||
      lowerText.includes('dinner')) {
    return 'meals'
  }

  // Office supplies
  if (lowerVendor.includes('office') ||
      lowerVendor.includes('staples') ||
      lowerText.includes('supplies') ||
      lowerText.includes('equipment')) {
    return 'office_supplies'
  }

  // Software
  if (lowerVendor.includes('software') ||
      lowerVendor.includes('microsoft') ||
      lowerVendor.includes('adobe') ||
      lowerText.includes('license') ||
      lowerText.includes('subscription')) {
    return 'software'
  }

  return null // Could not determine type
}

/**
 * Parse receipt text to extract structured data
 * This is a simplified parser - in production you'd use more sophisticated NLP
 */
function parseReceiptText(text: string): Partial<OCRData> {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  const result: Partial<OCRData> = {}

  // Look for amounts (€XX.XX, $XX.XX, etc.)
  const amountRegex = /[€$£¥]\s*(\d+\.?\d*)/g
  const amounts = []
  let match
  while ((match = amountRegex.exec(text)) !== null) {
    amounts.push(parseFloat(match[1]))
  }

  if (amounts.length > 0) {
    result.total_amount = Math.max(...amounts) // Assume highest amount is total
  }

  // Look for dates
  const dateRegex = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g
  const dateMatch = text.match(dateRegex)
  if (dateMatch) {
    result.date = dateMatch[0] // Take first date found
  }

  // First line might be vendor name
  if (lines.length > 0 && !lines[0].match(/\d/)) {
    result.vendor = lines[0]
  }

  return result
}