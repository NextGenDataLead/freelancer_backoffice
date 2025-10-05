# Daily Consistency Scoring Scale Not Showing Dynamically - Debug Guide

## Issue Summary
The Daily Consistency scoring scale in the calculation detail modal is NOT displaying the dynamic daily target based on working days configuration. It should show `≥6.7h/day` (for 120h ÷ 18 working days) but is still showing hardcoded values like `≥5.0h/day`.

## Context

### What Should Be Happening
**Tenant Configuration:**
- Monthly hours target: 120h
- Working days: Monday-Thursday (4 days/week)
- Current date (dev): September 17, 2025 (Wednesday)
- Total working days in September 2025: 18 days (Mon-Thu only)
- Daily target: 120h ÷ 18 = **6.67h/day**

**Expected Scoring Scale Display:**
```
Daily Consistency
Measures actual vs target daily hours (based on working days schedule)

≥6.7h/day (100% of target)     → 3.0 points
5.3-6.7h/day (80-100%)          → 2.4 points
4.0-5.3h/day (60-80%)           → 1.8 points
<4.0h/day (<60%)                → <1.8 points

Target Calculation: Target: 6.7h/day (120h ÷ 18 working days)
```

### What Is Actually Showing
The modal is still showing hardcoded values OR the dynamic values aren't being calculated/passed properly.

## Files Modified (What We've Done So Far)

### 1. Database Schema ✅
**File:** `/supabase/044_add_working_days_target.sql`
- Added `target_working_days_per_week INTEGER[]` column
- Applied migration successfully via Supabase MCP
- Verified: Database has `[1,2,3,4]` (Mon-Thu) stored correctly

### 2. RPC Function Fixed ✅
**What:** `get_formatted_profit_targets` was missing new columns
**Fix Applied:** Updated to include `target_working_days_per_week` and `target_billable_ratio`
```sql
CREATE OR REPLACE FUNCTION get_formatted_profit_targets(p_tenant_id uuid)
RETURNS TABLE (
  -- ... existing fields ...
  target_billable_ratio integer,
  target_working_days_per_week integer[],
  -- ... rest ...
)
```

### 3. Health Score Engine ✅
**File:** `/src/lib/health-score-engine.ts`
**Lines:** 2136-2152, 2225-2234

Calculates dynamic daily target:
```typescript
const workingDays = profitTargets?.target_working_days_per_week || [1, 2, 3, 4, 5]
const dailyHoursTarget = calculateDailyHoursTarget(monthlyTarget, workingDays)
// Returns benchmark string like: "Target: 6.7h/day (120h ÷ 18 working days)"
```

Returns in `detailedCalculation.components`:
```typescript
{
  name: 'Daily Consistency',
  benchmark: `Target: ${dailyHoursTarget.toFixed(1)}h/day (${monthlyTarget}h ÷ ${totalWorkingDays} working days)`
}
```

### 4. Calculation Detail Modal - ATTEMPTED FIX ⚠️
**File:** `/src/components/dashboard/calculation-detail-modal.tsx`
**Lines:** 223-271

**What we changed:**
```typescript
) : metricId === 'daily_consistency' ? (
  <div className="space-y-2">
    {(() => {
      // Extract daily target from detailed calculation if available
      const dailyConsistencyComponent = detailedCalculation?.components?.find(c => c.name === 'Daily Consistency')
      const benchmarkMatch = dailyConsistencyComponent?.benchmark?.match(/([\d.]+)h\/day/)
      const dailyTarget = benchmarkMatch ? parseFloat(benchmarkMatch[1]) : 5.0

      const excellent = dailyTarget
      const good = dailyTarget * 0.8
      const fair = dailyTarget * 0.6

      return (
        <>
          <div className="flex justify-between text-xs">
            <span>≥{excellent.toFixed(1)}h/day (100% of target)</span>
            <span className="text-green-600 font-medium">3.0 points</span>
          </div>
          {/* ... more ranges ... */}
          <div className="mt-3 pt-3 border-t">
            <div className="text-xs font-medium mb-1">Target Calculation:</div>
            <div className="text-xs text-muted-foreground mb-2">
              {dailyConsistencyComponent?.benchmark || 'Monthly target ÷ working days in month'}
            </div>
          </div>
        </>
      )
    })()}
  </div>
```

## Critical Questions to Debug

### Question 1: Is `detailedCalculation` being passed to the modal?
**How to check:**
1. Find where `CalculationDetailModal` is rendered
2. Look for props: `detailedCalculation={...}`
3. Verify the data structure being passed includes the Daily Consistency component

**Files to check:**
- `/src/components/dashboard/unified-financial-dashboard.tsx`
- `/src/components/dashboard/organogram/HealthScoreOrganogram.tsx`
- Any component that renders the modal

**Search command:**
```bash
grep -r "CalculationDetailModal" src/components/dashboard/
grep -r "detailedCalculation" src/components/dashboard/
```

### Question 2: Is the Time Utilization breakdown being generated correctly?
**File:** `/src/lib/health-score-engine.ts`
**Method:** `generateTimeUtilizationBreakdown()`
**Lines:** 2174-2239

