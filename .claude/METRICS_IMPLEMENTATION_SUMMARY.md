# Metrics Implementation Summary

**Date:** 2025-10-12
**Development Date:** September 17, 2025

## Changes Implemented

### 1. API Changes (`src/app/api/time-entries/stats/route.ts`)

#### Added Previous Month MTD Query
```typescript
// Query previous month MTD (same day range as current month for comparison)
// Example: If today is Sept 17, query Aug 1-17 (not full August)
const currentDay = now.getDate()
const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
const previousMonthMTDEnd = new Date(now.getFullYear(), now.getMonth() - 1, Math.min(currentDay, new Date(now.getFullYear(), now.getMonth(), 0).getDate()))
previousMonthMTDEnd.setHours(23, 59, 59, 999)
```

#### Added Billable Revenue Calculation
```typescript
// Calculate billable revenue for this month (time-based revenue from billable entries)
const thisMonthBillableRevenue = thisMonthEntries
  ?.filter(entry => entry.billable === true || entry.billable === null)
  .reduce((sum, entry) => {
    const effectiveRate = entry.effective_hourly_rate || entry.hourly_rate || 0
    return sum + (entry.hours * effectiveRate)
  }, 0) || 0
```

#### Added Previous Month MTD Stats
```typescript
const previousMonthMTDHours = previousMonthMTDEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0
const previousMonthMTDBillableHours = previousMonthMTDEntries?.filter(entry => entry.billable === true || entry.billable === null)
  .reduce((sum, entry) => sum + entry.hours, 0) || 0
const previousMonthMTDBillableRevenue = previousMonthMTDEntries
  ?.filter(entry => entry.billable === true || entry.billable === null)
  .reduce((sum, entry) => {
    const effectiveRate = entry.effective_hourly_rate || entry.hourly_rate || 0
    return sum + (entry.hours * effectiveRate)
  }, 0) || 0
```

#### Updated Response Object
```typescript
thisMonth: {
  hours: Math.round(thisMonthHours * 10) / 10,
  revenue: Math.round(thisMonthRevenue * 100) / 100,
  billableHours: Math.round(thisMonthBillableHours * 10) / 10,
  billableRevenue: Math.round(thisMonthBillableRevenue * 100) / 100,  // NEW
  nonBillableHours: Math.round(thisMonthNonBillableHours * 10) / 10,
  distinctWorkingDays
},
previousMonthMTD: {  // NEW
  hours: Math.round(previousMonthMTDHours * 10) / 10,
  billableHours: Math.round(previousMonthMTDBillableHours * 10) / 10,
  billableRevenue: Math.round(previousMonthMTDBillableRevenue * 100) / 100
}
```

---

### 2. Dashboard Changes (`src/components/dashboard/unified-financial-dashboard.tsx`)

#### Updated MTD Comparison Calculation
**BEFORE (used invoiced amounts):**
```typescript
const currentMonthTimeRevenue = (timeStats.thisMonth.hours || 0) * (timeStats.thisMonth.rate || 0)
const previousMonthTimeRevenue = (timeStats.lastMonth.hours || 0) * (timeStats.lastMonth.rate || 0)
const previousMTD = (previousMonthTimeRevenue + previousMonthSubscriptionRevenue) * mtdRatio
```

**AFTER (uses time-based billable revenue with actual MTD comparison):**
```typescript
// Current month MTD: billable time revenue from time entries + MRR
const currentMonthBillableRevenue = timeStats.thisMonth.billableRevenue || 0
const currentMonthSubscriptionRevenue = (timeStats?.subscription?.monthlyActiveUsers?.current || 0) * (timeStats?.subscription?.averageSubscriptionFee?.current || 0)
const currentMTD = currentMonthBillableRevenue + currentMonthSubscriptionRevenue

// Previous month MTD (same day range): billable time revenue from time entries + MRR
const previousMonthBillableRevenue = timeStats.previousMonthMTD.billableRevenue || 0
const previousMonthSubscriptionRevenue = (timeStats?.subscription?.monthlyActiveUsers?.previous || 0) * (timeStats?.subscription?.averageSubscriptionFee?.previous || 0)
const previousMTD = previousMonthBillableRevenue + previousMonthSubscriptionRevenue
```

#### Updated Rate Comparison Calculation
**BEFORE (used total hours):**
```typescript
const currentRate = timeStats.thisMonth.hours > 0 ?
  (dashboardMetrics?.totale_registratie || 0) / timeStats.thisMonth.hours : 0
```

**AFTER (uses billable hours only):**
```typescript
const currentRate = timeStats.thisMonth.billableHours > 0 ?
  (timeStats.thisMonth.billableRevenue || 0) / timeStats.thisMonth.billableHours : 0
```

#### Updated Revenue Card
**BEFORE (used invoiced amounts):**
```typescript
{formatCurrency(Math.round((dashboardMetrics?.totale_registratie || 0) + subscriptionRevenue))}
```

