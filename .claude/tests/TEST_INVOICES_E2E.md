# E2E Test Documentation: Invoices Page

**Document Version:** 1.0
**Date:** 2025-11-11
**Page:** `/dashboard/financieel-v2/facturen` (Invoices)
**Test Framework:** Playwright with TypeScript

---

## Overview

This document describes the E2E test implementation for the invoices page, covering 26 comprehensive tests across core functionality, payment management, and advanced features.

### Test Coverage Summary

| Test File | Tests | Focus Area | Priority |
|-----------|-------|------------|----------|
| `invoices-page.spec.ts` | 15 | Core functionality, CRUD, filtering | ⭐⭐⭐⭐⭐ |
| `invoices-payments.spec.ts` | 6 | Payment recording & management | ⭐⭐⭐⭐ |
| `invoices-advanced.spec.ts` | 5 | Templates, PDF, exports | ⭐⭐⭐ |
| **Total** | **26** | **Complete invoice workflows** | **HIGH** |

---

## Test Strategy

### Data Management Approach

**Strategy:** API-Created Data with Cleanup
**Rationale:** Ensures test isolation, easier debugging, follows expenses-page pattern

**Pattern:**
```typescript
test.describe.serial('Invoice Tests', () => {
  const testData = {
    clientIds: [] as string[],
    invoiceIds: [] as string[]
  }

  test.beforeAll(async ({ page }) => {
    await loginToApplication(page)
    // Create reusable test client
    const clientId = await createClientViaAPI(page, {
      name: 'E2E Test Client',
      email: 'e2e-test@example.com'
    })
    testData.clientIds.push(clientId)
  })

  test.afterEach(async ({ page }) => {
    // Cleanup invoices created during test
    for (const id of testData.invoiceIds) {
      try {
        await page.request.delete(`/api/invoices/${id}`)
      } catch (e) {
        console.warn(`Failed to cleanup invoice ${id}`)
      }
    }
    testData.invoiceIds = []
  })

  test.afterAll(async ({ page }) => {
    // Cleanup clients
    for (const id of testData.clientIds) {
      try {
        await page.request.delete(`/api/clients/${id}`)
      } catch (e) {
        console.warn(`Failed to cleanup client ${id}`)
      }
    }
  })
})
```

### Execution Environments

#### Local Development
```bash
# Run all invoice tests (headed mode for debugging)
npx playwright test invoices- --project=chromium --headed

# Run specific test file
npx playwright test invoices-page --headed

# Interactive debugging UI
npx playwright test invoices- --ui

# Single test by name
npx playwright test invoices-page -g "should display all metric cards"
```

#### CI/CD Pipeline
```bash
# Headless, parallel execution with retries
npx playwright test invoices- --project=chromium --workers=4 --retries=2

# Generate reports
npx playwright test invoices- --reporter=html,json
npx playwright show-report
```

---

## Test Files Documentation

### 1. invoices-page.spec.ts (15 tests)

**Purpose:** Test core invoice page functionality
**Execution Time:** ~3-4 minutes
**Priority:** ⭐⭐⭐⭐⭐ Critical

#### Test Structure

```typescript
test.describe('Invoices Page - Core Functionality', () => {

  test.describe('Dashboard Metrics', () => {
    // 3 tests: Display, billable amount, overdue count
  })

  test.describe('Invoice List Display', () => {
    // 3 tests: Display data, empty state, pagination
  })

  test.describe('Invoice Filtering', () => {
    // 4 tests: Status, date range, client, search
  })

  test.describe('Invoice Creation', () => {
    // 3 tests: Wizard, manual form, validation
  })

  test.describe('Invoice Actions', () => {
    // 2 tests: Detail modal, deletion
  })
})
```

#### Key Test Cases

**Dashboard Metrics (3 tests)**
1. **Display all metric cards** - Verify 4 metric cards visible without skeleton loaders
2. **Calculate billable amount** - Create unbilled time entries, verify correct calculation
3. **Display overdue count** - Create overdue invoice, verify badge shows correct count

**Invoice List Display (3 tests)**
1. **Display invoices with data** - Create invoice via API, verify appears in list with correct details
2. **Show empty state** - Ensure no invoices exist, verify empty state message
3. **Paginate invoice list** - Create 15 invoices, verify pagination controls work

**Invoice Filtering (4 tests)**
1. **Filter by status** - Create invoices with different statuses, test filter dropdown
2. **Filter by date range** - Create invoices with different dates, test date picker filtering
3. **Filter by client** - Create invoices for different clients, test client dropdown
4. **Search by invoice number** - Create invoice with unique number, test search input

**Invoice Creation (3 tests)**
1. **Open comprehensive wizard** - Click "Create Invoice", verify wizard modal opens to Step 1
2. **Open manual invoice form** - Click "Manual Invoice", verify form opens with required fields
3. **Validate required fields** - Submit empty form, verify validation errors displayed

**Invoice Actions (2 tests)**
1. **Open invoice detail modal** - Click invoice row, verify detail modal displays correct data
2. **Delete invoice** - Create draft invoice, delete with confirmation, verify removed from list

