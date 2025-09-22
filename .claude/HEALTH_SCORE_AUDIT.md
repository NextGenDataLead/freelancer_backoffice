# Health Score Component Alignment Audit

## Profit Health Score

### Metrics Used in Calculation:
- Total Revenue (time + SaaS)
- Estimated Costs (monthly_cost_target)
- Current Profit = Revenue - Costs
- MTD Profit Target = monthly_profit_target × (currentDay/daysInMonth)

### Scoring Logic:
- Progress Ratio = Current Profit / MTD Profit Target
- Score = min(max(round(Progress Ratio × 25), 0), 25)
- Max 25 points

### Explanation Shows:
- Current Profit (MTD)
- MTD Profit Target
- Monthly Profit Target
- Revenue components
- Cost estimates

### Recommendations Focus:
- Revenue optimization (rates, hours, SaaS pricing)
- Cost reduction
- Profit margin improvement
- Specific actionable levers

**ALIGNMENT STATUS**: ✅ Metrics → Scoring → Explanations → Recommendations all focus on PROFIT

---

## Efficiency Health Score

### Metrics Used in Calculation:
- Current Hours (thisMonth.hours)
- MTD Hours Target
- Progress Ratio = Current Hours / MTD Hours Target

### Scoring Logic:
- Score = min(round(Progress Ratio × 25), 25)
- Max 25 points

### Explanation Shows:
- Current Hours (MTD)
- MTD Target hours
- Daily averages

### Recommendations Focus:
- Billing efficiency (unbilled ratio)
- Workflow optimization
- Productivity quality (not quantity)

**ALIGNMENT STATUS**: ⚠️ POTENTIAL MISALIGNMENT
- Scoring based on HOUR QUANTITY
- Recommendations focus on PRODUCTIVITY QUALITY
- This creates a disconnect!

---

## Cash Flow Health Score

### Metrics Used in Calculation:
- Total Revenue
- Overdue Amount
- Paid Amount = Total Revenue - Overdue
- Operating Cash Flow Ratio

### Scoring Logic:
- Based on cash flow ratio and overdue percentage
- Max 25 points

**ALIGNMENT STATUS**: Need to check...

---

## Risk Health Score

### Metrics Used in Calculation:
- Ready-to-bill amount (factureerbaar)
- Workload risk based on hours

### Scoring Logic:
- Penalty-based system
- Max 25 points

**ALIGNMENT STATUS**: Need to check...