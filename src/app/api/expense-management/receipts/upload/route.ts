import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin, getCurrentUserProfile, ApiErrors, createApiResponse } from '@/lib/supabase/financial-client'
import { put } from '@vercel/blob'
import { z } from 'zod'

const ReceiptUploadSchema = z.object({
  expense_id: z.string().uuid('Invalid expense ID')
})

/**
 * POST /api/expense-management/receipts/upload - Upload receipt file
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    if (!profile) {
      return NextResponse.json(ApiErrors.ProfileNotFound, { status: ApiErrors.ProfileNotFound.status })
    }

    const supabase = supabaseAdmin;
    const formData = await request.formData()
    const file = formData.get('file') as File
    const expenseId = formData.get('expense_id') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate expense_id
    const validation = ReceiptUploadSchema.safeParse({ expense_id: expenseId })
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid expense ID',
        details: validation.error.issues
      }, { status: 400 })
    }

    // Get current user profile

    // Verify expense exists and belongs to user
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('id, submitted_by, tenant_id')
      .eq('id', expenseId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (expenseError || !expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    if (expense.submitted_by !== profile.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type',
        details: 'Only JPEG, PNG, GIF, and PDF files are allowed'
      }, { status: 400 })
    }

    if (file.size > maxSize) {
      return NextResponse.json({
        error: 'File too large',
        details: 'File size must be less than 10MB'
      }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const filename = `expense-${expenseId}-${timestamp}.${fileExtension}`
    const filePath = `receipts/${profile.tenant_id}/${filename}`

    try {
      // Upload to Vercel Blob (or your preferred storage)
      const blob = await put(filePath, file, {
        access: 'public',
        multipart: file.size > 4.5 * 1024 * 1024 // Use multipart for files > 4.5MB
      })

      // Create receipt record in database
      const { data: receipt, error: insertError } = await supabase
        .from('expense_receipts')
        .insert({
          expense_id: expenseId,
          filename: file.name,
          file_path: blob.url,
          file_size: file.size,
          mime_type: file.type,
          ocr_status: 'pending'
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating receipt record:', insertError)
        return NextResponse.json({ error: 'Failed to save receipt record' }, { status: 500 })
      }

      // Trigger OCR processing (async)
      triggerOCRProcessing(receipt.id, blob.url, file.type)

      return NextResponse.json({
        message: 'Receipt uploaded successfully',
        receipt_id: receipt.id,
        file_url: blob.url,
        ocr_status: 'pending',
        estimated_processing_time: 30 // seconds
      }, { status: 201 })

    } catch (storageError) {
      console.error('Error uploading to storage:', storageError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in POST /api/expense-management/receipts/upload:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Trigger OCR processing (runs in background)
 */
async function triggerOCRProcessing(receiptId: string, fileUrl: string, mimeType: string) {
  try {
    // Update status to processing
    const supabase = supabaseAdmin;
    await supabase
      .from('expense_receipts')
      .update({
        ocr_status: 'processing',
        ocr_processed_at: new Date().toISOString()
      })
      .eq('id', receiptId)

    // Call OCR processing endpoint (async)
    fetch('/api/expense-management/receipts/process-ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receipt_id: receiptId,
        file_url: fileUrl,
        mime_type: mimeType
      })
    }).catch(error => {
      console.error('Failed to trigger OCR processing:', error)
    })

  } catch (error) {
    console.error('Error triggering OCR processing:', error)
  }
}