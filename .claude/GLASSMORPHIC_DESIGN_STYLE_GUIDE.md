# Glassmorphic Design System Style Guide

## Overview
This style guide documents the glassmorphic design system used in the Financial Dashboard v2 (`/dashboard/financieel-v2`). The expenses page (`/uitgaven`) has been converted to this design system and serves as the reference implementation.

**Reference Pages:**
- ✅ Main Dashboard: `/dashboard/financieel-v2` (Original)
- ✅ Expenses: `/dashboard/financieel-v2/uitgaven` (Converted)
- ✅ Recurring Expenses: `/dashboard/financieel-v2/terugkerende-uitgaven` (Converted)
- ✅ Time: `/dashboard/financieel-v2/tijd` (Converted)
- ✅ Invoices: `/dashboard/financieel-v2/facturen` (Converted)
- ✅ Clients: `/dashboard/financieel-v2/klanten` (Converted)
- ✅ Tax: `/dashboard/financieel-v2/belasting` (Converted)

---

## 1. Page Structure

### 1.1 Basic Layout
Every page should use the `main-grid` layout with `glass-card` articles:

```tsx
export default function YourPage() {
  return (
    <section className="main-grid" aria-label="Page content">
      {/* Article sections go here */}
    </section>
  )
}
```

### 1.2 Article Structure
Pages are composed of `<article>` elements with the `glass-card` class:

```tsx
<article
  className="glass-card"
  style={{ gridColumn: 'span 12', gridRow: 'span 1' }}
  aria-labelledby="section-title-id"
>
  {/* Article content */}
</article>
```

**Grid Spanning Rules:**
- `gridColumn: 'span 12'` - Full width
- `gridColumn: 'span 6'` - Half width
- `gridColumn: 'span 4'` - One third width
- `gridColumn: 'span 3'` - One quarter width

---

## 2. Navigation Integration

### 2.1 Page Title & Subtitle
Page titles and subtitles are configured in the layout file, NOT in the page itself:

**File:** `src/app/dashboard/financieel-v2/layout.tsx`

```tsx
const navItems = [
  {
    href: '/dashboard/financieel-v2/your-page',
    icon: 'icon-name',
    label: 'Page Title',
    tooltip: 'Page Title',
    subtitle: 'Your page subtitle description here'
  },
]
```

**Important:**
- The topbar has a fixed height of `80px`
- Subtitles appear below the title in the topbar
- Do NOT add page titles inside the glass-card sections
- The first card should start with metric cards or content directly

---

## 3. Header with Action Buttons

### 3.1 Card Header with Buttons
When you need action buttons at the top of a section:

```tsx
<article className="glass-card" style={{ gridColumn: 'span 12', gridRow: 'span 1' }}>
  <div className="card-header">
    <div className="flex gap-3 ml-auto">
      <button
        type="button"
        className="action-chip"
        onClick={() => handleAction()}
      >
        <IconName className="h-4 w-4 mr-2" />
        Button Label
      </button>
    </div>
  </div>

  {/* Rest of card content */}
</article>
```

### 3.2 Button Variants

**Primary Action Button:**
```tsx
<button type="button" className="action-chip">
  <Plus className="h-4 w-4 mr-2" />
  Primary Action
</button>
```

**Secondary Action Button (with custom styling):**
```tsx
<button
  type="button"
  className="action-chip"
  style={{
    background: 'rgba(139, 92, 246, 0.15)',
    border: '1px solid rgba(139, 92, 246, 0.3)'
  }}
>
  <Repeat className="h-4 w-4 mr-2" />
  Secondary Action
</button>
```

---

## 4. Glassmorphic Metric Cards

### 4.1 Import Required Component
```tsx
import { GlassmorphicMetricCard } from '@/components/dashboard/glassmorphic-metric-card'
```

### 4.2 Basic Card Structure
Metric cards should be placed in a custom 12-column grid:

```tsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
  <div style={{ gridColumn: 'span 3' }}>
    <GlassmorphicMetricCard
      icon={IconName}
      iconColor="rgba(239, 68, 68, 0.7)"
      title="Card Title"
      value="Display Value"
      subtitle="Description text"
      badge={{
        label: 'Badge',
        color: 'rgba(239, 68, 68, 0.25)',
      }}
      gradient="linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.08))"
    />
  </div>
</div>
```

### 4.3 Card Grid Layouts

**4 Cards in One Row (Most Common):**
```tsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
  <div style={{ gridColumn: 'span 3' }}>
    <GlassmorphicMetricCard {...card1Props} />
  </div>
  <div style={{ gridColumn: 'span 3' }}>
    <GlassmorphicMetricCard {...card2Props} />
  </div>
  <div style={{ gridColumn: 'span 3' }}>
    <GlassmorphicMetricCard {...card3Props} />
  </div>
  <div style={{ gridColumn: 'span 3' }}>
    <GlassmorphicMetricCard {...card4Props} />
  </div>
</div>
```

