/**
 * Invoice E2E Test Helper Functions
 *
 * Provides reusable utilities for invoice testing including:
 * - Invoice creation via API
 * - Finding and interacting with invoices
 * - Payment recording
 * - Status management
 * - Cleanup utilities
 */

import { Page, Locator, expect } from '@playwright/test'
import { buildAuthHeaders } from './api-auth'
import { dismissCookieConsent } from './auth-helpers'
import { getCurrentDate } from '../../../../lib/current-date'

/**
 * Invoice data structure for API creation
 */
export interface InvoiceData {
  clientId: string
  invoiceDate?: string
  dueDate?: string
  reference?: string
  notes?: string
  items: {
    description: string
    quantity?: number
    unit_price: number
  }[]
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
}

/**
 * Payment data structure
 */
export interface PaymentData {
  amount: number
  paymentDate?: string
  paymentMethod?: 'bank_transfer' | 'credit_card' | 'cash' | 'paypal' | 'other'
  reference?: string
  notes?: string
}

/**
 * Create invoice via API for testing
 * @param page - Playwright page object
 * @param data - Invoice data
 * @returns Invoice ID
 */
export async function createInvoiceViaAPI(
  page: Page,
  data: InvoiceData
): Promise<string> {
  // Use development date (getCurrentDate) instead of real current date
  const today = getCurrentDate()

  // Handle date logic to ensure valid invoice/due date combination
  let invoiceDate: string
  let dueDate: string

  if (data.status === 'overdue') {
    // For overdue invoices, set invoice date in the past
    const pastInvoiceDate = new Date(today)
    pastInvoiceDate.setDate(pastInvoiceDate.getDate() - 30) // 30 days ago from development date
    invoiceDate = data.invoiceDate || pastInvoiceDate.toISOString().split('T')[0]

    // Set due date 10 days after invoice (still in past, making it overdue)
    if (data.dueDate) {
      dueDate = data.dueDate
    } else {
      const pastDueDate = new Date(pastInvoiceDate)
      pastDueDate.setDate(pastDueDate.getDate() + 10)
      dueDate = pastDueDate.toISOString().split('T')[0]
    }
  } else {
    // Normal invoice: defaults to today with due date 30 days in future
    invoiceDate = data.invoiceDate || today.toISOString().split('T')[0]

    if (data.dueDate) {
      dueDate = data.dueDate
    } else {
      // Calculate due date from invoice date, not from today
      const futureDueDate = new Date(invoiceDate)
      futureDueDate.setDate(futureDueDate.getDate() + 30)
      dueDate = futureDueDate.toISOString().split('T')[0]
    }
  }

  // Validate that due_date >= invoice_date
  if (new Date(dueDate) < new Date(invoiceDate)) {
    throw new Error(`Invalid dates: due_date (${dueDate}) must be on or after invoice_date (${invoiceDate})`)
  }

  console.log(`[INVOICE-HELPER] Creating invoice for client ${data.clientId} on ${invoiceDate} due ${dueDate}`)

  const payload = {
    client_id: data.clientId,
    invoice_date: invoiceDate,
    due_date: dueDate,
    reference: data.reference || '',
    notes: data.notes || '',
    items: data.items.map(item => ({
      description: item.description,
      quantity: item.quantity || 1,
      unit_price: item.unit_price
    }))
  }

  const response = await page.request.post('/api/invoices', {
    data: payload,
    headers: await buildAuthHeaders(page)
  })

  if (!response.ok()) {
    const error = await response.text()
    console.error(`[INVOICE-HELPER] Failed invoice creation for client ${data.clientId}. Status ${response.status()}, body: ${error}`)
    throw new Error(`Failed to create invoice via API: ${response.status()} - ${error}`)
  }

  const result = await response.json()
  const invoiceId = result.invoice?.id || result.data?.id || result.id
  console.log(`[INVOICE-HELPER] Created invoice ${invoiceId} for client ${data.clientId}`)

  // Handle status updates with proper transitions
  if (data.status && data.status !== 'draft') {
    if (data.status === 'overdue') {
      // For overdue: first set to 'sent', then to 'overdue'
      console.log(`[INVOICE-HELPER] Updating invoice ${invoiceId} to 'sent' first`)
      await updateInvoiceStatusViaAPI(page, invoiceId, 'sent')
      console.log(`[INVOICE-HELPER] Successfully updated to 'sent', waiting before marking as overdue`)

      // Small delay to ensure database consistency
      await page.waitForTimeout(500)

      console.log(`[INVOICE-HELPER] Now updating to 'overdue'`)
      await updateInvoiceStatusViaAPI(page, invoiceId, 'overdue')
      console.log(`[INVOICE-HELPER] Successfully updated to 'overdue'`)
    } else {
      // For other statuses, update directly
      console.log(`[INVOICE-HELPER] Updating invoice ${invoiceId} to '${data.status}'`)
      await updateInvoiceStatusViaAPI(page, invoiceId, data.status)
      console.log(`[INVOICE-HELPER] Successfully updated to '${data.status}'`)
    }
  }

  return invoiceId
}

