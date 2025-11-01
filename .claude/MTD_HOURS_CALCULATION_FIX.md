# MTD Hours Calculation Fix

**Date:** 2025-01-10
**Issue:** HOURS MTD card showing incorrect target (4h instead of expected ~102h)
**Development Date:** September 20, 2025 (set in `src/lib/current-date.ts`)

## Problem Analysis

The HOURS MTD card on `/dashboard/financieel-v2` was showing a target of **4h** instead of the expected **~102h**.

### Root Causes Identified:

1. **Using `new Date()` instead of `getCurrentDate()`**
   - The calculation was using the actual system date (October 1st) instead of the configured development date (September 20th)
   - This caused the calculation to be for October MTD instead of September MTD

2. **Using calendar days instead of working days**
   - Original calculation: `mtdHoursTarget = monthlyHoursTarget × (currentDay / daysInMonth)`
   - This didn't account for weekends and the user's configured working days
   - Example: Oct 1 = day 1/31 = 3.2% × 160h = ~5h (close to the 4h shown)

3. **Confusion between MTD and Rolling 30-Day metrics**
   - **HOURS MTD Card** = Current month working days (Sept 1 - Yesterday)
   - **Hours Progress (Health Score)** = Rolling 30-day window (uses `timeStats.rolling30Days`)
   - These are different calculations serving different purposes

## Solution Implemented

### Changes Made to `src/app/dashboard/financieel-v2/page.tsx`

#### Summary of Changes:
1. ✅ Use development date instead of system date
2. ✅ Calculate MTD hours target based on working days
3. ✅ Update progress bar to show percentage of monthly target (not MTD target)
4. ✅ Add red target line indicator showing MTD target position
5. ✅ Update subtitle to show both MTD and monthly targets

#### 1. Use Development Date
```typescript
// Line 122 - Changed from:
const now = new Date()

// To:
const now = getCurrentDate()
```

#### 2. Calculate Working Days Completed
```typescript
// Lines 144-185 - New working days calculation:
const workingDays = profitTargets?.target_working_days_per_week || [1, 2, 3, 4, 5]

// Calculate yesterday (we measure MTD progress up to yesterday, not including today)
const yesterday = new Date(now)
yesterday.setDate(yesterday.getDate() - 1)

const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

// Count working days completed in current month (up to yesterday)
let workingDaysCompleted = 0
let tempDate = new Date(startOfMonth)
while (tempDate <= yesterday) {
  const dayOfWeek = tempDate.getDay()
  const isoWeekday = dayOfWeek === 0 ? 7 : dayOfWeek
  if (workingDays.includes(isoWeekday)) {
    workingDaysCompleted++
  }
  tempDate.setDate(tempDate.getDate() + 1)
}

// Calculate total working days in the full month
const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

let totalWorkingDaysInMonth = 0
tempDate = new Date(startOfMonth)
while (tempDate <= endOfMonth) {
  const dayOfWeek = tempDate.getDay()
  const isoWeekday = dayOfWeek === 0 ? 7 : dayOfWeek
  if (workingDays.includes(isoWeekday)) {
    totalWorkingDaysInMonth++
  }
  tempDate.setDate(tempDate.getDate() + 1)
}

// Calculate MTD hours target: (monthly target / total working days) × working days completed
const dailyHoursTarget = totalWorkingDaysInMonth > 0 ? monthlyHoursTarget / totalWorkingDaysInMonth : 0
const mtdHoursTarget = Math.round(dailyHoursTarget * workingDaysCompleted)
```

#### 3. Update Visual Display (Progress Bar & Target Line)
```typescript
// Lines 564-567 - Match Revenue MTD card pattern:

// Hours progress: actual MTD as % of full monthly budget (same pattern as revenue)
const hoursProgress = monthlyHoursTarget > 0 ? (currentHoursMTD / monthlyHoursTarget) * 100 : 0
// Hours target line: where MTD target sits within monthly budget
const hoursTargetLine = monthlyHoursTarget > 0 ? (mtdHoursTarget / monthlyHoursTarget) * 100 : 100
```

**Previous (Incorrect):**
```typescript
// Progress bar filled to 100% when MTD target was met (wrong!)
const hoursProgress = mtdHoursTarget > 0 ? (currentHoursMTD / mtdHoursTarget) * 100 : 0
```

#### 4. Update Hours MTD Card Component
```typescript
// Lines 606-620 - Updated card props:
<GlassmorphicMetricCard
  icon={Clock}
  title="Hours MTD"
  value={`${Math.round(currentHoursMTD)}h`}
  subtitle={`Target: ${mtdHoursTarget}h MTD (${monthlyHoursTarget}h monthly)`}  // Updated!
  progress={hoursProgress}          // Now uses monthly target as denominator
  targetLine={hoursTargetLine}      // Now shows red line at MTD target position
  // ... rest of props
/>
```

