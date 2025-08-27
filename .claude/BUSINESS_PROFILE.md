# Business Profile Management - Implementation Plan

## Current Issue
SaaS customers have no UI to configure essential business information like KvK nummer, BTW nummer, betalingsvoorwaarden, etc. The template system is complete but requires business data that customers cannot currently enter.

## Current State Analysis

### ✅ Database Schema Ready
The `profiles` table already has business fields:
- `kvk_number` (KvK number) 
- `btw_number` (BTW/VAT number)
- `business_name`
- `business_type` 
- `hourly_rate`
- `financial_year_start`
- `kor_enabled`

### ❌ Missing Business Settings UI
**Problem**: No interface for customers to enter business information
- Current profile form (`src/components/profile/profile-form.tsx`) only handles basic user info (name, email)
- Template system generates professional PDFs but uses fallback business data
- Invoices may show placeholder text like "ZZP Administratie" instead of real business name

## Implementation Plan

### Phase 1: Business Settings Page
**Location**: `/dashboard/settings/business` or add "Business" tab to existing settings

**Required Components:**
1. **Business Identity Section**
   - Bedrijfsnaam (Business name) - text input
   - KvK nummer (Chamber of Commerce number) - text input with validation
   - BTW nummer (VAT number) - text input with EU VIES validation
   - Bedrijfstype (Business type) - select dropdown
   - Logo upload functionality

2. **Address Information Section**
   - Straatadres (Street address)
   - Postcode (Postal code)
   - Stad (City)
   - Land (Country) - defaults to Nederland
   - Telefoonnummer (Phone number)
   - Website URL

3. **Financial Configuration Section**
   - Standaard uurtarief (Default hourly rate) - number input
   - Financieel boekjaar start (Financial year start) - date picker
   - KOR regeling (Small business scheme) - boolean toggle

4. **Invoice Settings Section**
   - Standaard betalingsvoorwaarden (Default payment terms) - 14/30/60 days
   - Rente bij te late betaling (Late payment interest rate)
   - Standaard factuur omschrijving (Default invoice description)
   - Factuur footer tekst (Custom footer text)
   - Algemene voorwaarden (Terms & conditions) - textarea

### Phase 2: Integration with Template System
**Update template integration to use real business data:**
- Remove "ZZP Administratie" fallbacks
- Use actual business_name, KvK, BTW numbers from profile
- Apply custom payment terms and footer text
- Professional branding with uploaded logos

### Phase 3: Validation & Compliance
**Business Data Validation:**
- KvK number format validation (8 digits)
- BTW number EU VIES API validation
- Required field enforcement for invoice generation
- Dutch tax compliance checks

## Technical Implementation

### Files to Create
```
src/app/dashboard/settings/business/page.tsx          # Business settings page
src/components/business/business-form.tsx             # Main business form
src/components/business/business-identity.tsx         # Identity section
src/components/business/business-address.tsx          # Address section  
src/components/business/financial-settings.tsx       # Financial config
src/components/business/invoice-defaults.tsx          # Invoice settings
src/lib/validations/business.ts                      # Business data validation
src/app/api/user/business/route.ts                   # Business API endpoint
```

### Database Updates Required
**None - existing schema supports all business fields**

### Form Validation Schema
```typescript
export const businessProfileSchema = z.object({
  // Business Identity
  business_name: z.string().min(1, 'Bedrijfsnaam is verplicht'),
  kvk_number: z.string().regex(/^\d{8}$/, 'KvK nummer moet 8 cijfers zijn'),
  btw_number: z.string().regex(/^NL\d{9}B\d{2}$/, 'Ongeldig BTW nummer format'),
  business_type: z.enum(['sole_trader', 'partnership', 'bv', 'other']),
  
  // Address
  address: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  country_code: z.string().default('NL'),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  
  // Financial
  hourly_rate: z.number().min(0),
  financial_year_start: z.date(),
  kor_enabled: z.boolean().default(false),
  
  // Invoice Settings
  default_payment_terms: z.number().default(30),
  late_payment_interest: z.number().default(2.0),
  default_invoice_description: z.string().optional(),
  custom_footer_text: z.string().optional(),
  terms_conditions: z.string().optional()
})
```

### API Integration
```typescript
// GET /api/user/business - Fetch business profile
// PUT /api/user/business - Update business profile
// Includes validation, audit logging, grace period checks
```

