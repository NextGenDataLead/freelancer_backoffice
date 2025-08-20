import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { CreateExpenseRequest, FinancialApiResponse } from '@/lib/types/financial'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  canUserCreateData,
  ApiErrors,
  createApiResponse,
  createTransactionLog
} from '@/lib/supabase/financial-client'

// Schema for OCR processing request
const OCRProcessRequestSchema = z.object({
  receipt_url: z.string().url('Invalid receipt URL'),
  file_name: z.string().min(1, 'File name is required'),
  file_type: z.string().min(1, 'File type is required'),
  supplier_name_hint: z.string().optional(), // User can provide supplier hint
  category_hint: z.string().optional() // User can suggest category
})

/**
 * POST /api/expenses/ocr/process
 * Processes a receipt image using OCR and creates a draft expense entry
 * This endpoint would integrate with AWS Textract, Google Vision, or similar OCR service
 */
export async function POST(request: Request) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Check if user can create data (not in grace period)
    const canCreate = await canUserCreateData()
    if (!canCreate) {
      return NextResponse.json(ApiErrors.GracePeriodActive, { status: ApiErrors.GracePeriodActive.status })
    }

    const body = await request.json()
    const validatedData = OCRProcessRequestSchema.parse(body)

    // In a real implementation, you would call an OCR service here
    // For now, we'll simulate the OCR processing
    const mockOCRResult = await simulateOCRProcessing(
      validatedData.receipt_url,
      validatedData.file_type,
      validatedData.supplier_name_hint,
      validatedData.category_hint
    )

    // Try to match supplier if detected
    let supplierId: string | undefined
    if (mockOCRResult.supplier_name) {
      const { data: matchedSupplier } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_supplier', true)
        .or(`name.ilike.%${mockOCRResult.supplier_name}%,company_name.ilike.%${mockOCRResult.supplier_name}%`)
        .limit(1)
        .single()

      supplierId = matchedSupplier?.id
    }

    // Determine if manual verification is required based on confidence
    const requiresVerification = mockOCRResult.confidence < 0.8

    // Create expense entry with OCR data
    const { data: newExpense, error: createError } = await supabaseAdmin
      .from('expenses')
      .insert({
        tenant_id: profile.tenant_id,
        created_by: profile.id,
        supplier_id: supplierId,
        expense_date: mockOCRResult.expense_date,
        description: mockOCRResult.description,
        category: mockOCRResult.category,
        amount: mockOCRResult.amount,
        vat_amount: mockOCRResult.vat_amount,
        total_amount: mockOCRResult.total_amount,
        vat_rate: mockOCRResult.vat_rate,
        is_deductible: true, // Default to deductible, user can change
        receipt_url: validatedData.receipt_url,
        ocr_data: mockOCRResult.raw_data,
        ocr_confidence: mockOCRResult.confidence,
        manual_verification_required: requiresVerification
      })
      .select(`
        *,
        supplier:clients(
          id,
          name,
          company_name,
          email,
          country_code
        )
      `)
      .single()

    if (createError) {
      console.error('Error creating OCR expense:', createError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Create audit log
    await createTransactionLog(
      profile.tenant_id,
      'expense',
      newExpense.id,
      'created_via_ocr',
      profile.id,
      null,
      { ...newExpense, ocr_processing: mockOCRResult },
      request
    )

    const response = createApiResponse({
      expense: newExpense,
      ocr_results: {
        confidence: mockOCRResult.confidence,
        requires_verification: requiresVerification,
        detected_fields: mockOCRResult.detected_fields,
        supplier_matched: !!supplierId,
        processing_time_ms: mockOCRResult.processing_time
      }
    }, requiresVerification 
      ? 'Expense created from OCR - manual verification required'
      : 'Expense created from OCR successfully'
    )

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('OCR processing error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * Mock OCR processing function
 * In production, this would integrate with AWS Textract, Google Vision API, or similar
 */
async function simulateOCRProcessing(
  receiptUrl: string,
  fileType: string,
  supplierHint?: string,
  categoryHint?: string
) {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Mock extracted data - in reality this would come from OCR service
  const mockData = {
    supplier_name: supplierHint || 'Office Supplies Store',
    expense_date: new Date().toISOString().split('T')[0],
    description: 'Office supplies - printer paper and ink',
    category: (categoryHint as any) || 'office_supplies',
    amount: 45.50,
    vat_amount: 9.55,
    total_amount: 55.05,
    vat_rate: 0.21,
    confidence: Math.random() * 0.4 + 0.6, // Random confidence between 0.6-1.0
    processing_time: Math.floor(Math.random() * 2000) + 1000, // 1-3 seconds
    detected_fields: [] as string[],
    raw_data: {} as Record<string, any>
  }

  // Determine which fields were detected based on confidence
  const baseConfidence = mockData.confidence
  mockData.detected_fields = []
  mockData.raw_data = {
    text_extraction: {
      full_text: `RECEIPT\n${mockData.supplier_name}\nDate: ${mockData.expense_date}\n${mockData.description}\nAmount: €${mockData.amount}\nVAT: €${mockData.vat_amount}\nTotal: €${mockData.total_amount}`,
      confidence_scores: {}
    },
    field_extraction: {}
  }

  if (baseConfidence > 0.7) {
    mockData.detected_fields.push('supplier_name', 'total_amount')
    mockData.raw_data.field_extraction.supplier_name = { value: mockData.supplier_name, confidence: baseConfidence }
    mockData.raw_data.field_extraction.total_amount = { value: mockData.total_amount, confidence: baseConfidence }
  }

  if (baseConfidence > 0.8) {
    mockData.detected_fields.push('expense_date', 'vat_amount')
    mockData.raw_data.field_extraction.expense_date = { value: mockData.expense_date, confidence: baseConfidence }
    mockData.raw_data.field_extraction.vat_amount = { value: mockData.vat_amount, confidence: baseConfidence }
  }

  if (baseConfidence > 0.9) {
    mockData.detected_fields.push('description', 'amount')
    mockData.raw_data.field_extraction.description = { value: mockData.description, confidence: baseConfidence }
    mockData.raw_data.field_extraction.amount = { value: mockData.amount, confidence: baseConfidence }
  }

  return mockData
}

/**
 * GET /api/expenses/ocr/process
 * Returns OCR processing capabilities and supported file types
 */
export async function GET() {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    const response = createApiResponse({
      supported_file_types: [
        'image/jpeg',
        'image/png', 
        'image/webp',
        'application/pdf'
      ],
      max_file_size_mb: 10,
      supported_languages: ['en', 'nl', 'de', 'fr'],
      average_processing_time_seconds: 3,
      ocr_features: {
        text_extraction: true,
        field_detection: true,
        supplier_matching: true,
        vat_calculation: true,
        category_suggestion: true
      },
      confidence_thresholds: {
        auto_verify: 0.9,
        manual_review: 0.8,
        low_confidence: 0.5
      }
    }, 'OCR processing capabilities retrieved')

    return NextResponse.json(response)

  } catch (error) {
    console.error('OCR capabilities fetch error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/*
 * Production OCR integration example with AWS Textract
 * Uncomment and adapt for production use
 */
/*
import { TextractClient, AnalyzeExpenseCommand } from "@aws-sdk/client-textract";

async function processReceiptWithTextract(receiptUrl: string) {
  const textractClient = new TextractClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
  });

  // Download image from URL
  const response = await fetch(receiptUrl);
  const imageBuffer = await response.arrayBuffer();

  const command = new AnalyzeExpenseCommand({
    Document: {
      Bytes: new Uint8Array(imageBuffer)
    }
  });

  try {
    const result = await textractClient.send(command);
    
    // Extract expense data from Textract response
    const expenseData = extractExpenseData(result);
    
    return {
      supplier_name: expenseData.vendor?.Name || '',
      expense_date: expenseData.invoiceDate || new Date().toISOString().split('T')[0],
      description: generateDescription(expenseData.lineItems),
      amount: parseFloat(expenseData.subtotal || '0'),
      vat_amount: parseFloat(expenseData.tax || '0'),
      total_amount: parseFloat(expenseData.total || '0'),
      confidence: calculateOverallConfidence(result),
      raw_data: result
    };
  } catch (error) {
    console.error('Textract processing error:', error);
    throw new Error('OCR processing failed');
  }
}
*/