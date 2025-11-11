# Test Recommendations: Invoices & Clients Pages

**Document Version:** 1.0
**Date:** 2025-11-11
**Pages Covered:**
- `/dashboard/financieel-v2/facturen` (Invoices)
- `/dashboard/financieel-v2/klanten` (Clients)

---

## Executive Summary

### Current State
- ✅ **Expenses page:** Comprehensive E2E coverage (34 tests across 4 files)
- ✅ **Time tracking page:** Comprehensive E2E coverage (13 tests)
- ✅ **Invoice business logic:** Unit tests exist (35 tests)
- ❌ **Invoices page:** 0% E2E coverage
- ❌ **Clients page:** 0% E2E coverage
- ❌ **Client business logic:** 0% unit test coverage

### Critical Gaps Identified
1. **No E2E tests for invoices page workflows** (wizard, payments, status updates)
2. **No E2E tests for clients page workflows** (creation, editing, project management)
3. **No unit tests for client business logic** (validation, calculations)

### Recommended Test Suite
- **Total Tests:** 73 (53 E2E + 20 unit)
- **Estimated Effort:** 15 working days (3 weeks)
- **Priority:** HIGH (business-critical financial functionality)

---

## Test Coverage Analysis

### Existing Test Infrastructure

#### E2E Tests (Playwright)
```
src/__tests__/e2e/
├── expenses-page.spec.ts              (16 tests) ✅
├── expenses-filters.spec.ts           (6 tests)  ✅
├── expenses-recurring.spec.ts         (5 tests)  ✅
├── expenses-advanced-form.spec.ts     (7 tests)  ✅
├── tijd-page-comprehensive.spec.ts    (13 tests) ✅
├── invoices-*.spec.ts                 (0 tests)  ❌ MISSING
└── clients-*.spec.ts                  (0 tests)  ❌ MISSING
```

#### Unit Tests
```
src/__tests__/unit/
├── financial/
│   ├── invoices.test.ts               (35 tests) ✅
│   ├── expenses.test.ts               (30+ tests) ✅
│   └── clients.test.ts                (0 tests)  ❌ MISSING
```

#### Integration Tests
```
src/__tests__/integration/
├── financial-api.test.ts              ✅
├── time-tracking-api.test.ts          ✅
└── database/rls-policies.integration.test.ts ✅
```

### Test Patterns Discovered

#### Best Practices from Existing Tests
1. **Sequential Workflows** - Dependent operations executed in order
2. **Seeded Data Strategy** - Pre-populated data for faster execution (tijd page)
3. **API Cleanup** - `afterEach` hooks remove test data
4. **Reusable Helpers** - `helpers/ui-interactions.ts` for common actions
5. **Multiple Selectors** - Fallback strategies for element selection
6. **Network Capture** - Extract IDs from API responses
7. **Bilingual Support** - English/Dutch UI text handling

#### Helper Functions Available
```typescript
// Authentication
loginToApplication(page: Page)
checkIfLoggedIn(page: Page): Promise<boolean>

// UI Interactions
clickDropdownOption(page, optionText)
clickNthDropdownOption(page, index)
clickCalendarDate(page, dayNumber)
clickNthCalendarDate(page, index)

// Expense-specific
waitForExpensesAfter(page, action)
searchAndExpandForDescription(page, description, date)
expandMonthGroup(page, monthDisplay)
```

---

## Page Structure Analysis

### Invoices Page (`/dashboard/financieel-v2/facturen`)

#### Components Hierarchy
```
InvoicePage
├── Metrics Cards (3)
│   ├── Billable Amount (ready for invoicing)
│   ├── Unbilled Amount (total)
│   └── Overdue Amount + Count
├── Action Cards (3)
│   ├── Templates Management
│   ├── Payment Reminders
│   └── VAT Overview
└── Main Features
    ├── InvoiceList (table with filters)
    ├── ComprehensiveInvoicingWizard (multi-step)
    ├── ClientInvoiceWizard (client-specific)
    ├── InvoiceForm (manual creation/editing)
    └── InvoiceDetailModal (view/manage)
```

#### API Endpoints
```
GET    /api/invoices/dashboard-metrics
GET    /api/invoices (with filters: status, dateFrom, dateTo, clientId)
POST   /api/invoices
PUT    /api/invoices/:id
PUT    /api/invoices/:id/status
DELETE /api/invoices/:id
```

#### Key User Workflows
1. **View dashboard metrics** → Billable amount, overdue invoices
2. **Create invoice via wizard** → Select client → Review time → Configure → Preview
3. **Manual invoice creation** → Open form → Fill details → Save
4. **Filter invoices** → By status, date range, client
5. **Update invoice status** → Draft → Sent → Paid
6. **Record payment** → Full/partial payment → Update balance
7. **Delete invoice** → Confirm deletion → Remove from list

### Clients Page (`/dashboard/financieel-v2/klanten`)

#### Components Hierarchy
```
ClientsPage
├── Metrics Cards (3)
│   ├── Active Clients Count
│   ├── Active Projects Count
│   └── Average Hourly Rate
└── Main Features
    ├── ClientList (table with search/filter)
    ├── ClientForm (create/edit with address, VAT)
    └── Client Detail Modals
```

#### API Endpoints
```
GET    /api/clients/stats
GET    /api/clients
POST   /api/clients
PUT    /api/clients/:id
DELETE /api/clients/:id
```

