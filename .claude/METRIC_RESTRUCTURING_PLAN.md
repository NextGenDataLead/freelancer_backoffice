# Metric Restructuring Plan - Eliminate Double-Dipping

**Date:** 2025-10-03
**Status:** In Progress
**Developer Handoff Document**

---

## Executive Summary

The freelancer dashboard currently has significant metric overlap across the 4 health categories (Profit, Cashflow, Efficiency, Risk). Metrics like "Collection Speed", "Time Utilization", and "Daily Consistency" appear in multiple categories, causing double-counting and confusing the user about what drives their scores.

This document provides a complete plan to eliminate overlap and create a clean, non-overlapping metric structure.

---

## Problem Statement

### Current Structure Issues

**Profit Health (18 pts)** - Currently has:
- Hourly Rate Value (8 pts) ✓ Correct
- Time Utilization Efficiency (6 pts) ✓ Correct
  - Hours Progress (2.4 pts)
  - Billable Ratio (2.1 pts)
  - Daily Consistency (1.5 pts)
- **Revenue Quality & Collection (4 pts)** ⚠️ **PROBLEM: Overlaps with Cashflow**

**Cashflow Health (25 pts)** - Currently has:
- **Collection Speed (10 pts)** ⚠️ **DUPLICATE - also in Profit as "Collection Speed"**
- Volume Efficiency (10 pts) ✓ Correct
- Absolute Amount Control (5 pts) ✓ Correct

**Efficiency Health (25 pts)** - Currently has:
- **Time Utilization Progress (12 pts)** ⚠️ **DUPLICATE - already in Profit**
- **Billing Efficiency (5 pts)** ⚠️ **Similar to Billable Ratio in Profit**
- **Daily Consistency (8 pts)** ⚠️ **DUPLICATE - already in Profit**

**Risk Management (25 pts)** - Currently has:
- Invoice Processing Risk (8 pts) ✓ Correct
- Payment Collection Risk (5 pts) ✓ Correct (related but different angle)
- Client Concentration Risk (3 pts) ✓ Correct
- Business Continuity Risk (9 pts) ✓ Correct

### Visual Overlap Map

```
Collection Speed/Rate
├─ Profit: "Revenue Quality & Collection" (4 pts)
└─ Cashflow: "Collection Speed" (10 pts) ❌ DUPLICATE

Time Utilization
├─ Profit: "Time Utilization Efficiency" (6 pts)
└─ Efficiency: "Time Utilization Progress" (12 pts) ❌ DUPLICATE

Daily Consistency
├─ Profit: Sub-metric under "Time Utilization" (1.5 pts)
└─ Efficiency: "Daily Consistency" (8 pts) ❌ DUPLICATE

Billing/Invoicing
├─ Profit: "Billable Ratio" (2.1 pts)
└─ Efficiency: "Billing Efficiency" (5 pts) ❌ SIMILAR CONCEPT
```

---

## Approved Solution

### Clean Metric Structure (100 pts total)

#### **1. Profit Health (25 pts)** - "How much am I earning?"
**Focus: Revenue generation quality**

- **Hourly Rate Value (10 pts)**
  - Measures: Actual effective rate vs target rate
  - Formula: `(Current Rate / Target Rate) × 10`
  - Max: 10 points (capped at 10)

- **Time Utilization Efficiency (15 pts)** - KEEP the 3-component breakdown
  - **Hours Progress (6 pts)** - Total tracked hours (billable + unbilled) vs MTD target
    - Formula: `(Total Tracked Hours / MTD Target) × 6 = Score (capped at 6)`
  - **Billable Ratio (6 pts)** - Billable hours vs billable target
    - Formula: `(Billable Hours / MTD Billable Target) × 6 = Score (capped at 6)`
  - **Daily Consistency (3 pts)** - Hours per day consistency
    - Scoring tiers based on average daily hours

**Total:** 10 + 15 = **25 points**

