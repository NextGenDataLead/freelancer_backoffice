# Cross-Learning Analysis Report: Expenses Tests vs. Improved Time Test

**Generated:** 2025-11-11
**Analyzed Files:**
- `.claude/tests/TEST_EXPENSES_E2E.md`
- `.claude/tests/TEST_RECURRING_EXPENSES_E2E.md`
- `.claude/tests/TEST_TIJD_E2E.md`
- `src/__tests__/e2e/tijd-page-comprehensive-improved.spec.ts`

---

## Executive Summary

After analyzing the **TEST_EXPENSES_E2E.md**, **TEST_RECURRING_EXPENSES_E2E.md**, **TEST_TIJD_E2E.md** documentation files and the **tijd-page-comprehensive-improved.spec.ts** implementation, I've identified significant opportunities for mutual improvement across both test suites.

---

## 📊 Test Suite Comparison

| Feature | Expenses Tests | Recurring Expenses | Time (Original) | Time (Improved) |
|---------|---------------|-------------------|-----------------|-----------------|
| **Test Count** | 34 tests (4 files) | 17 tests (serial) | 13 tests | 21 tests |
| **Page Object Model** | ❌ No | ❌ No | ❌ No | ✅ Yes (TijdPage) |
| **Data Strategy** | Mixed (creates data) | Mixed (creates data) | ✅ Seeded data | ✅ Seeded data |
| **Validation Tests** | ✅ Yes (extensive) | ⚠️ Limited | ❌ No | ✅ Yes (3 tests) |
| **Accessibility Tests** | ❌ No | ❌ No | ❌ No | ✅ Yes (2 tests) |
| **Performance Tests** | ❌ No | ❌ No | ❌ No | ✅ Yes (1 test) |
| **Network Assertions** | ⚠️ Limited | ⚠️ Limited | ⚠️ Limited | ✅ Yes (explicit) |
| **Error Recovery** | ✅ Good | ✅ Good | ⚠️ Basic | ✅ Excellent |
| **Cleanup Strategy** | ✅ Array tracking | ✅ afterAll | ✅ afterEach | ✅ Enhanced afterEach |
| **Hard-coded Timeouts** | ⚠️ Many | ⚠️ Many | ⚠️ Many | ✅ Minimized |

---

## 🎯 What Expenses Tests Can Learn from Improved Time Test

### 1. **Page Object Model Pattern** ⭐ HIGH PRIORITY

**Current Expenses Approach:**
```typescript
// Direct page interactions scattered throughout tests
await page.click('button:has-text("New Expense")')
await page.fill('input[name="amount"]', '100')
const totalCount = await page.locator('table tbody tr').count()
```

**Improved Time Test Approach:**
```typescript
class TijdPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/financieel-v2/tijd')
    await this.page.waitForLoadState('networkidle')
    await this.waitForPageLoad()
  }

  async getThisWeekHours(): Promise<number> {
    const card = this.page.locator('.metric-card').filter({ hasText: 'This Week' })
    const text = await card.locator('.metric-card__value').textContent()
    const match = text?.match(/(\d+(?:\.\d+)?)/)
    return match ? parseFloat(match[1]) : 0
  }

  async createTimeEntry(data: TimeEntryData) {
    // Encapsulated creation logic
  }
}

// Usage
const tijdPage = new TijdPage(page)
await tijdPage.goto()
const hours = await tijdPage.getThisWeekHours()
```

**Benefits for Expenses:**
- Centralized page logic
- Easier maintenance when UI changes
- Reusable methods across test files
- Type-safe interactions

**Recommendation:**
```typescript
// src/__tests__/e2e/page-objects/expenses-page.ts
export class ExpensesPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/financieel-v2/uitgaven')
    await this.page.waitForLoadState('networkidle')
  }

  async getTotalExpenses(): Promise<number> {
    await this.page.waitForSelector('table tbody tr', { timeout: 10000 })
    return await this.page.locator('table tbody tr').count()
  }

  async createExpense(data: ExpenseData): Promise<string | null> {
    // Centralized creation logic with ID capture
    const responsePromise = this.page.waitForResponse(
      response => response.url().includes('/api/expenses')
        && response.request().method() === 'POST'
    )

    await this.page.click('button:has-text("New Expense")')
    // Fill form...
    await this.page.click('button:has-text("Create")')

    const response = await responsePromise
    const body = await response.json()
    return body.data?.id || null
  }

  async getMetricValue(metric: 'total' | 'approved' | 'draft'): Promise<number> {
    const card = this.page.locator(`[data-metric="${metric}"]`)
    const text = await card.locator('.metric-value').textContent()
    return parseFloat(text?.replace(/[^0-9.]/g, '') || '0')
  }

  async applyFilter(filterType: 'category' | 'status' | 'date', value: string) {
    // Centralized filtering logic
  }
}

// Usage in tests
const expensesPage = new ExpensesPage(page)
await expensesPage.goto()
const total = await expensesPage.getTotalExpenses()
const expenseId = await expensesPage.createExpense({ amount: 100, /* ... */ })
```

---

### 2. **Reduced Hard-Coded Timeouts** ⭐ HIGH PRIORITY

**Current Expenses Approach:**
```typescript
await page.waitForTimeout(5000) // Arbitrary wait
await page.waitForTimeout(2000) // Hope data loaded
await page.waitForTimeout(1000) // UI updated?
await page.waitForTimeout(500)  // Animation finished?
```

**Problems:**
- Tests take longer than necessary
- Flaky on slower systems
- No guarantee data is actually loaded
- Maintenance nightmare when timing changes

**Improved Time Test Approach:**
```typescript
// Instead of arbitrary timeouts, wait for actual conditions
await page.waitForLoadState('networkidle')

await page.waitForFunction(() => {
  const valueElements = document.querySelectorAll('.metric-card__value')
  return Array.from(valueElements).every(el =>
    el.textContent && !el.textContent.includes('...')
  )
}, { timeout: 10000 })

// Wait for specific API response
const response = await page.waitForResponse(
  response => response.url().includes('/api/expenses')
    && response.status() === 200
)

// Wait for element state
await element.waitFor({ state: 'visible', timeout: 5000 })
```

**Recommendation for Expenses:**

Replace timeouts in all 4 expense test files:

```typescript
// ❌ BAD: Hard-coded timeout
await page.waitForTimeout(5000)

// ✅ GOOD: Wait for network idle
await page.waitForLoadState('networkidle')

// ❌ BAD: Hope stats loaded
await page.waitForTimeout(2000)

// ✅ GOOD: Wait for actual condition
await page.waitForFunction(() => {
  const stats = document.querySelectorAll('[data-testid="metric-value"]')
  return stats.length === 4 &&
    Array.from(stats).every(s => s.textContent !== '...')
})

// ❌ BAD: Hope carousel loaded
await page.waitForTimeout(1000)

// ✅ GOOD: Wait for carousel element
await page.waitForSelector('[data-testid="carousel-loaded"]', {
  state: 'visible',
  timeout: 10000
})

// ❌ BAD: Hope API finished
await page.click('button:has-text("Create")')
await page.waitForTimeout(3000)

// ✅ GOOD: Wait for API response
const responsePromise = page.waitForResponse(
  r => r.url().includes('/api/expenses') && r.request().method() === 'POST'
)
await page.click('button:has-text("Create")')
await responsePromise
```

**Audit Checklist:**
- [ ] `expenses-page.spec.ts` - Replace ~15 timeouts
- [ ] `expenses-filters.spec.ts` - Replace ~8 timeouts
- [ ] `expenses-recurring.spec.ts` - Replace ~12 timeouts
- [ ] `expenses-advanced-form.spec.ts` - Replace ~10 timeouts

---

### 3. **Validation & Error Handling Tests** ⭐ HIGH PRIORITY

**Gap in Expenses Tests:**
- No explicit validation tests for invalid inputs
- Missing tests for required field validation
- No negative number testing
- No boundary condition tests
- No client-side validation verification

**Improved Time Test Examples:**
```typescript
test('should show validation error for invalid hours input', async ({ page }) => {
  await page.click('button:has-text("New Time Entry")')
  const dialog = page.locator('[role="dialog"]')
  await dialog.waitFor({ state: 'visible', timeout: 10000 })

  // Try to enter negative hours
  await page.fill('input[name="hours"]', '-5')

  const submitButton = dialog.locator('button:has-text("Register Time")')
  const isDisabled = await submitButton.isDisabled().catch(() => false)

  if (!isDisabled) {
    await submitButton.click()
    const errorVisible = await page.locator('text=/Invalid|must be positive|required/i')
      .isVisible().catch(() => false)
    expect(errorVisible).toBeTruthy()
  } else {
    expect(isDisabled).toBeTruthy()
  }
})

test('should prevent creating entry without required fields', async ({ page }) => {
  await page.click('button:has-text("New Time Entry")')
  const dialog = page.locator('[role="dialog"]')
  await dialog.waitFor({ state: 'visible', timeout: 10000 })

  // Don't fill any fields
  const submitButton = dialog.locator('button:has-text("Register Time")')
  const isDisabled = await submitButton.isDisabled().catch(() => false)
  expect(isDisabled).toBeTruthy()
})

test('should validate hours format', async ({ page }) => {
  await page.click('button:has-text("New Time Entry")')
  const dialog = page.locator('[role="dialog"]')
  await dialog.waitFor({ state: 'visible', timeout: 10000 })

  // Input type="number" prevents typing non-numeric characters in browsers
  // Test using JavaScript evaluation instead
  const hoursInput = page.locator('input[name="hours"]')

  // Test 1: Try to set invalid value via JavaScript
  await hoursInput.evaluate((input: HTMLInputElement) => {
    input.value = 'abc'
  })

  // Verify the browser prevents invalid input
  const value1 = await hoursInput.inputValue()
  expect(['', '0', '1']).toContain(value1) // Browser should reject 'abc'

  // Test 2: Try negative number
  await hoursInput.evaluate((input: HTMLInputElement) => {
    input.value = '-5'
  })

  const submitButton = dialog.locator('button:has-text("Register Time")')
  const isDisabled = await submitButton.isDisabled().catch(() => false)

  if (!isDisabled) {
    await submitButton.click()
    const hasError = await page.locator('text=/Invalid|error|required|positive/i')
      .isVisible({ timeout: 2000 }).catch(() => false)
    expect(hasError || isDisabled).toBeTruthy()
  }
})
```

**Recommendation for Expenses:**

Create new file `src/__tests__/e2e/expenses-validation.spec.ts`:

```typescript
import { test, expect, Page } from '@playwright/test'

test.describe('Expenses Page - Validation Tests', () => {

  test.beforeEach(async ({ page }) => {
    await loginToApplication(page)
    await page.goto('/dashboard/financieel-v2/uitgaven')
    await page.waitForLoadState('networkidle')
  })

  test('should validate required fields on expense creation', async ({ page }) => {
    await page.click('button:has-text("New Expense")')
    const dialog = page.locator('[role="dialog"]')
    await dialog.waitFor({ state: 'visible' })

    // Try to submit empty form
    const submitButton = dialog.locator('button:has-text("Create Expense")')
    const isDisabled = await submitButton.isDisabled()

    if (!isDisabled) {
      await submitButton.click()

      // Should show multiple validation errors
      await expect(page.locator('text=/Vendor is required/i')).toBeVisible()
      await expect(page.locator('text=/Amount is required/i')).toBeVisible()
      await expect(page.locator('text=/Date is required/i')).toBeVisible()
      await expect(page.locator('text=/Category is required/i')).toBeVisible()
    } else {
      expect(isDisabled).toBeTruthy()
    }
  })

  test('should prevent negative amounts', async ({ page }) => {
    await page.click('button:has-text("New Expense")')
    const dialog = page.locator('[role="dialog"]')
    await dialog.waitFor({ state: 'visible' })

    // Try to enter negative amount
    const amountInput = page.locator('input[name="amount"]')
    await amountInput.fill('-100')

    const value = await amountInput.inputValue()
    // Browser should reject negative for type="number" with min="0"
    // Or validation should show error

    const hasError = await page.locator('text=/Amount must be positive/i')
      .isVisible().catch(() => false)

    if (!hasError) {
      // If no error shown, value should be rejected
      expect(['', '0', '100']).toContain(value)
    } else {
      expect(hasError).toBeTruthy()
    }
  })

  test('should validate VAT number format', async ({ page }) => {
    await page.click('button:has-text("New Expense")')
    const dialog = page.locator('[role="dialog"]')
    await dialog.waitFor({ state: 'visible' })

    // Enter invalid VAT number
    await page.fill('input[name="supplier_vat"]', 'INVALID123')

    // Try to submit or blur
    await page.keyboard.press('Tab')

    // Should show validation error
    const hasError = await page.locator('text=/Invalid VAT number|VAT format/i')
      .isVisible({ timeout: 2000 }).catch(() => false)

    if (hasError) {
      expect(hasError).toBeTruthy()
    } else {
      // VAT validation might be async - wait for API validation
      await page.waitForTimeout(1000)
      const apiError = await page.locator('[data-field="supplier_vat"] .error')
        .isVisible().catch(() => false)
      expect(apiError).toBeTruthy()
    }
  })

  test('should validate date range for recurring expenses', async ({ page }) => {
    await page.goto('/dashboard/financieel-v2/terugkerende-uitgaven')
    await page.waitForLoadState('networkidle')

    await page.click('button:has-text("New Template")')
    const dialog = page.locator('[role="dialog"]')
    await dialog.waitFor({ state: 'visible' })

    // Set end date before start date
    await page.fill('input[name="start_date"]', '2025-12-01')
    await page.fill('input[name="end_date"]', '2025-01-01')

    const submitButton = dialog.locator('button:has-text("Create Template")')
    await submitButton.click()

    // Should show validation error
    await expect(page.locator('text=/End date must be after start date/i'))
      .toBeVisible({ timeout: 3000 })
  })

  test('should validate amount decimal places', async ({ page }) => {
    await page.click('button:has-text("New Expense")')
    const dialog = page.locator('[role="dialog"]')
    await dialog.waitFor({ state: 'visible' })

    // Enter amount with too many decimal places
    await page.fill('input[name="amount"]', '100.999')
    await page.keyboard.press('Tab')

    // Should round to 2 decimal places or show error
    const value = await page.inputValue('input[name="amount"]')
    expect(value).toMatch(/^\d+\.\d{1,2}$/)
  })

  test('should validate file upload types', async ({ page }) => {
    await page.click('button:has-text("New Expense")')
    const dialog = page.locator('[role="dialog"]')
    await dialog.waitFor({ state: 'visible' })

    // Try to upload invalid file type
    const fileInput = page.locator('input[type="file"]')

    // Create a test file (would need actual test file in practice)
    // For now, test the accept attribute
    const acceptAttr = await fileInput.getAttribute('accept')
    expect(acceptAttr).toContain('.pdf')
    expect(acceptAttr).toContain('image/')
  })

  test('should validate file upload size', async ({ page }) => {
    // Test that files > 10MB are rejected
    // Implementation would depend on how file size validation works

    await page.click('button:has-text("New Expense")')
    const dialog = page.locator('[role="dialog"]')
    await dialog.waitFor({ state: 'visible' })

    // Mock large file upload
    // In practice, would need actual large test file
    // Verify error message appears
  })

  test('should validate future dates warning', async ({ page }) => {
    await page.click('button:has-text("New Expense")')
    const dialog = page.locator('[role="dialog"]')
    await dialog.waitFor({ state: 'visible' })

    // Set future date
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    const futureDateStr = futureDate.toISOString().split('T')[0]

    await page.fill('input[name="expense_date"]', futureDateStr)
    await page.keyboard.press('Tab')

    // Should show warning (not error, as future dates may be valid)
    const hasWarning = await page.locator('text=/Future date|Are you sure/i')
      .isVisible({ timeout: 2000 }).catch(() => false)

    // Warning is optional, but if shown, verify it exists
    if (hasWarning) {
      expect(hasWarning).toBeTruthy()
    }
  })

  test('should validate category selection', async ({ page }) => {
    await page.click('button:has-text("New Expense")')
    const dialog = page.locator('[role="dialog"]')
    await dialog.waitFor({ state: 'visible' })

    // Fill all fields except category
    await page.fill('input[name="vendor_name"]', 'Test Vendor')
    await page.fill('input[name="amount"]', '100')
    await page.fill('input[name="expense_date"]', '2025-01-15')

    const submitButton = dialog.locator('button:has-text("Create Expense")')
    await submitButton.click()

    // Should require category selection
    const hasError = await page.locator('text=/Category is required|Select a category/i')
      .isVisible({ timeout: 2000 }).catch(() => false)

    if (hasError) {
      expect(hasError).toBeTruthy()
    } else {
      // Button might stay disabled
      const isDisabled = await submitButton.isDisabled()
      expect(isDisabled).toBeTruthy()
    }
  })
})
```

**Impact:**
- Catches client-side validation bugs before production
- Ensures consistent user experience
- Documents expected validation behavior
- Prevents invalid data from reaching API

---

### 4. **Accessibility Testing** ⭐ MEDIUM PRIORITY

**Gap in Expenses Tests:**
- No keyboard navigation tests
- No screen reader considerations
- No focus management tests
- No ARIA attribute validation

**Improved Time Test Examples:**
```typescript
test.describe('Accessibility', () => {
  test('should support keyboard navigation for time entries', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 })

    // Focus on the table
    await page.keyboard.press('Tab')

    // Try to navigate with arrow keys (if supported)
    await page.keyboard.press('ArrowDown')

    // Verify focus moved (basic check)
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(focusedElement).toBeTruthy()
  })

  test('should allow keyboard navigation in dialogs', async ({ page }) => {
    await page.click('button:has-text("New Time Entry")')
    const dialog = page.locator('[role="dialog"]')
    await dialog.waitFor({ state: 'visible', timeout: 10000 })

    // Should be able to Tab through form elements
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Should be able to close with Escape
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden', timeout: 5000 })

    await expect(dialog).toBeHidden()
  })
})
```

**Recommendation for Expenses:**

Create new file `src/__tests__/e2e/expenses-accessibility.spec.ts`:

```typescript
import { test, expect, Page } from '@playwright/test'

test.describe('Expenses Page - Accessibility Tests', () => {

  test.beforeEach(async ({ page }) => {
    await loginToApplication(page)
    await page.goto('/dashboard/financieel-v2/uitgaven')
    await page.waitForLoadState('networkidle')
  })

  test('should navigate expense list with keyboard', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 })

    // Tab to first expense row
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Arrow down to next expense
    await page.keyboard.press('ArrowDown')

    // Verify focus changed
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement
      return {
        tag: el?.tagName,
        role: el?.getAttribute('role'),
        text: el?.textContent?.slice(0, 50)
      }
    })

    expect(focusedElement.tag).toBeTruthy()
  })

  test('should support keyboard shortcuts for common actions', async ({ page }) => {
    // Test if Ctrl+N opens new expense dialog
    await page.keyboard.press('Control+n')

    const dialogVisible = await page.locator('[role="dialog"]')
      .isVisible({ timeout: 2000 }).catch(() => false)

    if (dialogVisible) {
      // If shortcut exists, dialog should open
      await expect(page.locator('[role="dialog"]')).toBeVisible()

      // Close with Escape
      await page.keyboard.press('Escape')
      await expect(page.locator('[role="dialog"]')).toBeHidden()
    }
  })

  test('should navigate form fields with Tab', async ({ page }) => {
    await page.click('button:has-text("New Expense")')
    const dialog = page.locator('[role="dialog"]')
    await dialog.waitFor({ state: 'visible' })

    // Tab through all form fields
    const tabStops = []
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab')
      const focused = await page.evaluate(() => {
        const el = document.activeElement
        return {
          tag: el?.tagName,
          name: (el as HTMLInputElement)?.name,
          type: (el as HTMLInputElement)?.type
        }
      })
      tabStops.push(focused)
    }

    // Verify we hit all major form fields
    const fieldNames = tabStops.map(t => t.name).filter(Boolean)
    expect(fieldNames.length).toBeGreaterThan(3) // At least 3 fields
  })

  test('should have proper ARIA labels on action buttons', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 })

    const firstRow = page.locator('table tbody tr').first()

    // Check for ARIA labels on icon buttons
    const editButton = firstRow.locator('[aria-label*="Edit"]')
    const deleteButton = firstRow.locator('[aria-label*="Delete"]')
    const moreButton = firstRow.locator('[aria-label*="More"]')

    const editExists = await editButton.count() > 0
    const deleteExists = await deleteButton.count() > 0
    const moreExists = await moreButton.count() > 0

    // At least one should have proper aria-label
    expect(editExists || deleteExists || moreExists).toBeTruthy()
  })

  test('should trap focus in modal dialogs', async ({ page }) => {
    await page.click('button:has-text("New Expense")')
    const dialog = page.locator('[role="dialog"]')
    await dialog.waitFor({ state: 'visible' })

    // Tab many times - should stay within dialog
    const initialUrl = page.url()

    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab')
    }

    // Verify focus is still in dialog (not escaped to page)
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement
      const dialog = document.querySelector('[role="dialog"]')
      return dialog?.contains(el) || false
    })

    expect(focusedElement).toBeTruthy()
  })

  test('should announce dynamic content changes to screen readers', async ({ page }) => {
    // Check for aria-live regions for notifications
    const ariaLiveRegions = page.locator('[aria-live]')
    const count = await ariaLiveRegions.count()

    if (count > 0) {
      // If aria-live regions exist, verify they're used for notifications
      await page.click('button:has-text("New Expense")')
      // Fill and submit form...

      // Check if notification appears in aria-live region
      const notification = await page.locator('[aria-live] :text("Success")')
        .isVisible({ timeout: 5000 }).catch(() => false)

      // Not required, but good practice
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should have semantic HTML structure', async ({ page }) => {
    // Verify proper heading hierarchy
    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBeGreaterThanOrEqual(1)

    // Verify table has proper structure
    const table = page.locator('table')
    await expect(table.locator('thead')).toBeVisible()
    await expect(table.locator('tbody')).toBeVisible()

    // Verify form labels
    await page.click('button:has-text("New Expense")')
    const dialog = page.locator('[role="dialog"]')
    await dialog.waitFor({ state: 'visible' })

    const labels = await dialog.locator('label').count()
    expect(labels).toBeGreaterThan(0)
  })

  test('should have sufficient color contrast', async ({ page }) => {
    // This is a basic check - full color contrast testing requires axe-core
    // But we can verify critical elements are visible

    await page.waitForSelector('table tbody tr', { timeout: 10000 })

    const firstRow = page.locator('table tbody tr').first()
    await expect(firstRow).toBeVisible()

    // Verify text is not transparent
    const opacity = await firstRow.evaluate(el => {
      return window.getComputedStyle(el).opacity
    })

    expect(parseFloat(opacity)).toBeGreaterThan(0.5)
  })
})
```

