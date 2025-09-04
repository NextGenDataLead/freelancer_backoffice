# Approval Flow Implementation Progress

## Completed Work

### ✅ Expense Approval System
- **Created API endpoint**: `/src/app/api/expenses/[id]/approve/route.ts`
  - PATCH method toggles expense status between 'draft' and 'approved'
  - Triggers BTW calculation updates via database triggers
  - Includes proper validation and audit logging

- **Updated Expense List Component**: `/src/components/financial/expenses/expense-list.tsx`
  - Added approval checkbox column ("Goedkeuring")
  - Added loading state for approval changes
  - Added `handleApprovalToggle()` function
  - Added `approvingExpenses` state to track loading
  - Imports: Added `Loader2`, `Checkbox`

### ✅ Database Cleanup Issue Fixed
- **Root cause identified**: Stale `international_trade_transactions` data causing incorrect BTW calculations (588 instead of 210)
- **Solution**: Complete cleanup of all derived tables
- **Result**: Clean BTW calculation showing all zeros for Q1 2025

## Pending Work

### 🔄 Invoice Send Functionality
**Location**: `/src/components/financial/invoices/invoice-list.tsx`

**Existing Infrastructure**:
- Invoice status API already exists: `/src/app/api/invoices/[id]/status/route.ts`
- Uses `UpdateInvoiceStatusSchema` for validation
- Invoice list component exists with `Send` icon imported

**TODO**:
1. Add `sendingInvoices` state to track loading states
2. Add `handleSendInvoice()` function to change status from 'draft' to 'sent'
3. Add send button to invoice table row actions
4. Add loading spinner when sending
5. Update local state after successful send

**Implementation Pattern**:
```typescript
const [sendingInvoices, setSendingInvoices] = useState<Set<string>>(new Set())

const handleSendInvoice = async (invoice: InvoiceWithClient) => {
  const invoiceId = invoice.id
  setSendingInvoices(prev => new Set(prev).add(invoiceId))
  
  try {
    const response = await fetch(`/api/invoices/${invoiceId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sent' })
    })
    
    if (!response.ok) throw new Error('Failed to send invoice')
    
    setInvoices(prev => prev.map(inv => 
      inv.id === invoiceId ? { ...inv, status: 'sent' } : inv
    ))
  } catch (error) {
    // Handle error
  } finally {
    setSendingInvoices(prev => {
      const updated = new Set(prev)
      updated.delete(invoiceId)
      return updated
    })
  }
}
```

## Architecture Overview

### Expense Approval Flow
1. **User clicks checkbox** → triggers `handleApprovalToggle()`
2. **API call** → `PATCH /api/expenses/[id]/approve`
3. **Database update** → status changes to 'approved'/'draft'
4. **Database triggers** → BTW calculations update automatically
5. **UI update** → checkbox state and local state updated

### Invoice Send Flow
1. **User clicks send button** → triggers `handleSendInvoice()`
2. **API call** → `PATCH /api/invoices/[id]/status`
3. **Database update** → status changes to 'sent'
4. **Database triggers** → BTW calculations and ICP updated automatically
5. **UI update** → button state and local state updated

## Expected End-to-End Test Flow

### Test Scenario: Romanian Service Expense
1. **Add expense** via OCR form (MUSICMEDIATECH S.R.L., €600, marketing_reclame)
2. **OCR detects** `supplier_country: 'RO'` and shows reverse charge warning
3. **API calculates** `acquisition_type: 'eu_services'` automatically
4. **Expense shows** in list with unchecked approval box
5. **User checks** approval box → expense becomes 'approved'
6. **BTW dashboard** updates:
   - Section 4b: €600 (EU services acquisition)
   - Section 5b: €126 (reverse charge deductible)
   - Section 5a: remains correct (invoices only)

### Current Status
- **Database**: Completely clean ✅
- **Expense approval**: Working ✅ 
- **Invoice sending**: Needs completion 🔄
- **End-to-end flow**: Ready for testing after invoice send completion

## Next Session Tasks
1. Complete invoice send button implementation
2. Test complete expense approval flow
3. Test BTW calculation accuracy with approved expenses
4. Verify EU classification works correctly for Romanian services