**Debug steps:**
1. Add console.log to see what's being generated:
```typescript
const breakdown = {
  components: [/* ... */],
  // ...
}
console.log('🔍 Time Utilization Breakdown:', JSON.stringify(breakdown, null, 2))
return breakdown
```

2. Check browser console when viewing dashboard
3. Verify `components` array has Daily Consistency with correct `benchmark` string

### Question 3: How is the modal being opened?
**Need to find:**
- Event handler that opens modal for `daily_consistency` metric
- What data is passed when opening the modal
- Is `detailedCalculation` included in the props?

**Search for:**
```bash
grep -r "setSelectedMetric.*daily" src/
grep -r "onClick.*Daily Consistency" src/
grep -r "metricId.*daily_consistency" src/
```

### Question 4: Is the working days data reaching the health score engine?
**File:** `/src/components/dashboard/unified-financial-dashboard.tsx`
**Lines:** ~344-353 (where health score is calculated)

**Check:**
1. Is `profitTargets` passed to health score inputs?
2. Does it include `target_working_days_per_week`?
3. Add console.log:
```typescript
console.log('🔍 Profit Targets for Health Score:', {
  monthly_hours_target: profitTargets?.monthly_hours_target,
  target_working_days_per_week: profitTargets?.target_working_days_per_week
})
```

## Step-by-Step Debugging Plan

### Step 1: Verify Data Flow from Database to Frontend
```typescript
// In /src/components/dashboard/unified-financial-dashboard.tsx
// Around where profitTargets is used

useEffect(() => {
  console.log('🔍 PROFIT TARGETS:', JSON.stringify(profitTargets, null, 2))
}, [profitTargets])
```

**Expected output:**
```json
{
  "monthly_hours_target": 120,
  "target_working_days_per_week": [1, 2, 3, 4],
  "target_billable_ratio": 90
}
```

### Step 2: Verify Health Score Calculation
```typescript
// In /src/lib/health-score-engine.ts
// Inside generateTimeUtilizationBreakdown()

console.log('🔍 Working Days:', workingDays)
console.log('🔍 Daily Hours Target:', dailyHoursTarget)
console.log('🔍 Total Working Days:', totalExpectedWorkingDays)
console.log('🔍 Benchmark String:',
  `Target: ${dailyHoursTarget.toFixed(1)}h/day (${monthlyTarget}h ÷ ${totalExpectedWorkingDays} working days)`
)
```

**Expected output:**
```
🔍 Working Days: [1, 2, 3, 4]
🔍 Daily Hours Target: 6.666666666666667
🔍 Total Working Days: 18
🔍 Benchmark String: Target: 6.7h/day (120h ÷ 18 working days)
```

### Step 3: Verify Modal Receives Data
```typescript
// In /src/components/dashboard/calculation-detail-modal.tsx
// At the very top of the component

export function CalculationDetailModal({
  metricId,
  metricName,
  calculationValue,
  calculationDescription,
  currentScore,
  maxScore,
  detailedCalculation,
  isOpen,
  onClose,
  className = ''
}: CalculationDetailModalProps) {

  useEffect(() => {
    if (metricId === 'daily_consistency') {
      console.log('🔍 MODAL OPENED FOR DAILY CONSISTENCY')
      console.log('🔍 detailedCalculation:', JSON.stringify(detailedCalculation, null, 2))

      const component = detailedCalculation?.components?.find(c => c.name === 'Daily Consistency')
      console.log('🔍 Daily Consistency Component:', component)
      console.log('🔍 Benchmark:', component?.benchmark)
    }
  }, [metricId, detailedCalculation])
```

**Expected output:**
```
🔍 MODAL OPENED FOR DAILY CONSISTENCY
🔍 detailedCalculation: {
  "components": [
    {
      "name": "Daily Consistency",
      "value": "5.2h/day average",
      "percentage": "78%",
      "score": 2.34,
      "maxScore": 3,
      "description": "Average hours per day vs target (6.7h/day based on 4 working days/week)",
      "formula": "5.2h ÷ 6.7h target = 78% × 3 = 2.3 pts",
      "benchmark": "Target: 6.7h/day (120h ÷ 18 working days)"
    }
  ]
}
🔍 Daily Consistency Component: { ... }
🔍 Benchmark: Target: 6.7h/day (120h ÷ 18 working days)
```

### Step 4: Check Modal Rendering Logic
```typescript
// In calculation-detail-modal.tsx
// Inside the daily_consistency section

{(() => {
  const dailyConsistencyComponent = detailedCalculation?.components?.find(c => c.name === 'Daily Consistency')
  console.log('🔍 Found component:', dailyConsistencyComponent)

  const benchmarkMatch = dailyConsistencyComponent?.benchmark?.match(/([\d.]+)h\/day/)
  console.log('🔍 Benchmark match:', benchmarkMatch)

  const dailyTarget = benchmarkMatch ? parseFloat(benchmarkMatch[1]) : 5.0
  console.log('🔍 Daily target:', dailyTarget)

  return (/* ... */)
})()}
```