/**
 * Update invoice status via API
 * @param page - Playwright page object
 * @param invoiceId - Invoice ID
 * @param status - New status
 */
export async function updateInvoiceStatusViaAPI(
  page: Page,
  invoiceId: string,
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
): Promise<void> {
  const response = await page.request.put(`/api/invoices/${invoiceId}/status`, {
    data: { status },
    headers: await buildAuthHeaders(page)
  })

  if (!response.ok()) {
    const error = await response.text()
    throw new Error(`Failed to update invoice status: ${response.status()} - ${error}`)
  }
}

/**
 * Record payment via API
 * @param page - Playwright page object
 * @param invoiceId - Invoice ID
 * @param payment - Payment data
 */
export async function recordPaymentViaAPI(
  page: Page,
  invoiceId: string,
  payment: PaymentData
): Promise<string> {
  const paymentDate = payment.paymentDate || getCurrentDate().toISOString().split('T')[0]

  const response = await page.request.post(`/api/invoices/${invoiceId}/payments`, {
    data: {
      amount: payment.amount,
      payment_date: paymentDate,
      payment_method: payment.paymentMethod || 'bank_transfer',
      reference: payment.reference || '',
      notes: payment.notes || ''
    },
    headers: await buildAuthHeaders(page)
  })

  if (!response.ok()) {
    const error = await response.text()
    throw new Error(`Failed to record payment: ${response.status()} - ${error}`)
  }

  const result = await response.json()
  return result.payment?.id || result.id
}

/**
 * Find invoice by invoice number in the list
 * @param page - Playwright page object
 * @param invoiceNumber - Invoice number (e.g., "2024-001")
 * @returns Locator for the invoice row
 */
export async function findInvoiceByNumber(
  page: Page,
  invoiceNumber: string
): Promise<Locator> {
  const invoiceRow = page.locator(`tr:has-text("${invoiceNumber}")`)
  await expect(invoiceRow).toBeVisible({ timeout: 10000 })
  return invoiceRow
}

/**
 * Wait for invoice metrics to load (no skeleton loaders)
 * @param page - Playwright page object
 */
export async function waitForInvoiceMetrics(page: Page): Promise<void> {
  // Wait for metric cards to appear (using .metric-card class)
  await page.waitForSelector('.metric-card', { timeout: 10000 })

  // Wait for skeleton loaders to disappear
  await page.waitForSelector('.animate-pulse', { state: 'hidden', timeout: 10000 }).catch(() => {
    // Skeleton might not exist, that's fine
  })

  // Wait for at least one metric value to be visible
  await expect(page.locator('.metric-card').first()).toBeVisible()
}

/**
 * Wait for invoice list to load
 * @param page - Playwright page object
 */
export async function waitForInvoiceList(page: Page): Promise<void> {
  // Dismiss cookie consent if present (might appear after page reload)
  await dismissCookieConsent(page)

  // Wait for table or empty state
  const hasTable = await page.locator('table tbody tr').count().then(count => count > 0)
  const hasEmptyState = await page.locator('text=/No invoices found|Geen facturen gevonden/i').isVisible()

  if (!hasTable && !hasEmptyState) {
    await page.waitForSelector('table tbody tr, text=/No invoices found|Geen facturen gevonden/i', { timeout: 10000 })
  }
}

