# Metrics Review Report: Business Health vs Cards Below

**Development Date Set:** September 17, 2025
**Review Date:** 2025-10-10
**Reviewed By:** Claude Code

---

## Executive Summary

This report analyzes the metrics architecture in the unified financial dashboard, comparing the Business Health section (4 cards using rolling 30-day data) against the metric cards below it (using Month-To-Date data). Key finding: **Intentional architectural difference** between long-term trend tracking (Business Health) and current month snapshot (Cards).

---

## 1. Business Health Section (4 Cards) - Rolling 30-Day Data

These metrics use **rolling 30-day windows** for consistent, fair scoring regardless of when in the month you check.

### 1.1 Total Profit (MTD) - 25 points

**Data Source:** Rolling 30-day data
**File Location:** `src/lib/health-score-engine.ts:1153` (ProfitScoreCalculator)

- **Time Period:** Last 30 days (Aug 18 - Sept 17 when dev date is Sept 17)
- **Calculation:**
  - Uses `timeStats.rolling30Days.current.billableRevenue` (from time entries)
  - Plus subscription revenue: `monthlyActiveUsers.current × averageSubscriptionFee.current`
  - Compares against full monthly targets (30 days ≈ 1 month)

**Components:**
1. **Subscriber Growth** (if SaaS enabled) - up to 6 points
2. **Revenue Diversification** (if hybrid) - up to 3 points
3. **Pricing Efficiency** (time-based) - up to 4 points
4. **Rate Optimization** (time-based) - up to 3 points
5. **Time Utilization** - up to 6 points
6. **Revenue Quality** - up to 4 points

**Key Code:**
```typescript
// Line ~1355
const timeRevenue = timeStats.rolling30Days?.current?.billableRevenue || 0
const totalRevenue = timeRevenue + currentMRR
const currentProfit = totalRevenue - estimatedMonthlyCosts
```

---

### 1.2 Cash Flow - 25 points

**Data Source:** Current overdue invoices (NOT rolling 30-day)
**File Location:** `src/lib/health-score-engine.ts:243` (CashFlowScoreCalculator)

- **Time Period:** Current snapshot of outstanding invoices
- **Calculation:**
  - `dashboardMetrics.achterstallig` (overdue amount)
  - `dashboardMetrics.achterstallig_count` (overdue count)
  - `dashboardMetrics.actual_dio` (Days Invoice Overdue)

**Components:**
1. **DIO Score** (speed) - up to 15 points
   - Excellent: 0 days overdue (15 pts)
   - Good: 1-7 days overdue (12 pts)
   - Fair: 8-15 days overdue (8 pts)
   - Poor: 16-30 days overdue (3 pts)
   - Critical: >30 days overdue (0 pts)

2. **Volume Efficiency** - up to 5 points
   - Excellent: 0 invoices overdue (5 pts)
   - Good: 1-2 invoices overdue (3 pts)
   - Fair: 3-4 invoices overdue (1 pt)
   - Poor: 5+ invoices overdue (0 pts)

3. **Absolute Amount Control** - up to 5 points
   - Excellent: €0 overdue (5 pts)
   - Good: €1-€3,000 overdue (3 pts)
   - Fair: €3,001-€6,000 overdue (1 pt)
   - Poor: €6,000+ overdue (0 pts)

**Key Code:**
```typescript
// Line ~283
const overdueAmount = dashboardMetrics.achterstallig || 0
const overdueCount = dashboardMetrics.achterstallig_count || 0
const actualDIO = dashboardMetrics.actual_dio ?? this.calculateRealDIOFromData(overdueAmount, overdueCount)
```

---

### 1.3 Efficiency (MTD) - 25 points

**Data Source:** Rolling 30-day data
**File Location:** `src/lib/health-score-engine.ts:552` (EfficiencyScoreCalculator)

- **Time Period:** Last 30 days (same as Profit)
- **Calculation:**
  - Uses `timeStats.rolling30Days.current` for all metrics
  - Billable ratio: `billableHours / totalHours`
  - Daily consistency: `dailyHours` vs target
  - Hours progress: `totalHours` vs monthly target

**Components:**
1. **Billable Ratio** - up to 4 points
2. **Hours Progress** - up to 6 points
3. **Daily Consistency** - up to 3 points
4. **Billing Efficiency** - up to 2.1 points

