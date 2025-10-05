# Daily Consistency Modal - Complete Benchmark Implementation

## Data Structure (Tree View - CORRECT)

From `health-score-hierarchical-tree.tsx` lines 202-213:

```typescript
{
  id: 'daily_consistency',
  name: 'Daily Consistency',
  score: consistencyScore || 0,         // Real calculated score: e.g., 6.4
  maxScore: 8,                          // Real max points
  contribution: 8 / 25 * 100,           // Real contribution: 32%
  level: 1,                             // Legitimate level in hierarchy
  description: `${breakdown.dailyAverage?.toFixed(1)}h average per day`,  // Human readable
  calculationValue: `${breakdown.dailyAverage?.toFixed(1)}h/day`,         // Pure calc: "5.2h/day"
  calculationDescription: `Daily average: ${breakdown.dailyAverage?.toFixed(1)}h/day → ${consistencyScore}/8 pts`,
  isCalculationDriver: true,            // Triggers CalculationDetailModal
  metricId: 'daily_consistency'
}
```

## Modal Trigger (Tree View - CORRECT)

From `health-score-hierarchical-tree.tsx` lines 395-404:

```typescript
if (node.isCalculationDriver && onCalculationClick) {
  onCalculationClick(
    node.metricId,           // 'daily_consistency'
    node.name,               // 'Daily Consistency'
    node.calculationValue,   // '5.2h/day'
    node.calculationDescription, // 'Daily average: 5.2h/day → 6.4/8 pts'
    node.score,              // 6.4
    node.maxScore,           // 8
    node.detailedCalculation // undefined (no complex breakdown needed)
  )
}
```

## Modal Content & Styling (CalculationDetailModal - BENCHMARK)

### Header Section
```tsx
<div className="flex items-center justify-between p-6 border-b">
  <div className="flex items-center gap-3">
    <div className="p-2 bg-primary/10 rounded-lg">
      <Calculator className="h-5 w-5 text-primary" />
    </div>
    <div>
      <h2 className="text-xl font-semibold">Calculation Details</h2>
      <p className="text-sm text-muted-foreground">Daily Consistency</p>
    </div>
  </div>
  <button onClick={onClose}>
    <X className="h-5 w-5" />
  </button>
</div>
```

### Score Overview Section
```tsx
<div className="bg-muted/30 rounded-lg p-4">
  <div className="flex items-center justify-between mb-3">
    <h3 className="font-medium flex items-center gap-2">
      <Target className="h-4 w-4" />
      Score Contribution
    </h3>
    <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
      80% of target
    </div>
  </div>
  <div className="flex items-baseline gap-2">
    <span className="text-3xl font-bold text-blue-600">6.4</span>
    <span className="text-lg text-muted-foreground">/ 8 points</span>
  </div>
</div>
```

### Calculation Method Section (Pure calculation only)
```tsx
<div className="space-y-3">
  <h3 className="font-medium flex items-center gap-2">
    <Calculator className="h-4 w-4" />
    Calculation Method
  </h3>
  <div className="bg-card border rounded-lg p-4">
    <div className="font-mono text-lg text-primary">5.2h/day</div>
    <div className="mt-2 text-sm text-muted-foreground">Daily average</div>
  </div>
</div>
```

### Legend Section (Points mapping)
```tsx
<div className="space-y-3">
  <h3 className="font-medium flex items-center gap-2">
    <Info className="h-4 w-4" />
    Legend
  </h3>
  <div className="bg-card border rounded-lg p-4 space-y-4">
    {/* Current Result */}
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Daily average:</span>
        <span className="font-mono text-primary text-lg">5.2h/day</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Points Awarded:</span>
        <span className="font-medium text-primary">6.4/8 pts</span>
      </div>
    </div>

    {/* Scoring Scale */}
    <div className="pt-3 border-t">
      <h4 className="text-sm font-medium mb-3">Scoring Scale</h4>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span>≥5.0h/day</span>
          <span className="text-green-600 font-medium">8/8 points (Excellent)</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>3.0-4.9h/day</span>
          <span className="text-blue-600 font-medium">6/8 points (Good)</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>2.0-2.9h/day</span>
          <span className="text-yellow-600 font-medium">4/8 points (Fair)</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>&lt;2.0h/day</span>
          <span className="text-red-600 font-medium">2/8 points (Poor)</span>
        </div>
      </div>
    </div>

    {/* Data Source */}
    <div className="pt-3 border-t text-xs text-muted-foreground">
      <div><strong>Worked:</strong> 140h total this month</div>
      <div><strong>Progress:</strong> Based on monthly tracking targets</div>
    </div>
  </div>
</div>
```

## Key Visual/UX Elements

### Color Coding
- **Score**: Blue (#2563eb) for good performance (80% of target)
- **Calculation**: Primary color for the pure calculation value
- **Legend**: Green/Blue/Yellow/Red based on performance thresholds

### Typography
- **Calculation Value**: `font-mono text-lg` for the core calculation
- **Score**: `text-3xl font-bold` for prominence
- **Headers**: `font-medium` with icons for visual hierarchy

### Layout Structure
1. **Header** with icon + title
2. **Score Overview** with badge and large score display
3. **Calculation Method** showing just the pure calculation
4. **Legend** with current result + complete scoring scale + data source

This exact pattern should be replicated for ALL lowest-level calculations across both tree and organogram views.