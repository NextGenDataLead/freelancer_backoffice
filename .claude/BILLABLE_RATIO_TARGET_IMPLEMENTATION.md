# Billable Ratio Target Implementation

## Context
Adding a target billable ratio setting to the business settings that integrates with the health score system. This will allow users to set their desired billable efficiency target (e.g., 90% of tracked hours should be billable) and have the system calculate scores based on this target.

## Progress Summary

### ✅ Completed
1. **Database Migration** - Added `target_billable_ratio` column to `profit_targets` table
   - Column type: `integer` (represents percentage 0-100)
   - Default value: 90 (90%)
   - Location: Applied via Supabase MCP tool

2. **Form State Updates** - Updated `component-based-profit-targets-form.tsx`
   - Added `target_billable_ratio: 90` to form state
   - Added loading logic to populate from existing targets
   - Added validation: 50-100% range
   - Added to submit handler to save to database

### 🚧 In Progress
3. **Form UI Field** - Need to add input field to the form

### ⏳ Remaining Tasks
4. **Health Score Engine Integration**
5. **Organogram Display Updates**
6. **Modal Explanation with Legend**

---

## Detailed Implementation Steps

### Step 3: Add UI Field to Form (IN PROGRESS)

**File:** `/src/components/financial/profit-targets/component-based-profit-targets-form.tsx`

**Location:** After the Target Hourly Rate field (around line 224), add a third field in the Time-Based Revenue section

**Code to add:**
```tsx
// After the hourly rate field closing </div>, add:
<div>
  <Label htmlFor="target_billable_ratio" className="text-sm font-medium">
    Target Billable Ratio (%)
  </Label>
  <Input
    id="target_billable_ratio"
    type="number"
    min="50"
    max="100"
    value={formData.target_billable_ratio || ''}
    onChange={(e) => handleInputChange('target_billable_ratio', parseInt(e.target.value) || 0)}
    className="mt-1"
    placeholder="90"
    required
  />
  <p className="text-xs text-muted-foreground mt-1">
    Target percentage of tracked hours that should be billable (50-100%)
  </p>
</div>
```

**Note:** This will require changing the grid from 2 columns to 3 columns or creating a new row. Recommend making it `grid-cols-1 md:grid-cols-3` for better layout.

---

### Step 4: Update Health Score Engine

**File:** `/src/lib/health-score-engine.ts`

**Current Logic:** Line 2105-2106
```typescript
const billableRatio = totalTrackedHours > 0 ? currentHours / totalTrackedHours : 0
const billableScore = billableRatio * 2.1 // max 2.1 points
```

**Changes Needed:**

1. **Pass target to calculation method** (line 1100):
```typescript
const timeUtilizationScore = this.calculateTimeUtilization(
  timeStats,
  profitTargets,
  mtdCalculations
)
```
Already has `profitTargets` parameter ✓

2. **Update calculation logic** (line 2104-2106):
```typescript
// Get target billable ratio (default 90% if not set)
const targetBillableRatio = (profitTargets?.target_billable_ratio || 90) / 100

// Calculate actual billable ratio
const billableRatio = totalTrackedHours > 0 ? currentHours / totalTrackedHours : 0

// Score based on achievement of target (max 2.1 points)
// If actual >= target, full points. Otherwise, proportional.
const billableAchievement = targetBillableRatio > 0 ? Math.min(billableRatio / targetBillableRatio, 1) : 0
const billableScore = billableAchievement * 2.1 // max 2.1 points
```

**Why this works:**
- If actual = target (e.g., 90/90 = 1.0), achievement = 100%, score = 2.1/2.1
- If actual > target (e.g., 95/90 = 1.06), achievement = 100% (capped), score = 2.1/2.1
- If actual < target (e.g., 51/90 = 0.567), achievement = 56.7%, score = 1.2/2.1

3. **Store target in breakdown for organogram** (line 1315-1319):
```typescript
unbilledHours: timeStats.unbilled?.hours || 0,
currentDay: mtdCalculations.currentDay,

// Time Utilization component scores for organogram
timeUtilizationComponents: this.timeUtilizationComponents,
targetBillableRatio: profitTargets?.target_billable_ratio || 90  // ADD THIS LINE
```

---

### Step 5: Update Organogram Display

**File:** `/src/components/dashboard/organogram/HealthScoreOrganogram.tsx`

**Location:** Billable Ratio child node (lines 138-151)

**Changes Needed:**

1. **Update description to show target** (line 145):
```tsx
description: `${Math.round(((profitBreakdown.currentHours || 0) / Math.max((profitBreakdown.currentHours || 0) + (profitBreakdown.unbilledHours || 0), 1)) * 100)}% of ${profitBreakdown.targetBillableRatio || 90}% target`,
```

2. **Update calculationDescription to show target** (line 147):
```tsx
calculationDescription: `Billable Ratio: ${profitBreakdown.currentHours || 0}h / ${(profitBreakdown.currentHours || 0) + (profitBreakdown.unbilledHours || 0)}h total = ${Math.round(((profitBreakdown.currentHours || 0) / Math.max((profitBreakdown.currentHours || 0) + (profitBreakdown.unbilledHours || 0), 1)) * 100)}% (target: ${profitBreakdown.targetBillableRatio || 90}%) → ${profitBreakdown.timeUtilizationComponents?.billableScore || 0}/2.1 pts`,
```