**Changes from Current:**
- ❌ REMOVE: "Revenue Quality & Collection" (4 pts) → Split to Cashflow/Efficiency
- ✅ INCREASE: Hourly Rate Value from 8 pts → 10 pts
- ✅ INCREASE: Time Utilization from 6 pts → 15 pts
  - Hours Progress: 2.4 pts → 6 pts
  - Billable Ratio: 2.1 pts → 6 pts
  - Daily Consistency: 1.5 pts → 3 pts

---

#### **2. Cashflow Health (25 pts)** - "How fast am I getting paid?"
**Focus: Speed and timing of cash collection**

- **Collection Speed/DSO (15 pts)**
  - Measures: Days to collect payment after invoicing
  - Current calculation: Already implemented as DSO equivalent
  - Scoring: ≤7d=Excellent, 8-15d=Good, 16-30d=Fair, >30d=Poor

- **Volume Efficiency (5 pts)**
  - Measures: Number of outstanding invoices
  - Lower count = better score

- **Absolute Amount Control (5 pts)**
  - Measures: Total € amount overdue
  - Lower amount = better score

**Total:** 15 + 5 + 5 = **25 points**

**Changes from Current:**
- ✅ INCREASE: Collection Speed from 10 pts → 15 pts
- ✅ DECREASE: Volume Efficiency from 10 pts → 5 pts
- ✅ KEEP: Absolute Amount Control at 5 pts

---

#### **3. Efficiency Health (25 pts)** - "How well am I converting work to revenue?"
**Focus: Operational effectiveness of the invoicing process**

- **Invoicing Speed (10 pts)** - NEW METRIC
  - Measures: How quickly work becomes invoices (time from work completion to invoice sent)
  - Formula: Based on unbilled hours as % of total
  - Current implementation: Can use existing unbilled ratio calculation

- **Collection Rate (10 pts)** - MOVED FROM PROFIT
  - Measures: % of potential revenue that gets invoiced
  - Formula: `totalRevenue / (totalRevenue + unbilledValue)`
  - Current implementation: Already exists in `calculateRevenueQuality` (line 2277-2278)

- **Invoice Quality (5 pts)** - NEW METRIC (FUTURE)
  - Measures: Accuracy/completeness (low disputes/corrections)
  - For now: Can be a placeholder or basic implementation

**Total:** 10 + 10 + 5 = **25 points**

**Changes from Current:**
- ❌ REMOVE: "Time Utilization Progress" (12 pts) → Already in Profit
- ❌ REMOVE: "Daily Consistency" (8 pts) → Already in Profit
- ❌ REMOVE: "Billing Efficiency" (5 pts) → Concept split
- ✅ ADD: "Invoicing Speed" (10 pts) - Uses unbilled ratio
- ✅ ADD: "Collection Rate" (10 pts) - From Revenue Quality calculation
- ✅ ADD: "Invoice Quality" (5 pts) - Placeholder for now

---

#### **4. Risk Management (25 pts)** - "What could go wrong?"
**No changes needed** - Risk metrics are already non-overlapping

- Invoice Processing Risk (8 pts) ✓
- Payment Collection Risk (8 pts) ✓ (adjusted from 5 pts)
- Client Concentration Risk (4 pts) ✓ (adjusted from 3 pts)
- Business Continuity Risk (5 pts) ✓ (adjusted from 9 pts)

**Total:** 8 + 8 + 4 + 5 = **25 points**

---

## Implementation Checklist

### Phase 1: Health Score Engine Updates

#### File: `/src/lib/health-score-engine.ts`

- [ ] **Update Profit Calculator**
  - [ ] Line ~1101: Remove `revenueQualityScore` calculation call
  - [ ] Find profit score calculation and update to: `hourlyRateScore (10 pts) + timeUtilizationScore (15 pts) = 25 pts`
  - [ ] Update `calculateTimeUtilization` method:
    - [ ] Change Hours Progress from 2.4 max → 6.0 max (line 2107)
    - [ ] Change Billable Ratio from 2.1 max → 6.0 max (line 2120)
    - [ ] Change Daily Consistency from 1.5 max → 3.0 max (line 2125-2127)
    - [ ] Update total: `Math.min(hoursScore + billableScore + consistencyScore, 15)`