## Possible Root Causes

### Cause A: Modal Not Receiving detailedCalculation
**Symptoms:**
- `detailedCalculation` is `undefined` or `null`
- Falls back to hardcoded 5.0 value

**Fix Location:**
- Where modal is opened (likely HealthScoreOrganogram.tsx or similar)
- Need to ensure `detailedCalculation` prop is passed

### Cause B: Health Score Result Not Including Breakdown
**Symptoms:**
- `detailedCalculation` exists but doesn't have Daily Consistency component
- Component array is empty or incomplete

**Fix Location:**
- `/src/lib/health-score-engine.ts` - `generateTimeUtilizationBreakdown()`
- Verify it's being called and returned properly

### Cause C: Regex Not Matching Benchmark String
**Symptoms:**
- Benchmark string exists but regex `/([\d.]+)h\/day/` doesn't match
- Falls back to 5.0

**Fix:**
- Check exact format of benchmark string
- Adjust regex if needed

### Cause D: Working Days Not Being Passed to Engine
**Symptoms:**
- `target_working_days_per_week` is undefined in health score inputs
- Falls back to default [1,2,3,4,5]

**Fix Location:**
- `/src/components/dashboard/unified-financial-dashboard.tsx`
- Where `HealthScoreInputs` is constructed
- Ensure profitTargets includes the new field

### Cause E: Frontend Not Re-fetching After RPC Update
**Symptoms:**
- Database has correct values
- RPC function returns correct values
- But frontend cache still has old data

**Fix:**
- Force refresh the page (Ctrl+Shift+R)
- Clear browser cache
- Check if `refetch()` is called after save

## Quick Fixes to Try

### Fix 1: Force Re-fetch Profit Targets
```typescript
// In profit targets form after save success
await refetch() // Should already be there
window.location.reload() // Nuclear option to ensure fresh data
```

### Fix 2: Add Fallback to Use Props
```typescript
// In calculation-detail-modal.tsx
// If detailedCalculation is missing, can we get data another way?

interface CalculationDetailModalProps {
  metricId: string
  // ... existing props ...
  profitTargets?: any // ADD THIS
  timeStats?: any // ADD THIS
}

// Then calculate directly in modal if detailedCalculation is missing
```

### Fix 3: Hardcode for Testing
```typescript
// TEMPORARY - Just to verify modal updates work
const dailyTarget = 6.7 // Force the value we expect

// If this shows correctly, we know:
// 1. Modal rendering works
// 2. Problem is in data flow to modal
```

## Files Reference

### Key Files to Review:
1. `/src/components/dashboard/calculation-detail-modal.tsx` (lines 223-271) - Modal display
2. `/src/lib/health-score-engine.ts` (lines 2174-2239) - Breakdown generation
3. `/src/components/dashboard/unified-financial-dashboard.tsx` (lines 344-365) - Health score calc
4. `/src/components/dashboard/organogram/HealthScoreOrganogram.tsx` - Modal trigger (likely)
5. `/src/hooks/use-profit-targets.ts` - Data fetching
6. `/src/app/api/profit-targets/route.ts` - API endpoint

### Database Verification:
```sql
-- Check what's in database
SELECT
  monthly_hours_target,
  target_working_days_per_week,
  target_billable_ratio
FROM profit_targets
LIMIT 1;

-- Should return: 120, [1,2,3,4], 90
```

### Test RPC Function:
```sql
SELECT * FROM get_formatted_profit_targets(
  (SELECT tenant_id FROM profit_targets LIMIT 1)
);

-- Verify it returns target_working_days_per_week
```

## Success Criteria

When fixed, the modal should show:
```
Daily Consistency
Measures actual vs target daily hours (based on working days schedule)

≥6.7h/day (100% of target)     → 3.0 points
5.3-6.7h/day (80-100%)          → 2.4 points
4.0-5.3h/day (60-80%)           → 1.8 points
<4.0h/day (<60%)                → <1.8 points

Target Calculation:
Target: 6.7h/day (120h ÷ 18 working days)
```

## Next Steps for Developer

1. **Start with Step 1** (Verify Data Flow) - Add console.logs
2. **Check browser console** - See what data is actually present
3. **Follow the data** from database → API → hook → component → modal
4. **Find the break point** where `target_working_days_per_week` is lost
5. **Apply appropriate fix** from Possible Root Causes section
6. **Test with different configurations**:
   - 5-day week (should show different target)
   - 3-day week (should show different target)
   - Different monthly hours (should recalculate)

## Additional Context

- **Current Date (Dev):** September 20, 2025
- **Date is set via:** `/src/lib/current-date.ts` (for testing)
- **MTD Calculations:** Use working days (not calendar days) as of recent updates
- **Hours Progress:** Also updated to use working days for MTD target
- **Both metrics** should show consistent daily target calculations

## Related Issues Fixed
- ✅ Database migration applied
- ✅ RPC function updated to return new fields
- ✅ Health score engine calculates dynamic target
- ✅ MTD hours target uses working days
- ⚠️ Modal display NOT updating (current issue)