**AFTER (uses time-based billable revenue):**
```typescript
{formatCurrency(Math.round((timeStats?.thisMonth?.billableRevenue || 0) + subscriptionRevenue))}
```

**Changed Label:**
- "Invoiced" → "Time-based"

#### Updated Billable Hours Card
**BEFORE (used total hours):**
```typescript
<span>This month</span>
<span>total</span>
{formatHours(timeStats?.thisMonth.hours || 0)}
```

**AFTER (uses billable hours only):**
```typescript
<span>Billable</span>
<span>hours MTD</span>
{formatHours(timeStats?.thisMonth.billableHours || 0)}
```

**Changed Bottom Stats:**
- "This Week" → "Non-billable"
- Shows `thisMonth.nonBillableHours` instead of `thisWeek.hours`

#### Updated Average Rate Card
**BEFORE (used total hours and invoiced amounts):**
```typescript
€{(timeStats?.thisMonth.hours || 0) > 0 ?
  ((dashboardMetrics?.totale_registratie || 0) / timeStats.thisMonth.hours).toFixed(1) : '0'}

// Bottom stats
Hours: {formatHours(timeStats?.thisMonth.hours || 0)}
Revenue: {formatCurrency(dashboardMetrics?.totale_registratie || 0)}
```

**AFTER (uses billable hours and time-based revenue):**
```typescript
€{(timeStats?.thisMonth.billableHours || 0) > 0 ?
  ((timeStats?.thisMonth.billableRevenue || 0) / timeStats.thisMonth.billableHours).toFixed(1) : '0'}

// Bottom stats
Billable Hours: {formatHours(timeStats?.thisMonth.billableHours || 0)}
Revenue: {formatCurrency(timeStats?.thisMonth.billableRevenue || 0)}
```

---

## Architecture After Changes

### Business Health (Rolling 30 Days) - No Changes
```typescript
const timeRevenue = timeStats.rolling30Days.current.billableRevenue  // Aug 18 - Sept 17
const subscriptionRevenue = monthlyActiveUsers.current × averageSubscriptionFee.current
const totalRevenue = timeRevenue + subscriptionRevenue
```

### Revenue Card (MTD) - Changed
```typescript
const mtdBillableRevenue = timeStats.thisMonth.billableRevenue  // Sept 1-17
const subscriptionRevenue = monthlyActiveUsers.current × averageSubscriptionFee.current
const totalRevenue = mtdBillableRevenue + subscriptionRevenue
```

### MTD Comparison - Changed
```typescript
// Current: Sept 1-17 billable revenue + MRR
const currentMTD = thisMonth.billableRevenue + currentMRR

// Previous: Aug 1-17 billable revenue + MRR (same day range)
const previousMTD = previousMonthMTD.billableRevenue + previousMRR
```

### Hourly Rate Card - Changed
```typescript
const rate = thisMonth.billableRevenue / thisMonth.billableHours
// Previously: totale_registratie / thisMonth.hours
```

### Billable Hours Card - Changed
```typescript
const hours = timeStats.thisMonth.billableHours
// Previously: timeStats.thisMonth.hours (total hours)
```

---

## Key Differences: Business Health vs Cards

### Time Windows (Unchanged)
- **Business Health**: Rolling 30 days (Aug 18 - Sept 17)
- **Cards**: Month-to-date (Sept 1 - Sept 17)

### Data Sources (Changed)
| Metric | Business Health (Rolling 30d) | Cards (MTD) | Change |
|--------|-------------------------------|-------------|---------|
| **Revenue** | `rolling30Days.current.billableRevenue` | `thisMonth.billableRevenue` | ✅ Now consistent (both use time entries) |
| **Hours** | `rolling30Days.current.billableHours` | `thisMonth.billableHours` | ✅ Now consistent (both use billable only) |
| **Rate** | `billableRevenue / billableHours` | `billableRevenue / billableHours` | ✅ Now consistent |
| **Subscription** | `monthlyActiveUsers.current × averageSubscriptionFee.current` | `monthlyActiveUsers.current × averageSubscriptionFee.current` | ✅ Already consistent |

### What's Different (Expected)
1. **Time Period**: 30 days vs 17 days MTD
2. **Comparison**: Current vs previous 30 days vs Current vs previous MTD (same day)

### What's Now Consistent
1. ✅ Both use **billable hours** (not total hours)
2. ✅ Both use **time entry billable revenue** (not invoiced amounts)
3. ✅ Both add **full MRR** (not prorated)
4. ✅ Rate calculation uses same formula

---

## Subscription Revenue Handling

### Both Business Health and Cards
- Add **current MRR** to time-based revenue
- MRR = `monthlyActiveUsers.current × averageSubscriptionFee.current`
- MRR is **not prorated** - represents full monthly recurring revenue

**Rationale:**
- Subscription revenue is recognized as monthly recurring revenue (MRR)
- Standard SaaS metric - not prorated by day of month
- On Sept 1, Sept 17, or Sept 30: Same MRR value

