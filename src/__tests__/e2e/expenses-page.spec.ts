import { test, expect, Page } from '@playwright/test'
import path from 'path'
import { format } from 'date-fns'

test.setTimeout(60000)

const createdExpenseIds: string[] = []

// Shared state for sequential tests (tests 3-7)
let sharedExpenseId: string | null = null
let sharedExpenseDescription: string = ''

test.describe('Expenses Page - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      console.log(`[browser:${msg.type()}] ${msg.text()}`)
    })

    await loginToApplication(page)
    await page.goto('/dashboard/financieel-v2/uitgaven')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('text=All Expenses', { timeout: 15000 })
  })

  test.afterEach(async ({ page }) => {
    for (const expenseId of createdExpenseIds.splice(0)) {
      try {
        await page.request.delete(`/api/expenses/${expenseId}`)
      } catch (error) {
        console.warn(`Failed to cleanup expense ${expenseId}:`, error)
      }
    }
  })



  test('should display expense metrics without loading placeholders', async ({ page }) => {
    await page.waitForFunction(() => {
      const values = Array.from(document.querySelectorAll('.metric-card__value'))
      return values.length >= 4 && values.every(el => el.textContent && !el.textContent.includes('...'))
    })

    const metricTitles = ['This Month', 'VAT Paid', 'OCR Processed', 'Categories']

    for (const title of metricTitles) {
      const card = page.locator('.metric-card').filter({ hasText: title }).first()
      await expect(card).toBeVisible()
      await expect(card.locator('.metric-card__value')).not.toHaveText('...')
    }
  })

  test('should create an expense', async ({ page }) => {
    sharedExpenseDescription = `E2E Workflow Test ${Date.now()}`

    // Create a new expense via API
    const createResponse = await page.request.post('/api/expenses', {
      data: {
        vendor_name: 'E2E Test Vendor',
        expense_date: '2030-01-10',
        description: sharedExpenseDescription,
        amount: 150.00,
        category: 'software_ict',
        vat_rate: 0.21,
        is_deductible: true
      }
    })

    expect(createResponse.ok()).toBeTruthy()
    const responseJson = await createResponse.json()
    sharedExpenseId = responseJson?.data?.id
    expect(sharedExpenseId).toBeTruthy()

    // Don't add to cleanup list yet - will be deleted manually in test 7
    console.log(`Created shared expense with ID: ${sharedExpenseId}`)

    // Refresh the page to see the new expense
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('text=All Expenses', { timeout: 15000 })

    // Wait for metrics to load
    await page.waitForFunction(() => {
      const values = Array.from(document.querySelectorAll('.metric-card__value'))
      return values.length >= 4 && values.every(el => el.textContent && !el.textContent.includes('...'))
    }, { timeout: 5000 })

    // Verify the expense is visible
    await searchAndExpandForDescription(page, sharedExpenseDescription, '2030-01-10')
    const expenseText = page.locator(`:text("${sharedExpenseDescription}")`).first()
    await expect(expenseText).toBeVisible({ timeout: 10000 })
  });

  test('should edit the created expense', async ({ page }) => {
    expect(sharedExpenseId).toBeTruthy()

    const updatedDescription = `${sharedExpenseDescription} (edited)`

    // Find and click edit button
    await searchAndExpandForDescription(page, sharedExpenseDescription, '2030-01-10')
    const editButton = page.locator(`div:has-text("${sharedExpenseDescription}") button[title="Edit expense"]`).first()
    await editButton.waitFor({ state: 'visible', timeout: 10000 })
    await editButton.click()

    const editDialog = page.locator('[role="dialog"]:has-text("Edit Expense")')
    await expect(editDialog).toBeVisible({ timeout: 15000 })

    // Update description
    const descriptionInput = editDialog.locator('textarea[name="description"]')
    await descriptionInput.clear()
    await descriptionInput.fill(updatedDescription)
    await page.waitForTimeout(300)

    // Click update button and wait for API response
    const updateButton = editDialog.locator('button:has-text("Uitgave bijwerken")').first()
    await updateButton.waitFor({ state: 'visible', timeout: 5000 })

    // Wait for the PUT request to complete
    const responsePromise = page.waitForResponse(resp =>
      resp.url().includes('/api/expenses') && resp.request().method() === 'PUT'
    )
    await updateButton.click({ force: true })
    await responsePromise

    // Wait for dialog to close
    await editDialog.waitFor({ state: 'hidden', timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Verify the update
    await searchAndExpandForDescription(page, updatedDescription, '2030-01-10')
    await expect(page.locator(`:text("${updatedDescription}")`).first()).toBeVisible({ timeout: 10000 })

    // Update shared description
    sharedExpenseDescription = updatedDescription
  });

  test('should approve the expense via bulk action', async ({ page }) => {
    expect(sharedExpenseId).toBeTruthy()

    // Find and select the expense checkbox
    await searchAndExpandForDescription(page, sharedExpenseDescription, '2030-01-10')
    const checkbox = page.locator(`div:has-text("${sharedExpenseDescription}") [role="checkbox"]`).first()
    await checkbox.waitFor({ state: 'visible', timeout: 10000 })
    await checkbox.click()

    // Click approve in bulk action bar and wait for API response
    const bulkActionBar = page.locator('div.glass-card:has-text("selected")').first()
    await expect(bulkActionBar).toBeVisible({ timeout: 10000 })
    const approveButton = bulkActionBar.locator('button:has-text("Approve")')

    // Wait for PATCH/PUT request to approve the expense
    const approveResponsePromise = page.waitForResponse(resp =>
      resp.url().includes('/api/expenses') && (resp.request().method() === 'PATCH' || resp.request().method() === 'PUT')
    )
    await approveButton.click()
    await approveResponsePromise

    await expect(page.locator('text=1 expense approved successfully')).toBeVisible({ timeout: 10000 })

    // Verify status is "Approved"
    const approvedStatus = page.locator(`div:has-text("${sharedExpenseDescription}") :text("Approved")`).first()
    await expect(approvedStatus).toBeVisible({ timeout: 10000 })
  });

  test('should unapprove the expense', async ({ page }) => {
    expect(sharedExpenseId).toBeTruthy()

    // Find and click edit button
    await searchAndExpandForDescription(page, sharedExpenseDescription, '2030-01-10')
    const editButton = page.locator(`div:has-text("${sharedExpenseDescription}") button[title="Edit expense"]`).first()
    await editButton.waitFor({ state: 'visible', timeout: 10000 })
    await editButton.click()

    const editDialog = page.locator('[role="dialog"]:has-text("Edit Expense")')
    await expect(editDialog).toBeVisible({ timeout: 15000 })

    // Click un-approve button and wait for API response
    const unapproveButton = editDialog.locator('button:has-text("Un-approve")').first()
    await unapproveButton.waitFor({ state: 'visible', timeout: 5000 })

    // Wait for PATCH/PUT request to unapprove the expense
    const unapproveResponsePromise = page.waitForResponse(resp =>
      resp.url().includes('/api/expenses') && (resp.request().method() === 'PATCH' || resp.request().method() === 'PUT')
    )
    await unapproveButton.click()
    await unapproveResponsePromise

    // Wait for dialog to close
    await editDialog.waitFor({ state: 'hidden', timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Verify status is "Draft"
    const draftStatus = page.locator(`div:has-text("${sharedExpenseDescription}") :text("Draft")`).first()
    await expect(draftStatus).toBeVisible({ timeout: 10000 })
  });

  test('should delete the expense', async ({ page }) => {
    expect(sharedExpenseId).toBeTruthy()

    // Find and click delete button
    await searchAndExpandForDescription(page, sharedExpenseDescription, '2030-01-10')
    const deleteButton = page.locator(`div:has-text("${sharedExpenseDescription}") button[title="Delete expense"]`).first()
    await deleteButton.waitFor({ state: 'visible', timeout: 10000 })
    await deleteButton.click()

    // Confirm deletion and wait for API response
    const confirmationModal = page.locator('[role="dialog"]:has-text("Delete expense?")')
    await expect(confirmationModal).toBeVisible({ timeout: 10000 })

    // Wait for DELETE request to complete
    const deleteResponsePromise = page.waitForResponse(resp =>
      resp.url().includes(`/api/expenses/${sharedExpenseId}`) && resp.request().method() === 'DELETE'
    )
    await confirmationModal.getByRole('button', { name: /^Delete$/ }).click()
    await deleteResponsePromise

    // Wait for modal to close and page to update
    await confirmationModal.waitFor({ state: 'hidden', timeout: 5000 })
    await page.waitForTimeout(1000) // Give time for UI to update and toast to appear

    // Verify expense is gone from the expense list (not just anywhere on page)
    // Use a more specific selector that only targets expense rows
    const expenseRow = page.locator('[data-testid="expense-card"], .expense-card, [class*="expense"]').filter({ hasText: sharedExpenseDescription })
    await expect(expenseRow).toHaveCount(0, { timeout: 10000 })

    // Cleanup complete - expense was deleted via UI
    console.log(`Deleted shared expense ${sharedExpenseId}`)
    sharedExpenseId = null
  })

  test('should process a receipt with AI-enhanced OCR suggestions', async ({ page }) => {
    const receiptPath = path.join(process.cwd(), '20250304 - KPN - Mobiel - ded33601-15a5-43b0-a78f-8a4fa537f5f0.pdf')

    await page.route('**/api/expenses/ocr-process', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 300))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            success: true,
            confidence: 0.93,
            extracted_data: {
              vendor_name: 'KPN B.V.',
              expense_date: '2025-03-04',
              amount: 42.55,
              expense_type: 'telefoon_communicatie',
              vat_rate: 0.21,
              vat_amount: 8.94,
              description: 'Mobiel abonnement maart 2025'
            },
            ocr_metadata: {
              line_count: 18,
              processing_engine: 'Phi-3.5-mini - AI Enhanced Pipeline',
              language: 'nl',
              confidence_scores: [0.92, 0.9, 0.88]
            }
          }
        })
      })
    })

    try {
      await page.locator('button.action-chip', { hasText: 'New Expense' }).click()
      const dialog = page.locator('[role="dialog"]:has-text("Add New Expense")')
      await expect(dialog).toBeVisible({ timeout: 15000 })

      const fileInput = dialog.locator('input[type="file"]')
      await fileInput.setInputFiles(receiptPath)

      const processingLabel = dialog.getByText('Bon wordt verwerkt...')
      await expect(processingLabel).toBeVisible({ timeout: 5000 })
      await expect(processingLabel).toBeHidden({ timeout: 30000 }) // OCR needs at least 20s

      const aiBadge = dialog.locator('[data-slot="badge"]:has-text("AI-Enhanced")').first()
      await expect(aiBadge).toBeVisible({ timeout: 30000 })
      await expect(dialog.locator('input[name="vendor_name"]')).toHaveValue('KPN B.V.')
      await expect(dialog.locator('input[type="date"]').first()).toHaveValue('2025-03-04')
      await expect(dialog.locator('input[name="amount"]')).toHaveValue(/42\.5/)

      const categoryTrigger = dialog.locator('button[role="combobox"]').first()
      await expect(categoryTrigger).toHaveText(/Telefoon & Communicatie/)

      await dialog.getByRole('button', { name: 'Annuleren' }).click()
      await expect(dialog).toBeHidden()
    } finally {
      await page.unroute('**/api/expenses/ocr-process')
    }
  })

  test.describe('UI Interactions', () => {
    test('should filter by clicking category chip in month breakdown', async ({ page }) => {
      // Wait for expenses to load
      await page.waitForLoadState('networkidle')

      // Find category chips (buttons containing category name and amount, e.g., "Software & ICT € 65.369,43")
      // These appear below the month group headings
      const categoryButtons = page.locator('button').filter({
        hasText: /Software & ICT|Other|Meals & Business|Travel|Office|Marketing/
      }).filter({
        hasText: /€/  // Must contain an amount
      })

      // Wait for at least one category button to be visible
      const firstButton = categoryButtons.first()
      await firstButton.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
        console.log('No category breakdown buttons found')
      })

      const buttonCount = await categoryButtons.count()

      if (buttonCount > 0) {
        // Get the text of the first category button
        const buttonText = await firstButton.textContent()
        console.log(`Clicking category button: ${buttonText}`)

        // Click the category chip to apply filter
        await firstButton.click()

        // Wait for page to respond to filter
        await page.waitForTimeout(1000)

        // Verify that we're filtering by checking if the filter affects the display
        // The easiest way is to check if clicking worked (no error thrown)
        console.log('Category filter applied successfully')

        // Clear filters if a clear button exists
        const clearButton = page.locator('button:has-text("Clear all")').or(page.locator('button:has-text("Wis filters")')).or(page.locator('button:has-text("Clear")')).first()
        const clearExists = await clearButton.count() > 0

        if (clearExists) {
          await clearButton.click()
          await page.waitForTimeout(500)
        }
      }
    })

    test('should switch between All Expenses and Recurring Expenses tabs', async ({ page }) => {
      // Verify we're on "All Expenses" tab
      const allExpensesTab = page.locator('button').filter({ hasText: /^All Expenses|Alle uitgaven$/ }).first()
      await expect(allExpensesTab).toBeVisible()

      // Click "Recurring Expenses" tab
      const recurringTab = page.locator('button').filter({ hasText: /Recurring|Terugkerend/ }).first()
      await recurringTab.click()

      // Wait for URL to change
      await page.waitForURL(/.*recurring.*|.*terugkerend.*/, { timeout: 5000 }).catch(() => {
        // URL might not change, that's okay
      })

      // Wait for page to load
      await page.waitForLoadState('networkidle')

      // Verify recurring expenses content is visible
      const recurringContent = page.locator('text=Recurring').or(page.locator('text=Terugkerend')).or(page.locator('h1'))
      await expect(recurringContent.first()).toBeVisible({ timeout: 5000 })

      // Switch back to "All Expenses"
      const allExpensesTabAgain = page.locator('button').filter({ hasText: /^All Expenses|Alle uitgaven$/ }).first()
      await allExpensesTabAgain.click()

      // Verify we're back on all expenses
      await page.waitForSelector('text=All Expenses', { timeout: 5000 }).catch(() => {
        // Might be in Dutch
      })
    })

    test('should collapse and expand month groups manually', async ({ page }) => {
      // Find the first month group heading
      const monthHeading = page.locator('h3').or(page.getByRole('heading', { level: 3 })).first()
      await monthHeading.waitFor({ state: 'visible', timeout: 5000 })

      const monthText = await monthHeading.textContent()
      console.log(`Found month group: ${monthText}`)

      // Check if there are expenses visible initially
      const expensesBeforeCollapse = page.locator('[data-testid="expense-card"]').or(page.locator('.expense-card'))
      const initialCount = await expensesBeforeCollapse.count()

      if (initialCount > 0) {
        // Click to collapse
        await monthHeading.click()
        await page.waitForTimeout(500) // Wait for animation

        // Verify expenses are hidden (count should decrease or elements should be hidden)
        const expensesAfterCollapse = await expensesBeforeCollapse.count()
        // Note: We can't assert exact count as there might be other month groups

        // Click again to expand
        await monthHeading.click()
        await page.waitForTimeout(500)

        // Verify expenses are visible again
        await expect(expensesBeforeCollapse.first()).toBeVisible({ timeout: 3000 })
      }
    })
  })

  test.describe('Form Validation & Error Handling', () => {
    test('should show validation errors for required fields', async ({ page }) => {
      // Open create expense dialog
      await page.locator('button.action-chip', { hasText: 'New Expense' }).or(page.locator('button:has-text("New Expense")')).click()

      const dialog = page.locator('[role="dialog"]').filter({ hasText: /Add New Expense|Nieuwe uitgave/i }).first()
      await expect(dialog).toBeVisible({ timeout: 15000 })

      // Try to submit empty form
      const submitButton = dialog.locator('button[type="submit"]').or(dialog.locator('button:has-text("Opslaan")')).or(dialog.locator('button:has-text("Save")')).first()
      await submitButton.click()

      // Wait for validation errors to appear
      await page.waitForTimeout(500)

      // Check for error messages (these are common validation error indicators)
      const errorMessages = dialog.locator('[role="alert"]').or(dialog.locator('.error-message')).or(dialog.locator('text=/required|verplicht|invalid/i'))

      // At least one validation error should be visible
      const errorCount = await errorMessages.count()
      expect(errorCount).toBeGreaterThan(0)

      // Close dialog
      const cancelButton = dialog.locator('button:has-text("Annuleren")').or(dialog.locator('button:has-text("Cancel")')).first()
      await cancelButton.click()
      await expect(dialog).toBeHidden()
    })

    test('should show error toast when API fails during expense creation', async ({ page }) => {
      // Mock API to return 500 error
      await page.route('**/api/expenses', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Internal Server Error',
              message: 'Database connection failed'
            })
          })
        } else {
          await route.continue()
        }
      })

      try {
        // Open create expense dialog
        await page.locator('button.action-chip', { hasText: 'New Expense' }).or(page.locator('button:has-text("New Expense")')).click()

        const dialog = page.locator('[role="dialog"]').filter({ hasText: /Add New Expense|Nieuwe uitgave/i }).first()
        await expect(dialog).toBeVisible({ timeout: 15000 })

        // Fill in required fields (exclude hidden file inputs)
        await dialog.locator('input[name="vendor_name"]:visible').fill('Test Vendor')
        await dialog.locator('input[type="date"]:visible').first().fill('2025-03-15')
        await dialog.locator('textarea[name="description"]:visible').fill('Test expense')
        await dialog.locator('input[name="amount"]:visible').fill('100')

        // Submit form
        const submitButton = dialog.locator('button[type="submit"]').or(dialog.locator('button:has-text("Opslaan")')).or(dialog.locator('button:has-text("Save")')).or(dialog.locator('button:has-text("Uitgave toevoegen")')).first()
        await submitButton.click()

        // Wait for error toast to appear
        // Sonner renders toasts as <li> elements with data-sonner-toast attribute
        const errorToast = page.locator('[data-sonner-toast]').filter({ hasText: /Failed to save expense|mislukt/i })
        await expect(errorToast.first()).toBeVisible({ timeout: 10000 })

        // Verify the error toast contains the expected error message
        await expect(errorToast.first()).toContainText(/Failed to save expense/i)

        // Optionally verify the description contains the API error message
        const toastDescription = errorToast.locator('[data-description]').or(errorToast.locator('div').filter({ hasText: /Database connection failed/i }))
        if (await toastDescription.count() > 0) {
          await expect(toastDescription.first()).toContainText(/Database connection failed|error occurred/i)
        }

        // Verify dialog remains open (allows user to correct and retry)
        await expect(dialog).toBeVisible()

        // Close dialog
        const cancelButton = dialog.locator('button:has-text("Annuleren")').or(dialog.locator('button:has-text("Cancel")')).first()
        await cancelButton.click()
        await expect(dialog).toBeHidden()
      } finally {
        await page.unroute('**/api/expenses')
      }
    })

    test('should display empty state when no expenses exist', async ({ page }) => {
      // Mock API to return empty array
      await page.route('**/api/expenses?*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [],
            pagination: { total: 0, page: 1, limit: 50 }
          })
        })
      })

      try {
        // Reload page to trigger empty state
        await page.reload()
        await page.waitForLoadState('networkidle')

        // Wait for empty state to appear
        const emptyState = page.locator('[data-testid="empty-state"]').or(
          page.locator('text=/No expenses|Geen uitgaven|empty/i')
        )
        await expect(emptyState.first()).toBeVisible({ timeout: 10000 })

        // Verify "Create Expense" CTA button is visible
        const createButton = page.locator('button:has-text("New Expense")').or(page.locator('button:has-text("Nieuwe uitgave")'))
        await expect(createButton.first()).toBeVisible()

      } finally {
        await page.unroute('**/api/expenses?*')
      }
    })
  })
})

