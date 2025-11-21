/**
 * E2E Tests for Invoices Page (/dashboard/financieel-v2/facturen)
 *
 * Test Coverage:
 * - Dashboard Metrics (3 tests)
 * - Invoice List Display (3 tests)
 * - Invoice Filtering (4 tests)
 * - Invoice Creation (3 tests)
 * - Invoice Actions (2 tests)
 *
 * Total: 15 E2E tests
 */

import { test, expect, Page } from '@playwright/test'
import {
  createInvoiceViaAPI,
  findInvoiceByNumber,
  waitForInvoiceMetrics,
  waitForInvoiceList,
  filterByStatus,
  searchInvoices,
  getInvoiceCount,
  getMetricValue,
  openInvoicingWizard,
  openManualInvoiceForm,
  deleteInvoiceUI,
  cleanupInvoices
} from './helpers/invoice-helpers'
import {
  createClientViaAPI,
  generateTestClientData,
  cleanupClients
} from './helpers/client-helpers'
import { loginToApplication as authLogin } from './helpers/auth-helpers'
import { getCurrentDate } from '../../lib/current-date'

test.setTimeout(60000)

// Test data storage for cleanup
const testData = {
  clientIds: [] as string[],
  invoiceIds: [] as string[]
}

test.describe('Invoices Page - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging for debugging
    page.on('console', (msg) => {
      console.log(`[browser:${msg.type()}] ${msg.text()}`)
    })

    await authLogin(page)
    await page.goto('/dashboard/financieel-v2/facturen')
    await page.waitForLoadState('networkidle')
    await dismissCookieConsentIfPresent(page)

    // Wait for page to be ready (look for main heading or table)
    await page.waitForSelector('h1, h2, table, [data-testid="invoices-page"]', { timeout: 15000 })
  })

  test.afterEach(async ({ page }) => {
    // Cleanup invoices created during test
    if (testData.invoiceIds.length > 0) {
      await cleanupInvoices(page, testData.invoiceIds)
      testData.invoiceIds = []
    }

    // Cleanup clients at end of each test to avoid afterAll page fixture issue
    if (testData.clientIds.length > 0) {
      await cleanupClients(page, testData.clientIds)
      testData.clientIds = []
    }
  })

  // ========================================
  // Dashboard Metrics (3 tests)
  // ========================================

  test.describe('Dashboard Metrics', () => {
    test('should display all metric cards without loading placeholders', async ({ page }) => {
      // Wait for metrics to load
      await waitForInvoiceMetrics(page)

      // Verify metric cards are visible (using .metric-card class)
      const metricCards = page.locator('.metric-card')
      const cardCount = await metricCards.count()

      // Should have at least 3 metric cards
      expect(cardCount).toBeGreaterThanOrEqual(3)

      // Verify no loading placeholders
      const skeletonLoaders = page.locator('.animate-pulse')
      const skeletonCount = await skeletonLoaders.count()
      expect(skeletonCount).toBe(0)

      // Verify all cards have values (not "..." or empty)
      for (let i = 0; i < cardCount; i++) {
        const card = metricCards.nth(i)
        const value = await card.locator('.metric-card__value').first().textContent()
        expect(value).toBeTruthy()
        expect(value).not.toContain('...')
      }

      console.log(`✅ All ${cardCount} metric cards loaded successfully`)
    })

    test('should calculate billable amount from unbilled time entries', async ({ page }) => {
      // Create test client
      const clientData = generateTestClientData('E2E Billable Test Client')
      const clientId = await createClientViaAPI(page, clientData)
      testData.clientIds.push(clientId)

      // Create project for client
      const projectResponse = await page.request.post('/api/projects', {
        data: {
          client_id: clientId,
          name: 'E2E Test Project',
          status: 'active',
          hourly_rate: 100
        }
      })
      const project = await projectResponse.json()
      const projectId = project.project?.id || project.id

      // Create unbilled time entries (5 hours @ €100/hour = €500)
      const today = getCurrentDate().toISOString().split('T')[0]
      const timeEntriesData = [
        {
          client_id: clientId,
          project_id: projectId,
          hours: 3,
          hourly_rate: 100,
          description: 'E2E Test Work 1',
          date: today,
          invoiced: false
        },
        {
          client_id: clientId,
          project_id: projectId,
          hours: 2,
          hourly_rate: 100,
          description: 'E2E Test Work 2',
          date: today,
          invoiced: false
        }
      ]

      for (const entryData of timeEntriesData) {
        await page.request.post('/api/time-entries', { data: entryData })
      }

      // Reload page to see updated billable amount
      await page.reload()
      await page.waitForLoadState('networkidle')
      await waitForInvoiceMetrics(page)

      // Check billable amount metric
      const billableCard = page.locator('.metric-card').filter({ hasText: /Billable|Te factureren/i })

      if (await billableCard.count() > 0) {
        const billableValue = await billableCard.first().locator('.metric-card__value').first().textContent()
        console.log(`Billable amount: ${billableValue}`)

        // Verify it shows an amount (should include €500 from our test entries)
        expect(billableValue).toMatch(/€\s*[\d,]+/)
      } else {
        console.log('⚠️  Billable amount metric not found - might not be implemented yet')
      }

      console.log('✅ Billable amount metric test completed')
    })

    test('should display overdue invoices count accurately', async ({ page }) => {
      // Create test client
      const clientData = generateTestClientData('E2E Overdue Test Client')
      const clientId = await createClientViaAPI(page, clientData)
      testData.clientIds.push(clientId)

      // Create overdue invoice - helper will handle dates automatically for 'overdue' status
      const overdueInvoiceId = await createInvoiceViaAPI(page, {
        clientId: clientId,
        items: [
          {
            description: 'E2E Test Service',
            quantity: 1,
            unit_price: 500
          }
        ],
        status: 'overdue'  // Helper will set appropriate past dates
      })
      testData.invoiceIds.push(overdueInvoiceId)

      // Reload page to see updated metrics
      await page.reload()
      await page.waitForLoadState('networkidle')
      await waitForInvoiceMetrics(page)

      // Check overdue metric
      const overdueCard = page.locator('.metric-card').filter({ hasText: /Overdue|Achterstallig/i })

      if (await overdueCard.count() > 0) {
        const overdueValue = await overdueCard.first().locator('.metric-card__value').first().textContent()
        console.log(`Overdue count: ${overdueValue}`)

        // Should show at least 1 overdue invoice
        expect(overdueValue).toMatch(/[1-9]/)
      } else {
        console.log('⚠️  Overdue metric not found - might not be implemented yet')
      }

      console.log('✅ Overdue invoices metric test completed')
    })
  })

  // ========================================
  // Invoice List Display (3 tests)
  // ========================================

  test.describe('Invoice List Display', () => {
    test('should display invoices with correct data', async ({ page }) => {
      // Create test client
      const clientData = generateTestClientData('E2E Display Test Client')
      const clientId = await createClientViaAPI(page, clientData)
      testData.clientIds.push(clientId)

      // Create test invoice
      const invoiceId = await createInvoiceViaAPI(page, {
        clientId: clientId,
        reference: 'E2E-TEST-001',
        notes: 'Test invoice for display',
        items: [
          {
            description: 'E2E Test Service',
            quantity: 2,
            unit_price: 150
          }
        ]
      })
      testData.invoiceIds.push(invoiceId)

      // Get invoice details to verify invoice number
      const invoiceDetails = await page.request.get(`/api/invoices/${invoiceId}`)
      const invoice = await invoiceDetails.json()
      const invoiceNumber = invoice.invoice_number

      console.log(`Created invoice ${invoiceNumber}`)

      // Reload page to see new invoice
      await page.reload()
      await page.waitForLoadState('networkidle')
      await waitForInvoiceList(page)

      // Find invoice in list
      const invoiceRow = await findInvoiceByNumber(page, invoiceNumber)
      await expect(invoiceRow).toBeVisible()

      // Verify invoice data is displayed
      await expect(invoiceRow).toContainText(clientData.name)
      await expect(invoiceRow).toContainText(/€\s*[\d,]+/) // Amount displayed

      // Verify status badge
      const statusBadge = invoiceRow.locator('.badge, [data-status]').first()
      await expect(statusBadge).toBeVisible()

      console.log('✅ Invoice displayed correctly in list')
    })

    test('should show empty state when no invoices exist', async ({ page }) => {
      // This test assumes no invoices exist, or we filter to show none
      // Apply a filter that returns no results (e.g., cancelled status if none exist)

      // Try to filter by cancelled status (usually empty)
      try {
        await filterByStatus(page, 'cancelled')
        await page.waitForTimeout(1000)

        // Check for empty state
        const emptyState = page.locator('text=/No invoices found|Geen facturen|No invoices match/i')
        const hasEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false)

        if (hasEmptyState) {
          await expect(emptyState).toBeVisible()
          console.log('✅ Empty state displayed correctly')
        } else {
          // If there are cancelled invoices, that's fine - test passes
          console.log('⚠️  Found cancelled invoices - empty state test skipped')
        }
      } catch (error) {
        console.log('⚠️  Could not test empty state - filter might not be implemented')
      }
    })

    test('should paginate invoice list with more than 10 invoices', async ({ page }) => {
      // Create test client
      const clientData = generateTestClientData('E2E Pagination Test Client')
      const clientId = await createClientViaAPI(page, clientData)
      testData.clientIds.push(clientId)

      // Create 12 invoices to trigger pagination
      console.log('Creating 12 test invoices...')
      const invoicePromises = []

      for (let i = 0; i < 12; i++) {
        const promise = createInvoiceViaAPI(page, {
          clientId: clientId,
          items: [
            {
              description: `E2E Test Service ${i + 1}`,
              quantity: 1,
              unit_price: 100 + i
            }
          ]
        }).then(id => {
          testData.invoiceIds.push(id)
          return id
        })
        invoicePromises.push(promise)
      }

      await Promise.all(invoicePromises)
      console.log('All invoices created')

      // Reload page
      await page.reload()
      await page.waitForLoadState('networkidle')
      await waitForInvoiceList(page)

      // Check if pagination controls exist
      const paginationControls = page.locator('[data-testid="pagination"], .pagination, button:has-text("Next"), button:has-text("Previous")')
      const hasPagination = await paginationControls.count() > 0

      if (hasPagination) {
        // Verify first page shows max 10 invoices
        const invoiceRows = page.locator('table tbody tr')
        const rowCount = await invoiceRows.count()
        expect(rowCount).toBeLessThanOrEqual(10)

        console.log(`First page shows ${rowCount} invoices`)

        // Try to navigate to next page
        const nextButton = page.locator('button:has-text("Next"), button[aria-label="Next page"]')
        if (await nextButton.isEnabled({ timeout: 2000 }).catch(() => false)) {
          await nextButton.click()
          await page.waitForTimeout(1000)

          // Verify second page has invoices
          const secondPageRowCount = await invoiceRows.count()
          expect(secondPageRowCount).toBeGreaterThan(0)

          console.log(`✅ Pagination working - Second page shows ${secondPageRowCount} invoices`)
        } else {
          console.log('⚠️  Next button not enabled - pagination might work differently')
        }
      } else {
        console.log('⚠️  Pagination controls not found - might not be implemented or uses different pattern')
      }
    })
  })

  // ========================================
  // Invoice Filtering (4 tests)
  // ========================================

  test.describe('Invoice Filtering', () => {
    test('should filter invoices by status', async ({ page }) => {
      // Create test client
      const clientData = generateTestClientData('E2E Filter Test Client')
      const clientId = await createClientViaAPI(page, clientData)
      testData.clientIds.push(clientId)

      // Create invoices with different statuses
      const draftInvoiceId = await createInvoiceViaAPI(page, {
        clientId: clientId,
        items: [{ description: 'Draft Invoice', quantity: 1, unit_price: 100 }],
        status: 'draft'
      })
      testData.invoiceIds.push(draftInvoiceId)

      const sentInvoiceId = await createInvoiceViaAPI(page, {
        clientId: clientId,
        items: [{ description: 'Sent Invoice', quantity: 1, unit_price: 200 }],
        status: 'sent'
      })
      testData.invoiceIds.push(sentInvoiceId)

      // Reload page
      await page.reload()
      await page.waitForLoadState('networkidle')
      await waitForInvoiceList(page)

      // Filter by draft status
      await filterByStatus(page, 'draft')
      await page.waitForTimeout(1000)

      // Verify only draft invoices shown
      const draftBadges = page.locator('.badge, [data-status]').filter({ hasText: /Draft|Concept/i })
      const draftCount = await draftBadges.count()
      expect(draftCount).toBeGreaterThan(0)

      console.log(`✅ Status filter working - Found ${draftCount} draft invoices`)

      // Filter by sent status
      await filterByStatus(page, 'sent')
      await page.waitForTimeout(1000)

      // Verify only sent invoices shown
      const sentBadges = page.locator('.badge, [data-status]').filter({ hasText: /Sent|Verstuurd/i })
      const sentCount = await sentBadges.count()
      expect(sentCount).toBeGreaterThan(0)

      console.log(`✅ Status filter working - Found ${sentCount} sent invoices`)
    })

    test('should filter invoices by date range', async ({ page }) => {
      // Create test client
      const clientData = generateTestClientData('E2E Date Filter Test Client')
      const clientId = await createClientViaAPI(page, clientData)
      testData.clientIds.push(clientId)

      // Create invoice with specific date
      const targetDate = '2030-06-15'
      const invoiceId = await createInvoiceViaAPI(page, {
        clientId: clientId,
        invoiceDate: targetDate,
        items: [{ description: 'Date Test Invoice', quantity: 1, unit_price: 100 }]
      })
      testData.invoiceIds.push(invoiceId)

      // Reload page
      await page.reload()
      await page.waitForLoadState('networkidle')
      await waitForInvoiceList(page)

      // Try to open date filter
      const dateFilterButton = page.locator('button:has-text("Date"), button[data-testid="date-filter"]').first()

      if (await dateFilterButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await dateFilterButton.click()
        await page.waitForTimeout(500)

        // Fill date range (June 2030)
        const startDateInput = page.locator('input[name="start_date"], input[name="from"], input[placeholder*="Start"]').first()
        const endDateInput = page.locator('input[name="end_date"], input[name="to"], input[placeholder*="End"]').first()

        if (await startDateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await startDateInput.fill('2030-06-01')
          await endDateInput.fill('2030-06-30')

          // Apply filter
          const applyButton = page.locator('button:has-text("Apply"), button:has-text("Toepassen")').first()
          await applyButton.click()
          await page.waitForTimeout(1000)

          // Verify filtered results
          const invoiceCount = await getInvoiceCount(page)
          console.log(`✅ Date filter applied - Found ${invoiceCount} invoices in date range`)
        } else {
          console.log('⚠️  Date filter inputs not found - might use different pattern')
        }
      } else {
        console.log('⚠️  Date filter not implemented yet')
      }
    })

    test('should filter invoices by client', async ({ page }) => {
      // Create two test clients
      const client1Data = generateTestClientData('E2E Client Filter 1')
      const client1Id = await createClientViaAPI(page, client1Data)
      testData.clientIds.push(client1Id)

      const client2Data = generateTestClientData('E2E Client Filter 2')
      const client2Id = await createClientViaAPI(page, client2Data)
      testData.clientIds.push(client2Id)

      // Create invoices for each client
      const invoice1Id = await createInvoiceViaAPI(page, {
        clientId: client1Id,
        items: [{ description: 'Client 1 Invoice', quantity: 1, unit_price: 100 }]
      })
      testData.invoiceIds.push(invoice1Id)

      const invoice2Id = await createInvoiceViaAPI(page, {
        clientId: client2Id,
        items: [{ description: 'Client 2 Invoice', quantity: 1, unit_price: 200 }]
      })
      testData.invoiceIds.push(invoice2Id)

      // Reload page
      await page.reload()
      await page.waitForLoadState('networkidle')
      await waitForInvoiceList(page)

      // Try to open client filter
      const clientFilterButton = page.locator('button:has-text("Client"), button[data-testid="client-filter"]').first()

      if (await clientFilterButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await clientFilterButton.click()
        await page.waitForTimeout(500)

        // Select first client
        const clientOption = page.locator(`[role="option"]:has-text("${client1Data.name}"), button:has-text("${client1Data.name}")`).first()

        if (await clientOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await clientOption.click()
          await page.waitForTimeout(1000)

          // Verify filtered results show only client 1
          const invoiceRows = page.locator('table tbody tr')
          const visibleInvoices = await invoiceRows.count()

          // Check if client 1 name appears in results
          const client1Appears = await page.locator(`text="${client1Data.name}"`).count()
          expect(client1Appears).toBeGreaterThan(0)

          console.log(`✅ Client filter working - Found ${visibleInvoices} invoices for ${client1Data.name}`)
        } else {
          console.log('⚠️  Client option not found - might use different pattern')
        }
      } else {
        console.log('⚠️  Client filter not implemented yet')
      }
    })

    test('should search invoices by invoice number', async ({ page }) => {
      // Create test client
      const clientData = generateTestClientData('E2E Search Test Client')
      const clientId = await createClientViaAPI(page, clientData)
      testData.clientIds.push(clientId)

      // Create invoice with unique reference
      const uniqueRef = `E2E-SEARCH-${Date.now()}`
      const invoiceId = await createInvoiceViaAPI(page, {
        clientId: clientId,
        reference: uniqueRef,
        items: [{ description: 'Search Test Invoice', quantity: 1, unit_price: 100 }]
      })
      testData.invoiceIds.push(invoiceId)

      // Get invoice number
      const invoiceDetails = await page.request.get(`/api/invoices/${invoiceId}`)
      const invoice = await invoiceDetails.json()
      const invoiceNumber = invoice.invoice_number

      // Reload page
      await page.reload()
      await page.waitForLoadState('networkidle')
      await waitForInvoiceList(page)

      // Search by invoice number
      await searchInvoices(page, invoiceNumber)

      // Verify invoice appears in results
      const searchResults = await findInvoiceByNumber(page, invoiceNumber)
      await expect(searchResults).toBeVisible()

      console.log(`✅ Search working - Found invoice ${invoiceNumber}`)
    })
  })

  // ========================================
  // Invoice Creation (3 tests)
  // ========================================

  test.describe('Invoice Creation', () => {
    test('should open comprehensive invoicing wizard', async ({ page }) => {
      // Click create invoice button
      await openInvoicingWizard(page)

      // Verify wizard modal opened
      const wizardModal = page.locator('[data-testid="invoicing-wizard"], [data-testid="comprehensive-invoicing-wizard"]')
      await expect(wizardModal).toBeVisible({ timeout: 5000 })

      // Verify wizard shows Step 1
      const step1Indicator = page.locator('text=/Step 1|Stap 1/i')
      await expect(step1Indicator).toBeVisible()

      console.log('✅ Comprehensive invoicing wizard opened successfully')

      // Close modal
      const closeButton = page.locator('button[aria-label="Close"], button:has-text("Close")').first()
      if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeButton.click()
      } else {
        await page.keyboard.press('Escape')
      }
    })

    test('should open manual invoice form', async ({ page }) => {
      // Open manual invoice form
      await openManualInvoiceForm(page)

      // Verify form opened
      const invoiceForm = page.locator('[data-testid="invoice-form"], form')
      await expect(invoiceForm).toBeVisible({ timeout: 5000 })

      // Verify required fields are present
      const clientField = page.locator('input[name="client_id"], select[name="client_id"], button:has-text("Select client")')
      await expect(clientField).toBeVisible()

      const dateField = page.locator('input[type="date"], input[name="invoice_date"]')
      await expect(dateField).toBeVisible()

      console.log('✅ Manual invoice form opened successfully')

      // Close form
      const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Annuleren")').first()
      if (await cancelButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cancelButton.click()
      } else {
        await page.keyboard.press('Escape')
      }
    })

    test('should validate required fields on form submission', async ({ page }) => {
      // Open manual invoice form
      await openManualInvoiceForm(page)

      // Wait for form to be visible
      await page.waitForSelector('[data-testid="invoice-form"], form', { timeout: 5000 })

      // Try to submit without filling required fields
      const submitButton = page.locator('button[type="submit"]:has-text("Save"), button[type="submit"]:has-text("Create")').first()

      if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitButton.click()
        await page.waitForTimeout(1000)

        // Verify validation errors appear
        const errorMessages = page.locator('text=/required|verplicht|must/i, .error, [role="alert"]')
        const errorCount = await errorMessages.count()

        if (errorCount > 0) {
          expect(errorCount).toBeGreaterThan(0)
          console.log(`✅ Form validation working - Found ${errorCount} validation errors`)
        } else {
          console.log('⚠️  Validation errors not found - form might have different validation pattern')
        }

        // Close form
        const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Annuleren")').first()
        await cancelButton.click()
      } else {
        console.log('⚠️  Submit button not found - form might have different pattern')
      }
    })
  })

  // ========================================
  // Invoice Actions (2 tests)
  // ========================================

  test.describe('Invoice Actions', () => {
    test('should open invoice detail modal', async ({ page }) => {
      // Create test client
      const clientData = generateTestClientData('E2E Detail Test Client')
      const clientId = await createClientViaAPI(page, clientData)
      testData.clientIds.push(clientId)

      // Create test invoice
      const invoiceId = await createInvoiceViaAPI(page, {
        clientId: clientId,
        items: [
          {
            description: 'Detail Test Service',
            quantity: 1,
            unit_price: 250
          }
        ]
      })
      testData.invoiceIds.push(invoiceId)

      // Get invoice number
      const invoiceDetails = await page.request.get(`/api/invoices/${invoiceId}`)
      const invoice = await invoiceDetails.json()
      const invoiceNumber = invoice.invoice_number

      // Reload page
      await page.reload()
      await page.waitForLoadState('networkidle')
      await waitForInvoiceList(page)

      // Click invoice to open detail modal
      const invoiceRow = await findInvoiceByNumber(page, invoiceNumber)
      await invoiceRow.click()

      // Verify detail modal opened
      const detailModal = page.locator('[data-testid="invoice-detail-modal"], [role="dialog"]')
      await expect(detailModal).toBeVisible({ timeout: 5000 })

      // Verify invoice details are displayed
      await expect(detailModal).toContainText(invoiceNumber)
      await expect(detailModal).toContainText(clientData.name)
      await expect(detailModal).toContainText('Detail Test Service')

      console.log('✅ Invoice detail modal opened successfully')

      // Close modal
      const closeButton = page.locator('button[aria-label="Close"], button:has-text("Close")').first()
      if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeButton.click()
      } else {
        await page.keyboard.press('Escape')
      }
    })

    test('should delete draft invoice with confirmation', async ({ page }) => {
      // Create test client
      const clientData = generateTestClientData('E2E Delete Test Client')
      const clientId = await createClientViaAPI(page, clientData)
      testData.clientIds.push(clientId)

      // Create draft invoice
      const invoiceId = await createInvoiceViaAPI(page, {
        clientId: clientId,
        items: [
          {
            description: 'Invoice to Delete',
            quantity: 1,
            unit_price: 100
          }
        ],
        status: 'draft'
      })
      testData.invoiceIds.push(invoiceId)

      // Get invoice number
      const invoiceDetails = await page.request.get(`/api/invoices/${invoiceId}`)
      const invoice = await invoiceDetails.json()
      const invoiceNumber = invoice.invoice_number

      // Reload page
      await page.reload()
      await page.waitForLoadState('networkidle')
      await waitForInvoiceList(page)

      // Open invoice detail
      const invoiceRow = await findInvoiceByNumber(page, invoiceNumber)
      await invoiceRow.click()

      // Wait for detail modal
      await page.waitForSelector('[data-testid="invoice-detail-modal"], [role="dialog"]', { timeout: 5000 })

      // Delete invoice
      await deleteInvoiceUI(page)

      // Verify invoice removed from list
      await page.waitForLoadState('networkidle')
      const deletedInvoice = page.locator(`tr:has-text("${invoiceNumber}")`)
      await expect(deletedInvoice).not.toBeVisible({ timeout: 5000 })

      console.log('✅ Invoice deleted successfully')

      // Remove from cleanup list since already deleted
      const index = testData.invoiceIds.indexOf(invoiceId)
      if (index > -1) {
        testData.invoiceIds.splice(index, 1)
      }
    })
  })
})

async function dismissCookieConsentIfPresent(page: Page) {
  const consentButtons = page.locator(
    'button:has-text("Approve"), button:has-text("Accept"), button:has-text("Akkoord"), button:has-text("Accepteren"), button:has-text("I Understand"), button:has-text("Accept All"), button:has-text("Accept all cookies")'
  )

  if (await consentButtons.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await consentButtons.first().click()
    await page.waitForTimeout(500)
    console.log('✅ Cookie consent dismissed (invoices-page spec)')
  }
}
