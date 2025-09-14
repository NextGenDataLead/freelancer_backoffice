# Client & Project Management Enhancement Plan

## Overview
Transform the current basic client management system into a comprehensive client-project management platform with hourly rate configuration and real metrics integration.

## Current State Analysis
- Basic client CRUD functionality exists
- Hardcoded metrics: 24 clients, 18 business, 6 EU, 5 suppliers  
- No project management capabilities
- No hourly rate configuration
- No active/inactive client management

## Target State
- Full client-project hierarchy with hourly rates
- Enable/disable clients and projects
- Hourly rate inheritance (project overrides client)
- Real metrics: Actieve klanten, Actieve projecten, Gemiddelde hourly rate
- Integrated time tracking with proper rate calculations

## Phase 1: Database Schema Enhancement

### New Tables
```sql
-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  hourly_rate DECIMAL(10,2), -- NULL means inherit from client
  active BOOLEAN DEFAULT true,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS policies for projects
CREATE POLICY "Users can view projects in their tenant"
  ON projects FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert projects in their tenant"
  ON projects FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update projects in their tenant"
  ON projects FOR UPDATE
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete projects in their tenant"
  ON projects FOR DELETE
  USING (tenant_id = get_user_tenant_id());
```

### Client Table Modifications
```sql
-- Add missing columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);
```

### Views for Metrics
```sql
-- View for client/project statistics
CREATE VIEW client_project_stats AS
SELECT 
  tenant_id,
  COUNT(DISTINCT CASE WHEN c.active = true THEN c.id END) as active_clients,
  COUNT(DISTINCT CASE WHEN p.active = true THEN p.id END) as active_projects,
  AVG(
    CASE 
      WHEN p.hourly_rate IS NOT NULL THEN p.hourly_rate
      ELSE c.hourly_rate
    END
  ) as average_hourly_rate
FROM clients c
LEFT JOIN projects p ON c.id = p.client_id
WHERE c.active = true OR p.active = true
GROUP BY tenant_id;
```

## Phase 2: API Development

### Client API Extensions
```typescript
// PATCH /api/clients/[id]/status
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { active } = await request.json()
  // Update client active status
  // Also update related projects if needed
}
```

### New Project API
```typescript
// GET /api/projects - List projects with client info
// POST /api/projects - Create new project
// PATCH /api/projects/[id] - Update project
// DELETE /api/projects/[id] - Delete project
// PATCH /api/projects/[id]/status - Enable/disable project
```

### Enhanced Stats API
```typescript
// GET /api/clients/stats
interface ClientStats {
  activeClients: number
  activeProjects: number
  averageHourlyRate: number
  totalRevenuePotential: number
}
```

## Phase 3: UI Component Development

### Enhanced Client List Component
- Toggle switches for active/inactive status
- Expandable project sections per client
- Hourly rate display with inheritance indicators
- Project creation inline interface

### New Project Management Components
```typescript
// ProjectList component for client-specific projects
// ProjectForm for creating/editing projects  
// HourlyRateInput with inheritance visualization
// ProjectStatusToggle component
```

### Updated Client Page Layout
```
┌─────────────────────────────────────┐
│ Header + New Client Button          │
├─────────────────────────────────────┤
│ Metrics Cards (Real Data)           │
│ [Actieve Klanten] [Actieve Projecten] [Gem. Uurtarief] │
├─────────────────────────────────────┤
│ Client List with:                   │
│ ├─ Status Toggle                    │
│ ├─ Hourly Rate Input               │
│ └─ Expandable Project Section       │
│    ├─ Project List                 │
│    ├─ Project Status Toggles       │
│    └─ New Project Form             │
└─────────────────────────────────────┘
```

## Phase 4: Time Entry Integration

### Enhanced Time Entries
- Project selection in time entry forms
- Automatic hourly rate inheritance
- Revenue calculations based on effective rates

