# Business Continuity Risk Refactor Plan

## Overview
This plan covers two major improvements to the health score risk metrics:

1. **Replace Business Continuity Risk** (based on subscription users) with three stability-focused sub-metrics that compare current rolling 30-day performance against the previous 30-day period
2. **Migrate all sibling risk metrics** (Client Concentration Risk, Daily Consistency Risk) from MTD to rolling 30-day windows for consistency

**Goal:** Ensure all risk metrics at the same level use consistent rolling 30-day windows, eliminating calendar edge cases and providing fair, continuous monitoring.

## Current State

### Business Continuity Risk (Parent - 8 points max)
**Location:** `/src/lib/health-score-engine.ts` line 715-717
**Current Logic:**
```typescript
const subscriptionRisk = roundToOneDecimal(timeStats.subscription ?
  (timeStats.subscription.monthlyActiveUsers?.current || 0) < 5 ? 8 : 0 : 5.0)
```
- Time-only business: 5 points penalty
- Hybrid with <5 users: 8 points penalty
- Hybrid with ≥5 users: 0 points penalty

**Problem:** Penalizes time-based businesses unfairly. Doesn't measure actual business stability.

### Sibling Metrics (Same Level - ALSO NEED ROLLING 30-DAY UPDATES)
1. **Client Concentration Risk** (9 points max) - Line 698-712
   - ⚠️ Currently uses MTD or 3-month data - NEEDS rolling 30-day windows
2. **Daily Consistency Risk** (8 points max) - Line 718-747
   - ⚠️ Currently uses MTD data - NEEDS rolling 30-day windows

**Important:** All three risk metrics at this level should use consistent rolling 30-day windows for fair comparison.

## New Requirements

### Replace Business Continuity Risk with 3 Sub-Metrics

**Total Points:** 8 (same as current)
**Distribution:** ~2.67 points each (adjust to 2.5/2.5/3 or similar)
**Time Window:** Rolling 30-day periods (last 30 days vs days 31-60)

#### 1. Revenue Stream Stability (2.5-3 points)
**Measures:** Rolling 30-day billable revenue trend
**Calculation:**
- Current period: Last 30 days billable revenue (from billable hours × rates)
- Previous period: Days 31-60 billable revenue (30 days before the current period)
- Compare: `currentPeriod / previousPeriod`
- Score: Penalty increases with negative trends

**Scoring Scale:**
- ≥100% growth: 0 penalty (full points)
- 90-100%: Small penalty
- 80-90%: Moderate penalty
- <80%: High penalty

#### 2. Client Concentration Trend (2.5-3 points)
**Measures:** Rolling 30-day client concentration stability
**Calculation:**
- Current period: Last 30 days top client revenue share (%)
- Previous period: Days 31-60 top client revenue share (%)
- Compare trend: Is concentration increasing or decreasing?
- Score: Penalty increases if concentration is worsening

**Scoring Scale:**
- Concentration decreasing (diversifying): 0 penalty
- Stable (±5%): Small penalty
- Increasing moderately (5-10%): Moderate penalty
- Increasing significantly (>10%): High penalty

#### 3. Daily Consistency Trend (2.5-3 points)
**Measures:** Rolling 30-day daily consistency
**Calculation:**
- Current period: Last 30 days hours/day and days/week metrics
- Previous period: Days 31-60 same metrics
- Compare trend: Is consistency improving or deteriorating?
- Score: Penalty increases with deteriorating consistency

**Scoring Scale:**
- Improving consistency: 0 penalty
- Stable (±10%): Small penalty
- Deteriorating moderately (10-20%): Moderate penalty
- Deteriorating significantly (>20%): High penalty

### Update Sibling Metrics to Rolling 30-Day Windows

#### Client Concentration Risk (9 points max)
**Current Issue:** Uses MTD or 3-month data
**New Approach:** Use rolling 30-day windows for consistency

**Updated Calculation:**
- Current period: Last 30 days top client revenue share
- Previous period: Days 31-60 top client revenue share (for trend comparison)
- Score based on absolute concentration level (not just trend)

**Note:** This metric measures absolute concentration risk, while "Client Concentration Trend" (child of Business Continuity) measures the trend direction.

#### Daily Consistency Risk (8 points max)
**Current Issue:** Uses MTD data
**New Approach:** Use rolling 30-day windows for consistency