---

### Step 6: Create Extensive Modal Explanation

**File:** `/src/components/dashboard/calculation-detail-modal.tsx`

**Current billable_ratio scale** (lines 174-192) is basic. Need to make it extensive like hourly_rate_value.

**Reference Implementation:** See `hourly_rate_value` modal (lines 334-352) for structure

**New Implementation for billable_ratio:**

```tsx
) : metricId === 'billable_ratio' ? (
  <div className="space-y-2">
    <div className="text-xs font-medium mb-2 text-muted-foreground">
      Based on target billable ratio: {/* Get from breakdown */}%
    </div>
    <div className="flex justify-between text-xs">
      <span>≥Target ratio</span>
      <span className="text-green-600 font-medium">2.1/2.1 points (Excellent)</span>
    </div>
    <div className="flex justify-between text-xs">
      <span>90-99% of target</span>
      <span className="text-blue-600 font-medium">1.9-2.0/2.1 points (Good)</span>
    </div>
    <div className="flex justify-between text-xs">
      <span>80-89% of target</span>
      <span className="text-yellow-600 font-medium">1.7-1.8/2.1 points (Fair)</span>
    </div>
    <div className="flex justify-between text-xs">
      <span>&lt;80% of target</span>
      <span className="text-red-600 font-medium">0-1.6/2.1 points (Poor)</span>
    </div>
    <div className="mt-3 pt-3 border-t space-y-1">
      <div className="text-xs font-medium">Example with 90% target:</div>
      <div className="text-xs text-muted-foreground">• 90% actual = 2.1/2.1 pts (100% achievement)</div>
      <div className="text-xs text-muted-foreground">• 81% actual = 1.9/2.1 pts (90% achievement)</div>
      <div className="text-xs text-muted-foreground">• 72% actual = 1.7/2.1 pts (80% achievement)</div>
      <div className="text-xs text-muted-foreground">• 51% actual = 1.2/2.1 pts (57% achievement)</div>
    </div>
    <div className="mt-3 pt-3 border-t">
      <div className="text-xs font-medium mb-1">How to Improve:</div>
      <div className="text-xs text-muted-foreground">
        • Invoice completed work promptly<br/>
        • Convert unbilled hours to invoices<br/>
        • Set realistic billable targets (80-95% typical)<br/>
        • Review and bill weekly, not monthly
      </div>
    </div>
  </div>
```

**To get target in modal:** Need to pass it through calculationDescription or add a new prop. The modal receives `calculationDescription` which could include target like:

```tsx
// In organogram:
calculationDescription: `Billable Ratio: ... (target: ${profitBreakdown.targetBillableRatio}%) → ...`
```

Then parse it in modal to extract and display prominently.

---

## Data Flow Summary

```
User Input (Form)
    ↓
profit_targets.target_billable_ratio (DB)
    ↓
useProfitTargets hook → profitTargets object
    ↓
health-score-engine.ts (calculateTimeUtilization)
    ↓
Calculates billableScore based on target
    ↓
Stores in breakdown.timeUtilizationComponents.billableScore
    ↓
Organogram displays with target context
    ↓
Modal shows detailed explanation with target
```

---

## Testing Checklist

After implementation is complete:

- [ ] Form saves target_billable_ratio correctly to database
- [ ] Form loads existing target_billable_ratio from database
- [ ] Form validates 50-100% range
- [ ] Health score engine uses target in calculation
- [ ] Organogram shows current vs target billable ratio
- [ ] Billable Ratio child node displays correct score
- [ ] Modal shows target-based scoring scale
- [ ] Modal shows improvement suggestions
- [ ] Test with different targets (70%, 90%, 95%)
- [ ] Test with low actual ratio (< 60%)
- [ ] Test with high actual ratio (> 95%)

---

## Current State Summary

**Working:**
- Database column exists
- Form state handles target_billable_ratio
- Validation works
- Save to database works

**Needs Completion:**
- [ ] Add UI input field to form (3-column layout)
- [ ] Update health score engine calculation logic
- [ ] Pass target to organogram via breakdown
- [ ] Update organogram billable ratio display
- [ ] Create extensive modal with target-based legend

---

## File Locations Quick Reference

1. **Form Component:** `/src/components/financial/profit-targets/component-based-profit-targets-form.tsx`
2. **Health Score Engine:** `/src/lib/health-score-engine.ts`
3. **Organogram:** `/src/components/dashboard/organogram/HealthScoreOrganogram.tsx`
4. **Modal:** `/src/components/dashboard/calculation-detail-modal.tsx`
5. **Database Schema:** Already updated via migration

---

## Notes

- Default target is 90% (industry standard for consultants)
- Range is 50-100% (anything below 50% is unrealistic)
- Current implementation shows user has 51% billable ratio (67.2h / 131.4h total)
- This is why their score is low (1.1/2.1 instead of expected ~1.9/2.1)
- With 90% target, user needs to invoice 64 unbilled hours to improve score