#### Key User Workflows
1. **View client metrics** → Active count, avg hourly rate
2. **Create client** → Fill form → Validate VAT → Save
3. **Search clients** → By name/email
4. **Edit client** → Update details → Save
5. **Manage projects** → Add/edit/archive projects
6. **Delete client** → Confirm deletion → Remove

---

## Phase 1: Invoices Page E2E Tests

### File 1: `invoices-page.spec.ts` (Core Functionality)

**Purpose:** Test fundamental invoice page features
**Estimated Tests:** 15
**Execution Time:** ~3 minutes

#### Test Cases

```typescript
describe('Invoices Page - Core Functionality', () => {

  describe('Dashboard Metrics', () => {
    test('should display all three metric cards without loading state', async ({ page }) => {
      // Navigate to invoices page
      // Verify 3 metric cards visible
      // Verify no skeleton loaders
    })

    test('should calculate billable amount correctly from unbilled time', async ({ page }) => {
      // Create time entries via API
      // Navigate to invoices page
      // Verify billable amount matches sum of unbilled time * hourly rate
    })

    test('should display overdue invoices count with accurate data', async ({ page }) => {
      // Create overdue invoice via API
      // Navigate to invoices page
      // Verify overdue count badge shows correct number
    })
  })

  describe('Invoice List Display', () => {
    test('should display invoices in list with correct data', async ({ page }) => {
      // Create invoice via API
      // Navigate to invoices page
      // Verify invoice appears in list
      // Verify correct number, client, amount, status
    })

    test('should show empty state when no invoices exist', async ({ page }) => {
      // Ensure no invoices exist
      // Navigate to invoices page
      // Verify empty state message
    })

    test('should paginate invoice list when > 10 invoices', async ({ page }) => {
      // Create 15 invoices via API
      // Navigate to invoices page
      // Verify pagination controls visible
      // Click next page, verify different invoices shown
    })
  })

  describe('Invoice Filtering', () => {
    test('should filter invoices by status (draft, sent, paid)', async ({ page }) => {
      // Create invoices with different statuses via API
      // Navigate to invoices page
      // Select "Paid" filter
      // Verify only paid invoices shown
    })

    test('should filter invoices by date range', async ({ page }) => {
      // Create invoices with different dates via API
      // Navigate to invoices page
      // Set date range filter (last 30 days)
      // Verify only invoices within range shown
    })

    test('should filter invoices by client', async ({ page }) => {
      // Create invoices for different clients via API
      // Navigate to invoices page
      // Select client filter
      // Verify only invoices for that client shown
    })

    test('should search invoices by invoice number or description', async ({ page }) => {
      // Create invoice with unique description
      // Navigate to invoices page
      // Type search query
      // Verify matching invoice shown
    })
  })

  describe('Invoice Creation', () => {
    test('should open comprehensive invoicing wizard', async ({ page }) => {
      // Navigate to invoices page
      // Click "Create Invoice" button
      // Verify wizard modal opens
      // Verify Step 1 (Select Client) visible
    })

    test('should open manual invoice form', async ({ page }) => {
      // Navigate to invoices page
      // Click "Manual Invoice" option
      // Verify invoice form opens
      // Verify required fields present
    })

    test('should validate required fields when creating invoice', async ({ page }) => {
      // Open invoice form
      // Submit without filling required fields
      // Verify validation errors displayed
      // Verify invoice not created
    })
  })

  describe('Invoice Actions', () => {
    test('should open invoice detail modal when clicking invoice', async ({ page }) => {
      // Create invoice via API
      // Navigate to invoices page
      // Click invoice row
      // Verify detail modal opens
      // Verify invoice data displayed correctly
    })

    test('should update invoice status from detail modal', async ({ page }) => {
      // Create draft invoice via API
      // Navigate to invoices page
      // Open invoice detail modal
      // Change status to "Sent"
      // Verify status updated in UI and database
    })

    test('should delete invoice with confirmation', async ({ page }) => {
      // Create invoice via API
      // Navigate to invoices page
      // Click delete button
      // Confirm deletion
      // Verify invoice removed from list
    })
  })

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API failure
      // Navigate to invoices page
      // Verify error message displayed
      // Verify page doesn't crash
    })
  })
})
```

**Priority:** ⭐⭐⭐⭐⭐ (Critical)

---

### File 2: `invoices-wizard.spec.ts` (Wizard Workflow)

**Purpose:** Test multi-step comprehensive invoicing wizard
**Estimated Tests:** 8
**Execution Time:** ~2 minutes

#### Test Cases

```typescript
describe('Comprehensive Invoicing Wizard', () => {

  test('should complete Step 1: Select client for invoicing', async ({ page }) => {
    // Create client with unbilled time via API
    // Navigate to invoices page
    // Open wizard
    // Select client from list
    // Verify client selected, Next button enabled
  })

  test('should complete Step 2: Review unbilled time entries', async ({ page }) => {
    // Complete Step 1
    // Verify unbilled time entries displayed
    // Select/deselect entries
    // Verify total amount updates
    // Click Next
  })

  test('should complete Step 3: Configure invoice details', async ({ page }) => {
    // Complete Steps 1-2
    // Set invoice number, date, due date
    // Add custom line items
    // Configure VAT settings
    // Verify calculations correct
  })

  test('should complete Step 4: Preview invoice before creation', async ({ page }) => {
    // Complete Steps 1-3
    // Verify preview shows all details
    // Verify totals match configuration
    // Click "Create Invoice"
  })

  test('should create invoice successfully after wizard completion', async ({ page }) => {
    // Complete all 4 steps
    // Verify success message
    // Verify invoice appears in list
    // Verify database record created
  })

  test('should allow cancellation at any wizard step', async ({ page }) => {
    // Open wizard
    // Progress to Step 2
    // Click Cancel
    // Verify wizard closes
    // Verify no invoice created
  })

  test('should validate required fields per wizard step', async ({ page }) => {
    // Open wizard
    // Try to proceed without selecting client (Step 1)
    // Verify validation error
    // Verify cannot proceed
  })

  test('should handle errors during invoice generation', async ({ page }) => {
    // Complete wizard to final step
    // Mock API error
    // Click Create Invoice
    // Verify error message displayed
    // Verify user can retry or cancel
  })
})
```