- [ ] **Update Efficiency Calculator**
  - [ ] Remove `calculateTimeUtilization` duplicate
  - [ ] Remove `calculateDailyConsistency` duplicate
  - [ ] Add/update `calculateInvoicingSpeed` method:
    ```typescript
    private calculateInvoicingSpeed(dashboardMetrics: any, timeStats: any): number {
      const totalRevenue = dashboardMetrics.totale_registratie || 0
      const unbilledValue = timeStats.unbilled?.value || 0
      const totalEarned = totalRevenue + unbilledValue

      const unbilledRatio = totalEarned > 0 ? unbilledValue / totalEarned : 0
      const invoicingSpeed = (1 - Math.min(unbilledRatio, 1))

      return Math.min(invoicingSpeed * 10, 10) // max 10 points
    }
    ```

  - [ ] Add/update `calculateCollectionRate` method:
    ```typescript
    private calculateCollectionRate(dashboardMetrics: any, timeStats: any): number {
      const totalRevenue = dashboardMetrics.totale_registratie || 0
      const unbilledValue = timeStats.unbilled?.value || 0
      const totalEarned = totalRevenue + unbilledValue

      const collectionRate = totalEarned > 0 ? totalRevenue / totalEarned : 0

      return Math.min(collectionRate * 10, 10) // max 10 points
    }
    ```

  - [ ] Add placeholder `calculateInvoiceQuality` method:
    ```typescript
    private calculateInvoiceQuality(): number {
      // Placeholder: Default to 4/5 points (80%) for now
      // Future: Track invoice corrections, disputes, etc.
      return 4
    }
    ```

  - [ ] Update main efficiency calculation to sum: `invoicingSpeed (10) + collectionRate (10) + invoiceQuality (5) = 25`

- [ ] **Remove Revenue Quality from Profit**
  - [ ] Line 2263-2289: Keep `calculateRevenueQuality` method for now (used by Efficiency)
  - [ ] But remove it from profit calculation composition

### Phase 2: Organogram UI Updates

#### File: `/src/components/dashboard/organogram/HealthScoreOrganogram.tsx`

- [ ] **Update `buildProfitOrganogram` function (line 87-214)**
  - [ ] Remove "Revenue Quality & Collection" node (lines 168-212)
  - [ ] Update Hourly Rate Value:
    - Change `maxScore: 8` → `maxScore: 10`
    - Change `contribution: 44` → `contribution: 40` (10/25 * 100)

  - [ ] Update Time Utilization Efficiency:
    - Change `maxScore: 6` → `maxScore: 15`
    - Change `contribution: 33` → `contribution: 60` (15/25 * 100)
    - Update children:
      - Hours Progress: `maxScore: 2.4` → `maxScore: 6`, `contribution: 40` → unchanged
      - Billable Ratio: `maxScore: 2.1` → `maxScore: 6`, `contribution: 35` → unchanged
      - Daily Consistency: `maxScore: 1.5` → `maxScore: 3`, `contribution: 25` → unchanged

- [ ] **Update `buildCashflowOrganogram` function (line 421-490)**
  - [ ] Update Collection Speed:
    - Change `maxScore: 10` → `maxScore: 15`
    - Change `contribution: 10/25 * 100` → `contribution: 15/25 * 100`

  - [ ] Update Volume Efficiency:
    - Change `maxScore: 10` → `maxScore: 5`
    - Change `contribution: 10/25 * 100` → `contribution: 5/25 * 100`