**Key Code:**
```typescript
// Line ~2444
const totalTrackedHours = timeStats.rolling30Days?.current?.totalHours || 0
const billableHours = timeStats.rolling30Days?.current?.billableHours || 0
const nonBillableHours = timeStats.rolling30Days?.current?.nonBillableHours || 0
const monthlyTarget = profitTargets.monthly_hours_target
```

---

### 1.4 Risk Management - 25 points

**Data Source:** Rolling 30-day data
**File Location:** `src/lib/health-score-engine.ts:794` (RiskScoreCalculator)

- **Time Period:** Last 30 days + comparison to previous 30 days (days 31-60)
- **Calculation:**
  - Client concentration: `clientRevenue.rolling30DaysComparison.current.topClientShare`
  - Revenue stability: compares current vs previous 30-day billable revenue
  - Daily consistency: `rolling30Days.current.dailyHours` vs target

**Components:**
1. **Client Concentration Risk** - up to 9 points (36% of total)
   - <30% share: 9 pts (Low risk)
   - 30-50% share: 6 pts (Medium risk)
   - 50-80% share: 3 pts (High risk)
   - >80% share: 0 pts (Very high risk)

2. **Business Continuity Risk** - up to 8 points (32% of total)
   - Revenue Stability (3 pts)
   - Client Concentration Trend (2.5 pts)
   - Consistency Trend (2.5 pts)

3. **Daily Consistency Risk** - up to 8 points (32% of total)
   - Based on actual daily hours vs target daily hours

**Key Code:**
```typescript
// Line ~801
const topClientShare = clientRevenue?.rolling30DaysComparison?.current?.topClientShare || 0

// Line ~825-826
const current30DaysBillableRevenue = timeStats.rolling30Days?.current?.billableRevenue || 0
const previous30DaysBillableRevenue = timeStats.rolling30Days?.previous?.billableRevenue || 0

// Line ~893-894
const actualDailyHours = timeStats.rolling30Days?.current?.dailyHours || 0
const distinctWorkingDays = timeStats.rolling30Days?.current?.distinctWorkingDays || 0
```

---

## 2. Cards Below Business Health - MTD Data

These cards use **Month-To-Date (MTD)** data, starting from the 1st of the current month.

### 2.1 Revenue Card (MTD)

**Data Source:** MTD invoiced revenue
**File Location:** `src/components/dashboard/unified-financial-dashboard.tsx:1156`

- **Time Period:** Sept 1 - Sept 17 (for dev date)
- **Current Value:** `dashboardMetrics.totale_registratie` (invoiced revenue MTD)
  - Plus: `subscription.monthlyActiveUsers.current × averageSubscriptionFee.current`
- **Target:** `mtdCalculations.mtdRevenueTarget` (prorated monthly target)
- **Comparison:** vs previous month MTD at same day (`mtdComparison.percentageChange`)

**MTD Target Calculation:**
```typescript
// Line ~311-315
const now = getCurrentDate()
const currentDay = now.getDate()
const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
const monthProgress = currentDay / daysInMonth  // 17 / 30 = 0.567
const mtdRevenueTarget = monthlyRevenueTarget * monthProgress  // €12,000 * 0.567 = €6,804
```

**Display Code:**
```typescript
// Line ~1180-1183
<span className="text-2xl font-bold metric-number text-accent">
  {formatCurrency(Math.round((dashboardMetrics?.totale_registratie || 0) +
    ((timeStats?.subscription?.monthlyActiveUsers?.current || 0) *
     (timeStats?.subscription?.averageSubscriptionFee?.current || 0))))}
</span>
<span className="text-sm text-muted-foreground">
  / €{Math.round(mtdCalculations.mtdRevenueTarget / 1000)}K MTD
  <span className="text-xs opacity-75">(€{Math.round(mtdCalculations.monthlyRevenueTarget / 1000)}K)</span>
</span>
```

---

### 2.2 Billable Hours Card (MTD)

**Data Source:** MTD tracked hours
**File Location:** `src/components/dashboard/unified-financial-dashboard.tsx:1230`

- **Time Period:** Sept 1 - Sept 17 (for dev date)
- **Current Value:** `timeStats.thisMonth.hours` (all hours tracked this month)
- **Target:** `mtdCalculations.mtdHoursTarget` (working days based calculation)
- **Comparison:** Weekly trend from `timeStats.thisWeek.trend`

