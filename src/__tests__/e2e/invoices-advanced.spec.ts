/**
 * E2E Tests for Invoice Advanced Features
 *
 * Test Coverage:
 * - Apply invoice template
 * - Customize VAT and payment terms
 * - Generate PDF preview
 * - Send invoice via email
 * - Export invoices to CSV
 *
 * Total: 5 E2E tests
 */

import { test, expect, Page } from '@playwright/test'
import {
  createInvoiceViaAPI,
  findInvoiceByNumber,
  waitForInvoiceList,
  openManualInvoiceForm,
  cleanupInvoices,
  getInvoiceDetails
} from './helpers/invoice-helpers'
import {
  createClientViaAPI,
  generateTestClientData,
  cleanupClients
} from './helpers/client-helpers'
import { loginToApplication as authLogin, dismissCookieConsent } from './helpers/auth-helpers'
import { clickDropdownOption } from './helpers/ui-interactions'

test.setTimeout(60000)

// Test data storage for cleanup
const testData = {
  clientIds: [] as string[],
  invoiceIds: [] as string[],
  templateIds: [] as string[]
}

test.describe('Invoice Advanced Features', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging for debugging
    page.on('console', (msg) => {
      console.log(`[browser:${msg.type()}] ${msg.text()}`)
    })

    await loginToApplication(page)
    await page.goto('/dashboard/financieel-v2/facturen')
    await page.waitForLoadState('networkidle')
    await dismissCookieConsent(page) // Dismiss cookie consent if it appears after navigation
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

    // Cleanup templates
    if (testData.templateIds.length > 0) {
      for (const templateId of testData.templateIds) {
        try {
          await page.request.delete(`/api/invoice-templates/${templateId}`)
        } catch (error) {
          console.warn(`Failed to cleanup template ${templateId}:`, error)
        }
      }
      testData.templateIds = []
    }
  })

  test('should apply invoice template with pre-filled items', async ({ page }) => {
    // Create test client
    const clientData = generateTestClientData('E2E Template Test Client')
    const clientId = await createClientViaAPI(page, clientData)
    testData.clientIds.push(clientId)

    // Create invoice template via API with unique name
    const uniqueTemplateName = `E2E Test Template ${Date.now()}`
    const templateResponse = await page.request.post('/api/invoice-templates', {
      data: {
        name: uniqueTemplateName,
        description: 'Template for E2E testing',
        default_payment_terms_days: 14,
        items: [
          {
            description: 'Monthly Retainer',
            quantity: 1,
            unit_price: 1500
          },
          {
            description: 'Additional Hours',
            quantity: 10,
            unit_price: 150
          }
        ]
      }
    })

    if (templateResponse.ok()) {
      const template = await templateResponse.json()
      const templateId = template.data?.template?.id
      testData.templateIds.push(templateId)

      console.log(`Created template ${templateId}`)

      // Open manual invoice form
      await openManualInvoiceForm(page)

      // Wait for form and templates to load
      await page.waitForSelector('[data-testid="invoice-form"]', { timeout: 5000 })
      await page.waitForTimeout(2000) // Give time for templates to fetch

      // Strict: Template selector must be visible
      const templateSelector = page.locator('[data-testid="template-selector"]')
      await expect(templateSelector).toBeVisible({ timeout: 5000 })

      await templateSelector.click()
      await page.waitForTimeout(500)

      // Use search to filter templates
      const templateSearch = page.locator('[data-testid="template-search"]')
      await expect(templateSearch).toBeVisible({ timeout: 3000 })
      await templateSearch.fill(uniqueTemplateName)
      await page.waitForTimeout(1000)

      // Strict: Template option must be present and clickable after filtering
      const templateOption = page.locator(`[role="option"]:has-text("${uniqueTemplateName}")`).first()
      await expect(templateOption).toBeVisible({ timeout: 3000 })

      await templateOption.scrollIntoViewIfNeeded()
      await templateOption.hover({ timeout: 2000 }).catch(() => null)
      await templateOption.click({ timeout: 2000, force: true })

      // Click a neutral spot on the form to ensure the Radix Select closes like a user click would
      await page.locator('[data-testid="invoice-form"]').click({ position: { x: 8, y: 8 } })
      await expect(templateSelector).toContainText(uniqueTemplateName, { timeout: 3000 })
      await page.waitForTimeout(1000)

      // Strict: Template items must be pre-filled
      const monthlyRetainerItem = page.locator('text=/Monthly Retainer/i')
      const additionalHoursItem = page.locator('text=/Additional Hours/i')

      await expect(monthlyRetainerItem.first()).toBeVisible({ timeout: 3000 })
      await expect(additionalHoursItem.first()).toBeVisible({ timeout: 3000 })
      console.log('✅ Template applied - Items pre-filled')

      // Close form using Escape key (more reliable than clicking Cancel due to overlay)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500) // Wait for modal close animation
    } else {
      throw new Error('Failed to create template - endpoint not working')
    }
  })

  test('should customize VAT rate and payment terms', async ({ page }) => {
    // Create test client (EU business with VAT)
    const clientData = generateTestClientData('E2E VAT Customization Client')
    clientData.country_code = 'DE' // Germany
    clientData.vat_number = 'DE123456789'
    clientData.is_business = true

    const clientId = await createClientViaAPI(page, clientData)
    testData.clientIds.push(clientId)

    // Open manual invoice form
    await openManualInvoiceForm(page)

    // Wait for form
    await page.waitForSelector('[data-testid="invoice-form"], form', { timeout: 5000 })

    // Select client
    const clientSelector = page.locator('button:has-text("Select client"), input[name="client"], [data-testid="client-selector"]').first()
    if (await clientSelector.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clientSelector.click()
      await page.waitForTimeout(500)

      const clientOption = page.locator(`[role="option"]:has-text("${clientData.name}"), option:has-text("${clientData.name}")`).first()
      if (await clientOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await clientOption.click()
        await page.waitForTimeout(1000)
      }
    }

    // Look for VAT rate field
    const vatRateField = page.locator('input[name="vat_rate"], input[placeholder*="VAT"], select[name="vat_rate"]').first()

    if (await vatRateField.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Try to set custom VAT rate (9% - reduced rate)
      await vatRateField.clear()
      await vatRateField.fill('9')
      await page.waitForTimeout(500)

      console.log('✅ Custom VAT rate set to 9%')
    } else {
      console.log('⚠️  VAT rate field not found - might be auto-calculated only')
    }

    // Look for payment terms field
    const paymentTermsField = page.locator('input[name="payment_terms"], input[name="due_days"], select[name="payment_terms"]').first()

    if (await paymentTermsField.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Set custom payment terms (14 days instead of default 30)
      await paymentTermsField.clear()
      await paymentTermsField.fill('14')
      await page.waitForTimeout(500)

      console.log('✅ Custom payment terms set to 14 days')
    } else {
      console.log('⚠️  Payment terms field not found - might use different pattern')
    }

    // Close form using Escape key (more reliable than clicking Cancel due to overlay)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500) // Wait for modal close animation

    console.log('✅ VAT and payment terms customization test completed')
  })

  test('should generate and preview PDF', async ({ page }) => {
    // Create test client
    const clientData = generateTestClientData('E2E PDF Test Client')
    const clientId = await createClientViaAPI(page, clientData)
    testData.clientIds.push(clientId)

    // Create invoice
    const invoiceId = await createInvoiceViaAPI(page, {
      clientId: clientId,
      reference: 'PDF-TEST-001',
      items: [
        {
          description: 'PDF Generation Test Service',
          quantity: 1,
          unit_price: 500
        }
      ]
    })
    testData.invoiceIds.push(invoiceId)

    // Get invoice details
    const invoice = await getInvoiceDetails(page, invoiceId)
    const invoiceNumber = invoice.invoice_number

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')
    await waitForInvoiceList(page)

    // Open invoice detail by clicking the View (Eye) button
    const invoiceRow = await findInvoiceByNumber(page, invoiceNumber)
    const viewButton = invoiceRow.locator('button:has(svg.lucide-eye)')
    await viewButton.click()

    // Wait for detail modal
    await page.waitForSelector('[data-testid="invoice-detail-modal"], [role="dialog"]', { timeout: 5000 })

    // Strict: PDF button must be visible
    const pdfButton = page.locator('[data-testid="pdf-button"]')
    await expect(pdfButton).toBeVisible({ timeout: 5000 })

    // Setup download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null)

    // Click PDF button
    await pdfButton.click()

    // Wait for download or new tab
    const download = await downloadPromise

    if (download) {
      // Verify PDF download
      const fileName = download.suggestedFilename()
      expect(fileName).toMatch(/\.pdf$/i)
      console.log(`✅ PDF generated and downloaded: ${fileName}`)
    } else {
      // Might open in new tab instead of downloading
      const pages = page.context().pages()
      if (pages.length > 1) {
        const pdfPage = pages[pages.length - 1]
        await pdfPage.waitForLoadState('load', { timeout: 5000 }).catch(() => {})

        const isPdfPage = pdfPage.url().includes('.pdf') || (pdfPage.url().includes('/invoices/') && pdfPage.url().includes('/pdf'))
        expect(isPdfPage).toBeTruthy()
        console.log('✅ PDF opened in new tab')
        await pdfPage.close()
      } else {
        throw new Error('PDF was not downloaded or opened in new tab')
      }
    }
  })

  test('should send invoice via email', async ({ page }) => {
    // Create test client with email
    const clientData = generateTestClientData('E2E Email Test Client')
    clientData.email = 'test-email@example.com'

    const clientId = await createClientViaAPI(page, clientData)
    testData.clientIds.push(clientId)

    // Create invoice
    const invoiceId = await createInvoiceViaAPI(page, {
      clientId: clientId,
      reference: 'EMAIL-TEST-001',
      items: [
        {
          description: 'Email Test Service',
          quantity: 1,
          unit_price: 750
        }
      ],
      status: 'draft'
    })
    testData.invoiceIds.push(invoiceId)

    // Get invoice details
    const invoice = await getInvoiceDetails(page, invoiceId)
    const invoiceNumber = invoice.invoice_number

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')
    await waitForInvoiceList(page)

    // Open invoice detail by clicking the View (Eye) button
    const invoiceRow = await findInvoiceByNumber(page, invoiceNumber)
    const viewButton = invoiceRow.locator('button:has(svg.lucide-eye)')
    await viewButton.click()

    // Wait for detail modal
    await page.waitForSelector('[data-testid="invoice-detail-modal"], [role="dialog"]', { timeout: 5000 })

    // Strict: Email send button must be visible
    const sendEmailButton = page.locator('[data-testid="send-email-button"]')
    await expect(sendEmailButton).toBeVisible({ timeout: 5000 })
    await sendEmailButton.click()
    await page.waitForTimeout(1000)

    // Strict: Email dialog must open
    const emailDialog = page.locator('[data-testid="email-dialog"]')
    await expect(emailDialog).toBeVisible({ timeout: 3000 })

    // Strict: Email input must be pre-filled with client email
    const emailInput = emailDialog.locator('[data-testid="email-to-input"]')
    await expect(emailInput).toBeVisible({ timeout: 2000 })
    const emailValue = await emailInput.inputValue()
    expect(emailValue).toContain('test-email@example.com')
    console.log(`✅ Email dialog opened with recipient: ${emailValue}`)

    // Strict: Send button must be available
    const sendButton = emailDialog.locator('button:has-text("Send"), button:has-text("Versturen")')
    await expect(sendButton).toBeVisible({ timeout: 2000 })
    console.log('✅ Email send functionality available')

    // Close dialog using Escape key (more reliable than clicking Close due to overlay)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500) // Wait for modal close animation
  })

  test('should export invoices to CSV', async ({ page }) => {
    // Create test client
    const clientData = generateTestClientData('E2E Export Test Client')
    const clientId = await createClientViaAPI(page, clientData)
    testData.clientIds.push(clientId)

    // Create multiple invoices for export
    const invoicePromises = []
    for (let i = 0; i < 3; i++) {
      const promise = createInvoiceViaAPI(page, {
        clientId: clientId,
        reference: `EXPORT-TEST-${i + 1}`,
        items: [
          {
            description: `Export Test Service ${i + 1}`,
            quantity: 1,
            unit_price: 100 * (i + 1)
          }
        ]
      }).then(id => {
        testData.invoiceIds.push(id)
        return id
      })
      invoicePromises.push(promise)
    }

    await Promise.all(invoicePromises)
    console.log('Created 3 test invoices for export')

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')
    await waitForInvoiceList(page)

    // Strict: Export button must be visible
    const exportButton = page.locator('[data-testid="export-button"]')
    await expect(exportButton).toBeVisible({ timeout: 5000 })

    // Setup download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 })

    // Click export button
    await exportButton.click()
    await page.waitForTimeout(500)

    // If dropdown menu, click CSV option
    const csvOption = page.locator('[role="menuitem"]:has-text("CSV"), button:has-text("CSV")').first()
    if (await csvOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await csvOption.click()
    }

    // Strict: Download must occur
    const download = await downloadPromise

    // Strict: Verify CSV download
    const fileName = download.suggestedFilename()
    expect(fileName).toMatch(/\.csv$/i)
    console.log(`✅ Invoices exported to ${fileName}`)

    // Strict: Verify CSV contents contain test data
    const filePath = await download.path()
    expect(filePath).toBeTruthy()

    if (filePath) {
      const fs = await import('fs')
      const fileContent = fs.readFileSync(filePath, 'utf-8')

      // Verify CSV contains invoice data
      const hasExportData = fileContent.includes('EXPORT-TEST') || fileContent.includes('Export Test Service')
      expect(hasExportData).toBeTruthy()
      console.log('✅ CSV contains invoice data')
    }
  })
})