**Updated Calculation:**
- Current period: Last 30 days daily hours consistency metrics
- Compare against targets (not previous period for this metric)
- Measures absolute deviation from target daily hours

**Note:** This metric measures absolute consistency, while "Daily Consistency Trend" (child of Business Continuity) measures the trend direction.

## Implementation Steps

### Step 1: Data Requirements

#### 1.1 API Changes - Time Stats (`/api/time-entries/stats`)
**File:** `/src/app/api/time-entries/stats/route.ts`

**Add Rolling 30-Day Data:**
```typescript
// Calculate rolling 30-day periods
const now = new Date()
const last30DaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
const previous30DaysStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
const previous30DaysEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

// Query current 30-day period entries
const { data: current30DaysEntries } = await supabaseAdmin
  .from('time_entries')
  .select('hours, hourly_rate, effective_hourly_rate, billable, entry_date')
  .eq('tenant_id', profile.tenant_id)
  .gte('entry_date', last30DaysStart.toISOString().split('T')[0])
  .lte('entry_date', now.toISOString().split('T')[0])

// Query previous 30-day period entries (days 31-60)
const { data: previous30DaysEntries } = await supabaseAdmin
  .from('time_entries')
  .select('hours, hourly_rate, effective_hourly_rate, billable, entry_date')
  .eq('tenant_id', profile.tenant_id)
  .gte('entry_date', previous30DaysStart.toISOString().split('T')[0])
  .lt('entry_date', previous30DaysEnd.toISOString().split('T')[0])

// Calculate current period metrics
const current30DaysBillableRevenue = current30DaysEntries
  ?.filter(e => e.billable !== false)
  .reduce((sum, e) => sum + (e.hours * (e.effective_hourly_rate || e.hourly_rate || 0)), 0) || 0

const current30DaysDistinctWorkingDays = new Set(
  current30DaysEntries?.map(e => e.entry_date) || []
).size

const current30DaysHours = current30DaysEntries?.reduce((sum, e) => sum + e.hours, 0) || 0
const current30DaysDailyHours = current30DaysDistinctWorkingDays > 0
  ? current30DaysHours / current30DaysDistinctWorkingDays
  : 0

// Calculate previous period metrics
const previous30DaysBillableRevenue = previous30DaysEntries
  ?.filter(e => e.billable !== false)
  .reduce((sum, e) => sum + (e.hours * (e.effective_hourly_rate || e.hourly_rate || 0)), 0) || 0

const previous30DaysDistinctWorkingDays = new Set(
  previous30DaysEntries?.map(e => e.entry_date) || []
).size

const previous30DaysHours = previous30DaysEntries?.reduce((sum, e) => sum + e.hours, 0) || 0
const previous30DaysDailyHours = previous30DaysDistinctWorkingDays > 0
  ? previous30DaysHours / previous30DaysDistinctWorkingDays
  : 0
```

**Add to Response:**
```typescript
rolling30Days: {
  current: {
    billableRevenue: Math.round(current30DaysBillableRevenue * 100) / 100,
    distinctWorkingDays: current30DaysDistinctWorkingDays,
    totalHours: Math.round(current30DaysHours * 10) / 10,
    dailyHours: Math.round(current30DaysDailyHours * 10) / 10
  },
  previous: {
    billableRevenue: Math.round(previous30DaysBillableRevenue * 100) / 100,
    distinctWorkingDays: previous30DaysDistinctWorkingDays,
    totalHours: Math.round(previous30DaysHours * 10) / 10,
    dailyHours: Math.round(previous30DaysDailyHours * 10) / 10
  }
}
```

#### 1.2 API Changes - Client Revenue (`/api/financial/client-revenue`)
**File:** `/src/app/api/financial/client-revenue/route.ts`

**Add Rolling 30-Day Data:**
```typescript
const now = new Date()
const last30DaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
const previous30DaysStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
const previous30DaysEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

// Query current 30-day period client revenue
const current30DaysQuery = /* query with date range: last30DaysStart to now */

// Query previous 30-day period client revenue (days 31-60)
const previous30DaysQuery = /* query with date range: previous30DaysStart to previous30DaysEnd */

// Calculate top client share for both periods
const current30DaysTopClientShare = /* calculate from current data */
const previous30DaysTopClientShare = /* calculate from previous data */
```