**MTD Hours Target Calculation:**
```typescript
// Line ~334-360 (DYNAMIC HOURS MTD CALCULATION BASED ON WORKING DAYS)
const workingDays = profitTargets?.target_working_days_per_week || [1, 2, 3, 4, 5]

// Calculate yesterday (we measure progress up to yesterday, not today)
const yesterday = new Date(now)
yesterday.setDate(yesterday.getDate() - 1)

const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
startOfMonth.setHours(0, 0, 0, 0)

// Expected working days up to yesterday (for MTD assessment)
let expectedWorkingDaysUpToYesterday = 0
let currentDate = new Date(startOfMonth)
while (currentDate <= yesterday) {
  const dayOfWeek = currentDate.getDay()
  const isoWeekday = dayOfWeek === 0 ? 7 : dayOfWeek
  if (workingDays.includes(isoWeekday)) {
    expectedWorkingDaysUpToYesterday++
  }
  currentDate.setDate(currentDate.getDate() + 1)
}

// Calculate MTD hours target based on actual working days
const expectedWorkingDaysInMonth = calculateExpectedWorkingDays(...)
const dailyHoursTarget = monthlyHoursTarget / expectedWorkingDaysInMonth
const mtdHoursTarget = dailyHoursTarget * expectedWorkingDaysUpToYesterday
```

**Display Code:**
```typescript
// Line ~1261-1262
<span className="text-2xl font-bold metric-number text-green-400">
  {formatHours(timeStats?.thisMonth.hours || 0)}
</span>
<span className="text-sm text-muted-foreground">
  / {formatHours(mtdCalculations.mtdHoursTarget)} MTD
  <span className="text-xs opacity-75">({formatHours(mtdCalculations.monthlyHoursTarget)})</span>
</span>
```

---

### 2.3 Average Hourly Rate Card (MTD-based)

**Data Source:** MTD revenue ÷ MTD hours
**File Location:** `src/components/dashboard/unified-financial-dashboard.tsx:1310`

- **Time Period:** Sept 1 - Sept 17 (for dev date)
- **Current Value:** `dashboardMetrics.totale_registratie / timeStats.thisMonth.hours`
- **Target:** `profitTargets.target_hourly_rate`
- **Comparison:** vs previous month rate (`rateComparison.percentageChange`)

**Display Code:**
```typescript
// Line ~1333-1336
<span className="text-2xl font-bold metric-number text-blue-400">
  €{(timeStats?.thisMonth.hours || 0) > 0 ?
    ((dashboardMetrics?.totale_registratie || 0) / timeStats.thisMonth.hours).toFixed(1) : '0'}
</span>
<span className="text-sm text-muted-foreground">
  / €{profitTargets?.target_hourly_rate || 100} target
</span>
```

---

### 2.4 Monthly Active Users (MAU) - If Enabled

**Data Source:** Current month vs previous month
**File Location:** `src/components/dashboard/unified-financial-dashboard.tsx:1380`

- **Time Period:** Current month (Sept) vs previous month (Aug)
- **Current Value:** `timeStats.subscription.monthlyActiveUsers.current`
- **Comparison:** Growth % vs last month
- **Target:** `profitTargets.target_monthly_active_users` (defaults to 15 in display)

---

### 2.5 Average Subscription Fee - If Enabled

**Data Source:** Current month vs previous month
**File Location:** `src/components/dashboard/unified-financial-dashboard.tsx:1454`

- **Time Period:** Current month (Sept) vs previous month (Aug)
- **Current Value:** `timeStats.subscription.averageSubscriptionFee.current`
- **Comparison:** Growth % vs last month
- **Target:** `profitTargets.target_avg_subscription_fee` (defaults to €75 in display)

---

## 3. Key Discrepancies & Potential Issues

### 3.1 Time Period Mismatch ⚠️ CRITICAL

**Business Health uses rolling 30 days, Cards use MTD.**

**Example with Dev Date Sept 17:**
- **Business Health Profit:** Aug 18 - Sept 17 (30 days)
- **Revenue Card:** Sept 1 - Sept 17 (17 days MTD)

**Impact:**
- Business Health shows full 30-day performance
- Cards show only partial month (17 days)
- User may be confused why numbers differ significantly
- Early in the month (e.g., Sept 5), MTD shows 5 days while Business Health shows full 30 days

**Example Scenario:**
```
Date: Sept 5, 2025
Business Health Profit: Aug 6 - Sept 5 (30 days) = €10,000
Revenue Card: Sept 1 - Sept 5 (5 days) = €2,000

User sees: "Why does my Business Health show €10K but Revenue card shows €2K?"
Answer: Different time periods - one is rolling 30 days, other is MTD.
```

