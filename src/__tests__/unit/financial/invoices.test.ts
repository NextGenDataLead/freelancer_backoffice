/**
 * Invoice Workflows Unit Tests
 * Testing all invoice statuses, VAT calculations, and financial workflows
 */

import { describe, it, expect, vi } from 'vitest'
import { TEST_USERS, TEST_CLIENTS } from '../../setup/test-setup'

// Invoice status types from our seed data
type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'partial' | 'cancelled'
type VatType = 'standard' | 'reverse_charge' | 'exempt' | 'reduced'

interface Invoice {
  id: string
  clientId: string
  amount: number
  vatType: VatType
  vatRate: number
  vatAmount: number
  totalAmount: number
  status: InvoiceStatus
  paidAmount?: number
  currency: string
}

// Mock VAT calculation service
const calculateVat = (amount: number, vatType: VatType, vatRate: number = 0.21): { vatAmount: number; totalAmount: number } => {
  switch (vatType) {
    case 'standard':
      const vatAmount = amount * vatRate
      return { vatAmount, totalAmount: amount + vatAmount }
    case 'reverse_charge':
    case 'exempt':
      return { vatAmount: 0, totalAmount: amount }
    case 'reduced':
      const reducedVat = amount * 0.09 // 9% for books/education
      return { vatAmount: reducedVat, totalAmount: amount + reducedVat }
    default:
      return { vatAmount: 0, totalAmount: amount }
  }
}

// Mock invoice service
const mockInvoiceService = {
  createInvoice: vi.fn().mockImplementation((data: Partial<Invoice>): Invoice => {
    const { vatAmount, totalAmount } = calculateVat(data.amount!, data.vatType!, data.vatRate)
    
    return {
      id: `inv-${Date.now()}`,
      status: 'draft',
      vatAmount,
      totalAmount,
      currency: 'EUR',
      paidAmount: 0,
      ...data
    } as Invoice
  }),

  updateStatus: vi.fn().mockImplementation((invoice: Invoice, newStatus: InvoiceStatus): Invoice => {
    return { ...invoice, status: newStatus }
  }),

  processPayment: vi.fn().mockImplementation((invoice: Invoice, paymentAmount: number): Invoice => {
    const newPaidAmount = (invoice.paidAmount || 0) + paymentAmount
    let newStatus: InvoiceStatus = invoice.status
    
    if (newPaidAmount >= invoice.totalAmount) {
      newStatus = 'paid'
    } else if (newPaidAmount > 0) {
      newStatus = 'partial'
    }
    
    return { ...invoice, paidAmount: newPaidAmount, status: newStatus }
  })
}