**Add to Response:**
```typescript
rolling30DaysComparison: {
  current: {
    topClientShare: current30DaysTopClientShare,
    totalRevenue: current30DaysTotalRevenue
  },
  previous: {
    topClientShare: previous30DaysTopClientShare,
    totalRevenue: previous30DaysTotalRevenue
  }
}
```

### Step 2: Type Definitions

#### 2.1 Update HealthScoreInputs
**File:** `/src/lib/health-score-engine.ts` (lines 28-35)

**Add new rolling window data:**
```typescript
timeStats: {
  // ... existing fields ...
  rolling30Days?: {
    current: {
      billableRevenue: number
      distinctWorkingDays: number
      totalHours: number
      dailyHours: number
    }
    previous: {
      billableRevenue: number
      distinctWorkingDays: number
      totalHours: number
      dailyHours: number
    }
  }
}
```

#### 2.2 Add to `clientRevenue`
**File:** `/src/lib/health-score-engine.ts` (lines 63-68)

```typescript
clientRevenue?: {
  topClient?: {
    name: string
    revenueShare: number
  }
  rolling30DaysComparison?: {
    current: {
      topClientShare: number
      totalRevenue: number
    }
    previous: {
      topClientShare: number
      totalRevenue: number
    }
  }
}
```

### Step 3: Risk Score Calculator Refactor

#### 3.1 Replace Business Continuity Risk Logic
**File:** `/src/lib/health-score-engine.ts` (lines 715-717)

**Remove:**
```typescript
const subscriptionRisk = roundToOneDecimal(timeStats.subscription ?
  (timeStats.subscription.monthlyActiveUsers?.current || 0) < 5 ? 8 : 0 : 5.0)
```

**Add:**
```typescript
// Business continuity risk - 8 pts max (32% of 25)
// Split into 3 sub-metrics: Revenue Stability (3pts), Client Trend (2.5pts), Consistency Trend (2.5pts)

// 1. Revenue Stream Stability (3 points)
const current30DaysBillableRevenue = timeStats.rolling30Days?.current?.billableRevenue || 0
const previous30DaysBillableRevenue = timeStats.rolling30Days?.previous?.billableRevenue || 0

let revenueStabilityRisk = 0
if (previous30DaysBillableRevenue > 0) {
  const revenueGrowth = current30DaysBillableRevenue / previous30DaysBillableRevenue
  if (revenueGrowth >= 1.0) {
    revenueStabilityRisk = 0 // No risk - growing
  } else if (revenueGrowth >= 0.9) {
    revenueStabilityRisk = 0.5 // Slight decline
  } else if (revenueGrowth >= 0.8) {
    revenueStabilityRisk = 1.5 // Moderate decline
  } else {
    revenueStabilityRisk = 3 // Significant decline
  }
} else {
  revenueStabilityRisk = 1.5 // No baseline - moderate risk
}

// 2. Client Concentration Trend (2.5 points)
const current30DaysClientShare = clientRevenue?.rolling30DaysComparison?.current?.topClientShare || 0
const previous30DaysClientShare = clientRevenue?.rolling30DaysComparison?.previous?.topClientShare || 0

let clientConcentrationTrendRisk = 0
if (previous30DaysClientShare > 0) {
  const concentrationChange = current30DaysClientShare - previous30DaysClientShare
  if (concentrationChange <= 0) {
    clientConcentrationTrendRisk = 0 // Diversifying - good
  } else if (concentrationChange <= 5) {
    clientConcentrationTrendRisk = 0.5 // Slight increase
  } else if (concentrationChange <= 10) {
    clientConcentrationTrendRisk = 1.25 // Moderate increase
  } else {
    clientConcentrationTrendRisk = 2.5 // High increase
  }
} else {
  clientConcentrationTrendRisk = 0.5 // No baseline - slight risk
}

// 3. Daily Consistency Trend (2.5 points)
const current30DaysDailyHours = timeStats.rolling30Days?.current?.dailyHours || 0
const previous30DaysDailyHours = timeStats.rolling30Days?.previous?.dailyHours || 0

let consistencyTrendRisk = 0
if (previous30DaysDailyHours > 0 && targetDailyHours > 0) {
  const currentDeviation = Math.abs(current30DaysDailyHours - targetDailyHours) / targetDailyHours
  const previousDeviation = Math.abs(previous30DaysDailyHours - targetDailyHours) / targetDailyHours
  const deviationChange = currentDeviation - previousDeviation

  if (deviationChange <= 0) {
    consistencyTrendRisk = 0 // Improving
  } else if (deviationChange <= 0.1) {
    consistencyTrendRisk = 0.5 // Slight deterioration
  } else if (deviationChange <= 0.2) {
    consistencyTrendRisk = 1.25 // Moderate deterioration
  } else {
    consistencyTrendRisk = 2.5 // Significant deterioration
  }
} else {
  consistencyTrendRisk = 0.5 // No baseline - slight risk
}

const businessContinuityRisk = roundToOneDecimal(
  revenueStabilityRisk + clientConcentrationTrendRisk + consistencyTrendRisk
)
```

