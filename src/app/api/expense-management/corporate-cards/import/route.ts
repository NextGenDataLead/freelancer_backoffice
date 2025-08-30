import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin, getCurrentUserProfile, ApiErrors, createApiResponse } from '@/lib/supabase/financial-client'
import { CorporateCardTransaction, ExpenseType } from '@/lib/types/expenses'
import { z } from 'zod'

interface CardProviderTransaction {
  transaction_id: string
  card_holder_email?: string
  merchant_name: string
  transaction_date: string
  amount: number
  currency: string
  card_last_four?: string
  card_type?: string
  category?: string
  description?: string
  raw_data: Record<string, any>
}

const ImportTransactionsSchema = z.object({
  provider: z.enum(['visa', 'mastercard', 'amex', 'manual']),
  transactions: z.array(z.object({
    transaction_id: z.string(),
    card_holder_email: z.string().email().optional(),
    merchant_name: z.string(),
    transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    amount: z.number(),
    currency: z.string().length(3),
    card_last_four: z.string().length(4).optional(),
    card_type: z.string().optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    raw_data: z.record(z.any()).default({})
  }))
})

/**
 * POST /api/expense-management/corporate-cards/import - Import card transactions
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    if (!profile) {
      return NextResponse.json(ApiErrors.ProfileNotFound, { status: ApiErrors.ProfileNotFound.status })
    }

    const supabase = supabaseAdmin;
    const body = await request.json()

    // Validate request body
    const validation = ImportTransactionsSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.issues
      }, { status: 400 })
    }

    const { provider, transactions } = validation.data

    // Get current user profile

    const importResults = {
      success_count: 0,
      duplicate_count: 0,
      error_count: 0,
      errors: [] as any[],
      imported_transactions: [] as any[]
    }

    const batchId = crypto.randomUUID()

    // Process each transaction
    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i]

      try {
        // Check if transaction already exists
        const { data: existingTransaction } = await supabase
          .from('corporate_card_transactions')
          .select('id')
          .eq('tenant_id', profile.tenant_id)
          .eq('external_transaction_id', transaction.transaction_id)
          .single()

        if (existingTransaction) {
          importResults.duplicate_count++
          continue
        }

        // Find card holder by email if provided
        let cardHolderId: string | null = null
        if (transaction.card_holder_email) {
          const { data: cardHolder } = await supabase
            .from('profiles')
            .select('id')
            .eq('tenant_id', profile.tenant_id)
            .eq('email', transaction.card_holder_email)
            .single()

          cardHolderId = cardHolder?.id || null
        }

        // AI categorization and suggestion
        const aiSuggestions = await generateAISuggestions(transaction)

        // Create transaction record
        const transactionInsert = {
          tenant_id: profile.tenant_id,
          external_transaction_id: transaction.transaction_id,
          card_holder_id: cardHolderId,
          merchant_name: transaction.merchant_name,
          transaction_date: transaction.transaction_date,
          amount: transaction.amount,
          currency: transaction.currency,
          card_last_four: transaction.card_last_four,
          card_type: transaction.card_type,
          suggested_category_id: aiSuggestions.category_id,
          suggested_expense_type: aiSuggestions.expense_type,
          ai_confidence: aiSuggestions.confidence,
          import_batch_id: batchId,
          raw_data: {
            provider,
            original_category: transaction.category,
            description: transaction.description,
            ...transaction.raw_data
          }
        }

        const { data: insertedTransaction, error: insertError } = await supabase
          .from('corporate_card_transactions')
          .insert(transactionInsert)
          .select()
          .single()

        if (insertError) {
          throw new Error(`Database insert failed: ${insertError.message}`)
        }

        importResults.success_count++
        importResults.imported_transactions.push(insertedTransaction)

        // Try to auto-match with existing expenses
        await attemptAutoMatching(insertedTransaction.id, insertedTransaction, supabase)

      } catch (error) {
        importResults.error_count++
        importResults.errors.push({
          transaction_index: i,
          transaction_id: transaction.transaction_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      message: 'Transaction import completed',
      import_batch_id: batchId,
      results: importResults
    })

  } catch (error) {
    console.error('Error in POST /api/expense-management/corporate-cards/import:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Generate AI suggestions for expense categorization
 */
