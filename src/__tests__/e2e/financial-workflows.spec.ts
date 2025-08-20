import { test, expect } from '@playwright/test'

/**
 * End-to-End Tests for Critical Financial Workflows
 * Testing complete user journeys through the Dutch ZZP Financial Suite
 * Focus: 10% coverage for critical business workflows
 */

test.describe('Dutch ZZP Financial Suite - E2E Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page and authenticate
    await page.goto('/sign-in')
    
    // Mock authentication for testing
    await page.route('/api/auth/**', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ user: { id: 'test-user', email: 'test@example.com' }})
      })
    })
    
    // Login with test credentials
    await page.fill('input[name="identifier"]', 'test@example.com')
    await page.fill('input[name="password"]', 'testpassword123')
    await page.click('button[type="submit"]')
    
    // Wait for dashboard to load
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('Complete Invoice Creation and Payment Workflow', async ({ page }) => {
    // Step 1: Navigate to financial dashboard
    await page.goto('/dashboard/financieel')
    await expect(page.locator('h1')).toContainText('Financieel Dashboard')

    // Step 2: Create a new client first
    await page.click('button:has-text("Nieuwe klant")')
    await expect(page.locator('h2')).toContainText('Nieuwe klant')
    
    // Fill client form
    await page.fill('input[name="name"]', 'Test Client BV')
    await page.fill('input[name="email"]', 'client@testcompany.nl')
    await page.fill('input[name="company_name"]', 'Test Company BV')
    
    // Enable business client toggle
    await page.check('input[name="is_business"]')
    
    // Fill business details
    await page.fill('input[name="vat_number"]', 'NL123456789B01')
    await page.fill('input[name="address"]', 'Teststraat 123')
    await page.fill('input[name="postal_code"]', '1234AB')
    await page.fill('input[name="city"]', 'Amsterdam')
    
    // Submit client form
    await page.click('button[type="submit"]:has-text("Klant toevoegen")')
    
    // Verify client was created
    await expect(page.locator('text=Test Client BV')).toBeVisible()
    
    // Step 3: Create an invoice for the client
    await page.click('button:has-text("Nieuwe factuur")')
    await expect(page.locator('h2')).toContainText('Nieuwe factuur')
    
    // Select the client we just created
    await page.click('select[name="client_id"]')
    await page.selectOption('select[name="client_id"]', { label: 'Test Client BV' })
    
    // Set invoice dates
    await page.fill('input[name="invoice_date"]', '2024-01-15')
    await page.fill('input[name="due_date"]', '2024-02-14')
    await page.fill('input[name="reference"]', 'Website Development Project')
    
    // Add invoice items
    await page.click('button:has-text("Item toevoegen")')
    
    // Fill first item
    await page.fill('input[name="items.0.description"]', 'Website development - 40 hours')
    await page.fill('input[name="items.0.quantity"]', '40')
    await page.fill('input[name="items.0.unit_price"]', '75.00')
    
    // Verify real-time VAT calculation
    await expect(page.locator('text=Subtotaal')).toBeVisible()
    await expect(page.locator('text=€3.000,00')).toBeVisible() // 40 * 75
    await expect(page.locator('text=BTW (21%)')).toBeVisible()
    await expect(page.locator('text=€630,00')).toBeVisible() // 21% VAT
    await expect(page.locator('text=Totaal: €3.630,00')).toBeVisible()
    
    // Add second item
    await page.click('button:has-text("Item toevoegen")')
    await page.fill('input[name="items.1.description"]', 'Domain registration')
    await page.fill('input[name="items.1.quantity"]', '1')
    await page.fill('input[name="items.1.unit_price"]', '15.00')
    
    // Verify updated totals
    await expect(page.locator('text=€3.015,00')).toBeVisible() // Subtotal
    await expect(page.locator('text=€633,15')).toBeVisible() // Updated VAT
    await expect(page.locator('text=Totaal: €3.648,15')).toBeVisible()
    
    // Add notes
    await page.fill('textarea[name="notes"]', 'Bedankt voor uw opdracht. Betaling binnen 30 dagen.')
    
    // Submit invoice
    await page.click('button[type="submit"]:has-text("Factuur maken")')
    
    // Verify invoice was created
    await expect(page.locator('text=Factuur succesvol aangemaakt')).toBeVisible()
    await expect(page.locator('text=2024-001')).toBeVisible() // Invoice number
    
    // Step 4: Send the invoice
    await page.click('button:has-text("Verzenden")')
    await expect(page.locator('text=Status: Verzonden')).toBeVisible()
    
    // Step 5: Mark invoice as paid
    await page.click('button:has-text("Als betaald markeren")')
    await expect(page.locator('text=Status: Betaald')).toBeVisible()
    
    // Step 6: Verify dashboard updates
    await page.goto('/dashboard/financieel')
    await expect(page.locator('text=€3.648,15')).toBeVisible() // Revenue this month
    await expect(page.locator('text=€633,15')).toBeVisible() // VAT collected
  })

  test('EU Reverse-Charge VAT Invoice Workflow', async ({ page }) => {
    await page.goto('/dashboard/financieel')

    // Create EU B2B client
    await page.click('button:has-text("Nieuwe klant")')
    
    await page.fill('input[name="name"]', 'German Business Client')
    await page.fill('input[name="email"]', 'contact@germanbusiness.de')
    await page.fill('input[name="company_name"]', 'German Tech GmbH')
    
    // Enable business client
    await page.check('input[name="is_business"]')
    
    // Set German VAT number and country
    await page.fill('input[name="vat_number"]', 'DE123456789')
    await page.selectOption('select[name="country_code"]', 'DE')
    
    await page.click('button[type="submit"]:has-text("Klant toevoegen")')
    
    // Create invoice with reverse-charge VAT
    await page.click('button:has-text("Nieuwe factuur")')
    await page.selectOption('select[name="client_id"]', { label: 'German Business Client' })
    
    await page.fill('input[name="invoice_date"]', '2024-01-20')
    await page.fill('input[name="due_date"]', '2024-02-19')
    await page.fill('input[name="reference"]', 'Consulting Services')
    
    // Add service item
    await page.click('button:has-text("Item toevoegen")')
    await page.fill('input[name="items.0.description"]', 'Technical consulting')
    await page.fill('input[name="items.0.quantity"]', '20')
    await page.fill('input[name="items.0.unit_price"]', '100.00')
    
    // Verify reverse-charge VAT calculation
    await expect(page.locator('text=€2.000,00')).toBeVisible() // Subtotal
    await expect(page.locator('text=BTW verlegd')).toBeVisible() // Reverse charge indicator
    await expect(page.locator('text=€0,00')).toBeVisible() // No VAT charged
    await expect(page.locator('text=Totaal: €2.000,00')).toBeVisible() // Total = subtotal
    
    // Verify reverse-charge explanation
    await expect(page.locator('text=BTW verlegd naar DE - zakelijke klant binnen EU')).toBeVisible()
    
    await page.click('button[type="submit"]:has-text("Factuur maken")')
    await expect(page.locator('text=BTW verlegd')).toBeVisible()
  })

  test('Expense Entry with OCR Processing Workflow', async ({ page }) => {
    await page.goto('/dashboard/financieel')

    // Navigate to expense entry
    await page.click('button:has-text("Nieuwe uitgave")')
    await expect(page.locator('h2')).toContainText('Nieuwe uitgave')
    
    // Upload receipt (mock file upload)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('test-receipt.jpg')
    
    // Wait for OCR processing
    await expect(page.locator('text=OCR wordt verwerkt...')).toBeVisible()
    await expect(page.locator('text=OCR voltooid')).toBeVisible({ timeout: 5000 })
    
    // Verify OCR auto-fill
    await expect(page.locator('input[name="amount"]')).toHaveValue('125.50')
    await expect(page.locator('input[name="expense_date"]')).toHaveValue('2024-01-15')
    await expect(page.locator('select[name="category"]')).toHaveValue('office_supplies')
    
    // Review and adjust OCR results
    await page.fill('textarea[name="description"]', 'Office chairs and desk supplies')
    
    // Select supplier (create new)
    await page.click('button:has-text("Nieuwe leverancier")')
    await page.fill('input[name="supplier_name"]', 'Office Supply Store')
    await page.fill('input[name="supplier_email"]', 'orders@officesupply.nl')
    await page.check('input[name="is_supplier"]')
    await page.click('button:has-text("Leverancier toevoegen")')
    
    // Verify VAT calculation
    await page.selectOption('select[name="vat_rate"]', '21')
    await expect(page.locator('text=BTW: €26,36')).toBeVisible()
    await expect(page.locator('text=Totaal: €151,86')).toBeVisible()
    
    // Mark as deductible
    await page.check('input[name="is_vat_deductible"]')
    
    // Submit expense
    await page.click('button[type="submit"]:has-text("Uitgave opslaan")')
    await expect(page.locator('text=Uitgave succesvol opgeslagen')).toBeVisible()
    
    // Verify expense appears in list
    await expect(page.locator('text=Office Supply Store')).toBeVisible()
    await expect(page.locator('text=€151,86')).toBeVisible()
  })

  test('Time Tracking with Built-in Timer Workflow', async ({ page }) => {
    await page.goto('/dashboard/financieel')
    
    // Start new time entry
    await page.click('button:has-text("Nieuwe tijdregistratie")')
    await expect(page.locator('h2')).toContainText('Tijdregistratie')
    
    // Fill project details
    await page.selectOption('select[name="client_id"]', { label: 'Test Client BV' })
    await page.fill('input[name="project_name"]', 'Website Maintenance')
    await page.fill('textarea[name="description"]', 'Bug fixes and updates')
    
    // Start the timer
    await page.click('button:has-text("Start Timer")')
    
    // Verify timer is running
    await expect(page.locator('text=Timer loopt')).toBeVisible()
    await expect(page.locator('.timer-display')).toContainText('00:00:0')
    
    // Wait for timer to run (simulate 3 seconds)
    await page.waitForTimeout(3000)
    await expect(page.locator('.timer-display')).toContainText('00:00:0')
    
    // Stop timer
    await page.click('button:has-text("Stop Timer")')
    
    // Verify hours are populated
    const hoursInput = page.locator('input[name="hours"]')
    await expect(hoursInput).not.toHaveValue('0')
    
    // Manual adjustment of hours for testing
    await page.fill('input[name="hours"]', '2.5')
    
    // Set as billable with custom rate
    await page.check('input[name="is_billable"]')
    await page.fill('input[name="hourly_rate"]', '85.00')
    
    // Verify value calculation
    await expect(page.locator('text=Waarde: €212,50')).toBeVisible() // 2.5 * 85
    
    // Submit time entry
    await page.click('button[type="submit"]:has-text("Tijd opslaan")')
    await expect(page.locator('text=Tijdregistratie opgeslagen')).toBeVisible()
    
    // Verify in time entries list
    await page.click('text=Tijdregistratie')
    await expect(page.locator('text=Website Maintenance')).toBeVisible()
    await expect(page.locator('text=2,5h')).toBeVisible()
    await expect(page.locator('text=€212,50')).toBeVisible()
    await expect(page.locator('text=Factureerbaar')).toBeVisible()
  })

  test('Financial Reporting and VAT Return Generation', async ({ page }) => {
    await page.goto('/dashboard/financieel')
    
    // Navigate to reports section
    await page.click('text=Rapportages')
    await expect(page.locator('h1')).toContainText('Financiële Rapportages')
    
    // Generate P&L Report
    await page.click('button:has-text("Winst & Verlies Rapport")')
    
    // Set report period
    await page.fill('input[name="date_from"]', '2024-01-01')
    await page.fill('input[name="date_to"]', '2024-01-31')
    await page.click('button:has-text("Rapport genereren")')
    
    // Verify report data
    await expect(page.locator('h2')).toContainText('Winst & Verlies - Januari 2024')
    await expect(page.locator('text=Omzet')).toBeVisible()
    await expect(page.locator('text=€5.648,15')).toBeVisible() // Total revenue
    await expect(page.locator('text=Uitgaven')).toBeVisible()
    await expect(page.locator('text=€151,86')).toBeVisible() // Total expenses
    await expect(page.locator('text=Netto Winst')).toBeVisible()
    await expect(page.locator('text=€5.496,29')).toBeVisible() // Net profit
    
    // View VAT breakdown
    await page.click('text=BTW Overzicht')
    await expect(page.locator('text=BTW Geïnde')).toBeVisible()
    await expect(page.locator('text=€633,15')).toBeVisible()
    await expect(page.locator('text=BTW Verlegd (EU B2B)')).toBeVisible()
    await expect(page.locator('text=€0,00')).toBeVisible() // Reverse charge amount
    
    // Generate Quarterly VAT Return
    await page.click('button:has-text("BTW Aangifte")')
    await page.selectOption('select[name="year"]', '2024')
    await page.selectOption('select[name="quarter"]', '1')
    await page.click('button:has-text("BTW Aangifte Genereren")')
    
    // Verify VAT return calculations
    await expect(page.locator('h2')).toContainText('BTW Aangifte Q1 2024')
    await expect(page.locator('text=Verschuldigde Omzetbelasting')).toBeVisible()
    await expect(page.locator('text=€633,15')).toBeVisible()
    await expect(page.locator('text=Voorbelasting')).toBeVisible()
    await expect(page.locator('text=€26,36')).toBeVisible() // VAT paid on expenses
    await expect(page.locator('text=Te betalen BTW')).toBeVisible()
    await expect(page.locator('text=€606,79')).toBeVisible() // Net VAT position
    
    // ICP Declaration for EU services
    await expect(page.locator('text=ICP Opgaaf')).toBeVisible()
    await expect(page.locator('text=Duitsland (DE)')).toBeVisible()
    await expect(page.locator('text=€2.000,00')).toBeVisible() // EU services
    
    // Export functionality
    await page.click('button:has-text("Exporteer PDF")')
    // Would verify PDF download in real test
    
    await page.click('button:has-text("Exporteer XML")')
    // Would verify XML format for Digipoort submission
  })

  test('Complete Client-to-Invoice-to-Payment Workflow', async ({ page }) => {
    // This is the ultimate E2E test - complete business workflow
    await page.goto('/dashboard/financieel')
    
    // 1. Dashboard Overview Check
    await expect(page.locator('h1')).toContainText('Financieel Dashboard')
    await expect(page.locator('text=Omzet deze maand')).toBeVisible()
    await expect(page.locator('text=Openstaande facturen')).toBeVisible()
    
    // 2. Create Client
    await page.click('button:has-text("Nieuwe klant")')
    await page.fill('input[name="name"]', 'Comprehensive Test Client')
    await page.fill('input[name="email"]', 'comprehensive@testclient.nl')
    await page.check('input[name="is_business"]')
    await page.fill('input[name="company_name"]', 'Test Business BV')
    await page.fill('input[name="vat_number"]', 'NL999888777B01')
    await page.fill('input[name="default_payment_terms"]', '14')
    await page.click('button[type="submit"]')
    
    // 3. Log Time for the Client
    await page.click('button:has-text("Nieuwe tijdregistratie")')
    await page.selectOption('select[name="client_id"]', { label: 'Comprehensive Test Client' })
    await page.fill('input[name="project_name"]', 'Complete Project')
    await page.fill('input[name="description"]', 'Full development work')
    await page.fill('input[name="hours"]', '25')
    await page.check('input[name="is_billable"]')
    await page.fill('input[name="hourly_rate"]', '90.00')
    await page.click('button[type="submit"]')
    
    // 4. Create Invoice from Time Entries
    await page.click('button:has-text("Nieuwe factuur")')
    await page.selectOption('select[name="client_id"]', { label: 'Comprehensive Test Client' })
    await page.click('button:has-text("Import uit tijdregistratie")')
    
    // Verify time entries are imported
    await expect(page.locator('text=Complete Project - 25h')).toBeVisible()
    await expect(page.locator('text=€2.250,00')).toBeVisible() // 25 * 90
    
    // Add additional items
    await page.click('button:has-text("Item toevoegen")')
    await page.fill('input[name="items.1.description"]', 'Project management')
    await page.fill('input[name="items.1.quantity"]', '5')
    await page.fill('input[name="items.1.unit_price"]', '75.00')
    
    // Verify total calculation
    await expect(page.locator('text=€2.625,00')).toBeVisible() // Subtotal
    await expect(page.locator('text=€551,25')).toBeVisible() // 21% VAT
    await expect(page.locator('text=Totaal: €3.176,25')).toBeVisible()
    
    await page.click('button[type="submit"]:has-text("Factuur maken")')
    
    // 5. Invoice Status Management
    await page.click('button:has-text("Verzenden")')
    await expect(page.locator('text=Status: Verzonden')).toBeVisible()
    
    // Simulate payment received
    await page.click('button:has-text("Als betaald markeren")')
    await expect(page.locator('text=Status: Betaald')).toBeVisible()
    
    // 6. Verify Dashboard Updates
    await page.goto('/dashboard/financieel')
    
    // Check updated metrics
    const currentRevenue = await page.locator('[data-testid="current-revenue"]').textContent()
    expect(currentRevenue).toContain('€8.824,40') // Previous + new invoice
    
    const vatPosition = await page.locator('[data-testid="vat-position"]').textContent()  
    expect(vatPosition).toContain('€1.184,40') // Updated VAT position
    
    // 7. Generate Final Report
    await page.click('text=Rapportages')
    await page.click('button:has-text("Maandrapport Genereren")')
    
    // Verify complete business summary
    await expect(page.locator('text=3 facturen aangemaakt')).toBeVisible()
    await expect(page.locator('text=€8.824,40 omzet')).toBeVisible()
    await expect(page.locator('text=€151,86 uitgaven')).toBeVisible()
    await expect(page.locator('text=€8.672,54 netto winst')).toBeVisible()
    
    // This completes the full business cycle test
  })
})

test.describe('Mobile Responsive Tests', () => {
  test.use({ 
    viewport: { width: 375, height: 667 } // iPhone SE dimensions
  })

  test('Mobile financial dashboard navigation', async ({ page }) => {
    await page.goto('/dashboard/financieel')
    
    // Test mobile navigation
    await page.click('button[aria-label="Menu"]')
    await expect(page.locator('nav')).toBeVisible()
    
    // Test mobile-optimized forms
    await page.click('button:has-text("Nieuwe factuur")')
    await expect(page.locator('h2')).toContainText('Nieuwe factuur')
    
    // Verify mobile form layout
    await expect(page.locator('input[name="client_id"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('Mobile expense entry with camera', async ({ page }) => {
    await page.goto('/dashboard/financieel')
    
    await page.click('button:has-text("Nieuwe uitgave")')
    
    // Test mobile camera integration (mocked)
    await page.click('button:has-text("Foto maken")')
    // In real test, this would test camera permissions and capture
    
    await expect(page.locator('text=Foto wordt verwerkt...')).toBeVisible()
  })
})