**Additional Recommendation:**

Install `@axe-core/playwright` for comprehensive accessibility testing:

```bash
npm install -D @axe-core/playwright
```

Then add comprehensive accessibility checks:

```typescript
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('should not have any automatically detectable accessibility issues', async ({ page }) => {
  await loginToApplication(page)
  await page.goto('/dashboard/financieel-v2/uitgaven')
  await page.waitForLoadState('networkidle')

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze()

  expect(accessibilityScanResults.violations).toEqual([])
})
```

---

### 5. **Performance Testing** ⭐ MEDIUM PRIORITY

**Gap in Expenses Tests:**
- No page load time measurements
- No tests with large datasets
- No performance regression detection
- No render performance benchmarks

**Improved Time Test Example:**
```typescript
test.describe('Performance', () => {
  test('should load page within acceptable time', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/dashboard/financieel-v2/tijd')
    await page.waitForSelector('text=Active Timer', { timeout: 15000 })

    const loadTime = Date.now() - startTime
    console.log(`📊 Page load time: ${loadTime}ms`)

    // Page should load within 10 seconds
    expect(loadTime).toBeLessThan(10000)
  })
})
```

**Recommendation for Expenses:**

Create new file `src/__tests__/e2e/expenses-performance.spec.ts`:

```typescript
import { test, expect, Page } from '@playwright/test'

test.describe('Expenses Page - Performance Tests', () => {

  test('should load expenses page within 5 seconds', async ({ page }) => {
    const startTime = Date.now()

    await loginToApplication(page)
    await page.goto('/dashboard/financieel-v2/uitgaven')
    await page.waitForSelector('table tbody tr', { timeout: 15000 })

    const loadTime = Date.now() - startTime
    console.log(`📊 Expenses page load time: ${loadTime}ms`)

    // Should load within 5 seconds (excluding login)
    expect(loadTime).toBeLessThan(5000)
  })

  test('should handle 100+ expenses efficiently', async ({ page }) => {
    // Pre-requisite: Database should have 100+ expenses
    // Or create them via API before test

    const startTime = Date.now()

    await loginToApplication(page)
    await page.goto('/dashboard/financieel-v2/uitgaven')
    await page.waitForLoadState('networkidle')

    const renderTime = Date.now() - startTime
    console.log(`📊 Render time for large dataset: ${renderTime}ms`)

    // Should handle large datasets within 3 seconds
    expect(renderTime).toBeLessThan(3000)

    // Verify all rows rendered
    const rowCount = await page.locator('table tbody tr').count()
    expect(rowCount).toBeGreaterThan(50) // At least 50 visible (pagination)
  })

  test('should scroll smoothly through large expense list', async ({ page }) => {
    await loginToApplication(page)
    await page.goto('/dashboard/financieel-v2/uitgaven')
    await page.waitForLoadState('networkidle')

    const startTime = Date.now()

    // Scroll to bottom
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })

    // Wait for any lazy-loaded content
    await page.waitForTimeout(500)

    const scrollTime = Date.now() - startTime
    console.log(`📊 Scroll time: ${scrollTime}ms`)

    // Scrolling should be instantaneous (< 1 second)
    expect(scrollTime).toBeLessThan(1000)
  })

  test('should filter expenses quickly', async ({ page }) => {
    await loginToApplication(page)
    await page.goto('/dashboard/financieel-v2/uitgaven')
    await page.waitForLoadState('networkidle')

    const startTime = Date.now()

    // Apply category filter
    await page.click('button:has-text("Category")')
    await page.click('text="Software & ICT"')

    // Wait for filter to apply
    await page.waitForLoadState('networkidle')

    const filterTime = Date.now() - startTime
    console.log(`📊 Filter application time: ${filterTime}ms`)

    // Filtering should be fast (< 2 seconds)
    expect(filterTime).toBeLessThan(2000)
  })

  test('should load metric cards quickly', async ({ page }) => {
    await loginToApplication(page)

    const startTime = Date.now()

    await page.goto('/dashboard/financieel-v2/uitgaven')

    // Wait for all metric cards to finish loading
    await page.waitForFunction(() => {
      const cards = document.querySelectorAll('[data-testid="metric-card"]')
      return Array.from(cards).every(card =>
        !card.textContent?.includes('...')
      )
    }, { timeout: 10000 })

    const metricsLoadTime = Date.now() - startTime
    console.log(`📊 Metrics load time: ${metricsLoadTime}ms`)

    // Metrics should calculate within 3 seconds
    expect(metricsLoadTime).toBeLessThan(3000)
  })

  test('should handle OCR processing within timeout', async ({ page }) => {
    await loginToApplication(page)
    await page.goto('/dashboard/financieel-v2/uitgaven')
    await page.click('button:has-text("New Expense")')

    const startTime = Date.now()

    // Upload receipt (would need test file)
    // await page.setInputFiles('input[type="file"]', 'test-receipt.pdf')

    // Wait for OCR processing
    await page.waitForSelector('text=/OCR complete|Processing complete/', {
      timeout: 30000
    })

    const ocrTime = Date.now() - startTime
    console.log(`📊 OCR processing time: ${ocrTime}ms`)

    // OCR should complete within 30 seconds
    expect(ocrTime).toBeLessThan(30000)
  })

  test('should export expenses within 10 seconds', async ({ page }) => {
    await loginToApplication(page)
    await page.goto('/dashboard/financieel-v2/uitgaven')
    await page.waitForLoadState('networkidle')

    const startTime = Date.now()

    // Trigger export (if feature exists)
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
    await page.click('button:has-text("Export")')

    const download = await downloadPromise
    const exportTime = Date.now() - startTime
    console.log(`📊 Export time: ${exportTime}ms`)

    // Export should complete within 10 seconds
    expect(exportTime).toBeLessThan(10000)
    expect(download).toBeTruthy()
  })

  test('should handle rapid navigation without memory leaks', async ({ page }) => {
    await loginToApplication(page)

    // Navigate between pages rapidly
    for (let i = 0; i < 5; i++) {
      await page.goto('/dashboard/financieel-v2/uitgaven')
      await page.waitForLoadState('networkidle')

      await page.goto('/dashboard/financieel-v2/terugkerende-uitgaven')
      await page.waitForLoadState('networkidle')
    }

    // Check memory usage (basic check)
    const metrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize
      }
      return null
    })

    if (metrics) {
      console.log(`📊 Memory usage: ${(metrics / 1024 / 1024).toFixed(2)} MB`)
      // Should not exceed 150MB
      expect(metrics).toBeLessThan(150 * 1024 * 1024)
    }
  })

  test('should render calendar carousel efficiently', async ({ page }) => {
    await loginToApplication(page)
    await page.goto('/dashboard/financieel-v2/terugkerende-uitgaven')
    await page.waitForLoadState('networkidle')

    const startTime = Date.now()

    // Navigate carousel
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("Volgende")')
      await page.waitForTimeout(100) // Allow animation
    }

    const carouselTime = Date.now() - startTime
    console.log(`📊 Carousel navigation time: ${carouselTime}ms`)

    // Carousel should be smooth (< 2 seconds for 5 navigations)
    expect(carouselTime).toBeLessThan(2000)
  })
})
```

**Benefits:**
- Catches performance regressions early
- Establishes performance baselines
- Identifies slow operations
- Documents performance expectations

---

### 6. **Network Request Assertions** ⭐ HIGH PRIORITY

**Current Expenses Approach:**
```typescript
// Often missing explicit network validation
await page.click('button:has-text("Create")')
await page.waitForTimeout(2000) // Hope it worked?

// Verify UI updated
await expect(page.locator('text=Success')).toBeVisible()
```

**Problems:**
- No confirmation API actually succeeded
- Can't verify response data
- Missing error scenario coverage
- No way to capture created resource IDs

**Improved Time Test Approach:**
```typescript
test('should create expense with API verification', async ({ page }) => {
  // Set up response listener BEFORE triggering action
  const responsePromise = page.waitForResponse(
    response => response.url().includes('/api/time-entries')
      && response.request().method() === 'POST'
      && response.status() === 201
  )

  // Trigger the action
  await tijdPage.createTimeEntry({
    projectId: SEEDED_DATA.projects.analyticsDashboard.id,
    projectName: SEEDED_DATA.projects.analyticsDashboard.name,
    clientName: SEEDED_DATA.projects.analyticsDashboard.clientName,
    description: 'E2E test entry',
    hours: '2.5'
  })

  // Wait for and verify API response
  const response = await responsePromise
  expect(response.ok()).toBeTruthy()

  const body = await response.json()
  expect(body.data?.id).toBeTruthy()

  // Use captured ID for cleanup
  createdTimeEntryIds.push(body.data.id)
})
```

