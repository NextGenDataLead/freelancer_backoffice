# Dashboard V2 (Glassmorphic) - Implementation Plan

## Project Overview
Port functionality from `/dashboard/financieel` to `/dashboard/financieel-v2` with a modern glassmorphic design (NovaWave template). The new dashboard features improved UX, gamification elements, and cleaner data visualization.

---

## ✅ Completed Work

### 1. Shared Layout & Navigation
**Status**: ✅ Complete
**File**: `/src/app/dashboard/financieel-v2/layout.tsx`

- Created shared layout with glassmorphic sidebar and topbar
- Implemented 6 navigation items: Dashboard, Time, Expenses, Invoices, Clients, Tax
- Added Settings button at bottom of sidebar
- Integrated tooltip system (desktop-only)
- Added scroll effects for topbar
- Set up Lucide icon initialization

### 2. Sub-pages Structure
**Status**: ✅ Complete
**Files**:
- `/src/app/dashboard/financieel-v2/tijd/page.tsx`
- `/src/app/dashboard/financieel-v2/uitgaven/page.tsx`
- `/src/app/dashboard/financieel-v2/facturen/page.tsx`
- `/src/app/dashboard/financieel-v2/klanten/page.tsx`
- `/src/app/dashboard/financieel-v2/belasting/page.tsx`

All pages wrap existing content components in glassmorphic cards.

### 3. Metric Card Components
**Status**: ✅ Complete

#### GlassmorphicMetricCard Component
**File**: `/src/components/dashboard/glassmorphic-metric-card.tsx`

Features:
- Icon with customizable color background
- Main value and subtitle
- Progress bar with target line
- Badges (MTD, SaaS, etc.)
- Trend comparison with icons (TrendingUp/TrendingDown)
- Split metrics display
- Customizable gradients

**CSS Styles**: `/src/app/styles/components.css` (lines 811-991)

#### GlassmorphicBusinessHealth Component
**File**: `/src/components/dashboard/glassmorphic-business-health.tsx`

Features:
- Circular score gauge (80x80px) with glow effect
- Tier-based styling (LEGEND/CHAMPION/BUILDER/STARTER)
- Animated pulsing background gradient
- Status badge with emoji
- Collapsible 4-pillar breakdown (Profit, Cash Flow, Efficiency, Risk)
- "View Pillars" button
- "Report" button (for Health Report modal)
- Click handlers for pillar cards (opens detail modals)

### 4. Main Dashboard Page
**Status**: ✅ Complete
**File**: `/src/app/dashboard/financieel-v2/page.tsx`

Implemented:
- Data fetching from 3 APIs (dashboard-metrics, time-stats, client-revenue)
- Client-side health score calculation using `healthScoreEngine`
- MTD calculations based on profit targets
- SaaS detection logic
- 5 monthly progress metric cards with conditional rendering
- 1 business health card
- Toggle button functionality (Show 2/4 or Show 4/6 cards)

**Card Logic**:
- **SaaS Disabled**: Default 2 cards (Revenue MTD + Business Health), expand to 4
- **SaaS Enabled**: Default 4 cards (Revenue MTD + Active Users + Business Health + 1 more), expand to 6

**Monthly Progress Cards**:
1. Revenue MTD (always visible) - with MTD target line on monthly budget gauge
2. Hours MTD (conditional)
3. Avg Rate (conditional)
4. Active Users (SaaS only)
5. Avg Fee (SaaS only, expanded view)
6. Business Health (always visible)

---

## 🚧 In Progress / Pending Work

### 5. Modal Integration ⏳ PENDING
**Priority**: High
**Estimated Effort**: 6-8 hours

The Business Health card has "Report" button and clickable pillar cards, but these need to open the detailed modals from the original dashboard.

#### Task 5.1: Extract Modal Components
**Files to Create**:
- `/src/components/dashboard/modals/health-explanation-modal.tsx`
- `/src/components/dashboard/modals/health-report-modal.tsx`
- `/src/components/dashboard/modals/calculation-detail-modal.tsx`

**Source Reference**: `/src/components/dashboard/unified-financial-dashboard.tsx` (lines 1125-1965)

**What to Extract**:

##### A. Health Explanation Modal
Shows detailed breakdown for each pillar (profit, cashflow, efficiency, risk).

