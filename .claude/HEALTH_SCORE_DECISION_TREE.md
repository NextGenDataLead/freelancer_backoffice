# Health Score Decision Tree - Complete Metrics & Recommendations

## Overview
**Total Score: 100 points (4 metrics × 25 points each)**
- 🎯 **Profit Health**: 25 points
- 💰 **Cash Flow Health**: 25 points
- ⚡ **Efficiency Health**: 25 points
- 🛡️ **Risk Management**: 25 points

---

## 🎯 PROFIT HEALTH (25 Points)

### Metric Breakdown
- **Subscription Growth** (6 points max)
- **Subscription Pricing** (6 points max)
- **Hourly Rate Value** (4 points max)
- **Revenue Mix Quality** (4 points max)
- **Rate Optimization** (3 points max)
- **Business Model** (2 points max)

### Decision Tree

```
PROFIT SCORE CALCULATION
├── Current Profit vs MTD Target
│   ├── Performance >= 100% → Score: 25/25
│   ├── Performance 80-99% → Score: 20-24/25
│   ├── Performance 60-79% → Score: 15-19/25
│   ├── Performance 40-59% → Score: 10-14/25
│   └── Performance < 40% → Score: 0-9/25
│
RECOMMENDATIONS BY SCORE RANGE
│
├── CRITICAL (0-9/25) - High Priority
│   ├── Subscription Growth < 80%
│   │   └── "Accelerate Subscriber Growth"
│   │       ├── Impact: 3-6 points
│   │       ├── Current: X subscribers
│   │       ├── Target: Y+ subscribers
│   │       └── Actions:
│   │           ├── Target acquiring X new subscribers
│   │           ├── Implement referral program
│   │           ├── Launch targeted marketing
│   │           └── Optimize onboarding flow
│   │
│   ├── Subscription Pricing < 80%
│   │   └── "Optimize Subscription Pricing"
│   │       ├── Impact: 3-6 points
│   │       ├── Current: €X/month average
│   │       ├── Target: €Y/month average
│   │       └── Actions:
│   │           ├── Review competitor pricing
│   │           ├── Implement value-based tiers
│   │           ├── Test pricing with new subscribers
│   │           └── Analyze value propositions
│   │
│   └── Hourly Rate < 80%
│       └── "Increase Hourly Rate Value"
│           ├── Impact: 2-4 points
│           ├── Current: €X/hour
│           ├── Target: €Y/hour
│           └── Actions:
│               ├── Increase rates by €Z/hour
│               ├── Focus on high-value clients
│               ├── Negotiate rate increases
│               └── Eliminate low-value work
│
├── NEEDS ATTENTION (10-17/25) - Medium Priority
│   ├── Revenue Mix Optimization
│   │   └── "Optimize Revenue Mix Quality"
│   │       ├── Impact: 2-4 points
│   │       ├── Current: X% subscription mix
│   │       ├── Target: Y% optimal mix
│   │       └── Actions:
│   │           ├── Balance time vs subscription revenue
│   │           ├── Optimize pricing efficiency
│   │           └── Diversify revenue streams
│   │
│   └── Rate Optimization
│       └── "Optimize Rate Structure"
│           ├── Impact: 1-3 points
│           ├── Current: €X effective rate
│           ├── Target: €Y target rate
│           └── Actions:
│               ├── Analyze rate vs target gaps
│               ├── Improve value delivery
│               └── Standardize premium rates
│
├── HIGH PERFORMERS (18-22/25) - Fine-tuning
│   ├── Performance 80-95%
│   │   ├── "Fine-tune Subscriber Growth"
│   │   │   ├── Priority: Low
│   │   │   ├── Impact: 1-2 points
│   │   │   ├── Current: X subscribers (85%)
│   │   │   ├── Target: Y subscribers (100%+)
│   │   │   └── Actions:
│   │   │       ├── Optimize conversion rates
│   │   │       ├── Advanced retention strategies
│   │   │       └── Expand to complementary segments
│   │   │
│   │   └── "Optimize Rate Efficiency"
│   │       ├── Priority: Medium
│   │       ├── Impact: 1-3 points
│   │       ├── Current: €X/h (85%)
│   │       ├── Target: €Y/h (100%+)
│   │       └── Actions:
│   │           ├── Negotiate rate increases
│   │           ├── Focus on premium services
│   │           └── Eliminate low-margin activities
│   │
│   └── Performance 95-99%
│       └── "Maximize Value Creation"
│           ├── Priority: Low
│           ├── Impact: 1-2 points
│           ├── Current: 95%+ target contribution
│           ├── Target: 100%+ sustainable
│           └── Actions:
│               ├── Develop premium service tiers
│               ├── Create productized offerings
│               └── Expand to higher-value segments
│
└── EXCELLENT (23-25/25) - Maintenance
    └── "Maintain Profit Excellence"
        ├── Priority: Low
        ├── Impact: 1-2 points
        ├── Current: 23-25/25 excellent score
        ├── Target: Maintain 20+ consistently
        └── Actions:
            ├── Monitor key profit drivers
            ├── Document successful strategies
            └── Consider scaling operations
```

