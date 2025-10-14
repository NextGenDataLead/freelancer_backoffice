# Client Health Dashboard - Enhancement Implementation Checklist

**Status:** Not Started
**Priority:** Medium
**Estimated Time:** 8-12 hours
**Dependencies:** None

**Documentation:** `Final_Documentation/CLIENT_HEALTH_DASHBOARD.md`

---

## Overview

Implement three critical enhancements to the Client Health Dashboard:
1. Payment terms relative scoring (instead of absolute days)
2. Comprehensive status system for clients and projects
3. Remove communication score from engagement calculation

---

## Enhancement #1: Payment Terms Relative Scoring

**Estimated Time:** 2 hours
**Files:** `src/components/dashboard/client-health-dashboard.tsx`

### Implementation Tasks

- [ ] **Step 1.1:** Locate payment scoring logic (line 275)
  - File: `src/components/dashboard/client-health-dashboard.tsx`
  - Find: `if (client.payment.averageDays > 45)`

- [ ] **Step 1.2:** Update payment behavior calculation
  ```typescript
  // Replace lines 275-286 with relative calculation
  const clientPaymentTerms = client.payment.paymentTerms || 30
  const paymentPerformance = averageDays / clientPaymentTerms

  if (paymentPerformance <= 1.0) {
    // At par or better
    trend = 'improving'
    // No penalty
  } else if (paymentPerformance <= 1.1) {
    // Within 10% of terms
    trend = 'stable'
    score -= 5
  } else {
    // More than 10% over terms
    trend = 'declining'
    score -= 15
    riskFactors.push(`Slow payments (${Math.round((paymentPerformance - 1) * 100)}% over terms)`)
  }
  ```

- [ ] **Step 1.3:** Update payment terms data source
  - Verify `client.default_payment_terms` is available in API response
  - Add fallback to 30 days if null

- [ ] **Step 1.4:** Update risk factor messages
  - Change from absolute days to percentage over terms
  - Example: "Slow payments (73% over terms)" instead of "Slow payments (52 days average)"

### Testing Tasks

- [ ] **Test 1.1:** Client with 30-day terms, pays in 25 days
  - Expected: 0 penalty, "improving" trend
  - Status: Excellent payment behavior

- [ ] **Test 1.2:** Client with 30-day terms, pays in 32 days
  - Expected: -5 penalty, "stable" trend
  - Status: Good payment behavior (within 10%)

- [ ] **Test 1.3:** Client with 30-day terms, pays in 40 days
  - Expected: -15 penalty, "declining" trend
  - Status: Poor payment behavior (>10% over)

- [ ] **Test 1.4:** Client with 60-day terms, pays in 55 days
  - Expected: 0 penalty (better than terms)
  - Status: Excellent despite higher absolute days

- [ ] **Test 1.5:** Client with null payment terms
  - Expected: Falls back to 30-day default
  - Status: No errors

### Documentation Tasks

- [ ] **Doc 1.1:** Update help modal payment section
  - Add explanation of relative scoring
  - Update examples to show percentage calculations

- [ ] **Doc 1.2:** Update inline comments
  - Document the new scoring thresholds
  - Explain the 0%/10% breakpoints

---

## Enhancement #2: Client & Project Status System

**Estimated Time:** 5-6 hours
**Files:** Multiple (migration, types, components, APIs)

### Database Migration Tasks

- [ ] **Step 2.1:** Create migration file
  - File: `supabase/migrations/0XX_add_status_enums.sql` (replace XX with next number)
  - Copy SQL from documentation

- [ ] **Step 2.2:** Test migration locally
  ```bash
  # Apply migration
  supabase db reset
  # Verify enum types created
  ```

- [ ] **Step 2.3:** Verify data migration
  - Check existing clients migrated to correct status
  - Check existing projects migrated to correct status
  - Verify indexes created

- [ ] **Step 2.4:** Backup production data (before prod migration)
  - Export clients table
  - Export projects table

- [ ] **Step 2.5:** Apply migration to production
  - Run via Supabase dashboard or CLI
  - Monitor for errors

