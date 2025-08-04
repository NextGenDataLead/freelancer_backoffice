-- Seed data for development and testing
-- This script should be idempotent

BEGIN;

-- Insert development tenant
INSERT INTO tenants (id, name, subdomain, settings, subscription_status) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Development Tenant',
  'dev',
  '{"features": ["all"], "environment": "development"}'::jsonb,
  'active'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  settings = EXCLUDED.settings;

-- Insert test tenant
INSERT INTO tenants (id, name, subdomain, settings, subscription_status)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001', 
  'Test Tenant',
  'test',
  '{"features": ["basic"], "environment": "test"}'::jsonb,
  'active'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  settings = EXCLUDED.settings;

-- Insert storage buckets (in case they weren't created by migration)
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('avatars', 'avatars', true),
  ('documents', 'documents', false),
  ('exports', 'gdpr-exports', false)
ON CONFLICT (id) DO NOTHING;

COMMIT;