---

## 💰 CASH FLOW HEALTH (25 Points)

### Metric Breakdown
- **Operating Cash Flow Ratio** (10 points max)
- **DSO Equivalent** (10 points max)
- **Collection Volume Risk** (5 points max)

### Decision Tree

```
CASH FLOW SCORE CALCULATION
├── Operating Cash Flow Ratio (10 pts)
│   ├── ≥90% paid → 10 points
│   ├── 80-89% paid → 8 points
│   ├── 70-79% paid → 5 points
│   ├── 60-69% paid → 3 points
│   └── <60% paid → 0 points
│
├── DSO Equivalent (10 pts)
│   ├── ≤7 days → 10 points
│   ├── 8-15 days → 8 points
│   ├── 16-30 days → 5 points
│   ├── 31-45 days → 2 points
│   └── >45 days → 0 points
│
└── Collection Volume (5 pts)
    ├── ≤2 overdue items → 5 points
    ├── 3-4 items → 3 points
    ├── 5-6 items → 1 point
    └── >6 items → 0 points

RECOMMENDATIONS BY SCORE RANGE
│
├── CRITICAL (0-12/25) - High Priority
│   ├── Operating Cash Flow < 60%
│   │   └── "Accelerate Payment Collection"
│   │       ├── Impact: 7-10 points
│   │       ├── Current: €X outstanding (Y% ratio)
│   │       ├── Target: 90% collection ratio
│   │       └── Actions:
│   │           ├── Immediate collection of €Z
│   │           ├── Aggressive follow-up procedures
│   │           ├── Offer payment plans
│   │           └── Consider collection agencies
│   │
│   ├── DSO > 45 days
│   │   └── "Reduce Collection Time"
│   │       ├── Impact: 8-10 points
│   │       ├── Current: X days equivalent
│   │       ├── Target: <15 days
│   │       └── Actions:
│   │           ├── Streamline payment processes
│   │           ├── Require upfront payments
│   │           ├── Implement payment terms enforcement
│   │           └── Review credit policies
│   │
│   └── Volume Risk > 6 items
│       └── "Clear Collection Backlog"
│           ├── Impact: 4-5 points
│           ├── Current: X overdue invoices
│           ├── Target: ≤2 overdue items
│           └── Actions:
│               ├── Prioritize oldest outstanding
│               ├── Batch collection efforts
│               ├── Resolve payment disputes
│               └── Prevent future delays
│
├── NEEDS ATTENTION (13-19/25) - Medium Priority
│   ├── DSO 16-30 days
│   │   └── "Improve Collection Speed"
│   │       ├── Impact: 3-5 points
│   │       ├── Current: X days collection time
│   │       ├── Target: <15 days optimal
│   │       └── Actions:
│   │           ├── Automate payment reminders
│   │           ├── Improve invoice clarity
│   │           ├── Offer early payment discounts
│   │           └── Follow up systematically
│   │
│   └── Volume 3-6 items
│       └── "Optimize Collection Efficiency"
│           ├── Impact: 2-4 points
│           ├── Current: X items outstanding
│           ├── Target: ≤2 items maximum
│           └── Actions:
│               ├── Implement collection workflows
│               ├── Track payment patterns
│               ├── Address problem accounts
│               └── Prevent accumulation
│
├── HIGH PERFORMERS (20-22/25) - Fine-tuning
│   ├── DSO 8-15 days
│   │   └── "Optimize Collection Speed"
│   │       ├── Priority: Low
│   │       ├── Impact: 2 points
│   │       ├── Current: X days equivalent
│   │       ├── Target: <7 days maximum efficiency
│   │       └── Actions:
│   │           ├── Automated payment reminders
│   │           ├── Early payment incentives
│   │           └── Streamline invoice delivery
│   │
│   └── Volume 3-4 items
│       └── "Optimize Payment Volume"
│           ├── Priority: Low
│           ├── Impact: 2 points
│           ├── Current: X overdue items
│           ├── Target: ≤2 items excellence
│           └── Actions:
│               ├── Clear remaining small amounts
│               ├── Systematic follow-up procedures
│               └── Prevent future delays
│
└── EXCELLENT (23-25/25) - Maintenance
    └── "Maintain Cash Flow Excellence"
        ├── Priority: Low
        ├── Impact: 1-2 points
        ├── Current: 23-25/25 excellent score
        ├── Target: Maintain 20+ consistently
        └── Actions:
            ├── Monitor collection metrics
            ├── Maintain proactive follow-up
            └── Document successful strategies
```