---

### 2. invoices-payments.spec.ts (6 tests)

**Purpose:** Test payment recording and management
**Execution Time:** ~2 minutes
**Priority:** ⭐⭐⭐⭐ High

#### Test Structure

```typescript
test.describe('Invoice Payment Management', () => {
  // 6 tests covering full payment lifecycle
})
```

#### Key Test Cases

1. **Record full payment** - Create €1000 invoice, record €1000 payment, verify status → paid
2. **Record partial payment** - Create €1000 invoice, record €400 payment, verify balance = €600
3. **Handle multiple partial payments** - Record €400, then €600, verify status → paid
4. **Send payment reminder** - Create overdue invoice, send reminder, verify confirmation
5. **Manually mark as paid** - Create sent invoice, mark as paid without payment record
6. **View payment history** - Create invoice with payments, verify history displays correctly

---

### 3. invoices-advanced.spec.ts (5 tests)

**Purpose:** Test advanced invoice features
**Execution Time:** ~2 minutes
**Priority:** ⭐⭐⭐ Medium

#### Test Structure

```typescript
test.describe('Invoice Advanced Features', () => {
  // 5 tests covering templates, PDF, exports
})
```

#### Key Test Cases

1. **Apply invoice template** - Create template via API, open invoice form, select template, verify pre-filled
2. **Customize VAT and payment terms** - Set custom VAT rate (9%), payment terms (14 days), verify calculations
3. **Generate PDF preview** - Create invoice, click "Preview PDF", verify PDF opens/downloads
4. **Send invoice via email** - Create invoice, open email dialog, send, verify confirmation
5. **Export invoices to CSV** - Create multiple invoices, click "Export CSV", verify file downloads with correct data

---

## Helper Functions

### Location: `src/__tests__/e2e/helpers/invoice-helpers.ts`

#### Core Functions

```typescript
/**
 * Create invoice via API for testing
 * @returns Invoice ID
 */
async function createInvoiceViaAPI(
  page: Page,
  data: {
    clientId: string
    amount: number
    status?: 'draft' | 'sent' | 'paid'
    dueDate?: string
  }
): Promise<string>

/**
 * Find invoice by number in list
 */
async function findInvoiceByNumber(
  page: Page,
  invoiceNumber: string
): Promise<Locator>

/**
 * Wait for invoice metrics to load
 */
async function waitForInvoiceMetrics(page: Page): Promise<void>

/**
 * Record payment for invoice
 */
async function recordPayment(
  page: Page,
  amount: number,
  paymentDate?: string
): Promise<void>

/**
 * Update invoice status
 */
async function updateInvoiceStatus(
  page: Page,
  newStatus: 'draft' | 'sent' | 'paid' | 'cancelled'
): Promise<void>

/**
 * Delete invoice with confirmation
 */
async function deleteInvoice(page: Page): Promise<void>

/**
 * Cleanup invoices created during tests
 */
async function cleanupInvoices(
  page: Page,
  invoiceIds: string[]
): Promise<void>
```

### Location: `src/__tests__/e2e/helpers/client-helpers.ts`

#### Core Functions

```typescript
/**
 * Create client via API for testing
 * @returns Client ID
 */
async function createClientViaAPI(
  page: Page,
  data: {
    name: string
    email?: string
    vat_number?: string
    hourlyRate?: number
  }
): Promise<string>

/**
 * Find client by name in list
 */
async function findClientByName(
  page: Page,
  name: string
): Promise<Locator>

/**
 * Wait for client metrics to load
 */
async function waitForClientMetrics(page: Page): Promise<void>

/**
 * Search for client
 */
async function searchClient(
  page: Page,
  searchTerm: string
): Promise<void>

/**
 * Delete client with confirmation
 */
async function deleteClient(
  page: Page,
  clientName: string
): Promise<void>
```

---

## Test Data Patterns

### Client Creation

```typescript
const testClient = {
  name: 'E2E Test Client',
  email: 'e2e-test@example.com',
  vat_number: 'NL123456789B01',
  default_hourly_rate: 75
}

const clientId = await createClientViaAPI(page, testClient)
```

### Invoice Creation

```typescript
const testInvoice = {
  clientId: clientId,
  amount: 1000,
  status: 'draft',
  dueDate: '2025-12-31'
}

const invoiceId = await createInvoiceViaAPI(page, testInvoice)
```

### Time Entry Creation (for billable amount tests)

```typescript
const timeEntry = {
  client_id: clientId,
  project_id: projectId,
  hours: 8,
  hourly_rate: 75,
  invoiced: false,
  date: '2025-11-11'
}

await page.request.post('/api/time-entries', { data: timeEntry })
```

---

## Selectors & Page Elements

### Common Selectors