describe('Invoice Financial Workflows', () => {
  describe('VAT Calculations', () => {
    it('should calculate standard VAT (21%) correctly', () => {
      const amount = 1000
      const result = calculateVat(amount, 'standard', 0.21)
      
      expect(result.vatAmount).toBe(210)
      expect(result.totalAmount).toBe(1210)
    })

    it('should handle reverse charge VAT (0%) for B2B EU', () => {
      const amount = 1500
      const result = calculateVat(amount, 'reverse_charge')
      
      expect(result.vatAmount).toBe(0)
      expect(result.totalAmount).toBe(1500)
    })

    it('should handle exempt VAT for educational services', () => {
      const amount = 800
      const result = calculateVat(amount, 'exempt')
      
      expect(result.vatAmount).toBe(0)
      expect(result.totalAmount).toBe(800)
    })

    it('should calculate reduced VAT (9%) for books/education', () => {
      const amount = 100
      const result = calculateVat(amount, 'reduced', 0.09)
      
      expect(result.vatAmount).toBe(9)
      expect(result.totalAmount).toBe(109)
    })
  })

  describe('Invoice Creation & Status Management', () => {
    it('should create invoice with standard VAT', () => {
      const invoiceData = {
        clientId: TEST_CLIENTS.NEXTGEN_DATA_LEAD.id,
        amount: 1275,
        vatType: 'standard' as VatType,
        vatRate: 0.21
      }
      
      const invoice = mockInvoiceService.createInvoice(invoiceData)
      
      expect(invoice.status).toBe('draft')
      expect(invoice.amount).toBe(1275)
      expect(invoice.vatAmount).toBe(267.75)
      expect(invoice.totalAmount).toBe(1542.75)
      expect(invoice.currency).toBe('EUR')
    })

    it('should create reverse charge invoice for EU B2B', () => {
      const invoiceData = {
        clientId: TEST_CLIENTS.MASTER_DATA_PARTNERS.id, // Belgian client
        amount: 1680,
        vatType: 'reverse_charge' as VatType
      }
      
      const invoice = mockInvoiceService.createInvoice(invoiceData)
      
      expect(invoice.vatType).toBe('reverse_charge')
      expect(invoice.vatAmount).toBe(0)
      expect(invoice.totalAmount).toBe(1680)
    })

    it('should transition through all invoice statuses', () => {
      let invoice = mockInvoiceService.createInvoice({
        clientId: TEST_CLIENTS.ID_DATA_SOLUTIONS.id,
        amount: 500,
        vatType: 'standard' as VatType
      })
      
      // Draft → Sent
      invoice = mockInvoiceService.updateStatus(invoice, 'sent')
      expect(invoice.status).toBe('sent')
      
      // Sent → Overdue (would be triggered by cron job)
      invoice = mockInvoiceService.updateStatus(invoice, 'overdue')
      expect(invoice.status).toBe('overdue')
      
      // Overdue → Paid
      invoice = mockInvoiceService.updateStatus(invoice, 'paid')
      expect(invoice.status).toBe('paid')
    })

    it('should handle invoice cancellation', () => {
      let invoice = mockInvoiceService.createInvoice({
        clientId: TEST_CLIENTS.NEXTGEN_DATA_LEAD.id,
        amount: 1200,
        vatType: 'standard' as VatType
      })
      
      invoice = mockInvoiceService.updateStatus(invoice, 'cancelled')
      expect(invoice.status).toBe('cancelled')
    })
  })

  describe('Payment Processing & Partial Payments', () => {
    it('should handle full payment', () => {
      let invoice = mockInvoiceService.createInvoice({
        clientId: TEST_CLIENTS.NEXTGEN_DATA_LEAD.id,
        amount: 800,
        vatType: 'standard' as VatType,
        vatRate: 0.21
      })
      
      // Total should be 800 + 168 = 968
      expect(invoice.totalAmount).toBe(968)
      
      // Pay full amount
      invoice = mockInvoiceService.processPayment(invoice, 968)
      
      expect(invoice.status).toBe('paid')
      expect(invoice.paidAmount).toBe(968)
    })

    it('should handle partial payment', () => {
      let invoice = mockInvoiceService.createInvoice({
        clientId: TEST_CLIENTS.ID_DATA_SOLUTIONS.id,
        amount: 800,
        vatType: 'standard' as VatType,
        vatRate: 0.21
      })
      
      // Total: 968, partial payment: 500
      invoice = mockInvoiceService.processPayment(invoice, 500)
      
      expect(invoice.status).toBe('partial')
      expect(invoice.paidAmount).toBe(500)
      
      // Complete the payment
      invoice = mockInvoiceService.processPayment(invoice, 468)
      
      expect(invoice.status).toBe('paid')
      expect(invoice.paidAmount).toBe(968)
    })

    it('should handle multiple partial payments', () => {
      let invoice = mockInvoiceService.createInvoice({
        clientId: TEST_CLIENTS.MASTER_DATA_PARTNERS.id,
        amount: 1000,
        vatType: 'reverse_charge' as VatType
      })
      
      expect(invoice.totalAmount).toBe(1000) // No VAT for reverse charge
      
      // First partial payment
      invoice = mockInvoiceService.processPayment(invoice, 300)
      expect(invoice.status).toBe('partial')
      expect(invoice.paidAmount).toBe(300)
      
      // Second partial payment  
      invoice = mockInvoiceService.processPayment(invoice, 200)
      expect(invoice.status).toBe('partial')
      expect(invoice.paidAmount).toBe(500)
      
      // Final payment
      invoice = mockInvoiceService.processPayment(invoice, 500)
      expect(invoice.status).toBe('paid')
      expect(invoice.paidAmount).toBe(1000)
    })
  })

  describe('Currency & International Scenarios', () => {
    it('should handle EUR currency (primary)', () => {
      const invoice = mockInvoiceService.createInvoice({
        clientId: TEST_CLIENTS.NEXTGEN_DATA_LEAD.id,
        amount: 1000,
        vatType: 'standard' as VatType,
        currency: 'EUR'
      })
      
      expect(invoice.currency).toBe('EUR')
    })

    it('should validate invoice amounts and calculations', () => {
      // Test cases from our seed data
      const testCases = [
        { amount: 1275, vatRate: 0.21, expectedVat: 267.75, expectedTotal: 1542.75 },
        { amount: 885, vatRate: 0.21, expectedVat: 185.85, expectedTotal: 1070.85 },
        { amount: 845, vatRate: 0.21, expectedVat: 177.45, expectedTotal: 1022.45 }
      ]
      
      testCases.forEach(({ amount, vatRate, expectedVat, expectedTotal }) => {
        const result = calculateVat(amount, 'standard', vatRate)
        expect(result.vatAmount).toBeCloseTo(expectedVat, 2)
        expect(result.totalAmount).toBeCloseTo(expectedTotal, 2)
      })
    })
  })

  describe('Business Logic Edge Cases', () => {
    it('should handle zero amount invoices', () => {
      const invoice = mockInvoiceService.createInvoice({
        clientId: TEST_CLIENTS.NEXTGEN_DATA_LEAD.id,
        amount: 0,
        vatType: 'standard' as VatType
      })
      
      expect(invoice.amount).toBe(0)
      expect(invoice.vatAmount).toBe(0)
      expect(invoice.totalAmount).toBe(0)
    })

    it('should handle overpayment scenarios', () => {
      let invoice = mockInvoiceService.createInvoice({
        clientId: TEST_CLIENTS.ID_DATA_SOLUTIONS.id,
        amount: 100,
        vatType: 'standard' as VatType,
        vatRate: 0.21
      })
      
      // Total: 121, overpay: 150
      invoice = mockInvoiceService.processPayment(invoice, 150)
      
      expect(invoice.status).toBe('paid') // Should still be marked as paid
      expect(invoice.paidAmount).toBe(150) // Track overpayment
    })

    it('should validate VAT rates', () => {
      const validRates = [0.21, 0.09, 0.06, 0.00]
      
      validRates.forEach(rate => {
        const result = calculateVat(1000, 'standard', rate)
        expect(result.vatAmount).toBe(1000 * rate)
        expect(result.totalAmount).toBe(1000 + (1000 * rate))
      })
    })
  })
})