/**
 * Click invoice detail modal
 * @param page - Playwright page object
 * @param invoiceNumber - Invoice number to click
 */
export async function openInvoiceDetail(
  page: Page,
  invoiceNumber: string
): Promise<void> {
  const invoiceRow = await findInvoiceByNumber(page, invoiceNumber)

  // Click the View (Eye icon) button in the actions column
  const viewButton = invoiceRow.locator('button[title*="View"], button:has(svg.lucide-eye)')
  await viewButton.click()

  // Wait for detail modal to open
  await page.waitForSelector('[data-testid="invoice-detail-modal"], [role="dialog"]', { timeout: 5000 })
}

/**
 * Record payment through UI
 * @param page - Playwright page object
 * @param amount - Payment amount
 * @param paymentDate - Optional payment date
 */
export async function recordPaymentUI(
  page: Page,
  amount: number,
  paymentDate?: string
): Promise<void> {
  // Click "Record Payment" button (match exact Dutch text: "Betaling registreren")
  await page.click('button:has-text("Record Payment"), button:has-text("Betaling registreren")')

  // Wait for payment modal
  await page.waitForSelector('[data-testid="payment-modal"], [role="dialog"]', { timeout: 5000 })

  // Fill amount
  await page.fill('input[name="amount"], input[placeholder*="Amount"], input[placeholder*="Bedrag"]', amount.toString())

  // Fill date if provided
  if (paymentDate) {
    await page.fill('input[name="payment_date"], input[type="date"]', paymentDate)
  }

  // Submit payment
  await page.click('button[type="submit"]:has-text("Record"), button[type="submit"]:has-text("Registreren")')

  // Wait for modal to close
  await page.waitForSelector('[data-testid="payment-modal"]', { state: 'hidden', timeout: 5000 }).catch(() => {
    // Modal might already be closed
  })
}

/**
 * Update invoice status through UI
 * @param page - Playwright page object
 * @param newStatus - New status
 */
export async function updateInvoiceStatusUI(
  page: Page,
  newStatus: 'draft' | 'sent' | 'paid' | 'cancelled'
): Promise<void> {
  // Map status to button text (English/Dutch)
  const statusButtonMap: Record<string, string[]> = {
    sent: ['Send', 'Versturen', 'Mark as Sent', 'Markeer als Verstuurd'],
    paid: ['Mark as Paid', 'Markeer als Betaald'],
    cancelled: ['Cancel Invoice', 'Annuleer Factuur'],
    draft: ['Revert to Draft', 'Terug naar Concept']
  }

  const buttonTexts = statusButtonMap[newStatus] || []

  for (const buttonText of buttonTexts) {
    const button = page.locator(`button:has-text("${buttonText}")`)
    if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
      await button.click()

      // Confirm if dialog appears
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Bevestigen")')
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click()
      }

      return
    }
  }

  throw new Error(`Status button for "${newStatus}" not found`)
}

/**
 * Delete invoice through UI (clicks delete button in table row)
 * @param page - Playwright page object
 * @param invoiceNumber - Invoice number to delete
 */
export async function deleteInvoiceUI(page: Page, invoiceNumber: string): Promise<void> {
  // Find the invoice row
  const invoiceRow = page.locator(`tr:has-text("${invoiceNumber}")`)
  await invoiceRow.waitFor({ state: 'visible', timeout: 10000 })

  // Click delete button in the row actions
  const deleteButton = invoiceRow.locator('button[title="Delete"]')
  await deleteButton.waitFor({ state: 'visible', timeout: 10000 })
  await deleteButton.click()

  // Wait for confirmation dialog
  const confirmationModal = page.locator('[role="alertdialog"], [role="dialog"]')
  await confirmationModal.waitFor({ state: 'visible', timeout: 5000 })

  // Confirm deletion (using role-based selector like in expense tests)
  const confirmDeleteButton = confirmationModal.getByRole('button', { name: /^Delete$/ })
  await confirmDeleteButton.waitFor({ state: 'visible', timeout: 10000 })
  await confirmDeleteButton.click()

  // Wait for dialog to close and page to reload
  await page.waitForTimeout(1000)
}