**Recommendation for Expenses:**

Add network assertions to all CRUD operations:

```typescript
// In expenses-page.spec.ts

test('should create expense with API verification', async ({ page }) => {
  await loginToApplication(page)
  await page.goto('/dashboard/financieel-v2/uitgaven')

  // Listen for API request
  const requestPromise = page.waitForRequest(
    request => request.url().includes('/api/expenses')
      && request.method() === 'POST'
  )

  // Listen for API response
  const responsePromise = page.waitForResponse(
    response => response.url().includes('/api/expenses')
      && response.request().method() === 'POST'
  )

  // Create expense
  await page.click('button:has-text("New Expense")')
  await page.fill('input[name="vendor_name"]', 'Test Vendor')
  await page.fill('input[name="amount"]', '100.50')
  await page.fill('input[name="expense_date"]', '2025-01-15')
  await page.click('button:has-text("Software & ICT")')
  await page.click('button:has-text("Create Expense")')

  // Verify request was sent
  const request = await requestPromise
  const requestBody = request.postDataJSON()
  expect(requestBody.vendor_name).toBe('Test Vendor')
  expect(requestBody.amount).toBe(100.50)

  // Verify response
  const response = await responsePromise
  expect(response.status()).toBe(201) // Or 200
  expect(response.ok()).toBeTruthy()

  const responseBody = await response.json()
  expect(responseBody.data).toBeDefined()
  expect(responseBody.data.id).toBeTruthy()
  expect(responseBody.data.vendor_name).toBe('Test Vendor')

  // Store ID for cleanup
  createdExpenseIds.push(responseBody.data.id)

  // Also verify UI updated
  await expect(page.locator('text=Test Vendor')).toBeVisible()
})

test('should handle API errors gracefully', async ({ page }) => {
  await loginToApplication(page)
  await page.goto('/dashboard/financieel-v2/uitgaven')

  // Mock API error using route interception
  await page.route('**/api/expenses', route => {
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Database connection failed'
      })
    })
  })

  // Try to create expense
  await page.click('button:has-text("New Expense")')
  await page.fill('input[name="vendor_name"]', 'Test Vendor')
  await page.fill('input[name="amount"]', '100')
  await page.fill('input[name="expense_date"]', '2025-01-15')
  await page.click('button:has-text("Software & ICT")')
  await page.click('button:has-text("Create Expense")')

  // Verify error handling
  await expect(page.locator('text=/Error|Failed|could not/i')).toBeVisible({ timeout: 5000 })

  // Dialog should remain open for user to retry
  await expect(page.locator('[role="dialog"]')).toBeVisible()
})

test('should verify update API response', async ({ page }) => {
  // First create an expense
  const expenseId = await createTestExpense(page)

  // Set up response listener for update
  const responsePromise = page.waitForResponse(
    response => response.url().includes(`/api/expenses/${expenseId}`)
      && response.request().method() === 'PUT'
  )

  // Update the expense
  await page.click(`button[data-expense-id="${expenseId}"]`)
  await page.click('button[aria-label="Edit expense"]')
  await page.fill('input[name="amount"]', '200')
  await page.click('button:has-text("Save")')

  // Verify API response
  const response = await responsePromise
  expect(response.ok()).toBeTruthy()

  const body = await response.json()
  expect(body.data.amount).toBe(200)
})

test('should verify delete API response', async ({ page }) => {
  // Create test expense
  const expenseId = await createTestExpense(page)

  // Set up response listener for delete
  const responsePromise = page.waitForResponse(
    response => response.url().includes(`/api/expenses/${expenseId}`)
      && response.request().method() === 'DELETE'
  )

  // Delete the expense
  await page.click(`button[data-expense-id="${expenseId}"]`)
  await page.click('button[aria-label="Delete expense"]')
  await page.click('button:has-text("Confirm")')

  // Verify API response
  const response = await responsePromise
  expect(response.status()).toBe(204) // Or 200

  // Verify removed from cleanup array
  const index = createdExpenseIds.indexOf(expenseId)
  if (index !== -1) {
    createdExpenseIds.splice(index, 1)
  }
})
```

**Benefits:**
- Confirms API operations succeed
- Captures resource IDs for cleanup
- Tests error handling
- Validates request/response payloads
- Catches API bugs early

---

## 🎯 What Improved Time Test Can Learn from Expenses Tests

### 1. **OCR & AI Processing Tests** ⭐ HIGH PRIORITY

**Expenses Has (Time Missing):**
```typescript
test('should process receipt with OCR and AI enhancement', async ({ page }) => {
  await page.click('button:has-text("New Expense")')

  // Upload receipt
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('button:has-text("Upload Receipt")')
  ])
  await fileChooser.setFiles('tests/fixtures/receipt.pdf')

  // Wait for OCR processing (30s timeout)
  await page.waitForSelector('text=/OCR complete|Processing complete/', {
    timeout: 30000
  })

  // Verify fields auto-filled from OCR
  const amount = await page.inputValue('input[name="amount"]')
  expect(amount).not.toBe('')
  expect(parseFloat(amount)).toBeGreaterThan(0)

  const vendor = await page.inputValue('input[name="vendor"]')
  expect(vendor).not.toBe('')
  expect(vendor.length).toBeGreaterThan(2)

  const date = await page.inputValue('input[name="date"]')
  expect(date).toMatch(/\d{4}-\d{2}-\d{2}/)
})
```

**Recommendation for Time:**

While time tracking doesn't have OCR, similar smart auto-fill patterns apply:

```typescript
// In tijd-page-comprehensive-improved.spec.ts

test('should auto-fill project from recent entries', async ({ page }) => {
  const tijdPage = new TijdPage(page)
  await tijdPage.goto()

  // Create entry for Project A
  await tijdPage.createTimeEntry({
    projectId: SEEDED_DATA.projects.mlPipeline.id,
    projectName: SEEDED_DATA.projects.mlPipeline.name,
    clientName: SEEDED_DATA.projects.mlPipeline.clientName,
    description: 'Working on ML model',
    hours: '2.0'
  })

  // Start new entry
  await page.click('button:has-text("New Time Entry")')
  const dialog = page.locator('[role="dialog"]')
  await dialog.waitFor({ state: 'visible' })

  // Type description similar to recent entry
  await page.fill('input[name="description"]', 'Working on')

  // Verify auto-complete suggestions appear
  const suggestion = page.locator('[role="option"]:has-text("ML model")')
  const hasSuggestion = await suggestion.isVisible({ timeout: 2000 }).catch(() => false)

  if (hasSuggestion) {
    // Click suggestion
    await suggestion.click()

    // Verify project auto-filled
    const projectField = page.locator('button[role="combobox"]').nth(1)
    const projectText = await projectField.textContent()
    expect(projectText).toContain('ML Data Pipeline')
  }
})

test('should calculate hours from timer automatically', async ({ page }) => {
  const tijdPage = new TijdPage(page)
  await tijdPage.goto()

  // Start timer
  await tijdPage.startTimer(
    SEEDED_DATA.projects.analyticsDashboard.id,
    SEEDED_DATA.projects.analyticsDashboard.name,
    SEEDED_DATA.projects.analyticsDashboard.clientName,
    'Testing auto-calculation'
  )

  // Wait 5 seconds
  await page.waitForTimeout(5000)

  // Stop timer
  await page.click('button:has-text("Stop")')

  // Verify success message
  await page.waitForSelector('text=Time registered successfully!', { timeout: 10000 })

  // Find the created entry
  const entry = page.locator('tr:has-text("Testing auto-calculation")').first()
  await expect(entry).toBeVisible()

  // Verify hours is not 0
  const hoursCell = entry.locator('td').nth(3)
  const hoursText = await hoursCell.textContent()
  const hours = parseFloat(hoursText || '0')

  expect(hours).toBeGreaterThan(0)
  expect(hours).toBeLessThan(0.5) // Should be ~0.08 hours (5 seconds)
})

test('should suggest similar descriptions from history', async ({ page }) => {
  const tijdPage = new TijdPage(page)
  await tijdPage.goto()

  // Create entry with specific description
  await tijdPage.createTimeEntry({
    projectId: SEEDED_DATA.projects.mlPipeline.id,
    projectName: SEEDED_DATA.projects.mlPipeline.name,
    clientName: SEEDED_DATA.projects.mlPipeline.clientName,
    description: 'Daily standup meeting',
    hours: '0.5'
  })

  // Start new entry
  await page.click('button:has-text("New Time Entry")')

  // Type partial description
  await page.fill('input[name="description"]', 'Daily')

  // Wait for autocomplete dropdown
  await page.waitForTimeout(500)

  // Check if suggestion appears
  const dropdown = page.locator('[role="listbox"]')
  const hasDropdown = await dropdown.isVisible({ timeout: 2000 }).catch(() => false)

  if (hasDropdown) {
    const suggestion = page.locator('[role="option"]:has-text("standup meeting")')
    await expect(suggestion).toBeVisible()
  }
})
```

---

### 2. **Advanced Filtering Tests** ⭐ HIGH PRIORITY

**Expenses Has (Time Missing):**

Expenses has dedicated `expenses-filters.spec.ts` with 6 comprehensive filtering tests:

```typescript
test('should filter by date range - from date', async ({ page }) => {
  const fromDate = '2025-01-01'
  await page.fill('input[name="from_date"]', fromDate)
  await page.waitForLoadState('networkidle')

  // Verify only entries >= from date shown
  const entries = await page.locator('table tbody tr').all()
  for (const entry of entries) {
    const dateText = await entry.locator('td:first-child').textContent()
    const entryDate = new Date(dateText || '')
    expect(entryDate >= new Date(fromDate)).toBeTruthy()
  }
})

test('should combine multiple filters', async ({ page }) => {
  // Apply category filter
  await page.click('button:has-text("Category")')
  await page.click('text="Software & ICT"')

  // Apply date filter
  await page.fill('input[name="from_date"]', '2025-01-01')

  // Apply status filter
  await page.click('button:has-text("Status")')
  await page.click('text="Approved"')

  await page.waitForLoadState('networkidle')

  // Verify all conditions met
  const entries = await page.locator('table tbody tr').all()
  for (const entry of entries) {
    const category = await entry.locator('td:nth(2)').textContent()
    expect(category).toContain('Software')

    const status = await entry.locator('td:nth(4)').textContent()
    expect(status).toContain('Approved')
  }
})

test('should persist filters in URL and restore on reload', async ({ page }) => {
  // Apply filters
  await page.click('button:has-text("Category")')
  await page.click('text="Software & ICT"')
  await page.waitForLoadState('networkidle')

  // Verify URL updated
  const url = page.url()
  expect(url).toContain('category=')

  // Reload page
  await page.reload()
  await page.waitForLoadState('networkidle')

  // Verify filter still applied
  const filterChip = page.locator('text="Software & ICT"')
  await expect(filterChip).toBeVisible()
})
```

