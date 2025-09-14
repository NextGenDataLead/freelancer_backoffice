# Financial Dashboard Tab Navigation Implementation Plan

## Overview
Implement tab-based navigation below metrics cards on the financial dashboard (/dashboard/financieel) to provide seamless access to different financial modules while maintaining the overview metrics as a constant reference point.

## Current State Analysis
- ✅ Metrics cards working and responsive
- ✅ Financial overview and sidebar components exist
- ✅ Individual pages exist for each financial module:
  - `/dashboard/financieel/tijd` (Time Tracking)
  - `/dashboard/financieel/klanten` (Clients)
  - Individual routes planned for expenses, invoices, tax

## Design Strategy
Based on UX research, this approach combines:
- **Desktop**: Horizontal tabs below metrics (optimal for 5 modules)
- **Mobile**: Same tab structure but responsive design
- **Always-visible metrics**: Financial command center stays accessible
- **Single URL base**: `/dashboard/financieel` with tab state management

## Implementation Tasks

### Phase 1: Tab Component Architecture
- [ ] Create reusable `FinancialTabs` component
- [ ] Design tab styling with consistent theme
- [ ] Implement responsive tab behavior (horizontal scroll on mobile if needed)
- [ ] Add proper accessibility support (ARIA roles, keyboard navigation)

### Phase 2: Tab Content Integration
- [ ] Create tab content containers for each module:
  - [ ] Overview (current dashboard content)
  - [ ] Time Tracking (import from tijd page)
  - [ ] Expenses (create new content area)
  - [ ] Invoices (create new content area)
  - [ ] Clients (import from klanten page)
  - [ ] Tax (create new content area)

### Phase 3: State Management & Navigation
- [ ] Implement URL-based tab state (e.g., ?tab=tijd)
- [ ] Add browser history support for tab navigation
- [ ] Maintain deep-linking capability
- [ ] Handle initial tab selection based on URL params

### Phase 4: Content Migration & Organization
- [ ] Move TimeTrackingHub from overview to Time tab
- [ ] Integrate client management from klanten page to Clients tab
- [ ] Create placeholder content for upcoming modules (Expenses, Invoices, Tax)
- [ ] Ensure responsive behavior across all tab contents

### Phase 5: Responsive & Mobile Optimization
- [ ] Test tab navigation on mobile devices
- [ ] Implement horizontal scroll for tabs if needed on small screens
- [ ] Optimize tab content layout for mobile
- [ ] Add touch-friendly interactions

### Phase 6: Polish & Testing
- [ ] Add loading states for tab content
- [ ] Implement smooth transitions between tabs
- [ ] Test accessibility with screen readers
- [ ] Validate responsive behavior across breakpoints
- [ ] Performance testing for tab switching

## Technical Considerations

### Component Structure
```
/dashboard/financieel/
├── MetricsCards (always visible)
├── FinancialTabs
│   ├── TabNavigation
│   └── TabContent
│       ├── OverviewTab
│       ├── TimeTab
│       ├── ExpensesTab
│       ├── InvoicesTab
│       ├── ClientsTab
│       └── TaxTab
```

### URL Strategy
- Base: `/dashboard/financieel`
- Tab state: `/dashboard/financieel?tab=tijd`
- Fallback: Default to overview tab if no param

### Responsive Breakpoints
- Desktop (lg+): Full horizontal tabs
- Tablet (md): Horizontal tabs with scroll if needed
- Mobile (sm-): Horizontal scroll or stacked tabs

### Integration Points
- Import existing TimeTrackingHub component
- Import existing client management from klanten page
- Maintain consistency with current theme and styling
- Preserve all current functionality

## Success Criteria
- [x] Metrics cards remain always visible and functional
- [ ] Smooth tab navigation without page reloads
- [ ] Responsive design works across all devices
- [ ] All existing functionality preserved
- [ ] Deep-linking to specific tabs works
- [ ] Accessible navigation for screen readers
- [ ] Performance remains optimal with lazy loading

## Next Steps
1. Start with Phase 1: Create the tab component architecture
2. Implement basic tab navigation and styling
3. Begin migrating existing content to appropriate tabs
4. Test and refine responsive behavior

---
*Created: 2025-01-13*
*Status: Planning Complete - Ready for Implementation*