### TypeScript Interface Updates

- [ ] **Step 2.6:** Update database types
  - File: `src/types/database.ts`
  - Add `ClientStatus` type
  - Add `ProjectStatus` type
  ```typescript
  export type ClientStatus =
    | 'prospect'
    | 'active'
    | 'on_hold'
    | 'completed'
    | 'deactivated'

  export type ProjectStatus =
    | 'prospect'
    | 'active'
    | 'on_hold'
    | 'completed'
    | 'cancelled'
  ```

- [ ] **Step 2.7:** Update Client interface
  ```typescript
  interface Client {
    // ... existing fields
    status: ClientStatus
    active: boolean // Keep for backward compatibility during transition
  }
  ```

- [ ] **Step 2.8:** Update Project interface
  ```typescript
  interface Project {
    // ... existing fields
    status: ProjectStatus
    active: boolean // Keep for backward compatibility during transition
  }
  ```

### API Endpoint Updates

- [ ] **Step 2.9:** Update `/api/clients` GET endpoint
  - File: `src/app/api/clients/route.ts`
  - Add status filter support: `?status=active,on_hold`
  - Default to active clients only

- [ ] **Step 2.10:** Update `/api/projects` GET endpoint
  - File: `src/app/api/projects/route.ts`
  - Add status filter support: `?status=active,on_hold`
  - Default to active projects only

- [ ] **Step 2.11:** Create status update endpoints (optional)
  - `PATCH /api/clients/:id/status`
  - `PATCH /api/projects/:id/status`
  - Add validation for valid status transitions

### Client Health Dashboard Updates

- [ ] **Step 2.12:** Update client fetching
  - File: `src/components/dashboard/client-health-dashboard.tsx`
  - Line 406: Add status filter to fetch
  ```typescript
  const response = await fetch('/api/clients?status=active,on_hold')
  ```

- [ ] **Step 2.13:** Update project counting logic
  - Lines 455-505: Replace `active` boolean checks with status checks
  ```typescript
  const activeProjects = projects.filter(p => p.status === 'active').length
  const onHoldProjects = projects.filter(p => p.status === 'on_hold').length
  const completedProjects = projects.filter(p => p.status === 'completed').length
  ```

- [ ] **Step 2.14:** Update health scoring for on-hold projects
  - Verify penalty still applies: `score -= onHoldProjects * 5`
  - Update risk factor message

- [ ] **Step 2.15:** Add prospect project handling
  ```typescript
  const prospectProjects = projects.filter(p => p.status === 'prospect').length

  if (activeProjects === 0 && prospectProjects === 0) {
    score -= 25
    riskFactors.push('No active or prospect projects')
  }
  ```

### UI Component Updates

- [ ] **Step 2.16:** Add status badge to client cards
  - Show status with color coding
  - Special indicator for "on_hold" clients

- [ ] **Step 2.17:** Add status dropdown to client form
  - Allow selecting status when creating/editing client
  - Show current status prominently

- [ ] **Step 2.18:** Add status dropdown to project form
  - Allow selecting status when creating/editing project
  - Show current status prominently

- [ ] **Step 2.19:** Add status filters to client list page
  - Dropdown to filter by status
  - Show counts for each status

- [ ] **Step 2.20:** Add status filters to project list page
  - Dropdown to filter by status
  - Show counts for each status

### Seed Data Updates

- [ ] **Step 2.21:** Update seed data
  - File: `supabase/037_final_corrected_seed.sql`
  - Add status field to client inserts
  - Add status field to project inserts
  - Set realistic statuses for test data

### Testing Tasks

- [ ] **Test 2.1:** Migration on fresh database
  - Create new database
  - Run migration
  - Verify enums exist
  - Verify tables updated

- [ ] **Test 2.2:** Migration on database with existing data
  - Use copy of production data
  - Run migration
  - Verify data migrated correctly
  - Check active=true → status='active'
  - Check active=false → appropriate completed/deactivated

- [ ] **Test 2.3:** Client health with new statuses
  - Create client with status='active'
  - Verify appears in health dashboard
  - Change status to 'on_hold'
  - Verify still appears with indicator
  - Change status to 'deactivated'
  - Verify does NOT appear in dashboard

