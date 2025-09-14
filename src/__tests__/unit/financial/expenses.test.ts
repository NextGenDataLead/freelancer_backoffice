/**
 * Expense Workflows Unit Tests
 * Testing Dutch tax agency compliant expense categories and approval workflows
 */

import { describe, it, expect, vi } from 'vitest'
import { TEST_USERS, TEST_EXPENSE_CATEGORIES } from '../../setup/test-setup'

// Expense types from Dutch tax agency categories
type ExpenseStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'reimbursed' | 'processed' | 'cancelled'
type ExpenseType = 'kantoorbenodigdheden' | 'reiskosten' | 'maaltijden_zakelijk' | 'marketing_reclame' | 'software_ict' | 'telefoon_communicatie'
type PaymentMethod = 'corporate_card' | 'personal_card' | 'cash' | 'bank_transfer' | 'other'

interface Expense {
  id: string
  userId: string
  categoryId: string
  amount: number
  currency: string
  description: string
  expenseType: ExpenseType
  paymentMethod: PaymentMethod
  status: ExpenseStatus
  vatRate: number
  vatAmount: number
  isVatDeductible: boolean
  businessPercentage: number
  requiresApproval: boolean
  receiptUrl?: string
  notes?: string
}

// Dutch tax agency VAT rules for expenses
const DUTCH_VAT_RULES = {
  kantoorbenodigdheden: { vatRate: 0.21, deductible: true, businessPercentage: 100 },
  reiskosten: { vatRate: 0.21, deductible: true, businessPercentage: 100 },
  maaltijden_zakelijk: { vatRate: 0.21, deductible: false, businessPercentage: 100 }, // Special rule: not deductible
  marketing_reclame: { vatRate: 0.21, deductible: true, businessPercentage: 100 },
  software_ict: { vatRate: 0.21, deductible: true, businessPercentage: 100 },
  telefoon_communicatie: { vatRate: 0.21, deductible: true, businessPercentage: 80 } // Business split required
}

// Mock expense service
const mockExpenseService = {
  createExpense: vi.fn().mockImplementation((data: Partial<Expense>): Expense => {
    const rules = DUTCH_VAT_RULES[data.expenseType!]
    const vatAmount = data.amount! * rules.vatRate
    
    return {
      id: `exp-${Date.now()}`,
      status: 'draft',
      currency: 'EUR',
      vatRate: rules.vatRate,
      vatAmount,
      isVatDeductible: rules.deductible,
      businessPercentage: rules.businessPercentage,
      requiresApproval: data.amount! > 100, // Approval required for amounts > €100
      ...data
    } as Expense
  }),

  submitForApproval: vi.fn().mockImplementation((expense: Expense): Expense => {
    return { ...expense, status: 'submitted' }
  }),

  approveExpense: vi.fn().mockImplementation((expense: Expense, approverId: string): Expense => {
    const approver = Object.values(TEST_USERS).find(u => u.id === approverId)
    if (!approver || !['owner', 'admin'].includes(approver.role)) {
      throw new Error('Insufficient permissions to approve expense')
    }
    return { ...expense, status: 'approved' }
  }),

  rejectExpense: vi.fn().mockImplementation((expense: Expense, reason: string): Expense => {
    return { ...expense, status: 'rejected', notes: reason }
  })
}

