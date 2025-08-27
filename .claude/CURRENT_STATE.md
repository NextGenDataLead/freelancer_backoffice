# CURRENT STATE: Logo Not Displaying in PDF Invoices

## Issue Summary
The logo is not displaying in generated PDF invoices despite being properly configured in the database. The invoice PDF generation works correctly for all other content, but the logo image is missing from the header section.

## Database Verification ✅
- **Template Config Exists**: Confirmed active template config in `invoice_template_config` table
- **Logo URL Present**: `"logo_url":"https://www.logoai.com/oss/icons/2021/10/27/gwBCTCVlpMwn55h.png"`
- **Show Logo Enabled**: `"show_logo":true`
- **Logo Width Set**: `"logo_width":"120px"`

## System Architecture Analysis

### Data Flow Path
1. **Database** → `invoice_template_config.brand_settings.logo_url`
2. **Template Integration** → `src/lib/pdf/template-integration.ts:129` maps to `business_profile.logo_url`
3. **Template Context** → Passed to Handlebars template as `brand_settings` and `business_profile`
4. **Handlebars Template** → `professional-template.hbs:505-509` renders logo using `logoImage` helper
5. **Logo Helper** → `src/lib/pdf/template-compiler.ts` generates `<img>` tag
6. **PDF Generation** → Puppeteer renders final PDF

### Components Verified Working ✅
- **Database Configuration**: Logo URL properly stored and retrievable
- **Handlebars Helper**: `logoImage` function correctly implemented and registered
- **Template Logic**: Conditional rendering logic `{{#if brand_settings.show_logo}}` is correct
- **PDF Generation**: Puppeteer successfully generates PDFs with all other content
- **Image Rendering**: Enhanced Puppeteer settings for better image support added

## Root Cause Investigation

### Primary Issue: Template Context Data Flow 🔍
The core problem appears to be in the data mapping between:
1. Database `template_config.brand_settings.logo_url` 
2. Template context `brand_settings.logo_url` OR `business_profile.logo_url`

### Key Finding: Default Template Config Override
In `src/lib/pdf/template-integration.ts:266-278`, there's a `getDefaultTemplateConfig()` function that creates a template with:
```typescript
brand_settings: {
  logo_url: undefined,  // ← This overrides the database value!
  show_logo: true,
  // ... other settings
}
```

This default config is used when:
- Database query fails (lines 47-49)
- Database import fails (lines 59-61)

## Attempted Solutions

### 1. Enhanced Context Mapping ✅
**File**: `src/lib/pdf/enhanced-invoice-generator.ts:288-304`
**Action**: Added fallback logic to copy logo URL from template config to business profile
```typescript
if (!enhanced.business_profile.logo_url && context.template_config?.brand_settings?.logo_url) {
  enhanced.business_profile.logo_url = context.template_config.brand_settings.logo_url
}
```
**Result**: Did not resolve the issue

### 2. Direct Template Fix ✅
**File**: `src/lib/pdf/templates/professional-template.hbs:505-509`
**Action**: Modified template to use logo URL directly from brand_settings first, then fallback to business_profile
```handlebars
{{#if brand_settings.logo_url}}
{{{logoImage brand_settings.logo_url brand_settings.logo_width}}}
{{else}}{{#if business_profile.logo_url}}
{{{logoImage business_profile.logo_url brand_settings.logo_width}}}
{{/if}}{{/if}}
```
**Result**: Did not resolve the issue (logo still missing)

### 3. Puppeteer Image Rendering Optimization ✅
**File**: `src/lib/pdf/enhanced-invoice-generator.ts:320-325`
**Action**: Added screen media type and enhanced wait conditions
```typescript
await page.emulateMediaType('screen')
await page.waitForTimeout(2000)
```
**Result**: PDF generation works but logo still not visible

### 4. Debug Logging Added ✅
**File**: `src/lib/pdf/template-integration.ts:47-51, 59-61`
**Action**: Added comprehensive logging to identify if database query succeeds or fails
**Status**: Deployed but server logs not accessible for verification

## Current Hypothesis
The issue is likely that the database query in `generateInvoicePDFWithTemplate()` is failing silently, causing the system to fall back to `getDefaultTemplateConfig()` which has `logo_url: undefined`.

Potential causes:
1. **Supabase Admin Client Import Issue**: `@/lib/supabase/financial-client` may not be properly configured
2. **Database Access Permissions**: Server-side query may lack proper permissions
3. **Query Logic Error**: The query might not be finding the active template config
4. **TypeScript Compilation**: The server-side code may not be properly compiled

## Next Steps & TODO

### Immediate Priority (Critical Path)
1. **Verify Database Query Success**
   - Access server logs to see debug output from template-integration.ts
   - Confirm whether database query succeeds or fails
   - If failing, identify the specific error

2. **Test Database Connection**
   - Create a simple API endpoint to test Supabase admin client connection
   - Verify the query logic works in isolation
   - Check if `@/lib/supabase/financial-client` import is working

3. **Fallback Testing**
   - Temporarily hardcode the logo URL in `getDefaultTemplateConfig()` to test if template rendering works
   - This will confirm if the issue is data retrieval vs. template rendering

### Secondary Priority
4. **Template Context Debugging**
   - Add server-side logging to see the exact context passed to template
   - Verify what values are in `brand_settings` and `business_profile` objects
   - Check if the template receives the correct data structure

5. **Alternative Data Path**
   - Consider passing logo URL through a different context path
   - Maybe bypass the template config system temporarily for logo specifically

### Long-term Improvements
6. **Error Handling Enhancement**
   - Improve error reporting for template config failures
   - Add fallback logo URL in environment variables
   - Implement retry logic for database queries

7. **Testing Infrastructure**
   - Create unit tests for template-integration.ts
   - Add integration tests for PDF generation
   - Set up proper logging infrastructure for server-side debugging

## Files Modified
- `src/lib/pdf/enhanced-invoice-generator.ts` - Enhanced context mapping, Puppeteer optimization
- `src/lib/pdf/templates/professional-template.hbs` - Direct brand_settings logo access
- `src/lib/pdf/template-integration.ts` - Added debug logging

## Files to Investigate Next
- `src/lib/supabase/financial-client.ts` - Verify Supabase admin client configuration
- `src/app/api/invoices/[id]/pdf/route.ts` - Check how template integration is called
- Environment configuration files - Verify Supabase credentials

## Expected Resolution Path
1. Fix database query issue in template-integration.ts
2. Ensure proper logo URL is passed to template context
3. Verify logo renders correctly in PDF output
4. Clean up debug code and optimize solution
5. Add proper error handling and logging

## Success Criteria
- ✅ Logo image displays in generated PDF invoices
- ✅ Logo respects configured width and position settings  
- ✅ Fallback handling works when logo URL is unavailable
- ✅ No regression in other PDF content or functionality