**Priority:** ⭐⭐⭐⭐ (High)

---

### File 3: `invoices-payments.spec.ts` (Payment Management)

**Purpose:** Test payment recording and management
**Estimated Tests:** 6
**Execution Time:** ~2 minutes

#### Test Cases

```typescript
describe('Invoice Payment Management', () => {

  test('should record full payment for invoice', async ({ page }) => {
    // Create sent invoice via API (€1000)
    // Navigate to invoices page
    // Open invoice detail modal
    // Click "Record Payment"
    // Enter full amount (€1000)
    // Verify status changes to "Paid"
    // Verify balance = €0
  })

  test('should record partial payment for invoice', async ({ page }) => {
    // Create sent invoice via API (€1000)
    // Navigate to invoices page
    // Open invoice detail modal
    // Click "Record Payment"
    // Enter partial amount (€400)
    // Verify status remains "Sent"
    // Verify balance = €600
  })

  test('should handle multiple partial payments', async ({ page }) => {
    // Create sent invoice via API (€1000)
    // Record first payment (€400)
    // Verify balance = €600
    // Record second payment (€600)
    // Verify status changes to "Paid"
    // Verify balance = €0
  })

  test('should send payment reminder for overdue invoice', async ({ page }) => {
    // Create overdue invoice via API
    // Navigate to invoices page
    // Open invoice detail modal
    // Click "Send Reminder"
    // Verify confirmation message
    // Verify reminder sent (check logs/API)
  })

  test('should manually mark invoice as paid', async ({ page }) => {
    // Create sent invoice via API
    // Navigate to invoices page
    // Open invoice detail modal
    // Click "Mark as Paid"
    // Verify status changes to "Paid"
    // Verify no payment record created
  })

  test('should view payment history for invoice', async ({ page }) => {
    // Create invoice with payments via API
    // Navigate to invoices page
    // Open invoice detail modal
    // View payment history
    // Verify all payments listed with dates/amounts
  })
})
```

**Priority:** ⭐⭐⭐⭐ (High)

---

### File 4: `invoices-advanced.spec.ts` (Advanced Features)

**Purpose:** Test templates, exports, and advanced functionality
**Estimated Tests:** 5
**Execution Time:** ~2 minutes

#### Test Cases

```typescript
describe('Invoice Advanced Features', () => {

  test('should apply invoice template to new invoice', async ({ page }) => {
    // Create invoice template via API
    // Navigate to invoices page
    // Open invoice form
    // Select template
    // Verify template data pre-filled
  })

  test('should customize invoice details (VAT, payment terms)', async ({ page }) => {
    // Open invoice form
    // Set custom VAT rate (9% instead of 21%)
    // Set payment terms (14 days)
    // Verify calculations use custom VAT
    // Verify due date = invoice date + 14 days
  })

  test('should generate PDF preview of invoice', async ({ page }) => {
    // Create invoice via API
    // Navigate to invoices page
    // Open invoice detail modal
    // Click "Preview PDF"
    // Verify PDF opens/downloads
  })

  test('should send invoice via email', async ({ page }) => {
    // Create invoice via API
    // Navigate to invoices page
    // Open invoice detail modal
    // Click "Send via Email"
    // Verify email dialog opens
    // Send email
    // Verify confirmation message
  })

  test('should export invoices to CSV', async ({ page }) => {
    // Create multiple invoices via API
    // Navigate to invoices page
    // Click "Export to CSV"
    // Verify CSV file downloads
    // Verify CSV contains correct invoice data
  })
})
```

**Priority:** ⭐⭐⭐ (Medium)

---

## Phase 2: Clients Page E2E Tests

### File 1: `clients-page.spec.ts` (Core Functionality)

**Purpose:** Test fundamental client page features
**Estimated Tests:** 12
**Execution Time:** ~3 minutes

#### Test Cases