---

## Example Calculations

### Development Date: September 17, 2025

#### Business Health (Rolling 30 days: Aug 18 - Sept 17)
```
Time-based:
- Billable hours: 112h
- Billable revenue: €8,577.50
- Average rate: €76.58/h

Subscription:
- Active users: 10
- Avg fee: €50
- MRR: €500

Total Revenue: €8,577.50 + €500 = €9,077.50
```

#### Revenue Card (MTD: Sept 1 - Sept 17)
```
Time-based:
- Billable hours: 80h
- Billable revenue: €7,200
- Average rate: €90/h

Subscription:
- Active users: 10
- Avg fee: €50
- MRR: €500

Total Revenue: €7,200 + €500 = €7,700
```

#### MTD Comparison
```
Current (Sept 1-17):
- Time-based: €7,200
- Subscription: €500
- Total: €7,700

Previous (Aug 1-17):
- Time-based: €6,500
- Subscription: €450
- Total: €6,950

Difference: €7,700 - €6,950 = +€750 (+10.8%)
```

#### Hourly Rate Card
```
Current:
- Billable revenue: €7,200
- Billable hours: 80h
- Rate: €90/h

Previous (full month):
- Total revenue: €12,000
- Total hours: 160h
- Rate: €75/h

Trend: +20% vs previous month
```

#### Billable Hours Card
```
Current:
- Billable hours: 80h
- Non-billable: 15h
- Total tracked: 95h
- Display: 80h (billable only)

Target:
- MTD target: 106.25h (based on 12 working days Sept 1-16)
- Monthly target: 160h
- Progress: 80h / 106.25h = 75%
```

---

## Data Already Available (No Additional API Changes)

✅ `timeStats.thisMonth.billableHours` - Already calculated
✅ `timeStats.thisMonth.billableRevenue` - **NEW** (added in this implementation)
✅ `timeStats.thisMonth.nonBillableHours` - Already calculated
✅ `timeStats.previousMonthMTD.billableRevenue` - **NEW** (added in this implementation)
✅ `timeStats.subscription.monthlyActiveUsers.current` - Already available
✅ `timeStats.subscription.averageSubscriptionFee.current` - Already available

---

## Testing Checklist

### API Tests
- [ ] Verify `thisMonth.billableRevenue` is calculated correctly
- [ ] Verify `previousMonthMTD` data is returned
- [ ] Test edge case: Month with fewer days (e.g., Feb)
- [ ] Test edge case: First day of month (currentDay = 1)
- [ ] Test edge case: Last day of month (currentDay = 30/31)

### Dashboard Tests
- [ ] Revenue card shows time-based revenue (not invoiced)
- [ ] Revenue card includes MRR correctly
- [ ] Hours card shows billable hours only
- [ ] Rate card uses billable hours denominator
- [ ] MTD comparison shows correct previous month MTD
- [ ] Progress bars use correct calculations
- [ ] All cards show proper subscription integration

### Visual Tests
- [ ] Revenue card label changed: "Invoiced" → "Time-based"
- [ ] Hours card label changed: "This month total" → "Billable hours MTD"
- [ ] Hours card bottom stats: "This Week" → "Non-billable"
- [ ] Rate card bottom stats show billable hours

---

## Benefits of Changes

### 1. Consistency
- ✅ Business Health and Cards now use the same data sources
- ✅ Both use billable hours (excludes non-billable admin/training time)
- ✅ Both use time entry revenue (reflects work performed)

### 2. Accuracy
- ✅ Rate calculation excludes non-billable hours (more accurate value)
- ✅ MTD comparison uses actual same-day range (apples-to-apples)
- ✅ Subscription revenue handled consistently (full MRR)

### 3. User Experience
- ✅ Clear labels distinguish time-based from subscription revenue
- ✅ Billable vs non-billable breakdown visible
- ✅ Consistent methodology reduces confusion

### 4. Fair Comparison
- ✅ Previous month MTD uses same day range (Sept 17 vs Aug 17)
- ✅ No prorating needed - direct comparison
- ✅ Growth trends more accurate

---

## Known Differences (Expected)

### Time Period Difference
- Business Health: 30-day rolling window
- Cards: Month-to-date from 1st of month

**Example:** Sept 17
- Business Health: Aug 18 - Sept 17 (30 days)
- Cards: Sept 1 - Sept 17 (17 days)

**This is intentional** - different purposes:
- Business Health: Long-term trend tracking
- Cards: Monthly goal progress

---

## Migration Notes

### No Breaking Changes
- Existing data structure maintained
- New fields added to API response
- Backward compatible with Business Health calculations
- UI changes are cosmetic (labels, data sources)

### User-Facing Changes
1. Revenue card now shows time-based revenue instead of invoiced amounts
2. Hours card now shows billable hours instead of total hours
3. Rate card now calculated from billable hours only
4. MTD trends now compare same-day ranges

---

**End of Implementation Summary**
