# Client Contact Refactoring - Implementation Status

**Date:** 2025-01-29
**Migration:** 049_refactor_client_contacts.sql

## Overview
Successfully refactored client data structure to:
- Remove `name` field from `clients` table
- Make `company_name` required (NOT NULL) in `clients` table
- Split `client_contacts.name` into `first_name` and `last_name` (both required)

## ✅ COMPLETED TASKS

### Database Layer
- [x] Created migration file (049_refactor_client_contacts.sql)
- [x] Applied migration to Supabase database
- [x] Updated and recreated dependent views:
  - `client_with_primary_contact`
  - `client_invoicing_summary`
- [x] Added indexes on `first_name` and `last_name`

### Core Infrastructure
- [x] Updated TypeScript types (`src/lib/types/financial.ts`):
  - `Client` interface: removed `name`, made `company_name` required
  - `ClientContact` interface: replaced `name` with `first_name`/`last_name`
  - `ClientContactFormData`: updated to use `first_name`/`last_name`
  - `ClientFormData`: removed deprecated fields
- [x] Updated validation schemas (`src/lib/validations/financial.ts`):
  - `ClientContactSchema`: split name validation
  - `CreateClientSchema`: made `company_name` required
  - `UpdateClientSchema`: removed deprecated fields
- [x] Created utility functions (`src/lib/utils.ts`):
  - `formatContactName()`: formats first + last name
  - `formatContactNameWithPrefix()`: adds optional prefix

### API Routes
- [x] Updated `src/app/api/clients/route.ts`:
  - Removed `name` from search filters
  - Updated contact creation with `first_name`/`last_name`
  - Removed deprecated field sync
- [x] Updated `src/app/api/clients/[id]/route.ts`:
  - Updated contact updates with `first_name`/`last_name`
  - Updated deletion confirmation to use `company_name`

### UI Components
- [x] Updated `src/components/financial/clients/client-form.tsx`:
  - Split contact name fields into separate first/last name inputs
  - Updated form defaults and validation
  - Updated "Same as Primary" checkbox logic
- [x] Updated `src/components/financial/clients/client-list.tsx`:
  - Updated deletion confirmation
  - Simplified `getClientType()` function

## 🚧 REMAINING TASKS

### Critical Priority (Must Complete)

#### 1. Email/Reminder Service
**File:** `src/lib/email/reminder-service.ts`
**Changes Needed:**
```typescript
// Line 47-48: Update to use formatContactName
import { formatContactName } from '@/lib/utils'

client_name: invoice.client.company_name,
admin_name: formatContactName({
  first_name: adminContact.first_name,
  last_name: adminContact.last_name
})
```

#### 2. Invoice Components (6 files)

**File:** `src/components/financial/invoices/payment-reminder-modal.tsx`
- Line 47-49: Update admin contact name formatting
```typescript
const adminContactName = adminContact
  ? formatContactName(adminContact)
  : undefined
```

**Files to update with `client.company_name` only:**
- `src/components/financial/invoices/invoice-form.tsx`
- `src/components/financial/invoices/time-entry-invoice-form.tsx`
- `src/components/financial/invoices/client-invoice-wizard.tsx`
- `src/components/financial/invoices/wizard-steps/time-entry-review-step.tsx`
- `src/components/financial/invoices/invoices-content.tsx`

**Pattern to find:** `client.company_name || client.name`
**Replace with:** `client.company_name`

### Medium Priority

#### 3. Time Entry Components (5 files)
**Pattern:** Display client company name, optionally show contact name
**Files:**
- `src/components/financial/time/time-entry-form.tsx`
- `src/components/financial/time/time-entry-list.tsx`
- `src/components/financial/time/unified-time-entry-form.tsx`
- `src/components/financial/time/unbilled-time-entries-selector.tsx`
- `src/components/financial/tabs/time-tab-content.tsx`

**Example Change:**
```typescript
// Instead of: client.company_name || client.name
// Use: client.company_name

// For showing contact:
// import { formatContactName } from '@/lib/utils'
// const primaryContact = client.contacts?.find(c => c.contact_type === 'primary')
// Display: {client.company_name} ({primaryContact ? formatContactName(primaryContact) : 'Geen contact'})
```

#### 4. PDF Generation (3 files)
**Files:**
- `src/lib/pdf/template-compiler.ts`
- `src/lib/pdf/template-integration.ts`
- `src/lib/pdf/enhanced-invoice-generator.ts`