```typescript
describe('Clients Page - Core Functionality', () => {

  describe('Dashboard Metrics', () => {
    test('should display all three metric cards', async ({ page }) => {
      // Navigate to clients page
      // Verify 3 metric cards visible
      // Verify Active Clients count
      // Verify Active Projects count
      // Verify Average Hourly Rate
    })

    test('should calculate average hourly rate correctly', async ({ page }) => {
      // Create clients with projects and rates via API
      // Navigate to clients page
      // Verify average hourly rate calculation correct
    })
  })

  describe('Client List Display', () => {
    test('should display clients in list with correct data', async ({ page }) => {
      // Create client via API
      // Navigate to clients page
      // Verify client appears in list
      // Verify name, email, projects count displayed
    })

    test('should show empty state when no clients exist', async ({ page }) => {
      // Ensure no clients exist
      // Navigate to clients page
      // Verify empty state message
    })

    test('should search clients by name', async ({ page }) => {
      // Create clients via API
      // Navigate to clients page
      // Type search query in search field
      // Verify matching clients shown
      // Verify non-matching clients hidden
    })

    test('should filter clients by status (active/inactive)', async ({ page }) => {
      // Create active and inactive clients via API
      // Navigate to clients page
      // Select "Active" filter
      // Verify only active clients shown
    })
  })

  describe('Client Creation', () => {
    test('should create new client with valid data', async ({ page }) => {
      // Navigate to clients page
      // Click "Add Client" button
      // Fill form (name, email, address, VAT)
      // Submit form
      // Verify client appears in list
      // Verify database record created
    })

    test('should validate VAT number (valid EU format)', async ({ page }) => {
      // Open client form
      // Enter valid VAT number (e.g., NL123456789B01)
      // Submit form
      // Verify VAT validation passes
      // Verify client created
    })

    test('should handle invalid VAT number', async ({ page }) => {
      // Open client form
      // Enter invalid VAT number
      // Submit form
      // Verify validation error displayed
      // Verify client not created
    })

    test('should show validation errors for required fields', async ({ page }) => {
      // Open client form
      // Submit without filling required fields
      // Verify validation errors displayed
      // Verify client not created
    })
  })

  describe('Client Editing', () => {
    test('should edit existing client', async ({ page }) => {
      // Create client via API
      // Navigate to clients page
      // Click edit button
      // Update client name
      // Save changes
      // Verify client updated in list
      // Verify database record updated
    })

    test('should delete client with confirmation', async ({ page }) => {
      // Create client via API
      // Navigate to clients page
      // Click delete button
      // Confirm deletion
      // Verify client removed from list
      // Verify database record deleted
    })
  })
})
```

**Priority:** ⭐⭐⭐⭐⭐ (Critical)

---

### File 2: `clients-projects.spec.ts` (Project Management)

**Purpose:** Test project management within client context
**Estimated Tests:** 7
**Execution Time:** ~2 minutes

#### Test Cases

```typescript
describe('Client Project Management', () => {

  test('should view client projects in detail view', async ({ page }) => {
    // Create client with projects via API
    // Navigate to clients page
    // Click client to view details
    // Verify projects list displayed
    // Verify project names, hourly rates shown
  })

  test('should create new project for client', async ({ page }) => {
    // Create client via API
    // Navigate to clients page
    // Open client details
    // Click "Add Project"
    // Fill project form (name, hourly rate)
    // Save project
    // Verify project appears in client's project list
  })

  test('should edit project details', async ({ page }) => {
    // Create client with project via API
    // Navigate to clients page
    // Open client details
    // Click edit on project
    // Update hourly rate
    // Save changes
    // Verify project updated
  })

  test('should delete project from client', async ({ page }) => {
    // Create client with project via API
    // Navigate to clients page
    // Open client details
    // Click delete on project
    // Confirm deletion
    // Verify project removed
  })

  test('should set different hourly rate per project', async ({ page }) => {
    // Create client via API
    // Add project with €75/hr rate
    // Add second project with €100/hr rate
    // Verify both projects show correct rates
    // Verify average rate calculation includes both
  })

  test('should archive completed project', async ({ page }) => {
    // Create client with project via API
    // Navigate to clients page
    // Open client details
    // Click archive on project
    // Verify project marked as archived
    // Verify project hidden from active list
  })

  test('should view project statistics (time logged, invoiced)', async ({ page }) => {
    // Create client with project + time entries via API
    // Navigate to clients page
    // Open client details
    // View project stats
    // Verify hours logged displayed
    // Verify amount invoiced displayed
  })
})
```

**Priority:** ⭐⭐⭐⭐ (High)

---

## Phase 3: Unit Tests Enhancement

### File: `clients.test.ts` (Client Business Logic)

**Purpose:** Test client validation, calculations, and business rules
**Estimated Tests:** 20
**Execution Time:** < 1 minute

#### Test Categories

```typescript
describe('Client Business Logic', () => {

  describe('Client Validation', () => {
    // Test valid client data
    // Test invalid client name (empty, too long)
    // Test invalid email format
    // Test required fields enforcement
  })

  describe('VAT Number Validation', () => {
    // Test valid NL VAT number format
    // Test valid BE, DE, FR VAT formats
    // Test invalid VAT format
    // Test VIES validation (if implemented)
    // Test empty VAT number (should be allowed)
  })

  describe('Hourly Rate Calculations', () => {
    // Test average rate with single project
    // Test average rate with multiple projects
    // Test average rate with archived projects (excluded)
    // Test average rate with no projects (should be 0)
  })

  describe('Project Association Logic', () => {
    // Test adding project to client
    // Test removing project from client
    // Test client with no projects
    // Test project count calculation
  })

  describe('Client Status Transitions', () => {
    // Test active → inactive transition
    // Test inactive → active transition
    // Test archive client with active projects (should fail)
  })

  describe('Address Formatting', () => {
    // Test full address formatting
    // Test address with missing fields
    // Test international address formats
  })

  describe('Client Metrics Calculations', () => {
    // Test total revenue per client
    // Test outstanding balance per client
    // Test project count (active vs total)
    // Test last invoice date
  })
})
```

**Priority:** ⭐⭐⭐ (Medium)

---

## Reusable Test Utilities

### Invoice Helpers (`src/__tests__/e2e/helpers/invoice-helpers.ts`)

