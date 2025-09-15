-- Migration: 043 - Complete Test Coverage Seed Data (Safe Re-run Version)
-- Enhanced with 7th email for complete B2B SaaS testing including member role
-- Uses ON CONFLICT DO NOTHING to allow safe re-runs

SET session_replication_role = replica;
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET search_path = public, auth, extensions;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- ====================
-- SUBSCRIPTION PLANS
-- ====================

INSERT INTO platform_subscription_plans (id, name, description, price, billing_interval, features, limits, is_active, sort_order, supported_providers, provider_configs, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111111', 'Starter', 'Perfect for freelancers and small teams', 29.00, 'monthly',
 '{"max_clients": 25, "api_calls": 5000, "support_level": "email"}',
 '{"storage_gb": 5, "users": 3, "projects": 10}',
 true, 1, ARRAY['mollie'], '{}', NOW(), NOW()),

('22222222-2222-2222-2222-222222222222', 'Professional', 'Ideal for growing businesses', 79.00, 'monthly',
 '{"max_clients": 100, "api_calls": 25000, "support_level": "priority", "advanced_reporting": true}',
 '{"storage_gb": 25, "users": 15, "projects": 50}',
 true, 2, ARRAY['mollie', 'stripe'], '{"mollie": {"mandate_required": true}, "stripe": {"trial_days": 14}}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ====================
-- TENANTS
-- ====================

INSERT INTO tenants (id, name, subdomain, created_at, updated_at, settings, subscription_status, billing_email, max_users, max_storage_gb) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TechFlow Solutions', 'techflow', NOW() - INTERVAL '6 months', NOW(),
 '{"timezone": "Europe/Amsterdam", "currency": "EUR", "language": "en"}',
 'active', 'imre.iddatasolutions@gmail.com', 5, 10),

('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Data Analytics Pro', 'dataanalyticspr', NOW() - INTERVAL '3 months', NOW(),
 '{"timezone": "Europe/Brussels", "currency": "EUR", "language": "en"}',
 'active', 'imre@dappastra.com', 15, 25)
ON CONFLICT (id) DO NOTHING;

-- ====================
-- PROFILES (Enhanced with 3 roles: owner + admin + member)
-- ====================

