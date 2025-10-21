# Dashboard Financieel – Neumorphic Redesign Plan

## Context
- Source layout: `src/app/dashboard/financieel/page.tsx`
- Target look & feel: `neumorphic_banking_dashboard_tailwind_react_single_file.jsx`
- Preserve existing tab structure and routing logic.
- Sidebar must be icon-based with active styling and accessible tooltips/aria labels.
- Top bar must feature message + alert buttons and the Clerk-powered avatar dropdown (fully functional).
- Deliver a desktop viewport with no horizontal or vertical scroll while retaining graceful responsive behavior on smaller screens.

## Tasks
1. **Layout Audit**
   - Inspect `UnifiedFinancialDashboard` and each tab content component to identify spacing or fixed heights that could cause overflow.
   - Note any nested paddings/margins that need trimming when wrapped in neumorphic surfaces.

2. **Neumorphic Shell**
   - Replace the current horizontal `TabsList` with a full-height, left-aligned vertical navigation mirroring the neumorphic sidebar (icon buttons, active glow, tooltips).
   - Establish the main layout as a flex container spanning the viewport (`min-h-screen`), applying background gradients/shadows inspired by the reference component.

3. **Top Bar Styling**
   - Add a glassmorphic header inside the content column containing:
     - Message and alert icon buttons with subtle highlights/hover states.
     - The Clerk `UserButton`, restyled via `appearance` overrides to match the neumorphic capsule treatment.
   - Omit the search input while keeping the overall balance of controls.

4. **Content Wrapping & Tweaks**
   - Wrap each tab’s content in neumorphic/glass cards similar to `GlassCard` from the reference.
   - Adjust child components (including `UnifiedFinancialDashboard`) to remove redundant paddings or borders so the content fits cleanly within the new shells.
   - Ensure the primary dashboard view remains fully visible on desktop without scrolling; adjust grid sizing, card heights, or data density where needed.

5. **Responsive Polish**
   - Implement responsive behavior keeping the experience “best-in-class”:
     - Collapse or hide the sidebar behind a hamburger on small screens.
     - Stack header controls and cards gracefully as width decreases.
     - Maintain readable spacing and avoid overflow at breakpoints.

6. **Future Enhancements / To-Do**
   - Wire the message/alert buttons to real notifications when backend endpoints are ready.
   - Add motion/hover micro-interactions (e.g., soft shadows animating) after core layout is stable.
   - Expand accessibility testing to validate keyboard navigation and screen reader labels once layout changes are in place.