```typescript
import { Page, expect } from '@playwright/test'

/**
 * Create invoice via API for testing
 */
export async function createInvoiceViaAPI(
  page: Page,
  data: {
    clientId: string
    amount: number
    status?: 'draft' | 'sent' | 'paid'
    dueDate?: string
  }
): Promise<string> {
  const response = await page.request.post('/api/invoices', {
    data: {
      client_id: data.clientId,
      amount: data.amount,
      status: data.status || 'draft',
      due_date: data.dueDate || new Date().toISOString(),
      invoice_date: new Date().toISOString(),
      line_items: [
        {
          description: 'Test Invoice Item',
          quantity: 1,
          unit_price: data.amount,
          vat_rate: 21,
        },
      ],
    },
  })

  expect(response.ok()).toBeTruthy()
  const invoice = await response.json()
  return invoice.id
}

/**
 * Find invoice by number in list
 */
export async function findInvoiceByNumber(
  page: Page,
  invoiceNumber: string
) {
  return page.locator(`tr:has-text("${invoiceNumber}")`).first()
}

/**
 * Wait for invoice metrics to load
 */
export async function waitForInvoiceMetrics(page: Page) {
  await page.waitForSelector('[data-testid="metric-card"]', {
    state: 'visible',
    timeout: 10000,
  })
  // Wait for skeleton loaders to disappear
  await page.waitForSelector('.animate-pulse', {
    state: 'hidden',
    timeout: 5000,
  })
}

/**
 * Select client in invoicing wizard
 */
export async function selectClientInWizard(
  page: Page,
  clientName: string
) {
  // Wait for wizard Step 1
  await page.waitForSelector('text=Select Client', { timeout: 5000 })

  // Click client row
  await page.click(`tr:has-text("${clientName}")`)

  // Verify client selected
  await expect(page.locator('.client-selected')).toBeVisible()
}

/**
 * Complete comprehensive invoicing wizard
 */
export async function completeInvoicingWizard(
  page: Page,
  options: {
    clientName: string
    selectAllTimeEntries?: boolean
    customLineItems?: Array<{ description: string; amount: number }>
  }
) {
  // Step 1: Select Client
  await selectClientInWizard(page, options.clientName)
  await page.click('button:has-text("Next")')

  // Step 2: Review Time Entries
  if (options.selectAllTimeEntries) {
    await page.click('input[type="checkbox"][aria-label="Select all"]')
  }
  await page.click('button:has-text("Next")')

  // Step 3: Configure Invoice
  if (options.customLineItems) {
    for (const item of options.customLineItems) {
      await page.click('button:has-text("Add Line Item")')
      await page.fill('input[name="description"]', item.description)
      await page.fill('input[name="amount"]', item.amount.toString())
    }
  }
  await page.click('button:has-text("Next")')

  // Step 4: Preview & Create
  await page.click('button:has-text("Create Invoice")')

  // Wait for success message
  await page.waitForSelector('text=Invoice created successfully', {
    timeout: 5000,
  })
}

/**
 * Record payment for invoice
 */
export async function recordPayment(
  page: Page,
  amount: number,
  paymentDate?: string
) {
  await page.click('button:has-text("Record Payment")')
  await page.fill('input[name="amount"]', amount.toString())

  if (paymentDate) {
    await page.fill('input[name="payment_date"]', paymentDate)
  }

  await page.click('button:has-text("Save Payment")')

  // Wait for confirmation
  await page.waitForSelector('text=Payment recorded', { timeout: 5000 })
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(
  page: Page,
  newStatus: 'draft' | 'sent' | 'paid' | 'cancelled'
) {
  await page.click('button:has-text("Change Status")')
  await page.click(`button:has-text("${newStatus}")`)

  // Wait for status update
  await page.waitForSelector(`text=Status updated to ${newStatus}`, {
    timeout: 5000,
  })
}

/**
 * Delete invoice with confirmation
 */
export async function deleteInvoice(page: Page) {
  await page.click('button:has-text("Delete")')

  // Confirm deletion in modal
  await page.click('dialog button:has-text("Confirm")')

  // Wait for deletion confirmation
  await page.waitForSelector('text=Invoice deleted', { timeout: 5000 })
}
```

---

### Client Helpers (`src/__tests__/e2e/helpers/client-helpers.ts`)

```typescript
import { Page, expect } from '@playwright/test'

/**
 * Create client via API for testing
 */
export async function createClientViaAPI(
  page: Page,
  data: {
    name: string
    email?: string
    vat_number?: string
    hourlyRate?: number
  }
): Promise<string> {
  const response = await page.request.post('/api/clients', {
    data: {
      name: data.name,
      email: data.email || `${data.name.toLowerCase()}@example.com`,
      vat_number: data.vat_number,
      default_hourly_rate: data.hourlyRate || 75,
      status: 'active',
    },
  })

  expect(response.ok()).toBeTruthy()
  const client = await response.json()
  return client.id
}

/**
 * Find client by name in list
 */
export async function findClientByName(page: Page, name: string) {
  return page.locator(`tr:has-text("${name}")`).first()
}

/**
 * Add project to client
 */
export async function addProjectToClient(
  page: Page,
  clientId: string,
  projectData: {
    name: string
    hourlyRate: number
  }
) {
  const response = await page.request.post(`/api/clients/${clientId}/projects`, {
    data: {
      name: projectData.name,
      hourly_rate: projectData.hourlyRate,
      status: 'active',
    },
  })

  expect(response.ok()).toBeTruthy()
  const project = await response.json()
  return project.id
}

/**
 * Validate VAT number via UI
 */
export async function validateVATNumber(
  page: Page,
  vatNumber: string
): Promise<boolean> {
  await page.fill('input[name="vat_number"]', vatNumber)
  await page.click('button:has-text("Validate VAT")')

  // Wait for validation result
  const successMessage = page.locator('text=VAT number is valid')
  const errorMessage = page.locator('text=Invalid VAT number')

  try {
    await successMessage.waitFor({ timeout: 3000 })
    return true
  } catch {
    await errorMessage.waitFor({ timeout: 1000 })
    return false
  }
}

/**
 * Wait for client metrics to load
 */
export async function waitForClientMetrics(page: Page) {
  await page.waitForSelector('[data-testid="client-metric-card"]', {
    state: 'visible',
    timeout: 10000,
  })

  // Wait for skeleton loaders to disappear
  await page.waitForSelector('.animate-pulse', {
    state: 'hidden',
    timeout: 5000,
  })
}

/**
 * Search for client
 */
export async function searchClient(page: Page, searchTerm: string) {
  await page.fill('input[placeholder*="Search"]', searchTerm)

  // Wait for debounce + results
  await page.waitForTimeout(500)
}

/**
 * Delete client with confirmation
 */
export async function deleteClient(page: Page, clientName: string) {
  const clientRow = await findClientByName(page, clientName)
  await clientRow.locator('button:has-text("Delete")').click()

  // Confirm deletion in modal
  await page.click('dialog button:has-text("Confirm")')

  // Wait for deletion confirmation
  await page.waitForSelector('text=Client deleted', { timeout: 5000 })
}
```