---

### 3.2 Rate Calculation Differences ⚠️ MEDIUM

**Business Health - Efficiency (Pricing Efficiency):**
```typescript
// Line ~1240-1242 in health-score-engine.ts
const timeRevenue = timeStats.rolling30Days?.current?.billableRevenue || 0
const currentHours = timeStats.rolling30Days?.current?.billableHours || 0  // BILLABLE ONLY
const currentHourlyRate = currentHours > 0 ? timeRevenue / currentHours : 0
```

**Avg Rate Card:**
```typescript
// Line ~1334 in unified-financial-dashboard.tsx
const mtdRate = timeStats.thisMonth.hours > 0   // ALL HOURS (billable + non-billable)
  ? dashboardMetrics.totale_registratie / timeStats.thisMonth.hours
  : 0
```

**⚠️ ISSUE:** Different denominators!
- Business Health uses `billableHours` from time entries (excludes non-billable)
- Card uses `thisMonth.hours` (includes ALL hours - billable + non-billable)

**Example Impact:**
```
Scenario:
- Billable hours: 100h at €80/h = €8,000
- Non-billable hours: 20h (admin, training, etc.)
- Total hours: 120h
- Invoiced revenue: €8,000

Business Health Rate: €8,000 / 100h = €80/h
Avg Rate Card: €8,000 / 120h = €66.67/h

Difference: 16.7% lower rate shown in card!
```

---

### 3.3 Revenue Source Differences ⚠️ MEDIUM

**Business Health:**
```typescript
// Uses billable revenue from TIME ENTRIES (hours × rates)
const timeRevenue = timeStats.rolling30Days?.current?.billableRevenue || 0
```

**Revenue Card:**
```typescript
// Uses INVOICED amounts from INVOICES table
const currentRevenue = dashboardMetrics.totale_registratie
```

**⚠️ ISSUE:** These can differ significantly:

1. **Time entries** = work performed (may not be invoiced yet)
2. **Invoices** = billed amounts (actual invoiced work)

**Example Impact:**
```
Scenario:
- Time tracked in Sept: 120h × €80/h = €9,600
- Invoices sent in Sept: €12,000 (includes some work from August that got invoiced)

Business Health: Shows €9,600 (time-based)
Revenue Card: Shows €12,000 (invoice-based)

Difference: €2,400 (20% higher in card)
```

**When they diverge:**
- Invoicing lag: Work done but not yet invoiced → time entries higher
- Batch invoicing: Multiple periods invoiced at once → invoices higher
- Retainers: Fixed invoices regardless of hours → can be either direction
- Subscription revenue: Added to both differently

---

### 3.4 MTD Comparison Calculation ⚠️ LOW

**MTD Comparison (used in Revenue Card trend):**
```typescript
// Line ~467-502 in unified-financial-dashboard.tsx
const mtdComparison = useMemo(() => {
  // Current month: total billable time revenue (invoiced + unbilled) + subscriptions
  const currentMonthTimeRevenue = (timeStats.thisMonth.hours || 0) * (timeStats.thisMonth.rate || 0)
  const currentMonthSubscriptionRevenue = (timeStats?.subscription?.monthlyActiveUsers?.current || 0) *
                                          (timeStats?.subscription?.averageSubscriptionFee?.current || 0)
  const currentMTD = currentMonthTimeRevenue + currentMonthSubscriptionRevenue

  // Previous month: total billable time revenue + subscriptions (prorated to same day)
  const { currentDay, daysInMonth } = mtdCalculations
  const lastMonthDays = new Date(new Date().getFullYear(), new Date().getMonth(), 0).getDate()
  const mtdRatio = currentDay / lastMonthDays

  const previousMonthTimeRevenue = (timeStats.lastMonth.hours || 0) * (timeStats.lastMonth.rate || 0)
  const previousMonthSubscriptionRevenue = (timeStats?.subscription?.monthlyActiveUsers?.previous || 0) *
                                           (timeStats?.subscription?.averageSubscriptionFee?.previous || 0)
  const previousMTD = (previousMonthTimeRevenue + previousMonthSubscriptionRevenue) * mtdRatio

  const difference = currentMTD - previousMTD
  const percentageChange = previousMTD > 0 ? (difference / previousMTD) * 100 : 0

  return {
    current: currentMTD,
    previous: previousMTD,
    difference,
    trend: difference >= 0 ? 'positive' as const : 'negative' as const,
    percentageChange
  }
}, [timeStats, mtdCalculations])
```

