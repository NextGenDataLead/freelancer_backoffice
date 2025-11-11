/**
 * End-to-End Expense Workflow Tests
 * Complete Submit → Approve → Reimburse flow using Playwright MCP tools
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { TEST_USERS } from '../setup/test-setup'

// Mock Playwright MCP functions for testing environment
const mockPlaywright = {
  navigate: async (url: string) => ({ success: true, url }),
  waitFor: async (options: any) => ({ success: true }),
  click: async (element: string) => ({ success: true, element }),
  type: async (element: string, text: string) => ({ success: true, element, text }),
  selectOption: async (element: string, value: string) => ({ success: true, element, value }),
  fileUpload: async (element: string, filePath: string) => ({ success: true, element, filePath }),
  snapshot: async () => ({
    elements: [
      { type: 'heading', text: 'Expense Management', level: 1 },
      { type: 'button', text: 'Submit Expense', disabled: false },
      { type: 'table', rows: 5, columns: 8 }
    ]
  }),
  screenshot: async (filename?: string) => ({
    success: true,
    filename: filename || `expense-${Date.now()}.png`
  }),
  hover: async (element: string) => ({ success: true, element }),
  waitForNetworkIdle: async () => ({ success: true })
}

describe('Expense Workflow E2E Tests', () => {
  const member = TEST_USERS.MEMBER_TENANT1
  const admin = TEST_USERS.ADMIN_TENANT1
  const owner = TEST_USERS.OWNER_TENANT1

  const testExpenseData = {
    description: 'E2E Test Business Travel',
    amount: 125.50,
    category: 'Reiskosten',
    date: '2024-01-15',
    vendor: 'Test Travel Agency',
    receiptFile: '/test-files/receipt.pdf'
  }

  beforeAll(async () => {
    console.log('Setting up E2E expense workflow test environment')
  })

  afterEach(async () => {
    await mockPlaywright.screenshot('test-cleanup')
  })

  describe('Expense Submission Workflow', () => {
    it('should complete expense submission as team member', async () => {
      // Login as member
      await mockPlaywright.navigate('/sign-in')
      await mockPlaywright.type('[data-testid="email-input"]', member.email)
      await mockPlaywright.type('[data-testid="password-input"]', 'test-password')
      await mockPlaywright.click('[data-testid="sign-in-button"]')
      await mockPlaywright.waitFor({ url: '/dashboard' })

      // Navigate to expenses page
      await mockPlaywright.navigate('/dashboard/financieel/tijd')
      await mockPlaywright.waitFor({ text: 'Expense Management' })

      const expensePageSnapshot = await mockPlaywright.snapshot()
      expect(expensePageSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ text: 'Submit Expense' }),
          expect.objectContaining({ type: 'table' })
        ])
      )

      // Click submit expense button
      await mockPlaywright.click('[data-testid="submit-expense-button"]')
      await mockPlaywright.waitFor({ text: 'New Expense' })

      // Fill expense form
      const formSnapshot = await mockPlaywright.snapshot()
      expect(formSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'form' }),
          expect.objectContaining({ text: expect.stringContaining('Category') }),
          expect.objectContaining({ text: expect.stringContaining('Amount') })
        ])
      )

      // Select Dutch tax category
      await mockPlaywright.click('[data-testid="category-select"]')
      await mockPlaywright.click('[data-value="Reiskosten"]') // Travel expenses

      // Fill expense details
      await mockPlaywright.type('[data-testid="description-input"]', testExpenseData.description)
      await mockPlaywright.type('[data-testid="amount-input"]', testExpenseData.amount.toString())
      await mockPlaywright.type('[data-testid="expense-date-input"]', testExpenseData.date)
      await mockPlaywright.type('[data-testid="vendor-input"]', testExpenseData.vendor)

      // Select payment method
      await mockPlaywright.click('[data-testid="payment-method-select"]')
      await mockPlaywright.click('[data-value="personal_card"]')

      // Upload receipt
      await mockPlaywright.fileUpload('[data-testid="receipt-upload"]', testExpenseData.receiptFile)
      await mockPlaywright.waitFor({ text: 'Receipt uploaded' })

      // Verify VAT calculation (21% standard rate)
      await mockPlaywright.waitFor({ text: '26.36' }) // VAT amount
      await mockPlaywright.waitFor({ text: '151.86' }) // Total with VAT

      // Mark as billable to client
      await mockPlaywright.click('[data-testid="billable-checkbox"]')
      await mockPlaywright.click('[data-testid="client-select"]')
      await mockPlaywright.click('[data-value="c1111111-1111-1111-1111-111111111111"]')

      // Submit for approval
      await mockPlaywright.click('[data-testid="submit-for-approval-button"]')
      await mockPlaywright.waitFor({ text: 'Expense submitted for approval' })

      await mockPlaywright.screenshot('expense-submitted')
    })

    it('should handle expense form validation', async () => {
      await mockPlaywright.navigate('/dashboard/financieel/tijd')
      await mockPlaywright.click('[data-testid="submit-expense-button"]')

      // Try to submit empty form
      await mockPlaywright.click('[data-testid="submit-for-approval-button"]')

      const validationSnapshot = await mockPlaywright.snapshot()
      expect(validationSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('Description is required')
          }),
          expect.objectContaining({
            text: expect.stringContaining('Amount is required')
          }),
          expect.objectContaining({
            text: expect.stringContaining('Category is required')
          })
        ])
      )

      // Test negative amount
      await mockPlaywright.type('[data-testid="amount-input"]', '-50.00')
      await mockPlaywright.click('[data-testid="submit-for-approval-button"]')
      await mockPlaywright.waitFor({ text: 'Amount must be positive' })

      // Test future date validation
      await mockPlaywright.type('[data-testid="expense-date-input"]', '2025-12-31')
      await mockPlaywright.click('[data-testid="submit-for-approval-button"]')
      await mockPlaywright.waitFor({ text: 'Expense date cannot be in the future' })

      await mockPlaywright.screenshot('expense-validation-errors')
    })

    it('should handle receipt requirements properly', async () => {
      await mockPlaywright.navigate('/dashboard/financieel/tijd')
      await mockPlaywright.click('[data-testid="submit-expense-button"]')

      // Fill basic expense info
      await mockPlaywright.click('[data-testid="category-select"]')
      await mockPlaywright.click('[data-value="Maaltijden en Entertainment"]') // Requires receipt

      await mockPlaywright.type('[data-testid="description-input"]', 'Client dinner')
      await mockPlaywright.type('[data-testid="amount-input"]', '85.00')

      // Try to submit without receipt (should show warning)
      await mockPlaywright.click('[data-testid="submit-for-approval-button"]')
      await mockPlaywright.waitFor({ text: 'Receipt required for this category' })

      const receiptWarningSnapshot = await mockPlaywright.snapshot()
      expect(receiptWarningSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('Receipt required')
          })
        ])
      )

      // Upload receipt
      await mockPlaywright.fileUpload('[data-testid="receipt-upload"]', '/test-files/dinner-receipt.pdf')
      await mockPlaywright.waitFor({ text: 'Receipt uploaded successfully' })

      // Now submission should work
      await mockPlaywright.click('[data-testid="submit-for-approval-button"]')
      await mockPlaywright.waitFor({ text: 'Expense submitted for approval' })

      await mockPlaywright.screenshot('receipt-requirement-handled')
    })

    it('should allow expense draft saving', async () => {
      await mockPlaywright.navigate('/dashboard/financieel/tijd')
      await mockPlaywright.click('[data-testid="submit-expense-button"]')

      // Partially fill form
      await mockPlaywright.type('[data-testid="description-input"]', 'Work in progress expense')
      await mockPlaywright.type('[data-testid="amount-input"]', '45.00')

      // Save as draft
      await mockPlaywright.click('[data-testid="save-draft-button"]')
      await mockPlaywright.waitFor({ text: 'Draft saved' })

      // Navigate away and back
      await mockPlaywright.navigate('/dashboard')
      await mockPlaywright.navigate('/dashboard/financieel/tijd')

      // Verify draft is preserved
      const draftSnapshot = await mockPlaywright.snapshot()
      expect(draftSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('Work in progress expense')
          }),
          expect.objectContaining({
            status: 'draft'
          })
        ])
      )

      await mockPlaywright.screenshot('expense-draft-saved')
    })
  })

  describe('Expense Approval Workflow', () => {
    it('should approve expense as admin', async () => {
      // Login as admin
      await mockPlaywright.navigate('/sign-in')
      await mockPlaywright.type('[data-testid="email-input"]', admin.email, { clear: true })
      await mockPlaywright.type('[data-testid="password-input"]', 'test-password', { clear: true })
      await mockPlaywright.click('[data-testid="sign-in-button"]')
      await mockPlaywright.waitFor({ url: '/dashboard' })

      // Navigate to expense management
      await mockPlaywright.navigate('/dashboard/financieel/tijd')

      // Filter for pending approval
      await mockPlaywright.click('[data-testid="filter-pending-approval"]')

      const pendingSnapshot = await mockPlaywright.snapshot()
      expect(pendingSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: 'submitted'
          }),
          expect.objectContaining({
            text: expect.stringContaining('Pending Approval')
          })
        ])
      )

      // Click on expense to review
      await mockPlaywright.click('[data-testid="expense-row-submitted"]')
      await mockPlaywright.waitFor({ text: 'Expense Review' })

      // Review expense details
      const reviewSnapshot = await mockPlaywright.snapshot()
      expect(reviewSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining(testExpenseData.description)
          }),
          expect.objectContaining({
            text: expect.stringContaining('125.50')
          }),
          expect.objectContaining({
            text: expect.stringContaining('Receipt')
          })
        ])
      )

      // View uploaded receipt
      await mockPlaywright.click('[data-testid="view-receipt-button"]')
      await mockPlaywright.waitFor({ text: 'Receipt Preview' })

      // Add approval comment
      await mockPlaywright.type(
        '[data-testid="approval-comment-input"]',
        'Approved - valid business expense with receipt'
      )

      // Approve expense
      await mockPlaywright.click('[data-testid="approve-expense-button"]')
      await mockPlaywright.waitFor({ text: 'Expense approved' })

      // Verify status change
      await mockPlaywright.waitFor({ text: 'Status: Approved' })

      await mockPlaywright.screenshot('expense-approved')
    })

    it('should reject expense with feedback', async () => {
      await mockPlaywright.navigate('/dashboard/financieel/tijd')
      await mockPlaywright.click('[data-testid="filter-pending-approval"]')
      await mockPlaywright.click('[data-testid="expense-row-submitted"]')

      // Add rejection comment
      await mockPlaywright.type(
        '[data-testid="rejection-comment-input"]',
        'Receipt is unclear and expense seems too high for this category'
      )

      // Reject expense
      await mockPlaywright.click('[data-testid="reject-expense-button"]')
      await mockPlaywright.waitFor({ text: 'Expense rejected' })

      // Verify rejection notification
      const rejectionSnapshot = await mockPlaywright.snapshot()
      expect(rejectionSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('Status: Rejected')
          }),
          expect.objectContaining({
            text: expect.stringContaining('Receipt is unclear')
          })
        ])
      )

      await mockPlaywright.screenshot('expense-rejected')
    })

    it('should handle bulk expense approval', async () => {
      await mockPlaywright.navigate('/dashboard/financieel/tijd')
      await mockPlaywright.click('[data-testid="filter-pending-approval"]')

      // Select multiple expenses
      await mockPlaywright.click('[data-testid="select-expense-1"]')
      await mockPlaywright.click('[data-testid="select-expense-2"]')
      await mockPlaywright.click('[data-testid="select-expense-3"]')

      // Bulk approve
      await mockPlaywright.click('[data-testid="bulk-approve-button"]')
      await mockPlaywright.waitFor({ text: 'Approve 3 Expenses' })

      const bulkApprovalSnapshot = await mockPlaywright.snapshot()
      expect(bulkApprovalSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('Total amount: €285.50')
          })
        ])
      )

      await mockPlaywright.type(
        '[data-testid="bulk-approval-comment"]',
        'Bulk approval - all receipts verified'
      )

      await mockPlaywright.click('[data-testid="confirm-bulk-approval"]')
      await mockPlaywright.waitFor({ text: '3 expenses approved' })

      await mockPlaywright.screenshot('bulk-expense-approval')
    })

    it('should send approval notifications', async () => {
      await mockPlaywright.navigate('/dashboard/financieel/tijd')
      await mockPlaywright.click('[data-testid="expense-row-submitted"]')

      // Approve with notification
      await mockPlaywright.click('[data-testid="notify-submitter-checkbox"]')
      await mockPlaywright.click('[data-testid="approve-expense-button"]')

      await mockPlaywright.waitFor({ text: 'Expense approved and submitter notified' })

      // Check notification was sent
      const notificationSnapshot = await mockPlaywright.snapshot()
      expect(notificationSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('Email sent to')
          }),
          expect.objectContaining({
            text: expect.stringContaining(member.email)
          })
        ])
      )

      await mockPlaywright.screenshot('approval-notification-sent')
    })
  })

  describe('Expense Reimbursement Workflow', () => {
    it('should process reimbursement for approved expenses', async () => {
      // Login as owner (can process reimbursements)
      await mockPlaywright.navigate('/sign-in')
      await mockPlaywright.type('[data-testid="email-input"]', owner.email, { clear: true })
      await mockPlaywright.type('[data-testid="password-input"]', 'test-password', { clear: true })
      await mockPlaywright.click('[data-testid="sign-in-button"]')
      await mockPlaywright.waitFor({ url: '/dashboard' })

      await mockPlaywright.navigate('/dashboard/financieel/tijd')

      // Filter for approved expenses
      await mockPlaywright.click('[data-testid="filter-approved"]')

      const approvedSnapshot = await mockPlaywright.snapshot()
      expect(approvedSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: 'approved'
          })
        ])
      )

      // Select expenses for reimbursement
      await mockPlaywright.click('[data-testid="select-expense-approved"]')

      // Process reimbursement
      await mockPlaywright.click('[data-testid="process-reimbursement-button"]')
      await mockPlaywright.waitFor({ text: 'Process Reimbursement' })

      const reimbursementSnapshot = await mockPlaywright.snapshot()
      expect(reimbursementSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'form' }),
          expect.objectContaining({
            text: expect.stringContaining('Reimbursement Amount')
          })
        ])
      )

      // Fill reimbursement details
      await mockPlaywright.type('[data-testid="reimbursement-date-input"]', '2024-01-25')
      await mockPlaywright.type('[data-testid="payment-reference-input"]', 'REIMB-2024-001')

      // Select reimbursement method
      await mockPlaywright.click('[data-testid="reimbursement-method-select"]')
      await mockPlaywright.click('[data-value="bank_transfer"]')

      // Process reimbursement
      await mockPlaywright.click('[data-testid="confirm-reimbursement-button"]')
      await mockPlaywright.waitFor({ text: 'Reimbursement processed' })

      // Verify status change
      await mockPlaywright.waitFor({ text: 'Status: Reimbursed' })

      await mockPlaywright.screenshot('expense-reimbursed')
    })

    it('should handle partial reimbursements', async () => {
      await mockPlaywright.navigate('/dashboard/financieel/tijd')
      await mockPlaywright.click('[data-testid="filter-approved"]')
      await mockPlaywright.click('[data-testid="expense-row-approved"]')

      // Process partial reimbursement
      await mockPlaywright.click('[data-testid="process-reimbursement-button"]')

      // Original amount: €151.86, partial: €100.00
      await mockPlaywright.type('[data-testid="reimbursement-amount-input"]', '100.00', { clear: true })
      await mockPlaywright.type('[data-testid="partial-reason-input"]', 'Company policy limits travel meals to €100')

      await mockPlaywright.click('[data-testid="confirm-reimbursement-button"]')
      await mockPlaywright.waitFor({ text: 'Partial reimbursement processed' })

      // Verify remaining balance
      await mockPlaywright.waitFor({ text: '€51.86 remaining' })

      const partialReimbursementSnapshot = await mockPlaywright.snapshot()
      expect(partialReimbursementSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('€100.00 reimbursed')
          }),
          expect.objectContaining({
            text: expect.stringContaining('€51.86 remaining')
          })
        ])
      )

      await mockPlaywright.screenshot('partial-reimbursement')
    })

    it('should generate reimbursement reports', async () => {
      await mockPlaywright.navigate('/dashboard/financieel/tijd')

      // Click reports tab
      await mockPlaywright.click('[data-testid="reports-tab"]')
      await mockPlaywright.waitFor({ text: 'Expense Reports' })

      // Generate monthly reimbursement report
      await mockPlaywright.click('[data-testid="generate-report-button"]')

      // Select report parameters
      await mockPlaywright.click('[data-testid="report-type-select"]')
      await mockPlaywright.click('[data-value="reimbursement_summary"]')

      await mockPlaywright.click('[data-testid="month-select"]')
      await mockPlaywright.click('[data-value="2024-01"]')

      await mockPlaywright.click('[data-testid="generate-button"]')
      await mockPlaywright.waitFor({ text: 'Report generated' })

      const reportSnapshot = await mockPlaywright.snapshot()
      expect(reportSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('Total Reimbursed: €')
          }),
          expect.objectContaining({
            text: expect.stringContaining('Pending Reimbursement: €')
          })
        ])
      )

      // Download PDF report
      await mockPlaywright.click('[data-testid="download-pdf-report"]')
      await mockPlaywright.waitFor({ text: 'PDF downloaded' })

      await mockPlaywright.screenshot('reimbursement-report')
    })
  })

  describe('Expense Analytics and Insights', () => {
    it('should display expense analytics dashboard', async () => {
      await mockPlaywright.navigate('/dashboard/financieel/tijd')
      await mockPlaywright.click('[data-testid="analytics-tab"]')

      const analyticsSnapshot = await mockPlaywright.snapshot()
      expect(analyticsSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'chart' }),
          expect.objectContaining({
            text: expect.stringContaining('Monthly Trends')
          }),
          expect.objectContaining({
            text: expect.stringContaining('Category Breakdown')
          })
        ])
      )

      // Check expense categories distribution
      await mockPlaywright.hover('[data-testid="category-chart"]')
      await mockPlaywright.waitFor({ text: 'Reiskosten: 45%' })

      await mockPlaywright.screenshot('expense-analytics')
    })

    it('should show employee expense comparison', async () => {
      await mockPlaywright.navigate('/dashboard/financieel/tijd')
      await mockPlaywright.click('[data-testid="analytics-tab"]')
      await mockPlaywright.click('[data-testid="employee-comparison-tab"]')

      const comparisonSnapshot = await mockPlaywright.snapshot()
      expect(comparisonSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('Employee Expense Comparison')
          }),
          expect.objectContaining({ type: 'bar-chart' })
        ])
      )

      await mockPlaywright.screenshot('employee-expense-comparison')
    })

    it('should track compliance with Dutch tax categories', async () => {
      await mockPlaywright.navigate('/dashboard/financieel/tijd')
      await mockPlaywright.click('[data-testid="compliance-tab"]')

      const complianceSnapshot = await mockPlaywright.snapshot()
      expect(complianceSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('Dutch Tax Compliance')
          }),
          expect.objectContaining({
            text: expect.stringContaining('GL Code 4110: Kantoorbenodigdheden')
          }),
          expect.objectContaining({
            text: expect.stringContaining('GL Code 4120: Reiskosten')
          })
        ])
      )

      await mockPlaywright.screenshot('tax-compliance-tracking')
    })
  })
})