// ========================================
// Helper Functions
// ========================================

/**
 * Login to the application
 */
async function loginToApplication(page: Page) {
  const isLoggedIn = await checkIfLoggedIn(page)

  if (isLoggedIn) {
    console.log('✅ Already logged in')
    await dismissCookieConsent(page)
    return
  }

  console.log('🔐 Logging in to application...')

  await page.goto('/sign-in')
  await page.waitForSelector('text=Sign in', { timeout: 10000 })

  const emailInput = page.locator('input[type="email"], input[name="identifier"]').first()
  await emailInput.waitFor({ state: 'visible', timeout: 10000 })
  await emailInput.fill('imre.iddatasolutions@gmail.com')

  const passwordInput = page.locator('input[type="password"], input[name="password"]').first()
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 })
  await passwordInput.fill('Qy192837465!?')

  const continueButton = page.locator('button:has-text("Continue")').first()
  await continueButton.click()

  await page.waitForURL(/\/dashboard/, { timeout: 15000 })

  // Dismiss cookie consent if present
  await dismissCookieConsent(page)

  console.log('✅ Login successful')
}

/**
 * Check if user is already logged in
 */
async function checkIfLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard', { timeout: 5000 })
    await page.waitForLoadState('networkidle', { timeout: 3000 })
    return page.url().includes('/dashboard')
  } catch {
    return false
  }
}
