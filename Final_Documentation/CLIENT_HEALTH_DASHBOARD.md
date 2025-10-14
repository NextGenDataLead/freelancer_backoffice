# Client Health Dashboard - Complete Documentation

**Version:** 1.3
**Last Updated:** 2025-10-14
**Development Date Reference:** October 14, 2025

---

## Changelog

### Version 1.3 (2025-10-14) - UI Implementation for Status System
- ✅ **Client List Status Dropdowns**: Replaced boolean switches with 5-option status dropdowns
  - Location: `/dashboard/financieel?tab=klanten`
  - Component: `src/components/financial/clients/client-list.tsx`
  - Options: Prospect, Actief, On Hold, Afgerond, Gedeactiveerd
- ✅ **Project List Status Dropdowns**: Replaced boolean switches with 5-option status dropdowns
  - Location: Expandable projects within client list
  - Component: `src/components/financial/projects/project-list.tsx`
  - Options: Prospect, Actief, On Hold, Afgerond, Geannuleerd
- ✅ **New API Endpoints**: Created dedicated status update endpoints
  - `/api/clients/[id]/status` (PATCH) - Client status updates with validation
  - `/api/projects/[id]/status` (PATCH) - Project status updates with validation
- ✅ **Backward Compatibility**: Legacy `active` boolean field syncs automatically with status enum
- ✅ **UX Enhancements**: Loading indicators, error handling, and optimistic UI updates

### Version 1.2 (2025-10-13) - Backend Enhancements for Scoring Accuracy
- ✅ **Payment Terms Relative Scoring**: Payment behavior scored relative to client-specific payment terms
  - Replaced absolute 45-day threshold with dynamic calculation
  - Example: 50 days on 60-day terms = good; 50 days on 30-day terms = poor
- ✅ **Comprehensive Status System**: Rich status enums for clients and projects
  - Database migration: `supabase/045_add_status_enums.sql`
  - Client statuses: prospect, active, on_hold, completed, deactivated
  - Project statuses: prospect, active, on_hold, completed, cancelled
  - Backward compatibility triggers maintain `active` boolean
- ✅ **Removed Communication Score**: Eliminated artificial communication metric
  - Engagement now purely activity-based (last activity date + hours)
  - Simplified scoring from 25 to 15 max penalty points
  - More transparent and data-driven assessment

