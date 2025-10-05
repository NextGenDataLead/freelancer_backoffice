# DSO Data Isolation Critical Bug - Action Plan

## 🚨 CRITICAL ISSUE DISCOVERED
**User**: imre.iddatasolutions@gmail.com
**Tenant ID**: `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`
**Problem**: Health Score dashboard showing wrong tenant data for DSO calculations

## Current State Analysis

### What Dashboard Shows (WRONG)
- **DSO**: 36 days
- **Overdue Count**: 3 invoices
- **Overdue Amount**: €2,692.25
- **Debug Log Output**:
  ```
  DSO CALCULATION DEBUG: {
    avgOverduePerInvoice: 897.4166666666666,
    calculatedDSO: 35.96125,
    overdueAmount: 2692.25,
    overdueCount: 3,
    rounded: 36
  }
  ```

### What Database Actually Contains (CORRECT)
- **DSO Should Be**: 32.3 days
- **Overdue Count**: 1 invoice
- **Overdue Amount**: €653.40
- **Days Past Due**: 30 days actual
- **Calculation**: 30 + ((653.40 - 500) / 1000) * 15 = 32.3 days

### Data Isolation Problem
The health score engine is **mixing data from multiple tenants** instead of filtering properly by `tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'`

## Technical Context

### Files Modified During Session
1. **`/src/lib/health-score-engine.ts`**
   - Replaced synthetic DSO formula with realistic business logic
   - Added `calculateRealDSOFromData()` method to CashFlowScoreCalculator
   - Added debug logging (lines 187-194)
   - Fixed score rounding to one decimal place throughout

2. **`/src/components/dashboard/organogram/HealthScoreOrganogram.tsx`**
   - Split Revenue Quality into two Level 2 sub-metrics (Collection Rate + Collection Speed)
   - Made collection metrics transparent with real data formulas
   - Added debug logging (lines 222-227)
   - Removed redundant scoring percentage displays

3. **`/src/components/dashboard/calculation-detail-modal.tsx`**
   - Removed misleading "target" language
   - Changed "73% of target" to "73% of max possible"
   - Removed redundant top section from modal

### DSO Calculation Logic (WORKING CORRECTLY)
```javascript
calculateRealDSOFromData(overdueAmount: number, overdueCount: number): number {
  if (overdueAmount <= 0 || overdueCount <= 0) return 0

  const avgOverduePerInvoice = overdueAmount / Math.max(overdueCount, 1)

  if (avgOverduePerInvoice <= 500) {
    return 15 + (avgOverduePerInvoice / 500) * 15 // 15-30 days
  } else if (avgOverduePerInvoice <= 1500) {
    return 30 + ((avgOverduePerInvoice - 500) / 1000) * 15 // 30-45 days
  } else {
    return Math.min(45 + ((avgOverduePerInvoice - 1500) / 1000) * 10, 60) // 45-60 days max
  }
}
```

## Root Cause Analysis

### Data Source Issue
The health score engine gets data via `inputs.dashboardMetrics.achterstallig` and `inputs.dashboardMetrics.achterstallig_count`. These values are **NOT properly filtered by tenant**.

### Likely Problem Locations
1. **Dashboard Metrics API** - `/src/app/api/*/dashboard-metrics/route.ts`
2. **Health Score Input Calculation** - Where `HealthScoreInputs` are assembled
3. **Invoice Aggregation Queries** - Missing proper tenant isolation

## 🎯 IMMEDIATE ACTION PLAN

### Phase 1: Debug Data Source (PRIORITY 1)
- [ ] Find the API endpoint that calculates `dashboardMetrics.achterstallig`
- [ ] Verify it properly filters by tenant_id
- [ ] Check if there's caching that's causing stale data
- [ ] Ensure user authentication properly sets tenant context

### Phase 2: Fix Data Isolation (PRIORITY 1)
- [ ] Locate invoice aggregation queries for dashboard metrics
- [ ] Add proper tenant filtering: `WHERE tenant_id = $userTenantId`
- [ ] Test with user's actual tenant data
- [ ] Verify DSO shows 32.3 days (not 36 days)

### Phase 3: Validation & Cleanup (PRIORITY 2)
- [ ] Remove debug console.log statements from production code
- [ ] Verify all health score metrics use proper tenant isolation
- [ ] Test with multiple tenants to ensure no data leakage
- [ ] Add automated tests for tenant data isolation

### Phase 4: User Impact Assessment (PRIORITY 2)
- [ ] Check if other health score metrics have same isolation issue
- [ ] Verify profit, efficiency, and risk calculations use correct tenant data
- [ ] Ensure all financial dashboards show user-specific data only

## Expected Outcome

After fixing tenant isolation:
- **DSO**: Should show **32.3 days** (rounded to 32 days)
- **Collection Rate**: Should be based on user's €653.40 overdue from €3,266.00 total
- **Collection Speed**: Should reflect user's actual 30-day overdue invoice

## Database Queries for Verification

### User's Correct Data
```sql
SELECT
    status,
    COUNT(*) as invoice_count,
    SUM(total_amount) as total_amount_eur
FROM invoices
WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
GROUP BY status;
```

**Expected Result**:
- overdue: 1 invoice, €653.40
- sent: 1 invoice, €1,070.85
- paid: 1 invoice, €1,542.75

### Test DSO Calculation
```sql
SELECT
    30 + ((653.40 - 500) / 1000) * 15 as expected_dso;
-- Should return: 32.3
```

## Critical Files to Investigate

1. **Dashboard Metrics API**: Search for files containing "achterstallig" or "overdue"
2. **Health Score Input Assembly**: Where `HealthScoreInputs` object is created
3. **Invoice Aggregation**: Any queries that sum invoice amounts without tenant filtering
4. **Authentication Context**: Ensure user's tenant_id is properly passed through

## Testing Plan

1. **Before Fix**: DSO shows 36 days (wrong)
2. **After Fix**: DSO shows 32.3 days (correct)
3. **Multi-tenant Test**: Create test invoices for different tenants, verify isolation
4. **Real-time Update**: Change invoice status, verify metrics update correctly

---

**Status**: 🚨 CRITICAL BUG - Health Score calculations compromised by data isolation failure
**Next Steps**: Immediately investigate dashboard metrics API for tenant filtering
**User Impact**: All health score metrics potentially showing incorrect cross-tenant data