/**
 * Filter invoices by status
 * @param page - Playwright page object
 * @param status - Status to filter by
 */
export async function filterByStatus(
  page: Page,
  status: 'all' | 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
): Promise<void> {
  // Click status filter button
  const statusMap: Record<string, string[]> = {
    all: ['All', 'Alle', 'All Invoices'],
    draft: ['Draft', 'Concept'],
    sent: ['Sent', 'Verstuurd'],
    paid: ['Paid', 'Betaald'],
    overdue: ['Overdue', 'Achterstallig'],
    cancelled: ['Cancelled', 'Geannuleerd']
  }

  const statusTexts = statusMap[status] || []

  for (const text of statusTexts) {
    const button = page.locator(`button:has-text("${text}"), [role="tab"]:has-text("${text}")`)
    if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
      await button.click()
      await page.waitForTimeout(500) // Wait for filter to apply
      return
    }
  }

  throw new Error(`Status filter "${status}" not found`)
}

/**
 * Filter invoices by client
 * @param page - Playwright page object
 * @param clientName - Client name to filter by
 */
export async function filterByClient(
  page: Page,
  clientName: string
): Promise<void> {
  // Click client filter dropdown
  await page.click('[data-testid="client-filter"], button:has-text("Client"), button:has-text("Klant")')

  // Wait for dropdown
  await page.waitForTimeout(500)

  // Click client option
  await page.click(`[role="option"]:has-text("${clientName}"), button:has-text("${clientName}")`)

  // Wait for filter to apply
  await page.waitForTimeout(500)
}

/**
 * Filter invoices by date range
 * @param page - Playwright page object
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 */
export async function filterByDateRange(
  page: Page,
  startDate: string,
  endDate: string
): Promise<void> {
  // Click date range filter
  await page.click('[data-testid="date-range-filter"], button:has-text("Date Range"), button:has-text("Datumbereik")')

  // Wait for date pickers
  await page.waitForTimeout(500)

  // Fill start date
  await page.fill('input[name="start_date"], input[placeholder*="Start"]', startDate)

  // Fill end date
  await page.fill('input[name="end_date"], input[placeholder*="End"]', endDate)

  // Apply filter
  await page.click('button:has-text("Apply"), button:has-text("Toepassen")')

  // Wait for filter to apply
  await page.waitForTimeout(500)
}

/**
 * Search invoices by text
 * @param page - Playwright page object
 * @param searchTerm - Search term
 */
export async function searchInvoices(
  page: Page,
  searchTerm: string
): Promise<void> {
  // Find search input
  const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="Zoeken"]')
  await searchInput.fill(searchTerm)

  // Wait for search to apply
  await page.waitForTimeout(500)
}

/**
 * Clear all filters
 * @param page - Playwright page object
 */
export async function clearFilters(page: Page): Promise<void> {
  const clearButton = page.locator('button:has-text("Clear"), button:has-text("Wissen")')

  if (await clearButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await clearButton.click()
    await page.waitForTimeout(500)
  }
}

/**
 * Get invoice count from page
 * @param page - Playwright page object
 * @returns Number of visible invoices
 */
export async function getInvoiceCount(page: Page): Promise<number> {
  const rows = await page.locator('table tbody tr').count()
  return rows
}

/**
 * Get metric value by label
 * @param page - Playwright page object
 * @param label - Metric label (e.g., "Total Pending", "Overdue")
 * @returns Metric value as string
 */
export async function getMetricValue(
  page: Page,
  label: string
): Promise<string> {
  const metricCard = page.locator(`.metric-card:has-text("${label}")`)
  await expect(metricCard).toBeVisible()

  // Get the value using the metric-card__value class
  const value = await metricCard.locator('.metric-card__value').first().textContent()
  return value?.trim() || ''
}

/**
 * Open comprehensive invoicing wizard
 * @param page - Playwright page object
 */
export async function openInvoicingWizard(page: Page): Promise<void> {
  // Click "Start Invoice Wizard" button (use more specific selector to avoid strict mode violation)
  const wizardButton = page.locator('.action-chip:has-text("Start Invoice Wizard"), .action-chip:has-text("Factuurwizard"), .action-chip:has-text("Invoice Wizard")').first()
  await wizardButton.click()

  // Wait for wizard modal
  await page.waitForSelector('[data-testid="invoicing-wizard"], [data-testid="comprehensive-invoicing-wizard"], [role="dialog"]', { timeout: 5000 })
}