---

## Test Data Strategy

### Seeded Data Approach (Recommended)

Based on the tijd page tests, use pre-seeded data for faster, more reliable tests.

#### Seed Data Structure

```typescript
// src/__tests__/e2e/fixtures/seeded-data.ts

export const SEEDED_CLIENTS = {
  testClient1: {
    id: 'c1111111-1111-1111-1111-111111111111',
    name: 'E2E Test Client 1',
    email: 'client1@e2e-test.com',
    vat_number: 'NL123456789B01',
  },
  testClient2: {
    id: 'c2222222-2222-2222-2222-222222222222',
    name: 'E2E Test Client 2',
    email: 'client2@e2e-test.com',
  },
}

export const SEEDED_INVOICES = {
  draftInvoice: {
    id: 'i1111111-1111-1111-1111-111111111111',
    invoice_number: 'INV-2025-001',
    client_id: SEEDED_CLIENTS.testClient1.id,
    amount: 1000,
    status: 'draft',
  },
  sentInvoice: {
    id: 'i2222222-2222-2222-2222-222222222222',
    invoice_number: 'INV-2025-002',
    client_id: SEEDED_CLIENTS.testClient1.id,
    amount: 2000,
    status: 'sent',
  },
}

export const SEEDED_PROJECTS = {
  project1: {
    id: 'p1111111-1111-1111-1111-111111111111',
    name: 'E2E Test Project 1',
    client_id: SEEDED_CLIENTS.testClient1.id,
    hourly_rate: 75,
  },
}
```

#### Database Seed Migration

```sql
-- supabase/migrations/999_e2e_test_seed_data.sql

-- Insert test clients (only run in development)
INSERT INTO clients (id, tenant_id, name, email, vat_number, status)
VALUES
  ('c1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'E2E Test Client 1', 'client1@e2e-test.com', 'NL123456789B01', 'active'),
  ('c2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'E2E Test Client 2', 'client2@e2e-test.com', NULL, 'active')
ON CONFLICT (id) DO NOTHING;

-- Insert test projects
INSERT INTO projects (id, tenant_id, client_id, name, hourly_rate, status)
VALUES
  ('p1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'c1111111-1111-1111-1111-111111111111', 'E2E Test Project 1', 75, 'active')
ON CONFLICT (id) DO NOTHING;

-- Insert test invoices
INSERT INTO invoices (id, tenant_id, client_id, invoice_number, amount, status, invoice_date, due_date)
VALUES
  ('i1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'c1111111-1111-1111-1111-111111111111', 'INV-2025-001', 1000, 'draft', CURRENT_DATE, CURRENT_DATE + 14),
  ('i2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'c1111111-1111-1111-1111-111111111111', 'INV-2025-002', 2000, 'sent', CURRENT_DATE - 30, CURRENT_DATE - 16)
ON CONFLICT (id) DO NOTHING;
```

#### Benefits of Seeded Data
- ✅ **Faster execution** - No API calls for setup
- ✅ **More reliable** - Known data state
- ✅ **No cleanup needed** - Seeded data persists
- ✅ **Easier debugging** - Consistent IDs and data
- ✅ **Parallel execution** - No race conditions

#### Cleanup Strategy
```typescript
// Only cleanup data created during tests, not seeded data
afterEach(async ({ page }) => {
  // Get test-created invoice IDs from network capture
  const testInvoiceIds = // ... extract from test context

  // Delete only test-created data
  for (const id of testInvoiceIds) {
    await page.request.delete(`/api/invoices/${id}`)
  }
})
```

---

## Implementation Roadmap

### Week 1: Invoices Core Tests

#### Day 1-2: Core Functionality
- [ ] Create `invoices-page.spec.ts` (15 tests)
- [ ] Implement invoice-helpers.ts
- [ ] Test metrics display
- [ ] Test invoice list and filtering
- [ ] Test basic CRUD operations

**Deliverables:**
- ✅ 15 E2E tests passing
- ✅ Reusable invoice helpers
- ✅ Seeded data migration (if needed)

#### Day 3-4: Wizard Workflow
- [ ] Create `invoices-wizard.spec.ts` (8 tests)
- [ ] Test all 4 wizard steps
- [ ] Test validation and error handling
- [ ] Test cancellation flows