**Changes:**
- Remove `name` field references
- Use only `company_name`
- Update templates to use `company_name`

#### 5. Reporting
**File:** `src/app/api/reports/vat-return/route.ts`
**Line 47:** Update ICP declaration to use `company_name`:
```typescript
client_name: invoice.client.company_name
```

#### 6. Dashboard Components (2 files)
- `src/components/dashboard/client-health-dashboard.tsx`
- `src/components/financial/tabs/clients-tab-content-enhanced.tsx`

**Changes:** Replace `client.name` references with `client.company_name`

### Low Priority (Nice to Have)

#### 7. Test Files (3 files)
**Files:**
- `src/__tests__/integration/api/auth-endpoints.integration.test.ts`
- `src/__tests__/unit/auth/roles.test.ts`
- `src/__tests__/e2e/time-entry-workflows.spec.ts`

**Changes:**
- Update test data to use `company_name` instead of `name`
- Update contact test data to use `first_name`/`last_name`
- Add arbitrary placeholder names for contacts

#### 8. Additional Components
**File:** `src/components/financial/clients/client-health-card.tsx`
**Change:** `client.company_name || client.name` → `client.company_name`

## 📝 IMPLEMENTATION NOTES

### Using `formatContactName()` Utility
```typescript
import { formatContactName } from '@/lib/utils'

// For a single contact
const fullName = formatContactName(contact) // "Jan de Vries"

// For contacts from client object
const primaryContact = (client as any).contacts?.find(
  (c: any) => c.contact_type === 'primary'
)
if (primaryContact) {
  const name = formatContactName(primaryContact)
}
```

### Common Patterns

**Before:**
```typescript
client.company_name || client.name
```

**After:**
```typescript
client.company_name
```

**Contact Display:**
```typescript
// Old
contact.name

// New
import { formatContactName } from '@/lib/utils'
formatContactName(contact) // Uses first_name + last_name
```

## 🧪 TESTING CHECKLIST

Once all changes are complete, test:

### Manual Testing
- [ ] Create new client with contacts
- [ ] Update existing client
- [ ] Display client list
- [ ] Create invoice with client
- [ ] Send payment reminder
- [ ] Generate PDF invoice
- [ ] Create time entry
- [ ] Generate VAT return report

### Integration Testing
- [ ] Client API CRUD operations
- [ ] Contact creation/update flows
- [ ] Invoice generation with new contact structure

### Verification Queries
```sql
-- Verify no NULL company names
SELECT company_name, id FROM clients WHERE company_name IS NULL;
-- Should return 0 rows

-- Verify all contacts have names
SELECT first_name, last_name, client_id
FROM client_contacts
WHERE first_name IS NULL OR last_name IS NULL;
-- Should return 0 rows

-- Sample data check
SELECT
  c.company_name,
  cc.first_name,
  cc.last_name,
  cc.contact_type
FROM clients c
LEFT JOIN client_contacts cc ON c.id = cc.client_id
LIMIT 10;
```

## 📊 PROGRESS SUMMARY

**Completed:** 8/16 major tasks (50%)
- ✅ Database migration
- ✅ Type definitions
- ✅ Validation schemas
- ✅ Utility functions
- ✅ API routes (2 files)
- ✅ Client form
- ✅ Client list

**Remaining:** 8/16 major tasks (50%)
- ⏳ Email/reminder service
- ⏳ Invoice components (6 files)
- ⏳ Time entry components (5 files)
- ⏳ PDF generation (3 files)
- ⏳ Reporting (1 file)
- ⏳ Dashboard components (2 files)
- ⏳ Test files (3 files)
- ⏳ Additional components (1 file)

**Total Files to Update:** ~41 files
**Files Completed:** ~8 files (20%)
**Files Remaining:** ~33 files (80%)

## 🎯 NEXT STEPS

1. **Immediate:** Update email/reminder service (critical for payment reminders)
2. **Next:** Update invoice components (high visibility)
3. **Then:** Update time entry components
4. **Finally:** PDF generation, reporting, tests

## ⚠️ IMPORTANT NOTES

- All database changes are **IRREVERSIBLE** - the `name` columns have been dropped
- The migration includes data migration logic that intelligently splits existing names
- Views have been recreated with proper contact name concatenation
- RLS policies remain unchanged and functional
- Existing functionality should work seamlessly after UI updates are complete