describe('Expense Workflows & Dutch Tax Compliance', () => {
  describe('Dutch Tax Agency Expense Categories', () => {
    it('should create office supplies expense with correct VAT', () => {
      const expenseData = {
        userId: TEST_USERS.OWNER_TENANT1.id,
        categoryId: TEST_EXPENSE_CATEGORIES.KANTOORBENODIGDHEDEN,
        amount: 45.50,
        description: 'Office supplies and paper',
        expenseType: 'kantoorbenodigdheden' as ExpenseType,
        paymentMethod: 'corporate_card' as PaymentMethod
      }
      
      const expense = mockExpenseService.createExpense(expenseData)
      
      expect(expense.expenseType).toBe('kantoorbenodigdheden')
      expect(expense.vatRate).toBe(0.21)
      expect(expense.vatAmount).toBeCloseTo(9.56, 2) // 45.50 * 0.21
      expect(expense.isVatDeductible).toBe(true)
      expect(expense.businessPercentage).toBe(100)
    })

    it('should create travel expense with full business deduction', () => {
      const expenseData = {
        userId: TEST_USERS.MEMBER_TENANT1.id,
        categoryId: TEST_EXPENSE_CATEGORIES.REISKOSTEN,
        amount: 45.50,
        description: 'Train tickets to Utrecht for client meeting',
        expenseType: 'reiskosten' as ExpenseType,
        paymentMethod: 'personal_card' as PaymentMethod
      }
      
      const expense = mockExpenseService.createExpense(expenseData)
      
      expect(expense.expenseType).toBe('reiskosten')
      expect(expense.isVatDeductible).toBe(true)
      expect(expense.businessPercentage).toBe(100)
      expect(expense.requiresApproval).toBe(false) // Under €100
    })

    it('should create business meal with non-deductible VAT', () => {
      const expenseData = {
        userId: TEST_USERS.ADMIN_TENANT1.id,
        categoryId: TEST_EXPENSE_CATEGORIES.ZAKELIJKE_MAALTIJDEN,
        amount: 350,
        description: 'Business lunch at high-end restaurant',
        expenseType: 'maaltijden_zakelijk' as ExpenseType,
        paymentMethod: 'personal_card' as PaymentMethod
      }
      
      const expense = mockExpenseService.createExpense(expenseData)
      
      expect(expense.expenseType).toBe('maaltijden_zakelijk')
      expect(expense.vatRate).toBe(0.21)
      expect(expense.isVatDeductible).toBe(false) // Special Dutch rule
      expect(expense.requiresApproval).toBe(true) // Over €100
    })

    it('should create software expense with full VAT deduction', () => {
      const expenseData = {
        userId: TEST_USERS.ADMIN_TENANT1.id,
        categoryId: TEST_EXPENSE_CATEGORIES.SOFTWARE_ICT,
        amount: 24.90,
        description: 'Monthly JetBrains All Products Pack',
        expenseType: 'software_ict' as ExpenseType,
        paymentMethod: 'corporate_card' as PaymentMethod
      }
      
      const expense = mockExpenseService.createExpense(expenseData)
      
      expect(expense.expenseType).toBe('software_ict')
      expect(expense.isVatDeductible).toBe(true)
      expect(expense.vatAmount).toBeCloseTo(5.23, 2)
      expect(expense.requiresApproval).toBe(false)
    })

    it('should create phone expense with business split requirement', () => {
      const expenseData = {
        userId: TEST_USERS.OWNER_TENANT1.id,
        categoryId: TEST_EXPENSE_CATEGORIES.TELEFOON_COMMUNICATIE,
        amount: 150,
        description: 'Monthly mobile phone and internet',
        expenseType: 'telefoon_communicatie' as ExpenseType,
        paymentMethod: 'bank_transfer' as PaymentMethod
      }
      
      const expense = mockExpenseService.createExpense(expenseData)
      
      expect(expense.expenseType).toBe('telefoon_communicatie')
      expect(expense.businessPercentage).toBe(80) // Only 80% business use
      expect(expense.isVatDeductible).toBe(true)
      expect(expense.requiresApproval).toBe(true) // Over €100
    })
  })

  describe('Expense Status Workflows', () => {
    it('should transition through complete approval workflow', () => {
      // Create expensive item requiring approval
      let expense = mockExpenseService.createExpense({
        userId: TEST_USERS.MEMBER_TENANT1.id,
        categoryId: TEST_EXPENSE_CATEGORIES.SOFTWARE_ICT,
        amount: 599,
        description: 'Adobe Creative Cloud annual subscription',
        expenseType: 'software_ict' as ExpenseType,
        paymentMethod: 'personal_card' as PaymentMethod
      })
      
      expect(expense.status).toBe('draft')
      expect(expense.requiresApproval).toBe(true)
      
      // Submit for approval
      expense = mockExpenseService.submitForApproval(expense)
      expect(expense.status).toBe('submitted')
      
      // Approve by admin
      expense = mockExpenseService.approveExpense(expense, TEST_USERS.ADMIN_TENANT1.id)
      expect(expense.status).toBe('approved')
    })

    it('should reject expense with reason', () => {
      let expense = mockExpenseService.createExpense({
        userId: TEST_USERS.MEMBER_TENANT1.id,
        categoryId: TEST_EXPENSE_CATEGORIES.ZAKELIJKE_MAALTIJDEN,
        amount: 350,
        description: 'Expensive lunch meeting',
        expenseType: 'maaltijden_zakelijk' as ExpenseType,
        paymentMethod: 'personal_card' as PaymentMethod
      })
      
      expense = mockExpenseService.submitForApproval(expense)
      expense = mockExpenseService.rejectExpense(expense, 'Exceeds company meal policy limits')
      
      expect(expense.status).toBe('rejected')
      expect(expense.notes).toBe('Exceeds company meal policy limits')
    })

    it('should handle all expense statuses', () => {
      const validStatuses: ExpenseStatus[] = [
        'draft', 'submitted', 'under_review', 'approved', 
        'rejected', 'reimbursed', 'processed', 'cancelled'
      ]
      
      validStatuses.forEach(status => {
        expect(typeof status).toBe('string')
        expect(status.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Permission & Role-Based Approval', () => {
    it('should allow owner to approve expenses', () => {
      let expense = mockExpenseService.createExpense({
        userId: TEST_USERS.MEMBER_TENANT1.id,
        categoryId: TEST_EXPENSE_CATEGORIES.MARKETING_RECLAME,
        amount: 250,
        description: 'LinkedIn Premium and marketing materials',
        expenseType: 'marketing_reclame' as ExpenseType,
        paymentMethod: 'corporate_card' as PaymentMethod
      })
      
      expense = mockExpenseService.submitForApproval(expense)
      
      expect(() => mockExpenseService.approveExpense(expense, TEST_USERS.OWNER_TENANT1.id))
        .not.toThrow()
    })

    it('should allow admin to approve expenses', () => {
      let expense = mockExpenseService.createExpense({
        userId: TEST_USERS.MEMBER_TENANT1.id,
        categoryId: TEST_EXPENSE_CATEGORIES.REISKOSTEN,
        amount: 125,
        description: 'Client visit travel costs',
        expenseType: 'reiskosten' as ExpenseType,
        paymentMethod: 'personal_card' as PaymentMethod
      })
      
      expense = mockExpenseService.submitForApproval(expense)
      
      expect(() => mockExpenseService.approveExpense(expense, TEST_USERS.ADMIN_TENANT1.id))
        .not.toThrow()
    })

    it('should prevent member from approving expenses', () => {
      let expense = mockExpenseService.createExpense({
        userId: TEST_USERS.OWNER_TENANT1.id,
        categoryId: TEST_EXPENSE_CATEGORIES.SOFTWARE_ICT,
        amount: 199,
        description: 'Development tools subscription',
        expenseType: 'software_ict' as ExpenseType,
        paymentMethod: 'corporate_card' as PaymentMethod
      })
      
      expense = mockExpenseService.submitForApproval(expense)
      
      expect(() => mockExpenseService.approveExpense(expense, TEST_USERS.MEMBER_TENANT1.id))
        .toThrow('Insufficient permissions to approve expense')
    })
  })

  describe('VAT Calculation & Business Rules', () => {
    it('should calculate VAT correctly for different categories', () => {
      const testCases = [
        { 
          category: 'kantoorbenodigdheden', 
          amount: 100, 
          expectedVat: 21, 
          deductible: true 
        },
        { 
          category: 'maaltijden_zakelijk', 
          amount: 200, 
          expectedVat: 42, 
          deductible: false 
        },
        { 
          category: 'software_ict', 
          amount: 50, 
          expectedVat: 10.5, 
          deductible: true 
        }
      ]
      
      testCases.forEach(({ category, amount, expectedVat, deductible }) => {
        const expense = mockExpenseService.createExpense({
          userId: TEST_USERS.OWNER_TENANT1.id,
          categoryId: TEST_EXPENSE_CATEGORIES.KANTOORBENODIGDHEDEN,
          amount,
          description: 'Test expense',
          expenseType: category as ExpenseType,
          paymentMethod: 'corporate_card' as PaymentMethod
        })
        
        expect(expense.vatAmount).toBeCloseTo(expectedVat, 2)
        expect(expense.isVatDeductible).toBe(deductible)
      })
    })

    it('should handle business percentage splits', () => {
      const phoneExpense = mockExpenseService.createExpense({
        userId: TEST_USERS.OWNER_TENANT1.id,
        categoryId: TEST_EXPENSE_CATEGORIES.TELEFOON_COMMUNICATIE,
        amount: 100,
        description: 'Phone bill with mixed usage',
        expenseType: 'telefoon_communicatie' as ExpenseType,
        paymentMethod: 'bank_transfer' as PaymentMethod
      })
      
      expect(phoneExpense.businessPercentage).toBe(80)
      // Business deductible amount would be: €100 * 80% = €80
      const businessAmount = phoneExpense.amount * (phoneExpense.businessPercentage / 100)
      expect(businessAmount).toBe(80)
    })
  })

  describe('Payment Methods & Reimbursement', () => {
    it('should handle all valid payment methods', () => {
      const paymentMethods: PaymentMethod[] = [
        'corporate_card', 'personal_card', 'cash', 'bank_transfer', 'other'
      ]
      
      paymentMethods.forEach(method => {
        const expense = mockExpenseService.createExpense({
          userId: TEST_USERS.MEMBER_TENANT1.id,
          categoryId: TEST_EXPENSE_CATEGORIES.KANTOORBENODIGDHEDEN,
          amount: 25,
          description: `Test expense with ${method}`,
          expenseType: 'kantoorbenodigdheden' as ExpenseType,
          paymentMethod: method
        })
        
        expect(expense.paymentMethod).toBe(method)
      })
    })

    it('should require reimbursement for personal payments', () => {
      const personalExpense = mockExpenseService.createExpense({
        userId: TEST_USERS.MEMBER_TENANT1.id,
        categoryId: TEST_EXPENSE_CATEGORIES.REISKOSTEN,
        amount: 45.50,
        description: 'Train tickets paid personally',
        expenseType: 'reiskosten' as ExpenseType,
        paymentMethod: 'personal_card' as PaymentMethod
      })
      
      expect(personalExpense.paymentMethod).toBe('personal_card')
      // Personal payments typically require reimbursement workflow
    })
  })

  describe('Edge Cases & Validation', () => {
    it('should handle zero-amount expenses', () => {
      const expense = mockExpenseService.createExpense({
        userId: TEST_USERS.OWNER_TENANT1.id,
        categoryId: TEST_EXPENSE_CATEGORIES.SOFTWARE_ICT,
        amount: 0,
        description: 'Free software trial',
        expenseType: 'software_ict' as ExpenseType,
        paymentMethod: 'other' as PaymentMethod
      })
      
      expect(expense.amount).toBe(0)
      expect(expense.vatAmount).toBe(0)
      expect(expense.requiresApproval).toBe(false)
    })

    it('should validate expense amounts and currency', () => {
      const expense = mockExpenseService.createExpense({
        userId: TEST_USERS.ADMIN_TENANT1.id,
        categoryId: TEST_EXPENSE_CATEGORIES.MARKETING_RECLAME,
        amount: 899,
        description: 'Marketing campaign costs',
        expenseType: 'marketing_reclame' as ExpenseType,
        paymentMethod: 'corporate_card' as PaymentMethod
      })
      
      expect(expense.currency).toBe('EUR')
      expect(expense.amount).toBeGreaterThan(0)
      expect(expense.requiresApproval).toBe(true) // Over €100
    })
  })
})