**6 Cards in Two Rows (Dashboard Pattern):**
```tsx
<div className="card-grid">
  <GlassmorphicMetricCard {...card1Props} /> {/* Each spans 6 columns by default */}
  <GlassmorphicMetricCard {...card2Props} />
  <GlassmorphicMetricCard {...card3Props} />
  <GlassmorphicMetricCard {...card4Props} />
  <GlassmorphicMetricCard {...card5Props} />
  <GlassmorphicMetricCard {...card6Props} />
</div>
```

---

## 5. Metric Card Props Reference

### 5.1 Required Props
```tsx
interface GlassmorphicMetricCardProps {
  icon: LucideIcon           // Lucide icon component
  iconColor: string          // RGBA color for icon background
  title: string              // Card title
  value: string | number     // Main value display
  subtitle: string           // Description text below value
  gradient?: string          // Background gradient (optional but recommended)
}
```

### 5.2 Optional Props

**Badge:**
```tsx
badge={{
  label: 'MTD',
  color: 'rgba(239, 68, 68, 0.25)',
}}
```

**Trend Comparison (Standard):**
```tsx
trendComparison={{
  icon: TrendingUp,
  value: '+19.4%',
  label: 'vs last month',
  isPositive: true,
}}
```

**Trend Comparison (Inline - saves vertical space):**
```tsx
trendComparison={{
  icon: TrendingDown,
  value: '+19.4%',
  label: 'vs last month',
  isPositive: false,
  inline: true,  // Displays trend in subtitle position
}}
```

**Progress Bar:**
```tsx
progress={75}                    // 0-100 percentage
progressColor="rgba(16, 185, 129, 1)"
targetLine={50}                  // Optional target indicator position
```

**Split Metrics:**
```tsx
splitMetrics={{
  label1: 'Time Revenue',
  value1: '€5,000',
  label2: 'Platform Revenue',
  value2: '€3,000',
}}
```

---

## 6. Color Palette

### 6.1 Predefined Color Sets

**Red (Negative/Expenses):**
```tsx
iconColor: "rgba(239, 68, 68, 0.7)"
badgeColor: "rgba(239, 68, 68, 0.25)"
gradient: "linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.08))"
```

**Cyan (Financial/VAT):**
```tsx
iconColor: "rgba(34, 211, 238, 0.7)"
badgeColor: "rgba(34, 211, 238, 0.25)"
gradient: "linear-gradient(135deg, rgba(34, 211, 238, 0.12), rgba(6, 182, 212, 0.08))"
```

**Purple (Automation/Features):**
```tsx
iconColor: "rgba(139, 92, 246, 0.7)"
badgeColor: "rgba(139, 92, 246, 0.25)"
gradient: "linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(124, 58, 237, 0.08))"
```

**Orange (Metrics/Analytics):**
```tsx
iconColor: "rgba(251, 146, 60, 0.7)"
badgeColor: "rgba(251, 146, 60, 0.25)"
gradient: "linear-gradient(135deg, rgba(251, 146, 60, 0.12), rgba(249, 115, 22, 0.08))"
```

**Green (Positive/Revenue):**
```tsx
iconColor: "rgba(16, 185, 129, 0.7)"
badgeColor: "rgba(16, 185, 129, 0.25)"
gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.08))"
```

**Blue (Time/Hours):**
```tsx
iconColor: "rgba(59, 130, 246, 0.7)"
badgeColor: "rgba(59, 130, 246, 0.25)"
gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(37, 99, 235, 0.08))"
```

**Pink (Users/SaaS):**
```tsx
iconColor: "rgba(236, 72, 153, 0.7)"
badgeColor: "rgba(236, 72, 153, 0.25)"
gradient: "linear-gradient(135deg, rgba(236, 72, 153, 0.12), rgba(219, 39, 119, 0.08))"
```

---

## 7. Secondary Cards (Non-Metric)

### 7.1 Card with Title and Content
For cards that don't use glassmorphic metrics:

```tsx
<article className="glass-card" style={{ gridColumn: 'span 4', gridRow: 'span 1' }}>
  <div className="card-header">
    <h2 className="card-header__title" id="section-title">
      Section Title
    </h2>
  </div>
  <CardContent className="pt-6">
    {/* Your content here */}
  </CardContent>
</article>
```

### 7.2 Text Styling Inside Cards
Use glassmorphic-friendly colors:

```tsx
// Primary text
<span className="text-sm text-slate-100">Primary text</span>

// Secondary text
<span className="text-sm text-slate-300">Secondary text</span>

// Muted text
<span className="text-sm text-slate-400">Muted text</span>

// Labels
<span className="text-sm font-medium text-slate-100">Label</span>
```

---

## 8. Modal/Dialog Integration

### 8.1 Glassmorphic Dialog
Use the glass variant for consistency:

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <button type="button" className="action-chip">
      <Plus className="h-4 w-4 mr-2" />
      Open Dialog
    </button>
  </DialogTrigger>
  <DialogContent
    className={cn(
      'max-w-2xl max-h-[90vh] overflow-y-auto',
      'bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95',
      'border border-white/10 backdrop-blur-2xl',
      'shadow-[0_40px_120px_rgba(15,23,42,0.45)] text-slate-100'
    )}
  >
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
    </DialogHeader>
    <YourFormComponent
      variant="glass"
      onSuccess={handleSuccess}
      onCancel={() => setIsOpen(false)}
    />
  </DialogContent>
</Dialog>
```

---

## 9. Complete Page Template

### 9.1 Expenses Page Pattern
Here's a complete template following the expenses page structure:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { GlassmorphicMetricCard } from '@/components/dashboard/glassmorphic-metric-card'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, IconName1, IconName2, IconName3, IconName4 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function YourPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<any>(null)

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/your-endpoint')
        const data = await response.json()
        if (data.success) {
          setMetrics(data.data)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleFormSuccess = () => {
    setShowCreateForm(false)
    // Refresh data
  }

  return (
    <section className="main-grid" aria-label="Your page content">
      {/* Metric Cards Section */}
      <article className="glass-card" style={{ gridColumn: 'span 12', gridRow: 'span 1' }}>
        <div className="card-header">
          <div className="flex gap-3 ml-auto">
            <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
              <DialogTrigger asChild>
                <button type="button" className="action-chip">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New
                </button>
              </DialogTrigger>
              <DialogContent
                className={cn(
                  'max-w-2xl max-h-[90vh] overflow-y-auto',
                  'bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95',
                  'border border-white/10 backdrop-blur-2xl',
                  'shadow-[0_40px_120px_rgba(15,23,42,0.45)] text-slate-100'
                )}
              >
                <DialogHeader>
                  <DialogTitle>Create New Item</DialogTitle>
                </DialogHeader>
                <YourForm
                  onSuccess={handleFormSuccess}
                  onCancel={() => setShowCreateForm(false)}
                  variant="glass"
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
          {/* Card 1 */}
          <div style={{ gridColumn: 'span 3' }}>
            <GlassmorphicMetricCard
              icon={IconName1}
              iconColor="rgba(239, 68, 68, 0.7)"
              title="Metric 1"
              value={loading ? '...' : metrics?.value1 || 0}
              subtitle="Description"
              badge={{
                label: 'Label',
                color: 'rgba(239, 68, 68, 0.25)',
              }}
              gradient="linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.08))"
            />
          </div>

          {/* Card 2 */}
          <div style={{ gridColumn: 'span 3' }}>
            <GlassmorphicMetricCard
              icon={IconName2}
              iconColor="rgba(34, 211, 238, 0.7)"
              title="Metric 2"
              value={loading ? '...' : metrics?.value2 || 0}
              subtitle="Description"
              badge={{
                label: 'Label',
                color: 'rgba(34, 211, 238, 0.25)',
              }}
              gradient="linear-gradient(135deg, rgba(34, 211, 238, 0.12), rgba(6, 182, 212, 0.08))"
            />
          </div>

          {/* Card 3 */}
          <div style={{ gridColumn: 'span 3' }}>
            <GlassmorphicMetricCard
              icon={IconName3}
              iconColor="rgba(139, 92, 246, 0.7)"
              title="Metric 3"
              value={loading ? '...' : metrics?.value3 || 0}
              subtitle="Description"
              badge={{
                label: 'Label',
                color: 'rgba(139, 92, 246, 0.25)',
              }}
              gradient="linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(124, 58, 237, 0.08))"
            />
          </div>

          {/* Card 4 */}
          <div style={{ gridColumn: 'span 3' }}>
            <GlassmorphicMetricCard
              icon={IconName4}
              iconColor="rgba(251, 146, 60, 0.7)"
              title="Metric 4"
              value={loading ? '...' : metrics?.value4 || 0}
              subtitle="Description"
              badge={{
                label: 'Label',
                color: 'rgba(251, 146, 60, 0.25)',
              }}
              gradient="linear-gradient(135deg, rgba(251, 146, 60, 0.12), rgba(249, 115, 22, 0.08))"
            />
          </div>
        </div>
      </article>

      {/* Secondary Cards Row (3 cards) */}
      <article className="glass-card" style={{ gridColumn: 'span 4', gridRow: 'span 1' }}>
        <div className="card-header">
          <h2 className="card-header__title">Section Title 1</h2>
        </div>
        <CardContent className="pt-6">
          {/* Content here */}
        </CardContent>
      </article>

      <article className="glass-card" style={{ gridColumn: 'span 4', gridRow: 'span 1' }}>
        <div className="card-header">
          <h2 className="card-header__title">Section Title 2</h2>
        </div>
        <CardContent className="pt-6">
          {/* Content here */}
        </CardContent>
      </article>

      <article className="glass-card" style={{ gridColumn: 'span 4', gridRow: 'span 1' }}>
        <div className="card-header">
          <h2 className="card-header__title">Section Title 3</h2>
        </div>
        <CardContent className="pt-6">
          {/* Content here */}
        </CardContent>
      </article>

      {/* Full Width Data Section */}
      <article className="glass-card" style={{ gridColumn: 'span 12', gridRow: 'span 1' }}>
        <div className="card-header">
          <h2 className="card-header__title">Data Table/List</h2>
          <p className="card-header__subtitle">Description of the data</p>
        </div>
        <CardContent className="pt-6">
          {/* Table or list component here */}
        </CardContent>
      </article>
    </section>
  )
}
```