**Deliverables:**
- ✅ 8 E2E tests passing
- ✅ Wizard helper functions
- ✅ Documentation for wizard testing

#### Day 5: Review & Documentation
- [ ] Code review and refactoring
- [ ] Update test documentation
- [ ] Create Playwright test execution guide
- [ ] Address any failing tests

**Deliverables:**
- ✅ All 23 tests passing
- ✅ Clean, documented code
- ✅ CI/CD integration ready

---

### Week 2: Invoices Advanced + Clients

#### Day 1-2: Payment & Advanced Features
- [ ] Create `invoices-payments.spec.ts` (6 tests)
- [ ] Create `invoices-advanced.spec.ts` (5 tests)
- [ ] Test payment recording (full/partial)
- [ ] Test payment reminders
- [ ] Test templates and exports

**Deliverables:**
- ✅ 11 E2E tests passing
- ✅ Payment helper functions
- ✅ PDF/export validation

#### Day 3-4: Clients Core Tests
- [ ] Create `clients-page.spec.ts` (12 tests)
- [ ] Implement client-helpers.ts
- [ ] Test client metrics
- [ ] Test client CRUD operations
- [ ] Test VAT validation

**Deliverables:**
- ✅ 12 E2E tests passing
- ✅ Reusable client helpers
- ✅ VAT validation tests

#### Day 5: Client Projects
- [ ] Create `clients-projects.spec.ts` (7 tests)
- [ ] Test project management
- [ ] Test hourly rate calculations
- [ ] Test project statistics

**Deliverables:**
- ✅ 7 E2E tests passing
- ✅ Project management helpers
- ✅ All clients tests (19 total) passing

---

### Week 3: Unit Tests + Polish

#### Day 1-3: Unit Tests
- [ ] Create `clients.test.ts` (20 unit tests)
- [ ] Test client validation logic
- [ ] Test VAT number validation
- [ ] Test hourly rate calculations
- [ ] Test client metrics calculations

**Deliverables:**
- ✅ 20 unit tests passing
- ✅ 100% business logic coverage
- ✅ Mock services for client operations

#### Day 4-5: Polish & Integration
- [ ] Full test suite execution
- [ ] Performance optimization
- [ ] CI/CD pipeline integration
- [ ] Test documentation finalization
- [ ] Bug fixes and edge cases

**Deliverables:**
- ✅ All 73 tests passing
- ✅ CI/CD integration complete
- ✅ Comprehensive test documentation
- ✅ Handoff to team

---

## Test Execution Commands

### Development (Local)

```bash
# Run all invoice tests (headed mode for debugging)
npx playwright test invoices- --project=chromium --headed

# Run all client tests
npx playwright test clients- --project=chromium --headed

# Run specific test file
npx playwright test invoices-page --project=chromium --headed

# Run with UI mode (interactive debugging)
npx playwright test invoices- --ui

# Run single test by name
npx playwright test invoices-page -g "should display all three metric cards"
```

### CI/CD (Automated)

```bash
# Run all financial E2E tests (headless, parallel)
npx playwright test src/__tests__/e2e/ \
  --project=chromium \
  --workers=4 \
  --retries=2 \
  --reporter=html \
  --reporter=json

# Run only invoices tests (fast execution)
npx playwright test invoices- \
  --project=chromium \
  --workers=4 \
  --max-failures=5

# Run only clients tests
npx playwright test clients- \
  --project=chromium \
  --workers=4 \
  --max-failures=5

# Generate HTML report
npx playwright show-report
```

### Performance Testing

```bash
# Run with trace (for debugging failures)
npx playwright test invoices- --trace on

# Run with video recording
npx playwright test invoices- --video on

# Run with screenshots on failure
npx playwright test invoices- --screenshot only-on-failure
```

---

## Test Coverage Goals

### Target Coverage by Component

| Component | E2E Tests | Unit Tests | Integration Tests | Total Coverage |
|-----------|-----------|------------|-------------------|----------------|
| **Invoices Page** | 34 tests | 35 tests (existing) | API tests | **85%** |
| **Clients Page** | 19 tests | 20 tests (new) | API tests | **80%** |
| **Helpers/Utils** | - | Included in component tests | - | **70%** |

### Coverage by Test Type (70/20/10 Model)

- **Unit Tests:** 70% (55 tests) - Business logic, calculations, validations
- **Integration Tests:** 20% (Existing) - API routes, database operations
- **E2E Tests:** 10% (53 tests) - Critical user workflows

---

## Best Practices & Patterns

### 1. Sequential Workflows for Dependent Operations

```typescript
// ✅ GOOD: Sequential execution for dependent steps
test('should create, edit, and delete invoice', async ({ page }) => {
  // Step 1: Create
  const invoiceId = await createInvoiceViaAPI(page, data)

  // Step 2: Edit (depends on Step 1)
  await page.goto(`/dashboard/financieel-v2/facturen`)
  await findInvoiceByNumber(page, 'INV-001').click()
  await page.fill('input[name="amount"]', '2000')
  await page.click('button:has-text("Save")')

  // Step 3: Delete (depends on Steps 1-2)
  await deleteInvoice(page)
})

// ❌ BAD: Trying to run dependent operations in parallel
test('should NOT do this', async ({ page }) => {
  await Promise.all([
    createInvoiceViaAPI(page, data), // Creates invoice
    deleteInvoice(page), // Tries to delete before creation completes
  ])
})
```

### 2. API-Based Cleanup