/**
 * Open manual invoice form
 * @param page - Playwright page object
 */
export async function openManualInvoiceForm(page: Page): Promise<void> {
  // Click "Manual Invoice" button (now separate from wizard)
  const manualButton = page.locator('button:has-text("Manual Invoice"), button:has-text("Handmatige Factuur")')
  await manualButton.click()

  // Wait for form modal/dialog
  await page.waitForSelector('[data-testid="invoice-form"], form, [role="dialog"]', { timeout: 5000 })
}

/**
 * Cleanup invoices via API
 * @param page - Playwright page object
 * @param invoiceIds - Array of invoice IDs to delete
 */
export async function cleanupInvoices(
  page: Page,
  invoiceIds: string[]
): Promise<void> {
  for (const id of invoiceIds) {
    try {
      await page.request.delete(`/api/invoices/${id}`, {
        headers: await buildAuthHeaders(page, false)
      })
    } catch (error) {
      console.warn(`Failed to cleanup invoice ${id}:`, error)
    }
  }
}

/**
 * Get invoice details from API
 * @param page - Playwright page object
 * @param invoiceId - Invoice ID
 * @returns Invoice object
 */
export async function getInvoiceDetails(
  page: Page,
  invoiceId: string
): Promise<any> {
  const response = await page.request.get(`/api/invoices/${invoiceId}`, {
    headers: await buildAuthHeaders(page, false)
  })

  if (!response.ok()) {
    throw new Error(`Failed to get invoice details: ${response.status()}`)
  }

  const result = await response.json()

  // Extract invoice from API response wrapper (handles different response structures)
  return result.data || result.invoice || result
}

/**
 * Wait for invoice status badge to update
 * @param page - Playwright page object
 * @param expectedStatus - Expected status
 */
export async function waitForStatusBadge(
  page: Page,
  expectedStatus: string
): Promise<void> {
  const statusMap: Record<string, string[]> = {
    draft: ['Draft', 'Concept'],
    sent: ['Sent', 'Verstuurd', 'Verzonden'],
    paid: ['Paid', 'Betaald'],
    overdue: ['Overdue', 'Achterstallig'],
    cancelled: ['Cancelled', 'Geannuleerd'],
    partial: ['Partial', 'Gedeeltelijk']
  }

  const statusTexts = statusMap[expectedStatus.toLowerCase()] || [expectedStatus]

  // Try multiple selectors: badge class, inline-flex (shadcn badge), or just text
  for (const text of statusTexts) {
    const selectors = [
      `.badge:has-text("${text}")`,
      `[data-status="${expectedStatus}"]`,
      `.inline-flex:has-text("${text}")`, // shadcn badge uses inline-flex
      `text="${text}"` // fallback to just text
    ]

    for (const selector of selectors) {
      const badge = page.locator(selector)
      if (await badge.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`✅ Found status badge "${text}" using selector: ${selector}`)
        return
      }
    }
  }

  throw new Error(`Status badge "${expectedStatus}" not found. Tried: ${statusTexts.join(', ')}`)
}

/**
 * Navigate to next page in pagination
 * @param page - Playwright page object
 */
export async function goToNextPage(page: Page): Promise<void> {
  await page.click('button:has-text("Next"), button[aria-label="Next page"]')
  await page.waitForTimeout(500)
}

/**
 * Navigate to previous page in pagination
 * @param page - Playwright page object
 */
export async function goToPreviousPage(page: Page): Promise<void> {
  await page.click('button:has-text("Previous"), button[aria-label="Previous page"]')
  await page.waitForTimeout(500)
}

/**
 * Get current page number from pagination
 * @param page - Playwright page object
 * @returns Current page number
 */
export async function getCurrentPage(page: Page): Promise<number> {
  const pageText = await page.locator('[data-testid="current-page"], .pagination-current').textContent()
  const match = pageText?.match(/\d+/)
  return match ? parseInt(match[0]) : 1
}