- [ ] **Test 2.4:** Project status affects health score
  - Create client with 2 active projects → 0 penalty
  - Change 1 project to 'on_hold' → -5 penalty
  - Verify health score drops by 5 points
  - Verify risk factor appears

- [ ] **Test 2.5:** Status filtering in API
  - Call `/api/clients?status=active` → only active clients
  - Call `/api/clients?status=active,on_hold` → both statuses
  - Call `/api/clients` with no filter → defaults correctly

- [ ] **Test 2.6:** UI status dropdowns
  - Create new client, select each status → saves correctly
  - Edit existing client, change status → updates correctly
  - Same for projects

### Documentation Tasks

- [ ] **Doc 2.1:** Update API documentation
  - Document status filter parameters
  - List all valid status values
  - Explain status transitions

- [ ] **Doc 2.2:** Update user guide
  - Explain each status meaning
  - Document when to use each status
  - Explain status transitions

---

## Enhancement #3: Remove Communication Score

**Estimated Time:** 1 hour
**Files:** `src/components/dashboard/client-health-dashboard.tsx`

### Implementation Tasks

- [ ] **Step 3.1:** Remove from interface definition
  - File: `src/components/dashboard/client-health-dashboard.tsx`
  - Line 56: Delete `communicationScore: number` from `engagement` object
  ```typescript
  // BEFORE
  engagement: {
    lastActivity: string
    hoursThisMonth: number
    communicationScore: number  // ← DELETE THIS LINE
  }

  // AFTER
  engagement: {
    lastActivity: string
    hoursThisMonth: number
  }
  ```

- [ ] **Step 3.2:** Remove from health scoring logic
  - Lines 317-320: Delete communication score penalty
  ```typescript
  // DELETE THESE LINES:
  // if (client.engagement.communicationScore < 5) {
  //   score -= 10
  //   riskFactors.push('Poor communication score')
  // }
  ```

- [ ] **Step 3.3:** Remove from data calculation
  - Line 509: Delete communication score calculation
  ```typescript
  // DELETE THIS LINE:
  // communicationScore: thisMonthHours > 10 ? 8 : thisMonthHours > 5 ? 6 : 4
  ```

- [ ] **Step 3.4:** Update help modal
  - Lines 163-173: Remove communication score from "Key Metrics Tracked"
  - Remove bullet: "• Communication score"

- [ ] **Step 3.5:** Update comments
  - Find all references to "communication" in comments
  - Update engagement section description
  - Document that engagement is now purely activity-based

### Testing Tasks

- [ ] **Test 3.1:** TypeScript compilation
  ```bash
  npm run type-check
  # Should have no errors related to communicationScore
  ```

- [ ] **Test 3.2:** Health score recalculation
  - Client with low hours (previously low comm score)
  - Expected: No communication penalty applied
  - Verify score is 10 points higher than before

- [ ] **Test 3.3:** Risk factors
  - Verify "Poor communication score" never appears in risk factors
  - Verify only activity-based risks appear (e.g., "No activity in 30+ days")

- [ ] **Test 3.4:** Engagement trend
  - Client with high hours → engagement trend 'up'
  - Client with >30 days since activity → engagement trend 'down'
  - Verify trends still work without communication score

### Documentation Tasks

- [ ] **Doc 3.1:** Update scoring documentation
  - Document that engagement section is now 15 points max (down from 25)
  - Update component documentation
  - Remove communication score references

---

## Integration & Final Testing

**Estimated Time:** 2 hours

### Integration Testing

- [ ] **Integration 1:** All three enhancements together
  - Payment terms relative + status system + no comm score
  - Verify no conflicts between changes

- [ ] **Integration 2:** End-to-end dashboard load
  - Fresh page load with all changes
  - Verify health scores calculate correctly
  - Verify sorting works
  - Verify no console errors

- [ ] **Integration 3:** Create test scenarios
  - Create clients with various statuses
  - Create projects with various statuses
  - Set different payment terms
  - Verify realistic health scores

