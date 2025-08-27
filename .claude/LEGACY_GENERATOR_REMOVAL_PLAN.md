# Legacy Invoice Generator Removal Plan
*Generated with Claude Code (https://claude.ai/code)*

## Overview
Remove the legacy `invoice-generator.ts` system and fully migrate to the new template-based invoice generation system to resolve logo display issues and reduce technical debt.

## Current State Analysis

### ✅ Completed Work
- **Dutch Invoice Compliance**: Updated both systems with Dutch requirements
- **Logo Integration**: Added logo support to new template system
- **Address Formatting**: Country code positioning fixed  
- **Field Removal**: Removed Reference, Status, and Delivery Date fields
- **API Error Fix**: Fixed audit trigger for template configuration updates
- **Database Migration**: Integrated trigger fix into migration 013

### 🔍 Current Issue
- **Logo not displaying** because system may be falling back to legacy generator
- **Legacy generator lacks logo support** entirely
- **Two maintenance paths** creating complexity and bugs

## Removal Plan

### Phase 1: Code Analysis & Dependencies
- [x] Identify all references to legacy generator
- [x] Confirm new template system functionality
- [x] Verify template configuration is working

### Phase 2: Remove Legacy System
- [ ] Remove `src/lib/pdf/invoice-generator.ts` file
- [ ] Update `template-integration.ts` to remove all fallback logic
- [ ] Remove imports and references to legacy generator
- [ ] Simplify `generateSmartInvoicePDF` function

### Phase 3: Template Integration Cleanup  
- [ ] Remove fallback logic from `generateInvoicePDFWithTemplate()`
- [ ] Remove try/catch fallback in `generateSmartInvoicePDF()`
- [ ] Update function signatures to remove legacy options
- [ ] Ensure all API routes use new system exclusively

### Phase 4: Testing & Verification
- [ ] Test invoice generation via wizard (bulk)
- [ ] Test single invoice PDF generation
- [ ] Verify logo display functionality
- [ ] Test error handling without fallbacks
- [ ] Confirm all invoice formatting requirements

## Files to Modify

### Remove Entirely
- `src/lib/pdf/invoice-generator.ts` (legacy generator)

### Update
- `src/lib/pdf/template-integration.ts` (remove fallback logic)
- Any API routes that reference legacy system

## Benefits of Removal

### ✅ Immediate Benefits
1. **Logo Support**: Guaranteed logo display on all invoices
2. **Single Source of Truth**: Only new template system maintained
3. **Reduced Complexity**: No more dual-system logic
4. **Better Error Handling**: Clear failures instead of silent fallbacks

### ✅ Long-term Benefits  
1. **Easier Maintenance**: One codebase to update
2. **Consistent Features**: All invoices use same advanced features
3. **Performance**: No fallback checks or duplicate processing
4. **Developer Experience**: Clear, simple invoice generation flow

## Risk Assessment

### Low Risk
- **Template system is proven working** through previous testing
- **Database configurations are stable** and properly migrated
- **All invoice requirements implemented** in new system

### Mitigation Strategies
- **Thorough testing** of all invoice generation paths
- **Database backups** before deployment
- **Rollback plan**: Git history allows easy reversal if needed

## Success Criteria
- [ ] All invoices display logos when configured
- [ ] No references to legacy generator in codebase
- [ ] All invoice generation uses template system
- [ ] Dutch compliance requirements maintained
- [ ] Performance improved or maintained

## Next Steps
1. Execute Phase 2: Remove legacy generator file
2. Execute Phase 3: Clean up template integration
3. Execute Phase 4: Comprehensive testing
4. Deploy and monitor for issues

---

*This plan ensures a clean migration to the modern template-based invoice system while maintaining all functionality and compliance requirements.*