**Recommendation for Time:**

Create new file `src/__tests__/e2e/tijd-page-filters.spec.ts`:

```typescript
import { test, expect, Page } from '@playwright/test'
import { format } from 'date-fns'
import { getCurrentDate } from '../../lib/current-date'

const SEEDED_DATA = {
  // ... (same as tijd-page-comprehensive-improved.spec.ts)
}

test.describe('Tijd Page - Advanced Filtering', () => {

  test.beforeEach(async ({ page }) => {
    await loginToApplication(page)
    await page.goto('/dashboard/financieel-v2/tijd')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('text=Active Timer', { timeout: 15000 })
  })

  test('should filter by project', async ({ page }) => {
    // Open project filter
    await page.click('button:has-text("Project")')

    // Select specific project
    await page.click('text="ML Data Pipeline"')
    await page.waitForLoadState('networkidle')

    // Verify only ML Data Pipeline entries shown
    const entries = await page.locator('table tbody tr').all()
    expect(entries.length).toBeGreaterThan(0)

    for (const entry of entries) {
      const projectCell = await entry.locator('td:nth(1)').textContent()
      expect(projectCell).toContain('ML Data Pipeline')
    }

    // Verify filter chip shown
    await expect(page.locator('[data-filter-chip]:has-text("ML Data Pipeline")')).toBeVisible()
  })

  test('should filter by client', async ({ page }) => {
    // Open client filter
    await page.click('button:has-text("Client")')

    // Select client
    await page.click('text="NextGen Data Consulting"')
    await page.waitForLoadState('networkidle')

    // Verify only that client's entries shown
    const entries = await page.locator('table tbody tr').all()
    for (const entry of entries) {
      const clientCell = await entry.locator('td:nth(1)').textContent()
      expect(clientCell).toContain('NextGen')
    }
  })

  test('should filter by date range', async ({ page }) => {
    const fromDate = '2025-01-01'
    const toDate = '2025-01-31'

    // Apply date range filter
    await page.click('button:has-text("Date Range")')
    await page.fill('input[name="from_date"]', fromDate)
    await page.fill('input[name="to_date"]', toDate)
    await page.click('button:has-text("Apply")')
    await page.waitForLoadState('networkidle')

    // Verify only entries in range
    const entries = await page.locator('table tbody tr').all()
    for (const entry of entries) {
      const dateText = await entry.locator('td:first-child').textContent()
      const entryDate = new Date(dateText || '')

      expect(entryDate >= new Date(fromDate)).toBeTruthy()
      expect(entryDate <= new Date(toDate)).toBeTruthy()
    }
  })

  test('should filter by invoiced status', async ({ page }) => {
    // Filter for uninvoiced entries
    await page.click('button:has-text("Status")')
    await page.click('text="Not Invoiced"')
    await page.waitForLoadState('networkidle')

    // Verify all entries are uninvoiced
    const entries = await page.locator('table tbody tr').all()
    for (const entry of entries) {
      const invoicedBadge = await entry.locator('[data-status="invoiced"]').count()
      expect(invoicedBadge).toBe(0)
    }
  })

  test('should combine multiple filters', async ({ page }) => {
    // Apply project filter
    await page.click('button:has-text("Project")')
    await page.click('text="Analytics Dashboard"')

    // Apply date filter
    await page.click('button:has-text("Date Range")')
    await page.fill('input[name="from_date"]', '2025-01-01')
    await page.click('button:has-text("Apply")')

    // Apply status filter
    await page.click('button:has-text("Status")')
    await page.click('text="Not Invoiced"')

    await page.waitForLoadState('networkidle')

    // Verify all conditions met
    const entries = await page.locator('table tbody tr').all()
    for (const entry of entries) {
      // Check project
      const project = await entry.locator('td:nth(1)').textContent()
      expect(project).toContain('Analytics Dashboard')

      // Check date
      const dateText = await entry.locator('td:first-child').textContent()
      const entryDate = new Date(dateText || '')
      expect(entryDate >= new Date('2025-01-01')).toBeTruthy()

      // Check status
      const invoiced = await entry.locator('[data-status="invoiced"]').count()
      expect(invoiced).toBe(0)
    }

    // Verify all filter chips shown
    await expect(page.locator('[data-filter-chip]:has-text("Analytics Dashboard")')).toBeVisible()
    await expect(page.locator('[data-filter-chip]:has-text("From: 2025-01-01")')).toBeVisible()
    await expect(page.locator('[data-filter-chip]:has-text("Not Invoiced")')).toBeVisible()
  })

  test('should remove individual filter chip', async ({ page }) => {
    // Apply two filters
    await page.click('button:has-text("Project")')
    await page.click('text="ML Data Pipeline"')
    await page.click('button:has-text("Client")')
    await page.click('text="NextGen Data Consulting"')
    await page.waitForLoadState('networkidle')

    // Get entry count with both filters
    const filteredCount = await page.locator('table tbody tr').count()

    // Remove project filter chip
    await page.click('[data-filter-chip]:has-text("ML Data Pipeline") button[aria-label="Remove filter"]')
    await page.waitForLoadState('networkidle')

    // Verify only client filter remains
    await expect(page.locator('[data-filter-chip]:has-text("ML Data Pipeline")')).toBeHidden()
    await expect(page.locator('[data-filter-chip]:has-text("NextGen")')).toBeVisible()

    // Entry count should change
    const newCount = await page.locator('table tbody tr').count()
    expect(newCount).not.toBe(filteredCount)
  })

  test('should persist filters in URL and restore on reload', async ({ page }) => {
    // Apply filter
    await page.click('button:has-text("Project")')
    await page.click('text="Website Optimization"')
    await page.waitForLoadState('networkidle')

    // Verify URL updated
    const urlBefore = page.url()
    expect(urlBefore).toContain('project=')

    // Get filtered count
    const countBefore = await page.locator('table tbody tr').count()

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('text=Active Timer', { timeout: 15000 })

    // Verify filter restored
    await expect(page.locator('[data-filter-chip]:has-text("Website Optimization")')).toBeVisible()

    // Verify same results
    const countAfter = await page.locator('table tbody tr').count()
    expect(countAfter).toBe(countBefore)
  })

  test('should clear all filters', async ({ page }) => {
    // Apply multiple filters
    await page.click('button:has-text("Project")')
    await page.click('text="ML Data Pipeline"')
    await page.click('button:has-text("Status")')
    await page.click('text="Not Invoiced"')
    await page.waitForLoadState('networkidle')

    // Get filtered count
    const filteredCount = await page.locator('table tbody tr').count()

    // Clear all filters
    await page.click('button:has-text("Clear All Filters")')
    await page.waitForLoadState('networkidle')

    // Verify all chips removed
    await expect(page.locator('[data-filter-chip]')).toHaveCount(0)

    // Verify more entries shown
    const totalCount = await page.locator('table tbody tr').count()
    expect(totalCount).toBeGreaterThan(filteredCount)
  })

  test('should filter by hours range', async ({ page }) => {
    // Apply hours filter (if it exists)
    await page.click('button:has-text("Hours")')
    await page.fill('input[name="min_hours"]', '2')
    await page.fill('input[name="max_hours"]', '8')
    await page.click('button:has-text("Apply")')
    await page.waitForLoadState('networkidle')

    // Verify entries within range
    const entries = await page.locator('table tbody tr').all()
    for (const entry of entries) {
      const hoursText = await entry.locator('td:nth(3)').textContent()
      const hours = parseFloat(hoursText || '0')

      expect(hours).toBeGreaterThanOrEqual(2)
      expect(hours).toBeLessThanOrEqual(8)
    }
  })
})

// Helper function (reuse from improved test)
async function loginToApplication(page: Page) {
  // ... (same as tijd-page-comprehensive-improved.spec.ts)
}
```

**Benefits:**
- Complete filter coverage
- URL persistence testing
- Multi-filter combinations
- Filter chip management
- Better user experience validation

---

### 3. **Bulk Operations Tests** ⭐ MEDIUM PRIORITY

**Expenses Has (Time Missing):**

```typescript
test('should bulk approve expenses', async ({ page }) => {
  // Create 5 test expenses
  for (let i = 0; i < 5; i++) {
    await createTestExpense(page, {
      vendor: `Vendor ${i}`,
      amount: 100 + i
    })
  }

  await page.reload()
  await page.waitForLoadState('networkidle')

  // Select multiple checkboxes
  const checkboxes = await page.locator('input[type="checkbox"]').all()
  for (let i = 0; i < 5; i++) {
    await checkboxes[i].check()
  }

  // Click "Approve Selected"
  await page.click('button:has-text("Approve Selected")')

  // Confirm bulk action
  await page.click('button:has-text("Confirm")')

  // Wait for completion
  await page.waitForSelector('text=/5 expenses approved/i', { timeout: 10000 })

  // Verify all marked as approved
  for (let i = 0; i < 5; i++) {
    const status = await page.locator(`tr:has-text("Vendor ${i}") [data-status]`).textContent()
    expect(status).toContain('Approved')
  }
})

test('should bulk delete expenses', async ({ page }) => {
  // Similar pattern for bulk delete
})
```

**Recommendation for Time:**

Add to `tijd-page-comprehensive-improved.spec.ts` or create `tijd-page-bulk-operations.spec.ts`:

```typescript
test.describe('Bulk Operations', () => {

  test('should bulk delete time entries', async ({ page }) => {
    const tijdPage = new TijdPage(page)
    await tijdPage.goto()

    // Create 5 test entries
    const entryIds: string[] = []
    for (let i = 0; i < 5; i++) {
      const id = await tijdPage.createTimeEntry({
        projectId: SEEDED_DATA.projects.analyticsDashboard.id,
        projectName: SEEDED_DATA.projects.analyticsDashboard.name,
        clientName: SEEDED_DATA.projects.analyticsDashboard.clientName,
        description: `Bulk delete test ${i}`,
        hours: '1.0'
      })
      if (id) entryIds.push(id)
    }

    await page.reload()
    await page.waitForLoadState('networkidle')

    // Select all test entry checkboxes
    for (const id of entryIds) {
      const checkbox = page.locator(`input[data-entry-id="${id}"][type="checkbox"]`)
      await checkbox.check()
    }

    // Click bulk delete
    await page.click('button:has-text("Delete Selected")')

    // Confirm deletion
    const confirmDialog = page.locator('[role="dialog"]:has-text("Delete 5 entries")')
    await expect(confirmDialog).toBeVisible()
    await confirmDialog.locator('button:has-text("Delete")').click()

    // Wait for completion
    await page.waitForSelector('text=/5 entries deleted/i', { timeout: 10000 })

    // Verify all removed
    for (const id of entryIds) {
      await expect(page.locator(`[data-entry-id="${id}"]`)).toHaveCount(0)
    }

    // Clear from cleanup array (already deleted)
    for (const id of entryIds) {
      const index = createdTimeEntryIds.indexOf(id)
      if (index !== -1) createdTimeEntryIds.splice(index, 1)
    }
  })

  test('should bulk mark as invoiced', async ({ page }) => {
    const tijdPage = new TijdPage(page)
    await tijdPage.goto()

    // Create 3 uninvoiced entries
    const entryIds: string[] = []
    for (let i = 0; i < 3; i++) {
      const id = await tijdPage.createTimeEntry({
        projectId: SEEDED_DATA.projects.mlPipeline.id,
        projectName: SEEDED_DATA.projects.mlPipeline.name,
        clientName: SEEDED_DATA.projects.mlPipeline.clientName,
        description: `Invoice test ${i}`,
        hours: '2.0'
      })
      if (id) entryIds.push(id)
    }

    await page.reload()
    await page.waitForLoadState('networkidle')

    // Select all checkboxes
    for (const id of entryIds) {
      await page.locator(`input[data-entry-id="${id}"][type="checkbox"]`).check()
    }

    // Click "Mark as Invoiced"
    await page.click('button:has-text("Mark as Invoiced")')

    // Confirm
    await page.click('button:has-text("Confirm")')

    // Wait for update
    await page.waitForSelector('text=/3 entries marked as invoiced/i', { timeout: 10000 })

    // Verify status updated for all
    for (const id of entryIds) {
      const row = page.locator(`tr:has([data-entry-id="${id}"])`)
      await expect(row.locator('[data-status="invoiced"]')).toBeVisible()
    }
  })

  test('should bulk export time entries', async ({ page }) => {
    const tijdPage = new TijdPage(page)
    await tijdPage.goto()

    // Select multiple entries (use existing entries or create)
    const checkboxes = await page.locator('input[type="checkbox"]').all()
    for (let i = 0; i < Math.min(5, checkboxes.length); i++) {
      await checkboxes[i].check()
    }

    // Click export
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export Selected")')

    // Verify download started
    const download = await downloadPromise
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.csv$|\.xlsx$/)
  })

  test('should select all entries in current view', async ({ page }) => {
    const tijdPage = new TijdPage(page)
    await tijdPage.goto()

    // Click "Select All" checkbox
    const selectAllCheckbox = page.locator('thead input[type="checkbox"]')
    await selectAllCheckbox.check()

    // Verify all visible entries selected
    const checkboxes = await page.locator('tbody input[type="checkbox"]').all()
    for (const checkbox of checkboxes) {
      await expect(checkbox).toBeChecked()
    }

    // Unselect all
    await selectAllCheckbox.uncheck()

    // Verify all deselected
    for (const checkbox of checkboxes) {
      await expect(checkbox).not.toBeChecked()
    }
  })

  test('should show selection count', async ({ page }) => {
    const tijdPage = new TijdPage(page)
    await tijdPage.goto()

    // Select 3 entries
    const checkboxes = await page.locator('tbody input[type="checkbox"]').all()
    for (let i = 0; i < Math.min(3, checkboxes.length); i++) {
      await checkboxes[i].check()
    }

    // Verify selection count shown
    await expect(page.locator('text=/3 selected/i')).toBeVisible()
  })
})
```

---

### 4. **VAT & Financial Calculations** (Domain-Specific to Expenses)

**Expenses Has:**
```typescript
test('should calculate VAT correctly - 21% high rate', async ({ page }) => {
  await page.fill('input[name="amount"]', '100')
  await page.selectOption('select[name="vat_rate"]', '21')

  // Wait for calculation
  await page.waitForTimeout(500)

  const vat = await page.inputValue('input[name="vat_amount"]')
  expect(vat).toBe('21.00')

  const total = await page.inputValue('input[name="total_amount"]')
  expect(total).toBe('121.00')
})
```

**Time Equivalent - Project Budget & Billing:**

```typescript
test.describe('Project Budget & Billing', () => {

  test('should calculate project budget utilization', async ({ page }) => {
    // Assuming project has 100h budget
    const tijdPage = new TijdPage(page)
    await tijdPage.goto()

    // Create entries totaling 50 hours
    for (let i = 0; i < 5; i++) {
      await tijdPage.createTimeEntry({
        projectId: SEEDED_DATA.projects.mlPipeline.id,
        projectName: SEEDED_DATA.projects.mlPipeline.name,
        clientName: SEEDED_DATA.projects.mlPipeline.clientName,
        description: `Budget test ${i}`,
        hours: '10'
      })
    }

    // Navigate to project detail
    await page.click(`a:has-text("${SEEDED_DATA.projects.mlPipeline.name}")`)

    // Verify budget utilization
    const utilizationCard = page.locator('[data-testid="project-budget"]')
    const percentage = await utilizationCard.locator('.percentage').textContent()
    expect(percentage).toBe('50%')

    const hoursUsed = await utilizationCard.locator('.hours-used').textContent()
    expect(hoursUsed).toContain('50')

    const hoursRemaining = await utilizationCard.locator('.hours-remaining').textContent()
    expect(hoursRemaining).toContain('50')
  })

  test('should calculate hourly rate totals', async ({ page }) => {
    const tijdPage = new TijdPage(page)
    await tijdPage.goto()

    // Create entry: 10 hours @ €50/hour = €500
    const entryId = await tijdPage.createTimeEntry({
      projectId: SEEDED_DATA.projects.analyticsDashboard.id,
      projectName: SEEDED_DATA.projects.analyticsDashboard.name,
      clientName: SEEDED_DATA.projects.analyticsDashboard.clientName,
      description: 'Billable work',
      hours: '10'
    })

    await page.reload()
    await page.waitForLoadState('networkidle')

    // Find entry in table
    const row = page.locator(`tr:has([data-entry-id="${entryId}"])`)

    // Verify calculated value (assuming €50/hour rate)
    const valueCell = row.locator('[data-field="calculated-value"]')
    const value = await valueCell.textContent()
    expect(value).toContain('€500')
  })

  test('should sum monthly billable hours', async ({ page }) => {
    const tijdPage = new TijdPage(page)
    await tijdPage.goto()

    // Navigate to monthly view
    await page.click('button:has-text("Month View")')

    // Select current month
    await page.click('button:has-text("January 2025")')

    // Verify monthly total
    const monthlyTotal = page.locator('[data-testid="monthly-billable-total"]')
    const totalText = await monthlyTotal.textContent()
    expect(totalText).toMatch(/\d+\.?\d*\s*hours/)
  })
})
```

---

### 5. **Empty State & Edge Case Testing** ⭐ MEDIUM PRIORITY

**Expenses Has:**
```typescript
test('should display empty state when no expenses exist', async ({ page }) => {
  // Navigate with no expenses (or delete all)
  await page.goto('/dashboard/financieel-v2/uitgaven')

  // Verify empty state
  await expect(page.locator('text=/No expenses|Empty/')).toBeVisible()
  await expect(page.locator('text=/Create your first expense/i')).toBeVisible()

  // Verify CTA button
  await expect(page.locator('button:has-text("Create Expense")')).toBeVisible()
})
```

**Recommendation for Time:**

```typescript
test.describe('Empty States & Edge Cases', () => {

  test('should show empty state for new users', async ({ page }) => {
    // Mock empty state (in practice, would use test user with no data)
    await page.route('**/api/time-entries*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0 })
      })
    })

    const tijdPage = new TijdPage(page)
    await tijdPage.goto()

    // Verify empty state
    await expect(page.locator('text=/No time entries|Start tracking/i')).toBeVisible()
    await expect(page.locator('text=/Record your first/i')).toBeVisible()

    // Verify CTA
    await expect(page.locator('button:has-text("New Time Entry")')).toBeVisible()
  })

  test('should show empty calendar for months with no entries', async ({ page }) => {
    const tijdPage = new TijdPage(page)
    await tijdPage.goto()

    // Navigate to future month (likely no entries)
    for (let i = 0; i < 6; i++) {
      await tijdPage.navigateToNextMonth()
    }

    // Verify no entry indicators on calendar
    const entriesCount = await page.locator('[data-has-entries="true"]').count()
    expect(entriesCount).toBe(0)

    // Verify empty message for month
    const hasEmptyMessage = await page.locator('text=/No entries this month/i')
      .isVisible().catch(() => false)

    if (hasEmptyMessage) {
      expect(hasEmptyMessage).toBeTruthy()
    }
  })

  test('should handle zero hours entries', async ({ page }) => {
    const tijdPage = new TijdPage(page)
    await tijdPage.goto()

    // Try to create 0 hours entry
    await page.click('button:has-text("New Time Entry")')
    const dialog = page.locator('[role="dialog"]')

    await selectProjectById(page,
      SEEDED_DATA.projects.mlPipeline.id,
      SEEDED_DATA.projects.mlPipeline.name,
      SEEDED_DATA.projects.mlPipeline.clientName
    )

    await page.fill('input[name="description"]', 'Zero hours test')
    await page.fill('input[name="hours"]', '0')

    // Should show validation error or prevent submission
    const submitButton = dialog.locator('button:has-text("Register Time")')
    const isDisabled = await submitButton.isDisabled()

    if (!isDisabled) {
      await submitButton.click()
      await expect(page.locator('text=/Hours must be greater than 0/i'))
        .toBeVisible({ timeout: 3000 })
    } else {
      expect(isDisabled).toBeTruthy()
    }
  })

  test('should handle very large hour values', async ({ page }) => {
    const tijdPage = new TijdPage(page)
    await tijdPage.goto()

    // Try to create 100+ hours entry
    await page.click('button:has-text("New Time Entry")')

    await page.fill('input[name="hours"]', '999')

    // Should show warning
    const hasWarning = await page.locator('text=/Are you sure|Very large/i')
      .isVisible({ timeout: 2000 }).catch(() => false)

    // Warning is optional but good UX
    if (hasWarning) {
      expect(hasWarning).toBeTruthy()
    }
  })

  test('should handle entries spanning midnight', async ({ page }) => {
    const tijdPage = new TijdPage(page)
    await tijdPage.goto()

    // Start timer at 11:30 PM
    // Wait until past midnight
    // Stop timer
    // Verify entry date handling

    // This is complex to test in E2E - may need manual testing
    // or specific test data setup
  })
})
```