---

## ⚡ EFFICIENCY HEALTH (25 Points)

### Metric Breakdown
- **Hours Progress vs Target** (15 points max)
- **Billing Efficiency** (5 points max)
- **Daily Consistency** (5 points max)

### Decision Tree

```
EFFICIENCY SCORE CALCULATION
├── Hours Progress (15 pts)
│   ├── ≥100% of MTD target → 15 points
│   ├── 90-99% → 13 points
│   ├── 80-89% → 11 points
│   ├── 70-79% → 8 points
│   ├── 60-69% → 5 points
│   └── <60% → 0-3 points
│
├── Billing Efficiency (5 pts)
│   ├── <5% unbilled ratio → 5 points
│   ├── 5-10% unbilled → 4 points
│   ├── 11-20% unbilled → 3 points
│   ├── 21-30% unbilled → 2 points
│   └── >30% unbilled → 0-1 points
│
└── Daily Consistency (5 pts)
    ├── Variance <20% → 5 points
    ├── Variance 20-35% → 4 points
    ├── Variance 36-50% → 3 points
    ├── Variance 51-75% → 2 points
    └── Variance >75% → 0-1 points

RECOMMENDATIONS BY SCORE RANGE
│
├── CRITICAL (0-12/25) - High Priority
│   ├── Hours Progress <60%
│   │   └── "Accelerate Time Tracking"
│   │       ├── Impact: 10-15 points
│   │       ├── Current: X hours (Y% of target)
│   │       ├── Target: Z hours MTD target
│   │       └── Actions:
│   │           ├── Log X additional hours
│   │           ├── Work Y hours/day remaining
│   │           ├── Focus on billable activities
│   │           └── Eliminate time waste
│   │
│   ├── Billing Efficiency <70%
│   │   └── "Convert Unbilled Time"
│   │       ├── Impact: 4-5 points
│   │       ├── Current: X hours unbilled
│   │       ├── Target: <5% unbilled ratio
│   │       └── Actions:
│   │           ├── Bill all completed work
│   │           ├── Implement real-time tracking
│   │           ├── Streamline approval processes
│   │           └── Reduce work-in-progress
│   │
│   └── Consistency >75% variance
│       └── "Improve Daily Consistency"
│           ├── Impact: 4-5 points
│           ├── Current: X% daily variance
│           ├── Target: <20% variance
│           └── Actions:
│               ├── Establish daily routines
│               ├── Set minimum daily targets
│               ├── Track daily patterns
│               └── Reduce scheduling conflicts
│
├── NEEDS ATTENTION (13-19/25) - Medium Priority
│   ├── Hours Progress 60-89%
│   │   └── "Improve Time Utilization"
│   │       ├── Impact: 4-7 points
│   │       ├── Current: X% of hours target
│   │       ├── Target: 100%+ utilization
│   │       └── Actions:
│   │           ├── Increase daily averages
│   │           ├── Optimize time allocation
│   │           ├── Reduce non-billable time
│   │           └── Improve focus periods
│   │
│   ├── Billing Efficiency 70-89%
│   │   └── "Optimize Billing Process"
│   │       ├── Impact: 1-3 points
│   │       ├── Current: X% billing efficiency
│   │       ├── Target: >95% efficiency
│   │       └── Actions:
│   │           ├── Reduce unbilled backlog
│   │           ├── Automate time capture
│   │           ├── Speed up billing cycles
│   │           └── Improve work tracking
│   │
│   └── Consistency 36-75% variance
│       └── "Stabilize Daily Output"
│           ├── Impact: 2-3 points
│           ├── Current: X% variance
│           ├── Target: <35% variance
│           └── Actions:
│               ├── Create consistent schedules
│               ├── Manage workload spikes
│               ├── Plan capacity better
│               └── Reduce interruptions
│
├── HIGH PERFORMERS (20-22/25) - Fine-tuning
│   ├── Hours Progress 90-99%
│   │   └── "Fine-tune Time Management"
│   │       ├── Priority: Low
│   │       ├── Impact: 1-2 points
│   │       ├── Current: X% utilization
│   │       ├── Target: 100%+ sustained
│   │       └── Actions:
│   │           ├── Optimize peak hours
│   │           ├── Reduce transition time
│   │           └── Improve time estimation
│   │
│   └── Billing Efficiency 90-94%
│       └── "Perfect Billing Flow"
│           ├── Priority: Low
│           ├── Impact: 1 point
│           ├── Current: X% efficiency
│           ├── Target: >95% perfection
│           └── Actions:
│               ├── Eliminate billing delays
│               ├── Automate time capture
│               └── Real-time billing updates
│
└── EXCELLENT (23-25/25) - Maintenance
    └── "Maintain Time Excellence"
        ├── Priority: Low
        ├── Impact: 1-2 points
        ├── Current: 23-25/25 excellent score
        ├── Target: Sustain 20+ efficiency
        └── Actions:
            ├── Document productivity patterns
            ├── Maintain consistent tracking
            └── Optimize high-value time
```