**Note:** This uses `timeStats.thisMonth.hours × timeStats.thisMonth.rate`, which is:
- Different from both Business Health (rolling 30-day billable revenue)
- Different from Revenue Card display (invoiced amounts)

This creates a **third revenue calculation** used only for the trend comparison!

---

### 3.5 Progress Bar Calculations - CORRECT ✅

**Revenue Card Progress Bar:**
```typescript
// Line ~1207-1218
<div className="relative progress-bar">
  <div
    className="progress-fill progress-fill-primary"
    // Progress calculated against MONTHLY target (not MTD target)
    style={{ width: `${Math.min((currentRevenue / monthlyRevenueTarget) * 100, 100)}%` }}
  />
  {/* MTD Target Line */}
  <div
    className="absolute top-0 bottom-0 w-0.5 bg-primary opacity-90"
    style={{ left: `${Math.min((mtdRevenueTarget / monthlyRevenueTarget) * 100, 100)}%` }}
    title={`MTD Target: ${formatCurrency(mtdRevenueTarget)}`}
  />
</div>
```

This is **correct** - shows progress against full month with MTD checkpoint marker.

**Hours Card Progress Bar:**
```typescript
// Line ~1282-1295
// Same pattern - correct implementation
<div className="relative progress-bar">
  <div
    className="progress-fill"
    style={{ width: `${Math.min((currentHours / monthlyHoursTarget) * 100, 100)}%` }}
  />
  {/* MTD Target Line */}
  <div
    className="absolute top-0 bottom-0 w-0.5 bg-green-500 opacity-90"
    style={{ left: `${Math.min((mtdHoursTarget / monthlyHoursTarget) * 100, 100)}%` }}
    title={`MTD Target: ${formatHours(mtdHoursTarget)}`}
  />
</div>
```

---

## 4. Data Flow Summary

### 4.1 Business Health Score Calculation

```
Time Entries (rolling 30 days)
  ↓
API: /api/time-entries/stats
  ↓ (Line ~88-110)
timeStats.rolling30Days.current.*
  - billableRevenue
  - distinctWorkingDays
  - totalHours
  - dailyHours
  - billableHours
  - nonBillableHours
  - unbilledHours
  - unbilledValue
  ↓
health-score-engine.ts
  ↓
ProfitScoreCalculator (line 1153)
EfficiencyScoreCalculator (line 552)
RiskScoreCalculator (line 794)
CashFlowScoreCalculator (line 243)
  ↓
Business Health Scores (25 pts each)
  ↓
unified-financial-dashboard.tsx (line ~990-1150)
```

### 4.2 MTD Cards Calculation

```
1. Revenue Card:
   Invoices (MTD)
   ↓
   API: /api/invoices/dashboard-metrics
   ↓
   dashboardMetrics.totale_registratie
   ↓
   unified-financial-dashboard.tsx (line ~1156)

2. Hours Card:
   Time Entries (MTD)
   ↓
   API: /api/time-entries/stats
   ↓ (Line ~67-74)
   timeStats.thisMonth.hours
   ↓
   unified-financial-dashboard.tsx (line ~1230)

3. Rate Card:
   dashboardMetrics.totale_registratie ÷ timeStats.thisMonth.hours
   ↓
   unified-financial-dashboard.tsx (line ~1310)
```

### 4.3 Date Range Calculations

**Rolling 30 Days (Business Health):**
```typescript
// /api/time-entries/stats route.ts (Line ~90-96)
const now = getCurrentDate()  // Sept 17, 2025
const last30DaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)  // Aug 18, 2025

// Query: entry_date >= '2025-08-18' AND entry_date <= '2025-09-17'
```

**MTD (Cards):**
```typescript
// /api/time-entries/stats route.ts (Line ~31-34)
const now = getCurrentDate()  // Sept 17, 2025
const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)  // Sept 1, 2025
const currentMonthEnd = new Date(now)  // Sept 17, 2025

// Query: entry_date >= '2025-09-01' AND entry_date <= '2025-09-17'
```

**Previous 30 Days (Business Health comparison):**
```typescript
// /api/time-entries/stats route.ts (Line ~100-108)
const previous30DaysStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)  // July 19, 2025
const previous30DaysEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)    // Aug 18, 2025

// Query: entry_date >= '2025-07-19' AND entry_date < '2025-08-18'
```