INSERT INTO profiles (id, tenant_id, clerk_user_id, email, first_name, last_name, role, created_at, updated_at, last_sign_in_at, is_active, preferences, onboarding_complete, kvk_number, btw_number, business_name, business_type, hourly_rate, address, postal_code, city, country_code, phone, default_payment_terms) VALUES
-- Tenant 1: Owner + Admin + Member (3-user collaboration testing)
('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_30ybLTlW3qYjW4nxfYO7sUMj9YF', 'imre.iddatasolutions@gmail.com', 'Imre', 'van der Berg', 'owner', NOW() - INTERVAL '6 months', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', true, '{"theme": "light", "notifications": true}', true, '12345678', 'NL123456789B01', 'TechFlow Solutions BV', 'bv', 85.00, 'Techstraat 123', '1012AB', 'Amsterdam', 'NL', '+31 20 1234567', 30),

('11111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_30xp6CTy0BZDkIFnxEpY83hWdVu', 'dekker.i@gmail.com', 'Imre', 'Dekker', 'admin', NOW() - INTERVAL '5 months', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', true, '{"theme": "dark", "notifications": true}', true, NULL, NULL, NULL, NULL, 75.00, NULL, NULL, NULL, NULL, NULL, 30),

-- NEW: Member role for testing basic user permissions
('11111111-1111-1111-1111-111111111113', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_31UxrL7IuokriIgTyknSF5n1Mjr', 'nextgendatalead@gmail.com', 'Emma', 'Johnson', 'member', NOW() - INTERVAL '2 months', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours', true, '{"theme": "light", "notifications": false}', true, NULL, NULL, NULL, NULL, 65.00, NULL, NULL, NULL, NULL, NULL, 30),

-- Tenant 2: Owner only (single-user testing)
('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user_32eqHiW6Cd8cJry5E9NtqEl6d5a', 'imre@dappastra.com', 'Imre', 'Dappastra', 'owner', NOW() - INTERVAL '3 months', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes', true, '{"theme": "dark", "notifications": true, "dashboard_layout": "compact"}', true, '87654321', 'BE987654321', 'Data Analytics Pro BVBA', 'bv', 120.00, 'Analitieklaan 25', '1000', 'Brussels', 'BE', '+32 2 123 4567', 30)
ON CONFLICT (id) DO NOTHING;


-- ====================
-- CLIENTS (No email conflicts - clean separation)
-- ====================

INSERT INTO clients (id, tenant_id, created_by, name, company_name, email, phone, address, postal_code, city, country_code, vat_number, is_business, is_supplier, default_payment_terms, notes, created_at, updated_at, invoicing_frequency, auto_invoice_enabled, active, hourly_rate) VALUES
-- Tenant 1 clients (using different emails than team members)
('c1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'NextGen Data Lead', 'NextGen Data Consulting', 'test.nextgendatalead@gmail.com', '+31 30 9876543', 'Innovatielaan 45', '3512JK', 'Utrecht', 'NL', 'NL987654321', true, false, 30, 'External freelance data consultant - ML projects', NOW() - INTERVAL '4 months', NOW() - INTERVAL '1 week', 'monthly', true, true, 85.00),

('c1111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'ID Data Solutions Branch', 'ID Data Solutions Info Dept', 'info.iddatasolutions@gmail.com', '+31 20 6789012', 'Datapark 300', '1016EF', 'Amsterdam', 'NL', 'NL888999000', true, false, 30, 'Internal consulting - different department services', NOW() - INTERVAL '2 months', NOW() - INTERVAL '3 days', 'on_demand', false, true, 90.00),

-- Tenant 2 client
('c2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Master Data Partners', 'Master Data Partners NV', 'imre@masterdatapartners.be', '+32 3 456 7890', 'Datapark 100', '2000', 'Antwerp', 'BE', 'BE123456789', true, false, 45, 'Enterprise data management consulting', NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 days', 'monthly', true, true, 120.00)
ON CONFLICT (id) DO NOTHING;

-- ====================
-- PROJECTS
-- ====================

INSERT INTO projects (id, name, description, client_id, hourly_rate, active, tenant_id, created_by, created_at, updated_at) VALUES
-- Tenant 1 projects (created by different roles)
('d1111111-1111-1111-1111-111111111111', 'ML Data Pipeline', 'Machine learning data pipeline development', 'c1111111-1111-1111-1111-111111111111', 85.00, true, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 months', NOW() - INTERVAL '1 week'),
('d1111111-1111-1111-1111-111111111112', 'Analytics Dashboard', 'Business analytics dashboard creation', 'c1111111-1111-1111-1111-111111111112', 90.00, true, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111112', NOW() - INTERVAL '1 month', NOW() - INTERVAL '2 days'),
-- Project created by member (testing member permissions)
('d1111111-1111-1111-1111-111111111113', 'Website Optimization', 'Performance optimization and SEO improvements', 'c1111111-1111-1111-1111-111111111111', 65.00, true, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111113', NOW() - INTERVAL '3 weeks', NOW() - INTERVAL '1 day'),

-- Tenant 2 projects
('e2222222-2222-2222-2222-222222222222', 'Master Data Architecture', 'Enterprise master data management architecture', 'c2222222-2222-2222-2222-222222222222', 120.00, true, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '2 months', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- ====================
-- TIME ENTRIES (Multi-user collaboration testing)
-- ====================

INSERT INTO time_entries (id, tenant_id, created_by, client_id, project_name, description, entry_date, hours, hourly_rate, billable, invoiced, invoice_id, created_at, updated_at, project_id, effective_hourly_rate) VALUES
-- Tenant 1 - Owner's time entries
('a1111111-1111-1111-1111-111111111121', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'ML Data Pipeline', 'Data pipeline architecture design', (NOW() - INTERVAL '5 days')::date, 6.0, 85.00, true, false, NULL, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', 'd1111111-1111-1111-1111-111111111111', 85.00),
('a1111111-1111-1111-1111-111111111122', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111112', 'Analytics Dashboard', 'Dashboard wireframe and planning', (NOW() - INTERVAL '3 days')::date, 4.0, 90.00, true, false, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', 'd1111111-1111-1111-1111-111111111112', 90.00),

-- Tenant 1 - Admin's time entries
('a1111111-1111-1111-1111-111111111124', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111111', 'ML Data Pipeline', 'Data cleaning and preprocessing', (NOW() - INTERVAL '4 days')::date, 8.0, 75.00, true, false, NULL, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', 'd1111111-1111-1111-1111-111111111111', 75.00),
('a1111111-1111-1111-1111-111111111125', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111112', 'Analytics Dashboard', 'Frontend development and API integration', (NOW() - INTERVAL '2 days')::date, 7.0, 75.00, true, false, NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 'd1111111-1111-1111-1111-111111111112', 75.00),

-- Tenant 1 - Member's time entries (testing member role permissions)
('a1111111-1111-1111-1111-111111111126', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111113', 'c1111111-1111-1111-1111-111111111111', 'Website Optimization', 'SEO audit and keyword research', (NOW() - INTERVAL '6 days')::date, 5.0, 65.00, true, false, NULL, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days', 'd1111111-1111-1111-1111-111111111113', 65.00),
('a1111111-1111-1111-1111-111111111127', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111113', 'c1111111-1111-1111-1111-111111111111', 'Website Optimization', 'Page speed optimization implementation', (NOW() - INTERVAL '1 day')::date, 7.0, 65.00, true, false, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 'd1111111-1111-1111-1111-111111111113', 65.00),
('a1111111-1111-1111-1111-111111111128', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111113', 'c1111111-1111-1111-1111-111111111112', 'Analytics Dashboard', 'UI/UX testing and feedback', (NOW() - INTERVAL '3 days')::date, 3.0, 65.00, false, false, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', 'd1111111-1111-1111-1111-111111111112', 65.00),

-- Tenant 2 - Owner's time entries
('b2222222-2222-2222-2222-222222222221', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Master Data Architecture', 'Architecture planning and system design', (NOW() - INTERVAL '3 days')::date, 8.0, 120.00, true, false, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', 'e2222222-2222-2222-2222-222222222222', 120.00),
('b2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Master Data Architecture', 'Data modeling and entity relationships', (NOW() - INTERVAL '1 day')::date, 6.0, 120.00, true, false, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 'e2222222-2222-2222-2222-222222222222', 120.00),

-- AUGUST 2025 TIME ENTRIES (Previous month data for rate comparisons)
-- Tenant 1 - Emma Johnson's (Member) time entries for August 2025
('a1111111-1111-1111-1111-111111111131', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111113', 'c1111111-1111-1111-1111-111111111111', 'Website Optimization', 'SEO analysis and improvements', '2025-08-28'::date, 8.0, 65.00, true, false, NULL, '2025-08-28', '2025-08-28', 'd1111111-1111-1111-1111-111111111113', 65.00),
('a1111111-1111-1111-1111-111111111132', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111113', 'c1111111-1111-1111-1111-111111111111', 'Website Optimization', 'Performance optimization', '2025-08-26'::date, 6.5, 65.00, true, false, NULL, '2025-08-26', '2025-08-26', 'd1111111-1111-1111-1111-111111111113', 65.00),
('a1111111-1111-1111-1111-111111111133', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111113', 'c1111111-1111-1111-1111-111111111112', 'Analytics Dashboard', 'UI testing and feedback', '2025-08-24'::date, 4.0, 65.00, true, false, NULL, '2025-08-24', '2025-08-24', 'd1111111-1111-1111-1111-111111111112', 65.00),

-- Owner's time entries for August 2025
('a1111111-1111-1111-1111-111111111134', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'ML Data Pipeline', 'Model training and validation', '2025-08-20'::date, 7.0, 85.00, true, false, NULL, '2025-08-20', '2025-08-20', 'd1111111-1111-1111-1111-111111111111', 85.00),
('a1111111-1111-1111-1111-111111111135', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111112', 'Analytics Dashboard', 'Backend API development', '2025-08-18'::date, 8.5, 90.00, true, false, NULL, '2025-08-18', '2025-08-18', 'd1111111-1111-1111-1111-111111111112', 90.00),
('a1111111-1111-1111-1111-111111111136', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'ML Data Pipeline', 'Data preprocessing improvements', '2025-08-15'::date, 6.0, 85.00, true, false, NULL, '2025-08-15', '2025-08-15', 'd1111111-1111-1111-1111-111111111111', 85.00),

-- Admin's time entries for August 2025
('a1111111-1111-1111-1111-111111111137', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111111', 'ML Data Pipeline', 'Code review and testing', '2025-08-22'::date, 5.5, 75.00, true, false, NULL, '2025-08-22', '2025-08-22', 'd1111111-1111-1111-1111-111111111111', 75.00),
('a1111111-1111-1111-1111-111111111138', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111112', 'Analytics Dashboard', 'Frontend component development', '2025-08-16'::date, 9.0, 75.00, true, false, NULL, '2025-08-16', '2025-08-16', 'd1111111-1111-1111-1111-111111111112', 75.00),
('a1111111-1111-1111-1111-111111111139', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111111', 'ML Data Pipeline', 'Database optimization', '2025-08-12'::date, 4.5, 75.00, true, false, NULL, '2025-08-12', '2025-08-12', 'd1111111-1111-1111-1111-111111111111', 75.00)
ON CONFLICT (id) DO NOTHING;

-- ====================
-- INVOICES (Comprehensive status testing)
-- ====================

INSERT INTO invoices (id, tenant_id, created_by, client_id, invoice_number, invoice_date, due_date, status, subtotal, vat_amount, total_amount, vat_type, vat_rate, currency, reference, notes, sent_at, paid_at, pdf_url, created_at, updated_at, paid_amount) VALUES
-- Standard VAT invoice (PAID)
('10000001-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'TF-2024-001', (NOW() - INTERVAL '1 month')::date, (NOW() - INTERVAL '1 month' + INTERVAL '30 days')::date, 'paid', 1275.00, 267.75, 1542.75, 'standard', 0.21, 'EUR', 'ML Pipeline - Phase 1', 'Machine learning pipeline development completed', NOW() - INTERVAL '1 month', NOW() - INTERVAL '2 weeks', NULL, NOW() - INTERVAL '1 month', NOW() - INTERVAL '2 weeks', 1542.75),

-- Invoice created by admin
('10000002-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111112', 'TF-2024-002', (NOW() - INTERVAL '2 weeks')::date, (NOW() + INTERVAL '2 weeks')::date, 'sent', 885.00, 185.85, 1070.85, 'standard', 0.21, 'EUR', 'Analytics Dashboard - Sprint 1', 'Business analytics dashboard first sprint', NOW() - INTERVAL '2 weeks', NULL, NULL, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks', 0.00),

-- Invoice created by member (testing member permissions)
('10000003-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111113', 'c1111111-1111-1111-1111-111111111111', 'TF-2024-003', (NOW() - INTERVAL '1 week')::date, (NOW() + INTERVAL '3 weeks')::date, 'draft', 845.00, 177.45, 1022.45, 'standard', 0.21, 'EUR', 'Website Optimization', 'SEO and performance optimization work', NULL, NULL, NULL, NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week', 0.00),

-- OVERDUE invoice
('10000004-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111112', 'TF-2024-004', (NOW() - INTERVAL '45 days')::date, (NOW() - INTERVAL '15 days')::date, 'overdue', 540.00, 113.40, 653.40, 'standard', 0.21, 'EUR', 'Dashboard Analytics - Overdue', 'Invoice is 15 days overdue', NOW() - INTERVAL '45 days', NULL, NULL, NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days', 0.00),

-- PARTIALLY PAID invoice
('10000005-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'TF-2024-005', (NOW() - INTERVAL '3 weeks')::date, (NOW() + INTERVAL '1 week')::date, 'partial', 800.00, 168.00, 968.00, 'standard', 0.21, 'EUR', 'ML Pipeline - Partial Payment', 'Partially paid - awaiting balance', NOW() - INTERVAL '3 weeks', NULL, NULL, NOW() - INTERVAL '3 weeks', NOW() - INTERVAL '3 weeks', 500.00),

-- CANCELLED invoice
('10000006-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111112', 'TF-2024-006', (NOW() - INTERVAL '2 months')::date, (NOW() - INTERVAL '1 month')::date, 'cancelled', 1200.00, 252.00, 1452.00, 'standard', 0.21, 'EUR', 'Cancelled Project', 'Project cancelled, invoice voided', NOW() - INTERVAL '2 months', NULL, NULL, NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months', 0.00),

-- Tenant 2 - VAT EXEMPT invoice
('10000007-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'DAP-2024-001', (NOW() - INTERVAL '2 weeks')::date, (NOW() + INTERVAL '6 weeks')::date, 'sent', 1680.00, 0.00, 1680.00, 'exempt', 0.00, 'EUR', 'Master Data Architecture', 'Educational services - VAT exempt', NOW() - INTERVAL '2 weeks', NULL, NULL, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks', 0.00)
ON CONFLICT (id) DO NOTHING;

-- ====================
-- EXPENSES (Multi-user expense testing)
-- ====================

INSERT INTO expenses (id, tenant_id, title, description, expense_date, amount, currency, category_id, expense_type, payment_method, status, current_approval_step, submitted_by, submitted_at, project_code, vendor_name, requires_reimbursement, is_recurring, is_billable, client_id, created_at, updated_at, metadata, vat_rate, vat_amount) VALUES
-- Owner's expenses
('30000001-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Client meeting travel', 'Train tickets to Utrecht for client meeting', (NOW() - INTERVAL '1 week')::date, 45.50, 'EUR', 'a1111111-1111-1111-1111-111111111111', 'reiskosten', 'personal_card', 'approved', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 week', 'ML-PIPELINE', 'NS Dutch Railways', true, false, true, 'c1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week', '{}', 0.21, 9.56),

-- Admin's expenses
('30000002-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Development tools subscription', 'Monthly JetBrains All Products Pack', (NOW() - INTERVAL '1 month')::date, 24.90, 'EUR', 'a1111111-1111-1111-1111-111111111112', 'software_ict', 'corporate_card', 'approved', 0, '11111111-1111-1111-1111-111111111112', NOW() - INTERVAL '1 month', 'DEV-TOOLS', 'JetBrains', true, true, false, NULL, NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 week', '{}', 0.21, 5.23),

-- Member's expenses (testing member expense permissions)
('30000003-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Design software license', 'Adobe Creative Cloud monthly subscription', (NOW() - INTERVAL '2 weeks')::date, 59.99, 'EUR', 'a1111111-1111-1111-1111-111111111112', 'software_ict', 'personal_card', 'submitted', 1, '11111111-1111-1111-1111-111111111113', NOW() - INTERVAL '2 weeks', 'WEB-OPT', 'Adobe Systems', true, true, false, NULL, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks', '{"approval_required": true}', 0.21, 12.60),

-- Member's rejected expense (testing expense approval workflow)
('30000004-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Expensive lunch meeting', 'Business lunch at high-end restaurant', (NOW() - INTERVAL '1 week')::date, 350.00, 'EUR', 'a1111111-1111-1111-1111-111111111111', 'maaltijden_zakelijk', 'personal_card', 'rejected', 0, '11111111-1111-1111-1111-111111111113', NOW() - INTERVAL '1 week', 'CLIENT-MEET', 'Restaurant Le Expensive', true, false, false, NULL, NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week', '{"rejection_reason": "Exceeds company meal policy limits"}', 0.21, 73.50),

-- Tenant 2 expenses
('30000007-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Data governance training', 'Professional certification course', (NOW() - INTERVAL '2 weeks')::date, 899.00, 'EUR', 'b2222222-2222-2222-2222-222222222222', 'professionele_diensten', 'bank_transfer', 'approved', 0, '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '2 weeks', 'TRAINING', 'Data Governance Institute', false, false, false, NULL, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks', '{}', 0.21, 188.79)
ON CONFLICT (id) DO NOTHING;

-- ====================
-- TENANT SUBSCRIPTIONS
-- ====================

INSERT INTO tenant_platform_subscriptions (id, tenant_id, plan_id, payment_provider, status, current_period_start, current_period_end, trial_start, trial_end, canceled_at, cancel_at_period_end, provider_data, created_at, updated_at) VALUES
('40000001-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'mollie', 'active', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', NULL, NULL, NULL, false,
 '{"subscription_id": "sub_mollie_techflow_123", "customer_id": "cst_mollie_techflow_456", "mandate_id": "mdt_mollie_techflow_789"}',
 NOW() - INTERVAL '6 months', NOW() - INTERVAL '15 days'),

('40000007-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'stripe', 'active', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', NULL, NULL, NULL, false,
 '{"subscription_id": "sub_stripe_dataanalytics_abc123", "customer_id": "cus_stripe_dataanalytics_def456", "payment_method_id": "pm_stripe_dataanalytics_ghi789"}',
 NOW() - INTERVAL '3 months', NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

-- ====================
-- SUBSCRIPTION USAGE
-- ====================

INSERT INTO subscription_usage (id, tenant_id, subscription_id, period_start, period_end, api_calls, storage_used_gb, active_users, file_uploads, clients_count, time_entries_count, invoices_sent, projects_count, created_at, updated_at) VALUES
('50000001-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', 3250, 4.5, 3, 42, 2, 8, 5, 3, NOW() - INTERVAL '15 days', NOW()),
('50000007-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '40000007-2222-2222-2222-222222222222', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', 8450, 12.8, 1, 76, 1, 2, 1, 1, NOW() - INTERVAL '10 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ====================
-- PLATFORM SUBSCRIPTION PAYMENTS
-- ====================

INSERT INTO platform_subscription_payments (id, tenant_id, subscription_id, payment_provider, amount, currency, status, payment_date, failure_reason, description, provider_data, created_at) VALUES
('60000001-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 29.00, 'EUR', 'paid', (NOW() - INTERVAL '1 month')::date, NULL, 'Monthly subscription payment for Starter plan',
 '{"payment_method": "directdebit", "mandate_id": "mdt_mollie_techflow_789", "settlement_id": "stl_mollie_settlement_456"}',
 NOW() - INTERVAL '1 month'),

('60000007-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '40000007-2222-2222-2222-222222222222', 'stripe', 79.00, 'EUR', 'paid', (NOW() - INTERVAL '1 month')::date, NULL, 'Monthly subscription payment for Professional plan',
 '{"payment_method": "card", "card_brand": "visa", "card_last4": "4242", "receipt_url": "https://pay.stripe.com/receipts/dataanalytics_receipt"}',
 NOW() - INTERVAL '1 month')
ON CONFLICT (id) DO NOTHING;

-- ====================
-- NOTIFICATIONS (Multi-user notifications)
-- ====================

INSERT INTO notifications (id, tenant_id, user_id, type, title, message, data, read_at, created_at, updated_at, expires_at, priority, category) VALUES
-- Owner notifications
('20000001-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'success', 'Invoice Paid', 'Invoice TF-2024-001 has been paid by NextGen Data Lead', '{"invoice_id": "10000001-1111-1111-1111-111111111111", "amount": 1542.75}', NULL, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks', NULL, 7, 'billing'),

-- Admin notifications
('20000002-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111112', 'info', 'New Project Created', 'Analytics Dashboard project has been created', '{"project_id": "d1111111-1111-1111-1111-111111111112"}', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month', NULL, 5, 'projects'),

-- Member notifications (testing member notification permissions)
('20000003-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111113', 'info', 'Expense Approval Required', 'Your Adobe Creative Cloud expense requires approval', '{"expense_id": "30000003-1111-1111-1111-111111111111", "amount": 59.99}', NULL, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks', NULL, 6, 'expenses'),

('20000004-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111113', 'error', 'Expense Rejected', 'Your lunch expense has been rejected - exceeds policy limits', '{"expense_id": "30000004-1111-1111-1111-111111111111", "rejection_reason": "Exceeds company meal policy limits"}', NULL, NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week', NULL, 8, 'expenses'),

-- Cross-user collaboration notification
('20000005-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111112', 'info', 'Time Entry Added', 'Emma Johnson added 7 hours to Website Optimization project', '{"user_name": "Emma Johnson", "project_id": "d1111111-1111-1111-1111-111111111113", "hours": 7}', NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NULL, 4, 'time_tracking'),

-- Tenant 2 notifications
('20000007-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'success', 'Expense Approved', 'Training expense has been approved for reimbursement', '{"expense_id": "30000007-2222-2222-2222-222222222222", "amount": 899.00}', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks', NULL, 6, 'expenses')
ON CONFLICT (id) DO NOTHING;

-- ====================
-- ADDITIONAL TENANT SUBSCRIPTION DATA (For MAU/Subscription Metrics)
-- ====================

-- Add more realistic subscription payment data to calculate metrics
-- This extends the existing platform_subscription_payments with tenant customer payments

INSERT INTO platform_subscription_payments (id, tenant_id, subscription_id, payment_provider, amount, currency, status, payment_date, failure_reason, description, provider_data, created_at) VALUES
-- Additional Tenant 1 customer subscription payments (simulate 10 customers)
('70000001-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 29.00, 'EUR', 'paid', (NOW() - INTERVAL '2 months')::date, NULL, 'Starter plan - Customer A', '{"customer": "customer-a", "payment_method": "ideal"}', NOW() - INTERVAL '2 months'),
('70000002-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 29.00, 'EUR', 'paid', (NOW() - INTERVAL '1 month')::date, NULL, 'Starter plan - Customer A', '{"customer": "customer-a", "payment_method": "ideal"}', NOW() - INTERVAL '1 month'),
('70000003-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 29.00, 'EUR', 'paid', NOW()::date, NULL, 'Starter plan - Customer A (Current month)', '{"customer": "customer-a", "payment_method": "ideal"}', NOW()),

('70000004-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 29.00, 'EUR', 'paid', (NOW() - INTERVAL '2 months')::date, NULL, 'Starter plan - Customer B', '{"customer": "customer-b", "payment_method": "bancontact"}', NOW() - INTERVAL '2 months'),
('70000005-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 29.00, 'EUR', 'paid', (NOW() - INTERVAL '1 month')::date, NULL, 'Starter plan - Customer B', '{"customer": "customer-b", "payment_method": "bancontact"}', NOW() - INTERVAL '1 month'),
('70000006-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 29.00, 'EUR', 'paid', NOW()::date, NULL, 'Starter plan - Customer B (Current month)', '{"customer": "customer-b", "payment_method": "bancontact"}', NOW()),

('70000007-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 79.00, 'EUR', 'paid', (NOW() - INTERVAL '2 months')::date, NULL, 'Professional plan - Customer C', '{"customer": "customer-c", "payment_method": "sepa"}', NOW() - INTERVAL '2 months'),
('70000008-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 79.00, 'EUR', 'paid', (NOW() - INTERVAL '1 month')::date, NULL, 'Professional plan - Customer C', '{"customer": "customer-c", "payment_method": "sepa"}', NOW() - INTERVAL '1 month'),
('70000009-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 79.00, 'EUR', 'paid', NOW()::date, NULL, 'Professional plan - Customer C (Current month)', '{"customer": "customer-c", "payment_method": "sepa"}', NOW()),

-- Additional customers for realistic metrics (7 more customers total = 10 customers)
('7000000a-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 29.00, 'EUR', 'paid', (NOW() - INTERVAL '1 month')::date, NULL, 'Starter plan - Customer D', '{"customer": "customer-d", "payment_method": "ideal"}', NOW() - INTERVAL '1 month'),
('7000000b-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 29.00, 'EUR', 'paid', NOW()::date, NULL, 'Starter plan - Customer D (Current month)', '{"customer": "customer-d", "payment_method": "ideal"}', NOW()),

('7000000c-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 29.00, 'EUR', 'paid', (NOW() - INTERVAL '1 month')::date, NULL, 'Starter plan - Customer E', '{"customer": "customer-e", "payment_method": "creditcard"}', NOW() - INTERVAL '1 month'),
('7000000d-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 29.00, 'EUR', 'paid', NOW()::date, NULL, 'Starter plan - Customer E (Current month)', '{"customer": "customer-e", "payment_method": "creditcard"}', NOW()),

('7000000e-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 79.00, 'EUR', 'paid', (NOW() - INTERVAL '1 month')::date, NULL, 'Professional plan - Customer F', '{"customer": "customer-f", "payment_method": "paypal"}', NOW() - INTERVAL '1 month'),
('7000000f-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 79.00, 'EUR', 'paid', NOW()::date, NULL, 'Professional plan - Customer F (Current month)', '{"customer": "customer-f", "payment_method": "paypal"}', NOW()),

-- Customers G, H, I, J for current month only (showing growth)
('70000010-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 29.00, 'EUR', 'paid', NOW()::date, NULL, 'Starter plan - Customer G (New this month)', '{"customer": "customer-g", "payment_method": "ideal"}', NOW()),
('70000011-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 29.00, 'EUR', 'paid', NOW()::date, NULL, 'Starter plan - Customer H (New this month)', '{"customer": "customer-h", "payment_method": "bancontact"}', NOW()),
('70000012-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 79.00, 'EUR', 'paid', NOW()::date, NULL, 'Professional plan - Customer I (New this month)', '{"customer": "customer-i", "payment_method": "sepa"}', NOW()),
('70000013-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 29.00, 'EUR', 'paid', NOW()::date, NULL, 'Starter plan - Customer J (New this month)', '{"customer": "customer-j", "payment_method": "ideal"}', NOW()),

-- Tenant 2 additional customer payments (3 enterprise customers at €79 each)
('70000021-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '40000007-2222-2222-2222-222222222222', 'stripe', 79.00, 'EUR', 'paid', (NOW() - INTERVAL '2 months')::date, NULL, 'Professional plan - Enterprise A', '{"customer": "enterprise-a", "payment_method": "card"}', NOW() - INTERVAL '2 months'),
('70000022-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '40000007-2222-2222-2222-222222222222', 'stripe', 79.00, 'EUR', 'paid', (NOW() - INTERVAL '1 month')::date, NULL, 'Professional plan - Enterprise A', '{"customer": "enterprise-a", "payment_method": "card"}', NOW() - INTERVAL '1 month'),
('70000023-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '40000007-2222-2222-2222-222222222222', 'stripe', 79.00, 'EUR', 'paid', NOW()::date, NULL, 'Professional plan - Enterprise A (Current)', '{"customer": "enterprise-a", "payment_method": "card"}', NOW()),

('70000024-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '40000007-2222-2222-2222-222222222222', 'stripe', 79.00, 'EUR', 'paid', (NOW() - INTERVAL '1 month')::date, NULL, 'Professional plan - Enterprise B', '{"customer": "enterprise-b", "payment_method": "card"}', NOW() - INTERVAL '1 month'),
('70000025-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '40000007-2222-2222-2222-222222222222', 'stripe', 79.00, 'EUR', 'paid', NOW()::date, NULL, 'Professional plan - Enterprise B (Current)', '{"customer": "enterprise-b", "payment_method": "card"}', NOW()),

('70000026-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '40000007-2222-2222-2222-222222222222', 'stripe', 79.00, 'EUR', 'paid', NOW()::date, NULL, 'Professional plan - Enterprise C (New this month)', '{"customer": "enterprise-c", "payment_method": "card"}', NOW()),

-- ====================
-- ENHANCED SUBSCRIPTION DATA FOR TESTING MAU & AVERAGE SUBSCRIPTION FEE
-- ====================

-- Additional historical data for 3-month trend analysis
-- Previous 3 months: Customers K-O (5 customers) for growth testing
('70000031-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 29.00, 'EUR', 'paid', (NOW() - INTERVAL '3 months')::date, NULL, 'Starter plan - Customer K (3 months ago)', '{"customer": "customer-k", "payment_method": "ideal"}', NOW() - INTERVAL '3 months'),
('70000032-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 29.00, 'EUR', 'paid', (NOW() - INTERVAL '2 months')::date, NULL, 'Starter plan - Customer K', '{"customer": "customer-k", "payment_method": "ideal"}', NOW() - INTERVAL '2 months'),
('70000033-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 29.00, 'EUR', 'paid', (NOW() - INTERVAL '1 month')::date, NULL, 'Starter plan - Customer K', '{"customer": "customer-k", "payment_method": "ideal"}', NOW() - INTERVAL '1 month'),
-- Customer K churned (no current month payment)

-- Premium tier customers (higher subscription fees for average calculation)
('70000034-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 149.00, 'EUR', 'paid', (NOW() - INTERVAL '2 months')::date, NULL, 'Premium plan - Customer L', '{"customer": "customer-l", "payment_method": "sepa"}', NOW() - INTERVAL '2 months'),
('70000035-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 149.00, 'EUR', 'paid', (NOW() - INTERVAL '1 month')::date, NULL, 'Premium plan - Customer L', '{"customer": "customer-l", "payment_method": "sepa"}', NOW() - INTERVAL '1 month'),
('70000036-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 149.00, 'EUR', 'paid', NOW()::date, NULL, 'Premium plan - Customer L (Current)', '{"customer": "customer-l", "payment_method": "sepa"}', NOW()),

('70000037-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 199.00, 'EUR', 'paid', (NOW() - INTERVAL '1 month')::date, NULL, 'Enterprise plan - Customer M', '{"customer": "customer-m", "payment_method": "sepa"}', NOW() - INTERVAL '1 month'),
('70000038-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 199.00, 'EUR', 'paid', NOW()::date, NULL, 'Enterprise plan - Customer M (Current)', '{"customer": "customer-m", "payment_method": "sepa"}', NOW()),

-- Failed payments for realistic testing
('70000039-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 29.00, 'EUR', 'failed', NOW()::date, 'Insufficient funds', 'Starter plan - Customer N (Payment failed)', '{"customer": "customer-n", "payment_method": "ideal"}', NOW()),

-- Diverse payment methods and amounts
('7000003a-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 49.00, 'EUR', 'paid', (NOW() - INTERVAL '1 month')::date, NULL, 'Growth plan - Customer O', '{"customer": "customer-o", "payment_method": "paypal"}', NOW() - INTERVAL '1 month'),
('7000003b-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000001-1111-1111-1111-111111111111', 'mollie', 49.00, 'EUR', 'paid', NOW()::date, NULL, 'Growth plan - Customer O (Current)', '{"customer": "customer-o", "payment_method": "paypal"}', NOW()),

-- Tenant 2: Enhanced enterprise data with varied pricing
('70000041-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '40000007-2222-2222-2222-222222222222', 'stripe', 299.00, 'EUR', 'paid', (NOW() - INTERVAL '3 months')::date, NULL, 'Enterprise Plus - Enterprise D', '{"customer": "enterprise-d", "payment_method": "card"}', NOW() - INTERVAL '3 months'),
('70000042-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '40000007-2222-2222-2222-222222222222', 'stripe', 299.00, 'EUR', 'paid', (NOW() - INTERVAL '2 months')::date, NULL, 'Enterprise Plus - Enterprise D', '{"customer": "enterprise-d", "payment_method": "card"}', NOW() - INTERVAL '2 months'),
('70000043-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '40000007-2222-2222-2222-222222222222', 'stripe', 299.00, 'EUR', 'paid', (NOW() - INTERVAL '1 month')::date, NULL, 'Enterprise Plus - Enterprise D', '{"customer": "enterprise-d", "payment_method": "card"}', NOW() - INTERVAL '1 month'),
('70000044-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '40000007-2222-2222-2222-222222222222', 'stripe', 299.00, 'EUR', 'paid', NOW()::date, NULL, 'Enterprise Plus - Enterprise D (Current)', '{"customer": "enterprise-d", "payment_method": "card"}', NOW()),

-- Annual subscriptions for diverse billing patterns
('70000045-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '40000007-2222-2222-2222-222222222222', 'stripe', 948.00, 'EUR', 'paid', (NOW() - INTERVAL '1 month')::date, NULL, 'Professional Annual - Enterprise E', '{"customer": "enterprise-e", "payment_method": "card", "billing_cycle": "annual"}', NOW() - INTERVAL '1 month'),
('70000046-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '40000007-2222-2222-2222-222222222222', 'stripe', 948.00, 'EUR', 'paid', NOW()::date, NULL, 'Professional Annual - Enterprise E (Current)', '{"customer": "enterprise-e", "payment_method": "card", "billing_cycle": "annual"}', NOW())
ON CONFLICT (id) DO NOTHING;

SET row_security = on;