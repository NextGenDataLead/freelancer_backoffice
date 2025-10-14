-- Migration: Add Status Enums for Clients and Projects
-- Description: Implement comprehensive status system for clients and projects
-- Date: 2025-10-13
-- Reference: Enhancement #2 from TODO_CLIENT_HEALTH_ENHANCEMENTS.md

-- ======================
-- CREATE ENUM TYPES
-- ======================

-- Client Status Enum
-- Values: prospect, active, on_hold, completed, deactivated
CREATE TYPE client_status AS ENUM (
  'prospect',      -- Potential client, not yet signed
  'active',        -- Currently working together
  'on_hold',       -- Temporarily paused relationship
  'completed',     -- Finished all work, may return
  'deactivated'    -- No longer working together (churned)
);

-- Project Status Enum
-- Values: prospect, active, on_hold, completed, cancelled
CREATE TYPE project_status AS ENUM (
  'prospect',      -- Proposed project, not yet approved
  'active',        -- Currently in progress
  'on_hold',       -- Temporarily paused
  'completed',     -- Successfully finished
  'cancelled'      -- Cancelled before completion
);

-- ======================
-- ALTER CLIENTS TABLE
-- ======================

-- Add status column to clients table
ALTER TABLE clients
  ADD COLUMN status client_status DEFAULT 'active' NOT NULL;

-- Migrate existing data based on active boolean
UPDATE clients
SET status = CASE
  WHEN active = true THEN 'active'::client_status
  WHEN active = false THEN 'deactivated'::client_status
  ELSE 'active'::client_status
END;

-- Add comment to document the status column
COMMENT ON COLUMN clients.status IS 'Client relationship status: prospect, active, on_hold, completed, deactivated';

-- Create index for common status filtering queries
CREATE INDEX idx_clients_status ON clients(status);

-- Create index for active/on_hold filtering (used by health dashboard)
CREATE INDEX idx_clients_active_statuses ON clients(status) WHERE status IN ('active', 'on_hold');

-- ======================
-- ALTER PROJECTS TABLE
-- ======================

-- Add status column to projects table
ALTER TABLE projects
  ADD COLUMN status project_status DEFAULT 'active' NOT NULL;

-- Migrate existing data based on active boolean
UPDATE projects
SET status = CASE
  WHEN active = true THEN 'active'::project_status
  WHEN active = false THEN 'completed'::project_status
  ELSE 'active'::project_status
END;

-- Add comment to document the status column
COMMENT ON COLUMN projects.status IS 'Project status: prospect, active, on_hold, completed, cancelled';

-- Create index for common status filtering queries
CREATE INDEX idx_projects_status ON projects(status);

-- Create index for active/on_hold filtering (used by health dashboard)
CREATE INDEX idx_projects_active_statuses ON projects(status) WHERE status IN ('active', 'on_hold', 'prospect');

-- ======================
-- BACKWARD COMPATIBILITY
-- ======================

-- Keep active boolean columns for backward compatibility during transition
-- These can be removed in a future migration once all code is updated
-- For now, we'll keep them in sync with the status column using triggers

-- Function to sync clients.active with clients.status
CREATE OR REPLACE FUNCTION sync_client_active_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Set active = true if status is 'active' or 'on_hold'
  -- Set active = false for all other statuses
  NEW.active := (NEW.status IN ('active', 'on_hold'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to keep clients.active in sync with clients.status
CREATE TRIGGER trg_sync_client_active_status
  BEFORE INSERT OR UPDATE OF status ON clients
  FOR EACH ROW
  EXECUTE FUNCTION sync_client_active_status();

-- Function to sync projects.active with projects.status
CREATE OR REPLACE FUNCTION sync_project_active_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Set active = true if status is 'active', 'on_hold', or 'prospect'
  -- Set active = false for 'completed' or 'cancelled'
  NEW.active := (NEW.status IN ('active', 'on_hold', 'prospect'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to keep projects.active in sync with projects.status
CREATE TRIGGER trg_sync_project_active_status
  BEFORE INSERT OR UPDATE OF status ON projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_project_active_status();

-- Update existing records to sync active boolean
UPDATE clients SET active = (status IN ('active', 'on_hold'));
UPDATE projects SET active = (status IN ('active', 'on_hold', 'prospect'));

-- ======================
-- COMMENTS AND DOCUMENTATION
-- ======================

COMMENT ON TYPE client_status IS 'Client relationship status tracking';
COMMENT ON TYPE project_status IS 'Project lifecycle status tracking';

-- ======================
-- VALIDATION
-- ======================

-- Verify the migration worked correctly
DO $$
DECLARE
  client_count INTEGER;
  project_count INTEGER;
BEGIN
  -- Count clients with status
  SELECT COUNT(*) INTO client_count FROM clients WHERE status IS NOT NULL;
  RAISE NOTICE 'Migrated % clients with status', client_count;

  -- Count projects with status
  SELECT COUNT(*) INTO project_count FROM projects WHERE status IS NOT NULL;
  RAISE NOTICE 'Migrated % projects with status', project_count;

  -- Verify no NULL statuses
  IF EXISTS (SELECT 1 FROM clients WHERE status IS NULL) THEN
    RAISE EXCEPTION 'ERROR: Found clients with NULL status';
  END IF;

  IF EXISTS (SELECT 1 FROM projects WHERE status IS NULL) THEN
    RAISE EXCEPTION 'ERROR: Found projects with NULL status';
  END IF;

  RAISE NOTICE 'Migration completed successfully';
END $$;