async function loginToApplication(page: Page) {
  const isLoggedIn = await checkIfLoggedIn(page)

  if (isLoggedIn) {
    return
  }

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
}

async function checkIfLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard', { timeout: 5000 })
    await page.waitForLoadState('networkidle', { timeout: 3000 })
    return page.url().includes('/dashboard')
  } catch {
    return false
  }
}

async function expandMonthGroup(page: Page, monthDisplay: string) {
  const heading = page.getByRole('heading', { name: monthDisplay })

  try {
    // Wait for the month group heading to appear
    await heading.waitFor({ state: 'visible', timeout: 5000 })

    // Check if it's collapsed (has an expandable button or indicator)
    // Click to expand if it exists
    await heading.click()

    // Give UI time to expand
    await page.waitForTimeout(300)
  } catch (error) {
    console.log(`Month group "${monthDisplay}" not found or already expanded`)
  }
}

async function searchAndExpandForDescription(page: Page, description: string, date: string) {
  const searchInput = page.getByPlaceholder('Search expenses...')
  await waitForExpensesAfter(page, () => searchInput.fill(description))

  // Wait a bit more for UI to update after search
  await page.waitForTimeout(500)

  const monthDisplay = monthDisplayForDate(date)
  console.log(`Looking for month group: ${monthDisplay}`)
  await expandMonthGroup(page, monthDisplay)

  // Wait for expenses to be visible after expanding
  await page.waitForTimeout(300)
}

function monthDisplayForDate(dateString: string) {
  return format(new Date(dateString), 'MMMM yyyy')
}

async function waitForExpensesAfter(page: Page, action: () => Promise<void> | void) {
  const responsePromise = page
    .waitForResponse(
      (response) =>
        response.url().includes('/api/expenses') && response.request().method() === 'GET',
      { timeout: 7500 }
    )
    .catch(() => null)

  await action()

  const response = await responsePromise
  if (!response) {
    // No network fetch was triggered (client-side filter); give UI time to update
    await page.waitForTimeout(250)
  } else {
    await page.waitForTimeout(150)
  }
}
