# Facturen Dashboard & Time-Based Invoicing System

## Implementation Status - UPDATED 2025-08-21

### ✅ COMPLETED FEATURES
- ✅ TimeEntry interface with `invoiced: boolean` and `invoice_id` fields
- ✅ Client interface with invoicing frequency metadata (`invoicing_frequency`, `auto_invoice_enabled`)
- ✅ Database schema with invoicing frequency fields
- ✅ ClientInvoicingDashboard component showing clients ready for invoicing
- ✅ Multi-step ClientInvoiceWizard for time-based invoice creation
- ✅ API endpoint for creating invoices from selected time entries
- ✅ Time entry linking when invoices are created/deleted
- ✅ Client invoicing frequency configuration UI
- ✅ Professional PDF generation with Playwright
- ✅ Invoice number generation with tenant-specific sequences
- ✅ VAT calculation integration (standard, reverse charge, exempt)

## NEW DASHBOARD PLAN - Comprehensive Business Metrics

### 🎯 DASHBOARD STRUCTURE
**Top Section: 3 Business Metric Cards**
1. **"Factureerbaar"** - Time entries ready for invoicing based on client frequency
   - Monthly clients: Previous complete month (Feb 1st = all January entries)
   - Weekly clients: Previous complete week
   - On-demand clients: All unbilled time entries
   - Subtract amounts from paid/partial invoices

2. **"Totale registratie"** - All unbilled time entries regardless of frequency
   - Sum all unbilled time entries
   - Subtract paid/partial invoice amounts

3. **"Achterstallig"** - Overdue invoices past client payment terms
   - Use each client's `default_payment_terms` setting
   - Include "partial" status for partially paid invoices

**Middle Section: Action Cards (Keep Existing)**
- Templates, Herinneringen, BTW Overzicht

**Bottom Section: Complete Invoice List**
- All created invoices with integrated PDF download buttons
- Remove tab system, single comprehensive list
- Status indicators (draft/sent/paid/partial/overdue)

**Single "Nieuwe Factuur" Button**
- Opens modal with options: "Tijd-gebaseerde factuur" or "Handmatige factuur"

### 🔧 IMPLEMENTATION TASKS

## Required Changes

### 1. Client-Level Invoicing Metadata
**Add to Client interface:**
- `invoicing_frequency: 'weekly' | 'monthly' | 'on_demand'`
- `last_invoiced_date?: Date`
- `next_invoice_due_date?: Date`
- `auto_invoice_enabled: boolean`

### 2. Enhanced Facturen Dashboard
**Replace current dashboard with:**
- **Clients Ready for Invoicing** section showing clients with uninvoiced hours
- **Weekly invoicing clients** that need invoicing this week
- **Monthly invoicing clients** that need invoicing this month
- **Overdue invoicing** for clients past their due date
- Quick stats: Total unbilled hours, estimated revenue

### 3. New Invoice Creation Flow
**Complete workflow restructure:**

1. **Client Selection Step**: Choose client from "ready for invoicing" list
2. **Time Entries Selection Step**: 
   - Show all uninvoiced, billable time entries for selected client
   - Bulk select/deselect options ("Select All", "Select This Week/Month")
   - Individual entry selection with preview of totals
3. **Manual Entries Addition**: Option to add manual line items
4. **Review & Generate**: Standard invoice form with pre-populated time entries

### 4. Database Schema Updates
**New tables/columns needed:**
- Add invoicing frequency columns to `clients` table
- Update time entry linking when invoice is created
- Add API endpoints for uninvoiced time entries per client
- Add client invoicing status tracking

### 5. Time Entry Integration
**Enhanced time tracking:**
- Mark time entries as `invoiced: true` when invoice created
- Set `invoice_id` field to link back to invoice
- Add API to fetch uninvoiced entries per client
- Add API to calculate uninvoiced totals per client

### 6. New Components to Create
- `ClientInvoicingDashboard` - Shows clients ready for invoicing
- `ClientInvoiceWizard` - Multi-step invoice creation
- `TimeEntryInvoiceSelector` - Enhanced version of existing selector
- `InvoicingFrequencySettings` - Client configuration
- `UnbilledTimeReport` - Analytics for unbilled time

### 7. API Endpoints to Add/Update
- `GET /api/clients/ready-for-invoicing` - Clients with uninvoiced time
- `GET /api/time-entries/unbilled?client_id=X` - Uninvoiced entries per client
- `PUT /api/time-entries/mark-invoiced` - Bulk update time entries
- `POST /api/invoices/from-time-entries` - Create invoice from time entries
- `PUT /api/clients/[id]/invoicing-settings` - Update invoicing frequency

### 8. UI/UX Flow
**New user journey:**
1. Dashboard shows "3 clients ready for invoicing"
2. Click client → See uninvoiced time entries (e.g., "15.5 hours, €1,240")
3. Select time entries (with smart defaults)
4. Add manual items if needed
5. Review and create invoice
6. Time entries automatically marked as invoiced

### 9. Smart Features to Add
- **Auto-suggestions**: "Select all entries from last week/month"
- **Recurring invoice detection**: "Create similar invoice as last month"
- **Time validation**: Warn if unusual time entries (very high/low hours)
- **Client preferences**: Remember manual additions per client
- **Invoice templates**: Pre-fill descriptions based on time entry patterns

This restructure transforms the invoicing from a manual process to an intelligent, time-tracking-based system that guides users through the optimal workflow while maintaining flexibility for manual adjustments.

## Implementation Plan

### Phase 1: Data Structure Updates
1. Add invoicing frequency enum and fields to Client interface
2. Create database migration for new client fields
3. Update client API to support invoicing metadata

### Phase 2: Unbilled Time API
4. Create API endpoint to fetch unbilled time entries per client
5. Add client invoicing readiness calculation
6. Create endpoint for bulk time entry status updates

### Phase 3: New Dashboard
7. Create ClientInvoicingDashboard component
8. Replace current facturen page with time-based dashboard
9. Add client invoicing status indicators

### Phase 4: Invoice Creation Wizard
10. Create multi-step ClientInvoiceWizard
11. Enhance time entry selection with smart features
12. Integrate with existing invoice creation API

### Phase 5: Client Configuration
13. Add invoicing frequency settings to client forms
14. Create dedicated invoicing configuration UI
15. Add validation and business logic

### Phase 6: Smart Features & Polish
16. Add auto-suggestions and smart defaults
17. Implement time entry validation
18. Add analytics and reporting features