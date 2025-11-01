# Category Breakdown Implementation - Continuation Plan

## ✅ Completed Steps

### 1. Enhanced GlassmorphicMetricCard Component
- ✅ Added `categoryBreakdown` prop to interface with:
  - `categories` array with label, amount, percentage, color, key
  - `onClick` callback for filtering
- ✅ Added category breakdown rendering section after split metrics
- ✅ Implemented click handlers and styling

**File Modified:** `/home/jimbojay/code/Backoffice/src/components/dashboard/glassmorphic-metric-card.tsx`

### 2. Added Category Bar CSS Styling
- ✅ Created `.metric-card__category-breakdown` container
- ✅ Styled `.metric-card__category-item` with hover effects
- ✅ Added `.metric-card__category-label`, `.metric-card__category-bar`, `.metric-card__category-bar-fill`, `.metric-card__category-amount`
- ✅ Implemented smooth transitions and color scheme

**File Modified:** `/home/jimbojay/code/Backoffice/src/app/styles/components.css` (lines 1093-1147)

---

## 🚧 Remaining Steps

### 3. Update Uitgaven Page (NEXT STEP)

**File:** `/home/jimbojay/code/Backoffice/src/app/dashboard/financieel-v2/uitgaven/page.tsx`

**Changes Needed:**

#### 3.1 Add Category Filter State
```typescript
// Add after existing state declarations (around line 32)
const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
```

#### 3.2 Create Category Mapping Helper
```typescript
// Add this helper function (around line 67, after getCategoryDisplayName)
const getCategoryKey = (displayName: string): string => {
  const reverseMap: Record<string, string> = {
    'Office Supplies': 'kantoorbenodigdheden',
    'Travel Expenses': 'reiskosten',
    'Meals & Business Entertainment': 'maaltijden_zakelijk',
    'Marketing & Advertising': 'marketing_reclame',
    'Software & ICT': 'software_ict',
    'Asset Depreciation': 'afschrijvingen',
    'Insurance': 'verzekeringen',
    'Professional Services': 'professionele_diensten',
    'Workspace & Office Costs': 'werkruimte_kantoor',
    'Vehicle Expenses': 'voertuigkosten',
    'Phone & Communication': 'telefoon_communicatie',
    'Professional Literature': 'vakliteratuur',
    'Work Clothing': 'werkkleding',
    'Business Gifts & Representation': 'relatiegeschenken_representatie',
    'Other Business Costs': 'overige_zakelijk'
  }
  return reverseMap[displayName] || displayName
}
```

#### 3.3 Prepare Category Breakdown Data
```typescript
// Add this useMemo hook after the expenseTrend calculation (around line 90)
const categoryBreakdown = useMemo(() => {
  if (!metrics?.categories?.topCategories || metrics.categories.topCategories.length === 0) {
    return undefined
  }

  const topCategories = metrics.categories.topCategories.slice(0, 3)
  const maxAmount = topCategories[0]?.totalAmount || 1

  // Calculate "Others" from remaining categories
  const othersCategories = metrics.categories.topCategories.slice(3)
  const othersTotal = othersCategories.reduce((sum, cat) => sum + cat.totalAmount, 0)

  const categories = topCategories.map((cat, index) => ({
    label: getCategoryDisplayName(cat.category),
    amount: cat.totalAmount,
    percentage: (cat.totalAmount / maxAmount) * 100,
    color: `rgba(251, 146, 60, ${0.8 - index * 0.15})`, // Orange gradient
    key: cat.category
  }))

  // Add "Others" if there are more categories
  if (othersTotal > 0) {
    categories.push({
      label: 'Others',
      amount: othersTotal,
      percentage: (othersTotal / maxAmount) * 100,
      color: 'rgba(234, 88, 12, 0.5)',
      key: 'others'
    })
  }

  return {
    categories,
    onClick: (categoryKey: string) => {
      if (categoryKey === 'others') return // Don't filter on "Others"
      setSelectedCategory(prev => prev === categoryKey ? null : categoryKey)
    }
  }
}, [metrics])
```

#### 3.4 Update Card 4 "Categories" with categoryBreakdown
```typescript
// Find the Categories card (around line 226-239) and update it:
<div style={{ gridColumn: 'span 3' }}>
  <GlassmorphicMetricCard
    icon={BarChart3}
    iconColor="rgba(251, 146, 60, 0.7)"
    title="Categories"
    value={loading ? '...' : metrics?.categories.uniqueCount || 0}
    subtitle="Different expense types"
    badge={{
      label: 'Active',
      color: 'rgba(251, 146, 60, 0.25)',
    }}
    categoryBreakdown={categoryBreakdown} // ADD THIS LINE
    gradient="linear-gradient(135deg, rgba(251, 146, 60, 0.12), rgba(249, 115, 22, 0.08))"
  />
</div>
```

---

### 4. Enhance ExpenseList Component with Category Filtering

**File:** `/home/jimbojay/code/Backoffice/src/components/financial/expenses/expense-list.tsx`

**Changes Needed:**

#### 4.1 Add selectedCategory Prop
```typescript
// Update the ExpenseListProps interface (around line 36)
interface ExpenseListProps {
  onAddClient?: () => void
  onEditExpense?: (expense: Expense) => void
  onDeleteExpense?: (expense: Expense) => void
  selectedCategory?: string | null // ADD THIS
}
```