- [ ] **Update `buildEfficiencyOrganogram` function (line 616-685)**
  - [ ] Remove "Time Utilization Progress" node (lines 628-640)
  - [ ] Remove "Daily Consistency" node (lines 656-668)
  - [ ] Remove "Billing Efficiency" node (lines 642-654)

  - [ ] Add "Invoicing Speed" node:
    ```typescript
    {
      id: 'invoicing_speed',
      name: 'Invoicing Speed',
      score: breakdown.efficiency.invoicingSpeedScore || 0,
      maxScore: 10,
      contribution: 10 / 25 * 100,
      level: 1,
      description: `How quickly work is converted to invoices`,
      calculationValue: `${(breakdown.efficiency.unbilledRatio * 100)?.toFixed(1)}% unbilled`,
      calculationDescription: `Invoicing speed: ${(100 - breakdown.efficiency.unbilledRatio * 100)?.toFixed(1)}% → ${breakdown.efficiency.invoicingSpeedScore}/10 pts`,
      isCalculationDriver: true,
      metricId: 'invoicing_speed',
      hasDetailedBreakdown: false
    }
    ```

  - [ ] Add "Collection Rate" node:
    ```typescript
    {
      id: 'collection_rate',
      name: 'Collection Rate',
      score: breakdown.efficiency.collectionRateScore || 0,
      maxScore: 10,
      contribution: 10 / 25 * 100,
      level: 1,
      description: `Percentage of potential revenue invoiced`,
      calculationValue: `${(breakdown.efficiency.collectionRate * 100)?.toFixed(1)}%`,
      calculationDescription: `Collection rate: €${breakdown.efficiency.totalRevenue} / €${breakdown.efficiency.totalEarned} = ${(breakdown.efficiency.collectionRate * 100)?.toFixed(1)}% → ${breakdown.efficiency.collectionRateScore}/10 pts`,
      isCalculationDriver: true,
      metricId: 'collection_rate',
      hasDetailedBreakdown: false
    }
    ```

  - [ ] Add "Invoice Quality" node:
    ```typescript
    {
      id: 'invoice_quality',
      name: 'Invoice Quality',
      score: breakdown.efficiency.invoiceQualityScore || 4,
      maxScore: 5,
      contribution: 5 / 25 * 100,
      level: 1,
      description: `Invoice accuracy and completeness`,
      calculationValue: `${Math.round((breakdown.efficiency.invoiceQualityScore || 4) / 5 * 100)}%`,
      calculationDescription: `Invoice quality: Placeholder → ${breakdown.efficiency.invoiceQualityScore || 4}/5 pts`,
      isCalculationDriver: true,
      metricId: 'invoice_quality',
      hasDetailedBreakdown: false
    }
    ```

- [ ] **Update `buildRiskOrganogram` function (line 810-890)** - Minor adjustments:
  - [ ] Update Payment Collection Risk: `maxScore: 5` → `maxScore: 8`
  - [ ] Update Client Concentration Risk: `maxScore: 3` → `maxScore: 4`
  - [ ] Update Business Continuity Risk: `maxScore: 9` → `maxScore: 5`

### Phase 3: Modal Updates

#### File: `/src/components/dashboard/calculation-detail-modal.tsx`

- [ ] **Update existing modals to reflect new max scores:**
  - [ ] `hours_progress` (line 415-451): Already updated to 2.4 → need to update to 6.0 max
  - [ ] `billable_ratio` (line 182-221): Already updated to 2.1 → need to update to 6.0 max
  - [ ] `daily_consistency` (line 222-254): Already updated to 1.5 → need to update to 3.0 max

- [ ] **Create new modal for `invoicing_speed`:**
  ```typescript
  ) : metricId === 'invoicing_speed' ? (
    <div className="space-y-2">
      <div className="text-xs font-medium mb-2 text-muted-foreground">
        Measures how quickly completed work becomes invoiced
      </div>
      <div className="flex justify-between text-xs">
        <span>0-5% unbilled</span>
        <span className="text-green-600 font-medium">9.5-10 points</span>
      </div>
      <div className="flex justify-between text-xs">
        <span>5-15% unbilled</span>
        <span className="text-blue-600 font-medium">8.5-9.4 points</span>
      </div>
      <div className="flex justify-between text-xs">
        <span>15-30% unbilled</span>
        <span className="text-yellow-600 font-medium">7.0-8.4 points</span>
      </div>
      <div className="flex justify-between text-xs">
        <span>30-50% unbilled</span>
        <span className="text-orange-600 font-medium">5.0-6.9 points</span>
      </div>
      <div className="flex justify-between text-xs">
        <span>&gt;50% unbilled</span>
        <span className="text-red-600 font-medium">0-4.9 points</span>
      </div>
      <div className="text-xs text-muted-foreground mt-2">
        Formula: (1 - Unbilled Ratio) × 10 = Score (capped at 10)
      </div>
      <div className="mt-3 pt-3 border-t">
        <div className="text-xs font-medium mb-1">How to Improve:</div>
        <div className="text-xs text-muted-foreground">
          • Invoice work immediately upon completion<br/>
          • Set up automated invoicing workflows<br/>
          • Review unbilled work weekly
        </div>
      </div>
    </div>
  ```