#### 3.2 Update Breakdown Object
**File:** `/src/lib/health-score-engine.ts` (line 757-775)

**Replace `subscriptionRisk` with:**
```typescript
breakdown: {
  penalties: {
    clientRisk,
    businessContinuityRisk, // Renamed from subscriptionRisk
    dailyConsistencyRisk,
    daysRisk,
    hoursRisk
  },
  // ... existing fields ...
  // Add new breakdown fields
  businessContinuityBreakdown: {
    revenueStabilityRisk,
    clientConcentrationTrendRisk,
    consistencyTrendRisk,
    current30DaysBillableRevenue,
    previous30DaysBillableRevenue,
    current30DaysClientShare,
    previous30DaysClientShare,
    current30DaysDailyHours,
    previous30DaysDailyHours
  }
}
```

### Step 4: Update Sibling Risk Metrics to Rolling 30-Day

#### 4.1 Update Client Concentration Risk Logic
**File:** `/src/lib/health-score-engine.ts` (lines 698-712)

**Current Logic (to be updated):**
- Currently uses `topClientShare` from MTD or 3-month data
- Needs to use rolling 30-day window data

**Updated Logic:**
```typescript
// Client Concentration Risk - 9 pts max (36% of 25)
// Use rolling 30-day data for consistency with other metrics
const topClientShare = clientRevenue?.rolling30DaysComparison?.current?.topClientShare || 0

let clientRisk = 0
if (topClientShare >= 80) {
  clientRisk = 9 // Very high concentration
} else if (topClientShare >= 60) {
  clientRisk = 6 // High concentration
} else if (topClientShare >= 40) {
  clientRisk = 3 // Moderate concentration
} else {
  clientRisk = 0 // Diversified
}
clientRisk = roundToOneDecimal(clientRisk)
```

**Key Change:** Use `rolling30DaysComparison.current.topClientShare` instead of MTD data.

#### 4.2 Update Daily Consistency Risk Logic
**File:** `/src/lib/health-score-engine.ts` (lines 718-747)

**Current Logic (to be updated):**
- Currently uses `actualDailyHours` from MTD data
- Needs to use rolling 30-day window data

**Updated Logic:**
```typescript
// Daily Consistency Risk - 8 pts max (32% of 25)
// Use rolling 30-day data for consistency
const actualDailyHours = timeStats.rolling30Days?.current?.dailyHours || 0
const targetDailyHours = profitTargets?.target_daily_hours || 8

let dailyConsistencyRisk = 0
if (targetDailyHours > 0 && actualDailyHours > 0) {
  const deviation = Math.abs(actualDailyHours - targetDailyHours) / targetDailyHours

  if (deviation <= 0.1) {
    dailyConsistencyRisk = 0 // Within 10% - excellent
  } else if (deviation <= 0.2) {
    dailyConsistencyRisk = 2 // Within 20% - moderate
  } else if (deviation <= 0.3) {
    dailyConsistencyRisk = 5 // Within 30% - concerning
  } else {
    dailyConsistencyRisk = 8 // Over 30% - high risk
  }
} else {
  dailyConsistencyRisk = 4 // No data - moderate penalty
}
dailyConsistencyRisk = roundToOneDecimal(dailyConsistencyRisk)
```

**Key Changes:**
- Use `rolling30Days.current.dailyHours` instead of MTD `distinctWorkingDays`
- Simplified logic to focus on absolute deviation from target

#### 4.3 Update Days per Week Risk (if applicable)
**File:** `/src/lib/health-score-engine.ts`

