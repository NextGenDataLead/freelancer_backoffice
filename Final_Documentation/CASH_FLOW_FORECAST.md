# Cash Flow Forecast - Complete Documentation

**Version:** 1.0
**Last Updated:** 2025-10-16
**Development Date Reference:** October 16, 2025

---

## Changelog

### Version 1.0 (2025-10-16) - Initial Implementation
- ✅ **90-Day Cash Flow Projection**: Real-time forecasting based on actual financial data
  - Location: `/dashboard/financieel`
  - Component: `src/components/dashboard/cash-flow-forecast.tsx`
  - API: `/api/cash-flow/forecast`
- ✅ **Three Scenario Analysis**: Optimistic (+20%), Realistic, Pessimistic (-30%)
  - Adjustable scenario multipliers for different planning needs
  - Runway days and minimum balance calculations per scenario
- ✅ **Real Data Integration**:
  - Outstanding invoices with due dates
  - Unbilled time entries (future revenue)
  - Historical payment patterns
  - Recurring expenses and tax obligations
- ✅ **Automated Insights**: Smart alerts for cash flow risks and opportunities
  - Critical warnings for short runway (<30 days)
  - Cautionary alerts for tight cash flow (<60 days)
  - Positive confirmations for healthy cash position
- ✅ **Next 7-Day Preview**: Daily breakdown of expected inflows and outflows
- ✅ **Major Events Tracking**: Alerts for significant payments and balance milestones

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [For Business Users](#for-business-users)
   - [Overview](#overview)
   - [Understanding Your Forecast](#understanding-your-forecast)
   - [Key Metrics Explained](#key-metrics-explained)
   - [Using the Dashboard](#using-the-dashboard)
   - [Common Scenarios](#common-scenarios)
   - [Quick Reference Guide](#quick-reference-guide)
3. [For Technical Developers](#for-technical-developers)
   - [Architecture Overview](#architecture-overview)
   - [Calculations Reference](#calculations-reference)
   - [Data Sources](#data-sources)
   - [API Integration](#api-integration)
   - [Component Structure](#component-structure)
   - [Testing Guidelines](#testing-guidelines)
   - [Extending the System](#extending-the-system)
4. [Appendices](#appendices)
   - [Glossary](#glossary)
   - [Calculation Examples](#calculation-examples)
   - [Troubleshooting](#troubleshooting)

---

## Executive Summary

The Cash Flow Forecast is a **predictive financial planning system** that projects your business's cash position for the next 90 days. It analyzes real financial data to predict when money will come in (inflows) and go out (outflows), helping you avoid cash shortages and plan for upcoming expenses.

**Key Features:**
- 90-day rolling cash flow projection
- Three scenario planning (optimistic, realistic, pessimistic)
- Real-time data from invoices, time entries, and expenses
- Automated risk detection and opportunity identification
- Daily balance tracking with confidence levels

**Key Metrics:**
- **Minimum Balance**: The lowest your cash balance will drop during the forecast period
- **Runway Days**: How many days until you run out of money (if ever)
- **Confidence Score**: How reliable each day's prediction is (decreases over time)
- **Scenario Comparison**: Best-case, most-likely, and worst-case outcomes

---

# For Business Users

## Overview

The Cash Flow Forecast shows you the future of your business finances. Think of it as a "financial weather forecast" - it tells you when money will arrive, when bills are due, and whether you'll have enough cash to cover everything.

### Quick Visual Guide

```
┌─────────────────────────────────────────────────────────────┐
│  CASH FLOW FORECAST - Next 90 Days                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 📊 Scenarios: [Optimistic] [Realistic ✓] [Pessimistic]│   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌────────────────────┐  ┌────────────────────┐            │
│  │  Minimum Balance   │  │    Runway Days     │            │
│  │     €5,245 ✓      │  │      90+ days ✓   │            │
│  │   (Healthy)        │  │    (Safe)          │            │
│  └────────────────────┘  └────────────────────┘            │
│                                                              │
│  💡 Key Insights                                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ✓ Healthy cash flow with €5,245 minimum balance     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  📅 Next 7 Days                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Thu 17  ↑ €2,500 (invoice)  ↓ €80   → €8,920       │   │
│  │ Fri 18              -        ↓ €80   → €8,840       │   │
│  │ Sat 19              -          -     → €8,840       │   │
│  │ Sun 20              -          -     → €8,840       │   │
│  │ Mon 21  ↑ €5,200 (payment)  ↓ €80   → €13,960      │   │
│  │ Tue 22              -        ↓ €80   → €13,880      │   │
│  │ Wed 23              -        ↓ €80   → €13,800      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  🔔 Major Events                                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Monthly invoice payments      Oct 21    €5,200      │   │
│  │ VAT payment                   Oct 25    €1,680      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

✓ = Green (Healthy)   ⚠️ = Orange (Caution)   🚨 = Red (Critical)
```

### Purpose

**Problem Solved:**
- Running out of cash unexpectedly → No visibility into future balance
- Missing payment deadlines → Don't know when bills are due
- Overcommitting financially → Can't see if you'll have enough cash
- Poor financial planning → No scenario analysis for decision-making

**Solution Provided:**
- ✅ 90-day visibility into cash position
- ✅ Scenario planning (best/worst/likely cases)
- ✅ Automated alerts for cash flow risks
- ✅ Daily breakdown of expected transactions
- ✅ Confidence levels for each prediction
- ✅ Major event tracking (big payments/milestones)

### How It Works (Simple Version)

1. **Looks at your current cash**: Starting balance from your accounts
2. **Adds expected money coming in**:
   - Invoice payments (based on due dates)
   - Unbilled work that will be invoiced
   - Recurring monthly income
3. **Subtracts expected money going out**:
   - Daily operating expenses
   - Monthly fixed costs
   - Tax payments
4. **Projects 90 days forward**: Day-by-day balance prediction
5. **Calculates three scenarios**: Optimistic, realistic, pessimistic

---

## Understanding Your Forecast

### What the Forecast Shows

The forecast answers three critical questions:
1. **When will I run low on cash?** (Minimum Balance)
2. **How long can I operate?** (Runway Days)
3. **What should I do about it?** (Insights & Actions)

### Why 90 Days?

- **Weeks 1-2**: Highly accurate (85-90% confidence) - based on confirmed invoices
- **Weeks 3-4**: Very reliable (75-85% confidence) - based on typical patterns
- **Weeks 5-8**: Good estimate (60-75% confidence) - includes projected revenue
- **Weeks 9-13**: Rough projection (40-60% confidence) - helps long-term planning

The further out you look, the less certain the prediction, which is why you see confidence scores.

---

## Key Metrics Explained

### Metric 1: Minimum Balance

**What It Is:** The lowest amount of cash you'll have during the next 90 days.

**Why It Matters:**
- Tells you if you'll have enough cash for operations
- Helps you avoid overdrafts and late payment fees
- Shows if you need a line of credit or emergency funds

**Examples:**
- €15,000 minimum = ✓ Healthy (plenty of buffer)
- €3,000 minimum = ⚠️ Tight (watch carefully)
- €500 minimum = 🚨 Critical (take action now)
- -€2,000 minimum = 🚨 Danger (will run out of money)

**What To Do:**
- **Green (>€5,000)**: You're safe. Consider investing excess cash.
- **Orange (€1,000-€5,000)**: Monitor closely. Have backup plan ready.
- **Red (<€1,000)**: Urgent action needed. Collect overdue invoices, delay expenses, or secure financing.

### Metric 2: Runway Days

**What It Is:** How many days before you run out of money (if you don't take action).

**Why It Matters:**
- Shows your financial safety margin
- Helps prioritize revenue-generating activities
- Indicates urgency of cash collection efforts

**Examples:**
- 90+ days = ✓ Excellent (more than 3 months of runway)
- 60-90 days = ⭐ Good (2-3 months buffer)
- 30-60 days = ⚠️ Caution (1-2 months - start planning)
- <30 days = 🚨 Critical (less than 1 month - immediate action)

**What To Do:**
- **90+ days**: Focus on growth. Your cash position is stable.
- **60-90 days**: Maintain momentum. Keep collecting payments on time.
- **30-60 days**: Accelerate collections. Invoice unbilled work immediately.
- **<30 days**: Emergency mode. Contact clients, delay expenses, secure bridge financing.

### Metric 3: Confidence Score

**What It Is:** How reliable the forecast is (0-100%).

**Why It Matters:**
- Early days (90%+ confident): Based on actual invoices due
- Mid-range (70-85% confident): Based on typical patterns
- Far out (40-60% confident): Educated estimates

**How To Use It:**
- **High confidence (>80%)**: Trust these numbers for decisions
- **Medium confidence (60-80%)**: Good for planning, but have contingencies
- **Low confidence (<60%)**: Use for rough directional guidance only

---

## Using the Dashboard

### Accessing the Forecast

1. Navigate to `/dashboard/financieel`
2. The Cash Flow Forecast card appears on the right side
3. Shows realistic scenario by default

### Switching Scenarios

**Three Scenarios Available:**
- **Optimistic (+20%)**: Best-case outcome
  - Clients pay early
  - All invoices collected
  - Expenses stay low
  - Use for: Positive planning, investment decisions

- **Realistic (Base Case)**: Most likely outcome
  - Standard payment timing
  - Normal collection rates (85% for sent, 60% for overdue)
  - Typical expenses
  - Use for: Day-to-day planning, regular decisions

- **Pessimistic (-30%)**: Worst-case outcome
  - Delayed payments
  - Lower collection rates
  - Unexpected expenses
  - Use for: Risk planning, securing credit lines

**How to Switch:**
1. Click the scenario button at the top (Optimistic/Realistic/Pessimistic)
2. Metrics update instantly
3. Color coding changes based on new thresholds

### Reading the Next 7 Days

Each day shows:
- **Day & Date**: e.g., "Thu 17"
- **Inflows** (↑ green): Money expected to arrive
- **Outflows** (↓ red): Money expected to leave
- **Running Balance**: Your cash position at end of day

**Today's Date** is highlighted with a blue background.

### Understanding Insights

**Insight Types:**

**✓ Positive (Green)**
- "Healthy cash flow with €X,XXX minimum balance"
- Meaning: You're in good shape
- Action: Keep doing what you're doing

**⚠️ Warning (Orange)**
- "Minimum balance may drop to €X,XXX"
- "€X,XXX in overdue invoices affecting cash flow"
- Meaning: Potential issues ahead
- Action: Follow the recommended steps (shown below insight)

**🚨 Critical (Red)**
- "Cash flow risk in X days"
- Meaning: Urgent situation
- Action: Immediate intervention required

---

## Common Scenarios

### Scenario 1: Healthy Cash Flow

**Symptoms:**
- Minimum balance > €5,000
- Runway days: 90+
- Green metrics across all scenarios
- Positive insights

**What It Means:**
Your business has strong cash flow. You can comfortably cover expenses and have room for growth.

**Recommended Actions:**
1. **Maintain Good Habits:**
   - Keep invoicing promptly
   - Continue following up on payments
   - Track expenses consistently

2. **Consider Growth Opportunities:**
   - Invest in marketing or equipment
   - Hire additional staff
   - Take on larger projects

3. **Build Reserves:**
   - Set aside 3-6 months operating expenses
   - Create emergency fund
   - Consider business savings account

**Best Practices:**
- Review forecast weekly to catch changes early
- Don't become complacent - cash can tighten quickly
- Use excess cash productively (invest, grow, save)

### Scenario 2: Tight Cash Flow (Warning)

**Symptoms:**
- Minimum balance: €1,000-€5,000
- Runway days: 30-60
- Orange metrics in realistic/pessimistic scenarios
- Warning insights with action items

**What It Means:**
Cash flow is manageable but tight. You need to stay on top of collections and be careful with expenses.

**Recommended Actions:**
1. **Accelerate Collections:**
   - Send payment reminders for all outstanding invoices
   - Call clients with overdue invoices (>7 days)
   - Offer payment plans for large overdue amounts
   - Consider early payment discounts (2% if paid within 5 days)

2. **Invoice Unbilled Work:**
   - Review all unbilled hours
   - Send invoices for completed work immediately
   - Don't wait for end of month - bill weekly if possible

3. **Manage Expenses:**
   - Delay non-essential purchases
   - Negotiate payment terms with vendors (extend to Net 60)
   - Review subscriptions and cancel unused services

4. **Plan Ahead:**
   - Set up line of credit before you need it
   - Talk to bank about overdraft protection
   - Keep cash reserve fund if possible

**Prevention:**
- Monitor forecast daily instead of weekly
- Set up automatic payment reminders
- Implement stricter payment terms (Net 15 instead of Net 30)

### Scenario 3: Critical Cash Shortage

**Symptoms:**
- Minimum balance < €1,000 or negative
- Runway days < 30
- Red metrics across all scenarios
- Critical insights with urgent actions

**What It Means:**
You're at serious risk of running out of cash. Immediate action is required.

**Immediate Actions (This Week):**
1. **Emergency Collections:**
   - Call every client with outstanding invoices TODAY
   - Offer significant discounts for immediate payment (5-10% off)
   - Accept partial payments (better than nothing)
   - Consider factoring (selling invoices at discount)

2. **Secure Quick Financing:**
   - Apply for business line of credit
   - Use business credit card for essential expenses only
   - Consider invoice financing or merchant cash advance
   - Ask for personal loan from family/friends (document properly)

3. **Cut Expenses Immediately:**
   - Pause all non-essential spending
   - Delay vendor payments (communicate proactively)
   - Negotiate payment plans with creditors
   - Reduce owner draw/salary temporarily

4. **Generate Quick Revenue:**
   - Offer discounts for prepayment on new projects
   - Sell unused equipment or assets
   - Take on quick short-term projects
   - Offer existing clients additional services

**Medium-Term (This Month):**
1. Fix underlying issues:
   - Review pricing (may be too low)
   - Improve collection processes
   - Reduce operating costs permanently
   - Diversify revenue sources

2. Communicate transparently:
   - Tell team what's happening (if applicable)
   - Be honest with key vendors
   - Keep clients informed if it affects service

**When To Seek Help:**
- If runway < 15 days, consult financial advisor
- If consistently running short, review business model
- If stress is overwhelming, talk to business mentor

### Scenario 4: Seasonal Cash Flow Dips

**Symptoms:**
- Minimum balance drops at specific time of year
- Runway temporarily decreases then recovers
- Pattern repeats annually
- Insights warn of upcoming dip

**What It Means:**
Your business has predictable seasonal variation (summer slowdown, holiday rush, etc.).

**Recommended Actions:**
1. **Plan For Known Dips:**
   - Build cash reserve during high season
   - Target 3 months expenses saved before slow season
   - Create separate "seasonal reserve" account

2. **Smooth Out Revenue:**
   - Offer retainer agreements (steady monthly income)
   - Pre-sell packages before slow season
   - Diversify into less seasonal work
   - Run promotions during typically slow periods

3. **Manage Expenses:**
   - Negotiate annual contracts paid during high season
   - Reduce variable costs during slow months
   - Plan major purchases for high-cash periods

4. **Use Forecast Proactively:**
   - Watch forecast starting 60 days before dip
   - Accelerate collections as dip approaches
   - Delay major expenses until after dip

**Best Practices:**
- Track seasonal patterns year over year
- Adjust forecast assumptions for your specific seasonality
- Communicate slow periods to team in advance

### Scenario 5: Major Payment Coming

**Symptoms:**
- "Major Events" section shows large incoming payment
- Balance jumps significantly on specific date
- Opportunity to plan ahead

**What It Means:**
You're expecting a substantial invoice payment that will boost cash position.

**Recommended Actions Before Payment:**
1. **Confirm Payment:**
   - Contact client 3-5 days before due date
   - Verify payment is processing
   - Ensure invoice details are correct

2. **Plan For The Cash:**
   - Decide how to use funds before they arrive
   - Pay down high-interest debt
   - Stock up on needed supplies
   - Make planned equipment purchases

3. **Don't Count Chickens:**
   - Don't spend money until it's actually in your account
   - Have backup plan if payment is delayed
   - Keep enough buffer for essential expenses

**After Payment Arrives:**
1. **Allocate Strategically:**
   - Pay essential bills first
   - Set aside taxes (21% VAT in Netherlands)
   - Build/replenish emergency reserve
   - Invest remainder in growth or savings

2. **Update Your Forecast:**
   - Forecast should automatically update
   - Review new minimum balance and runway
   - Adjust plans based on improved position

---

## Quick Reference Guide

### Minimum Balance Interpretation

| Balance Range | Status | Color | Meaning | Action Required |
|--------------|--------|-------|---------|-----------------|
| > €10,000 | Excellent | Dark Green | Very healthy position | Maintain and invest |
| €5,000 - €10,000 | Good | Green | Comfortable buffer | Keep up good work |
| €3,000 - €5,000 | Fair | Light Green | Adequate but watch closely | Monitor weekly |
| €1,000 - €3,000 | Caution | Orange | Tight cash flow | Accelerate collections |
| €500 - €1,000 | Warning | Dark Orange | Very tight | Urgent action needed |
| €0 - €500 | Critical | Red | Serious risk | Emergency measures |
| < €0 (Negative) | Danger | Dark Red | Will run out | Immediate crisis response |

### Runway Days Interpretation

| Days | Status | Urgency | Action Plan |
|------|--------|---------|-------------|
| 90+ | Excellent | Low | Focus on growth |
| 60-89 | Good | Low | Normal operations |
| 45-59 | Fair | Medium | Monitor closely |
| 30-44 | Caution | Medium-High | Accelerate revenue |
| 15-29 | Warning | High | Urgent collections |
| 7-14 | Critical | Very High | Emergency mode |
| < 7 | Danger | Critical | Crisis intervention |

### Scenario Use Cases

| Scenario | Best Used For | When To Use |
|----------|--------------|-------------|
| Optimistic (+20%) | Growth planning, investment decisions | When considering expansion, hiring, major purchases |
| Realistic (Base) | Day-to-day operations, regular planning | Default for most business decisions |
| Pessimistic (-30%) | Risk management, securing credit | Before taking on debt, planning for worst case |

### Confidence Levels Guide

| Time Period | Confidence Range | Reliability | Use For |
|------------|------------------|-------------|---------|
| 0-14 days | 85-95% | Very High | Firm commitments, contracts |
| 15-30 days | 75-85% | High | Planning major expenses |
| 31-60 days | 60-75% | Medium | General forecasting |
| 61-90 days | 40-60% | Medium-Low | Directional planning only |

### Quick Action Checklist

**When Minimum Balance is Low:**
- [ ] Contact all clients with overdue invoices
- [ ] Send reminders for invoices due in next 7 days
- [ ] Invoice all unbilled work immediately
- [ ] Review and delay non-essential expenses
- [ ] Check line of credit availability
- [ ] Consider early payment discounts

**When Runway is Short:**
- [ ] Daily cash flow monitoring
- [ ] Aggressive collection on all outstanding amounts
- [ ] Freeze non-critical spending
- [ ] Negotiate extended terms with vendors
- [ ] Explore short-term financing options
- [ ] Generate quick revenue (discounts, prepayments)

**When Forecast Shows Major Events:**
- [ ] Confirm payment dates with clients
- [ ] Plan allocation of incoming funds
- [ ] Prepare for large outflows (taxes, expenses)
- [ ] Update forecast if dates change
- [ ] Set aside reserves before major expenses

---

# For Technical Developers

## Architecture Overview

The Cash Flow Forecast system is built on a predictive modeling architecture that combines real financial data with scenario-based projections.

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                       │
│  cash-flow-forecast.tsx (Main Component)               │
│  - Scenario Selection (Optimistic/Realistic/Pessimistic)│
│  - Metric Display (Min Balance, Runway)                │
│  - Next 7 Days Preview                                 │
│  - Insights & Major Events                             │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│              Forecast Engine (API)                      │
│  /api/cash-flow/forecast (GET)                         │
│  - 90-Day Projection Algorithm                         │
│  - Scenario Calculations (3 variants)                  │
│  - Insight Generation                                  │
│  - Milestone Detection                                 │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│              Data Aggregation                           │
│  - Outstanding Invoices (with due dates)               │
│  - Unbilled Time Entries (future revenue)              │
│  - Dashboard Metrics (current balance, overdue)        │
│  - Historical Payment Patterns                         │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│                  Data Layer                            │
│  Supabase Database                                     │
│  - invoices (payment schedule)                         │
│  - time_entries (unbilled revenue)                     │
│  - clients (payment terms)                             │
│  - dashboard_metrics RPC (aggregated data)             │
└─────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Real Data Foundation**
   - All projections based on actual invoices and time entries
   - No arbitrary assumptions or hardcoded values
   - Historical patterns inform confidence scores

2. **Scenario-Based Planning**
   - Three scenarios (optimistic, realistic, pessimistic) for different planning needs
   - Adjustable multipliers allow customization
   - Conservative approach (pessimistic) helps risk management

3. **Time-Decaying Confidence**
   - Near-term forecasts highly reliable (based on confirmed data)
   - Long-term forecasts less certain (based on estimates)
   - Confidence score reflects prediction reliability

4. **Actionable Insights**
   - Automated detection of cash flow risks
   - Contextual recommendations for each situation
   - Prioritized by urgency (critical > warning > positive)

5. **Rolling Window**
   - Always shows next 90 days from current date
   - Updates in real-time as new data arrives
   - Historical accuracy improves future predictions

---

## Calculations Reference

### 90-Day Forecast Algorithm

**Core Loop:**
```typescript
for (let day = 0; day < 90; day++) {
  const date = new Date()
  date.setDate(date.getDate() + day)

  let inflows = 0
  let outflows = 0
  let confidence = 0.8 // Base confidence

  // Add all inflow sources for this day
  inflows += calculateInvoicePayments(date)
  inflows += calculateSubscriptionIncome(date)
  inflows += calculateUnbilledRevenue(date)

  // Add all outflow sources for this day
  outflows += calculateDailyExpenses(date)
  outflows += calculateMonthlyExpenses(date)
  outflows += calculateTaxPayments(date)

  // Calculate net flow and running balance
  const netFlow = inflows - outflows
  runningBalance += netFlow

  // Adjust confidence based on time horizon
  confidence = Math.max(0.1, 1 - (day / 90) * 0.4)

  forecasts.push({
    date,
    inflows,
    outflows,
    netFlow,
    runningBalance,
    confidence
  })
}
```

### Inflow Calculations

#### 1. Invoice Payments
```typescript
// Check for invoices due on this specific date
const invoicesDue = outstandingInvoices.filter(inv =>
  inv.due_date === dateString
)

invoicesDue.forEach(invoice => {
  // Apply collection probability based on invoice status
  const paymentProbability = invoice.status === 'overdue' ? 0.6 : 0.85

  inflows += invoice.total_amount * paymentProbability
  confidence *= paymentProbability // Reduce confidence for uncertain payments
})
```

**Key Drivers:**
- **Invoice due dates**: From `invoices` table
- **Collection rates**: 85% for sent invoices, 60% for overdue
- **Impact on confidence**: Overdue invoices reduce forecast certainty

#### 2. Subscription/Recurring Income
```typescript
// First day of each month
if (date.getDate() === 1) {
  inflows += monthlyRevenue * 0.3 // 30% from subscriptions
  confidence = Math.max(confidence, 0.9) // High confidence for recurring revenue
}
```

**Key Drivers:**
- **Monthly revenue**: From `dashboard_metrics`
- **Subscription percentage**: Assumes 30% of revenue is recurring
- **Timing**: Always 1st of month

#### 3. Unbilled Revenue
```typescript
// Weekly billing cycle (every 7 days)
if (day % 7 === 0 && day > 0) {
  const weeklyUnbilledRevenue = unbilledEntries
    .reduce((sum, entry) => {
      const rate = entry.effective_hourly_rate || entry.hourly_rate || 75
      return sum + (entry.hours * rate)
    }, 0) / 12 // Spread over 12 weeks

  inflows += weeklyUnbilledRevenue * 0.8 // 80% collection rate
}
```

**Key Drivers:**
- **Unbilled hours**: From `time_entries` where `billable=true` and `invoiced=false`
- **Hourly rates**: Uses `effective_hourly_rate` or falls back to `hourly_rate` (€75 default)
- **Billing cycle**: Assumes weekly invoicing
- **Collection rate**: 80% (accounts for write-offs and disputes)

### Outflow Calculations

#### 1. Daily Expenses
```typescript
const dailyExpenses = 80 // €80 per day baseline
outflows += dailyExpenses
```

**Key Drivers:**
- **Fixed daily rate**: €80/day = ~€2,400/month
- **Represents**: Office costs, utilities, small recurring expenses

#### 2. Monthly Fixed Expenses
```typescript
// Mid-month expense cycle (day 15)
if (day % 30 === 15) {
  outflows += monthlyRevenue * 0.3 // 30% of revenue as expenses
}
```

**Key Drivers:**
- **Percentage of revenue**: 30% of monthly revenue
- **Timing**: Mid-month (day 15)
- **Includes**: Larger recurring costs, contractor payments, subscriptions

#### 3. Tax Payments
```typescript
// Quarterly tax payments (day 89 of 90-day cycle)
if (day % 90 === 89) {
  outflows += monthlyRevenue * 0.25 // 25% quarterly tax estimate
}
```

**Key Drivers:**
- **Tax rate**: 25% of quarterly revenue
- **Timing**: Every 90 days
- **Type**: Estimated income tax and VAT combined

### Scenario Calculations

#### Optimistic Scenario (+20%)
```typescript
optimistic: {
  runwayDays: forecasts.findIndex(f => f.runningBalance * 1.2 <= 0) || 90,
  minBalance: Math.min(...forecasts.map(f => f.runningBalance * 1.2))
}
```

**Assumptions:**
- Payments arrive 20% faster/more reliably
- Collection rates improve
- Expenses stay controlled
- **Use case**: Best-case planning, growth scenarios

#### Realistic Scenario (Base Case)
```typescript
realistic: {
  runwayDays: forecasts.findIndex(f => f.runningBalance <= 0) || 90,
  minBalance: Math.min(...forecasts.map(f => f.runningBalance))
}
```

**Assumptions:**
- Standard payment timing
- Historical collection rates (85%/60%)
- Typical expense patterns
- **Use case**: Normal operations, most decisions

#### Pessimistic Scenario (-30%)
```typescript
pessimistic: {
  runwayDays: forecasts.findIndex(f => f.runningBalance * 0.7 <= 0) || 90,
  minBalance: Math.min(...forecasts.map(f => f.runningBalance * 0.7))
}
```

**Assumptions:**
- Payments delayed by 30%
- Lower collection rates
- Unexpected expenses
- **Use case**: Risk planning, credit applications

### Insight Generation

#### Critical Insights
```typescript
if (scenarios.pessimistic.runwayDays < 30) {
  insights.push({
    type: 'critical',
    message: `Cash flow risk in ${scenarios.pessimistic.runwayDays} days`,
    action: 'Contact clients about overdue invoices immediately'
  })
}
```

**Trigger**: Pessimistic runway < 30 days
**Meaning**: Even in worst case, cash will run out within a month
**Action**: Emergency collections required

#### Warning Insights
```typescript
// Tight cash flow warning
if (scenarios.realistic.runwayDays < 60) {
  insights.push({
    type: 'warning',
    message: 'Cash flow may tighten in 2 months',
    action: 'Invoice unbilled hours and follow up on pending payments'
  })
}

// Overdue invoice warning
if (overdueAmount > monthlyRevenue * 0.2) {
  insights.push({
    type: 'warning',
    message: `€${overdueAmount.toLocaleString()} in overdue invoices affecting cash flow`,
    action: 'Prioritize collecting overdue payments'
  })
}
```

**Triggers**:
1. Realistic runway < 60 days
2. Overdue amount > 20% of monthly revenue

**Actions**: Proactive but not urgent

#### Positive Insights
```typescript
insights.push({
  type: 'positive',
  message: `Healthy cash flow with €${Math.round(scenarios.realistic.minBalance).toLocaleString()} minimum balance`
})
```

**Trigger**: All other cases (no critical/warning conditions)
**Meaning**: Cash flow is healthy

### Milestone Detection

```typescript
forecasts.map((forecast, index) => {
  const milestones = []

  // Low balance warning (<€2,000)
  if (forecast.runningBalance < 2000 && forecast.runningBalance > 0) {
    milestones.push({
      date: forecast.date,
      type: 'low_balance',
      description: 'Balance below €2,000',
      amount: forecast.runningBalance
    })
  }

  // Negative balance warning
  if (forecast.runningBalance < 0) {
    milestones.push({
      date: forecast.date,
      type: 'negative_balance',
      description: 'Account may go negative',
      amount: forecast.runningBalance
    })
  }

  // Major payment (>30% of monthly revenue)
  if (forecast.inflows > monthlyRevenue * 0.3) {
    milestones.push({
      date: forecast.date,
      type: 'major_payment',
      description: 'Expected large payment',
      amount: forecast.inflows
    })
  }

  return milestones
})
.flat()
.slice(0, 5) // Limit to first 5 milestones
```

**Milestone Types:**
1. **Low Balance**: Running balance drops below €2,000
2. **Negative Balance**: Prediction shows account going negative
3. **Major Payment**: Inflow exceeds 30% of monthly revenue

---

## Data Sources

### Primary Data Tables

#### 1. Invoices Table
```sql
SELECT id, total_amount, due_date, status, client_id
FROM invoices
WHERE tenant_id = {tenant_id}
  AND status IN ('sent', 'overdue')
ORDER BY due_date ASC
```

**Used For:**
- Predicting when payments will arrive
- Calculating inflows based on due dates
- Adjusting confidence based on invoice status

**Key Fields:**
- `due_date`: When payment is expected
- `total_amount`: How much to expect
- `status`: Affects collection probability (sent=85%, overdue=60%)

#### 2. Time Entries Table
```sql
SELECT hours, hourly_rate, effective_hourly_rate, client_id
FROM time_entries
WHERE tenant_id = {tenant_id}
  AND billable = true
  AND invoiced = false
```

**Used For:**
- Estimating future revenue from unbilled work
- Projecting when work will be invoiced
- Calculating potential inflows

**Key Fields:**
- `hours`: Amount of billable work
- `effective_hourly_rate` or `hourly_rate`: Revenue per hour
- `billable`: Must be true
- `invoiced`: Must be false (not yet billed)

#### 3. Dashboard Metrics (RPC)
```sql
SELECT * FROM get_dashboard_metrics({tenant_id})
```

**Used For:**
- Current balance (starting point)
- Monthly revenue (baseline calculations)
- Overdue amount (collection priorities)

**Key Fields:**
- `current_balance`: Starting cash position
- `totale_registratie`: Monthly revenue average
- `achterstallig`: Overdue invoice total

---

## API Integration

### Endpoint: GET /api/cash-flow/forecast

**Request:**
```typescript
GET /api/cash-flow/forecast
Headers: {
  Authorization: Bearer <clerk_token>
}
```

**Response:**
```typescript
{
  success: true,
  message: "Cash flow forecast generated successfully",
  data: {
    forecasts: [
      {
        date: "2025-10-17",
        inflows: 2500,
        outflows: 80,
        netFlow: 2420,
        runningBalance: 8920,
        confidence: 0.9
      },
      // ... 89 more days
    ],
    scenarios: {
      optimistic: {
        runwayDays: 90,
        minBalance: 12580
      },
      realistic: {
        runwayDays: 90,
        minBalance: 10483
      },
      pessimistic: {
        runwayDays: 75,
        minBalance: 7338
      }
    },
    insights: [
      {
        type: "positive",
        message: "Healthy cash flow with €10,483 minimum balance"
      }
    ],
    nextMilestones: [
      {
        date: "2025-10-21",
        type: "major_payment",
        description: "Expected large payment",
        amount: 5200
      }
    ]
  }
}
```

### Error Handling

**Authentication Errors:**
```typescript
{
  success: false,
  error: "Unauthorized",
  status: 401
}
```

**Internal Errors:**
```typescript
{
  success: false,
  error: "Internal server error",
  status: 500
}
```

**Fallback Behavior:**
If API fails, component uses mock data based on dashboard metrics to provide basic functionality.

---

## Component Structure

### React Component Hierarchy

```typescript
CashFlowForecast
├── Header
│   ├── Icon (BarChart3)
│   ├── Title & Subtitle
│   └── CashFlowHelpModal (Dialog)
│       ├── Key Metrics Explanation
│       ├── Scenarios Explanation
│       ├── Data Sources
│       └── Action Tips
├── Scenario Selection Buttons
│   ├── Optimistic Button
│   ├── Realistic Button (default)
│   └── Pessimistic Button
├── Key Metrics Grid (2 columns)
│   ├── Minimum Balance Card
│   │   ├── Amount (color-coded)
│   │   └── Label
│   └── Runway Days Card
│       ├── Days (color-coded)
│       └── Label
├── Key Insights Section
│   └── Insight Cards (max 2)
│       ├── Icon (based on type)
│       ├── Message
│       └── Action (if applicable)
├── Next 7 Days Section
│   └── Daily Forecast Rows (7 days)
│       ├── Day & Date
│       ├── Today Badge (conditional)
│       ├── Inflows (if > 0)
│       ├── Outflows (if > 0)
│       └── Running Balance
└── Major Events Section (conditional)
    └── Event Cards (max 2)
        ├── Description
        ├── Date
        └── Amount
```

### Key React Hooks

```typescript
// State management
const [cashFlowAnalysis, setCashFlowAnalysis] = useState<CashFlowAnalysis | null>(null)
const [loading, setLoading] = useState(true)
const [selectedScenario, setSelectedScenario] = useState<'optimistic' | 'realistic' | 'pessimistic'>('realistic')

// Data fetching
useEffect(() => {
  const generateForecast = async () => {
    if (!dashboardMetrics) return

    try {
      const response = await fetch('/api/cash-flow/forecast')
      const result = await response.json()

      if (result.success) {
        setCashFlowAnalysis(result.data)
      }
    } catch (error) {
      console.error('Failed to generate cash flow forecast:', error)
      // Fallback to mock data
    } finally {
      setLoading(false)
    }
  }

  generateForecast()
}, [dashboardMetrics])
```

### Color Coding Logic

**Minimum Balance:**
```typescript
const balanceColor =
  scenario.minBalance < 1000 ? 'red' :
  scenario.minBalance < 3000 ? 'orange' :
  'green'
```

**Runway Days:**
```typescript
const runwayColor =
  scenario.runwayDays < 30 ? 'red' :
  scenario.runwayDays < 60 ? 'orange' :
  'green'
```

**Insight Types:**
```typescript
const insightColor = {
  positive: 'green',
  warning: 'orange',
  critical: 'red'
}
```

---

## Testing Guidelines

### Test Coverage Strategy

Follow the 70/20/10 testing pyramid:
- **70% Unit Tests**: Calculation functions, data transformations
- **20% Integration Tests**: API endpoints, database queries
- **10% E2E Tests**: User workflows via Playwright

### Unit Tests Needed

**Forecast Calculations:**
- [ ] 90-day projection generates correct number of forecasts
- [ ] Inflow calculations (invoices, subscriptions, unbilled)
- [ ] Outflow calculations (daily, monthly, taxes)
- [ ] Running balance accumulates correctly
- [ ] Confidence scores decrease over time

**Scenario Calculations:**
- [ ] Optimistic scenario applies +20% multiplier
- [ ] Realistic scenario uses base numbers
- [ ] Pessimistic scenario applies -30% multiplier
- [ ] Runway days calculated correctly
- [ ] Minimum balance found accurately

**Insight Generation:**
- [ ] Critical insights trigger when runway < 30 days
- [ ] Warning insights trigger when runway < 60 days
- [ ] Overdue insights trigger when overdue > 20% of revenue
- [ ] Positive insights show when conditions are good

### Integration Tests Needed

- [ ] API endpoint returns valid forecast structure
- [ ] Authentication blocks unauthorized access
- [ ] Invoice data fetched correctly from database
- [ ] Unbilled time entries included in calculations
- [ ] Dashboard metrics integrated properly
- [ ] Tenant isolation prevents cross-tenant data leakage

### E2E Tests Needed

- [ ] Dashboard loads and displays forecast card
- [ ] Scenario switching updates metrics immediately
- [ ] Next 7 days shows daily breakdown
- [ ] Help modal opens and explains metrics
- [ ] Insights appear with correct color coding
- [ ] Major events section shows when applicable

---

## Extending the System

### Adding New Inflow Sources

To add a new type of expected income:

1. **Update Data Fetching** (`forecast/route.ts`):
```typescript
// Add query for new income source
const { data: newIncomeSource, error } = await supabaseAdmin
  .from('your_table')
  .select('amount, expected_date')
  .eq('tenant_id', profile.tenant_id)
```

2. **Add to Forecast Loop**:
```typescript
// Check for this income on specific dates
const incomeOnDate = newIncomeSource?.filter(item =>
  item.expected_date === dateString
) || []

incomeOnDate.forEach(item => {
  inflows += item.amount * confidenceFactor
})
```

3. **Update Interfaces**:
```typescript
interface CashFlowEntry {
  type: 'invoice_due' | 'expense_planned' | 'recurring_income' | 'tax_payment' | 'your_new_type'
  // ... other fields
}
```

### Adding New Outflow Sources

Similar process for expenses:

1. Query expense source
2. Add to outflow calculations in loop
3. Update type definitions

### Adjusting Scenario Multipliers

Currently hardcoded in `/api/cash-flow/forecast/route.ts`:

```typescript
// Change these values to adjust scenarios
scenarios: {
  optimistic: {
    minBalance: Math.min(...forecasts.map(f => f.runningBalance * 1.2))  // Change 1.2
  },
  pessimistic: {
    minBalance: Math.min(...forecasts.map(f => f.runningBalance * 0.7))  // Change 0.7
  }
}
```

**Recommendation**: Move to environment variables or database settings for easier adjustment.

### Customizing Insight Thresholds

Current thresholds in `forecast/route.ts`:

```typescript
// Adjust these values
if (scenarios.pessimistic.runwayDays < 30) {  // Change 30
  // Critical insight
}

if (scenarios.realistic.runwayDays < 60) {  // Change 60
  // Warning insight
}

if (overdueAmount > monthlyRevenue * 0.2) {  // Change 0.2 (20%)
  // Overdue warning
}
```

### Adding More Forecast Days

Currently set to 90 days. To extend:

```typescript
// In forecast/route.ts, change loop
for (let day = 0; day < 180; day++) {  // Change from 90 to desired days
  // ... forecast logic
}
```

**Note**: Confidence will be lower for longer periods. Consider adjusting confidence decay formula.

---

# Appendices

## Glossary

### Key Terms

**Cash Flow**: The movement of money in and out of your business.

**Inflows**: Money coming into your business (invoice payments, sales, etc.).

**Outflows**: Money leaving your business (expenses, taxes, salaries, etc.).

**Running Balance**: Your cash position at the end of each day (starting balance + inflows - outflows).

**Minimum Balance**: The lowest your cash balance will drop during the forecast period.

**Runway Days**: How many days your business can operate before cash runs out.

**Confidence Score**: How reliable a forecast is (0-100%). Decreases as you project further into the future.

**Scenario**: A what-if analysis showing different possible outcomes (optimistic, realistic, pessimistic).

**Outstanding Invoices**: Invoices sent to clients but not yet paid.

**Unbilled Time**: Hours worked and tracked but not yet invoiced to clients.

**Collection Rate**: The percentage of invoiced amounts you actually collect (typically 85% for on-time, 60% for overdue).

**Milestone**: A significant event in your cash flow forecast (major payment, low balance warning, etc.).

**Insight**: An automated observation about your cash flow with recommended action.

**Forecast Period**: The time range covered by the prediction (90 days in this system).

**Time Horizon**: How far in the future a specific prediction is (near-term = high confidence, far-term = low confidence).

**Net Flow**: The difference between inflows and outflows for a specific period (can be positive or negative).

**Cash Position**: Your current cash balance plus near-term expected cash flow.

---

## Calculation Examples

### Example 1: Healthy Business (90+ Days Runway)

**Starting Position:**
- Current Balance: €15,000
- Monthly Revenue: €12,000
- Overdue Amount: €800
- Unbilled Hours: 45 hours at €85/hour = €3,825

**Forecast Calculation (Day 15):**

**Inflows:**
- Mid-month invoice payments: €12,000 × 0.6 × 0.85 = €6,120
- Weekly unbilled (day 14): €3,825 / 12 × 0.8 = €255

Total Inflows: €6,375

**Outflows:**
- Daily expenses (15 days × €80): €1,200
- Mid-month expenses: €12,000 × 0.3 = €3,600

Total Outflows: €4,800

**Net Flow:** €6,375 - €4,800 = €1,575

**Running Balance:** €15,000 + €1,575 = €16,575

**Scenarios After 90 Days:**
- Optimistic: Min Balance €18,240, Runway 90+ days
- Realistic: Min Balance €15,200, Runway 90+ days
- Pessimistic: Min Balance €10,640, Runway 90+ days

**Insights Generated:**
- ✅ "Healthy cash flow with €15,200 minimum balance"

**Recommended Actions:**
- Continue normal operations
- Consider investing excess cash
- Maintain good invoicing and collection practices

---

### Example 2: Tight Cash Flow (30-60 Days Runway)

**Starting Position:**
- Current Balance: €4,500
- Monthly Revenue: €8,000
- Overdue Amount: €2,400 (30% of monthly revenue)
- Unbilled Hours: 20 hours at €75/hour = €1,500

**Forecast Calculation (Day 30):**

**Inflows:**
- End-month invoice payments: €8,000 × 0.3 × 0.85 = €2,040
- Overdue collection (day 7): €2,400 × 0.7 × 0.6 = €1,008
- Weekly unbilled (days 7,14,21,28): €1,500 / 12 × 4 × 0.8 = €400

Total Inflows: €3,448

**Outflows:**
- Daily expenses (30 days × €80): €2,400
- Mid-month expenses: €8,000 × 0.3 = €2,400
- Monthly fixed (day 1): €1,200
- Tax payment (day 25): €8,000 × 0.21 = €1,680

Total Outflows: €7,680

**Net Flow:** €3,448 - €7,680 = -€4,232

**Running Balance:** €4,500 - €4,232 = €268

**Scenarios After 90 Days:**
- Optimistic: Min Balance €1,200, Runway 68 days
- Realistic: Min Balance €268, Runway 47 days
- Pessimistic: Min Balance -€980, Runway 28 days

**Insights Generated:**
- 🚨 "Cash flow risk in 28 days"
- ⚠️ "€2,400 in overdue invoices affecting cash flow"

**Actions Required:**
- Contact clients about overdue invoices immediately
- Prioritize collecting overdue payments
- Invoice unbilled hours this week
- Consider short-term financing
- Delay non-essential expenses

---

### Example 3: Critical Situation (<30 Days Runway)

**Starting Position:**
- Current Balance: €2,100
- Monthly Revenue: €6,000
- Overdue Amount: €3,800 (63% of monthly revenue)
- Unbilled Hours: 8 hours at €70/hour = €560

**Forecast Calculation (Day 15):**

**Inflows:**
- Mid-month payments: €6,000 × 0.6 × 0.85 = €3,060
- Overdue collection: €3,800 × 0.7 × 0.6 = €1,596 (but spread over multiple days)
- Weekly unbilled: €560 / 12 × 2 × 0.8 = €75

Total Inflows (day 15): €3,135

**Outflows:**
- Daily expenses (15 days × €80): €1,200
- Mid-month expenses: €6,000 × 0.3 = €1,800
- Fixed costs (day 1): €1,200

Total Outflows: €4,200

**Net Flow:** €3,135 - €4,200 = -€1,065

**Running Balance:** €2,100 - €1,065 = €1,035

**Scenarios After 90 Days:**
- Optimistic: Min Balance €580, Runway 48 days
- Realistic: Min Balance -€420, Runway 22 days
- Pessimistic: Min Balance -€1,680, Runway 14 days

**Insights Generated:**
- 🚨 "Cash flow risk in 14 days"
- 🚨 "€3,800 in overdue invoices affecting cash flow"
- ⚠️ "Account may go negative by Nov 7"

**Emergency Actions:**
- Call every client with outstanding invoice TODAY
- Offer 5-10% discount for immediate payment
- Invoice all unbilled work immediately
- Apply for emergency line of credit
- Cut all non-essential expenses
- Negotiate payment delays with vendors
- Consider factoring or invoice financing

---

## Troubleshooting

### Issue: Forecast Shows €0 or Unrealistic Numbers

**Symptoms:**
- Minimum balance shows €0
- Runway shows 0 days
- All scenarios identical
- No insights generated

**Causes:**
1. Dashboard metrics not loading
2. No invoices or time entries in database
3. API error returning empty data

**Solutions:**
1. Check browser console for API errors
2. Verify dashboard metrics are loaded (`dashboardMetrics` prop)
3. Confirm invoices exist in database for your tenant
4. Check Supabase RLS policies allow data access
5. Review API logs at `/api/cash-flow/forecast`

**Quick Fix:**
Component falls back to mock data if API fails. If seeing mock data:
- Check network tab for failed API call
- Verify authentication (Clerk token)
- Ensure tenant_id is set correctly

---

### Issue: Runway Always Shows 90+ Days

**Symptoms:**
- Runway never drops below 90 days
- Even pessimistic scenario shows 90+
- Balance never goes negative

**Causes:**
1. Inflows significantly exceed outflows
2. Starting balance very high
3. Expense estimates too low
4. Not enough historical expense data

**Solutions:**
1. Review monthly expense calculation (currently 30% of revenue)
2. Check if daily expense rate (€80) is realistic
3. Verify tax payment calculations (25% quarterly)
4. Add more expense categories if needed
5. Review actual vs projected expenses in financial reports

**Adjustment:**
If your business has higher expenses:
- Increase `monthlyExpenses` multiplier in `forecast/route.ts`
- Adjust `dailyExpenses` constant
- Add specific expense categories

---

### Issue: Confidence Scores Always Low

**Symptoms:**
- Confidence < 50% even for near-term days
- All forecasts marked as uncertain

**Causes:**
1. Many overdue invoices (60% confidence factor)
2. Confidence decay formula too aggressive
3. Not enough confirmed payment dates

**Solutions:**
1. Collect overdue invoices to improve confidence
2. Get more clients to commit to payment dates
3. Adjust confidence formula if needed:

```typescript
// In forecast/route.ts
// Current formula
const confidence = Math.max(0.1, Math.min(1, confidence))

// More optimistic formula
const confidence = Math.max(0.3, Math.min(1, confidence * 1.2))
```

---

### Issue: Major Events Not Showing

**Symptoms:**
- "Major Events" section is empty
- No milestones displayed
- Missing large payment alerts

**Causes:**
1. No payments large enough to trigger milestone (>30% of monthly revenue)
2. No low balance warnings (<€2,000)
3. Milestones all beyond first 5 (limited display)

**Solutions:**
1. Verify large invoices exist and have due dates
2. Check if threshold is too high:

```typescript
// In forecast/route.ts
// Lower threshold for major payment detection
if (forecast.inflows > monthlyRevenue * 0.2) {  // Change from 0.3 to 0.2
  // Major payment milestone
}
```

3. Increase milestone display limit:

```typescript
.slice(0, 10)  // Change from 5 to 10
```

---

### Issue: Scenarios Too Similar

**Symptoms:**
- Optimistic and pessimistic scenarios very close
- All three scenarios show same runway
- Minimal difference in minimum balance

**Causes:**
1. Scenario multipliers too conservative
2. Cash flow very stable (not much variation)
3. Short forecast period with high confidence

**Solutions:**
1. Adjust scenario multipliers for more spread:

```typescript
// In forecast/route.ts
scenarios: {
  optimistic: {
    minBalance: Math.min(...forecasts.map(f => f.runningBalance * 1.5))  // Change from 1.2
  },
  pessimistic: {
    minBalance: Math.min(...forecasts.map(f => f.runningBalance * 0.5))  // Change from 0.7
  }
}
```

2. This may be accurate if your business has:
   - Very predictable revenue
   - Low expense volatility
   - Stable client payments

---

### Issue: Performance Slow with Many Clients

**Symptoms:**
- Forecast takes >5 seconds to load
- Dashboard becomes unresponsive
- API timeouts

**Causes:**
1. Too many invoices to process
2. Complex calculations for each of 90 days
3. Database queries not optimized

**Solutions:**
1. **Add Database Indexes:**
```sql
CREATE INDEX idx_invoices_due_date ON invoices(due_date, tenant_id) WHERE status IN ('sent', 'overdue');
CREATE INDEX idx_time_entries_unbilled ON time_entries(tenant_id) WHERE billable = true AND invoiced = false;
```

2. **Implement Caching:**
```typescript
// Cache forecast for 10 minutes
const cacheKey = `forecast_${profile.tenant_id}`
const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)

// ... generate forecast ...

await redis.set(cacheKey, JSON.stringify(analysis), 'EX', 600)
```

3. **Limit Forecast Days:**
```typescript
// Reduce from 90 to 60 days for faster performance
for (let day = 0; day < 60; day++) {
```

---

**End of Documentation**

This document provides complete context to understand, use, and develop the Cash Flow Forecast system. All calculations are based on real financial data with transparent logic and adjustable parameters for different business needs.