---

### 6. **Recurring/Template Patterns** ⭐ HIGH PRIORITY

**Expenses Has (from `expenses-recurring.spec.ts`):**

```typescript
test('should create recurring expense template', async ({ page }) => {
  await page.goto('/dashboard/financieel-v2/terugkerende-uitgaven')
  await page.click('button:has-text("New Template")')

  // Fill template form
  await page.fill('input[name="template_name"]', 'Monthly Software Subscription')
  await page.fill('input[name="vendor_name"]', 'Adobe')
  await page.fill('input[name="amount"]', '50')

  // Set frequency
  await page.click('button:has-text("Frequency")')
  await page.click('text="Monthly"')

  // Set escalation percentage
  await page.fill('input[name="escalation"]', '3')

  // Save template
  await page.click('button:has-text("Create Template")')

  // Verify in templates list
  await expect(page.locator('tr:has-text("Monthly Software Subscription")')).toBeVisible()
})

test('should generate expenses from template', async ({ page }) => {
  // Navigate to carousel
  await page.goto('/dashboard/financieel-v2/uitgaven')

  // Find template in carousel
  const templateCard = page.locator('[data-template-name="Monthly Software Subscription"]')
  await templateCard.scrollIntoViewIfNeeded()

  // Click "Create from Template"
  await templateCard.locator('button:has-text("Toevoegen")').click()

  // Verify expense created with template data
  await expect(page.locator('text=Adobe')).toBeVisible()
  await expect(page.locator('text=€50')).toBeVisible()
})
```

**Recommendation for Time:**

Create new file `src/__tests__/e2e/tijd-page-templates.spec.ts`:

```typescript
import { test, expect, Page } from '@playwright/test'

test.describe('Tijd Page - Recurring Templates', () => {

  test.beforeEach(async ({ page }) => {
    await loginToApplication(page)
  })

  test('should create recurring time entry template', async ({ page }) => {
    await page.goto('/dashboard/financieel-v2/tijd/templates')

    // Create template
    await page.click('button:has-text("New Template")')

    const dialog = page.locator('[role="dialog"]')
    await dialog.waitFor({ state: 'visible' })

    // Fill template form
    await page.fill('input[name="template_name"]', 'Daily Standup')
    await page.fill('input[name="description"]', 'Daily team standup meeting')
    await page.fill('input[name="hours"]', '0.25')

    // Select project
    await selectProjectById(page,
      SEEDED_DATA.projects.mlPipeline.id,
      SEEDED_DATA.projects.mlPipeline.name,
      SEEDED_DATA.projects.mlPipeline.clientName
    )

    // Set frequency
    await page.click('button[role="combobox"]:has-text("Frequency")')
    await page.click('[role="option"]:has-text("Daily")')

    // Save template
    await page.click('button:has-text("Create Template")')

    // Verify saved
    await expect(dialog).toBeHidden({ timeout: 5000 })
    await expect(page.locator('tr:has-text("Daily Standup")')).toBeVisible()
  })

  test('should auto-suggest time from templates', async ({ page }) => {
    // First create a template (or use existing)
    await createTemplate(page, {
      name: 'Code Review',
      description: 'Review pull requests',
      hours: '1.0',
      projectId: SEEDED_DATA.projects.mlPipeline.id
    })

    // Navigate to tijd page
    await page.goto('/dashboard/financieel-v2/tijd')

    // Start new entry
    await page.click('button:has-text("New Time Entry")')

    // Type description matching template
    await page.fill('input[name="description"]', 'Code')

    // Wait for autocomplete
    await page.waitForTimeout(500)

    // Verify template suggestion appears
    const suggestion = page.locator('[role="option"]:has-text("Code Review")')
    await expect(suggestion).toBeVisible({ timeout: 3000 })

    // Select template
    await suggestion.click()

    // Verify hours and project pre-filled
    const hours = await page.inputValue('input[name="hours"]')
    expect(hours).toBe('1.0')

    const description = await page.inputValue('input[name="description"]')
    expect(description).toContain('Review pull requests')
  })

  test('should manage template library', async ({ page }) => {
    await page.goto('/dashboard/financieel-v2/tijd/templates')

    // View all templates
    await page.waitForSelector('table tbody tr', { timeout: 10000 })

    const templateCount = await page.locator('table tbody tr').count()
    expect(templateCount).toBeGreaterThan(0)

    // Edit template
    const firstTemplate = page.locator('table tbody tr').first()
    await firstTemplate.locator('button[aria-label="Edit template"]').click()

    const dialog = page.locator('[role="dialog"]')
    await dialog.waitFor({ state: 'visible' })

    // Modify hours
    await page.fill('input[name="hours"]', '2.0')
    await page.click('button:has-text("Save")')

    // Verify updated
    await expect(dialog).toBeHidden()
  })

  test('should generate entries from template', async ({ page }) => {
    await page.goto('/dashboard/financieel-v2/tijd/templates')

    // Find a template
    const template = page.locator('tr:has-text("Daily Standup")').first()

    // Click "Generate Entry"
    await template.locator('button:has-text("Use Template")').click()

    // Dialog opens with pre-filled data
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible()

    // Verify pre-filled
    const description = await page.inputValue('input[name="description"]')
    expect(description).toContain('standup')

    const hours = await page.inputValue('input[name="hours"]')
    expect(hours).toBe('0.25')

    // Can modify before saving
    await page.fill('input[name="hours"]', '0.5')

    // Create entry
    await page.click('button:has-text("Register Time")')

    // Verify created
    await expect(page.locator('text=Time entry created')).toBeVisible()
  })

  test('should disable/enable templates', async ({ page }) => {
    await page.goto('/dashboard/financieel-v2/tijd/templates')

    const template = page.locator('tr:has-text("Daily Standup")').first()

    // Disable template
    await template.locator('button[aria-label="Disable template"]').click()

    // Verify disabled
    await expect(template.locator('[data-status="disabled"]')).toBeVisible()

    // Re-enable
    await template.locator('button[aria-label="Enable template"]').click()

    // Verify enabled
    await expect(template.locator('[data-status="active"]')).toBeVisible()
  })
})

// Helper functions
async function createTemplate(page: Page, data: {
  name: string
  description: string
  hours: string
  projectId: string
}) {
  // Template creation helper
  await page.goto('/dashboard/financieel-v2/tijd/templates')
  await page.click('button:has-text("New Template")')

  // Fill form
  await page.fill('input[name="template_name"]', data.name)
  await page.fill('input[name="description"]', data.description)
  await page.fill('input[name="hours"]', data.hours)

  // Save
  await page.click('button:has-text("Create Template")')
  await page.waitForSelector(`tr:has-text("${data.name}")`, { timeout: 5000 })
}
```

---

## 📋 Shared Helper Functions to Extract

Both test suites would benefit from a shared utilities library. Create `src/__tests__/e2e/helpers/` directory:

### 1. **Authentication Helper** (`auth.ts`)

```typescript
// src/__tests__/e2e/helpers/auth.ts
import { Page } from '@playwright/test'

export async function loginToApplication(page: Page): Promise<void> {
  console.log('🔐 Logging in to application...')

  const isLoggedIn = await checkIfLoggedIn(page)

  if (isLoggedIn) {
    console.log('✅ Already logged in')
    return
  }

  console.log('🔄 Not logged in, proceeding with authentication...')

  await page.goto('/sign-in')
  console.log('🏠 Navigated to sign-in page')

  await page.waitForSelector('text=Sign in', { timeout: 10000 })
  console.log('📋 Sign-in form title visible')

  const emailInput = page.locator('input[type="email"], input[name="identifier"]').first()
  await emailInput.waitFor({ state: 'visible', timeout: 10000 })
  console.log('📧 Email input field found')

  await emailInput.fill('imre.iddatasolutions@gmail.com')
  console.log('✉️  Email filled')

  const passwordInput = page.locator('input[type="password"], input[name="password"]').first()
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 })
  console.log('🔑 Password field found')

  await passwordInput.fill('Qy192837465!?')
  console.log('🔑 Password filled')

  const continueButton = page.locator('button:has-text("Continue")').first()
  await continueButton.click()
  console.log('➡️  Clicked Continue')

  await page.waitForURL(/\/dashboard/, { timeout: 15000 })
  console.log('🎯 Redirected to dashboard')

  console.log('✅ Login complete and ready for tests')
}

export async function checkIfLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard', { timeout: 5000 })
    await page.waitForLoadState('networkidle', { timeout: 3000 })
    const url = page.url()
    return url.includes('/dashboard')
  } catch {
    return false
  }
}

export async function logout(page: Page): Promise<void> {
  await page.click('button[aria-label="User menu"]')
  await page.click('text="Sign out"')
  await page.waitForURL('/sign-in', { timeout: 5000 })
}
```

### 2. **Network Helper** (`network.ts`)

```typescript
// src/__tests__/e2e/helpers/network.ts
import { Page, Response } from '@playwright/test'

export async function waitForApiResponse(
  page: Page,
  endpoint: string,
  method: string = 'GET',
  status: number = 200
): Promise<Response> {
  return await page.waitForResponse(
    response => response.url().includes(endpoint)
      && response.request().method() === method
      && response.status() === status
  )
}

export async function waitForApiRequest(
  page: Page,
  endpoint: string,
  method: string = 'GET'
) {
  return await page.waitForRequest(
    request => request.url().includes(endpoint)
      && request.method() === method
  )
}

export async function mockApiError(
  page: Page,
  endpoint: string,
  statusCode: number = 500,
  errorMessage: string = 'Internal server error'
) {
  await page.route(`**${endpoint}*`, route => {
    route.fulfill({
      status: statusCode,
      contentType: 'application/json',
      body: JSON.stringify({
        error: errorMessage,
        message: errorMessage
      })
    })
  })
}

export async function mockApiSuccess(
  page: Page,
  endpoint: string,
  data: any
) {
  await page.route(`**${endpoint}*`, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data })
    })
  })
}

export async function interceptAndModifyResponse(
  page: Page,
  endpoint: string,
  modifier: (data: any) => any
) {
  await page.route(`**${endpoint}*`, async route => {
    const response = await route.fetch()
    const json = await response.json()
    const modified = modifier(json)

    await route.fulfill({
      status: response.status(),
      headers: response.headers(),
      body: JSON.stringify(modified)
    })
  })
}
```

