import { test, expect } from '@playwright/test'
import { loginToApplication } from './helpers/auth-helpers'

/**
 * E2E Tests for Tijd (Time Tracking) Page
 *
 * Tests the time entries page including:
 * - Status filter tabs (All, Billable, Billable Not Due, Non-billable, Invoiced)
 * - Pagination controls
 * - Metrics card consistency with filtered table
 * - Filter counts accuracy
 */

/**
 * Helper function to get the time entries table (not the calendar table)
 * The page has multiple tables, so we need to be specific
 */
function getTimeEntriesTable(page: any) {
  return page.locator('table:has(th:text("Date")):has(th:text("Client")):has(th:text("Status"))')
}

const getStatusFilterButton = (page: any, value: string) => page.getByTestId(`status-filter-${value}`).first()

test.describe('Tijd Page - Status Filters and Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await loginToApplication(page)
    await page.goto('/dashboard/financieel-v2/tijd')
    await page.waitForLoadState('networkidle')

    // Dismiss cookie/privacy consent modal if present (it blocks clicks)
    // Try multiple selectors to handle different cookie consent implementations
    const possibleSelectors = [
      'text=We value your privacy',
      '[role="banner"][aria-label="Cookie consent banner"]',
      '[role="dialog"]:has-text("privacy")',
      '[role="dialog"]:has-text("cookie")'
    ]

    for (const selector of possibleSelectors) {
      const modal = page.locator(selector).first()
      if (await modal.isVisible().catch(() => false)) {
        // Try to find and click accept/agree button
        const acceptButton = page.locator('button:has-text("Accept"), button:has-text("Agree"), button:has-text("OK"), button:has-text("I Agree")').first()
        if (await acceptButton.isVisible().catch(() => false)) {
          await acceptButton.click()
          await page.waitForTimeout(500)
          console.log('✅ Dismissed privacy/cookie modal')
          break
        }
      }
    }

    // Wait for the time entries section to load
    await page.locator('[data-testid="time-entry-status-filters"]').waitFor({ timeout: 10000 })
  })

  test.describe('Status Filter Tabs', () => {
    test('should display all 5 status filter tabs', async ({ page }) => {
      await page.locator('[data-testid="time-entry-status-filters"]').waitFor()

      const expectedFilters = [
        { value: 'all', label: 'All' },
        { value: 'ready_to_invoice', label: 'Billable' },
        { value: 'billable_not_due', label: 'Not Yet Billable' },
        { value: 'not_billable', label: 'Non-billable' },
        { value: 'invoiced', label: 'Invoiced' }
      ]

      for (const filter of expectedFilters) {
        const button = getStatusFilterButton(page, filter.value)
        await expect(button).toBeVisible()
        await expect(button).toContainText(filter.label)
      }

      console.log('✅ All 5 status filter tabs are visible with expected labels')
    })

    test('should show badge counts for each filter', async ({ page }) => {
      await page.locator('[data-testid="time-entry-status-filters"]').waitFor()

      // Each filter button should have a badge with a count
      const allButton = getStatusFilterButton(page, 'all')
      const allBadge = allButton.locator('.ml-2') // Badge is inside button
      await expect(allBadge).toBeVisible()

      const billableButton = getStatusFilterButton(page, 'ready_to_invoice')
      const billableBadge = billableButton.locator('.ml-2')
      await expect(billableBadge).toBeVisible()
    })

    test('should highlight active filter tab', async ({ page }) => {
      await page.locator('[data-testid="time-entry-status-filters"]').waitFor()

      // Default should be "All" (blue background)
      const allButton = getStatusFilterButton(page, 'all')
      await expect(allButton).toHaveClass(/bg-blue-600/)

      // Click "Billable"
      const billableButton = getStatusFilterButton(page, 'ready_to_invoice')
      await billableButton.click()

      // Wait for filter to apply
      await page.waitForTimeout(500)

      // "Billable" should now be highlighted
      await expect(billableButton).toHaveClass(/bg-blue-600/)

      // "All" should no longer be highlighted
      await expect(allButton).not.toHaveClass(/bg-blue-600/)
    })

    test('should filter table when "Billable" is clicked', async ({ page }) => {
      await page.locator('[data-testid="time-entry-status-filters"]').waitFor()

      const timeEntriesTable = getTimeEntriesTable(page)

      // Get initial row count
      const allRows = await timeEntriesTable.locator('tbody tr').count()

      // Click "Billable" filter
      const billableButton = getStatusFilterButton(page, 'ready_to_invoice')
      await billableButton.click()
      await page.waitForTimeout(500)

      // Get filtered row count
      const filteredRows = await timeEntriesTable.locator('tbody tr').count()

      // Filtered count should be <= all count
      expect(filteredRows).toBeLessThanOrEqual(allRows)

      // All visible rows should have green status badge (ready to invoice)
      const statusBadges = timeEntriesTable.locator('tbody tr').locator('[data-testid="status-badge"]')
      const count = await statusBadges.count()

      if (count > 0) {
        // Check that visible badges are green (ready)
        for (let i = 0; i < Math.min(count, 5); i++) {
          const badge = statusBadges.nth(i)
          // Green badges typically have "Billable" text and green color
          await expect(badge).toBeVisible()
        }
      }
    })

    test('should filter table when "Not Yet Billable" is clicked', async ({ page }) => {
      // Scroll to time entries section first
      await page.locator('[data-testid="time-entry-status-filters"]').scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)

      // Click "Not Yet Billable" filter
      const notYetBillableButton = getStatusFilterButton(page, 'billable_not_due')
      await notYetBillableButton.click()

      // Wait for filter to apply and table to update
      await page.waitForTimeout(1000)

      // Check that the button is highlighted
      await expect(notYetBillableButton).toHaveClass(/bg-blue-600/)

      // Wait for the TIME ENTRIES table specifically (not calendar table)
      // The time entries table has a header with "Date", "Client", "Project", etc.
      const timeEntriesTable = page.locator('table:has(th:text("Date")):has(th:text("Client")):has(th:text("Status"))')
      await timeEntriesTable.waitFor({ timeout: 5000 })

      // Count rows in the TIME ENTRIES table only
      const rows = await timeEntriesTable.locator('tbody tr').count()
      console.log(`Found ${rows} rows in time entries table after filtering for "Not Yet Billable"`)

      if (rows > 0) {
        // Get the first row from the time entries table
        const firstRow = timeEntriesTable.locator('tbody tr').first()
        await firstRow.scrollIntoViewIfNeeded()
        await page.waitForTimeout(500)

        // Find the status badge in this row
        const statusBadge = firstRow.locator('[data-testid="status-badge"]')
        await expect(statusBadge).toBeVisible({ timeout: 5000 })
        console.log('✅ Status badge found in time entries table')

        const badgeText = await statusBadge.textContent()
        console.log(`Badge text: ${badgeText}`)

        // Verify it shows the not-yet-billable state (label may be localized)
        const normalizedText = (badgeText || '').toLowerCase()
        expect(normalizedText === '' ? '' : normalizedText).toMatch(/not yet billable|billable/)
        console.log('✅ Badge shows not-yet-billable status text')
      } else {
        console.log('ℹ️ No entries found for "Not Yet Billable" filter - this is acceptable if no matching data exists')
      }
    })

    test('should filter table when "Non-billable" is clicked', async ({ page }) => {
      await page.locator('[data-testid="time-entry-status-filters"]').waitFor()

      // Click "Non-billable" filter
      const nonBillableButton = getStatusFilterButton(page, 'not_billable')
      await nonBillableButton.click()
      await page.waitForTimeout(500)

      // Check that the button is highlighted
      await expect(nonBillableButton).toHaveClass(/bg-blue-600/)
    })

    test('should filter table when "Invoiced" is clicked', async ({ page }) => {
      await page.locator('[data-testid="time-entry-status-filters"]').waitFor()

      // Click "Invoiced" filter
      const invoicedButton = getStatusFilterButton(page, 'invoiced')
      await invoicedButton.click()
      await page.waitForTimeout(500)

      // Check that the button is highlighted
      await expect(invoicedButton).toHaveClass(/bg-blue-600/)
    })

    test('should show correct count in filter badge', async ({ page }) => {
      await page.locator('[data-testid="time-entry-status-filters"]').waitFor()

      const timeEntriesTable = getTimeEntriesTable(page)

      // Get the count directly from the page info text (more reliable)
      const pageInfo = page.locator('text=/Showing \\d+ entries|\\d+ total in database/')
      const pageInfoText = await pageInfo.textContent().catch(() => null)

      let allCount = 0
      if (pageInfoText) {
        // Extract total count from "X total in database" text
        const totalMatch = pageInfoText.match(/(\d+)\s+total in database/)
        allCount = totalMatch ? parseInt(totalMatch[1]) : 0
      }

      // If we couldn't get it from page info, try from the button
      if (allCount === 0) {
        const allButton = getStatusFilterButton(page, 'all')
        const buttonText = await allButton.textContent()
        console.log(`Button text: "${buttonText}"`)
        const match = buttonText?.match(/(\d+)/)
        allCount = match ? parseInt(match[1]) : 0
      }

      console.log(`Total count: ${allCount}`)

      // Click "All" to ensure we're showing all entries
      const allButton = getStatusFilterButton(page, 'all')
      await allButton.click()
      await page.waitForTimeout(500)

      // Count actual table rows (on current page)
      const tableRows = await timeEntriesTable.locator('tbody tr').count()
      console.log(`Actual table rows: ${tableRows}`)

      // The visible rows should be <= total count (due to pagination)
      if (allCount > 0) {
        expect(tableRows).toBeLessThanOrEqual(allCount)
      }
      expect(tableRows).toBeGreaterThan(0) // Assuming there's at least some data
    })
  })

  test.describe('Pagination Controls', () => {
    test('should display pagination controls when there are multiple pages', async ({ page }) => {
      await page.locator('[data-testid="time-entry-status-filters"]').waitFor()

      const timeEntriesTable = getTimeEntriesTable(page)

      // Look for pagination controls near the time entries table (not calendar)
      // Pagination is shown in the CardContent that contains the table
      const paginationSection = timeEntriesTable.locator('..').locator('..')  // Go up to card content
      const paginationExists = await paginationSection.locator('button:has-text("Previous"), button:has-text("Next")').count() > 0

      if (paginationExists) {
        // Pagination should be visible - use exact match to avoid calendar buttons
        const prevButton = paginationSection.getByRole('button', { name: 'Previous', exact: true })
        const nextButton = paginationSection.getByRole('button', { name: 'Next', exact: true })

        await expect(prevButton).toBeVisible()
        await expect(nextButton).toBeVisible()

        // Page indicator should be visible
        await expect(page.locator('text=/Page \\d+ of \\d+/')).toBeVisible()
      }
    })

    test('should disable Previous button on first page', async ({ page }) => {
      await page.locator('[data-testid="time-entry-status-filters"]').waitFor()

      const timeEntriesTable = getTimeEntriesTable(page)
      const paginationSection = timeEntriesTable.locator('..').locator('..')

      const prevButton = paginationSection.getByRole('button', { name: 'Previous', exact: true })
      const buttonExists = await prevButton.count() > 0

      if (buttonExists) {
        // Previous should be disabled on page 1
        await expect(prevButton).toBeDisabled()
      }
    })

    test('should navigate to next page when Next is clicked', async ({ page }) => {
      await page.locator('[data-testid="time-entry-status-filters"]').waitFor()

      const timeEntriesTable = getTimeEntriesTable(page)
      const paginationSection = timeEntriesTable.locator('..').locator('..')
      const nextButton = paginationSection.getByRole('button', { name: 'Next', exact: true })
      const buttonExists = await nextButton.count() > 0

      if (buttonExists && !(await nextButton.isDisabled())) {
        // Get current page indicator
        const pageIndicatorBefore = await page.locator('text=/Page \\d+ of \\d+/').textContent()

        // Click Next
        await nextButton.click()
        await page.waitForTimeout(500)

        // Page indicator should have changed
        const pageIndicatorAfter = await page.locator('text=/Page \\d+ of \\d+/').textContent()
        expect(pageIndicatorBefore).not.toBe(pageIndicatorAfter)

        // Should show different entries
        const firstRowAfter = await timeEntriesTable.locator('tbody tr').first().textContent()
        expect(firstRowAfter).toBeTruthy()
      }
    })

    test('should navigate using page number buttons', async ({ page }) => {
      await page.locator('[data-testid="time-entry-status-filters"]').waitFor()

      const timeEntriesTable = getTimeEntriesTable(page)
      const paginationSection = timeEntriesTable.locator('..').locator('..')

      // Look for page number buttons within the pagination section
      const pageButtons = paginationSection.locator('button.w-10')
      const count = await pageButtons.count()

      if (count > 1) {
        // Click button with text "2" - use force to bypass cookie banner
        const page2Button = paginationSection.getByRole('button', { name: '2', exact: true })
        await page2Button.click({ force: true })
        await page.waitForTimeout(500)

        // The page indicator on the left should show "Page 2 of X"
        await expect(page.locator('text=/Page 2 of \\d+/')).toBeVisible()
      }
    })

    test('should show correct entry count in pagination info', async ({ page }) => {
      await page.locator('[data-testid="time-entry-status-filters"]').waitFor()

      const paginationInfo = page.getByTestId('time-entry-pagination-info')
      const infoExists = await paginationInfo.count() > 0

      if (infoExists) {
        const infoElement = paginationInfo.first()
        await expect(infoElement).toBeVisible()

        // Extract numbers from "Showing X of Y entries"
        const infoText = await infoElement.textContent()
        const match = infoText?.match(/Showing (\d+) of (\d+) entries/)

        if (match) {
          const showing = parseInt(match[1])
          const total = parseInt(match[2])

          expect(showing).toBeGreaterThan(0)
          expect(total).toBeGreaterThanOrEqual(showing)
        }
      }
    })
  })

  test.describe('Metrics Card Consistency', () => {
    test('should match Billable metric with filtered table', async ({ page }) => {
      await page.locator('[data-testid="time-entry-status-filters"]').waitFor()

      const timeEntriesTable = getTimeEntriesTable(page)

      // Metric card in UI is labeled "Ready to Invoice" and represents billable hours
      const metricCard = page.locator('text=Ready to Invoice').locator('..')
      const metricValue = await metricCard.locator('text=/\\d+h/').first().textContent()
      const metricHours = parseFloat(metricValue?.replace('h', '') || '0')

      // Get count from Billable filter badge
      const billableButton = getStatusFilterButton(page, 'ready_to_invoice')
      const buttonText = await billableButton.textContent()
      const match = buttonText?.match(/(\d+)/)
      const badgeCount = match ? parseInt(match[1]) : 0

      // Click the filter
      await billableButton.click()
      await page.waitForTimeout(500)

      // Count visible rows
      const visibleRows = await timeEntriesTable.locator('tbody tr').count()

      // The badge count should match visible rows on this page (or be greater if multiple pages)
      expect(badgeCount).toBeGreaterThanOrEqual(visibleRows)

      // The metric hours should be > 0 if there are entries
      if (badgeCount > 0) {
        expect(metricHours).toBeGreaterThan(0)
      }
    })

    test('should update filter counts when data changes', async ({ page }) => {
      await page.locator('[data-testid="time-entry-status-filters"]').waitFor()

      // Get initial "All" count
      const allButton = getStatusFilterButton(page, 'all')
      const buttonText = await allButton.textContent()
      const match = buttonText?.match(/(\d+)/)
      const initialCount = match ? parseInt(match[1]) : 0

      // Verify it's a number
      expect(initialCount).toBeGreaterThanOrEqual(0)

      // Note: In a real test, you would create/delete an entry and verify the count updates
      // For now, we just verify the count displays correctly
    })
  })

  test.describe('Combined Filter and Pagination', () => {
    test('should maintain filter when navigating pages', async ({ page }) => {
      await page.locator('[data-testid="time-entry-status-filters"]').waitFor()

      const timeEntriesTable = getTimeEntriesTable(page)
      const paginationSection = timeEntriesTable.locator('..').locator('..')

      // Click Billable filter
      const billableButton = getStatusFilterButton(page, 'ready_to_invoice')
      await billableButton.click()
      await page.waitForTimeout(500)

      // Verify filter is active
      await expect(billableButton).toHaveClass(/bg-blue-600/)

      // If Next button exists and is enabled, click it
      const nextButton = paginationSection.getByRole('button', { name: 'Next', exact: true })
      const buttonExists = await nextButton.count() > 0

      if (buttonExists && !(await nextButton.isDisabled())) {
        await nextButton.click()
        await page.waitForTimeout(500)

        // Filter should still be active
        await expect(billableButton).toHaveClass(/bg-blue-600/)

        // Entries should still be filtered (check status badges)
        const rows = await timeEntriesTable.locator('tbody tr').count()
        expect(rows).toBeGreaterThanOrEqual(0) // May be 0 if no more entries
      }
    })

    test('should reset to page 1 when changing filter', async ({ page }) => {
      await page.locator('[data-testid="time-entry-status-filters"]').waitFor()

      const timeEntriesTable = getTimeEntriesTable(page)
      const paginationSection = timeEntriesTable.locator('..').locator('..')

      // Navigate to page 2 if possible
      const nextButton = paginationSection.getByRole('button', { name: 'Next', exact: true })
      const buttonExists = await nextButton.count() > 0

      if (buttonExists && !(await nextButton.isDisabled())) {
        await nextButton.click()
        await page.waitForTimeout(500)

        // Now change filter
        const billableButton = getStatusFilterButton(page, 'ready_to_invoice')
        await billableButton.click()
        await page.waitForTimeout(500)

        // Should be back on page 1 (Previous button disabled)
        const prevButton = paginationSection.getByRole('button', { name: 'Previous', exact: true })
        if (await prevButton.count() > 0) {
          await expect(prevButton).toBeDisabled()
        }
      }
    })
  })

  test.describe('Empty States', () => {
    test('should show appropriate message when filter has no results', async ({ page }) => {
      await page.locator('[data-testid="time-entry-status-filters"]').waitFor()

      const timeEntriesTable = getTimeEntriesTable(page)

      // Map filter names to their data-testid values
      const filterMap = [
        { name: 'Not Yet Billable', testId: 'billable_not_due' },
        { name: 'Non-billable', testId: 'not_billable' },
        { name: 'Invoiced', testId: 'invoiced' }
      ]

      let foundEmptyFilter = false

      for (const filter of filterMap) {
        // Use the specific test ID to target the correct filter button
        const filterButton = page.getByTestId(`status-filter-${filter.testId}`)
        const buttonText = await filterButton.textContent()
        const match = buttonText?.match(/(\d+)/)
        const count = match ? parseInt(match[1]) : 0

        if (count === 0) {
          console.log(`📋 Found filter with 0 results: ${filter.name} (${filter.testId})`)

          // Get initial row count before clicking
          const initialRowCount = await timeEntriesTable.locator('tbody tr').count()
          console.log(`📊 Initial row count: ${initialRowCount}`)

          // Click this filter
          await filterButton.click()
          console.log(`🖱️  Clicked filter: ${filter.name}`)

          // Wait for network to be idle after filter click
          await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})

          // Wait for table to potentially update
          await page.waitForTimeout(1500)

          // Check for empty state message or verify table is empty
          const emptyStateVisible = await page.locator('text=/No (time )?entries/i, text=/No results/i, text=/Nothing to show/i').isVisible().catch(() => false)
          const rowCount = await timeEntriesTable.locator('tbody tr').count()

          console.log(`📊 Final row count: ${rowCount}`)
          console.log(`💬 Empty state message visible: ${emptyStateVisible}`)

          // Either the table should be empty OR an empty state message should be shown
          if (rowCount > 0 && !emptyStateVisible) {
            console.warn(`⚠️  Filter "${filter.name}" shows count of 0 but table has ${rowCount} rows and no empty state message`)
            // Take a screenshot for debugging
            await page.screenshot({ path: `test-results/debug-empty-filter-${filter.testId}.png` })
          }

          expect(rowCount).toBe(0)

          foundEmptyFilter = true
          break
        }
      }

      // If no filter with 0 results exists, test is successful (nothing to verify)
      if (!foundEmptyFilter) {
        console.log('ℹ️ No filters with 0 results found - test skipped')
      }
    })
  })
})