async function generateAISuggestions(transaction: CardProviderTransaction): Promise<{
  category_id?: string
  expense_type: ExpenseType
  confidence: number
}> {
  // This is a simplified AI categorization system
  // In production, you'd use ML models or services like OpenAI, AWS Comprehend, etc.
  
  const merchantName = transaction.merchant_name.toLowerCase()
  const description = (transaction.description || '').toLowerCase()
  const amount = transaction.amount

  let expenseType: ExpenseType = 'other'
  let confidence = 0.5

  // Travel-related merchants
  if (merchantName.includes('airline') || 
      merchantName.includes('hotel') || 
      merchantName.includes('uber') ||
      merchantName.includes('taxi') ||
      merchantName.includes('rental') ||
      description.includes('flight') ||
      description.includes('accommodation')) {
    expenseType = 'travel'
    confidence = 0.8
  }
  // Restaurant/meal merchants
  else if (merchantName.includes('restaurant') ||
           merchantName.includes('cafe') ||
           merchantName.includes('bar') ||
           merchantName.includes('food') ||
           description.includes('meal') ||
           description.includes('lunch') ||
           description.includes('dinner')) {
    expenseType = 'meals'
    confidence = 0.75
  }
  // Office supplies
  else if (merchantName.includes('office') ||
           merchantName.includes('staples') ||
           merchantName.includes('supplies') ||
           description.includes('equipment')) {
    expenseType = 'office_supplies'
    confidence = 0.7
  }
  // Software/SaaS
  else if (merchantName.includes('software') ||
           merchantName.includes('microsoft') ||
           merchantName.includes('adobe') ||
           merchantName.includes('saas') ||
           description.includes('subscription') ||
           description.includes('license')) {
    expenseType = 'software'
    confidence = 0.85
  }
  // Marketing
  else if (merchantName.includes('marketing') ||
           merchantName.includes('advertising') ||
           merchantName.includes('facebook') ||
           merchantName.includes('google ads') ||
           description.includes('campaign')) {
    expenseType = 'marketing'
    confidence = 0.8
  }
  // Professional services
  else if (merchantName.includes('consulting') ||
           merchantName.includes('legal') ||
           merchantName.includes('accounting') ||
           description.includes('professional')) {
    expenseType = 'professional'
    confidence = 0.75
  }

  // Adjust confidence based on amount patterns
  if (expenseType === 'software' && amount > 50 && amount < 500) {
    confidence += 0.1 // Software subscriptions often in this range
  }
  if (expenseType === 'meals' && amount > 200) {
    confidence -= 0.2 // High meal amounts are less confident
  }
  if (expenseType === 'travel' && amount > 100) {
    confidence += 0.1 // Travel expenses often higher
  }

  return {
    expense_type: expenseType,
    confidence: Math.min(confidence, 0.95) // Cap at 95%
  }
}

/**
 * Attempt to automatically match card transaction with existing expenses
 */
async function attemptAutoMatching(
  transactionId: string,
  transaction: any,
  supabase: any
): Promise<void> {
  try {
    // Look for expenses from the same card holder on the same date with similar amount
    const amountTolerance = 0.01 // €0.01 tolerance
    const { data: potentialMatches } = await supabase
      .from('expenses')
      .select('id, title, amount, vendor_name, external_transaction_id')
      .eq('tenant_id', transaction.tenant_id)
      .eq('submitted_by', transaction.card_holder_id)
      .eq('expense_date', transaction.transaction_date)
      .gte('amount', transaction.amount - amountTolerance)
      .lte('amount', transaction.amount + amountTolerance)
      .is('external_transaction_id', null) // Not already matched

    if (!potentialMatches || potentialMatches.length === 0) {
      return // No potential matches found
    }

    // If there's exactly one match, auto-match it
    if (potentialMatches.length === 1) {
      const expense = potentialMatches[0]
      
      // Update both records to establish the link
      await Promise.all([
        // Update expense with transaction ID
        supabase
          .from('expenses')
          .update({ external_transaction_id: transaction.external_transaction_id })
          .eq('id', expense.id),
        
        // Update transaction as matched
        supabase
          .from('corporate_card_transactions')
          .update({
            expense_id: expense.id,
            is_matched: true,
            matched_at: new Date().toISOString(),
            matched_by: null // Auto-matched
          })
          .eq('id', transactionId)
      ])
    }
    // If multiple matches, flag for manual review but don't auto-match

  } catch (error) {
    console.error('Error in auto-matching:', error)
    // Don't throw - matching failure shouldn't break import
  }
}

/**
 * GET /api/expense-management/corporate-cards/transactions - List imported transactions
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    if (!profile) {
      return NextResponse.json(ApiErrors.ProfileNotFound, { status: ApiErrors.ProfileNotFound.status })
    }

    const supabase = supabaseAdmin;
    const { searchParams } = new URL(request.url)
    
    // Get current user profile

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('corporate_card_transactions')
      .select(`
        *,
        card_holder:profiles!card_holder_id(id, first_name, last_name, email),
        expense:expenses(id, title, status),
        suggested_category:expense_categories!suggested_category_id(id, name)
      `)
      .eq('tenant_id', profile.tenant_id)
      .order('transaction_date', { ascending: false })

    // Filter by matched status
    const matchedFilter = searchParams.get('matched')
    if (matchedFilter === 'true') {
      query = query.eq('is_matched', true)
    } else if (matchedFilter === 'false') {
      query = query.eq('is_matched', false)
    }

    // Filter by date range
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    if (dateFrom) query = query.gte('transaction_date', dateFrom)
    if (dateTo) query = query.lte('transaction_date', dateTo)

    // Execute query with pagination
    const { data: transactions, error, count } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching transactions:', error)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Transactions fetched successfully',
      transactions: transactions || [],
      pagination: {
        page,
        limit,
        total_count: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Error in GET /api/expense-management/corporate-cards/transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}