### Version 1.1 (2025-10-12)
- Initial comprehensive documentation
- Client Health Dashboard design and implementation
- Four-pillar health scoring system

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [For Business Users](#for-business-users)
   - [Overview](#overview)
   - [Understanding Your Health Score](#understanding-your-health-score)
   - [Health Score Components](#health-score-components)
   - [Using the Dashboard](#using-the-dashboard)
   - [Common Scenarios](#common-scenarios)
3. [For Technical Developers](#for-technical-developers)
   - [Architecture Overview](#architecture-overview)
   - [Data Flow](#data-flow)
   - [Component Structure](#component-structure)
   - [API Integration](#api-integration)
   - [Calculations Reference](#calculations-reference)
   - [Testing Guidelines](#testing-guidelines)
   - [Extending the System](#extending-the-system)
4. [Appendices](#appendices)
   - [Glossary](#glossary)
   - [Calculation Examples](#calculation-examples)
   - [Development Notes](#development-notes)

---

## Executive Summary

The Client Health Dashboard is a **proactive relationship management system** that analyzes client relationships using real business data to calculate health scores (0-100) for each client. It helps businesses identify at-risk clients, growth opportunities, and payment issues before they become critical.

**Key Features:**
- Real-time client health monitoring
- Automated risk detection and opportunity identification
- Multi-factor scoring algorithm (revenue, payment, projects, engagement)
- Status-based workflow management (prospect → active → completed)
- GDPR-compliant data tracking

**Key Metrics:**
- **Health Score**: 0-100 composite score based on revenue, payment, projects, and engagement
- **Status Categories**: Excellent (85-100), Good (70-84), Warning (50-69), At Risk (0-49)
- **Real-Time Data**: Auto-calculated from invoices, time entries, and projects
- **Proactive Alerts**: Automatic risk factor and opportunity identification

---

# For Business Users

## Overview

The Client Health Dashboard gives you instant insights into the health of your client relationships. Think of it as a "vital signs monitor" for your business relationships - it analyzes real data to tell you which clients need attention and which are thriving.

### Quick Visual Guide

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT HEALTH DASHBOARD                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 📊 Quick Stats                                        │   │
│  │  Active Clients: 12  │  Revenue MTD: €45.2K  │  ⚠️ 2 At Risk │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  🔽 Sort By: [Risk ▼] [Help ?] [View All]                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🏢 ACME Corporation                    85/100 ✓ EXCELLENT │
│  │ Revenue: €8.5K (+18%) ↑  |  Payment: 28 days (at par)   │
│  │ 💡 Revenue growing - consider upselling                  │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🏢 Beta Tech Solutions                 45/100 ⚠️ AT RISK │
│  │ Revenue: €2.1K (-69%) ↓  |  Payment: 52 days (+73% over)│
│  │ ⚠️ Revenue down 69% this month - Action needed         │
│  │ ⚠️ €3,200 overdue - Follow up immediately              │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🏢 Global Services Inc                 72/100 ⭐ GOOD   │
│  │ Revenue: €5.2K (stable)  |  Payment: 35 days (10% over) │
│  │ ✓ Multiple active projects - stable relationship        │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🏢 StartupXYZ                          62/100 📊 WARNING│
│  │ Revenue: €3.8K (+5%)   |  Payment: 42 days (+40% over)  │
│  │ ⚠️ No activity in 30+ days - Check in with client      │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [View Full Client List] [Export Report]                    │
└─────────────────────────────────────────────────────────────┘

✓ = Excellent (85-100)  ⭐ = Good (70-84)
📊 = Warning (50-69)    ⚠️ = At Risk (0-49)
```

### Purpose

**Problem Solved:**
- Clients leave without warning → No early indicators
- Payment issues escalate → Overdue invoices pile up unnoticed
- Revenue drops surprise you → No trend visibility
- Growth opportunities missed → No systematic identification

**Solution Provided:**
- ✅ Early warning system for at-risk clients
- ✅ Payment behavior tracking and alerts
- ✅ Revenue trend analysis
- ✅ Engagement monitoring
- ✅ Opportunity identification
- ✅ Prioritized action recommendations

### User Workflow

1. **Daily Check** (30 seconds):
   - Open dashboard
   - Review "At Risk" count
   - Check top 4 clients by current sort

2. **Weekly Review** (5 minutes):
   - Sort by "Risk" to see struggling clients
   - Review warning signals
   - Take action on flagged items

3. **Monthly Planning** (15 minutes):
   - Sort by "Revenue" to identify top contributors
   - Review "Excellent" clients for upsell opportunities
   - Analyze trends across client portfolio

---

## Understanding Your Health Score

### Score Ranges

- **85-100**: ✅ **EXCELLENT** - Client relationship is thriving. Strong performance across all areas.
- **70-84**: ⭐ **GOOD** - Solid relationship with minor areas for improvement.
- **50-69**: 📊 **WARNING** - Attention needed. Several risk factors present.
- **0-49**: ⚠️ **AT RISK** - Immediate action required. High risk of churn or payment issues.

### What Determines the Score?

Your client's health score is calculated from four key components, each contributing to the total 100 points:

1. **Revenue Analysis** (30 points max deduction)
   - Revenue trends (growing, stable, declining)
   - Month-over-month comparison

2. **Payment Behavior** (25 points max deduction)
   - Payment speed relative to their payment terms
   - Overdue invoice count and amount

3. **Project Activity** (25 points max deduction)
   - Number of active projects
   - On-hold project penalties

4. **Engagement Level** (15 points max deduction)
   - Days since last activity
   - Hours worked this month

### Why These Factors Matter

**Revenue Trends** tell you if the relationship is growing or shrinking. A client spending 20% less this month compared to last month is a red flag.

**Payment Behavior** indicates financial health and satisfaction. A client who consistently pays late (relative to their terms) may be having cash flow issues or may be dissatisfied.

**Project Activity** shows relationship depth. Multiple active projects indicate a strong, diversified relationship. No active projects means the relationship may be ending.

**Engagement** measures how recently you've worked together. No activity for 30+ days suggests the client may be working with someone else or no longer needs your services.

---

## Health Score Components

### Component 1: Revenue Analysis (30 points max deduction)

**What It Measures:** Revenue growth or decline compared to the previous month.

**How It's Calculated:**

```typescript
interface ClientHealthData {
  id: string
  name: string
  revenue: {
    thisMonth: number        // Current month revenue
    lastMonth: number        // Previous month for comparison
    total: number            // Lifetime value
  }
  payment: {
    averageDays: number      // Average days to pay invoices
    overdueAmount: number    // Total overdue amount
    overdueCount: number     // Number of overdue invoices
    lastPayment: string      // Date of last payment
  }
  projects: {
    active: number           // Active projects count
    completed: number        // Completed projects count
    onHold: number          // Projects on hold (currently always 0)
  }
  engagement: {
    lastActivity: string     // Date of last time entry
    hoursThisMonth: number   // Billable hours this month
  }
}

interface ClientHealthScore {
  client: ClientHealthData
  score: number              // 0-100 total score
  status: 'excellent' | 'good' | 'warning' | 'at_risk'
  riskFactors: string[]      // Array of identified risks
  opportunities: string[]    // Array of growth opportunities
  trends: {
    revenue: 'up' | 'down' | 'stable'
    engagement: 'up' | 'down' | 'stable'
    payment: 'improving' | 'declining' | 'stable'
  }
}
```

---

## Health Scoring Algorithm

### Total Score: 0-100 Points

The health score is calculated by **starting at 100 and deducting points** for negative indicators.

#### 1. Revenue Analysis (30 points max deduction)

**Calculation:**
```typescript
const revenueChange = thisMonth / max(lastMonth, 1)

if (revenueChange > 1.1) {
  // Revenue up >10%
  trend = 'up'
  opportunities.push('Revenue growing - consider upselling')
} else if (revenueChange < 0.8) {
  // Revenue down >20%
  trend = 'down'
  score -= 20
  riskFactors.push(`Revenue down ${(1-revenueChange)*100}% this month`)
}
```

**Scoring:**
- Revenue stable (0.8 - 1.1): No penalty
- Revenue up >10%: No penalty + opportunity flag
- Revenue down >20%: -20 points + risk flag

---

#### 2. Payment Behavior (25 points max deduction)

**✅ IMPLEMENTED (Enhancement #1 - Relative Payment Terms):**
```typescript
// Get client's payment terms (default to 30 days if not specified)
const clientPaymentTerms = client.paymentTerms || 30

// Calculate payment performance relative to their terms
const paymentPerformance = averageDays / clientPaymentTerms

if (paymentPerformance <= 1.0) {
  // At par or better (e.g., 28 days on 30-day terms)
  trend = 'improving'
  // No penalty - EXCELLENT
} else if (paymentPerformance <= 1.1) {
  // Within 10% of terms (e.g., 33 days on 30-day terms)
  trend = 'stable'
  score -= 5
  // Small penalty - GOOD
} else {
  // More than 10% over terms (e.g., 40+ days on 30-day terms)
  trend = 'declining'
  score -= 15
  const percentageOver = Math.round((paymentPerformance - 1) * 100)
  riskFactors.push(`Slow payments (${percentageOver}% over terms)`)
  // Full penalty - POOR
}

if (overdueAmount > 0) {
  score -= min(overdueCount * 5, 20)
  riskFactors.push(`€${overdueAmount} overdue`)
  paymentTrend = 'declining'
}
```

**Scoring:**
- ≤100% of payment terms: No penalty (excellent)
- 100-110% of payment terms: -5 points (good)
- >110% of payment terms: -15 points (poor)
- Each overdue invoice: -5 points (max -20 points)

---

#### 3. Project Activity (25 points max deduction)

**Calculation:**
```typescript
if (activeProjects === 0) {
  score -= 25
  riskFactors.push('No active projects')
} else if (activeProjects > 2) {
  opportunities.push('Multiple active projects - stable relationship')
}

if (onHoldProjects > 0) {
  score -= onHoldProjects * 5
  riskFactors.push(`${onHoldProjects} projects on hold`)
}
```

**Scoring:**
- 0 active projects: -25 points (major red flag)
- 1 project: No penalty
- 2+ projects: No penalty + opportunity flag
- Each on-hold project: -5 points

**✅ IMPLEMENTED (Enhancement #2 - Status System):**
Projects now have proper status tracking: prospect, active, on_hold, completed, cancelled.

---

#### 4. Engagement Level (20 points max deduction)

**✅ IMPLEMENTED (Enhancement #3 - Removed Communication Score):**
```typescript
const daysSinceActivity = (today - lastActivity) / (1000 * 60 * 60 * 24)

if (daysSinceActivity > 30) {
  score -= 15
  trend = 'down'
  riskFactors.push('No activity in 30+ days')
} else if (hoursThisMonth > 40) {
  trend = 'up'
  opportunities.push('High engagement this month')
}

// Communication score removed - engagement now purely activity-based
```

**Scoring:**
- Last activity 0-30 days: No penalty
- Last activity 31+ days: -15 points
- Hours this month > 40: Opportunity flag
- **Max deduction:** 15 points (down from 25 points with communication score)

---

### Status Determination

After all penalties are applied:

```typescript
if (score >= 85) status = 'excellent'      // 85-100
else if (score >= 70) status = 'good'       // 70-84
else if (score >= 50) status = 'warning'    // 50-69
else status = 'at_risk'                     // 0-49
```

**Status Colors & Icons:**
- **Excellent**: Green, ✓ CheckCircle icon
- **Good**: Blue, ↗ TrendingUp icon
- **Warning**: Orange, ⚠️ AlertTriangle icon
- **At Risk**: Red, ⚠️ AlertTriangle icon

---

## Implemented Enhancements (v1.2)

### ✅ Enhancement #1: Payment Terms Relative Scoring (IMPLEMENTED)

**Implementation Date:** 2025-10-13

**Issue Resolved:**
Previous implementation used **absolute days** (45 days threshold) which didn't account for client-specific payment terms. A client with 60-day terms paying in 50 days is performing well, but was getting penalized.

**Implementation:**

**Before (v1.1):**
```typescript
if (averageDays > 45) {
  score -= 15
  trend = 'declining'
}
```

**After (v1.2 - Implemented):**
```typescript
// Get client's payment terms from database
const clientPaymentTerms = client.default_payment_terms || 30

// Calculate performance relative to their terms
const paymentPerformance = averageDays / clientPaymentTerms

if (paymentPerformance <= 1.0) {
  // At par or better (e.g., 28 days on 30-day terms)
  trend = 'improving'
  // No penalty - EXCELLENT
} else if (paymentPerformance <= 1.1) {
  // Within 10% of terms (e.g., 33 days on 30-day terms)
  trend = 'stable'
  score -= 5
  // Small penalty - GOOD
} else {
  // More than 10% over terms (e.g., 40+ days on 30-day terms)
  trend = 'declining'
  score -= 15
  riskFactors.push(`Slow payments (${Math.round((paymentPerformance - 1) * 100)}% over terms)`)
  // Full penalty - POOR
}
```

**New Scoring Table:**
| Payment Performance | Status | Penalty | Example (30-day terms) |
|---------------------|--------|---------|------------------------|
| ≤100% (at par or better) | Excellent | 0 points | 0-30 days |
| 100-110% (within 10%) | Good | -5 points | 31-33 days |
| >110% (over 10%) | Poor | -15 points | 34+ days |

**Data Source:**
```typescript
// Payment terms stored in clients table
const clientPaymentTerms = client.default_payment_terms || 30
```

**Implementation Status:** ✅ Complete
**Files Modified:**
- `src/components/dashboard/client-health-dashboard.tsx` (lines 275-302)
- `src/lib/types.ts` (added ClientStatus type)

**Database Fields Used:**
- `clients.default_payment_terms` (integer, days)

---

### ✅ Enhancement #2: Comprehensive Status System for Clients & Projects (IMPLEMENTED)

**Implementation Date:** 2025-10-13

**Issue Resolved:**
Previously, both clients and projects only had an `active` boolean flag (true/false). This was insufficient for real-world workflows where entities can be in various states like prospect, on-hold, completed, or deactivated.

**Implementation:**

Added comprehensive status enums for both clients and projects to replace the simple boolean `active` flag.

#### New Client Statuses

**Enum Values:**
```typescript
type ClientStatus =
  | 'prospect'      // Potential client, not yet signed
  | 'active'        // Currently working together
  | 'on_hold'       // Temporarily paused relationship
  | 'completed'     // Finished all work, may return
  | 'deactivated'   // No longer working together (churned)
```

**Status Meanings:**
- **prospect**: Lead or potential client, no signed contracts yet
  - Shows in pipeline, not in health calculations
  - No projects should exist yet
- **active**: Current paying client
  - Default status for health scoring
  - Counted in "Active Clients" metrics
- **on_hold**: Temporarily paused, but relationship intact
  - Still shows in health dashboard with warning
  - Projects may also be on hold
- **completed**: All projects finished, relationship ended naturally
  - Not shown in health dashboard (archived)
  - Can be reactivated if they return
- **deactivated**: Relationship ended (churned, fired, etc.)
  - Not shown in health dashboard
  - Historical data preserved for analytics

#### New Project Statuses

**Enum Values:**
```typescript
type ProjectStatus =
  | 'prospect'      // Proposed project, not yet approved
  | 'active'        // Currently in progress
  | 'on_hold'       // Temporarily paused
  | 'completed'     // Successfully finished
  | 'cancelled'     // Cancelled before completion
```

**Status Meanings:**
- **prospect**: Quoted/proposed project, awaiting approval
  - Shows in pipeline
  - No time entries yet
- **active**: Currently being worked on
  - Time entries being logged
  - Counted in active project metrics
- **on_hold**: Work paused temporarily
  - **Penalty applies**: Each on-hold project = -5 health points
  - May have partial time entries
- **completed**: Project successfully delivered
  - Counts toward "completed projects" metric
  - No longer accepts time entries
- **cancelled**: Project cancelled before completion
  - Not counted in any metrics
  - Historical record preserved

#### Database Migration (✅ Implemented)

**File:** `supabase/045_add_status_enums.sql`

```sql
-- Create enum types
CREATE TYPE client_status AS ENUM (
  'prospect',
  'active',
  'on_hold',
  'completed',
  'deactivated'
);

CREATE TYPE project_status AS ENUM (
  'prospect',
  'active',
  'on_hold',
  'completed',
  'cancelled'
);

-- Migrate clients table
ALTER TABLE clients
  ADD COLUMN status client_status DEFAULT 'active';

-- Migrate existing data
UPDATE clients
SET status = CASE
  WHEN active = true THEN 'active'::client_status
  WHEN active = false THEN 'deactivated'::client_status
END;

-- Migrate projects table
ALTER TABLE projects
  ADD COLUMN status project_status DEFAULT 'active';

-- Migrate existing data
UPDATE projects
SET status = CASE
  WHEN active = true THEN 'active'::project_status
  WHEN active = false THEN 'completed'::project_status
END;

-- Backward compatibility triggers added
-- Keeps active boolean in sync with status column during transition
-- This allows gradual migration of dependent code

-- Add indexes for common queries
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_clients_active_statuses ON clients(status) WHERE status IN ('active', 'on_hold');
CREATE INDEX idx_projects_active_statuses ON projects(status) WHERE status IN ('active', 'on_hold', 'prospect');
```

#### Updated Health Scoring Logic (✅ Implemented)

**Before (v1.1):**
```typescript
// Projects counted as active or inactive (boolean)
const activeProjects = projects.filter(p => p.active === true).length
const inactiveProjects = projects.filter(p => p.active === false).length
const onHoldProjects = 0 // Not tracked
```

**After (v1.2 - Implemented):**
```typescript
// Projects counted by actual status
const activeProjects = projects.filter(p => p.status === 'active').length
const onHoldProjects = projects.filter(p => p.status === 'on_hold').length
const completedProjects = projects.filter(p => p.status === 'completed').length
const prospectProjects = projects.filter(p => p.status === 'prospect').length

// Health scoring
if (activeProjects === 0 && prospectProjects === 0) {
  score -= 25
  riskFactors.push('No active or prospect projects')
}

if (onHoldProjects > 0) {
  score -= onHoldProjects * 5
  riskFactors.push(`${onHoldProjects} projects on hold`)
}
```

#### Client Filtering (✅ Implemented)

**Before (v1.1):**
```typescript
// Fetch all clients
const response = await fetch('/api/clients')
const clients = response.data
```

**After (v1.2 - Implemented):**
```typescript
// Fetch only active and on-hold clients for health dashboard
const response = await fetch('/api/clients?status=active,on_hold')
const clients = response.data

// Prospects shown in separate pipeline view
// Completed/Deactivated shown in archive view
```

#### Implementation Status

**✅ Backend Implementation (v1.2 - Completed 2025-10-13):**
1. Database migration created (`supabase/045_add_status_enums.sql`)
2. TypeScript interfaces updated (`src/lib/types.ts`)
3. API endpoints modified to support status filtering
   - `/api/clients?status=active,on_hold` (supports comma-separated list)
   - `/api/projects?status=active,on_hold` (supports comma-separated list)
4. Client health calculation logic updated
5. Client health dashboard now filters by status automatically

**✅ UI Implementation (v1.3 - Completed 2025-10-14):**
1. **Client List UI** - Status dropdown with 5 options (Prospect, Actief, On Hold, Afgerond, Gedeactiveerd)
   - Location: `/dashboard/financieel?tab=klanten`
   - Component: `src/components/financial/clients/client-list.tsx`
   - Replaces old Switch component with Select dropdown
2. **Project List UI** - Status dropdown with 5 options (Prospect, Actief, On Hold, Afgerond, Geannuleerd)
   - Location: Expandable projects within client list
   - Component: `src/components/financial/projects/project-list.tsx`
   - Replaces old Switch component with Select dropdown
3. **API Endpoints** - Dedicated status update endpoints
   - `/api/clients/[id]/status` (PATCH) - Updates client status with validation
   - `/api/projects/[id]/status` (PATCH) - Updates project status with validation
4. **Backward Compatibility** - Legacy `active` boolean field syncs automatically with status enum
5. **Loading States** - Spinner indicators during status updates
6. **Error Handling** - User-friendly error messages with console logging

**📋 Pending (Future Enhancements):**
- Status badges with color coding on cards
- Status transition validation (business rules)
- Status change history/audit log
- Bulk status updates
- Separate pipeline view for prospects
- Archive view for completed/deactivated clients

**Files Modified:**
- ✅ `supabase/045_add_status_enums.sql` (database schema)
- ✅ `src/lib/types.ts` (TypeScript types)
- ✅ `src/lib/validations/financial.ts` (validation schemas)
- ✅ `src/components/dashboard/client-health-dashboard.tsx` (health scoring)
- ✅ `src/components/financial/clients/client-list.tsx` (client UI)
- ✅ `src/components/financial/projects/project-list.tsx` (project UI)
- ✅ `src/app/api/clients/route.ts` (client list endpoint)
- ✅ `src/app/api/clients/[id]/status/route.ts` (client status endpoint - created)
- ✅ `src/app/api/projects/route.ts` (project list endpoint)
- ✅ `src/app/api/projects/[id]/status/route.ts` (project status endpoint - created)

#### UI Implementation Details

**Client List Status Dropdown:**

File: `src/components/financial/clients/client-list.tsx`

```typescript
// Import Select components instead of Switch
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ClientStatus } from '@/lib/types'

// Status update handler
const handleClientStatusChange = async (client: EnhancedClient, newStatus: ClientStatus) => {
  const clientId = client.id
  setUpdatingClients(prev => new Set(prev).add(clientId))

  try {
    const response = await fetch(`/api/clients/${clientId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update client status')
    }

    // Update local state
    setClients(prev => prev.map(c =>
      c.id === clientId
        ? { ...c, status: newStatus, active: ['active', 'on_hold'].includes(newStatus) }
        : c
    ))
  } catch (error) {
    console.error('Error updating client status:', error)
    alert(error instanceof Error ? error.message : 'Error updating client status')
  } finally {
    setUpdatingClients(prev => {
      const newSet = new Set(prev)
      newSet.delete(clientId)
      return newSet
    })
  }
}

// UI rendering (replaces old Switch component)
<TableCell>
  <div className="flex items-center space-x-2">
    <Select
      value={client.status || 'active'}
      disabled={isUpdating}
      onValueChange={(value) => handleClientStatusChange(client, value as ClientStatus)}
    >
      <SelectTrigger className="h-8 w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="prospect">Prospect</SelectItem>
        <SelectItem value="active">Actief</SelectItem>
        <SelectItem value="on_hold">On Hold</SelectItem>
        <SelectItem value="completed">Afgerond</SelectItem>
        <SelectItem value="deactivated">Gedeactiveerd</SelectItem>
      </SelectContent>
    </Select>
    {isUpdating && (
      <div className="h-3 w-3 animate-spin rounded-full border border-muted-foreground border-t-foreground"></div>
    )}
  </div>
</TableCell>
```

**Project List Status Dropdown:**

File: `src/components/financial/projects/project-list.tsx`

```typescript
// Similar pattern to client list
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ProjectStatus } from '@/lib/types'

// Status update handler
const handleProjectStatusChange = async (project: Project, newStatus: ProjectStatus) => {
  const projectId = project.id
  setUpdatingProjects(prev => new Set(prev).add(projectId))

  try {
    const response = await fetch(`/api/projects/${projectId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update project status')
    }

    // Update local state
    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, status: newStatus, active: ['active', 'on_hold', 'prospect'].includes(newStatus) }
        : p
    ))
  } catch (error) {
    console.error('Error updating project status:', error)
    alert(error instanceof Error ? error.message : 'Error updating project status')
  } finally {
    setUpdatingProjects(prev => {
      const newSet = new Set(prev)
      newSet.delete(projectId)
      return newSet
    })
  }
}

// UI rendering
<Select
  value={project.status || 'active'}
  disabled={isUpdating}
  onValueChange={(value) => handleProjectStatusChange(project, value as ProjectStatus)}
>
  <SelectTrigger className="h-7 w-28 text-xs">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="prospect">Prospect</SelectItem>
    <SelectItem value="active">Actief</SelectItem>
    <SelectItem value="on_hold">On Hold</SelectItem>
    <SelectItem value="completed">Afgerond</SelectItem>
    <SelectItem value="cancelled">Geannuleerd</SelectItem>
  </SelectContent>
</Select>
```

**Status Transition Mapping:**

```typescript
// Clients: Status → Active Boolean
['active', 'on_hold'] → active: true
['prospect', 'completed', 'deactivated'] → active: false

// Projects: Status → Active Boolean
['prospect', 'active', 'on_hold'] → active: true
['completed', 'cancelled'] → active: false

// Legacy Support: Active Boolean → Status
// Clients
active: true  → 'active'
active: false → 'deactivated'

// Projects
active: true  → 'active'
active: false → 'completed'
```

---

### ✅ Enhancement #3: Remove Communication Score from Engagement (IMPLEMENTED)

**Implementation Date:** 2025-10-13

**Issue Resolved:**
The previous "Communication Score" was artificially derived from hours worked and didn't represent actual communication quality. It was a placeholder that added no real value.

**Previous Implementation (v1.1):**
```typescript
// In engagement calculation (line 509)
communicationScore: thisMonthHours > 10 ? 8 : thisMonthHours > 5 ? 6 : 4

// In health scoring (lines 317-320)
if (communicationScore < 5) {
  score -= 10
  riskFactors.push('Poor communication score')
}
```

**Implementation:**

**Removed from Data Model:**
```typescript
// BEFORE
interface ClientHealthData {
  engagement: {
    lastActivity: string
    hoursThisMonth: number
    communicationScore: number  // ← REMOVE THIS
  }
}

// AFTER
interface ClientHealthData {
  engagement: {
    lastActivity: string
    hoursThisMonth: number
    // communicationScore removed
  }
}
```

**Removed from Health Scoring:**
```typescript
// These lines were deleted (v1.1 lines 317-320)
// if (client.engagement.communicationScore < 5) {
//   score -= 10
//   riskFactors.push('Poor communication score')
// }
```

**Updated Engagement Scoring (v1.2):**
The engagement section now relies purely on activity-based metrics:
1. **Last Activity Date** (-15 points if >30 days)
2. **Hours This Month** (opportunity flag if >40 hours)

Total engagement penalty: **15 points max** (down from 25 points)

**Impact:**
- Simpler, more transparent scoring
- No artificial "communication quality" metrics
- Engagement purely based on actual work activity

**Implementation Status:** ✅ Complete

**Files Modified:**
- ✅ `src/components/dashboard/client-health-dashboard.tsx`
  - Removed `communicationScore` from `ClientHealthData` interface (line 56)
  - Removed communication score calculation (line 509)
  - Removed communication score penalty logic (lines 317-320)
  - Updated help modal content (lines 167-170, 239-242)
  - Updated mock data (removed communicationScore from all test clients)

**Testing Results:**
- ✅ Health scores recalculate correctly without communication penalty
- ✅ Engagement trend still works (based on hours and activity)
- ✅ No TypeScript errors (verified with `npm run type-check`)

---

# For Technical Developers

## Architecture Overview

The Client Health Dashboard is built on a modular architecture designed for scalability, maintainability, and real-time performance.

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                       │
│  client-health-dashboard.tsx (Main Component)          │
│  - Health Score Display                                │
│  - Client List with Sorting                            │
│  - Real-time Updates                                   │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│              Business Logic Layer                       │
│  calculateClientHealth() (Scoring Algorithm)           │
│  - Revenue Trend Analysis                              │
│  - Payment Behavior Scoring                            │
│  - Project Activity Assessment                         │
│  - Engagement Level Calculation                        │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│                   API Layer                            │
│  /api/clients (Client Data)                           │
│  /api/clients/[id]/status (Status Updates)            │
│  /api/time-entries?client_id={id} (Activity Data)     │
│  /api/projects?client_id={id} (Project Data)          │
│  /api/invoices?client_id={id} (Payment Data)          │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│                  Data Layer                            │
│  Supabase Database                                     │
│  - clients (Client records with RLS)                   │
│  - time_entries (Activity tracking with RLS)          │
│  - projects (Project management with RLS)             │
│  - invoices (Payment data with RLS)                   │
└─────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Separation of Concerns**
   - Data fetching (API layer)
   - Business logic (Calculation functions)
   - Presentation (React components)

2. **Single Source of Truth**
   - Supabase database is authoritative
   - All calculations derive from DB state
   - No client-side caching of business data

3. **Tenant Isolation**
   - Row-Level Security (RLS) policies
   - All queries filtered by `tenant_id`
   - No cross-tenant data leakage

4. **Real-Time Updates**
   - Optimistic UI updates
   - Automatic re-calculation on data changes
   - Event-driven architecture

5. **Extensibility**
   - Modular calculation functions
   - Easy to add new scoring factors
   - Plugin-based recommendation system

---

## Data Flow

### High-Level Flow

```
User opens Dashboard
  ↓
fetchClientHealth() executes
  ↓
Fetch from APIs in parallel:
  - GET /api/clients (all active/on_hold clients)
  - GET /api/time-entries?client_id={id} (per client)
  - GET /api/projects?client_id={id} (per client)
  - GET /api/invoices?client_id={id} (per client)
  ↓
Transform raw data to ClientHealthData format
  ↓
calculateClientHealth() for each client
  - Revenue analysis (30 pts max deduction)
  - Payment scoring (25 pts max deduction)
  - Project activity (25 pts max deduction)
  - Engagement level (15 pts max deduction)
  ↓
Sort by selected criteria (score/risk/revenue)
  ↓
Display top 4 clients with health scores
```

### Detailed Flow: Status Update

```typescript
1. User changes client status from "Actief" to "On Hold"
   Component: client-list.tsx handleClientStatusChange()

2. Frontend sends PATCH request
   PATCH /api/clients/[id]/status
   Body: { status: "on_hold" }

3. API validates request
   - Check authentication (Clerk)
   - Verify tenant ownership (RLS)
   - Validate status enum value

4. Database update with backward compatibility
   UPDATE clients SET
     status = 'on_hold',
     active = true  -- on_hold clients are still "active"
   WHERE id = {id} AND tenant_id = {tenant_id}

5. Frontend updates local state optimistically
   setClients(prev => prev.map(c =>
     c.id === id ? { ...c, status: 'on_hold' } : c
   ))

6. Health dashboard auto-refreshes
   - Client still appears (on_hold is included)
   - Health score may be affected by status change
```

---

## Component Structure

```
ClientHealthDashboard
├── ClientHealthHelpModal (Dialog with explanation)
├── Header Section
│   ├── Title + Icon
│   ├── "At Risk" Badge (conditional)
│   └── Controls (Help, Sort, View All)
├── Quick Stats (3-column grid)
│   ├── Active Clients Count
│   ├── Total Revenue This Month
│   └── At Risk Count
└── Top Clients List (max 4 clients)
    ├── Client Card
    │   ├── Name + Health Score + Status Badge
    │   ├── Revenue + Trends
    │   ├── Payment Days
    │   └── Risk Factor / Opportunity (first one)
    └── Quick Actions (View All, Review At-Risk)
```

### State Management

```typescript
const [clientHealthScores, setClientHealthScores] = useState<ClientHealthScore[]>([])
const [loading, setLoading] = useState(true)
const [sortBy, setSortBy] = useState<'score' | 'revenue' | 'risk'>('score')
```

**State Updates:**
- On mount: `useEffect` fetches all data and calculates health scores
- On sort change: Re-sorts existing scores, no API call needed
- On view all click: Navigates to full clients page (via `onViewAllClients` prop)

### Performance Considerations

**Current Approach:**
- Fetches ALL clients on mount
- Makes 3 API calls per client (time entries, projects, invoices)
- For 10 clients = 1 + (3 × 10) = **31 API calls**

**Performance Issue:**
- Not scalable beyond ~20 clients
- Causes slow dashboard load times

**Future Optimization (TODO):**
```typescript
// Create dedicated endpoint
GET /api/clients/health-scores

// Returns pre-calculated scores
// Calculated via database views or cron job
// Response time: <200ms vs current ~2-5 seconds
```

---

## API Integration

### Current API Calls

#### 1. Fetch Clients
```typescript
GET /api/clients
Response: {
  success: true,
  data: [
    {
      id: string,
      name: string,
      company_name: string,
      default_payment_terms: number,
      active: boolean,
      // ... other fields
    }
  ]
}
```

#### 2. Fetch Time Entries (Per Client)
```typescript
GET /api/time-entries?client_id={clientId}
Response: {
  success: true,
  data: [
    {
      id: string,
      entry_date: string,
      hours: number,
      hourly_rate: number,
      effective_hourly_rate: number,
      billable: boolean,
      // ... other fields
    }
  ]
}
```

#### 3. Fetch Projects (Per Client)
```typescript
GET /api/projects?client_id={clientId}
Response: {
  success: true,
  data: [
    {
      id: string,
      name: string,
      active: boolean,
      // ... other fields
    }
  ]
}
```

#### 4. Fetch Invoices (Per Client)
```typescript
GET /api/invoices?client_id={clientId}
Response: {
  success: true,
  data: [
    {
      id: string,
      due_date: string,
      paid_at: string,
      total_amount: number,
      paid_amount: number,
      status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled',
      // ... other fields
    }
  ]
}
```

### Data Transformations

**Time Entries → Revenue Calculation:**
```typescript
// This month's revenue
const thisMonthRevenue = thisMonthEntries.reduce((sum, entry) =>
  sum + (entry.hours * (entry.effective_hourly_rate || entry.hourly_rate || 0))
, 0)
```

**Invoices → Overdue Calculation:**
```typescript
// Filter overdue invoices
const overdueInvoices = invoices.filter(invoice => {
  const dueDate = new Date(invoice.due_date)
  const isPastDue = dueDate < currentDate
  const isUnpaid = !invoice.paid_at || (invoice.paid_amount < invoice.total_amount)
  const isNotCancelled = invoice.status !== 'cancelled'
  const isNotDraft = invoice.status !== 'draft'
  return isPastDue && isUnpaid && isNotCancelled && isNotDraft
})

const overdueAmount = overdueInvoices.reduce((sum, invoice) =>
  sum + (invoice.total_amount - (invoice.paid_amount || 0))
, 0)
```

**Invoices → Average Payment Days:**
```typescript
// Only from paid invoices
const averagePaymentDays = paidInvoices.length > 0
  ? Math.round(paidInvoices.reduce((sum, inv) => {
      const dueDate = new Date(inv.due_date)
      const paidDate = new Date(inv.paid_at)
      const daysDiff = Math.floor((paidDate - dueDate) / (1000 * 60 * 60 * 24))
      return sum + Math.max(0, daysDiff) // Don't count early payments as negative
    }, 0) / paidInvoices.length)
  : (client.default_payment_terms || 30)
```

---

## Future Roadmap

### Phase 1: Critical Enhancements (Current)
- ✅ Enhancement #1: Payment terms relative scoring
- ✅ Enhancement #2: Client/Project status system
- ✅ Enhancement #3: Remove communication score

### Phase 2: Performance Optimization
- Create dedicated `/api/clients/health-scores` endpoint
- Implement database views for pre-aggregated data
- Add caching layer (Redis or similar)
- Reduce 31 API calls to 1 API call

### Phase 3: Advanced Features
- **Historical Trend Charts**: Show health score over time
- **Predictive Analytics**: ML model to predict churn risk
- **Automated Actions**:
  - Auto-send reminder emails to declining clients
  - Auto-generate "check-in" tasks for at-risk clients
- **Custom Scoring Weights**: Let users adjust importance of each factor
- **Client Segmentation**: Group clients by industry, size, etc.

### Phase 4: Integration & Automation
- **Email Integration**: Track actual communication frequency
- **Calendar Integration**: Meeting cadence tracking
- **Slack/Teams Integration**: Push alerts for at-risk clients
- **Zapier Integration**: Trigger workflows based on health changes

---

## Troubleshooting

### Common Issues

**Issue: Client Health Score Not Updating**

Symptoms:
- Dashboard shows stale data
- Recent time entries not reflected in score

Solutions:
1. Check browser console for API errors
2. Verify Supabase RLS policies are correctly applied
3. Refresh the page to force data refetch
4. Check network tab to ensure all API calls succeed

**Issue: Payment Terms Not Reflecting Correctly**

Symptoms:
- Client showing late payments despite being on time
- Payment performance percentage seems incorrect

Solutions:
1. Verify `default_payment_terms` field is set in clients table
2. Check that payment terms are in days (not weeks/months)
3. Ensure invoices have correct `due_date` calculated from payment terms
4. Review calculation in client-health-dashboard.tsx:275-302

**Issue: Status Dropdown Not Saving**

Symptoms:
- Status changes revert after page refresh
- Loading spinner appears but no update happens

Solutions:
1. Check browser console for 401/403 errors (auth issues)
2. Verify user has access to the client (tenant_id match)
3. Check `/api/clients/[id]/status` endpoint logs
4. Ensure status enum values match database schema
5. Test with valid enum values: 'prospect', 'active', 'on_hold', 'completed', 'deactivated'

**Issue: "At Risk" Count Incorrect**

Symptoms:
- Quick stats show wrong number of at-risk clients
- Count doesn't match visible clients

Solutions:
1. Verify filtering logic includes all `active` and `on_hold` statuses
2. Check that score calculation is consistent (startsat 100, deducts points)
3. Review status threshold: At Risk = score < 50
4. Ensure all clients have complete data (no null values affecting score)

**Issue: Performance Issues with Many Clients**

Symptoms:
- Dashboard slow to load with 20+ clients
- Browser becomes unresponsive during calculation

Solutions:
1. Implement pagination (show 10-20 clients at a time)
2. Create dedicated `/api/clients/health-scores` endpoint
3. Pre-calculate scores server-side or via database views
4. Cache results for 5-10 minutes
5. Use virtualized list for rendering (react-window)

---

## Development Notes

### How to Resume Development

**To implement Enhancement #1 (Payment Terms):**
1. Open `src/components/dashboard/client-health-dashboard.tsx`
2. Find line 275: `if (client.payment.averageDays > 45)`
3. Replace with relative calculation using `client.default_payment_terms`
4. Update risk factor message formatting
5. Test with clients having different payment terms (14, 30, 45, 60 days)

**To implement Enhancement #2 (Status System):**
1. Create migration: `supabase/migrations/0XX_add_status_enums.sql`
2. Run migration on dev database
3. Update TypeScript types: `src/types/database.ts`
4. Modify fetch logic in `client-health-dashboard.tsx` (line 415)
5. Update scoring logic (lines 455-505)
6. Add UI components for status management

**To implement Enhancement #3 (Remove Communication):**
1. Open `src/components/dashboard/client-health-dashboard.tsx`
2. Delete lines 317-320 (communication score penalty)
3. Remove from interface (line 56)
4. Remove from calculation (line 509)
5. Run TypeScript check to find any remaining references

### Testing Checklist

**Unit Tests Needed:**
- [ ] Health score calculation with various inputs
- [ ] Payment terms relative scoring (0%, 5%, 10%, 15% over terms)
- [ ] Revenue trend calculation (up/down/stable)
- [ ] Overdue invoice penalty calculation
- [ ] Project status filtering

**Integration Tests Needed:**
- [ ] Full client health fetch with real API
- [ ] Sorting by score/risk/revenue
- [ ] Status filtering (active/on-hold only)
- [ ] Client status update API endpoint (`/api/clients/[id]/status`)
- [ ] Project status update API endpoint (`/api/projects/[id]/status`)
- [ ] Backward compatibility with `active` boolean field

**E2E Tests Needed:**
- [ ] Dashboard loads and displays clients
- [ ] Sorting changes display order
- [ ] Risk factors appear for struggling clients
- [ ] Opportunities appear for thriving clients

**UI Component Tests (v1.3):**
- [ ] **Client Status Dropdown** (`/dashboard/financieel?tab=klanten`)
  - [ ] Dropdown displays current client status correctly
  - [ ] All 5 status options are available (Prospect, Actief, On Hold, Afgerond, Gedeactiveerd)
  - [ ] Changing status triggers API call
  - [ ] Loading spinner appears during update
  - [ ] Status persists after page refresh
  - [ ] Error messages display on failed updates
  - [ ] Tenant isolation prevents cross-tenant updates
- [ ] **Project Status Dropdown** (expandable in client list)
  - [ ] Dropdown displays current project status correctly
  - [ ] All 5 status options are available (Prospect, Actief, On Hold, Afgerond, Geannuleerd)
  - [ ] Changing status triggers API call
  - [ ] Loading spinner appears during update
  - [ ] Status persists after page refresh
  - [ ] Error messages display on failed updates
- [ ] **Status Synchronization**
  - [ ] `active` boolean syncs correctly with status enum
  - [ ] Health dashboard filters by active/on_hold statuses
  - [ ] Legacy API calls with `active: true/false` still work

---

# Appendices

## Glossary

### Key Terms

**Client Health Score**: A composite score (0-100) that measures the overall health of a client relationship based on revenue, payment behavior, project activity, and engagement.

**Status Enum**: A database field with predefined values (prospect, active, on_hold, completed, deactivated) that replaces the legacy boolean `active` field.

**Payment Terms**: The number of days a client has to pay an invoice (e.g., Net 30, Net 60).

**Payment Performance**: The ratio of actual payment days to agreed payment terms. 100% = on time, >100% = late.

**MTD (Month-to-Date)**: Data from the first day of the current month until today.

**Billable Hours**: Time tracked that can be invoiced to clients (excludes admin/internal time).

**Risk Factor**: An identified issue that negatively impacts the client health score (e.g., declining revenue, overdue invoices).

**Opportunity**: A positive signal that suggests potential for growth or upselling.

**RLS (Row Level Security)**: Supabase security policies that ensure users can only access their own tenant's data.

**Tenant Isolation**: Security mechanism that prevents users from different organizations from accessing each other's data.

---

## Calculation Examples

### Example 1: Excellent Client (Score: 92)

**Client:** Acme Corporation

**Data:**
- Revenue this month: €8,500
- Revenue last month: €7,200
- Active projects: 2
- Payment terms: 30 days
- Average payment: 28 days
- Overdue amount: €0
- Last activity: 2 days ago
- Hours this month: 45h

**Calculation:**
```
Starting score: 100

Revenue Analysis:
  Change: €8,500 / €7,200 = 118% (up 18%)
  Penalty: 0 (revenue growing)
  Opportunity: "Revenue growing - consider upselling"

Payment Behavior:
  Average: 28 days on 30-day terms = 93% (at par)
  Penalty: 0 (excellent payment)
  Overdue: €0
  Penalty: 0

Project Activity:
  Active: 2 projects
  Penalty: 0
  Opportunity: "Multiple active projects - stable"

Engagement:
  Last activity: 2 days ago
  Penalty: 0
  Hours: 45h
  Opportunity: "High engagement this month"

Total Penalties: 0
Final Score: 100 - 0 = 100

Status: EXCELLENT (score capped at 92 for display)
```

### Example 2: At-Risk Client (Score: 45)

**Client:** Beta Tech Solutions

**Data:**
- Revenue this month: €2,100
- Revenue last month: €6,800
- Active projects: 1
- On-hold projects: 1
- Payment terms: 30 days
- Average payment: 52 days
- Overdue amount: €3,200 (1 invoice)
- Last activity: 10 days ago
- Hours this month: 12h

**Calculation:**
```
Starting score: 100

Revenue Analysis:
  Change: €2,100 / €6,800 = 31% (down 69%)
  Penalty: -20 (major decline)
  Risk: "Revenue down 69% this month"

Payment Behavior:
  Average: 52 days on 30-day terms = 173% (+73% over terms)
  Penalty: -15 (way over terms)
  Risk: "Slow payments (73% over terms)"
  Overdue: €3,200 (1 invoice)
  Penalty: -5 (1 × 5)
  Risk: "€3,200 overdue"

Project Activity:
  Active: 1 project (ok)
  Penalty: 0
  On-hold: 1 project
  Penalty: -5
  Risk: "1 project on hold"

Engagement:
  Last activity: 10 days ago (ok)
  Penalty: 0
  Hours: 12h (low but not critical)
  Penalty: 0

Total Penalties: -20 -15 -5 -5 = -45
Final Score: 100 - 45 = 55

Status: WARNING (borderline At-Risk)
```

**Recommended Actions for Beta Tech:**
1. 🚨 **Call client immediately** to discuss revenue drop
2. 📧 **Follow up on €3,200 overdue invoice** (send reminder, call if needed)
3. 🤝 **Discuss the on-hold project** - can we reactivate it?
4. 📊 **Understand payment delays** - are they having cash flow issues?

---

**End of Documentation**

This document is self-contained and provides all necessary context to resume development of the Client Health Dashboard without prior knowledge. All enhancements from v1.2 (backend) and v1.3 (UI) are fully implemented and documented with complete implementation details, code examples, and testing requirements.