**Props Interface**:
```typescript
interface HealthExplanationModalProps {
  pillar: 'profit' | 'cashflow' | 'efficiency' | 'risk' | null
  healthScoreResults: HealthScoreOutputs | null
  subscriptionEnabled: boolean
  onClose: () => void
  onShowCalculationDetail: (metricId: string, metricName: string, score: number, maxScore: number, detailedCalculation?: any) => void
}
```

**Key Components**:
- Modal overlay with backdrop blur
- Header with pillar icon, title, and current score
- Overview section with pillar description
- `HealthScoreHierarchicalTree` component integration
- Detailed metric breakdown
- Close button

**Dependencies**:
- `/src/components/dashboard/health-score-hierarchical-tree.tsx`
- `/src/lib/health-score-metric-definitions.ts`

##### B. Health Report Modal
Comprehensive business health report with all 4 pillars and recommendations.

**Props Interface**:
```typescript
interface HealthReportModalProps {
  healthScoreResults: HealthScoreOutputs | null
  dashboardMetrics: DashboardMetricsResponse['data'] | null
  subscriptionEnabled: boolean
  onClose: () => void
  onShowExplanation: (pillar: string) => void
  onNavigateToTab?: (tabId: string) => void
}
```

**Sections**:
1. Overall health score with tier badge
2. 4 pillar cards (clickable to open explanation modal)
3. Smart recommendations based on scores
4. Action buttons for each recommendation
5. Rolling 30-day context

##### C. Calculation Detail Modal
Detailed metric calculation breakdown.

**Props Interface**:
```typescript
interface CalculationDetailModalProps {
  metricId: string
  metricName: string
  calculationValue?: string
  calculationDescription?: string
  score: number
  maxScore: number
  detailedCalculation?: any
  onClose: () => void
}
```

**Uses**: `/src/components/dashboard/calculation-detail-modal.tsx` (already exists)

#### Task 5.2: Integrate Modals into V2 Dashboard
**File**: `/src/app/dashboard/financieel-v2/page.tsx`

**Steps**:
1. Import the 3 modal components
2. Add state management:
   ```typescript
   const [showExplanation, setShowExplanation] = useState<string | null>(null)
   const [showHealthReport, setShowHealthReport] = useState(false)
   const [calculationDetailModal, setCalculationDetailModal] = useState<{...} | null>(null)
   ```
3. Pass handlers to `GlassmorphicBusinessHealth`:
   ```typescript
   <GlassmorphicBusinessHealth
     healthScores={healthScores}
     onShowHealthReport={() => setShowHealthReport(true)}
     onShowExplanation={setShowExplanation}
   />
   ```
4. Render modals at end of component:
   ```tsx
   {showExplanation && (
     <HealthExplanationModal
       pillar={showExplanation}
       healthScoreResults={healthScoreResults}
       subscriptionEnabled={subscriptionEnabled}
       onClose={() => setShowExplanation(null)}
       onShowCalculationDetail={setCalculationDetailModal}
     />
   )}
   {showHealthReport && (
     <HealthReportModal
       healthScoreResults={healthScoreResults}
       dashboardMetrics={dashboardMetrics}
       subscriptionEnabled={subscriptionEnabled}
       onClose={() => setShowHealthReport(false)}
       onShowExplanation={setShowExplanation}
     />
   )}
   {calculationDetailModal && (
     <CalculationDetailModal {...calculationDetailModal} onClose={() => setCalculationDetailModal(null)} />
   )}
   ```

5. Test all modal interactions:
   - Click "Report" button → opens Health Report modal
   - Click pillar card → opens Health Explanation modal
   - Click metric in tree → opens Calculation Detail modal
   - All close buttons work correctly
   - Modal layering (z-index) works correctly

---

## 📋 Future Work (Not Yet Started)

### 6. Port Remaining Dashboard Features
**Priority**: Medium
**Estimated Effort**: 10-12 hours

#### Task 6.1: Quick Actions Bar
**Source**: `/src/components/dashboard/quick-actions-bar.tsx`

Port to topbar in v2 layout:
- Timer start/stop
- Log expense
- Create invoice
- Tax reporting status

**Integration Point**: `/src/app/dashboard/financieel-v2/layout.tsx` topbar