**Current Logic (to be verified):**
- May use MTD working days data
- Should use rolling 30-day average

**Updated Logic:**
```typescript
// Days per Week Risk - use rolling 30-day average
const actualWorkingDaysPerWeek = timeStats.rolling30Days?.current?.distinctWorkingDays
  ? (timeStats.rolling30Days.current.distinctWorkingDays / 4.29) // ~30 days = 4.29 weeks
  : 0

const targetDaysPerWeek = profitTargets?.target_days_per_week || 5

// Rest of logic remains similar, just uses rolling 30-day average
```

### Step 5: Organogram Updates

#### 5.1 Update Client Concentration Risk Node
**File:** `/src/components/dashboard/organogram/HealthScoreOrganogram.tsx`

**Update description to reflect rolling 30-day data:**
```typescript
{
  id: 'client_concentration_risk',
  name: 'Client Concentration Risk',
  score: Math.max(0, 9 - (clientRisk || 0)),
  maxScore: 9,
  contribution: 36, // 36% of Risk category
  level: 1,
  description: `Top client: ${topClientShare.toFixed(1)}% of revenue (rolling 30 days)`,
  calculationValue: `${topClientShare.toFixed(1)}% concentration`,
  calculationDescription: `Client concentration (30-day): ${topClientShare.toFixed(1)}% → ${Math.max(0, 9 - (clientRisk || 0)).toFixed(1)}/9 pts`,
  isCalculationDriver: true,
  metricId: 'client_concentration_risk'
}
```

#### 5.2 Update Daily Consistency Risk Node
**File:** `/src/components/dashboard/organogram/HealthScoreOrganogram.tsx`

**Update description to reflect rolling 30-day data:**
```typescript
{
  id: 'daily_consistency_risk',
  name: 'Daily Consistency Risk',
  score: Math.max(0, 8 - (dailyConsistencyRisk || 0)),
  maxScore: 8,
  contribution: 32, // 32% of Risk category
  level: 1,
  description: `${actualDailyHours.toFixed(1)}h/day vs ${targetDailyHours}h target (rolling 30 days)`,
  calculationValue: `${((Math.abs(actualDailyHours - targetDailyHours) / targetDailyHours) * 100).toFixed(1)}% deviation`,
  calculationDescription: `Daily consistency (30-day): ${actualDailyHours.toFixed(1)}h vs ${targetDailyHours}h → ${Math.max(0, 8 - (dailyConsistencyRisk || 0)).toFixed(1)}/8 pts`,
  isCalculationDriver: true,
  metricId: 'daily_consistency_risk'
}
```

#### 5.3 Update Business Continuity Risk Node
**File:** `/src/components/dashboard/organogram/HealthScoreOrganogram.tsx` (lines 794-811)