### Updated Time Entry Schema
```sql
ALTER TABLE time_entries ADD COLUMN project_id UUID REFERENCES projects(id);
ALTER TABLE time_entries ADD COLUMN effective_hourly_rate DECIMAL(10,2);
```

## Implementation Phases

### Phase 1: Database & Core API ✅ COMPLETED
- [x] Create projects table with RLS
- [x] Add active/hourly_rate columns to clients
- [x] Create client stats view
- [x] Implement client status API endpoints
- [x] Implement basic project CRUD API

### Phase 2: Project Management UI ✅ COMPLETED
- [x] Create project management components
- [x] Add project sections to client list
- [x] Implement hourly rate inheritance UI
- [x] Add client enable/disable toggles

### Phase 3: Metrics Integration ✅ COMPLETED
- [x] Build client stats API endpoint
- [x] Replace hardcoded metrics with real data
- [x] Add loading states and error handling
- [x] Implement real-time updates

### Phase 4: Time Entry Enhancement ✅ COMPLETED
- [x] Add project selection to time entries
- [x] Implement rate inheritance logic
- [x] Update revenue calculations
- [x] Test end-to-end workflow

## Technical Considerations

### Data Migration
- Existing clients default to active=true
- Time entries without projects remain valid
- Graceful handling of missing hourly rates

### Business Rules
1. Projects inherit client hourly rate if not specified
2. Disabling client doesn't auto-disable projects
3. Project hourly rate overrides client rate for calculations
4. Active status affects availability for new time entries

### Testing Strategy
- Unit tests for rate inheritance logic
- Integration tests for API endpoints
- E2E tests for complete client-project workflow

## Success Criteria
- ✅ Can enable/disable clients and projects
- ✅ Can create projects under clients
- ✅ Hourly rates properly inherit and override
- ✅ Metrics show real data (active counts, average rate)
- ✅ Time tracking integrates with project rates
- ✅ UI clearly indicates rate inheritance hierarchy

## Implementation Status: **ALL PHASES FULLY COMPLETE** ✅

### ✅ What's Been Fully Implemented:
1. **Complete Database Schema**: Projects table, client enhancements, stats view, time entry integration
2. **Full API Suite**: Client status, project CRUD, statistics endpoints, enhanced time entry API  
3. **Time Entry Integration**: Enhanced forms and lists with project selection and effective rates
4. **Core Project Components**: ProjectForm, ProjectList components created
5. **Enhanced Client List**: With project management, rate editing, status toggles (IMPLEMENTED)
6. **Real-Time Client Metrics**: Live data replacing hardcoded values on client page

### ✅ Frontend Implementation Status (COMPLETE):
- ✅ **Client Page**: Enhanced with real metrics (Actieve klanten, Actieve projecten, Gem. uurtarief)
- ✅ **Client List Component**: Fully enhanced with:
  - Status toggles for enable/disable clients
  - Inline hourly rate editing  
  - Expandable project sections per client
  - Project creation and management interface
  - Visual rate inheritance indicators
- ✅ **Time Entry Forms**: Enhanced with project selection and effective rate display
- ✅ **Time Entry Lists**: Show project information and effective rates

### 🚀 Key Features Now Available:
- **Smart Rate Inheritance**: Projects override client rates, manual rates override everything
- **Visual Rate Indicators**: Clear UI showing rate source (client/project/manual)
- **Enhanced Time Tracking**: Project selection with real-time rate calculation
- **Complete Project Management**: Create, edit, disable projects with hourly rate configuration
- **Real-Time Statistics**: Live metrics for clients, projects, and average hourly rates
- **Client Management**: Enable/disable clients with visual feedback
- **Inline Rate Editing**: Click to edit hourly rates directly in client list

## Risk Mitigation
- Backwards compatibility with existing time entries
- Proper error handling for missing rates
- Clear UI indicators for inherited vs explicit rates
- Comprehensive testing of rate calculation logic