#### Task 6.2: Real-time Updates
**Source**: `/src/components/dashboard/unified-financial-dashboard.tsx`

Implement:
- Real-time dashboard metrics updates
- WebSocket/polling for live data
- Optimistic UI updates
- Loading states and skeletons

#### Task 6.3: Smart Alerts System
**Source**: `/src/lib/smart-rules-engine.ts`

Integrate alert system:
- Overdue invoice alerts
- Time tracking reminders
- Billing efficiency warnings
- Cash flow alerts

Display in:
- Notification bell in topbar
- Alert cards on dashboard
- Toast notifications

### 7. Enhanced Data Visualizations
**Priority**: Low
**Estimated Effort**: 8-10 hours

#### Task 7.1: Revenue Chart Enhancement
**Current**: Basic Chart.js line chart
**Target**: Interactive glassmorphic chart with:
- Multiple data series
- Hover tooltips
- Zoom/pan capabilities
- Export functionality

#### Task 7.2: Add Missing Charts
Port from `/dashboard/financieel`:
- Hours trend chart
- Rate evolution chart
- Subscription growth chart (if SaaS enabled)
- Client revenue distribution

#### Task 7.3: Mini Charts for Metric Cards
Add sparklines to metric cards showing:
- 7-day trend
- Month-over-month comparison
- Target progress over time

### 8. Mobile Optimization
**Priority**: Medium
**Estimated Effort**: 6-8 hours

#### Task 8.1: Responsive Metric Cards
- Stack cards vertically on mobile
- Adjust font sizes and spacing
- Optimize touch targets
- Simplify complex visualizations

#### Task 8.2: Mobile Navigation
- Hamburger menu functionality
- Swipe gestures for card navigation
- Bottom navigation bar (optional)
- Pull-to-refresh

#### Task 8.3: Modal Adaptations
- Full-screen modals on mobile
- Swipe-to-close gestures
- Simplified layouts for small screens

### 9. Performance Optimization
**Priority**: Low
**Estimated Effort**: 4-6 hours

#### Task 9.1: Code Splitting
- Dynamic imports for heavy components
- Route-based code splitting
- Lazy load modals

#### Task 9.2: Data Optimization
- Implement caching strategy
- Debounce API calls
- Use React Query or SWR for data fetching
- Memoize expensive calculations

#### Task 9.3: Asset Optimization
- Optimize icon loading
- Reduce bundle size
- Implement virtual scrolling for large lists

### 10. Testing & Quality Assurance
**Priority**: High
**Estimated Effort**: 8-10 hours

#### Task 10.1: Unit Tests
Test coverage for:
- Metric card components
- Business health calculations
- Data transformation utilities
- Modal interactions

#### Task 10.2: Integration Tests
Test:
- API data fetching
- Health score engine integration
- Toggle functionality
- SaaS enabled/disabled scenarios

#### Task 10.3: E2E Tests (Playwright)
User flows:
- Navigate between pages
- View metric details
- Open/close modals
- Toggle card visibility
- Switch between SaaS modes

### 11. Accessibility (A11y)
**Priority**: Medium
**Estimated Effort**: 4-6 hours

#### Task 11.1: Keyboard Navigation
- Tab order for cards and buttons
- Escape to close modals
- Arrow keys for navigation
- Focus management

#### Task 11.2: Screen Reader Support
- ARIA labels for all interactive elements
- Semantic HTML structure
- Announce dynamic content changes
- Descriptive link text

#### Task 11.3: Color Contrast
- Ensure WCAG AA compliance
- Test with color blindness simulators
- Provide alternative visual indicators

---

## 🔧 Technical Details

### API Endpoints Used
1. `/api/invoices/dashboard-metrics` - Invoice and payment metrics
2. `/api/time-entries/stats` - Time tracking and subscription data
3. `/api/financial/client-revenue` - Client revenue distribution

### State Management
- Local component state with `useState`
- Shared hooks: `useProfitTargets()`
- Health score calculation: `healthScoreEngine.process()`

### Key Dependencies
- `lucide-react` - Icons
- `healthScoreEngine` - Business health calculations
- `useProfitTargets` - Profit target configuration
- Chart.js - Data visualization