---

## 5. Recommendations

### 5.1 User Communication (HIGH PRIORITY) ⭐

**Problem:** Users don't know that Business Health uses rolling 30 days while cards use MTD.

**Solutions:**

**Option A: Add tooltips/labels**
```tsx
// Business Health Section
<p className="text-xs text-muted-foreground">
  📊 Rolling 30-day performance (Aug 18 - Sept 17)
</p>

// Revenue Card
<h3 className="text-base font-semibold">Revenue</h3>
<p className="text-xs text-muted-foreground">
  Month-to-date (Sept 1 - Sept 17)
</p>
```

**Option B: Add info icon with modal**
```tsx
<InfoIcon
  tooltip="Business Health uses rolling 30-day windows for consistent trend tracking,
           while cards below show month-to-date progress."
/>
```

**Option C: Add date range display**
```tsx
// Show actual date ranges dynamically
<Badge variant="outline" className="text-xs">
  Aug 18 - Sept 17 (30 days)
</Badge>
```

---

### 5.2 Consider Alignment (MEDIUM PRIORITY)

**Option A: Keep as-is (RECOMMENDED)**

**Justification:**
- Business Health = long-term trends, stable scoring
- Cards = current month snapshot, tactical progress
- Different purposes warrant different time windows
- Just needs better user communication (see 5.1)

**Option B: Add toggle for users**
```tsx
<Toggle>
  <ToggleItem value="rolling">Rolling 30 Days</ToggleItem>
  <ToggleItem value="mtd">Month-to-Date</ToggleItem>
</Toggle>
```

This would require:
- Dual calculations for all metrics
- State management for toggle
- Potentially confusing UX

**Option C: Align everything to rolling 30 days**

**Pros:**
- Consistent time windows
- Fair comparisons early in month

**Cons:**
- Loses MTD progress tracking (users want to know "how am I doing THIS month")
- Monthly goals become harder to track
- Invoicing rhythm tied to calendar months

**Option D: Align everything to MTD**

**Pros:**
- Consistent with accounting/invoicing calendar
- Natural monthly goal tracking

**Cons:**
- Unfair health scores early in month (penalized for low MTD hours on Sept 3)
- Volatile scoring throughout month
- Loses rolling trend analysis

---

### 5.3 Rate Calculation Consistency (HIGH PRIORITY) ⭐

**Problem:** Business Health uses billable hours, Rate Card uses total hours.

**Recommendation: Standardize on BILLABLE HOURS**

**Reasoning:**
- Rate should reflect value of billable work
- Non-billable hours (admin, training) shouldn't dilute rate
- More accurate business metric
- Aligns with Business Health methodology

**Implementation:**
```typescript
// unified-financial-dashboard.tsx Line ~1334
// BEFORE:
const mtdRate = (timeStats?.thisMonth.hours || 0) > 0
  ? ((dashboardMetrics?.totale_registratie || 0) / timeStats.thisMonth.hours)
  : 0

// AFTER:
const mtdRate = (timeStats?.thisMonth.billableHours || 0) > 0
  ? ((dashboardMetrics?.totale_registratie || 0) / timeStats.thisMonth.billableHours)
  : 0
```

**Also update display:**
```tsx
<p className="text-xs text-muted-foreground">Billable Hours</p>
<p className="text-sm font-bold">{formatHours(timeStats?.thisMonth.billableHours || 0)}</p>
```

---

### 5.4 Revenue Source Alignment (LOW PRIORITY)

**Current State:**
- Business Health: Uses time entry billable revenue (hours × rates)
- Revenue Card: Uses invoiced amounts (actual invoices)

**Recommendation: Keep as-is**

**Reasoning:**
- Both metrics are valuable but measure different things
- Time entries = work performed (operational metric)
- Invoices = revenue recognized (financial metric)
- Add clarifying labels instead of changing calculation

**Implementation:**
```tsx
// Business Health - Profit Score explanation
<p className="text-xs text-muted-foreground">
  Based on billable work performed (time entries)
</p>

// Revenue Card
<p className="text-xs text-muted-foreground">
  Invoiced revenue (MTD)
</p>
```

---

### 5.5 MTD Comparison Consistency (MEDIUM PRIORITY)

**Problem:** MTD trend comparison uses yet another calculation method.

**Current:**
```typescript
const currentMTD = (timeStats.thisMonth.hours × timeStats.thisMonth.rate) + subscriptionRevenue
```