#### 4.2 Update Component Function Signature
```typescript
// Update function signature (around line 59)
export function ExpenseList({
  onAddClient,
  onEditExpense,
  onDeleteExpense,
  selectedCategory // ADD THIS
}: ExpenseListProps) {
```

#### 4.3 Update API Call to Include Category Filter
```typescript
// Find the fetchExpenses function (around line 78-96)
// Update the API URL construction:
const fetchExpenses = async (page: number = 1) => {
  try {
    setLoading(true)

    // Build query params
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '20'
    })

    // Add category filter if selected
    if (selectedCategory) {
      params.append('category', selectedCategory)
    }

    const response = await fetch(`/api/expenses?${params.toString()}`)

    // ... rest of function
```

#### 4.4 Add useEffect to Refetch on Category Change
```typescript
// Add this useEffect after the existing useEffect (around line 110)
useEffect(() => {
  // Refetch when category filter changes
  fetchExpenses(1)
}, [selectedCategory])
```

#### 4.5 Add Filter Indicator UI
```typescript
// Add this before the table (around line 570, before the Table component)
{selectedCategory && (
  <div className="mb-4 flex items-center gap-2">
    <span className="text-sm text-slate-300">
      Filtered by: <strong>{getCategoryLabel(selectedCategory)}</strong>
    </span>
    <button
      onClick={() => onEditExpense?.(null)} // Use this to trigger parent to clear filter
      className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
    >
      Clear filter
    </button>
  </div>
)}
```

---

### 5. Update Expenses API Route to Support Category Filtering

**File:** `/home/jimbojay/code/Backoffice/src/app/api/expenses/route.ts`

**Changes Needed:**

#### 5.1 Add Category Filter Parameter
```typescript
// In the GET handler, extract category from searchParams
const searchParams = request.nextUrl.searchParams
const page = parseInt(searchParams.get('page') || '1')
const limit = parseInt(searchParams.get('limit') || '20')
const category = searchParams.get('category') // ADD THIS LINE
```

#### 5.2 Apply Category Filter to Query
```typescript
// Update the Supabase query to include category filter
let query = supabase
  .from('expenses')
  .select('*', { count: 'exact' })
  .eq('tenant_id', session.user.id)
  .order('expense_date', { ascending: false })

// Add category filter if provided
if (category) {
  query = query.eq('category', category)
}

// Continue with pagination
const { data: expenses, error, count } = await query
  .range((page - 1) * limit, page * limit - 1)
```

---

## 📋 Implementation Checklist

- [x] Enhance GlassmorphicMetricCard component
- [x] Add category bar CSS styling
- [ ] Add selectedCategory state to uitgaven page
- [ ] Create category data mapping in uitgaven page
- [ ] Update Categories card with categoryBreakdown prop
- [ ] Add selectedCategory prop to ExpenseList
- [ ] Update ExpenseList API call with category filter
- [ ] Add useEffect to refetch on category change
- [ ] Add filter indicator UI in ExpenseList
- [ ] Update expenses API route to accept category param
- [ ] Test category filtering end-to-end
- [ ] Test "Clear filter" functionality
- [ ] Verify responsive layout
- [ ] Test hover effects and animations

---

## 🎨 Color Scheme Reference

**Orange Gradient for Categories:**
1. Cat 1 (Top): `rgba(251, 146, 60, 0.8)` - Brightest
2. Cat 2: `rgba(251, 146, 60, 0.65)`
3. Cat 3: `rgba(251, 146, 60, 0.5)`
4. Others: `rgba(234, 88, 12, 0.5)` - Darker

---

## 🧪 Testing Scenarios

1. **Category Display:**
   - [ ] Top 3 categories show with correct amounts
   - [ ] "Others" aggregates remaining categories
   - [ ] Bars scale correctly based on percentages
   - [ ] Colors apply properly in gradient

2. **Click to Filter:**
   - [ ] Clicking category filters expense list
   - [ ] Active filter shows indicator
   - [ ] Clicking same category again clears filter
   - [ ] "Others" category is non-clickable

3. **API Integration:**
   - [ ] API returns filtered results
   - [ ] Pagination works with filter
   - [ ] RLS policies still apply
   - [ ] No expenses returns gracefully

4. **UI/UX:**
   - [ ] Hover effect on category bars
   - [ ] Smooth transitions
   - [ ] Responsive on mobile
   - [ ] Clear filter button works

---

## 📝 Notes

- **Category Mapping:** The `getCategoryDisplayName()` function already exists in the uitgaven page - we need to create a reverse mapping for filtering
- **"Others" Handling:** Don't allow filtering on "Others" since it's an aggregate
- **Clear Filter:** Two ways to clear - click same category again, or use "Clear filter" button in table
- **State Management:** Category filter state lives in parent (uitgaven page) and is passed to ExpenseList
- **API Performance:** Category filter adds one more WHERE clause - should be fast with proper indexing

---

## 🔄 Alternative Approaches Considered

1. **Expandable Section:** Decided against - doesn't fit current static card design
2. **Donut Chart:** Would take more space - horizontal bars are more compact
3. **Show All Categories:** Top 3 + Others provides good balance of insight vs space
4. **Separate Filter Component:** Keeping it integrated with table for simplicity

---

## 🚀 Future Enhancements (Out of Scope)

- Add keyboard navigation for category selection
- Add category color legends
- Show category trends (month over month)
- Export filtered data
- Save favorite filters
- Multi-category filtering

---

**Last Updated:** 2025-01-30
**Status:** 40% Complete (2/5 major steps done)
**Next Step:** Update uitgaven page with category mapping and filter state
