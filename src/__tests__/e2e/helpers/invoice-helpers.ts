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
  const invoiceDate = data.invoiceDate || new Date().toISOString().split('T')[0]
  const dueDate = data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

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
    data: payload
  })

  if (!response.ok()) {
    const error = await response.text()
    throw new Error(`Failed to create invoice via API: ${response.status()} - ${error}`)
  }

  const result = await response.json()
  const invoiceId = result.invoice?.id || result.id

  // If status is not draft, update it
  if (data.status && data.status !== 'draft') {
    await updateInvoiceStatusViaAPI(page, invoiceId, data.status)
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
    data: { status }
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
  const paymentDate = payment.paymentDate || new Date().toISOString().split('T')[0]

  const response = await page.request.post(`/api/invoices/${invoiceId}/payments`, {
    data: {
      amount: payment.amount,
      payment_date: paymentDate,
      payment_method: payment.paymentMethod || 'bank_transfer',
      reference: payment.reference || '',
      notes: payment.notes || ''
    }
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
  // Wait for metric cards to appear
  await page.waitForSelector('[data-testid="metric-card"]', { timeout: 10000 })

  // Wait for skeleton loaders to disappear
  await page.waitForSelector('.animate-pulse', { state: 'hidden', timeout: 10000 }).catch(() => {
    // Skeleton might not exist, that's fine
  })

  // Wait for at least one metric value to be visible
  await expect(page.locator('[data-testid="metric-card"]').first()).toBeVisible()
}

/**
 * Wait for invoice list to load
 * @param page - Playwright page object
 */
export async function waitForInvoiceList(page: Page): Promise<void> {
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
  await invoiceRow.click()

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
  // Click "Record Payment" button
  await page.click('button:has-text("Record Payment"), button:has-text("Betaling Registreren")')

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
 * Delete invoice through UI
 * @param page - Playwright page object
 */
export async function deleteInvoiceUI(page: Page): Promise<void> {
  // Click delete button
  await page.click('button:has-text("Delete"), button:has-text("Verwijderen")')

  // Wait for confirmation dialog
  await page.waitForSelector('[role="alertdialog"], [role="dialog"]', { timeout: 5000 })

  // Confirm deletion
  await page.click('button:has-text("Delete"), button:has-text("Verwijderen"), button:has-text("Confirm"), button:has-text("Bevestigen")')

  // Wait for dialog to close
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
  const metricCard = page.locator(`[data-testid="metric-card"]:has-text("${label}")`)
  await expect(metricCard).toBeVisible()

  // Get the value (usually in a larger font or specific element)
  const value = await metricCard.locator('.text-2xl, .text-3xl, [data-testid="metric-value"]').first().textContent()
  return value?.trim() || ''
}

/**
 * Open comprehensive invoicing wizard
 * @param page - Playwright page object
 */
export async function openInvoicingWizard(page: Page): Promise<void> {
  await page.click('button:has-text("Create Invoice"), button:has-text("Factuur Maken")')

  // Wait for wizard modal
  await page.waitForSelector('[data-testid="invoicing-wizard"], [data-testid="comprehensive-invoicing-wizard"]', { timeout: 5000 })
}

/**
 * Open manual invoice form
 * @param page - Playwright page object
 */
export async function openManualInvoiceForm(page: Page): Promise<void> {
  // Look for manual invoice button (might be in dropdown)
  const manualButton = page.locator('button:has-text("Manual Invoice"), button:has-text("Handmatige Factuur")')

  if (await manualButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await manualButton.click()
  } else {
    // Might be in a dropdown menu
    await page.click('button:has-text("Create"), button[data-testid="create-menu"]')
    await page.waitForTimeout(300)
    await page.click('button:has-text("Manual Invoice"), button:has-text("Handmatige Factuur")')
  }

  // Wait for form modal
  await page.waitForSelector('[data-testid="invoice-form"], form', { timeout: 5000 })
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
      await page.request.delete(`/api/invoices/${id}`)
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
  const response = await page.request.get(`/api/invoices/${invoiceId}`)

  if (!response.ok()) {
    throw new Error(`Failed to get invoice details: ${response.status()}`)
  }

  return await response.json()
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
    sent: ['Sent', 'Verstuurd'],
    paid: ['Paid', 'Betaald'],
    overdue: ['Overdue', 'Achterstallig'],
    cancelled: ['Cancelled', 'Geannuleerd']
  }

  const statusTexts = statusMap[expectedStatus.toLowerCase()] || [expectedStatus]

  for (const text of statusTexts) {
    const badge = page.locator(`.badge:has-text("${text}"), [data-status="${expectedStatus}"]`)
    if (await badge.isVisible({ timeout: 5000 }).catch(() => false)) {
      return
    }
  }

  throw new Error(`Status badge "${expectedStatus}" not found`)
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