**Recommendation: Align with Revenue Card display**

```typescript
// Use same source as the card itself for consistency
const currentMTD = dashboardMetrics.totale_registratie + subscriptionRevenue
const previousMTD = (previousMonthInvoicedRevenue + previousSubscriptionRevenue) * mtdRatio
```

**Reasoning:**
- User sees Revenue Card showing invoiced amounts
- Trend should match what's displayed
- Currently shows trend for a "phantom" metric (time entries × rate)

---

### 5.6 Documentation (HIGH PRIORITY) ⭐

**Add inline code comments:**

```typescript
// unified-financial-dashboard.tsx
/**
 * IMPORTANT: TIME WINDOW ARCHITECTURE
 *
 * Business Health Section (Lines 990-1150):
 * - Uses ROLLING 30-DAY data for consistent trend tracking
 * - Example: Sept 17 → Aug 18 to Sept 17 (30 days)
 * - Rationale: Fair scoring regardless of day of month
 *
 * Metric Cards Below (Lines 1156+):
 * - Use MONTH-TO-DATE (MTD) data for monthly progress tracking
 * - Example: Sept 17 → Sept 1 to Sept 17 (17 days)
 * - Rationale: Track progress toward monthly goals
 *
 * This is an INTENTIONAL ARCHITECTURAL DIFFERENCE.
 */
```

**Add to project CLAUDE.md:**

```markdown
## Dashboard Metrics Architecture

### Time Windows
- **Business Health**: Rolling 30-day windows (consistent trend tracking)
- **Metric Cards**: Month-to-date (monthly goal progress)

### Data Sources
- **Business Health Profit/Efficiency**: Time entry billable revenue
- **Revenue Card**: Invoice amounts
- **Rate Card**: Revenue ÷ billable hours (recommend updating)

See `.claude/METRICS_REVIEW_2025-09-17.md` for full analysis.
```

---

## 6. Test Scenarios

### 6.1 Edge Case: First Days of Month

**Date: Sept 3, 2025**

**Business Health:**
- Rolling 30 days: Aug 4 - Sept 3
- Should show full 30 days of data
- Health score calculated on complete month

**Cards:**
- MTD: Sept 1 - Sept 3 (only 3 days)
- Progress: Likely showing <10% of monthly goal
- MTD target line: At ~10% of bar (3/30 days)

**Expected User Question:** "Why is my health score 85/100 but my revenue card shows I'm only at 8% of goal?"

**Answer:** "Business Health shows your performance over the last 30 days (Aug 4-Sept 3), while the Revenue card shows your progress so far this month (Sept 1-3). You're performing well overall, and you're on track for this month."

---

### 6.2 Edge Case: End of Month

**Date: Sept 30, 2025**

**Business Health:**
- Rolling 30 days: Aug 31 - Sept 30
- Includes 1 day from previous month

**Cards:**
- MTD: Sept 1 - Sept 30 (full month)
- Progress: Should match monthly goal exactly if hit target
- MTD target line: At 100% (30/30 days)

**Expected Behavior:**
- Cards and Business Health should be relatively aligned
- Only difference is Aug 31 included in Business Health

---

### 6.3 Edge Case: Major Client Invoice

**Scenario:**
- Large invoice (€10,000) sent on Sept 15
- But actual work was done throughout August

**Business Health (Rolling 30-day billable revenue):**
- Would show gradual revenue accumulation through August
- More stable, reflects when work was performed

**Revenue Card (Invoiced amounts MTD):**
- Shows spike on Sept 15 when invoice was generated
- More volatile, reflects when revenue was recognized

**User Impact:**
- Revenue card jumps dramatically on invoice date
- Business Health shows smooth trend
- Both are correct, just measuring different things

---

### 6.4 Edge Case: Non-Billable Hours

**Scenario:**
- Total hours: 120h
- Billable hours: 100h
- Non-billable hours: 20h (training, admin)
- Revenue: €8,000

**Business Health Rate (billableHours):**
- €8,000 ÷ 100h = €80/h

**Rate Card (CURRENTLY uses total hours):**
- €8,000 ÷ 120h = €66.67/h

**Difference:** 16.7% lower rate shown in card

**After Fix (use billable hours):**
- €8,000 ÷ 100h = €80/h
- ✅ Consistent with Business Health

---

## 7. Implementation Priority

### Phase 1: High Priority (Do First)