---

## 🛡️ RISK MANAGEMENT (25 Points)

### Metric Breakdown
- **Invoice Processing Risk** (12 points max)
- **Payment Collection Risk** (8 points max)
- **Subscription Business Risk** (5 points max)

### Decision Tree

```
RISK SCORE CALCULATION
├── Invoice Processing Risk (12 pts penalty)
│   ├── €0-3,000 ready-to-bill → 0 penalty
│   ├── €3,001-6,000 → 6 pts penalty
│   ├── €6,001-9,000 → 9 pts penalty
│   └── >€9,000 → 12 pts penalty
│
├── Payment Collection Risk (8 pts penalty)
│   ├── 0-2 overdue items → 0 penalty
│   ├── 3-5 items → 3 pts penalty
│   ├── 6-8 items → 5 pts penalty
│   └── >8 items → 8 pts penalty
│
└── Subscription Risk (5 pts penalty)
    ├── 5+ active subscribers → 0 penalty
    ├── 3-4 subscribers → 2 pts penalty
    ├── 1-2 subscribers → 4 pts penalty
    └── 0 subscribers → 5 pts penalty

RECOMMENDATIONS BY SCORE RANGE
│
├── CRITICAL (0-15/25) - High Priority
│   ├── Ready-to-Bill >€6,000
│   │   └── "Reduce Invoice Processing Risk"
│   │       ├── Impact: 6-12 points
│   │       ├── Current: €X ready-to-bill
│   │       ├── Target: €5,000 maximum
│   │       └── Actions:
│   │           ├── Process all pending invoices
│   │           ├── Streamline approval workflows
│   │           ├── Implement automated invoicing
│   │           └── Prevent accumulation
│   │
│   ├── Payment Collection >6 items
│   │   └── "Minimize Collection Risk"
│   │       ├── Impact: 5-8 points
│   │       ├── Current: X overdue items
│   │       ├── Target: ≤2 items maximum
│   │       └── Actions:
│   │           ├── Clear payment backlog
│   │           ├── Implement systematic follow-up
│   │           ├── Resolve payment disputes
│   │           └── Prevent future issues
│   │
│   └── Subscription Risk 0-2 subscribers
│       └── "Build Subscription Foundation"
│           ├── Impact: 4-5 points
│           ├── Current: X subscribers
│           ├── Target: 5+ active subscribers
│           └── Actions:
│               ├── Launch subscription offering
│               ├── Convert existing clients
│               ├── Implement onboarding flow
│               └── Focus on retention
│
├── NEEDS ATTENTION (16-21/25) - Medium Priority
│   ├── Ready-to-Bill €3,000-6,000
│   │   └── "Control Invoice Processing"
│   │       ├── Impact: 3-6 points
│   │       ├── Current: €X processing backlog
│   │       ├── Target: <€3,000 optimal
│   │       └── Actions:
│   │           ├── Reduce processing time
│   │           ├── Improve workflow efficiency
│   │           ├── Regular invoice batching
│   │           └── Monitor accumulation
│   │
│   ├── Payment Collection 3-5 items
│   │   └── "Improve Collection Control"
│   │       ├── Impact: 3 points
│   │       ├── Current: X collection items
│   │       ├── Target: ≤2 items control
│   │       └── Actions:
│   │           ├── Strengthen follow-up
│   │           ├── Address problem accounts
│   │           ├── Improve payment terms
│   │           └── Monitor trends
│   │
│   └── Subscription Risk 3-4 subscribers
│       └── "Strengthen Subscription Base"
│           ├── Impact: 2 points
│           ├── Current: X subscribers
│           ├── Target: 5+ for stability
│           └── Actions:
│               ├── Acquire 1-2 more subscribers
│               ├── Improve retention rates
│               ├── Enhance value proposition
│               └── Reduce churn risk
│
├── HIGH PERFORMERS (22-24/25) - Fine-tuning
│   ├── Ready-to-Bill €1,000-3,000
│   │   └── "Optimize Processing Flow"
│   │       ├── Priority: Low
│   │       ├── Impact: 1-3 points
│   │       ├── Current: €X ready-to-bill
│   │       ├── Target: Minimal backlog
│   │       └── Actions:
│   │           ├── Streamline processes further
│   │           ├── Automate routine tasks
│   │           └── Prevent accumulation
│   │
│   └── Collection 1-2 items
│       └── "Perfect Collection Control"
│           ├── Priority: Low
│           ├── Impact: 1-2 points
│           ├── Current: X items
│           ├── Target: 0-1 items maximum
│           └── Actions:
│               ├── Immediate resolution
│               ├── Prevent future issues
│               └── Maintain excellence
│
└── EXCELLENT (25/25) - Maintenance
    └── "Maintain Risk Excellence"
        ├── Priority: Low
        ├── Impact: 1 point
        ├── Current: 25/25 excellent score
        ├── Target: Maintain 22+ risk score
        └── Actions:
            ├── Monitor key risk indicators
            ├── Maintain proactive processing
            └── Continue diversified approach
```

---

## 🎯 OVERALL INSIGHTS & PRIORITIES

### Top Priority Algorithm
**Ranks recommendations across all metrics by:**
1. **Impact Score** (potential points gained)
2. **Priority Level** (high > medium > low)
3. **Current Performance Gap** (biggest gaps first)

### Quick Wins Identification
**Low effort + High impact recommendations:**
- Billing efficiency improvements
- Collection speed optimization
- Rate adjustments
- Invoice processing

### Long-term Strategic Goals
**Based on overall performance:**
- Score 80-100: Scale and optimize profitable operations
- Score 60-79: Address priority gaps systematically
- Score 40-59: Focus on fundamental improvements
- Score 0-39: Emergency intervention required

### Performance Thresholds
- **🔥 Critical**: 0-40 points (Emergency action required)
- **⚠️ Needs Attention**: 41-65 points (Systematic improvement)
- **✅ Good**: 66-80 points (Fine-tuning optimization)
- **🎉 Excellent**: 81-100 points (Maintenance and scaling)

This decision tree ensures every score range receives relevant, actionable recommendations aligned with the specific metrics that drive each health score component.