**Replace with:**
```typescript
{
  id: 'business_continuity_risk',
  name: 'Business Continuity Risk',
  score: Math.max(0, 8 - (businessContinuityRisk || 0)),
  maxScore: 8,
  contribution: 32, // 32% of Risk category
  level: 1,
  description: 'Revenue and stability trend analysis (rolling 30 days)',
  calculationValue: `${businessContinuityRisk.toFixed(1)} penalty`,
  calculationDescription: `Business trends (30-day): ${businessContinuityRisk.toFixed(1)} penalty → ${Math.max(0, 8 - (businessContinuityRisk || 0)).toFixed(1)}/8 pts`,
  isCalculationDriver: true,
  metricId: 'business_continuity_risk',
  hasDetailedBreakdown: true,
  children: [
    {
      id: 'revenue_stability_risk',
      name: 'Revenue Stream Stability',
      score: Math.max(0, 3 - (revenueStabilityRisk || 0)),
      maxScore: 3,
      contribution: 37.5, // 37.5% of Business Continuity
      level: 2,
      description: `${current30DaysBillableRevenue > previous30DaysBillableRevenue ? 'Growing' : 'Declining'} (rolling 30 days)`,
      calculationValue: `${((current30DaysBillableRevenue / Math.max(previous30DaysBillableRevenue, 1)) * 100).toFixed(1)}% vs prev 30d`,
      calculationDescription: `Revenue trend: €${current30DaysBillableRevenue.toFixed(0)} vs €${previous30DaysBillableRevenue.toFixed(0)} (prev 30d) → ${Math.max(0, 3 - (revenueStabilityRisk || 0)).toFixed(1)}/3 pts`,
      isCalculationDriver: true,
      metricId: 'revenue_stability_risk'
    },
    {
      id: 'client_concentration_trend_risk',
      name: 'Client Concentration Trend',
      score: Math.max(0, 2.5 - (clientConcentrationTrendRisk || 0)),
      maxScore: 2.5,
      contribution: 31.25, // 31.25% of Business Continuity
      level: 2,
      description: `${current30DaysClientShare > previous30DaysClientShare ? 'Concentrating' : 'Diversifying'} (rolling 30 days)`,
      calculationValue: `${current30DaysClientShare.toFixed(1)}% (was ${previous30DaysClientShare.toFixed(1)}%)`,
      calculationDescription: `Client trend: ${current30DaysClientShare.toFixed(1)}% vs ${previous30DaysClientShare.toFixed(1)}% (prev 30d) → ${Math.max(0, 2.5 - (clientConcentrationTrendRisk || 0)).toFixed(1)}/2.5 pts`,
      isCalculationDriver: true,
      metricId: 'client_concentration_trend_risk'
    },
    {
      id: 'consistency_trend_risk',
      name: 'Daily Consistency Trend',
      score: Math.max(0, 2.5 - (consistencyTrendRisk || 0)),
      maxScore: 2.5,
      contribution: 31.25, // 31.25% of Business Continuity
      level: 2,
      description: `${current30DaysDailyHours > previous30DaysDailyHours ? 'Improving' : 'Deteriorating'} (rolling 30 days)`,
      calculationValue: `${current30DaysDailyHours.toFixed(1)}h/day (was ${previous30DaysDailyHours.toFixed(1)}h)`,
      calculationDescription: `Consistency trend: ${current30DaysDailyHours.toFixed(1)}h vs ${previous30DaysDailyHours.toFixed(1)}h (prev 30d) → ${Math.max(0, 2.5 - (consistencyTrendRisk || 0)).toFixed(1)}/2.5 pts`,
      isCalculationDriver: true,
      metricId: 'consistency_trend_risk'
    }
  ]
}
```

### Step 5: Calculation Detail Modal Updates

#### 5.1 Add New Metric Scoring Scales
**File:** `/src/components/dashboard/calculation-detail-modal.tsx`

**Add after `business_continuity_risk` section (after line 515):**

```typescript
) : metricId === 'revenue_stability_risk' ? (
  <div className="space-y-2">
    <div className="text-xs font-medium mb-2 text-muted-foreground">
      Compares current 30 days billable revenue vs previous 30 days (days 31-60)
    </div>
    <div className="flex justify-between text-xs">
      <span>≥100% of previous 30 days</span>
      <span className="text-green-600 font-medium">3/3 points (Growing)</span>
    </div>
    <div className="flex justify-between text-xs">
      <span>90-100% of previous 30 days</span>
      <span className="text-blue-600 font-medium">2.5/3 points (Stable)</span>
    </div>
    <div className="flex justify-between text-xs">
      <span>80-90% of previous 30 days</span>
      <span className="text-yellow-600 font-medium">1.5/3 points (Declining)</span>
    </div>
    <div className="flex justify-between text-xs">
      <span>&lt;80% of previous 30 days</span>
      <span className="text-red-600 font-medium">0/3 points (High Risk)</span>
    </div>
  </div>
) : metricId === 'client_concentration_trend_risk' ? (
  <div className="space-y-2">
    <div className="text-xs font-medium mb-2 text-muted-foreground">
      Tracks if client concentration is improving or worsening (rolling 30 days)
    </div>
    <div className="flex justify-between text-xs">
      <span>Decreasing concentration (diversifying)</span>
      <span className="text-green-600 font-medium">2.5/2.5 points (Low Risk)</span>
    </div>
    <div className="flex justify-between text-xs">
      <span>Stable (±5% change)</span>
      <span className="text-blue-600 font-medium">2/2.5 points (Moderate)</span>
    </div>
    <div className="flex justify-between text-xs">
      <span>Increasing 5-10%</span>
      <span className="text-yellow-600 font-medium">1.25/2.5 points (Warning)</span>
    </div>
    <div className="flex justify-between text-xs">
      <span>Increasing &gt;10%</span>
      <span className="text-red-600 font-medium">0/2.5 points (High Risk)</span>
    </div>
  </div>
) : metricId === 'consistency_trend_risk' ? (
  <div className="space-y-2">
    <div className="text-xs font-medium mb-2 text-muted-foreground">
      Compares current 30 days daily hours consistency vs previous 30 days (days 31-60)
    </div>
    <div className="flex justify-between text-xs">
      <span>Improving (closer to target)</span>
      <span className="text-green-600 font-medium">2.5/2.5 points (Low Risk)</span>
    </div>
    <div className="flex justify-between text-xs">
      <span>Stable (±10% change)</span>
      <span className="text-blue-600 font-medium">2/2.5 points (Moderate)</span>
    </div>
    <div className="flex justify-between text-xs">
      <span>Deteriorating 10-20%</span>
      <span className="text-yellow-600 font-medium">1.25/2.5 points (Warning)</span>
    </div>
    <div className="flex justify-between text-xs">
      <span>Deteriorating &gt;20%</span>
      <span className="text-red-600 font-medium">0/2.5 points (High Risk)</span>
    </div>
  </div>
```

