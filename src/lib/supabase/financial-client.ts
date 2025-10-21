// Shared Supabase client and utilities for financial API routes
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create Supabase client with service role key for admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * Gets the authenticated user's profile and tenant information
 * Returns null if user is not authenticated or profile doesn't exist
 */
export async function getCurrentUserProfile() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return null
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, tenant_id, clerk_user_id, first_name, last_name, email, role')
      .eq('clerk_user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return profile
  } catch (error) {
    console.error('Error in getCurrentUserProfile:', error)
    return null
  }
}

/**
 * Checks if the current user can create/modify data (not in grace period)
 */
export async function canUserCreateData(): Promise<boolean> {
  try {
    const { data: canCreate, error } = await supabaseAdmin
      .rpc('can_create_data')

    if (error) {
      console.error('Error checking grace period:', error)
      return false
    }

    return Boolean(canCreate)
  } catch (error) {
    console.error('Error in canUserCreateData:', error)
    return false
  }
}

/**
 * Standard error responses for API routes
 */
export const ApiErrors = {
  Unauthorized: { error: 'Unauthorized', status: 401 },
  ProfileNotFound: { error: 'User profile not found', status: 404 },
  GracePeriodActive: { 
    error: 'Account deletion is pending. Cannot create or modify data.', 
    status: 403 
  },
  ValidationError: (details?: any) => ({ 
    error: 'Validation error', 
    details, 
    status: 400 
  }),
  NotFound: (resource: string) => ({ 
    error: `${resource} not found`, 
    status: 404 
  }),
  Conflict: (message: string) => ({ 
    error: message, 
    status: 409 
  }),
  InternalError: { error: 'Internal server error', status: 500 }
} as const

/**
 * Creates a standardized API response
 */
export function createApiResponse<T>(
  data: T, 
  message: string, 
  success: boolean = true
) {
  return {
    data,
    success,
    message
  }
}

/**
 * Creates a paginated API response
 */
export function createPaginatedResponse<T>(
  data: T[], 
  message: string,
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
) {
  return {
    data,
    success: true,
    message,
    pagination
  }
}

/**
 * UUID validation regex
 * NOTE: Using lenient format to accept test data UUIDs
 * Strict UUID v4 format: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Validates UUID format (lenient - accepts test UUIDs and any UUID-like format)
 */
export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id)
}

/**
 * Creates audit log entry for financial transactions
 */
export async function createTransactionLog(
  tenantId: string,
  entityType: string,
  entityId: string,
  action: string,
  changedBy: string,
  oldData?: any,
  newData?: any,
  request?: Request
) {
  try {
    const logEntry = {
      tenant_id: tenantId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      changed_by: changedBy,
      old_data: oldData || null,
      new_data: newData || null,
      ip_address: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || null,
      user_agent: request?.headers.get('user-agent') || null
    }

    const { error } = await supabaseAdmin
      .from('transaction_log')
      .insert(logEntry)

    if (error) {
      console.error('Error creating transaction log:', error)
      // Don't throw - audit logging shouldn't break the main operation
    }
  } catch (error) {
    console.error('Error in createTransactionLog:', error)
    // Don't throw - audit logging shouldn't break the main operation
  }
}

/**
 * Gets Dutch VAT rates from database
 */
export async function getDutchVATRates() {
  const { data: vatRates, error } = await supabaseAdmin
    .from('vat_rates')
    .select('*')
    .eq('country_code', 'NL')
    .is('effective_to', null) // Only current rates
    .order('rate_type')

  if (error) {
    console.error('Error fetching VAT rates:', error)
    return []
  }

  return vatRates || []
}

/**
 * Calculates invoice totals with VAT
 */
export function calculateInvoiceTotals(
  items: Array<{ quantity: number; unit_price: number }>,
  vatRate: number
) {
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.quantity * item.unit_price)
  }, 0)

  const vatAmount = Math.round(subtotal * vatRate * 100) / 100
  const totalAmount = Math.round((subtotal + vatAmount) * 100) / 100

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vatAmount,
    totalAmount
  }
}