- [ ] **Update existing `collection_rate` modal (line 471-507):**
  - Change max from 1.4 → 10 points
  - Update scoring milestones accordingly

- [ ] **Create new modal for `invoice_quality`:**
  ```typescript
  ) : metricId === 'invoice_quality' ? (
    <div className="space-y-2">
      <div className="text-xs font-medium mb-2 text-muted-foreground">
        Measures invoice accuracy and completeness
      </div>
      <div className="flex justify-between text-xs">
        <span>No errors/disputes</span>
        <span className="text-green-600 font-medium">5 points</span>
      </div>
      <div className="flex justify-between text-xs">
        <span>Minimal errors</span>
        <span className="text-blue-600 font-medium">4 points</span>
      </div>
      <div className="flex justify-between text-xs">
        <span>Some errors</span>
        <span className="text-yellow-600 font-medium">3 points</span>
      </div>
      <div className="flex justify-between text-xs">
        <span>Frequent errors</span>
        <span className="text-red-600 font-medium">0-2 points</span>
      </div>
      <div className="text-xs text-muted-foreground mt-2">
        Formula: Currently placeholder (4/5 points default)
      </div>
      <div className="mt-3 pt-3 border-t">
        <div className="text-xs font-medium mb-1">How to Improve:</div>
        <div className="text-xs text-muted-foreground">
          • Use invoice templates<br/>
          • Double-check before sending<br/>
          • Track and address client feedback
        </div>
      </div>
    </div>
  ```

### Phase 4: Helper Function Updates

#### File: `/src/components/dashboard/organogram/HealthScoreOrganogram.tsx`

- [ ] **Fix `getCollectionRateDetails` function (line 248-260):**
  - Currently WRONG: Calculates `(totalRevenue - overdueAmount) / totalRevenue`
  - Should be: `totalRevenue / (totalRevenue + unbilledValue)`

  ```typescript
  const getCollectionRateDetails = (breakdown: any) => {
    const totalRevenue = healthScoreResults?.breakdown?.profit?.totalRevenue || 0
    const unbilledValue = healthScoreResults?.breakdown?.profit?.unbilledValue || 0
    const totalEarned = totalRevenue + unbilledValue
    const collectionRate = totalEarned > 0 ? (totalRevenue / totalEarned) * 100 : 100

    return {
      totalRevenue: Math.round(totalRevenue),
      unbilledValue: Math.round(unbilledValue),
      totalEarned: Math.round(totalEarned),
      collectionRate: Math.round(collectionRate)
    }
  }
  ```