### Step 6: Data Flow Updates

#### 6.1 Unified Financial Dashboard
**File:** `/src/components/dashboard/unified-financial-dashboard.tsx`

**Update fetch (around line 502-517):**
```typescript
const [dashboardResponse, timeResponse, todayResponse, revenueTrendResponse, clientRevenueResponse] = await Promise.all([
  fetch('/api/invoices/dashboard-metrics'),
  fetch('/api/time-entries/stats'),
  fetch('/api/time-entries/today'),
  fetch('/api/financial/revenue-trend'),
  fetch('/api/financial/client-revenue')
])

// ... existing code ...

// Pass rolling 30-day comparison data to health score inputs
const clientRevenueData = clientRevenueResponse.ok ? await clientRevenueResponse.json() : null

setClientRevenue({
  topClient: clientRevenueData?.data?.summary?.topClient ? {
    name: clientRevenueData.data.summary.topClient.name,
    revenueShare: clientRevenueData.data.summary.topClient.percentage
  } : undefined,
  rolling30DaysComparison: clientRevenueData?.data?.rolling30DaysComparison // NEW
})
```

## Testing Plan

### Unit Tests
1. **Rolling 30-Day Calculations**
   - Test rolling 30-day window calculation logic (current vs previous periods)
   - Test date boundary handling (30 days vs 31-60 days)
   - Test edge cases (first 30 days, no previous data, insufficient data)

2. **Business Continuity Risk Sub-Metrics**
   - Test Revenue Stability Risk penalty calculations
   - Test Client Concentration Trend Risk penalty calculations
   - Test Daily Consistency Trend Risk penalty calculations
   - Test combined businessContinuityRisk calculation

3. **Updated Sibling Metrics**
   - Test Client Concentration Risk with rolling 30-day data
   - Test Daily Consistency Risk with rolling 30-day data
   - Verify all three metrics use same data source (rolling30Days)

### Integration Tests
1. **API Layer**
   - Verify `/api/time-entries/stats` returns rolling30Days structure
   - Verify `/api/financial/client-revenue` returns rolling30DaysComparison
   - Test data consistency between current and previous periods

2. **Health Score Engine**
   - Test health score calculation with new Business Continuity Risk logic
   - Test health score with updated Client Concentration Risk
   - Test health score with updated Daily Consistency Risk
   - Verify total risk score remains balanced (max 25 points)

3. **UI Components**
   - Verify organogram displays all updated metrics with rolling 30-day labels
   - Test calculation detail modal for all three risk metrics
   - Verify breakdown data is correctly passed to UI

### E2E Tests (Playwright MCP)
1. Navigate to risk management organogram
2. Verify all three sibling metrics show "(rolling 30 days)" in descriptions
3. Click on Business Continuity Risk → verify 3 sub-metrics displayed
4. Click on Client Concentration Risk → verify rolling 30-day data shown
5. Click on Daily Consistency Risk → verify rolling 30-day data shown
6. Open calculation details modal for each metric → verify correct scoring scales

## Advantages of Rolling 30-Day Approach