```typescript
// ✅ GOOD: Clean up test data after each test
afterEach(async ({ page }) => {
  // Delete all test-created invoices
  const testInvoices = // ... get from test context
  for (const id of testInvoices) {
    await page.request.delete(`/api/invoices/${id}`)
  }
})
```

### 3. Multiple Selector Fallbacks

```typescript
// ✅ GOOD: Multiple selectors for resilience
async function clickInvoiceDetailButton(page: Page) {
  const selectors = [
    'button[data-testid="invoice-detail"]',
    'button:has-text("View Details")',
    'button:has-text("Details")',
    'tr button:first-of-type',
  ]

  for (const selector of selectors) {
    const element = page.locator(selector).first()
    if (await element.isVisible({ timeout: 1000 })) {
      await element.click()
      return
    }
  }

  throw new Error('Could not find invoice detail button')
}
```

### 4. Network Response Capture

```typescript
// ✅ GOOD: Capture API response to get created invoice ID
test('should create invoice and capture ID', async ({ page }) => {
  // Listen for API response
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/invoices') && response.request().method() === 'POST'
  )

  // Trigger invoice creation
  await page.click('button:has-text("Create Invoice")')

  // Get response and extract ID
  const response = await responsePromise
  const data = await response.json()
  const invoiceId = data.id

  // Use invoiceId for cleanup
  testContext.invoiceIds.push(invoiceId)
})
```

### 5. Bilingual Support (English/Dutch)

```typescript
// ✅ GOOD: Support both English and Dutch UI text
async function clickCreateButton(page: Page) {
  const createButton = page.locator('button').filter({
    hasText: /Create|Aanmaken/i,
  })
  await createButton.first().click()
}

// ✅ GOOD: Flexible text matching
async function waitForSuccessMessage(page: Page) {
  await page.locator('text=/created successfully|succesvol aangemaakt/i').waitFor()
}
```

---

## Priority Summary

### Critical Path (Must Have - Week 1)
1. ⭐⭐⭐⭐⭐ `invoices-page.spec.ts` (15 tests) - Core invoice functionality
2. ⭐⭐⭐⭐ `invoices-wizard.spec.ts` (8 tests) - Wizard workflow
3. ⭐⭐⭐⭐⭐ Invoice helpers implementation

### High Priority (Should Have - Week 2)
4. ⭐⭐⭐⭐ `invoices-payments.spec.ts` (6 tests) - Payment management
5. ⭐⭐⭐⭐⭐ `clients-page.spec.ts` (12 tests) - Core client functionality
6. ⭐⭐⭐⭐ `clients-projects.spec.ts` (7 tests) - Project management
7. ⭐⭐⭐⭐⭐ Client helpers implementation

### Medium Priority (Nice to Have - Week 3)
8. ⭐⭐⭐ `invoices-advanced.spec.ts` (5 tests) - Templates, exports
9. ⭐⭐⭐ `clients.test.ts` (20 unit tests) - Business logic

---

## Expected Outcomes

### After Week 1
- ✅ **23 E2E tests** for invoices page
- ✅ **Invoice helpers** fully implemented
- ✅ **Core invoice workflows** covered
- ✅ **Wizard functionality** tested

### After Week 2
- ✅ **34 E2E tests** for invoices page (complete)
- ✅ **19 E2E tests** for clients page (complete)
- ✅ **Client helpers** fully implemented
- ✅ **All critical user workflows** tested

### After Week 3
- ✅ **73 total tests** (53 E2E + 20 unit)
- ✅ **80%+ coverage** for invoices & clients
- ✅ **CI/CD integration** complete
- ✅ **Production-ready** test suite

---

## Risks & Mitigations

### Risk 1: Test Flakiness
**Mitigation:**
- Use seeded data strategy (like tijd page)
- Implement retry logic (2-3 retries in CI)
- Multiple selector fallbacks
- Generous timeouts for API calls

### Risk 2: Timeline Slippage
**Mitigation:**
- Focus on critical path first (invoices core tests)
- Skip "nice to have" tests if needed (advanced features)
- Parallelize work where possible
- Daily progress tracking

### Risk 3: API Changes During Implementation
**Mitigation:**
- Keep helpers flexible with multiple selector strategies
- Use API mocking for unstable endpoints
- Version control for test data
- Regular sync with backend team

### Risk 4: Database State Conflicts
**Mitigation:**
- Use seeded data with unique IDs
- Cleanup only test-created data
- Run tests in isolation (workers=1 for debugging)
- Clear test data before each run

---

## Next Steps

1. **Review & Approve** this test strategy
2. **Prioritize** test files (all critical? or subset?)
3. **Confirm timeline** (3 weeks acceptable?)
4. **Assign resources** (1 developer? 2 developers?)
5. **Set up test environment** (seeded data migration)
6. **Begin Week 1 implementation** (`invoices-page.spec.ts`)

---

## Questions for Stakeholders

Before implementation begins:

1. **Scope Confirmation**
   - Do you want all 73 tests, or prioritize core functionality only?
   - Are advanced features (templates, exports, PDF) essential?

2. **Timeline Flexibility**
   - Is 3-week timeline acceptable?
   - Can we deliver in phases (invoices first, clients second)?

3. **Resource Allocation**
   - How many developers available for this work?
   - Can we use pair programming for faster delivery?

4. **Data Strategy**
   - Should we use seeded data approach (recommended)?
   - Do we need to coordinate with database team?

5. **Feature Priority**
   - Which features are business-critical?
   - Can we defer any workflows to Phase 2?

---

**Document End** - Ready for implementation upon approval