1. **Add date range indicators** (5.1)
   - Add "Rolling 30 days" badge to Business Health
   - Add "Month-to-date" badge to cards
   - Show actual date ranges

2. **Fix rate calculation** (5.3)
   - Use billable hours instead of total hours
   - Update card display to show billable hours

3. **Add documentation** (5.6)
   - Inline code comments explaining architecture
   - Update CLAUDE.md with metrics overview

**Estimated Effort:** 2-3 hours

---

### Phase 2: Medium Priority (Do Next)

1. **Align MTD comparison** (5.5)
   - Use invoiced amounts for trend calculation
   - Match what's displayed in Revenue Card

2. **Add tooltips/info modals** (5.1)
   - Explain why numbers differ
   - Educate users on rolling vs MTD

**Estimated Effort:** 2-4 hours

---

### Phase 3: Low Priority (Consider Later)

1. **Revenue source clarification** (5.4)
   - Add labels distinguishing time-based vs invoiced
   - Keep calculations as-is

2. **User testing**
   - Validate that changes improve understanding
   - Gather feedback on date range displays

**Estimated Effort:** 1-2 hours

---

## 8. Conclusion

### Architecture Assessment: ✅ SOUND

The current architecture is **intentionally designed** with different time windows:
- **Business Health**: Rolling 30 days → Long-term trend tracking
- **Metric Cards**: MTD → Monthly goal progress

This dual-window approach is **valid and valuable** because:
1. Different metrics serve different purposes
2. Rolling windows provide fair, stable scoring
3. MTD windows track monthly goal achievement
4. Both views are valuable to users

### Main Issues: 🔧 FIXABLE

1. **Lack of user communication** about time window differences
2. **Rate calculation inconsistency** (total vs billable hours)
3. **MTD comparison using different source** than displayed value

All issues are **cosmetic/consistency** issues, not fundamental architectural flaws.

### Recommended Actions:

**Must Do:**
- Add date range indicators
- Fix rate calculation to use billable hours
- Document the architecture

**Should Do:**
- Align MTD comparison with displayed values
- Add explanatory tooltips

**Optional:**
- Add toggle between rolling/MTD views
- Conduct user testing

### Final Grade: B+ (A with recommended fixes)

The architecture is well-thought-out and serves business needs. With clear user communication about the intentional differences, this will be an excellent dashboard design.

---

## Appendix A: Key Files Reference

| File | Purpose | Lines of Interest |
|------|---------|-------------------|
| `src/lib/health-score-engine.ts` | Business Health calculations | 1-2800 (full file) |
| `src/lib/current-date.ts` | Dev date override | 1-11 |
| `src/components/dashboard/unified-financial-dashboard.tsx` | Dashboard UI | 310-360 (MTD calc)<br>990-1150 (Health)<br>1156-1500 (Cards) |
| `src/app/api/time-entries/stats/route.ts` | Time tracking data | 88-110 (rolling 30)<br>67-74 (MTD) |
| `src/app/api/invoices/dashboard-metrics/route.ts` | Invoice data | - |
| `src/app/api/financial/client-revenue/route.ts` | Client revenue data | - |

---

## Appendix B: Calculation Examples

### Example: Sept 17, 2025 Dashboard

**Setup:**
- Monthly revenue target: €12,000
- Monthly hours target: 160h
- Target rate: €75/h
- Working days: Mon-Fri

**Business Health (Rolling 30 days: Aug 18 - Sept 17):**
- Billable hours: 112h
- Billable revenue (time entries): €8,577.50
- Average rate: €76.58/h
- Distinct working days: 22
- Daily average: 5.09h/day

**Metric Cards (MTD: Sept 1 - Sept 17):**
- Total hours: 95h
- Billable hours: 80h
- Non-billable hours: 15h
- Invoiced revenue: €7,200
- MTD revenue target: €6,804 (12,000 × 17/30)
- MTD hours target: 106.25h (based on 12 working days Sept 1-16)
- Current rate (with fix): €7,200 / 80h = €90/h
- Current rate (before fix): €7,200 / 95h = €75.79/h

**Key Differences:**
1. Time window: 30 days vs 17 days (13-day difference)
2. Revenue source: €8,577.50 (time entries) vs €7,200 (invoices)
3. Rate calculation: €76.58 vs €90 (when fixed) - different due to denominators and sources

---

**End of Report**

Generated: 2025-10-10
Version: 1.0
Status: Ready for review and implementation