### Design System
- **Theme**: NovaWave glassmorphic template
- **Colors**: CSS variables in `/src/app/styles/theme.css`
- **Animations**: `/src/app/styles/animations.css`
- **Components**: `/src/app/styles/components.css`

### Responsive Breakpoints
- Mobile: < 1024px
- Tablet: 1024px - 1439px
- Desktop: ≥ 1440px

---

## 📝 Notes & Considerations

### Design Decisions
1. **K notation for targets**: Uses "€6.0K" format to save space in subtitles
2. **Revenue gauge**: Shows progress against full monthly budget with MTD target line
3. **MTD badges**: All base metric cards use "MTD" badge for consistency
4. **Business Health gamification**: Circular gauge, tier badges, pulsing animations
5. **Pillar cards**: Clean, readable design without excessive animations

### Known Issues
- [ ] Business Health modals not yet implemented (opens navigation to old dashboard)
- [ ] Chart.js initialization delay (300ms timeout)
- [ ] Tooltip reinitialization on route change (potential memory leak)

### Future Enhancements
- Add chart export functionality
- Implement custom date range selector
- Add comparison mode (current vs previous period)
- Create widget/card customization
- Add dark/light theme toggle
- Implement printable report view

---

## 🚀 Getting Started for Next Developer

### Prerequisites
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

### Access V2 Dashboard
Navigate to: `http://localhost:3000/dashboard/financieel-v2`

### Key Files to Understand
1. `/src/app/dashboard/financieel-v2/page.tsx` - Main dashboard logic
2. `/src/components/dashboard/glassmorphic-metric-card.tsx` - Metric card component
3. `/src/components/dashboard/glassmorphic-business-health.tsx` - Health card component
4. `/src/app/dashboard/financieel-v2/layout.tsx` - Shared layout and navigation
5. `/src/components/dashboard/unified-financial-dashboard.tsx` - Reference implementation

### Testing Scenarios
1. **SaaS Disabled**: Set profit targets with `target_monthly_active_users = 0`
2. **SaaS Enabled**: Set profit targets with `target_monthly_active_users > 0` and `target_avg_subscription_fee > 0`
3. **Toggle Cards**: Click "Show 4" or "Show 6" to test card visibility
4. **Business Health**: Click "View Pillars" to expand/collapse

---

## ✅ Completion Checklist

### Phase 1: Core Dashboard (COMPLETED)
- [x] Shared layout with sidebar and topbar
- [x] Navigation with tooltips
- [x] Settings button
- [x] GlassmorphicMetricCard component
- [x] GlassmorphicBusinessHealth component
- [x] Data fetching and health score calculation
- [x] 5 monthly progress metric cards
- [x] Conditional rendering (SaaS enabled/disabled)
- [x] Toggle button functionality
- [x] Revenue gauge with MTD target line
- [x] K notation for targets

### Phase 2: Modals & Interactivity (PENDING)
- [ ] Extract HealthExplanationModal component
- [ ] Extract HealthReportModal component
- [ ] Integrate modals into V2 dashboard
- [ ] Wire up pillar card click handlers
- [ ] Wire up "Report" button
- [ ] Test all modal interactions
- [ ] Add keyboard shortcuts (Escape to close)

### Phase 3: Additional Features (NOT STARTED)
- [ ] Quick Actions Bar integration
- [ ] Real-time updates
- [ ] Smart alerts system
- [ ] Enhanced charts
- [ ] Mobile optimization
- [ ] Performance optimization
- [ ] Testing suite
- [ ] Accessibility improvements

---

## 📞 Support & Resources

### Documentation
- NovaWave template: `/template-novawave/`
- Health Score Engine: `/src/lib/health-score-engine.ts`
- Metric Definitions: `/src/lib/health-score-metric-definitions.ts`

### Reference Components
- Original dashboard: `/src/components/dashboard/unified-financial-dashboard.tsx`
- Compact cards: `/src/components/dashboard/compact-metric-card.tsx`
- Original health card: `/src/components/dashboard/compact-business-health.tsx`

### Contact
For questions or clarifications on implementation details, refer to this plan and the completed code.

---

**Last Updated**: 2025-01-19
**Version**: 1.0
**Status**: Phase 1 Complete, Phase 2 Planned