- [ ] **Update references to this function:**
  - This function is NO LONGER needed in Profit organogram (we're removing Revenue Quality)
  - Will be used in Efficiency organogram instead

---

## Key Concepts for New Developer

### What is "Double-Dipping"?
When the same underlying metric contributes to multiple categories, inflating the overall score. For example:
- User tracks 100 hours (good!)
- This currently gives points in BOTH "Profit > Time Utilization" AND "Efficiency > Time Utilization Progress"
- User effectively gets credit twice for the same behavior

### Why This Matters
1. **User confusion**: "Why did my score go up so much from just tracking hours?"
2. **Misleading insights**: Categories aren't truly independent
3. **Gaming potential**: Users could optimize one behavior and see disproportionate gains

### The Clean Separation Principle

Each category should measure a DIFFERENT aspect of the business:

| Category | Question Answered | Independence |
|----------|------------------|--------------|
| **Profit** | "How much am I earning?" | Revenue generation capability |
| **Cashflow** | "How fast am I getting paid?" | Payment timing, NOT amount invoiced |
| **Efficiency** | "How well do I convert work → revenue?" | Process effectiveness, NOT hours worked |
| **Risk** | "What could go wrong?" | Vulnerability indicators |

### Current Bug: Collection Rate Formula

**Located:** `HealthScoreOrganogram.tsx` line 248-260

**Current (WRONG):**
```typescript
const collectedAmount = totalRevenue - overdueAmount
const collectionRate = collectedAmount / totalRevenue
```
This calculates "payment quality" (how much is paid on time), NOT "collection rate"

**Should be:**
```typescript
const totalEarned = totalRevenue + unbilledValue
const collectionRate = totalRevenue / totalEarned
```
This calculates what % of earned revenue has been invoiced

---

## Testing Plan

### Unit Tests Needed
- [ ] Test profit calculator returns 25 points max
- [ ] Test efficiency calculator returns 25 points max
- [ ] Test time utilization sub-components sum to 15
- [ ] Test new efficiency metrics (invoicing speed, collection rate)

### Integration Tests
- [ ] Verify no metric appears in multiple categories
- [ ] Verify all 4 categories sum to 100 points
- [ ] Test with edge cases (0 hours, 0 revenue, etc.)

### Manual Testing Checklist
- [ ] Navigate to Profit Health tab
  - [ ] Verify only 2 top-level metrics show: Hourly Rate Value (10 pts), Time Utilization (15 pts)
  - [ ] Expand Time Utilization, verify 3 sub-metrics: Hours Progress (6 pts), Billable Ratio (6 pts), Daily Consistency (3 pts)
  - [ ] Verify NO "Revenue Quality & Collection" node appears

- [ ] Navigate to Cashflow Health tab
  - [ ] Verify Collection Speed shows 15 points max
  - [ ] Verify Volume Efficiency shows 5 points max
  - [ ] Verify Absolute Amount Control shows 5 points max

- [ ] Navigate to Efficiency Health tab
  - [ ] Verify 3 metrics show: Invoicing Speed (10 pts), Collection Rate (10 pts), Invoice Quality (5 pts)
  - [ ] Verify NO Time Utilization or Daily Consistency appears

- [ ] Navigate to Risk Management tab
  - [ ] Verify point allocation totals 25

- [ ] Check modal calculations
  - [ ] Click Hours Progress → verify shows "capped at 6" in formula
  - [ ] Click Billable Ratio → verify shows "capped at 6" in formula
  - [ ] Click Daily Consistency → verify shows max 3 points
  - [ ] Click Invoicing Speed → verify new modal appears
  - [ ] Click Collection Rate → verify updated modal with 10 pts max

---

## Backup & Rollback

**Backup created:** `calculation-detail-modal.backup.tsx` already exists

**Create additional backups before starting:**
```bash
cp src/lib/health-score-engine.ts src/lib/health-score-engine.backup.ts
cp src/components/dashboard/organogram/HealthScoreOrganogram.tsx src/components/dashboard/organogram/HealthScoreOrganogram.backup.tsx
```

**Rollback procedure:**
```bash
# If things go wrong:
mv src/lib/health-score-engine.backup.ts src/lib/health-score-engine.ts
mv src/components/dashboard/organogram/HealthScoreOrganogram.backup.tsx src/components/dashboard/organogram/HealthScoreOrganogram.tsx
mv src/components/dashboard/calculation-detail-modal.backup.tsx src/components/dashboard/calculation-detail-modal.tsx
```

---

## Current Progress (To-Do List)

### ✅ Completed
1. ✅ Analyzed current metric structure and identified overlaps
2. ✅ Designed clean separation of concerns
3. ✅ Got user approval for restructuring plan
4. ✅ Created this comprehensive handoff document

### ✅ Phase 1: Health Score Engine Updates (COMPLETE)
- [x] **Profit Calculator** - Removed Revenue Quality, kept Time Utilization with increased allocations
  - [x] Removed `revenueQualityScore` calculation
  - [x] Updated `calculateTimeUtilization` to 15 pts total (6 + 6 + 3)
  - [x] Updated redistribution logic for time-only model (Hourly Rate: 10pts, Time Util: 15pts)

- [x] **Efficiency Calculator** - Completely replaced with 3 new metrics
  - [x] Removed Time Utilization duplicates
  - [x] Added `calculateInvoicingSpeed` (10 pts)
  - [x] Added `calculateCollectionRate` (10 pts)
  - [x] Added `calculateInvoiceQuality` placeholder (5 pts)
  - [x] Updated explanation and recommendations

- [x] **Cashflow Calculator** - Adjusted point allocations
  - [x] DSO Score: 10 → 15 pts
  - [x] Volume Score: 10 → 5 pts
  - [x] Amount Score: 5 pts (unchanged)
  - [x] Updated explanation text

- [x] **Risk Calculator** - Adjusted point allocations
  - [x] Invoice Processing: 8 pts (unchanged)
  - [x] Payment Risk: 5 → 8 pts
  - [x] Client Risk: 3 → 4 pts
  - [x] Business Continuity: 9 → 5 pts

### ✅ Phase 2: Organogram UI Updates (PARTIAL)
- [x] **buildProfitOrganogram** - Updated structure
  - [x] Removed "Revenue Quality & Collection" node entirely
  - [x] Updated Hourly Rate: maxScore 8 → 10, contribution 44 → 40
  - [x] Updated Time Utilization: maxScore 6 → 15, contribution 33 → 60
  - [x] Updated sub-metrics: Hours Progress (6), Billable Ratio (6), Daily Consistency (3)

### ✅ Phase 2: Organogram UI Updates (COMPLETE)
- [x] **buildCashflowOrganogram** - Updated point allocations
  - [x] Collection Speed: 10 → 15 pts
  - [x] Volume Efficiency: 10 → 5 pts
  - [x] Absolute Amount Control: 5 pts (unchanged)
- [x] **buildEfficiencyOrganogram** - New 3-metric structure
  - [x] Removed Time Utilization, Daily Consistency, Billing Efficiency
  - [x] Added Invoicing Speed (10 pts)
  - [x] Added Collection Rate (10 pts)
  - [x] Added Invoice Quality (5 pts)
- [x] **buildRiskOrganogram** - Updated point allocations
  - [x] Invoice Processing Risk: 8 pts (unchanged)
  - [x] Payment Risk: 5 → 8 pts
  - [x] Client Risk: 3 → 4 pts
  - [x] Business Continuity: 9 → 5 pts

### ✅ Phase 3: Modal explanations (COMPLETE)
- [x] Update hours_progress modal (6 pts max)
- [x] Update billable_ratio modal (6 pts max)
- [x] Update daily_consistency modal (3 pts max)
- [x] Create invoicing_speed modal
- [x] Update collection_rate modal (10 pts max)
- [x] Create invoice_quality modal

### ⏳ Pending
- [ ] Phase 4: Testing and validation
  - [ ] Unit tests for all calculators
  - [ ] Integration tests
  - [ ] Manual testing checklist
  - [ ] User documentation update

---

## Contact & Questions

**Previous Context:**
- Recent work included fixing billable ratio calculation to be progress-based (not efficiency-based)
- Fixed Hours Progress to use total tracked hours (billable + unbilled)
- Created reusable modal structure for metric explanations
- All metrics now properly capped at their max values

**Key Files:**
- Health Score Engine: `/src/lib/health-score-engine.ts` (~2400 lines)
- Organogram UI: `/src/components/dashboard/organogram/HealthScoreOrganogram.tsx` (~1300 lines)
- Calculation Modals: `/src/components/dashboard/calculation-detail-modal.tsx` (~600 lines)

**Tech Stack:**
- Next.js 14+ with App Router
- TypeScript
- Supabase for backend
- Shadcn/UI components

---

## Final Notes

This restructuring is critical for user trust and dashboard accuracy. The current double-counting makes the health score unreliable and confusing. After this change:

1. Each category will be truly independent
2. Users will understand what drives each score
3. The total 100-point score will accurately reflect business health across 4 distinct dimensions

**Estimated Effort:** 8-12 hours for a developer familiar with the codebase
**Risk Level:** Medium (touches core scoring logic, needs thorough testing)
**User Impact:** High (changes visible scores, but improves accuracy)