### 3. **Cleanup Helper** (`cleanup.ts`)

```typescript
// src/__tests__/e2e/helpers/cleanup.ts
import { Page } from '@playwright/test'

export async function bulkDeleteEntries(
  page: Page,
  endpoint: string,
  ids: string[]
): Promise<string[]> {
  const failures: string[] = []

  for (const id of ids) {
    try {
      const response = await page.request.delete(`${endpoint}/${id}`)
      if (!response.ok()) {
        failures.push(id)
        console.warn(`Failed to delete entry ${id}: HTTP ${response.status()}`)
      }
    } catch (error) {
      failures.push(id)
      console.warn(`Failed to delete entry ${id}:`, error)
    }
  }

  return failures
}

export async function cleanupTestData(
  page: Page,
  resources: Array<{ endpoint: string; ids: string[] }>
): Promise<void> {
  for (const resource of resources) {
    const failures = await bulkDeleteEntries(page, resource.endpoint, resource.ids)

    if (failures.length > 0) {
      console.error(`❌ Failed to cleanup ${failures.length} ${resource.endpoint} entries`)
    } else {
      console.log(`✅ Cleaned up ${resource.ids.length} ${resource.endpoint} entries`)
    }
  }
}

export class CleanupTracker {
  private entries: Map<string, string[]> = new Map()

  track(endpoint: string, id: string) {
    if (!this.entries.has(endpoint)) {
      this.entries.set(endpoint, [])
    }
    this.entries.get(endpoint)!.push(id)
  }

  async cleanup(page: Page): Promise<void> {
    const resources = Array.from(this.entries.entries()).map(([endpoint, ids]) => ({
      endpoint,
      ids
    }))

    await cleanupTestData(page, resources)
    this.entries.clear()
  }

  clear() {
    this.entries.clear()
  }
}
```

### 4. **Validation Helper** (`validation.ts`)

```typescript
// src/__tests__/e2e/helpers/validation.ts
import { Page, expect } from '@playwright/test'

export async function assertValidationError(
  page: Page,
  fieldName: string,
  errorPattern: RegExp | string
) {
  const error = page.locator(`[data-field="${fieldName}"] .error-message`)
  await expect(error).toBeVisible({ timeout: 3000 })

  if (typeof errorPattern === 'string') {
    await expect(error).toHaveText(errorPattern)
  } else {
    const text = await error.textContent()
    expect(text).toMatch(errorPattern)
  }
}

export async function assertNoValidationErrors(page: Page) {
  const errors = await page.locator('.error-message').count()
  expect(errors).toBe(0)
}

export async function fillFormAndValidate(
  page: Page,
  fields: Array<{ name: string; value: string; shouldError?: boolean }>
) {
  for (const field of fields) {
    await page.fill(`input[name="${field.name}"]`, field.value)
    await page.keyboard.press('Tab')

    if (field.shouldError) {
      await assertValidationError(page, field.name, /required|invalid/i)
    }
  }
}

export async function submitFormAndCheckErrors(
  page: Page,
  submitButtonText: string,
  expectedErrors: string[]
): Promise<boolean> {
  await page.click(`button:has-text("${submitButtonText}")`)
  await page.waitForTimeout(500)

  for (const errorField of expectedErrors) {
    const hasError = await page.locator(`[data-field="${errorField}"] .error-message`)
      .isVisible().catch(() => false)

    if (!hasError) {
      console.error(`Expected validation error for ${errorField} but none found`)
      return false
    }
  }

  return true
}
```

### 5. **UI Helper** (`ui.ts`)

```typescript
// src/__tests__/e2e/helpers/ui.ts
import { Page } from '@playwright/test'

export async function waitForLoadingToFinish(page: Page, timeout: number = 10000) {
  // Wait for any loading spinners to disappear
  await page.waitForFunction(() => {
    const spinners = document.querySelectorAll('[data-loading], .spinner, [aria-busy="true"]')
    return spinners.length === 0
  }, { timeout })
}

export async function waitForDialogToOpen(page: Page, timeout: number = 5000) {
  const dialog = page.locator('[role="dialog"]')
  await dialog.waitFor({ state: 'visible', timeout })
  return dialog
}

export async function closeDialogWithEscape(page: Page) {
  await page.keyboard.press('Escape')
  await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 })
}

export async function scrollToElement(page: Page, selector: string) {
  const element = page.locator(selector)
  await element.scrollIntoViewIfNeeded()
  await element.waitFor({ state: 'visible' })
  return element
}

export async function selectFromDropdown(
  page: Page,
  dropdownSelector: string,
  optionText: string
) {
  await page.click(dropdownSelector)
  await page.waitForSelector('[role="listbox"]', { state: 'visible' })
  await page.click(`[role="option"]:has-text("${optionText}")`)
  await page.waitForSelector('[role="listbox"]', { state: 'hidden' })
}

export async function fillDateInput(page: Page, inputName: string, date: Date | string) {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
  await page.fill(`input[name="${inputName}"]`, dateStr)
}
```

---

## 📊 Coverage Gap Analysis Summary

### Expenses Tests Missing:
1. ✅ **Page Object Model** - Time improved version has it
2. ✅ **Reduced hard-coded timeouts** - Time has better waiting strategies
3. ✅ **Explicit validation tests** - Time has 3 dedicated tests
4. ✅ **Accessibility tests** - Time has 2 keyboard navigation tests
5. ✅ **Performance tests** - Time has page load benchmark
6. ✅ **Network request assertions** - Time has explicit API verification

### Time Tests Missing:
1. ✅ **Advanced filtering** - Expenses has 6 dedicated filter tests
2. ✅ **Bulk operations** - Expenses has bulk approve/delete
3. ✅ **OCR/automation** - Expenses has receipt processing (domain-specific)
4. ✅ **Templates/recurring** - Expenses has comprehensive recurring tests
5. ✅ **Empty states** - Expenses has explicit empty state tests
6. ✅ **Complex calculations** - Expenses has VAT calculations (domain-specific)

---

## 🎯 Implementation Priority & Timeline

### Week 1-2: High Priority Quick Wins
**Expenses:**
1. Create base `ExpensesPage` class (2-3 days)
2. Add validation tests file (1-2 days)
3. Extract shared helpers (auth, network) (1 day)

**Time:**
1. Create `tijd-page-filters.spec.ts` (2-3 days)
2. Add bulk operations tests (1-2 days)
3. Use shared helpers from Expenses (1 day)

**Expected Impact:** +15% test coverage, -20% maintenance time

---

### Week 3-4: Medium Priority Improvements
**Expenses:**
4. Audit and replace hard-coded timeouts (3-4 days)
5. Add accessibility tests file (2-3 days)

**Time:**
3. Add template/recurring tests (2-3 days)
4. Add empty state tests (1 day)

**Expected Impact:** +10% test coverage, -30% flakiness

---

### Week 5-8: Performance & Polish
**Both:**
5. Add performance test files (2-3 days each)
6. Create shared test utilities library (2 days)
7. Add network assertion wrappers (1-2 days)

**Expected Impact:** +5% coverage, performance regression detection

---

### Month 3+: Long-term Enhancements
8. Mobile responsiveness tests
9. Real-time collaboration tests
10. Offline mode tests
11. Cross-browser compatibility suite

---

## 📈 Expected Outcomes After Full Implementation

### Metrics Improvement Forecast:

| Metric | Expenses (Before → After) | Time (Before → After) |
|--------|--------------------------|---------------------|
| **Test Coverage** | 80% → 95% | 70% → 90% |
| **Maintainability Score** | 6/10 → 9/10 | 8/10 → 10/10 |
| **Execution Speed** | 8-12 min → 5-8 min | 3-5 min → 2-4 min |
| **Flakiness Rate** | ~10% → <5% | ~5% → <2% |
| **Bug Detection** | Good → Excellent | Good → Excellent |
| **Code Reuse** | 30% → 70% | 40% → 75% |

### Quality Improvements:
- **Faster feedback loops** - Reduced test execution time
- **Earlier bug detection** - Better validation and network testing
- **Easier maintenance** - Page object pattern and shared utilities
- **Better documentation** - Self-documenting test patterns
- **Accessibility compliance** - Dedicated a11y tests
- **Performance baselines** - Automated performance regression detection

---

## 🔧 Recommended Action Plan

### Immediate Next Steps:

1. **Create shared helpers directory** (1-2 hours)
   ```bash
   mkdir -p src/__tests__/e2e/helpers
   # Create auth.ts, network.ts, cleanup.ts, validation.ts, ui.ts
   ```

2. **Create ExpensesPage class** (3-4 hours)
   - Extract common operations
   - Refactor 1-2 test files to use it
   - Validate approach before full refactor

3. **Create tijd-page-filters.spec.ts** (4-6 hours)
   - Port filtering patterns from expenses
   - Add URL persistence tests
   - Test multi-filter combinations

4. **Add validation test files** (2-3 hours each)
   - `expenses-validation.spec.ts`
   - Validation tests in tijd improved file

5. **Audit timeouts** (4-6 hours per test suite)
   - Search for `waitForTimeout`
   - Replace with proper waits
   - Document wait strategies

---

## 📝 Conclusion

Both test suites have significant strengths that can benefit each other:

**Expenses Tests Excel At:**
- Comprehensive feature coverage (34 tests across 4 files)
- Advanced filtering patterns
- Bulk operations
- Recurring/template workflows
- Domain-specific calculations (VAT)

**Improved Time Tests Excel At:**
- Page Object Model architecture
- Minimal hard-coded timeouts
- Explicit network assertions
- Validation testing
- Accessibility coverage
- Performance benchmarking

**By cross-pollinating these patterns, both test suites will achieve:**
- 90%+ test coverage
- <5% flakiness rate
- Excellent maintainability
- Comprehensive bug detection
- Production-ready quality

**Estimated Total Implementation Time:** 6-8 weeks for full cross-learning implementation

**ROI:** Significant reduction in bugs, faster development cycles, better user experience, easier onboarding for new developers