---

## 10. Common Patterns

### 10.1 Loading States
Always show loading state for metrics:

```tsx
value={loading ? '...' : formatValue(metrics?.value || 0)}
```

### 10.2 Conditional Rendering
For optional cards (e.g., SaaS features):

```tsx
{isFeatureEnabled && (
  <div style={{ gridColumn: 'span 3' }}>
    <GlassmorphicMetricCard {...cardProps} />
  </div>
)}
```

### 10.3 Trend Indicators
Use the inline trend for compact cards:

```tsx
const isTrendPositive = trend < 0 // For expenses, lower is better
const trendValue = trend >= 0 ? '+' : ''

trendComparison={{
  icon: isTrendPositive ? TrendingDown : TrendingUp,
  value: `${trendValue}${trend.toFixed(1)}%`,
  label: 'vs last month',
  isPositive: isTrendPositive,
  inline: true, // Saves vertical space
}}
```

---

## 11. Do's and Don'ts

### ✅ DO:
- Use `GlassmorphicMetricCard` for all metric displays
- Configure page title and subtitle in the layout file
- Use the predefined color palette for consistency
- Apply the `action-chip` class for action buttons
- Use `glass-card` class for all article containers
- Center quick action buttons in the topbar
- Maintain 80px topbar height with subtitles

### ❌ DON'T:
- Don't add page titles inside glass-card sections
- Don't use shadcn `Card` for metric displays (use GlassmorphicMetricCard)
- Don't use custom colors outside the predefined palette
- Don't wrap the entire page in a single glass-card
- Don't add margin/padding that changes card start position
- Don't use the old `Button` component for header actions (use `action-chip`)

---

## 12. Testing Checklist

After converting a page, verify:

- [ ] Page title appears in topbar
- [ ] Subtitle appears below title in topbar (if configured)
- [ ] Topbar height is consistent (80px)
- [ ] Quick action buttons are centered in topbar
- [ ] First card starts at same vertical position as other pages
- [ ] Metric cards use GlassmorphicMetricCard component
- [ ] Colors match predefined palette
- [ ] Action buttons use `action-chip` class
- [ ] Grid layout uses `main-grid` and `glass-card`
- [ ] Loading states display correctly
- [ ] Modals use glassmorphic styling
- [ ] All text is readable with glassmorphic backgrounds

---

## 13. File References

**Key Files:**
- Layout: `src/app/dashboard/financieel-v2/layout.tsx`
- Component: `src/components/dashboard/glassmorphic-metric-card.tsx`
- Reference Page: `src/app/dashboard/financieel-v2/uitgaven/page.tsx`
- Styles: `src/app/styles/components.css`, `src/app/styles/theme.css`

**Import Patterns:**
```tsx
import { GlassmorphicMetricCard } from '@/components/dashboard/glassmorphic-metric-card'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
```

---

## 14. Quick Conversion Steps

1. **Update Layout** - Add subtitle to navItems in `layout.tsx`
2. **Restructure Page** - Replace wrapper with `main-grid` + multiple `glass-card` articles
3. **Convert Metrics** - Replace shadcn Cards with GlassmorphicMetricCard
4. **Update Buttons** - Change to `action-chip` class
5. **Fix Dialogs** - Apply glassmorphic styling to modals
6. **Test Consistency** - Compare with expenses page visually

---

**Last Updated:** 2025-01-24
**Version:** 1.0
**Author:** Claude Code