### Technical Benefits
- **No Calendar Edge Cases**: No issues with months of different lengths (28-31 days)
- **Consistent Window Size**: Always comparing equal time periods (30 days vs 30 days)
- **Simpler Date Logic**: No need to handle "same day of previous month" edge cases
- **Smoother Trends**: Less affected by calendar artifacts like month-end spikes
- **Single Data Source**: All three risk metrics use the same `rolling30Days` data structure

### Business Benefits
- **Real-time Insights**: Trends update daily, not just at month boundaries
- **Fair Comparisons**: Equal sample sizes eliminate seasonal month-length bias
- **Better for Non-Calendar Businesses**: Works well for businesses that don't align with calendar months
- **Continuous Monitoring**: No "dead zones" at start of month with limited data
- **Metric Consistency**: All risk metrics at the same level use identical time windows

### Consistency Benefits (All Three Risk Metrics)
- **Unified Time Frame**: Client Concentration, Daily Consistency, and Business Continuity all use rolling 30-day windows
- **Comparable Results**: Metrics can be directly compared since they use the same time period
- **Simplified Logic**: One date calculation shared across all three metrics
- **Easier Debugging**: Consistent data structure makes testing and troubleshooting simpler
- **Better UX**: Users see consistent "(rolling 30 days)" labels across all metrics

## Migration Notes

### Breaking Changes

#### Business Continuity Risk
- `subscriptionRisk` renamed to `businessContinuityRisk`
- Business Continuity Risk logic completely changed (subscription → 3 sub-metrics)
- New sub-metrics introduced: Revenue Stability, Client Concentration Trend, Daily Consistency Trend
- Changed from subscription-based logic to rolling 30-day trend analysis

#### Sibling Risk Metrics (Client Concentration & Daily Consistency)
- Client Concentration Risk: Changed from MTD/3-month to rolling 30-day windows
- Daily Consistency Risk: Changed from MTD to rolling 30-day windows
- Both metrics now use `rolling30Days` data structure instead of MTD calculations

#### Data Structure Changes
- Time stats API: Added `rolling30Days` field with `current` and `previous` periods
- Client revenue API: Added `rolling30DaysComparison` field
- All MTD-based calculations replaced with rolling 30-day logic

### Backward Compatibility
- Organogram structure maintains same point distribution (Client: 9pts, Business Continuity: 8pts, Daily Consistency: 8pts)
- API responses are additive (new `rolling30Days` fields, existing MTD fields can remain for transition period)
- Health score total remains 100 points
- Existing dashboard components will work with updated data (graceful degradation if data missing)

## Rollout Steps

1. ✅ Create this plan document
2. 🔧 Implement API changes (time stats + client revenue) with rolling 30-day windows
3. 🔧 Update type definitions for rolling30Days structure
4. 🔧 Refactor Business Continuity Risk calculator (new 3 sub-metrics)
5. 🔧 Update Client Concentration Risk to use rolling 30-day data
6. 🔧 Update Daily Consistency Risk to use rolling 30-day data
7. 🔧 Update organogram for all three risk metrics
8. 🔧 Update calculation detail modal with new scoring scales
9. 🔧 Update data flow in unified dashboard
10. ✅ Write tests for all updated metrics
11. ✅ QA testing (verify rolling 30-day consistency)
12. 🚀 Deploy

## Success Criteria

### Business Continuity Risk (New Implementation)
- [ ] Business Continuity Risk shows 3 sub-metrics in organogram
- [ ] All sub-metrics compare rolling 30-day windows (current vs previous)
- [ ] Calculation details modal shows correct scoring scales for all 3 sub-metrics
- [ ] Time-based businesses no longer unfairly penalized
- [ ] Subscription metrics completely removed from risk calculation

### Sibling Metrics (Updated to Rolling 30-Day)
- [ ] Client Concentration Risk uses rolling 30-day data (not MTD/3-month)
- [ ] Daily Consistency Risk uses rolling 30-day data (not MTD)
- [ ] All three risk metrics consistently show "(rolling 30 days)" in descriptions
- [ ] Organogram displays updated calculation descriptions for all metrics

### Data & Technical
- [ ] API returns rolling30Days structure with current/previous periods
- [ ] No errors when insufficient historical data exists (graceful handling)
- [ ] Consistent 30-day comparison windows (no calendar edge cases)
- [ ] All tests pass for updated metrics and new calculations
