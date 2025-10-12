# Business Health & Dashboard Metrics - Complete Documentation

**Version:** 2.0
**Last Updated:** 2025-10-12
**Development Date Reference:** September 17, 2025

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [For Business Users](#for-business-users)
   - [Overview](#overview)
   - [Business Health Section](#business-health-section)
   - [Dashboard Metrics Cards](#dashboard-metrics-cards)
   - [Understanding Your Numbers](#understanding-your-numbers)
   - [How to Use This Dashboard](#how-to-use-this-dashboard)
3. [For Technical Developers](#for-technical-developers)
   - [Architecture Overview](#architecture-overview)
   - [Data Flow](#data-flow)
   - [API Endpoints](#api-endpoints)
   - [Component Structure](#component-structure)
   - [Calculations Reference](#calculations-reference)
   - [Testing Guidelines](#testing-guidelines)
   - [Extending the System](#extending-the-system)
4. [Appendices](#appendices)
   - [Glossary](#glossary)
   - [Calculation Examples](#calculation-examples)
   - [Troubleshooting](#troubleshooting)

---

## Executive Summary

The Business Health & Dashboard Metrics system provides comprehensive business performance tracking through two complementary views:

1. **Business Health Section**: Rolling 30-day performance trends (consistent scoring)
2. **Dashboard Metric Cards**: Month-to-date progress tracking (tactical goals)

**Key Features:**
- Real-time performance monitoring
- Multi-revenue stream support (time-based + subscriptions)
- Fair, consistent health scoring methodology
- Actionable recommendations and insights
- GDPR-compliant data tracking

---

# For Business Users

## Overview

The dashboard is designed to give you instant insights into your business performance without overwhelming you with data. It consists of two main sections working together to tell your business story.

### Quick Visual Guide

```
┌─────────────────────────────────────────────────────────────┐
│  BUSINESS HEALTH SCORE (Rolling 30d)                       │
│  ┌─────────────┬─────────┬─────────────┬─────────┐        │
│  │ Profit      │ Cash    │ Efficiency  │  Risk   │        │
│  │ (Roll 30d)  │ Flow    │ (Roll 30d)  │         │        │
│  │  22/25      │  20/25  │  23/25      │  20/25  │= 85/100│
│  └─────────────┴─────────┴─────────────┴─────────┘   🚀   │
└─────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────┐
│   REVENUE    │    HOURS     │  AVG RATE    │     MAU      │
│    (MTD)     │    (MTD)     │   (MTD)      │   (MTD)      │
│              │              │              │              │
│  €7,700      │   80h        │  €90/h       │   10 users   │
│  Target:     │  Target:     │  Target:     │  Target:     │
│  €6,804      │  106.25h     │  €75/h       │  15 users    │
│  ▓▓▓▓▓▓░░    │  ▓▓▓▓▓░░░    │  ▓▓▓▓▓▓▓▓░   │  ▓▓▓▓▓░░░    │
│  113% ✓      │  75%         │  120% ✓      │  67%         │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### The Two-View System Explained

**Business Health (Top Section)**
- **Time Window**: Last 30 days (e.g., Aug 18 - Sept 17)
- **Purpose**: Long-term trend tracking
- **Updates**: Daily, smoothly
- **Best for**: Understanding if your business is healthy overall

**Metric Cards (Bottom Section)**
- **Time Window**: Current month only (e.g., Sept 1 - Sept 17)
- **Purpose**: Track progress toward monthly goals
- **Updates**: Real-time
- **Best for**: Daily tactical decisions and monthly goal tracking

### Why Two Different Time Windows?

Think of it like weather forecasting:
- **Business Health** = Climate (long-term patterns over 30 days)
- **Metric Cards** = Daily weather (how today compares to your monthly forecast)

---

## Business Health Section

The Business Health Score is your business's "vital signs" - a quick health check that combines multiple factors into an easy-to-understand score out of 100.

### Understanding Your Health Score

#### Score Ranges
- **85-100**: 🚀 **LEGEND** - Crushing your targets! Business is thriving.
- **70-84**: ⭐ **CHAMPION** - Strong performance. Keep the momentum.
- **50-69**: 📊 **BUILDER** - Building your business. Room to improve.
- **0-49**: 🎯 **STARTER** - Focus needed. Actionable steps below.

#### The Four Health Pillars (25 points each)

### 1. Total Profit Health (Rolling 30d) - 25 points

**What It Measures:** Your ability to generate sustainable profit through effective revenue streams.

**Time Window:** Rolling 30 days (e.g., Aug 18 - Sept 17)

**Components:**
- **Subscriber Growth** (6 pts) - *Only for SaaS businesses*
  - Tracks monthly active users vs target
  - Example: 10 users / 15 target = 66.7% = 4 points

- **Revenue Diversification** (3 pts) - *Only for hybrid businesses*
  - Balance between time-based and subscription revenue
  - Target: 30% subscription, 70% time-based
  - Example: 20% subscription = 2.7 points (close to optimal)

- **Pricing Efficiency** (4 pts) - *For time-based work*
  - Actual hourly rate vs target rate
  - Example: €76.58 actual / €75 target = 102% = 4 points

- **Rate Optimization** (3 pts) - *For time-based work*
  - How much time-based revenue contributes to monthly goal
  - Example: €8,577 / €12,000 target = 71.5% = 2.15 points

- **Time Utilization** (6 pts)
  - How well you use your working hours
  - Tracks hours progress, billing efficiency, consistency
  - Example: 112h tracked, 90% billable = 5.5 points

- **Revenue Quality** (4 pts)
  - How quickly you convert work to cash
  - Tracks collection rate, invoicing speed, payment quality
  - Example: 85% invoiced, minimal overdue = 3.6 points

**Real-World Example:**
```
September 17, 2025 (Rolling 30 days: Aug 18 - Sept 17)

Time-Based Revenue: €8,577.50 (112 billable hours @ €76.58/h)
Subscription Revenue: €500 (10 users @ €50/month)
Total Revenue: €9,077.50

Monthly Target: €12,000
Costs: €5,000
Current Profit: €4,077.50 (34% margin)

Profit Health Score: 22/25 (88%)
Status: Strong performance ✓
```

**What This Tells You:**
- You're billing at above target rate (€76.58 vs €75)
- You're on track for €12,103 monthly revenue (full 30 days)
- Your profit margin is healthy at 34%
- Revenue diversification is building (5.5% subscription)

---

### 2. Cash Flow Health (25 points)

**What It Measures:** How quickly you collect payments and manage outstanding invoices.

**Time Window:** Current snapshot (not rolling)

**Components:**
- **Collection Speed** (15 pts) - Days Invoice Overdue (DIO)
  - **Excellent**: 0 days overdue (paid on time) = 15 pts
  - **Good**: 1-7 days overdue = 12 pts
  - **Fair**: 8-15 days overdue = 8 pts
  - **Poor**: 16-30 days overdue = 3 pts
  - **Critical**: >30 days overdue = 0 pts

- **Volume Efficiency** (5 pts) - Number of overdue invoices
  - **Excellent**: 0 invoices overdue = 5 pts
  - **Good**: 1-2 invoices overdue = 3 pts
  - **Fair**: 3-4 invoices overdue = 1 pt
  - **Poor**: 5+ invoices overdue = 0 pts

- **Absolute Amount Control** (5 pts) - Total overdue amount
  - **Excellent**: €0 overdue = 5 pts
  - **Good**: €1-€3,000 overdue = 3 pts
  - **Fair**: €3,001-€6,000 overdue = 1 pt
  - **Poor**: €6,000+ overdue = 0 pts

**Real-World Example:**
```
Current Status: September 17, 2025

Outstanding Invoices: 2 invoices
Outstanding Amount: €1,200
Oldest Overdue: 5 days past due date
Payment Terms: 30 days

DIO Score: 12/15 (5 days overdue = Good)
Volume Score: 3/5 (2 invoices = Good)
Amount Score: 3/5 (€1,200 = Good)

Cash Flow Health Score: 18/25 (72%)
Status: Healthy collections ✓
```

**What This Tells You:**
- Most clients pay on time or close to it
- Only 2 invoices need follow-up
- Oldest invoice is only 5 days overdue (not critical)
- Action: Send friendly reminder to 2 clients

**Why This Matters:**
Cash flow is the lifeblood of your business. Even if you're profitable, poor cash flow can cause problems. This score helps you catch payment issues early before they become critical.

---

### 3. Efficiency Health (Rolling 30d) - 25 points

**What It Measures:** How effectively you use your time and convert it to billable work.

**Time Window:** Rolling 30 days (e.g., Aug 18 - Sept 17)

**Components:**
- **Billable Ratio** (4 pts) - Billable hours / Total hours
  - Target: 75%+ billable
  - Example: 112h billable / 127h total = 88% = 4 points

- **Hours Progress** (6 pts) - Total hours vs monthly target
  - Target: 160h per month
  - Example: 127h / 160h = 79% = 4.75 points

- **Daily Consistency** (3 pts) - Average hours per working day
  - Target: 8h per day
  - Example: 127h / 22 working days = 5.8h/day = 2.3 points

- **Billing Efficiency** (2.1 pts) - How quickly you invoice work
  - Tracks: Invoiced vs unbilled work
  - Example: 85% invoiced, 15% unbilled = 1.8 points

**Real-World Example:**
```
September 17, 2025 (Rolling 30 days: Aug 18 - Sept 17)

Total Hours Tracked: 127h
Billable Hours: 112h (88%)
Non-Billable: 15h (12% admin/training)
Unbilled Hours: 18h

Working Days: 22 days
Daily Average: 5.8h/day
Monthly Target: 160h

Billable Ratio: 4/4 pts (88% vs 75% target)
Hours Progress: 4.75/6 pts (127h vs 160h)
Daily Consistency: 2.3/3 pts (5.8h vs 8h target)
Billing Efficiency: 1.8/2.1 pts (85% invoiced)

Efficiency Health Score: 23/25 (92%)
Status: Great momentum ✓
```

**What This Tells You:**
- You're highly efficient (88% of time is billable)
- You're tracking 5.8 hours per day (solid performance)
- 18 hours of work needs to be invoiced soon
- On track for 169 hours this month (above target)

**Common Misconceptions:**
- ❌ "More hours = better score" - Not true! Quality over quantity.
- ❌ "100% billable is best" - Not realistic. Some admin time is healthy.
- ✅ "75%+ billable is excellent" - This is industry standard.
- ✅ "Consistency matters more than total hours" - True! Steady work is sustainable.

---

### 4. Risk Management Health (25 points)

**What It Measures:** Potential threats to your business continuity and stability.

**Time Window:** Rolling 30 days with trend analysis

**Components:**
- **Client Concentration Risk** (9 pts) - Dependency on single clients
  - **Low Risk**: <30% revenue from top client = 9 pts
  - **Medium Risk**: 30-50% from top client = 6 pts
  - **High Risk**: 50-80% from top client = 3 pts
  - **Very High Risk**: >80% from top client = 0 pts

- **Business Continuity Risk** (8 pts) - Revenue stability trends
  - Revenue Stability (3 pts): Current vs previous 30 days
  - Client Concentration Trend (2.5 pts): Improving or worsening
  - Consistency Trend (2.5 pts): Work pattern stability

- **Daily Consistency Risk** (8 pts) - Work pattern predictability
  - Actual daily hours vs target
  - Days per week worked vs target
  - Example: 5.8h/day, 5 days/week = 6 points

**Real-World Example:**
```
September 17, 2025 (Rolling 30 days: Aug 18 - Sept 17)

Top Client Revenue: €2,400 / €8,577 = 28%
Client Concentration: Low Risk (9 points)

Revenue Trend:
- Current 30 days: €8,577
- Previous 30 days: €8,100
- Growth: +5.9% = Stable (3 points)

Work Pattern:
- Daily Average: 5.8h/day (target: 8h)
- Days Worked: 22 days (expected: 22 days)
- Consistency: Good (6 points)

Risk Management Health Score: 20/25 (80%)
Status: Well protected ✓
```

**What This Tells You:**
- Your business is not overly dependent on one client
- Revenue is growing steadily (healthy trend)
- Work pattern is consistent and sustainable
- Low risk of sudden revenue loss

**Risk Mitigation Tips:**
- **If concentration >50%**: Actively pursue 2-3 new clients
- **If revenue declining**: Review pricing and marketing
- **If work inconsistent**: Set daily hour targets and track them

---

### Business Health Action Items

The system provides **automatic recommendations** based on your score. These appear when you click "Health Report" and show:

1. **Priority Level**: High, Medium, or Low
2. **Potential Impact**: Points you can gain
3. **Effort Required**: Low, Medium, or High
4. **Timeframe**: Immediate, Weekly, or Monthly
5. **Specific Action Steps**: Exactly what to do

**Example Recommendations:**

```
🔴 HIGH PRIORITY (Impact: +3.2 points)

Title: Increase Billable Hour Rate
Current: €76.58/h | Target: €85/h | Gap: €8.42/h

Actions:
1. Review rates for new projects (immediate)
2. Communicate rate increase to existing clients (2-week notice)
3. Focus on high-value work (€90+/h opportunities)
4. Target: Reach €85/h average within 60 days

Potential Gain: 3.2 profit health points
```

---

## Dashboard Metrics Cards

The metric cards below Business Health track your **month-to-date (MTD)** progress toward monthly goals. These update in real-time as you work and invoice.

### Time Window Explained

**Current Month to Date (MTD)**
- Example: September 1-17 (17 days into the month)
- Updates every time you log time or create an invoice
- Resets on the 1st of each month

**Comparison Period**
- Previous Month MTD at same day
- Example: Compare Sept 1-17 vs Aug 1-17
- Fair apples-to-apples comparison

---

### Card 1: Revenue (MTD)

**What It Shows:** Total revenue from time-based work and subscriptions this month.

**Data Sources:**
- **Time-Based Revenue**: Hours × rates from time entries (billable only)
- **Subscription Revenue**: Monthly Active Users × Average Fee (full MRR)

**Key Metrics:**
- **Current Total**: Time + Subscription revenue
- **MTD Target**: Prorated monthly goal based on working days
- **Progress %**: Current / MTD Target
- **Trend**: vs previous month MTD (same day range)

**Example:**
```
Date: September 17, 2025 (17 days into month)

TIME-BASED REVENUE:
  80 billable hours @ €90/h = €7,200

SUBSCRIPTION REVENUE:
  10 active users @ €50/month = €500 MRR

TOTAL REVENUE: €7,700

MONTHLY TARGET: €12,000
MTD TARGET: €6,804 (17/30 × €12,000)

Progress: €7,700 / €6,804 = 113% ✓
Status: Above target! (+€896)

TREND vs Previous Month MTD:
  Aug 1-17: €6,950
  Sept 1-17: €7,700
  Change: +€750 (+10.8%) ↑
```

**What The Numbers Mean:**

**Status Indicator:**
- 🟢 **Green (100%+)**: On track or ahead of target
- 🟡 **Yellow (80-99%)**: Slightly behind but recoverable
- 🔴 **Red (<80%)**: Action needed to hit monthly goal

**Progress Bar:**
- Shows current revenue vs full monthly target (€12,000)
- Vertical line shows MTD target checkpoint (€6,804)
- If you're past the line = ahead of schedule ✓

**Breakdown (Bottom Stats):**
- **Time-based**: €7,200 (93.5% of total)
- **Subscriptions**: €500 (6.5% of total)

**Real-World Interpretation:**

"With 17 days into September, you've earned €7,700, which is 113% of where you should be at this point. You're €896 ahead of pace to hit your €12,000 monthly target. You're also 10.8% ahead of where you were at this same point in August."

**Action Items by Status:**

**🟢 Ahead (113% like example):**
- ✓ Keep current momentum
- Consider: Take on stretch projects
- Watch: Don't overcommit and burn out

**🟡 Behind (85% example):**
- Review: Which clients/projects can you invoice?
- Quick win: Invoice any completed work
- Look ahead: Line up work for remaining days

**🔴 Critical (60% example):**
- Immediate: Review unbilled hours and invoice now
- Short-term: Reach out to clients for additional work
- Long-term: Review pricing and pipeline

---

### Card 2: Billable Hours (MTD)

**What It Shows:** Hours of billable work tracked this month (excludes non-billable admin/training time).

**Data Sources:**
- Time entries marked as "billable" (includes both invoiced and unbilled)
- Excludes non-billable entries (admin, training, internal meetings)

**Key Metrics:**
- **Current Billable Hours**: Total this month
- **MTD Target**: Based on working days completed
- **Progress %**: Current / MTD Target
- **Weekly Trend**: Change from last week

**Example:**
```
Date: September 17, 2025 (17 days into month)

BILLABLE HOURS: 80h
NON-BILLABLE HOURS: 15h (admin, training)
TOTAL TRACKED: 95h

MONTHLY TARGET: 160h
MTD TARGET: 106.25h (based on 12 working days Sept 1-16)

Progress: 80h / 106.25h = 75%
Status: On track but room to improve

WEEKLY TREND:
  Last week: 18h
  This week: 22h
  Change: +4h ↑

BREAKDOWN:
  Non-billable: 15h (16% of total)
  Unbilled: 12h (needs invoicing)
```

**MTD Target Calculation (Dynamic):**

The system calculates your MTD target based on **working days completed**, not calendar days.

```
Example: September 17 (Wednesday)

Working days Mon-Fri: Sept 1-16 = 12 working days
(Excludes: Sept 4-5 weekend, Sept 11-12 weekend)

Monthly target: 160h
Working days in full month: 22 days
Daily target: 160h / 22 = 7.27h/day

MTD target: 12 days × 7.27h = 87.2h

BUT system shows 106.25h because user's target is higher
User's settings: 8h/day × 5 days/week
```

**Progress Bar:**
- Shows current hours vs full monthly target (160h)
- Vertical line shows MTD target checkpoint (106.25h)
- Fill color: Green (>100%), Yellow (75-100%), Blue (<75%)

**Status Indicators:**
- 🟢 **100%+ of MTD**: Exceeding pace
- 🟡 **75-99% of MTD**: On track
- 🔴 **<75% of MTD**: Behind schedule

**Real-World Interpretation:**

"You've tracked 80 billable hours so far this month, which is 75% of your 106.25h target at this point. You're working 5.8 hours per working day on average. With 15 hours of non-billable time, your billable ratio is 84% (good). You have 12 hours of completed but unbilled work."

**Common Questions:**

**Q: Why does my total hours (95h) not match the display (80h)?**
A: The card only shows billable hours. Your 15 hours of admin/training time is tracked but shown separately as "non-billable" to give you an accurate picture of revenue-generating work.

**Q: What's a good billable ratio?**
A: 75%+ is excellent. You're at 84%, which is very good. This means 84% of your time generates revenue, while 16% is necessary business admin.

**Q: Should I eliminate all non-billable time?**
A: No! Some non-billable time is healthy and necessary (training, admin, business development). Aim for 75-85% billable.

**Action Items by Status:**

**🟢 Ahead (120% of MTD):**
- ✓ Excellent pace
- Ensure: Quality isn't suffering
- Balance: Consider strategic non-billable time

**🟡 On Track (75-99% of MTD):**
- Monitor: Weekly hour targets
- Optimize: Reduce context switching
- Plan: Book sufficient billable work ahead

**🔴 Behind (<75% of MTD):**
- Immediate: Block time for focused work
- Review: Are there distractions to eliminate?
- Check: Is enough billable work available?

---

### Card 3: Average Hourly Rate (MTD)

**What It Shows:** Your average billable rate for work performed this month.

**Calculation:** Billable Revenue ÷ Billable Hours

**Data Sources:**
- Numerator: Time entry billable revenue (hours × rates)
- Denominator: Billable hours only (excludes non-billable time)

**Key Metrics:**
- **Current Rate**: This month's average
- **Target Rate**: Your goal hourly rate
- **Progress %**: Current / Target
- **Trend**: vs previous month's average

**Example:**
```
Date: September 17, 2025

BILLABLE REVENUE: €7,200 (from time entries)
BILLABLE HOURS: 80h

AVERAGE RATE: €7,200 / 80h = €90/h

TARGET RATE: €75/h
Progress: €90 / €75 = 120% ✓
Status: Exceeding target! (+€15/h)

TREND vs Previous Month:
  August: €75/h
  September: €90/h
  Change: +€15/h (+20%) ↑

BREAKDOWN:
  Billable Hours: 80h
  Billable Revenue: €7,200
  Effective Rate: €90/h
```

**Why This Calculation Method:**

We use **billable hours only** (not total hours) because:
1. Non-billable time doesn't generate revenue
2. Gives accurate picture of your value
3. Allows meaningful comparison to target rate

**Example of the difference:**
```
Using ALL HOURS (incorrect):
€7,200 / 95h total = €75.79/h ❌

Using BILLABLE HOURS (correct):
€7,200 / 80h billable = €90/h ✓

The 15 hours of admin/training shouldn't dilute your rate.
```

**Progress Bar:**
- Shows current rate vs target rate (€75/h baseline = 0%)
- Fill color changes: Blue (<80%), Yellow (80-99%), Green (100%+)

**Status Indicators:**
- 🟢 **€80+/h**: Excellent rate
- 🟡 **€60-79/h**: Good rate
- 🔴 **<€60/h**: Review pricing

**Real-World Interpretation:**

"Your average rate this month is €90/h, which is 20% higher than your €75/h target. This means you're delivering high-value work or have successfully raised your rates. You're also €15/h higher than last month, showing positive pricing momentum."

**What Affects Your Rate:**

**INCREASES Rate:**
- ✓ Premium clients/projects
- ✓ Specialized work
- ✓ Complex problem-solving
- ✓ Strategic consulting
- ✓ Rate increases

**DECREASES Rate:**
- ✗ Low-paying maintenance work
- ✗ Junior-level tasks
- ✗ "Favor" projects
- ✗ Old clients on outdated rates

**Optimization Strategies:**

**To Increase Your Rate:**

1. **Client Mix** (Immediate)
   - Focus on high-paying clients
   - Phase out low-rate work
   - Say no to below-rate projects

2. **Rate Increases** (2-3 months)
   - Raise rates for new projects now
   - Give existing clients 2-month notice
   - Target: +10-15% annually

3. **Value-Based Pricing** (Strategic)
   - Price by project value, not hours
   - Package services at flat rates
   - Charge for results, not time

4. **Specialization** (Long-term)
   - Deep expertise commands premium rates
   - Become known for specific valuable skill
   - Target high-value niches

**Rate Benchmarks by Experience:**
- Junior (0-2 years): €40-60/h
- Mid-Level (3-5 years): €60-85/h
- Senior (5-10 years): €85-125/h
- Expert (10+ years): €125-200/h
- Strategic Advisor: €200-400/h

---

### Card 4: Monthly Active Users (MTD)
*Only visible if subscription business model enabled*

**What It Shows:** Number of paying subscribers/users this month.

**Data Sources:**
- Platform subscription payments table
- Counts unique customers with paid status
- Full calendar month (not prorated)

**Key Metrics:**
- **Current MAU**: This month's active users
- **Target MAU**: Your subscriber goal
- **Progress %**: Current / Target
- **Growth %**: vs previous month

**Example:**
```
Date: September 17, 2025

MONTHLY ACTIVE USERS: 10
TARGET: 15 users

Progress: 10 / 15 = 67%
Status: Growing but below target

GROWTH TREND:
  August: 9 users
  September: 10 users
  Change: +1 user (+11%) ↑

Monthly MRR: 10 users × €50 = €500
```

**Why Full Month Count:**

MAU is counted for the **entire month**, not prorated by day:
- September 1: 10 users = €500 MRR
- September 17: 10 users = €500 MRR
- September 30: 10 users = €500 MRR

This is standard SaaS practice - MRR represents monthly recurring value.

**Status Indicators:**
- 🟢 **100%+ of target**: Exceeding subscriber goal
- 🟡 **80-99% of target**: Close to goal
- 🔴 **<80% of target**: Growth needed

**Growth Rate Interpretation:**
- **+20%+ growth**: 🚀 Hypergrowth (excellent)
- **+10-19% growth**: 📈 Strong growth
- **+5-9% growth**: ✓ Healthy growth
- **0-4% growth**: Steady state
- **Negative growth**: ⚠️ Churn issue

**Real-World Interpretation:**

"You have 10 active subscribers this month, up from 9 last month (+11% growth). You're 67% toward your 15-user target, generating €500 in monthly recurring revenue. At current growth rate (+1 user/month), you'll hit your target in 5 months."

---

### Card 5: Average Subscription Fee (MTD)
*Only visible if subscription business model enabled*

**What It Shows:** Average revenue per subscriber this month.

**Calculation:** Total Subscription Revenue ÷ Active Users

**Example:**
```
Date: September 17, 2025

TOTAL SUBSCRIPTION REVENUE: €500
ACTIVE USERS: 10

AVERAGE FEE: €500 / 10 = €50/user

TARGET: €75/user
Progress: €50 / €75 = 67%
Status: Below target pricing

GROWTH TREND:
  August: €45/user
  September: €50/user
  Change: +€5/user (+11%) ↑
```

**What Affects This Metric:**

**INCREASES Average Fee:**
- ✓ Users upgrading to premium plans
- ✓ Annual prepay discounts (amortized)
- ✓ Add-on purchases
- ✓ Price increases for new users

**DECREASES Average Fee:**
- ✗ New users on trial/discount
- ✗ Users downgrading plans
- ✗ Heavy discount promotions
- ✗ Grandfathered low rates

**Optimization Strategies:**

1. **Tiered Pricing** (Immediate)
   - Basic: €30/month
   - Pro: €50/month
   - Enterprise: €100/month
   - Push upgrades to higher tiers

2. **Value-Based Features** (Short-term)
   - Identify high-value features
   - Put premium features in higher tiers
   - Create upgrade incentives

3. **Annual Billing** (Medium-term)
   - Offer annual plans at 10-15% discount
   - Get cash upfront
   - Reduce churn

4. **Granular Usage** (Long-term)
   - Charge for usage/seats beyond base
   - Align pricing with customer value
   - Grow revenue with customer growth

---

## Understanding Your Numbers

### Common Scenarios & What They Mean

#### Scenario 1: High Health Score, Low MTD Progress

```
Business Health: 85/100 (Excellent)
Revenue Card: 45% of MTD target

What's happening?
- Your business is healthy long-term (30-day rolling)
- But this specific month started slow

Common causes:
- Seasonal slow start
- Vacation/holiday early in month
- Projects finishing end of last month

Action:
✓ Don't panic - health score is good
✓ Ramp up hours in remaining days
✓ Review: Can you invoice completed work?
```

#### Scenario 2: Low Health Score, High MTD Progress

```
Business Health: 55/100 (Builder)
Revenue Card: 120% of MTD target

What's happening?
- This month is going well
- But 30-day trend shows issues

Common causes:
- Great month hiding bigger trend problems
- Recent client win masking structural issues
- Payment timing luck

Action:
⚠️ Dig into health report recommendations
⚠️ Fix underlying issues while cash is good
⚠️ Don't let one good month hide problems
```

#### Scenario 3: Everything Low

```
Business Health: 45/100 (Starter)
Revenue Card: 50% of MTD target

What's happening?
- Both short and long-term challenges

Common causes:
- Pricing too low
- Not enough work booked
- Efficiency problems
- Collection issues

Action:
🔴 Click "Health Report" for specific actions
🔴 Focus on top 2-3 recommendations
🔴 Track daily progress
🔴 Consider: Is pricing too low?
```

#### Scenario 4: Everything High

```
Business Health: 90/100 (Legend)
Revenue Card: 115% of MTD target

What's happening?
- Business is thriving!

Opportunities:
✓ Can you raise rates?
✓ Is it sustainable? (check efficiency)
✓ Time to hire help?
✓ Invest in growth (tools, marketing)

Action:
- Maintain momentum
- Document what's working
- Consider strategic investments
- Don't burn out
```

---

### Weekly Check-In Workflow

**Every Monday Morning (5 minutes):**

1. **Check Business Health Score**
   - Is it moving up or down?
   - Read the status message
   - Note your "level" (Legend/Champion/Builder/Starter)

2. **Review MTD Progress**
   - Revenue: On track for monthly goal?
   - Hours: Hitting weekly target?
   - Rate: Above or below target?

3. **Identify Top Priority**
   - What's the lowest health pillar?
   - What's furthest from MTD target?
   - Focus there this week

4. **Set Weekly Goal**
   - Example: "Invoice 15 unbilled hours"
   - Example: "Log 40 billable hours this week"
   - Example: "Follow up on 2 overdue invoices"

**Every Friday Afternoon (5 minutes):**

1. **Review Week's Progress**
   - Did I hit my weekly goal?
   - How did MTD metrics change?
   - What worked well?

2. **Plan Next Week**
   - What do I need to focus on?
   - Are there any invoices to send?
   - Do I have enough work lined up?

---

### Month-End Best Practices

**Last Week of Month:**

1. **Invoice All Completed Work**
   - Don't carry unbilled hours into next month
   - Get invoices out before month-end
   - Follow up on pending approvals

2. **Review Financial Targets**
   - Will you hit monthly revenue goal?
   - If short: Can you accelerate any work?
   - If ahead: Bank the buffer

3. **Collection Push**
   - Send reminders on invoices due
   - Call on overdue invoices
   - Clear as much as possible before month rolls

4. **Plan Next Month**
   - Review business health recommendations
   - Set realistic goals for next month
   - Book work in advance

**First Week of New Month:**

1. **Clean Start**
   - All last month's work invoiced ✓
   - Outstanding collections in progress ✓
   - Health score reflects fresh 30 days

2. **Set Monthly Intentions**
   - Revenue goal: €X
   - Hours goal: Xh
   - Rate goal: €X/h
   - One improvement focus

---

## How to Use This Dashboard

### For Daily Decisions

**Question: "Should I take on this project?"**

Check:
1. **Rate Card**: Will this project's rate increase or decrease my average?
2. **Hours Card**: Do I have capacity this month?
3. **Business Health**: Is my efficiency sustainable?

Decision Framework:
- ✓ Yes if: Rate ≥ target, have capacity, efficiency good
- ⚠️ Maybe if: Rate slightly low but need volume
- ✗ No if: Rate significantly below target, already at capacity

**Question: "Should I follow up on that overdue invoice?"**

Check:
1. **Cash Flow Health**: How many days overdue?
2. **Amount**: Is it material (>€500)?

Action Framework:
- 🔴 Immediate call: >14 days or >€1,000
- 🟡 Friendly email: 7-14 days
- 🟢 Automated reminder: 1-7 days

**Question: "Am I on track this month?"**

Check:
1. **Revenue Card**: Progress % vs MTD target
2. **Hours Card**: Billable hours vs MTD target
3. **Business Health**: Overall trend

Interpretation:
- Both cards >100%: 🚀 Crushing it
- One card <100%: ⚠️ Focus area identified
- Both cards <80%: 🔴 Action needed

---

### For Weekly Planning

**Use the dashboard to answer:**

1. **How many hours should I work this week?**
   - Look at: Hours Card MTD target
   - Calculate: (Monthly target - Current hours) / Weeks remaining
   - Example: (160h - 80h) / 2 weeks = 40h per week needed

2. **What should my rate be for new projects?**
   - Look at: Rate Card current vs target
   - If below target: Quote higher to bring average up
   - If above target: You have room to be selective

3. **Which clients should I prioritize?**
   - Look at: Risk Management (client concentration)
   - If one client >50%: Prioritize diversification
   - If balanced: Prioritize highest rates

4. **When should I invoice?**
   - Look at: Efficiency billing efficiency score
   - If unbilled hours >20h: Invoice this week
   - If low: You're on top of it

---

### For Monthly Reviews

**End of month checklist:**

□ Compare actual vs target for all metrics
□ Identify which health pillar improved/declined most
□ Read and act on top 3 health recommendations
□ Set specific goals for next month
□ Review client mix (concentration risk)
□ Adjust rates if needed
□ Book sufficient work for next month

**Questions to reflect on:**

1. **Revenue**: Did I hit my target? If not, why?
2. **Efficiency**: Was my billable ratio sustainable?
3. **Cash Flow**: Did I collect payment promptly?
4. **Rate**: Did I maintain or improve my rate?
5. **Risk**: Is my business more or less stable?

---

### For Strategic Planning

**Quarterly Review (Every 3 Months):**

1. **Rate Progression**
   - Track: Last 3 months of average rates
   - Goal: +5-10% per quarter
   - Action: Raise rates or change client mix

2. **Revenue Diversification**
   - Track: Time-based vs subscription split
   - Goal: If applicable, build recurring revenue
   - Action: Launch productized service or SaaS

3. **Efficiency Trends**
   - Track: Last 3 months billable ratio
   - Goal: Maintain 75%+ consistently
   - Action: Systematize admin tasks

4. **Health Score Trend**
   - Track: Average health score last 3 months
   - Goal: Upward trend
   - Action: Focus on lowest pillar consistently

**Annual Review (Yearly):**

1. **Compare Year Over Year**
   - Revenue growth: Target 20-30%
   - Rate growth: Target 15-25%
   - Efficiency: Target maintain or improve

2. **Business Model Evolution**
   - Should you add subscription revenue?
   - Should you raise rates significantly?
   - Should you specialize further?

3. **Set Next Year Goals**
   - Based on: This year's health score breakdown
   - Focus: Top 2 pillars that need improvement
   - Targets: Specific, measurable, time-bound

---

### Tips for Maximum Benefit

**1. Track Time Religiously**
- Log time daily (not weekly)
- Categorize as billable/non-billable accurately
- Use detailed descriptions (helps with invoicing)

**2. Invoice Regularly**
- Weekly or bi-weekly for most businesses
- Don't batch invoices only at month-end
- Reduces unbilled hours metric

**3. Follow Up on Payments**
- Set calendar reminders for invoice due dates
- Send friendly reminder 3 days before due
- Call (don't email) for 14+ days overdue

**4. Review Dashboard Daily**
- Check progress toward daily targets
- Quick 2-minute morning routine
- Adjust workday based on status

**5. Act on Health Recommendations**
- Don't just read them - do them
- Pick top 1-2 recommendations
- Track progress weekly

---

### Common Mistakes to Avoid

**❌ Only checking dashboard at month-end**
- Too late to correct course
- Causes stress and panic
- ✓ Fix: Check daily or at least weekly

**❌ Ignoring cash flow score**
- "I'll collect later" mindset
- Leads to cash crunches
- ✓ Fix: Act on overdue invoices immediately

**❌ Mixing billable and non-billable time**
- Dilutes your rate
- Hides true efficiency
- ✓ Fix: Track categories accurately

**❌ Comparing wrong time periods**
- "Why are my numbers different?"
- Causes confusion
- ✓ Fix: Understand rolling 30-day vs MTD

**❌ Chasing perfect 100 health score**
- Unrealistic and causes stress
- 85+ is excellent
- ✓ Fix: Focus on consistent improvement

**❌ Not acting on recommendations**
- Dashboard becomes just "data"
- Miss improvement opportunities
- ✓ Fix: Take action on top 3 recommendations

---

# For Technical Developers

## Architecture Overview

The Business Health & Dashboard Metrics system is built on a dual-window architecture designed to provide both tactical (MTD) and strategic (rolling 30-day) business insights.

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                       │
│  unified-financial-dashboard.tsx (Main Component)      │
│  - Business Health Display                             │
│  - Metric Cards Display                                │
│  - Real-time Updates                                   │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│              Business Logic Layer                       │
│  health-score-engine.ts (Scoring Calculations)         │
│  - ProfitScoreCalculator                              │
│  - CashFlowScoreCalculator                            │
│  - EfficiencyScoreCalculator                          │
│  - RiskScoreCalculator                                │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│                   API Layer                            │
│  /api/time-entries/stats (Time Tracking Data)         │
│  /api/invoices/dashboard-metrics (Invoice Data)       │
│  /api/financial/client-revenue (Client Distribution)  │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│                  Data Layer                            │
│  Supabase Database                                     │
│  - time_entries (Time tracking with RLS)              │
│  - invoices (Invoice data with RLS)                   │
│  - platform_subscription_payments (SaaS metrics)      │
│  - profiles (User configuration & targets)            │
└─────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Separation of Concerns**
   - Data fetching (API layer)
   - Business logic (Calculators)
   - Presentation (React components)

2. **Single Source of Truth**
   - Supabase database is authoritative
   - All calculations derive from DB state
   - No client-side caching of business logic

3. **Tenant Isolation**
   - Row-Level Security (RLS) policies
   - All queries filtered by `tenant_id`
   - No cross-tenant data leakage

4. **Real-Time Updates**
   - Supabase real-time subscriptions
   - Optimistic UI updates
   - Automatic re-calculation on data changes

5. **Extensibility**
   - Modular calculator classes
   - Plugin-based recommendation system
   - Easy to add new metrics

---

## Data Flow

### High-Level Flow

```
User Action (Log Time/Create Invoice)
  ↓
Database Insert (via API)
  ↓
Real-time Subscription Triggers
  ↓
Frontend Re-fetches Data
  ↓
Health Score Engine Calculates
  ↓
UI Updates (Business Health + Cards)
```

### Detailed Flow: Time Entry Creation

```typescript
1. User logs 2 hours of billable work @ €90/h
   POST /api/time-entries
   {
     tenant_id: "uuid",
     hours: 2,
     hourly_rate: 90,
     billable: true,
     entry_date: "2025-09-17"
   }

2. API validates and inserts to time_entries table
   Supabase RLS checks tenant_id ownership

3. Real-time subscription fires
   useRealtimeDashboard() hook detects change

4. Frontend re-fetches time stats
   GET /api/time-entries/stats

5. API calculates:
   - thisMonth.billableHours: 82h (was 80h, +2h)
   - thisMonth.billableRevenue: €7,380 (was €7,200, +€180)
   - rolling30Days.current.billableHours: 114h (was 112h)
   - rolling30Days.current.billableRevenue: €8,757.50

6. Frontend receives updated data
   timeStats state updates

7. useMemo hooks recalculate:
   - mtdComparison: €7,880 current (was €7,700)
   - rateComparison: €90/h rate (unchanged)
   - Health scores recalculate

8. UI updates:
   - Hours Card: 82h (was 80h)
   - Revenue Card: €7,880 (was €7,700)
   - Rate Card: €90/h (unchanged)
   - Business Health: Efficiency +0.2 pts
   - Progress bars animate
```

### Data Dependencies

```mermaid
graph TD
    A[time_entries] --> B[/api/time-entries/stats]
    C[invoices] --> D[/api/invoices/dashboard-metrics]
    E[platform_subscription_payments] --> B
    F[profiles] --> G[useProfitTargets]

    B --> H[timeStats]
    D --> I[dashboardMetrics]
    G --> J[profitTargets]

    H --> K[health-score-engine.ts]
    I --> K
    J --> K

    K --> L[healthScoreResults]
    L --> M[unified-financial-dashboard.tsx]
    H --> M
    I --> M
```

---

## API Endpoints

### 1. Time Entries Stats API

**Endpoint:** `GET /api/time-entries/stats`

**Purpose:** Provides comprehensive time tracking statistics for both rolling 30-day (Business Health) and MTD (Cards) calculations.

**Authentication:** Clerk session required

**Authorization:** Supabase RLS policies (tenant_id isolation)

**Response Structure:**

```typescript
interface TimeStatsResponse {
  success: boolean
  data: {
    thisWeek: {
      hours: number          // Total hours this week
      difference: number     // Change from last week
      trend: 'positive' | 'negative'
    }
    thisMonth: {
      hours: number                // Total hours MTD
      revenue: number              // Total revenue MTD (all entries)
      billableHours: number        // Billable hours MTD
      billableRevenue: number      // Revenue from billable entries only
      nonBillableHours: number     // Non-billable hours MTD
      distinctWorkingDays: number  // Days with time entries
    }
    previousMonthMTD: {
      hours: number                // Total hours same day last month
      billableHours: number        // Billable hours same day last month
      billableRevenue: number      // Billable revenue same day last month
    }
    unbilled: {
      hours: number                // Unbilled billable hours
      revenue: number              // Unbilled billable revenue
    }
    projects: {
      count: number                // Unique projects worked on
      clients: number              // Unique clients
    }
    subscription: {
      monthlyActiveUsers: {
        current: number            // This month's MAU
        previous: number           // Last month's MAU
        growth: number             // % growth
        trend: 'positive' | 'negative' | 'neutral'
      }
      averageSubscriptionFee: {
        current: number            // This month's avg fee
        previous: number           // Last month's avg fee
        growth: number             // % growth
        trend: 'positive' | 'negative' | 'neutral'
      }
    }
    rolling30Days: {
      current: {
        billableRevenue: number
        distinctWorkingDays: number
        totalHours: number
        dailyHours: number
        billableHours: number
        nonBillableHours: number
        unbilledHours: number
        unbilledValue: number
      }
      previous: {
        // Same structure for days 31-60
      }
    }
  }
}
```

**Key Queries:**

```typescript
// Current month (MTD)
const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

const { data: thisMonthEntries } = await supabaseAdmin
  .from('time_entries')
  .select('hours, hourly_rate, effective_hourly_rate, billable')
  .eq('tenant_id', profile.tenant_id)
  .gte('entry_date', currentMonthStart.toISOString().split('T')[0])
  .lte('entry_date', currentMonthEnd.toISOString().split('T')[0])

// Previous month MTD (same day range)
const currentDay = now.getDate()
const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
const previousMonthMTDEnd = new Date(
  now.getFullYear(),
  now.getMonth() - 1,
  Math.min(currentDay, new Date(now.getFullYear(), now.getMonth(), 0).getDate())
)

const { data: previousMonthMTDEntries } = await supabaseAdmin
  .from('time_entries')
  .select('hours, hourly_rate, effective_hourly_rate, billable')
  .eq('tenant_id', profile.tenant_id)
  .gte('entry_date', previousMonthStart.toISOString().split('T')[0])
  .lte('entry_date', previousMonthMTDEnd.toISOString().split('T')[0])

// Rolling 30 days (Business Health)
const last30DaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

const { data: current30DaysEntries } = await supabaseAdmin
  .from('time_entries')
  .select('hours, hourly_rate, effective_hourly_rate, billable, entry_date')
  .eq('tenant_id', profile.tenant_id)
  .gte('entry_date', last30DaysStart.toISOString().split('T')[0])
  .lte('entry_date', now.toISOString().split('T')[0])
```

**Calculation Examples:**

```typescript
// Billable hours for this month
const thisMonthBillableHours = thisMonthEntries
  ?.filter(entry => entry.billable === true || entry.billable === null)
  .reduce((sum, entry) => sum + entry.hours, 0) || 0

// Billable revenue for this month (time-based)
const thisMonthBillableRevenue = thisMonthEntries
  ?.filter(entry => entry.billable === true || entry.billable === null)
  .reduce((sum, entry) => {
    const effectiveRate = entry.effective_hourly_rate || entry.hourly_rate || 0
    return sum + (entry.hours * effectiveRate)
  }, 0) || 0

// Previous month MTD billable revenue
const previousMonthMTDBillableRevenue = previousMonthMTDEntries
  ?.filter(entry => entry.billable === true || entry.billable === null)
  .reduce((sum, entry) => {
    const effectiveRate = entry.effective_hourly_rate || entry.hourly_rate || 0
    return sum + (entry.hours * effectiveRate)
  }, 0) || 0
```

**Performance Considerations:**

- Uses indexed fields (`tenant_id`, `entry_date`)
- Limited date ranges (not scanning entire table)
- RLS policies optimized with indexes
- Response cached for 30 seconds on client
- Queries run in parallel via `Promise.all()`

**Error Handling:**

```typescript
try {
  const { data, error } = await supabaseAdmin.from('time_entries').select(...)
  if (error) throw error

  // Process data...

  return NextResponse.json(createApiResponse(stats, 'Success'))
} catch (error) {
  console.error('Time statistics error:', error)
  return NextResponse.json(ApiErrors.InternalError, {
    status: ApiErrors.InternalError.status
  })
}
```

---

### 2. Invoice Dashboard Metrics API

**Endpoint:** `GET /api/invoices/dashboard-metrics`

**Purpose:** Provides invoice-related metrics for cash flow health calculations.

**Response Structure:**

```typescript
interface DashboardMetricsResponse {
  success: boolean
  data: {
    totale_registratie: number      // Total invoiced amount MTD
    achterstallig: number            // Overdue amount
    achterstallig_count: number      // Overdue invoice count
    factureerbaar: number            // Billable but not invoiced
    factureerbaar_count: number      // Unbilled invoice count
    actual_dso: number               // Days Sales Outstanding
    actual_dio: number               // Days Invoice Overdue
    average_payment_terms: number    // Avg payment terms (days)
    average_dri: number              // Days Revenue in Invoices
    rolling30DaysRevenue: {
      current: number                // Invoiced amount last 30 days
      previous: number               // Invoiced amount days 31-60
    }
  }
}
```

**Key Metrics Calculation:**

```typescript
// Days Invoice Overdue (DIO)
// Measures: Days past payment terms for oldest overdue invoice

const overdueInvoices = await supabaseAdmin
  .from('invoices')
  .select('invoice_date, payment_terms, amount')
  .eq('tenant_id', tenantId)
  .eq('status', 'sent')
  .lt('due_date', now.toISOString())

const oldestOverdueInvoice = overdueInvoices
  .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0]

const daysOverdue = oldestOverdueInvoice
  ? Math.floor((now - new Date(oldestOverdueInvoice.due_date)) / (1000 * 60 * 60 * 24))
  : 0

// Rolling 30-day invoiced revenue
const rolling30DaysRevenue = await supabaseAdmin
  .from('invoices')
  .select('total_amount')
  .eq('tenant_id', tenantId)
  .in('status', ['sent', 'paid'])
  .gte('invoice_date', last30DaysStart.toISOString().split('T')[0])
  .lte('invoice_date', now.toISOString().split('T')[0])
```

---

### 3. Client Revenue API

**Endpoint:** `GET /api/financial/client-revenue`

**Purpose:** Provides client revenue distribution for risk calculations.

**Response Structure:**

```typescript
interface ClientRevenueResponse {
  success: boolean
  data: {
    topClient: {
      name: string
      revenueShare: number          // % of total revenue
    }
    rolling30DaysComparison: {
      current: {
        topClientShare: number      // % last 30 days
        totalRevenue: number
      }
      previous: {
        topClientShare: number      // % days 31-60
        totalRevenue: number
      }
    }
  }
}
```

**Calculation:**

```typescript
// Get client revenue for rolling 30 days
const clientRevenue = await supabaseAdmin
  .from('time_entries')
  .select('client_id, hours, hourly_rate, effective_hourly_rate')
  .eq('tenant_id', tenantId)
  .eq('billable', true)
  .gte('entry_date', last30DaysStart.toISOString().split('T')[0])
  .lte('entry_date', now.toISOString().split('T')[0])

// Aggregate by client
const clientTotals = clientRevenue.reduce((acc, entry) => {
  const clientId = entry.client_id
  const rate = entry.effective_hourly_rate || entry.hourly_rate || 0
  const revenue = entry.hours * rate

  acc[clientId] = (acc[clientId] || 0) + revenue
  return acc
}, {})

// Find top client
const totalRevenue = Object.values(clientTotals).reduce((sum, r) => sum + r, 0)
const topClientRevenue = Math.max(...Object.values(clientTotals))
const topClientShare = (topClientRevenue / totalRevenue) * 100
```

---

## Component Structure

### Main Dashboard Component

**File:** `src/components/dashboard/unified-financial-dashboard.tsx`

**Responsibilities:**
1. Fetch all data sources (parallel requests)
2. Calculate derived metrics (MTD comparison, rate comparison)
3. Pass data to health score engine
4. Render Business Health section
5. Render metric cards
6. Handle user interactions (modals, explanations)

**Component Hierarchy:**

```
UnifiedFinancialDashboard
├── BusinessHealthSection (Collapsible)
│   ├── HealthScoreDisplay (85/100)
│   ├── HealthScoreCards (4 pillars × 25pts)
│   │   ├── ProfitHealthCard
│   │   ├── CashFlowHealthCard
│   │   ├── EfficiencyHealthCard
│   │   └── RiskHealthCard
│   └── HealthReportButton
│
├── MetricCardsGrid
│   ├── RevenueCard (MTD)
│   ├── BillableHoursCard (MTD)
│   ├── AverageRateCard (MTD)
│   ├── MonthlyActiveUsersCard (conditional)
│   └── AvgSubscriptionFeeCard (conditional)
│
├── HealthScoreHierarchicalTree (Modal)
├── CalculationDetailModal
└── HealthReportModal
```

**State Management:**

```typescript
// Data states
const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null)
const [timeStats, setTimeStats] = useState<TimeStats | null>(null)
const [revenueTrend, setRevenueTrend] = useState<RevenueTrend[] | null>(null)
const [clientRevenue, setClientRevenue] = useState<ClientRevenue | null>(null)

// UI states
const [loading, setLoading] = useState(true)
const [healthScoreOpen, setHealthScoreOpen] = useState(false)
const [showHealthReport, setShowHealthReport] = useState(false)
const [showExplanation, setShowExplanation] = useState<string | null>(null)

// Computed states (useMemo)
const profitTargets = useProfitTargets()
const mtdCalculations = useMemo(() => { /* ... */ }, [profitTargets])
const mtdComparison = useMemo(() => { /* ... */ }, [timeStats, mtdCalculations])
const rateComparison = useMemo(() => { /* ... */ }, [timeStats, revenueTrend])
const healthScores = useMemo(() => { /* ... */ }, [healthScoreResults])
```

**Data Fetching:**

```typescript
const fetchAllData = async () => {
  try {
    setLoading(true)

    // Parallel fetch of all required data
    const [
      dashboardResponse,
      timeResponse,
      todayResponse,
      revenueTrendResponse,
      clientRevenueResponse
    ] = await Promise.all([
      fetch('/api/invoices/dashboard-metrics'),
      fetch('/api/time-entries/stats'),
      fetch('/api/time-entries/today'),
      fetch('/api/financial/revenue-trend?period=12'),
      fetch('/api/financial/client-revenue')
    ])

    // Parse responses
    const dashboardData = await dashboardResponse.json()
    const timeData = await timeResponse.json()
    const todayData = await todayResponse.json()
    const trendData = await revenueTrendResponse.json()
    const clientData = await clientRevenueResponse.json()

    // Update states
    setDashboardMetrics(dashboardData.data)
    setTimeStats(timeData.data)
    setRevenueTrend(trendData.data)
    setClientRevenue(clientData.data)

  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    toast.error('Failed to load dashboard data')
  } finally {
    setLoading(false)
  }
}

useEffect(() => {
  fetchAllData()
}, [])
```

**Real-Time Subscriptions:**

```typescript
// Using custom hook
const { metrics: realtimeMetrics } = useRealtimeDashboard()

useEffect(() => {
  if (realtimeMetrics) {
    // Merge real-time updates with existing data
    setDashboardMetrics(prev => ({
      ...prev,
      ...realtimeMetrics
    }))
  }
}, [realtimeMetrics])
```

---

### Health Score Engine

**File:** `src/lib/health-score-engine.ts`

**Purpose:** Centralized calculation engine for all health scores, explanations, and recommendations.

**Architecture:**

```typescript
// Input interface
export interface HealthScoreInputs {
  dashboardMetrics: DashboardMetrics
  timeStats: TimeStats
  mtdCalculations: MTDCalculations
  profitTargets: ProfitTargets
  clientRevenue: ClientRevenue
}

// Output interface
export interface HealthScoreOutputs {
  scores: {
    profit: number        // 0-25
    cashflow: number      // 0-25
    efficiency: number    // 0-25
    risk: number          // 0-25
    total: number         // 0-100
    totalRounded: number  // 0-100 (rounded)
  }
  breakdown: {
    profit: any
    cashflow: any
    efficiency: any
    risk: any
  }
  explanations: {
    profit: HealthExplanation
    cashflow: HealthExplanation
    efficiency: HealthExplanation
    risk: HealthExplanation
  }
  recommendations: {
    profit: HealthRecommendation[]
    cashflow: HealthRecommendation[]
    efficiency: HealthRecommendation[]
    risk: HealthRecommendation[]
  }
  insights: {
    topPriorities: string[]
    quickWins: string[]
    longTermGoals: string[]
  }
}

// Main engine class
export class HealthScoreEngine {
  private profitCalculator: ProfitScoreCalculator
  private cashFlowCalculator: CashFlowScoreCalculator
  private efficiencyCalculator: EfficiencyScoreCalculator
  private riskCalculator: RiskScoreCalculator

  constructor() {
    this.profitCalculator = new ProfitScoreCalculator()
    this.cashFlowCalculator = new CashFlowScoreCalculator()
    this.efficiencyCalculator = new EfficiencyScoreCalculator()
    this.riskCalculator = new RiskScoreCalculator()
  }

  calculate(inputs: HealthScoreInputs): HealthScoreOutputs {
    // Calculate each pillar
    const profitResult = this.profitCalculator.calculate(inputs)
    const cashFlowResult = this.cashFlowCalculator.calculate(inputs)
    const efficiencyResult = this.efficiencyCalculator.calculate(inputs)
    const riskResult = this.riskCalculator.calculate(inputs)

    // Aggregate scores
    const total = profitResult.score + cashFlowResult.score +
                  efficiencyResult.score + riskResult.score

    // Generate explanations
    const explanations = {
      profit: this.profitCalculator.generateExplanation(inputs, profitResult),
      cashflow: this.cashFlowCalculator.generateExplanation(inputs, cashFlowResult),
      efficiency: this.efficiencyCalculator.generateExplanation(inputs, efficiencyResult),
      risk: this.riskCalculator.generateExplanation(inputs, riskResult)
    }

    // Generate recommendations
    const recommendations = {
      profit: this.profitCalculator.generateRecommendations(inputs, profitResult.breakdown),
      cashflow: this.cashFlowCalculator.generateRecommendations(inputs, cashFlowResult.breakdown),
      efficiency: this.efficiencyCalculator.generateRecommendations(inputs, efficiencyResult.breakdown),
      risk: this.riskCalculator.generateRecommendations(inputs, riskResult.breakdown)
    }

    // Generate insights
    const insights = this.generateInsights(recommendations)

    return {
      scores: {
        profit: profitResult.score,
        cashflow: cashFlowResult.score,
        efficiency: efficiencyResult.score,
        risk: riskResult.score,
        total,
        totalRounded: Math.round(total)
      },
      breakdown: {
        profit: profitResult.breakdown,
        cashflow: cashFlowResult.breakdown,
        efficiency: efficiencyResult.breakdown,
        risk: riskResult.breakdown
      },
      explanations,
      recommendations,
      insights
    }
  }
}
```

**Calculator Classes:**

Each calculator follows the same interface:

```typescript
class [Pillar]ScoreCalculator {
  // Calculate score and breakdown
  calculate(inputs: HealthScoreInputs): {
    score: number
    breakdown: any
  }

  // Generate human-readable explanation
  generateExplanation(
    inputs: HealthScoreInputs,
    result: { score: number; breakdown: any }
  ): HealthExplanation

  // Generate actionable recommendations
  generateRecommendations(
    inputs: HealthScoreInputs,
    breakdown: any
  ): HealthRecommendation[]
}
```

**Example: Cash Flow Calculator**

```typescript
class CashFlowScoreCalculator {
  calculate(inputs: HealthScoreInputs): { score: number; breakdown: any } {
    const { dashboardMetrics } = inputs

    const overdueAmount = dashboardMetrics.achterstallig || 0
    const overdueCount = dashboardMetrics.achterstallig_count || 0
    const actualDIO = dashboardMetrics.actual_dio ?? this.calculateRealDIOFromData(overdueAmount, overdueCount)

    // DIO Score (15 points max)
    const dioScore = roundToOneDecimal(
      actualDIO <= 0 ? 15 :
      actualDIO <= 7 ? 12 :
      actualDIO <= 15 ? 8 :
      actualDIO <= 30 ? 3 : 0
    )

    // Volume Score (5 points max)
    const volumeScore = roundToOneDecimal(
      overdueCount === 0 ? 5 :
      overdueCount <= 2 ? 3 :
      overdueCount <= 4 ? 1 : 0
    )

    // Amount Score (5 points max)
    const absoluteAmountScore = roundToOneDecimal(
      overdueAmount === 0 ? 5 :
      overdueAmount <= 3000 ? 3 :
      overdueAmount <= 6000 ? 1 : 0
    )

    const finalScore = roundToOneDecimal(dioScore + volumeScore + absoluteAmountScore)

    return {
      score: finalScore,
      breakdown: {
        overdueAmount,
        overdueCount,
        dioEquivalent: actualDIO,
        scores: { dioScore, volumeScore, absoluteAmountScore }
      }
    }
  }

  generateExplanation(inputs, result): HealthExplanation {
    return {
      title: 'Cash Flow Health - Collection Focus (25 points)',
      score: result.score,
      maxScore: 25,
      details: [
        {
          type: 'metrics',
          title: 'Payment Collection Status',
          items: [
            {
              type: 'metric',
              label: 'Outstanding Amount',
              value: `€${result.breakdown.overdueAmount?.toLocaleString()}`,
              emphasis: result.breakdown.overdueAmount > 1000 ? 'secondary' : 'primary'
            },
            // ... more items
          ]
        },
        // ... more sections
      ]
    }
  }

  generateRecommendations(inputs, breakdown): HealthRecommendation[] {
    const recommendations: HealthRecommendation[] = []

    // Recommendation 1: Reduce DIO
    const speedPointsToGain = Math.max(0.1, 15 - (breakdown.scores?.dioScore || 0))

    recommendations.push({
      id: 'reduce-dio',
      priority: speedPointsToGain >= 5 ? 'high' : 'medium',
      impact: Math.round(speedPointsToGain * 10) / 10,
      effort: breakdown.dioEquivalent <= 7 ? 'low' : 'medium',
      timeframe: 'immediate',
      title: 'Reduce Days Invoice Overdue (DIO)',
      description: `Reduce DIO from ${breakdown.dioEquivalent.toFixed(1)} days to 0 days`,
      actionItems: [
        'Contact clients for payment commitment',
        'Implement proactive reminders',
        'Offer early payment incentives'
      ],
      metrics: {
        current: `${breakdown.dioEquivalent.toFixed(1)} days overdue`,
        target: '0 days (paid within terms)',
        pointsToGain: speedPointsToGain
      }
    })

    // ... more recommendations

    return recommendations
  }
}
```

---

## Calculations Reference

### MTD Calculations

**Purpose:** Calculate month-to-date targets based on working days.

**Location:** `unified-financial-dashboard.tsx` (useMemo hook)

```typescript
const mtdCalculations = useMemo(() => {
  const now = getCurrentDate()
  const currentDay = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthProgress = currentDay / daysInMonth

  // Monthly revenue target (time + subscription)
  const monthlyRevenueTarget = profitTargets ?
    (() => {
      const timeBasedRevenue = (profitTargets.monthly_hours_target > 0 && profitTargets.target_hourly_rate > 0) ?
        profitTargets.monthly_hours_target * profitTargets.target_hourly_rate : 0

      const subscriptionRevenue = (profitTargets.target_monthly_active_users > 0 && profitTargets.target_avg_subscription_fee > 0) ?
        profitTargets.target_monthly_active_users * profitTargets.target_avg_subscription_fee : 0

      return timeBasedRevenue + subscriptionRevenue
    })()
    : 12000 // Fallback

  // Simple prorated MTD revenue target
  const mtdRevenueTarget = monthlyRevenueTarget * monthProgress

  // Dynamic hours target based on working days
  const monthlyHoursTarget = profitTargets?.monthly_hours_target || 160
  const workingDays = profitTargets?.target_working_days_per_week || [1, 2, 3, 4, 5]

  // Calculate yesterday (we measure progress up to yesterday, not today)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  startOfMonth.setHours(0, 0, 0, 0)

  // Expected working days up to yesterday
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

  // Calculate total expected working days in full month
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  endOfMonth.setHours(23, 59, 59, 999)

  let expectedWorkingDaysInMonth = 0
  currentDate = new Date(startOfMonth)
  while (currentDate <= endOfMonth) {
    const dayOfWeek = currentDate.getDay()
    const isoWeekday = dayOfWeek === 0 ? 7 : dayOfWeek
    if (workingDays.includes(isoWeekday)) {
      expectedWorkingDaysInMonth++
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Calculate MTD hours target
  const dailyHoursTarget = monthlyHoursTarget / expectedWorkingDaysInMonth
  const mtdHoursTarget = dailyHoursTarget * expectedWorkingDaysUpToYesterday

  return {
    currentDay,
    daysInMonth,
    monthProgress,
    monthlyRevenueTarget,
    mtdRevenueTarget,
    monthlyHoursTarget,
    mtdHoursTarget,
    expectedWorkingDaysUpToYesterday,
    expectedWorkingDaysInMonth
  }
}, [profitTargets])
```

**Example Calculation:**

```
Date: September 17, 2025 (Wednesday)

Calendar Days:
- Current day: 17
- Days in month: 30
- Month progress: 17/30 = 56.7%

Working Days (Mon-Fri):
- Sept 1-16 (yesterday): 12 working days
  (Excludes weekends: 4-5, 11-12)
- Sept 1-30 (full month): 22 working days

Revenue Target:
- Monthly: €12,000
- MTD (simple): €12,000 × 56.7% = €6,804

Hours Target:
- Monthly: 160h
- Daily: 160h / 22 days = 7.27h/day
- MTD: 7.27h × 12 days = 87.2h

Note: MTD hours target is based on working days completed (yesterday),
not including today since the day isn't over yet.
```

---

### MTD Comparison

**Purpose:** Compare current month MTD performance vs previous month MTD (same day range).

**Location:** `unified-financial-dashboard.tsx` (useMemo hook)

```typescript
const mtdComparison = useMemo(() => {
  if (!timeStats || !timeStats.thisMonth || !timeStats.previousMonthMTD) {
    return {
      current: 0,
      previous: 0,
      difference: 0,
      trend: 'neutral' as const,
      percentageChange: 0
    }
  }

  // Current month MTD: billable time revenue + MRR
  const currentMonthBillableRevenue = timeStats.thisMonth.billableRevenue || 0
  const currentMonthSubscriptionRevenue =
    (timeStats?.subscription?.monthlyActiveUsers?.current || 0) *
    (timeStats?.subscription?.averageSubscriptionFee?.current || 0)
  const currentMTD = currentMonthBillableRevenue + currentMonthSubscriptionRevenue

  // Previous month MTD (same day range): billable time revenue + MRR
  const previousMonthBillableRevenue = timeStats.previousMonthMTD.billableRevenue || 0
  const previousMonthSubscriptionRevenue =
    (timeStats?.subscription?.monthlyActiveUsers?.previous || 0) *
    (timeStats?.subscription?.averageSubscriptionFee?.previous || 0)
  const previousMTD = previousMonthBillableRevenue + previousMonthSubscriptionRevenue

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

**Example:**

```
Date: September 17, 2025

CURRENT MONTH (Sept 1-17):
- Billable time revenue: €7,200 (80h @ €90/h)
- Subscription revenue: €500 (10 users @ €50)
- Total: €7,700

PREVIOUS MONTH (Aug 1-17, same day range):
- Billable time revenue: €6,500 (75h @ €86.67/h)
- Subscription revenue: €450 (9 users @ €50)
- Total: €6,950

COMPARISON:
- Difference: €7,700 - €6,950 = +€750
- % Change: (€750 / €6,950) × 100 = +10.8%
- Trend: Positive ↑
```

---

### Rate Comparison

**Purpose:** Compare current MTD average rate vs previous full month average rate.

**Location:** `unified-financial-dashboard.tsx` (useMemo hook)

```typescript
const rateComparison = useMemo(() => {
  if (!revenueTrend || revenueTrend.length < 2 || !timeStats?.thisMonth.billableHours) {
    return {
      current: 0,
      previous: 0,
      difference: 0,
      trend: 'neutral' as const,
      percentageChange: 0
    }
  }

  const currentMonth = revenueTrend[revenueTrend.length - 1]
  const previousMonth = revenueTrend[revenueTrend.length - 2]

  // Current rate = current billable revenue / current billable hours
  const currentRate = timeStats.thisMonth.billableHours > 0 ?
    (timeStats.thisMonth.billableRevenue || 0) / timeStats.thisMonth.billableHours : 0

  // Previous rate = previous month total time revenue / total hours
  const previousRate = previousMonth.totalHours > 0 ?
    previousMonth.timeRevenue / previousMonth.totalHours : 0

  const difference = currentRate - previousRate
  const percentageChange = previousRate > 0 ? (difference / previousRate) * 100 : 0

  return {
    current: currentRate,
    previous: previousRate,
    difference,
    trend: difference >= 0 ? 'positive' as const : 'negative' as const,
    percentageChange
  }
}, [revenueTrend, timeStats])
```

**Example:**

```
Date: September 17, 2025

CURRENT MONTH (Sept MTD):
- Billable revenue: €7,200
- Billable hours: 80h
- Rate: €7,200 / 80h = €90/h

PREVIOUS MONTH (August full month):
- Time revenue: €12,000
- Total hours: 160h
- Rate: €12,000 / 160h = €75/h

COMPARISON:
- Difference: €90 - €75 = +€15/h
- % Change: (€15 / €75) × 100 = +20%
- Trend: Positive ↑
```

---

## Testing Guidelines

### Unit Tests

**Test Calculator Logic:**

```typescript
// src/__tests__/unit/health-score-engine.test.ts

describe('CashFlowScoreCalculator', () => {
  let calculator: CashFlowScoreCalculator

  beforeEach(() => {
    calculator = new CashFlowScoreCalculator()
  })

  test('calculates perfect score for no overdue invoices', () => {
    const inputs = {
      dashboardMetrics: {
        achterstallig: 0,
        achterstallig_count: 0,
        actual_dio: 0
      }
    }

    const result = calculator.calculate(inputs)

    expect(result.score).toBe(25)
    expect(result.breakdown.scores.dioScore).toBe(15)
    expect(result.breakdown.scores.volumeScore).toBe(5)
    expect(result.breakdown.scores.absoluteAmountScore).toBe(5)
  })

  test('calculates score for moderate overdue', () => {
    const inputs = {
      dashboardMetrics: {
        achterstallig: 1200,
        achterstallig_count: 2,
        actual_dio: 5
      }
    }

    const result = calculator.calculate(inputs)

    expect(result.score).toBe(20) // 12 + 3 + 5
    expect(result.breakdown.scores.dioScore).toBe(12) // 5 days = good
    expect(result.breakdown.scores.volumeScore).toBe(3) // 2 invoices = good
    expect(result.breakdown.scores.absoluteAmountScore).toBe(5) // €1,200 = excellent
  })

  test('calculates DIO from data when actual_dio not provided', () => {
    const inputs = {
      dashboardMetrics: {
        achterstallig: 2500,
        achterstallig_count: 3,
        actual_dio: undefined
      }
    }

    const result = calculator.calculate(inputs)

    expect(result.breakdown.dioEquivalent).toBeGreaterThan(0)
    expect(result.breakdown.dioEquivalent).toBeLessThan(60)
  })
})
```

**Test API Endpoints:**

```typescript
// src/__tests__/integration/api/time-entries-stats.test.ts

describe('GET /api/time-entries/stats', () => {
  test('returns correct MTD billable revenue', async () => {
    // Setup: Create test time entries
    const entries = [
      { hours: 8, hourly_rate: 90, billable: true, entry_date: '2025-09-01' },
      { hours: 8, hourly_rate: 90, billable: true, entry_date: '2025-09-02' },
      { hours: 2, hourly_rate: 0, billable: false, entry_date: '2025-09-02' }
    ]

    await createTimeEntries(entries)

    // Execute
    const response = await fetch('/api/time-entries/stats')
    const data = await response.json()

    // Assert
    expect(data.data.thisMonth.billableHours).toBe(16)
    expect(data.data.thisMonth.billableRevenue).toBe(1440) // 16h × €90
    expect(data.data.thisMonth.nonBillableHours).toBe(2)
  })

  test('returns correct previous month MTD data', async () => {
    // Mock current date: Sept 17
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-09-17').getTime())

    // Setup: Create August time entries
    const entries = [
      { hours: 8, hourly_rate: 85, billable: true, entry_date: '2025-08-01' },
      { hours: 8, hourly_rate: 85, billable: true, entry_date: '2025-08-10' },
      { hours: 8, hourly_rate: 85, billable: true, entry_date: '2025-08-15' }
    ]

    await createTimeEntries(entries)

    // Execute
    const response = await fetch('/api/time-entries/stats')
    const data = await response.json()

    // Assert (should only include Aug 1-17)
    expect(data.data.previousMonthMTD.billableHours).toBe(24)
    expect(data.data.previousMonthMTD.billableRevenue).toBe(2040) // 24h × €85
  })
})
```

**Test Component Calculations:**

```typescript
// src/__tests__/unit/mtd-calculations.test.ts

describe('MTD Calculations', () => {
  test('calculates MTD revenue target correctly', () => {
    const profitTargets = {
      monthly_hours_target: 160,
      target_hourly_rate: 75,
      target_monthly_active_users: 0,
      target_avg_subscription_fee: 0
    }

    // Mock date: Sept 17
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-09-17').getTime())

    const result = calculateMTDTargets(profitTargets)

    expect(result.monthlyRevenueTarget).toBe(12000) // 160h × €75
    expect(result.mtdRevenueTarget).toBeCloseTo(6800, 0) // ~17/30 × €12,000
    expect(result.currentDay).toBe(17)
    expect(result.daysInMonth).toBe(30)
  })

  test('calculates MTD hours target based on working days', () => {
    const profitTargets = {
      monthly_hours_target: 160,
      target_working_days_per_week: [1, 2, 3, 4, 5] // Mon-Fri
    }

    // Mock date: Sept 17 (Wednesday)
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-09-17').getTime())

    const result = calculateMTDTargets(profitTargets)

    expect(result.expectedWorkingDaysUpToYesterday).toBe(12) // Mon-Fri from Sept 1-16
    expect(result.expectedWorkingDaysInMonth).toBe(22) // Total working days in Sept
    expect(result.mtdHoursTarget).toBeCloseTo(87.2, 1) // (160/22) × 12
  })

  test('handles months with different working day counts', () => {
    const profitTargets = {
      monthly_hours_target: 160,
      target_working_days_per_week: [1, 2, 3, 4, 5]
    }

    // February (shorter month)
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-02-15').getTime())
    const febResult = calculateMTDTargets(profitTargets)

    // August (longer month)
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-08-15').getTime())
    const augResult = calculateMTDTargets(profitTargets)

    // February should have fewer working days
    expect(febResult.expectedWorkingDaysInMonth).toBeLessThan(augResult.expectedWorkingDaysInMonth)
  })
})
```

### Integration Tests

```typescript
// src/__tests__/integration/dashboard-flow.test.ts

describe('Dashboard Integration Flow', () => {
  test('full workflow: create time entry → health score updates', async () => {
    // 1. Get initial dashboard state
    const initialResponse = await fetch('/api/time-entries/stats')
    const initialData = await initialResponse.json()
    const initialHours = initialData.data.thisMonth.billableHours

    // 2. Create new time entry
    await fetch('/api/time-entries', {
      method: 'POST',
      body: JSON.stringify({
        hours: 2,
        hourly_rate: 90,
        billable: true,
        entry_date: '2025-09-17'
      })
    })

    // 3. Wait for real-time update (or refetch)
    await wait(1000)

    // 4. Get updated dashboard state
    const updatedResponse = await fetch('/api/time-entries/stats')
    const updatedData = await updatedResponse.json()

    // 5. Assert updates
    expect(updatedData.data.thisMonth.billableHours).toBe(initialHours + 2)
    expect(updatedData.data.thisMonth.billableRevenue).toBeGreaterThan(
      initialData.data.thisMonth.billableRevenue
    )
  })

  test('MTD comparison updates correctly across month boundary', async () => {
    // Mock date: Last day of August
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-08-31').getTime())

    // Create August entries
    await createTimeEntry({ hours: 8, date: '2025-08-31' })

    const augResponse = await fetch('/api/time-entries/stats')
    const augData = await augResponse.json()

    // Move to first day of September
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-09-01').getTime())

    const sepResponse = await fetch('/api/time-entries/stats')
    const sepData = await sepResponse.json()

    // Assert: August data moved to previousMonthMTD, September starts fresh
    expect(sepData.data.thisMonth.billableHours).toBe(0)
    expect(sepData.data.previousMonthMTD.billableRevenue).toBe(augData.data.thisMonth.billableRevenue)
  })
})
```

### E2E Tests (Playwright)

```typescript
// src/__tests__/e2e/dashboard.spec.ts

test('user can view and understand health score', async ({ page }) => {
  // Navigate to dashboard
  await page.goto('/dashboard')

  // Wait for data to load
  await page.waitForSelector('[data-testid="health-score"]')

  // Check health score is displayed
  const healthScore = await page.textContent('[data-testid="health-score"]')
  expect(parseInt(healthScore)).toBeGreaterThanOrEqual(0)
  expect(parseInt(healthScore)).toBeLessThanOrEqual(100)

  // Check all four pillars are shown
  await expect(page.locator('[data-testid="profit-health"]')).toBeVisible()
  await expect(page.locator('[data-testid="cashflow-health"]')).toBeVisible()
  await expect(page.locator('[data-testid="efficiency-health"]')).toBeVisible()
  await expect(page.locator('[data-testid="risk-health"]')).toBeVisible()

  // Click health report button
  await page.click('[data-testid="health-report-button"]')

  // Verify modal opens
  await expect(page.locator('[data-testid="health-report-modal"]')).toBeVisible()

  // Check recommendations are shown
  const recommendations = page.locator('[data-testid="recommendation"]')
  await expect(recommendations).toHaveCountGreaterThan(0)
})

test('metric cards update in real-time', async ({ page }) => {
  await page.goto('/dashboard')

  // Get initial revenue
  const initialRevenue = await page.textContent('[data-testid="revenue-card-value"]')

  // Create new time entry
  await page.click('[data-testid="log-time-button"]')
  await page.fill('[data-testid="hours-input"]', '2')
  await page.fill('[data-testid="rate-input"]', '90')
  await page.click('[data-testid="submit-time-entry"]')

  // Wait for real-time update
  await page.waitForTimeout(2000)

  // Verify revenue increased
  const updatedRevenue = await page.textContent('[data-testid="revenue-card-value"]')
  expect(parseFloat(updatedRevenue)).toBeGreaterThan(parseFloat(initialRevenue))
})
```

---

## Extending the System

### Adding a New Metric to Cards

**Step 1: Add to API Response**

```typescript
// src/app/api/time-entries/stats/route.ts

const stats = {
  // ... existing fields

  newMetric: {
    current: calculateNewMetric(thisMonthEntries),
    target: profitTargets?.new_metric_target || 100,
    progress: (current / target) * 100
  }
}
```

**Step 2: Update TypeScript Types**

```typescript
// src/types/dashboard.ts

export interface TimeStats {
  // ... existing fields

  newMetric: {
    current: number
    target: number
    progress: number
  }
}
```

**Step 3: Add Card Component**

```typescript
// src/components/dashboard/unified-financial-dashboard.tsx

{/* Card X: New Metric */}
<div className="mobile-card-glass space-y-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-accent/20 rounded-lg">
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <div>
        <h3 className="text-base font-semibold">New Metric</h3>
        <p className="text-sm text-muted-foreground">
          Description of what this measures
        </p>
      </div>
    </div>
    <div className={`mobile-status-indicator ${
      (timeStats?.newMetric.progress || 0) >= 100 ? 'status-active' :
      (timeStats?.newMetric.progress || 0) >= 80 ? 'status-warning' : 'status-inactive'
    }`}>
      <span>{Math.round(timeStats?.newMetric.progress || 0)}%</span>
    </div>
  </div>

  <div className="space-y-2">
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-bold metric-number">
        {timeStats?.newMetric.current || 0}
      </span>
      <span className="text-sm text-muted-foreground">
        / {timeStats?.newMetric.target} target
      </span>
    </div>
  </div>

  <div className="relative progress-bar">
    <div
      className="progress-fill progress-fill-primary"
      style={{ width: `${Math.min(timeStats?.newMetric.progress || 0, 100)}%` }}
    />
  </div>
</div>
```

---

### Adding a New Health Pillar

**Step 1: Create Calculator Class**

```typescript
// src/lib/health-score-engine.ts

class NewPillarScoreCalculator {
  calculate(inputs: HealthScoreInputs): { score: number; breakdown: any } {
    // Your scoring logic here
    // Return score 0-25 and breakdown data

    return {
      score: finalScore,
      breakdown: {
        // Intermediate calculations
      }
    }
  }

  generateExplanation(inputs, result): HealthExplanation {
    return {
      title: 'New Pillar Health (25 points)',
      score: result.score,
      maxScore: 25,
      details: [
        // Explanation sections
      ]
    }
  }

  generateRecommendations(inputs, breakdown): HealthRecommendation[] {
    return [
      // Recommendation objects
    ]
  }
}
```

**Step 2: Integrate into Engine**

```typescript
// src/lib/health-score-engine.ts

export class HealthScoreEngine {
  private newPillarCalculator: NewPillarScoreCalculator

  constructor() {
    // ... existing calculators
    this.newPillarCalculator = new NewPillarScoreCalculator()
  }

  calculate(inputs: HealthScoreInputs): HealthScoreOutputs {
    // ... existing calculations
    const newPillarResult = this.newPillarCalculator.calculate(inputs)

    // Update total (now out of 125 instead of 100)
    const total = profitResult.score + cashFlowResult.score +
                  efficiencyResult.score + riskResult.score +
                  newPillarResult.score

    return {
      scores: {
        // ... existing scores
        newPillar: newPillarResult.score,
        total,
        totalRounded: Math.round(total)
      },
      // ... rest of output
    }
  }
}
```

**Step 3: Add UI Component**

```typescript
// src/components/dashboard/unified-financial-dashboard.tsx

<div
  onClick={() => setShowExplanation('newpillar')}
  className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-accent/5 to-accent/10 p-3 cursor-pointer"
>
  <div className="relative z-10">
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-2">
        <div className="p-1 rounded-lg bg-accent/20">
          <Icon className="h-3.5 w-3.5 text-accent" />
        </div>
        <div>
          <p className="text-xs font-medium">New Pillar</p>
          <p className="text-xs text-muted-foreground">
            {healthScores.newPillar >= 20 ? 'Excellent!' :
             healthScores.newPillar >= 15 ? 'Good' :
             healthScores.newPillar >= 10 ? 'Fair' : 'Needs work'}
          </p>
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold">{healthScores.newPillar}</span>
          <span className="text-xs text-muted-foreground">/25</span>
        </div>
      </div>
    </div>

    <div className="w-full bg-accent/20 rounded-full h-1">
      <div
        className="bg-gradient-to-r from-accent to-accent/80 h-1 rounded-full"
        style={{ width: `${(healthScores.newPillar / 25) * 100}%` }}
      />
    </div>
  </div>
</div>
```

---

### Adding Subscription Support to Existing Metrics

If you need to add subscription revenue tracking:

**Step 1: Create subscription_payments table**

```sql
-- supabase/migrations/XXX_add_subscription_tracking.sql

CREATE TABLE platform_subscription_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('paid', 'pending', 'failed')),
  provider_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscription_payments_tenant ON platform_subscription_payments(tenant_id);
CREATE INDEX idx_subscription_payments_date ON platform_subscription_payments(payment_date);

-- RLS Policies
ALTER TABLE platform_subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription payments"
  ON platform_subscription_payments FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()));
```

**Step 2: Add subscription calculation to stats API**

```typescript
// src/app/api/time-entries/stats/route.ts

async function calculateSubscriptionMetrics(
  tenantId: string,
  currentMonthStart: Date,
  currentMonthEnd: Date
) {
  // Get current month subscription payments
  const { data: currentPayments } = await supabaseAdmin
    .from('platform_subscription_payments')
    .select('id, amount, customer_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'paid')
    .gte('payment_date', currentMonthStart.toISOString().split('T')[0])
    .lte('payment_date', currentMonthEnd.toISOString().split('T')[0])

  // Calculate MAU
  const currentCustomers = new Set(currentPayments?.map(p => p.customer_id) || [])
  const currentMAU = currentCustomers.size

  // Calculate average fee
  const totalRevenue = currentPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
  const avgFee = currentMAU > 0 ? totalRevenue / currentMAU : 0

  return {
    monthlyActiveUsers: {
      current: currentMAU,
      previous: previousMAU, // Calculate similarly for previous month
      growth: ((currentMAU - previousMAU) / previousMAU) * 100,
      trend: currentMAU >= previousMAU ? 'positive' : 'negative'
    },
    averageSubscriptionFee: {
      current: avgFee,
      previous: previousAvgFee,
      growth: ((avgFee - previousAvgFee) / previousAvgFee) * 100,
      trend: avgFee >= previousAvgFee ? 'positive' : 'negative'
    }
  }
}
```

**Step 3: Update profit targets to include subscription targets**

```typescript
// Add to profiles table or profit_targets table
target_monthly_active_users: 15
target_avg_subscription_fee: 75
```

**Step 4: Update UI to show subscription metrics**

Already implemented in Card 4 (MAU) and Card 5 (Avg Fee) - they only show when `subscriptionEnabled` is true.

---

## Performance Optimization

### Database Query Optimization

1. **Use Indexed Fields**
   ```sql
   CREATE INDEX idx_time_entries_tenant_date
     ON time_entries(tenant_id, entry_date DESC);

   CREATE INDEX idx_invoices_tenant_status_date
     ON invoices(tenant_id, status, invoice_date DESC);
   ```

2. **Limit Date Ranges**
   ```typescript
   // Good: Limited date range
   .gte('entry_date', last30DaysStart)
   .lte('entry_date', now)

   // Bad: Scanning entire table
   .select('*')
   ```

3. **Parallel Queries**
   ```typescript
   const [current, previous, unbilled] = await Promise.all([
     fetchCurrent30Days(),
     fetchPrevious30Days(),
     fetchUnbilled()
   ])
   ```

### Frontend Optimization

1. **Memoize Expensive Calculations**
   ```typescript
   const healthScores = useMemo(() => {
     if (!healthScoreResults) return defaultScores
     return healthScoreResults.scores
   }, [healthScoreResults])
   ```

2. **Lazy Load Heavy Components**
   ```typescript
   const HealthReportModal = lazy(() => import('./health-report-modal'))
   ```

3. **Debounce Real-Time Updates**
   ```typescript
   const debouncedRefresh = useMemo(
     () => debounce(fetchAllData, 1000),
     []
   )
   ```

### Caching Strategy

1. **Client-Side Cache**
   ```typescript
   // Cache API responses for 30 seconds
   const CACHE_TTL = 30000
   const cache = new Map()

   async function fetchWithCache(url: string) {
     const cached = cache.get(url)
     if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
       return cached.data
     }

     const data = await fetch(url).then(r => r.json())
     cache.set(url, { data, timestamp: Date.now() })
     return data
   }
   ```

2. **Server-Side Cache** (if using serverless functions)
   ```typescript
   // Add cache headers
   return NextResponse.json(data, {
     headers: {
       'Cache-Control': 'private, max-age=30',
     }
   })
   ```

---

# Appendices

## Glossary

**API (Application Programming Interface)**: Endpoint that provides data to the frontend.

**Billable Hours**: Time tracked that can be invoiced to clients (excludes admin, training, etc.).

**Business Health Score**: Aggregate score (0-100) measuring overall business performance across 4 pillars.

**DIO (Days Invoice Overdue)**: Number of days an invoice is past its payment due date.

**DSO (Days Sales Outstanding)**: Average days to collect payment after sale (not used in current system).

**Health Pillar**: One of four categories (Profit, Cash Flow, Efficiency, Risk) scored out of 25 points.

**MAU (Monthly Active Users)**: Number of paying subscribers/users in a given month.

**MRR (Monthly Recurring Revenue)**: Predictable revenue from subscriptions (MAU × Avg Fee).

**MTD (Month-To-Date)**: From the 1st of the current month to today.

**Non-Billable Hours**: Time tracked for internal activities (admin, training, business development).

**Rolling 30 Days**: Last 30 calendar days including today (e.g., Aug 18 - Sept 17).

**RLS (Row Level Security)**: Supabase feature ensuring users only access their own data.

**SaaS (Software as a Service)**: Subscription-based software business model.

**Tenant**: Organization/account in a multi-tenant system (data isolated per tenant).

**Time Entry**: Record of hours worked on a specific date, project, and client.

**Unbilled Hours**: Billable work completed but not yet invoiced.

---

## Calculation Examples

### Example 1: Solo Consultant (Time-Based Only)

**Scenario**: Freelance developer, no subscription revenue

**Date**: September 17, 2025

**Data**:
- Working days Sept 1-16: 12 days
- Hours logged: 82h billable, 15h non-billable
- Billable rate: €90/h
- Monthly targets: 160h, €75/h, €12,000 revenue

**Calculations**:

```
MTD BILLABLE REVENUE:
82h × €90/h = €7,380

MTD TARGET:
Monthly: €12,000
Days: 17/30 = 56.7%
MTD Target: €12,000 × 56.7% = €6,804

PROGRESS:
€7,380 / €6,804 = 108% ✓

HOURS PROGRESS:
MTD Target: (160h / 22 working days) × 12 = 87.2h
Actual: 82h
Progress: 82h / 87.2h = 94%

AVERAGE RATE:
€7,380 / 82h = €90/h
Target: €75/h
Progress: €90 / €75 = 120% ✓

BUSINESS HEALTH (Rolling 30 days):
- Profit: 22/25 (strong)
- Cash Flow: 20/25 (good)
- Efficiency: 23/25 (excellent)
- Risk: 20/25 (balanced)
Total: 85/100 (Legend tier)
```

### Example 2: SaaS Business (Subscription Only)

**Scenario**: Pure SaaS product, no time-based revenue

**Date**: September 17, 2025

**Data**:
- Monthly Active Users: 45
- Average Subscription Fee: €65/user
- Targets: 50 users, €75/user, €3,750 monthly revenue

**Calculations**:

```
SUBSCRIPTION REVENUE (MRR):
45 users × €65/user = €2,925

MTD TARGET:
Monthly: 50 users × €75 = €3,750
MTD Target: €3,750 (full MRR, not prorated)

PROGRESS:
€2,925 / €3,750 = 78%

MAU PROGRESS:
45 / 50 = 90%

AVG FEE PROGRESS:
€65 / €75 = 87%

BUSINESS HEALTH (Rolling 30 days):
- Profit: 18/25 (focus: subscriber growth + pricing)
- Cash Flow: 25/25 (perfect - subscriptions autopay)
- Efficiency: N/A (no time tracking)
- Risk: 22/25 (low churn, diverse customer base)
Total: 65/100 (Builder tier - growth needed)
```

### Example 3: Hybrid Business (Time + Subscriptions)

**Scenario**: Consultant with SaaS side product

**Date**: September 17, 2025

**Data**:
- Time: 80h @ €90/h = €7,200
- Subscriptions: 10 users @ €50 = €500
- Targets: €12,000 time + €750 subscription = €12,750 total

**Calculations**:

```
TOTAL REVENUE:
Time: €7,200
Subscription: €500
Total: €7,700

MTD TARGET:
Time target: €12,000 × 56.7% = €6,804
Subscription target: €750 (full MRR)
Total MTD target: €7,554

PROGRESS:
€7,700 / €7,554 = 102% ✓

REVENUE MIX:
Subscription: €500 / €7,700 = 6.5%
Target: 30% subscription
Gap: Need to grow subscription revenue

BUSINESS HEALTH (Rolling 30 days):
- Profit: 20/25 (good, but mix needs work)
- Cash Flow: 18/25 (few overdue time invoices)
- Efficiency: 23/25 (time management excellent)
- Risk: 19/25 (good diversification building)
Total: 80/100 (Champion tier)

RECOMMENDATIONS:
1. Grow subscription from 10 to 20 users (+€500 MRR)
2. This would improve revenue mix to 13%
3. Continue strong time-based performance
4. Follow up on 2 overdue time invoices
```

---

## Troubleshooting

### Issue: "Health score seems stuck/not updating"

**Possible Causes**:
1. Browser cached old data
2. Real-time subscription not connected
3. Date filter excluding recent entries

**Solutions**:
```typescript
// 1. Force refresh
const fetchAllData = async (force = false) => {
  const cacheKey = force ? `?t=${Date.now()}` : ''
  await fetch(`/api/time-entries/stats${cacheKey}`)
}

// 2. Check real-time connection
const { metrics, connected } = useRealtimeDashboard()
console.log('Real-time connected:', connected)

// 3. Verify date calculations
console.log('Current date:', getCurrentDate())
console.log('Last 30 days start:', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
```

### Issue: "MTD comparison shows huge % change"

**Possible Causes**:
1. Previous month had very low activity
2. Comparison period is too early in month (small base)
3. Data quality issue in previous month

**Solutions**:
```typescript
// Add minimum threshold for comparison
const percentageChange = previousMTD > 100 ? // Only compare if prev > €100
  (difference / previousMTD) * 100 :
  0 // Don't show % if base too small
```

### Issue: "Previous month MTD returns no data"

**Possible Causes**:
1. User had no activity in previous month same day range
2. Date calculation error (wrong month/year)
3. RLS policy blocking access

**Debugging**:
```typescript
// Check date calculation
const currentDay = now.getDate()
const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
const previousMonthMTDEnd = new Date(now.getFullYear(), now.getMonth() - 1, currentDay)

console.log('Previous month date range:')
console.log('Start:', previousMonthStart.toISOString())
console.log('End:', previousMonthMTDEnd.toISOString())

// Check if data exists
const { data, error } = await supabaseAdmin
  .from('time_entries')
  .select('count')
  .eq('tenant_id', tenantId)
  .gte('entry_date', previousMonthStart.toISOString().split('T')[0])
  .lte('entry_date', previousMonthMTDEnd.toISOString().split('T')[0])

console.log('Previous month entries:', data, error)
```

### Issue: "Rate card shows different rate than Business Health"

**This is expected!** Different time windows and data sources:

```
RATE CARD (MTD):
- Time window: Sept 1-17
- Calculation: thisMonth.billableRevenue / thisMonth.billableHours
- Example: €7,200 / 80h = €90/h

BUSINESS HEALTH (Rolling 30 days):
- Time window: Aug 18 - Sept 17
- Calculation: rolling30Days.billableRevenue / rolling30Days.billableHours
- Example: €8,577.50 / 112h = €76.58/h

Both are correct for their respective time windows.
```

### Issue: "Subscription cards not showing"

**Possible Causes**:
1. Subscription targets not set in profit targets
2. No subscription payment data
3. `subscriptionEnabled` flag is false

**Solutions**:
```typescript
// 1. Check subscription targets
const subscriptionEnabled = Boolean(
  profitTargets?.target_monthly_active_users &&
  profitTargets.target_monthly_active_users > 0 &&
  profitTargets?.target_avg_subscription_fee &&
  profitTargets.target_avg_subscription_fee > 0
)

// 2. Verify payment data exists
const { data } = await supabaseAdmin
  .from('platform_subscription_payments')
  .select('count')
  .eq('tenant_id', tenantId)

console.log('Subscription payments count:', data)

// 3. Set targets in profit targets settings
// Navigate to: Settings > Profit Targets > Subscription Section
// Set: Target Monthly Active Users = 15
//      Target Avg Subscription Fee = €75
```

### Issue: "Working days calculation seems wrong"

**Check**:
1. User's working days configuration
2. Holiday/weekend detection
3. Month boundaries

**Debugging**:
```typescript
// Log working days calculation
const workingDays = profitTargets?.target_working_days_per_week || [1, 2, 3, 4, 5]
console.log('Target working days:', workingDays) // [1,2,3,4,5] = Mon-Fri

let count = 0
let currentDate = new Date(startOfMonth)
while (currentDate <= endOfMonth) {
  const dayOfWeek = currentDate.getDay() // 0=Sun, 1=Mon, etc.
  const isoWeekday = dayOfWeek === 0 ? 7 : dayOfWeek // Convert to ISO (1=Mon, 7=Sun)

  if (workingDays.includes(isoWeekday)) {
    count++
    console.log(`Working day ${count}: ${currentDate.toDateString()}`)
  }

  currentDate.setDate(currentDate.getDate() + 1)
}

console.log('Total working days in month:', count)
```

---

**End of Documentation**

This comprehensive guide covers both business user workflows and technical implementation details for the Business Health & Dashboard Metrics system. For questions or contributions, please refer to the project repository or contact the development team.

---

**Document Version**: 2.0
**Last Updated**: 2025-10-12
**Maintained By**: Development Team
**Related Documents**:
- `.claude/METRICS_REVIEW_2025-09-17.md` (Detailed review)
- `.claude/METRICS_IMPLEMENTATION_SUMMARY.md` (Implementation changelog)
- `CLAUDE.md` (Project overview)
