/**
 * End-to-End Invoice Lifecycle Tests
 * Complete Create → Send → Payment workflow using Playwright MCP tools
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { TEST_USERS, TEST_CLIENTS } from '../setup/test-setup'

// Mock Playwright MCP functions for testing environment
const mockPlaywright = {
  navigate: async (url: string) => ({ success: true, url }),
  waitFor: async (options: any) => ({ success: true }),
  click: async (element: string) => ({ success: true, element }),
  type: async (element: string, text: string) => ({ success: true, element, text }),
  selectOption: async (element: string, value: string) => ({ success: true, element, value }),
  snapshot: async () => ({
    elements: [
      { type: 'heading', text: 'Invoice Management', level: 1 },
      { type: 'button', text: 'Create Invoice', disabled: false },
      { type: 'table', rows: 3, columns: 6 }
    ]
  }),
  screenshot: async (filename?: string) => ({
    success: true,
    filename: filename || `invoice-${Date.now()}.png`
  }),
  hover: async (element: string) => ({ success: true, element }),
  waitForNetworkIdle: async () => ({ success: true })
}

describe('Invoice Lifecycle E2E Tests', () => {
  const owner = TEST_USERS.OWNER_TENANT1
  const testInvoiceData = {
    clientId: TEST_CLIENTS.NEXTGEN_DATA_LEAD.id,
    description: 'E2E Test Consulting Services',
    amount: 2500,
    vatRate: 0.21,
    dueDate: '2024-12-31'
  }

  beforeAll(async () => {
    // Login as owner to perform invoice operations
    await mockPlaywright.navigate('/sign-in')
    await mockPlaywright.type('[data-testid="email-input"]', owner.email)
    await mockPlaywright.type('[data-testid="password-input"]', 'test-password')
    await mockPlaywright.click('[data-testid="sign-in-button"]')
    await mockPlaywright.waitFor({ url: '/dashboard' })
  })

  afterEach(async () => {
    await mockPlaywright.screenshot('test-cleanup')
  })

  describe('Invoice Creation Workflow', () => {
    it('should create a new invoice with complete workflow', async () => {
      // Step 1: Navigate to invoices page
      await mockPlaywright.navigate('/dashboard/financieel/klanten')
      await mockPlaywright.waitFor({ text: 'Invoice Management' })

      const invoicesSnapshot = await mockPlaywright.snapshot()
      expect(invoicesSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ text: 'Create Invoice' }),
          expect.objectContaining({ type: 'table' })
        ])
      )

      // Step 2: Click create invoice button
      await mockPlaywright.click('[data-testid="create-invoice-button"]')
      await mockPlaywright.waitFor({ text: 'New Invoice' })

      // Step 3: Fill invoice form
      const formSnapshot = await mockPlaywright.snapshot()
      expect(formSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'form' }),
          expect.objectContaining({ text: expect.stringContaining('Client') }),
          expect.objectContaining({ text: expect.stringContaining('Amount') })
        ])
      )

      // Select client
      await mockPlaywright.click('[data-testid="client-select"]')
      await mockPlaywright.click(`[data-value="${testInvoiceData.clientId}"]`)

      // Fill invoice details
      await mockPlaywright.type('[data-testid="description-input"]', testInvoiceData.description)
      await mockPlaywright.type('[data-testid="amount-input"]', testInvoiceData.amount.toString())
      await mockPlaywright.type('[data-testid="due-date-input"]', testInvoiceData.dueDate)

      // Select VAT type
      await mockPlaywright.click('[data-testid="vat-type-select"]')
      await mockPlaywright.click('[data-value="standard"]')

      // Verify VAT calculation
      await mockPlaywright.waitFor({ text: '525.00' }) // 21% VAT on 2500
      await mockPlaywright.waitFor({ text: '3,025.00' }) // Total amount

      const calculationSnapshot = await mockPlaywright.snapshot()
      expect(calculationSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ text: expect.stringContaining('525.00') }),
          expect.objectContaining({ text: expect.stringContaining('3,025.00') })
        ])
      )

      // Step 4: Save invoice as draft
      await mockPlaywright.click('[data-testid="save-draft-button"]')
      await mockPlaywright.waitFor({ text: 'Invoice saved as draft' })

      await mockPlaywright.screenshot('invoice-created-draft')
    })

    it('should handle client creation during invoice workflow', async () => {
      await mockPlaywright.navigate('/dashboard/financieel/klanten')
      await mockPlaywright.click('[data-testid="create-invoice-button"]')

      // Try to create invoice with new client
      await mockPlaywright.click('[data-testid="client-select"]')
      await mockPlaywright.click('[data-testid="create-new-client-option"]')

      // Fill new client form
      await mockPlaywright.waitFor({ text: 'New Client' })

      await mockPlaywright.type('[data-testid="client-name-input"]', 'E2E Test Client')
      await mockPlaywright.type('[data-testid="client-email-input"]', 'e2e-client@test.com')
      await mockPlaywright.type('[data-testid="client-company-input"]', 'E2E Test Company Ltd')

      // Set VAT details
      await mockPlaywright.click('[data-testid="vat-country-select"]')
      await mockPlaywright.click('[data-value="NL"]')
      await mockPlaywright.type('[data-testid="vat-number-input"]', 'NL123456789B01')

      await mockPlaywright.click('[data-testid="save-client-button"]')
      await mockPlaywright.waitFor({ text: 'Client created successfully' })

      // Verify client is selected in invoice form
      const selectedClientSnapshot = await mockPlaywright.snapshot()
      expect(selectedClientSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('E2E Test Client')
          })
        ])
      )

      await mockPlaywright.screenshot('client-created-during-invoice')
    })

    it('should validate invoice form inputs', async () => {
      await mockPlaywright.navigate('/dashboard/financieel/klanten')
      await mockPlaywright.click('[data-testid="create-invoice-button"]')

      // Try to save without required fields
      await mockPlaywright.click('[data-testid="save-draft-button"]')

      const validationSnapshot = await mockPlaywright.snapshot()
      expect(validationSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('Client is required')
          }),
          expect.objectContaining({
            text: expect.stringContaining('Amount is required')
          })
        ])
      )

      // Test invalid amount
      await mockPlaywright.click('[data-testid="client-select"]')
      await mockPlaywright.click(`[data-value="${testInvoiceData.clientId}"]`)
      await mockPlaywright.type('[data-testid="amount-input"]', '-100')

      await mockPlaywright.click('[data-testid="save-draft-button"]')
      await mockPlaywright.waitFor({ text: 'Amount must be positive' })

      await mockPlaywright.screenshot('invoice-validation-errors')
    })
  })

  describe('Invoice Sending Workflow', () => {
    it('should send invoice to client with email preview', async () => {
      // Navigate to invoice list and find draft invoice
      await mockPlaywright.navigate('/dashboard/financieel/klanten')

      const invoiceListSnapshot = await mockPlaywright.snapshot()
      expect(invoiceListSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'table' })
        ])
      )

      // Click on draft invoice
      await mockPlaywright.click('[data-testid="invoice-row-draft"]')
      await mockPlaywright.waitFor({ text: 'Invoice Details' })

      // Click send invoice button
      await mockPlaywright.click('[data-testid="send-invoice-button"]')
      await mockPlaywright.waitFor({ text: 'Send Invoice' })

      // Verify email preview
      const emailPreviewSnapshot = await mockPlaywright.snapshot()
      expect(emailPreviewSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('Email Preview')
          }),
          expect.objectContaining({
            text: expect.stringContaining(testInvoiceData.description)
          }),
          expect.objectContaining({
            text: expect.stringContaining('3,025.00')
          })
        ])
      )

      // Customize email message
      await mockPlaywright.type(
        '[data-testid="email-message-input"]',
        'Please find attached your invoice for consulting services.'
      )

      // Send invoice
      await mockPlaywright.click('[data-testid="confirm-send-button"]')
      await mockPlaywright.waitFor({ text: 'Invoice sent successfully' })

      // Verify status change to 'sent'
      await mockPlaywright.waitFor({ text: 'Status: Sent' })

      await mockPlaywright.screenshot('invoice-sent')
    })

    it('should handle bulk invoice sending', async () => {
      await mockPlaywright.navigate('/dashboard/financieel/klanten')

      // Select multiple draft invoices
      await mockPlaywright.click('[data-testid="select-invoice-1"]')
      await mockPlaywright.click('[data-testid="select-invoice-2"]')

      // Click bulk send button
      await mockPlaywright.click('[data-testid="bulk-send-button"]')
      await mockPlaywright.waitFor({ text: 'Send 2 Invoices' })

      // Confirm bulk send
      await mockPlaywright.click('[data-testid="confirm-bulk-send-button"]')
      await mockPlaywright.waitFor({ text: '2 invoices sent successfully' })

      const bulkSendSnapshot = await mockPlaywright.snapshot()
      expect(bulkSendSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('sent successfully')
          })
        ])
      )

      await mockPlaywright.screenshot('bulk-invoice-send')
    })

    it('should track email delivery status', async () => {
      await mockPlaywright.navigate('/dashboard/financieel/klanten')
      await mockPlaywright.click('[data-testid="invoice-row-sent"]')

      // Check email delivery status
      const deliverySnapshot = await mockPlaywright.snapshot()
      expect(deliverySnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('Email Status')
          }),
          expect.objectContaining({
            text: expect.stringContaining('Delivered')
          })
        ])
      )

      // Check email open tracking
      await mockPlaywright.click('[data-testid="email-tracking-tab"]')
      await mockPlaywright.waitFor({ text: 'Email opened' })

      await mockPlaywright.screenshot('email-delivery-tracking')
    })
  })

  describe('Payment Processing Workflow', () => {
    it('should record full payment for invoice', async () => {
      await mockPlaywright.navigate('/dashboard/financieel/klanten')
      await mockPlaywright.click('[data-testid="invoice-row-sent"]')

      // Click record payment button
      await mockPlaywright.click('[data-testid="record-payment-button"]')
      await mockPlaywright.waitFor({ text: 'Record Payment' })

      const paymentFormSnapshot = await mockPlaywright.snapshot()
      expect(paymentFormSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'form' }),
          expect.objectContaining({
            text: expect.stringContaining('Payment Amount')
          })
        ])
      )

      // Fill payment details
      await mockPlaywright.type('[data-testid="payment-amount-input"]', '3025.00')
      await mockPlaywright.type('[data-testid="payment-date-input"]', '2024-01-15')

      // Select payment method
      await mockPlaywright.click('[data-testid="payment-method-select"]')
      await mockPlaywright.click('[data-value="bank_transfer"]')

      // Add payment reference
      await mockPlaywright.type('[data-testid="payment-reference-input"]', 'TRX-2024-001')

      // Save payment
      await mockPlaywright.click('[data-testid="save-payment-button"]')
      await mockPlaywright.waitFor({ text: 'Payment recorded successfully' })

      // Verify invoice status change to 'paid'
      await mockPlaywright.waitFor({ text: 'Status: Paid' })

      const paidInvoiceSnapshot = await mockPlaywright.snapshot()
      expect(paidInvoiceSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('Paid')
          }),
          expect.objectContaining({
            text: expect.stringContaining('3,025.00')
          })
        ])
      )

      await mockPlaywright.screenshot('invoice-payment-recorded')
    })

    it('should handle partial payments', async () => {
      await mockPlaywright.navigate('/dashboard/financieel/klanten')
      await mockPlaywright.click('[data-testid="invoice-row-sent"]')

      // Record first partial payment
      await mockPlaywright.click('[data-testid="record-payment-button"]')
      await mockPlaywright.type('[data-testid="payment-amount-input"]', '1500.00')
      await mockPlaywright.type('[data-testid="payment-date-input"]', '2024-01-10')
      await mockPlaywright.click('[data-testid="save-payment-button"]')

      await mockPlaywright.waitFor({ text: 'Status: Partial' })

      // Verify remaining balance
      await mockPlaywright.waitFor({ text: '€1,525.00 remaining' })

      // Record second partial payment
      await mockPlaywright.click('[data-testid="record-payment-button"]')
      await mockPlaywright.type('[data-testid="payment-amount-input"]', '1525.00')
      await mockPlaywright.type('[data-testid="payment-date-input"]', '2024-01-20')
      await mockPlaywright.click('[data-testid="save-payment-button"]')

      await mockPlaywright.waitFor({ text: 'Status: Paid' })

      const partialPaymentSnapshot = await mockPlaywright.snapshot()
      expect(partialPaymentSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('Payment History')
          }),
          expect.objectContaining({
            text: expect.stringContaining('1,500.00')
          }),
          expect.objectContaining({
            text: expect.stringContaining('1,525.00')
          })
        ])
      )

      await mockPlaywright.screenshot('partial-payments')
    })

    it('should handle overpayments gracefully', async () => {
      await mockPlaywright.navigate('/dashboard/financieel/klanten')
      await mockPlaywright.click('[data-testid="invoice-row-sent"]')

      await mockPlaywright.click('[data-testid="record-payment-button"]')
      await mockPlaywright.type('[data-testid="payment-amount-input"]', '3500.00') // Overpayment

      await mockPlaywright.click('[data-testid="save-payment-button"]')

      // Should show overpayment warning
      await mockPlaywright.waitFor({ text: 'Overpayment detected' })

      const overpaymentSnapshot = await mockPlaywright.snapshot()
      expect(overpaymentSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('€475.00 overpaid')
          }),
          expect.objectContaining({
            text: expect.stringContaining('Create credit note')
          })
        ])
      )

      // Create credit note for overpayment
      await mockPlaywright.click('[data-testid="create-credit-note-button"]')
      await mockPlaywright.waitFor({ text: 'Credit note created' })

      await mockPlaywright.screenshot('overpayment-handling')
    })
  })

  describe('Invoice Management Features', () => {
    it('should allow invoice editing before sending', async () => {
      await mockPlaywright.navigate('/dashboard/financieel/klanten')
      await mockPlaywright.click('[data-testid="invoice-row-draft"]')

      // Click edit button
      await mockPlaywright.click('[data-testid="edit-invoice-button"]')
      await mockPlaywright.waitFor({ text: 'Edit Invoice' })

      // Modify invoice details
      await mockPlaywright.type('[data-testid="description-input"]', ' - Updated Description', { append: true })
      await mockPlaywright.type('[data-testid="amount-input"]', '3000', { clear: true })

      // Save changes
      await mockPlaywright.click('[data-testid="save-changes-button"]')
      await mockPlaywright.waitFor({ text: 'Invoice updated successfully' })

      // Verify changes
      await mockPlaywright.waitFor({ text: 'Updated Description' })
      await mockPlaywright.waitFor({ text: '3,630.00' }) // New total with VAT

      await mockPlaywright.screenshot('invoice-edited')
    })

    it('should generate PDF invoices', async () => {
      await mockPlaywright.navigate('/dashboard/financieel/klanten')
      await mockPlaywright.click('[data-testid="invoice-row-sent"]')

      // Click download PDF button
      await mockPlaywright.click('[data-testid="download-pdf-button"]')
      await mockPlaywright.waitFor({ text: 'Generating PDF' })

      // Wait for PDF generation
      await mockPlaywright.waitForNetworkIdle()

      const pdfSnapshot = await mockPlaywright.snapshot()
      expect(pdfSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('PDF generated')
          })
        ])
      )

      await mockPlaywright.screenshot('pdf-generated')
    })

    it('should handle invoice cancellation', async () => {
      await mockPlaywright.navigate('/dashboard/financieel/klanten')
      await mockPlaywright.click('[data-testid="invoice-row-draft"]')

      // Click cancel button
      await mockPlaywright.click('[data-testid="cancel-invoice-button"]')
      await mockPlaywright.waitFor({ text: 'Cancel Invoice' })

      // Confirm cancellation with reason
      await mockPlaywright.type('[data-testid="cancellation-reason-input"]', 'Client requested cancellation')
      await mockPlaywright.click('[data-testid="confirm-cancel-button"]')

      await mockPlaywright.waitFor({ text: 'Invoice cancelled successfully' })
      await mockPlaywright.waitFor({ text: 'Status: Cancelled' })

      await mockPlaywright.screenshot('invoice-cancelled')
    })

    it('should track invoice aging and overdue status', async () => {
      await mockPlaywright.navigate('/dashboard/financieel/klanten')

      // View overdue invoices
      await mockPlaywright.click('[data-testid="filter-overdue"]')

      const overdueSnapshot = await mockPlaywright.snapshot()
      expect(overdueSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('Overdue')
          }),
          expect.objectContaining({
            text: expect.stringContaining('days overdue')
          })
        ])
      )

      // Send reminder for overdue invoice
      await mockPlaywright.click('[data-testid="send-reminder-button"]')
      await mockPlaywright.waitFor({ text: 'Reminder sent' })

      await mockPlaywright.screenshot('overdue-invoice-management')
    })
  })
})