**Previous (Incorrect):**
```typescript
subtitle={`Target: ${mtdHoursTarget}h`}  // Missing monthly context
targetLine={100}                          // No red line indicator
```

#### 5. Update mtdCalculations for Health Score
```typescript
// Lines 246-247 - Changed from hardcoded 0s:
expectedWorkingDaysUpToYesterday: 0,
totalExpectedWorkingDays: 0

// To actual calculated values:
expectedWorkingDaysUpToYesterday: workingDaysCompleted,
totalExpectedWorkingDays: totalWorkingDaysInMonth
```

## Expected Results

### With Development Date = September 20, 2025

**September 2025 Calendar:**
- Sept 1 = Monday
- Sept 30 = Tuesday
- Working days (Mon-Fri): 22 total
- Working days completed (Sept 1-19): 14 days

**Calculation:**
- Monthly hours target: 160h
- Daily target: 160h ÷ 22 days = 7.27h/day
- **MTD hours target: 7.27h × 14 days ≈ 102h** ✓

**Visual Display (matches Revenue MTD card pattern):**

Example with 80h actual, 102h MTD target, 160h monthly target:

```
HOURS MTD Card Display:
┌─────────────────────────────────────────┐
│ 🕐 HOURS MTD                  [MTD]     │
│                                         │
│ 80h                                     │
│ Target: 102h MTD (160h monthly)         │
│                                         │
│ Progress Bar (0% ─────────── 100% = Monthly Target):
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 100% = 160h monthly
│ ████████████████████████░░░░░░░░░░░░░░░ 50% = 80h actual (blue)
│                           ┃              64% = 102h MTD target (red line)
└─────────────────────────────────────────┘
```

**Calculation:**
- Progress bar length: `80h / 160h × 100% = 50%` (blue bar)
- Red target line position: `102h / 160h × 100% = 63.75%` (red vertical line)
- Subtitle: `"Target: 102h MTD (160h monthly)"`

This matches the Revenue MTD card where:
- Progress bar = actual / monthly budget
- Target line = MTD target / monthly budget

### Previous (Incorrect) Calculation:
- Used Oct 1 as current date
- Calendar day progress: 1/31 = 3.2%
- MTD target: 160h × 3.2% = **5h** (showed as 4h after rounding)
- Progress bar: `currentHoursMTD / mtdHoursTarget × 100%` (wrong denominator!)
- Target line: Fixed at 100% (no red line indicator)

## Key Distinctions

### HOURS MTD Card (Dashboard Main Page)
- **Purpose:** Track current month progress against monthly target
- **Period:** Current calendar month (e.g., Sept 1 - Sept 19)
- **Calculation:** Working days completed ÷ Total working days in month
- **Target:** Prorated monthly target based on working days elapsed

### Hours Progress (Business Health Score)
- **Purpose:** Measure productivity consistency over time
- **Period:** Rolling 30-day window (e.g., Aug 21 - Sept 20)
- **Calculation:** Uses `timeStats.rolling30Days.current.totalHours`
- **Target:** Full monthly target (30 days ≈ 1 month)
- **Why different:** Avoids early-month penalty, enables consistent trend analysis

## Testing

To verify the fix:

1. **Check development date setting:**
   ```typescript
   // In src/lib/current-date.ts
   const hardcodedDate: Date | null = new Date('2025-09-20T12:00:00');
   ```

2. **Expected MTD values for Sept 20:**
   - Working days completed: 14 (Sept 1-19, Mon-Fri)
   - Total working days: 22 (Sept 1-30, Mon-Fri)
   - MTD target: ~102h

3. **Refresh dashboard:**
   - Navigate to `http://localhost:3000/dashboard/financieel-v2`
   - HOURS MTD card should show "Target: 102h" (not 4h)

## Related Files

- **Modified:** `src/app/dashboard/financieel-v2/page.tsx`
- **Referenced:** `src/lib/current-date.ts` (development date configuration)
- **Referenced:** `src/lib/health-score-engine.ts` (rolling 30-day logic)
- **Referenced:** `supabase/migrations/044_add_working_days_target.sql` (working days schema)

## Documentation References

- Business health scoring uses rolling 30-day windows (see health-score-engine.ts lines 7-27)
- Daily consistency metric definition (see health-score-metric-definitions.ts lines 288-305)
- MTD calculation examples (see BUSINESS_HEALTH_AND_DASHBOARD_METRICS.md lines 2536-2617)