### Performance Testing

- [ ] **Perf 1:** Dashboard load time
  - Test with 5 clients
  - Test with 10 clients
  - Test with 20 clients
  - Note any performance degradation

- [ ] **Perf 2:** API call count
  - Monitor network tab
  - Count API calls per client
  - Note any N+1 query issues

### Regression Testing

- [ ] **Regression 1:** Other dashboard components
  - Verify Business Health still works
  - Verify Monthly Progress cards still work
  - Verify Quick Actions bar still works

- [ ] **Regression 2:** Client management pages
  - Client list page loads correctly
  - Client detail page loads correctly
  - Client edit form works

- [ ] **Regression 3:** Project management pages
  - Project list page loads correctly
  - Project detail page loads correctly
  - Project edit form works

---

## Documentation Updates

- [ ] **Final Doc 1:** Update CLIENT_HEALTH_DASHBOARD.md
  - Mark all three enhancements as "Implemented"
  - Update version to 1.2
  - Add implementation completion date

- [ ] **Final Doc 2:** Update CHANGELOG.md (if exists)
  - Add entry for client health enhancements
  - List all three changes

- [ ] **Final Doc 3:** Create migration notes
  - Document the database migration steps
  - Note any breaking changes
  - Provide rollback instructions

---

## Deployment Checklist

### Pre-Deployment

- [ ] **Deploy 1:** All tests passing
  - TypeScript compilation: ✓
  - Unit tests: ✓
  - Integration tests: ✓

- [ ] **Deploy 2:** Code review completed
  - All changes reviewed
  - No security issues
  - Performance acceptable

- [ ] **Deploy 3:** Database backup
  - Backup clients table
  - Backup projects table
  - Store backup securely

### Deployment Steps

- [ ] **Deploy 4:** Apply database migration (staging)
  - Run migration on staging database
  - Verify no errors
  - Test application on staging

- [ ] **Deploy 5:** Deploy application code (staging)
  - Deploy to staging environment
  - Test all three enhancements
  - Verify no regressions

- [ ] **Deploy 6:** User acceptance testing (staging)
  - Have stakeholders test changes
  - Verify meets requirements
  - Get sign-off

- [ ] **Deploy 7:** Apply database migration (production)
  - Schedule maintenance window (if needed)
  - Run migration on production
  - Monitor for errors

- [ ] **Deploy 8:** Deploy application code (production)
  - Deploy to production
  - Monitor error logs
  - Check performance metrics

### Post-Deployment

- [ ] **Post 1:** Smoke testing (production)
  - Dashboard loads correctly
  - Health scores display
  - No console errors

- [ ] **Post 2:** Monitor for issues (24 hours)
  - Check error logs
  - Monitor performance
  - Watch for user reports

- [ ] **Post 3:** Update team
  - Notify team of changes
  - Share documentation
  - Answer questions

---

## Rollback Plan

If critical issues arise:

- [ ] **Rollback 1:** Revert application code
  - Deploy previous version
  - Verify old version works

- [ ] **Rollback 2:** Revert database migration (if needed)
  ```sql
  -- Revert clients table
  ALTER TABLE clients DROP COLUMN status;

  -- Revert projects table
  ALTER TABLE projects DROP COLUMN status;

  -- Drop enum types
  DROP TYPE client_status;
  DROP TYPE project_status;
  ```

- [ ] **Rollback 3:** Restore from backup (if needed)
  - Use backups from Deploy 3
  - Restore clients and projects tables

---

## Notes & Issues

### Blockers
<!-- Add any blockers here -->

### Questions
<!-- Add any questions here -->

### Decisions Made
<!-- Document key decisions here -->

---

## Completion Criteria

This task is complete when:

✅ All three enhancements implemented and tested
✅ Database migration applied successfully
✅ All tests passing (unit, integration, E2E)
✅ Documentation updated
✅ Code deployed to production
✅ No critical bugs reported in 24 hours post-deployment
✅ Stakeholders have signed off on changes

---

**Last Updated:** 2025-10-13
**Assignee:** TBD
**Reviewer:** TBD