### UI Integration Points
1. **Settings Navigation**: Add "Business" tab to `/dashboard/settings`
2. **Template Settings**: Link to business settings from template page
3. **Invoice Creation**: Warn if business info incomplete
4. **Onboarding Flow**: Add business setup step (optional)

## User Workflow

### Current User Experience Problem
1. ❌ User signs up → Only basic profile created
2. ❌ User generates invoice → Uses placeholder business data
3. ❌ PDF shows "ZZP Administratie" instead of real business name
4. ❌ No way to enter KvK/BTW numbers for compliance

### Improved User Experience 
1. ✅ User signs up → Completes basic onboarding
2. ✅ User navigates to Settings → Business tab
3. ✅ User enters complete business information (KvK, BTW, address, etc.)
4. ✅ User configures invoice defaults (payment terms, footer text)
5. ✅ User generates professional invoices with real business branding
6. ✅ Full Dutch tax compliance with proper KvK/BTW display

## Priority Tasks

### ☐ Phase 1: Core Business Settings (Week 1)
- ☐ Create business settings page UI (`/dashboard/settings/business`)
- ☐ Implement business profile form with all required fields
- ☐ Add business data validation (KvK, BTW number formats)
- ☐ Create API endpoint for business profile CRUD operations
- ☐ Test business information save/load functionality

### ☐ Phase 2: Template Integration (Week 1) 
- ☐ Update template system to use real business data
- ☐ Remove "ZZP Administratie" fallbacks from template integration
- ☐ Apply custom payment terms and footer text from business settings
- ☐ Test invoice generation with real business information
- ☐ Verify Dutch compliance with actual KvK/BTW numbers

### ☐ Phase 3: Enhanced Features (Week 2)
- ☐ Logo upload functionality for business branding
- ☐ EU VIES API integration for BTW number validation
- ☐ Custom terms & conditions text area
- ☐ Default invoice descriptions and automation
- ☐ Business information validation warnings

### ☐ Phase 4: User Experience Polish (Week 2)
- ☐ Add business setup to onboarding flow (optional step)
- ☐ Link business settings from template configuration page
- ☐ Warning messages when business info is incomplete
- ☐ Professional invoice preview with real business data
- ☐ Help text and tooltips for Dutch business requirements

## Business Value

### Immediate Benefits
- **Professional Invoicing**: Real business names instead of placeholders
- **Dutch Compliance**: Proper KvK/BTW number display on invoices
- **Brand Consistency**: Custom business information across all invoices
- **User Self-Service**: Complete business profile management

### Long-term Value
- **Tax Compliance**: Automated Dutch business tax requirements
- **Professional Image**: Complete business branding on all documents
- **Automation**: Default settings reduce manual invoice creation time
- **Scalability**: Foundation for advanced business features

## Technical Notes

### Integration Points
- **Template System**: Already supports business_profile context
- **Invoice Generation**: Uses business data from profiles table
- **API Structure**: Follows existing patterns in financial-client.ts
- **Validation**: Extends existing Zod schemas and error handling

### Security Considerations
- **RLS Policies**: Business data isolated by tenant_id
- **Grace Period**: Prevent business changes during account deletion
- **Audit Logging**: Track business information changes
- **Input Validation**: Protect against malicious business data

### Performance
- **Caching**: Business profile cached in auth store
- **Real-time**: Updates propagate to invoice generation immediately
- **Fallbacks**: Graceful degradation if business data incomplete

## Success Metrics

### Technical Success
- ✅ Complete business profile form with validation
- ✅ Real business data in generated invoices
- ✅ Dutch compliance with KvK/BTW display
- ✅ Professional branding with custom logos

### User Success  
- ✅ Self-service business information management
- ✅ Professional invoice appearance
- ✅ Compliance with Dutch business requirements
- ✅ Reduced manual invoice configuration time

---

## Current Template System Status: ✅ COMPLETE

**Achievement**: Professional invoice template system fully implemented
- ✅ 5 professional themes with customization
- ✅ Real-time preview and PDF generation
- ✅ Dutch VAT compliance and professional design
- ✅ Clean footer (removed generation timestamps)
- ✅ Backward compatible with existing invoice workflow

**Next Critical Step**: Implement business settings UI so customers can enter their real business information (KvK, BTW, business name) for professional invoicing.