```typescript
// Metric Cards
const metricCards = page.locator('[data-testid="metric-card"]')
const billableAmountCard = page.locator('text=Billable Amount')
const overdueCard = page.locator('text=Overdue')

// Invoice List
const invoiceTable = page.locator('table')
const invoiceRows = page.locator('tbody tr')
const paginationControls = page.locator('[data-testid="pagination"]')

// Filters
const statusFilter = page.locator('[data-testid="status-filter"]')
const dateRangeFilter = page.locator('[data-testid="date-range-filter"]')
const clientFilter = page.locator('[data-testid="client-filter"]')
const searchInput = page.locator('input[placeholder*="Search"]')

// Buttons
const createInvoiceButton = page.locator('button:has-text("Create Invoice")')
const manualInvoiceButton = page.locator('button:has-text("Manual Invoice")')
const deleteButton = page.locator('button:has-text("Delete")')

// Modals
const wizardModal = page.locator('[data-testid="invoicing-wizard"]')
const invoiceDetailModal = page.locator('[data-testid="invoice-detail-modal"]')
const confirmDialog = page.locator('dialog')

// Status Badges
const draftBadge = page.locator('.badge:has-text("Draft")')
const sentBadge = page.locator('.badge:has-text("Sent")')
const paidBadge = page.locator('.badge:has-text("Paid")')
const overdueBadge = page.locator('.badge:has-text("Overdue")')
```

---

## Error Handling Patterns

### API Error Handling

```typescript
test('should handle API errors gracefully', async ({ page }) => {
  // Mock API failure
  await page.route('**/api/invoices', route => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    })
  })

  await page.goto('/dashboard/financieel-v2/facturen')

  // Verify error message displayed
  await expect(page.locator('text=Failed to load invoices')).toBeVisible()

  // Verify page doesn't crash
  await expect(page.locator('body')).toBeVisible()
})
```

### Validation Error Handling

```typescript
test('should validate required fields', async ({ page }) => {
  await page.goto('/dashboard/financieel-v2/facturen')
  await page.click('button:has-text("Manual Invoice")')

  // Submit without filling required fields
  await page.click('button:has-text("Save")')

  // Verify validation errors displayed
  await expect(page.locator('text=Client is required')).toBeVisible()
  await expect(page.locator('text=Invoice date is required')).toBeVisible()

  // Verify invoice not created
  const response = await page.request.get('/api/invoices')
  const data = await response.json()
  expect(data.invoices.length).toBe(0)
})
```

---

## Performance Benchmarks

### Target Execution Times

| Test File | Tests | Target Time | Max Acceptable |
|-----------|-------|-------------|----------------|
| `invoices-page.spec.ts` | 15 | 3 min | 5 min |
| `invoices-payments.spec.ts` | 6 | 2 min | 3 min |
| `invoices-advanced.spec.ts` | 5 | 2 min | 3 min |
| **Total** | **26** | **7 min** | **10 min** |

### Optimization Strategies

1. **Parallel Execution** - Run independent test files in parallel (CI only)
2. **API Data Creation** - Faster than UI interactions
3. **Shared Test Data** - Reuse clients across tests
4. **Selective Waiting** - Wait only for specific elements, not arbitrary timeouts
5. **Efficient Cleanup** - Delete via API, not UI

---

## Debugging Tips

### Local Debugging

```bash
# Run with headed browser
npx playwright test invoices- --headed

# Interactive UI mode
npx playwright test invoices- --ui

# Debug specific test
npx playwright test invoices-page --debug -g "should display all metric cards"

# Generate trace
npx playwright test invoices- --trace on
```

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| **Timeout waiting for element** | Increase timeout, check selector, verify element exists |
| **Flaky tests** | Add explicit waits, check for race conditions, verify API responses |
| **Test data conflicts** | Verify cleanup working, use unique identifiers |
| **Authentication failures** | Check Clerk configuration, verify test user exists |
| **API errors** | Check network tab, verify endpoint URLs, check RLS policies |

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: E2E Tests - Invoices

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    timeout-minutes: 15
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run invoice E2E tests
        run: npx playwright test invoices- --project=chromium --workers=4 --retries=2
        env:
          CI: true
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

---

## Maintenance & Updates

### When to Update Tests

- **API changes** - Update helper functions and test data structures
- **UI changes** - Update selectors and interaction patterns
- **New features** - Add new test cases
- **Bug fixes** - Add regression tests

### Test Review Checklist

- [ ] All tests pass locally
- [ ] All tests pass in CI
- [ ] Test execution time within targets
- [ ] No flaky tests (3 consecutive runs)
- [ ] Cleanup verified (no leftover data)
- [ ] Documentation updated
- [ ] Selectors updated if UI changed

---

## Success Metrics

### Test Quality Indicators

- ✅ **Pass Rate:** 100% (26/26 tests passing)
- ✅ **Execution Time:** < 10 minutes total
- ✅ **Flakiness:** 0% (no intermittent failures)
- ✅ **Code Coverage:** 85%+ of invoice workflows
- ✅ **Maintenance:** < 1 hour per month

### Business Value

- ✅ **Critical Path Coverage:** Invoice creation, payment, status management
- ✅ **Regression Prevention:** Automated testing prevents production bugs
- ✅ **Confidence:** Safe refactoring and feature development
- ✅ **Documentation:** Living documentation of invoice workflows

---

**Document End** - Ready for test implementation
