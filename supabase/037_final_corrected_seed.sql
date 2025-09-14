-- Migration: 037 - Final Corrected Comprehensive Seed Data
-- Fixed all enum types and only truncates existing tables

SET session_replication_role = replica;
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
-- FIX: Set proper search path for Supabase migrations
SET search_path = public, auth, extensions;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- ====================
-- CLEAR EXISTING DATA (only tables that exist)
-- ====================

-- Clear tables in dependency order with explicit schema qualification
DELETE FROM public.notification_events;
DELETE FROM public.time_entries;
DELETE FROM public.invoices;
DELETE FROM public.expenses;
DELETE FROM public.notifications;
DELETE FROM public.projects;
DELETE FROM public.clients;
DELETE FROM public.profiles;
DELETE FROM public.tenant_platform_subscriptions;
DELETE FROM public.subscription_usage;
DELETE FROM public.platform_subscription_payments;
DELETE FROM public.expense_categories;
DELETE FROM public.platform_subscription_plans;
DELETE FROM public.tenants;

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
 true, 2, ARRAY['mollie', 'stripe'], '{"mollie": {"mandate_required": true}, "stripe": {"trial_days": 14}}', NOW(), NOW()),

('33333333-3333-3333-3333-333333333333', 'Enterprise', 'For large organizations with advanced needs', 199.00, 'monthly',
 '{"max_clients": 500, "api_calls": 100000, "support_level": "dedicated", "custom_integrations": true, "sso": true}',
 '{"storage_gb": 100, "users": 50, "projects": 200}',
 true, 3, ARRAY['mollie', 'stripe'], '{"stripe": {"priority_support": true, "dedicated_manager": true}}', NOW(), NOW());

-- ====================
-- TENANT ORGANIZATIONS
-- ====================

INSERT INTO tenants (id, name, subdomain, created_at, updated_at, settings, subscription_status, billing_email, max_users, max_storage_gb) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ID Data Solutions', 'iddatasolutions', NOW() - INTERVAL '6 months', NOW(), 
 '{"timezone": "Europe/Amsterdam", "currency": "EUR", "language": "nl"}', 
 'active', 'info.iddatasolutions@gmail.com', 5, 10),

('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Dappastra Analytics', 'dappastra', NOW() - INTERVAL '1 year', NOW(),
 '{"timezone": "Europe/Brussels", "currency": "EUR", "language": "en", "features": {"advanced_reporting": true}}',
 'active', 'imre@dappastra.com', 20, 50),

('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Master Data Partners', 'masterdatapartners', NOW() - INTERVAL '2 years', NOW(),
 '{"timezone": "Europe/Brussels", "currency": "EUR", "language": "en", "features": {"sso": true, "custom_branding": true}}',
 'active', 'imre@masterdatapartners.be', 100, 200);

-- ====================
-- USER PROFILES (Fixed business_type enum)
-- ====================

INSERT INTO profiles (id, tenant_id, clerk_user_id, email, first_name, last_name, role, created_at, updated_at, last_sign_in_at, is_active, preferences, onboarding_complete, kvk_number, btw_number, business_name, business_type, hourly_rate, address, postal_code, city, country_code, phone, default_payment_terms) VALUES
('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_iddatasolutions_owner', 'imre.iddatasolutions@gmail.com', 'Imre', 'Dekker', 'owner', NOW() - INTERVAL '6 months', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', true, '{"theme": "light", "notifications": true}', true, '12345678', 'NL123456789B01', 'ID Data Solutions', 'sole_trader', 85.00, 'Datastraat 123', '1012AB', 'Amsterdam', 'NL', '+31 20 1234567', 30),
('11111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_iddatasolutions_admin', 'dekker.i@gmail.com', 'Imre', 'Dekker', 'admin', NOW() - INTERVAL '5 months', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', true, '{"theme": "dark", "notifications": true}', true, NULL, NULL, NULL, NULL, 75.00, NULL, NULL, NULL, NULL, NULL, 30),
('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user_dappastra_owner', 'imre@dappastra.com', 'Imre', 'Dappastra', 'owner', NOW() - INTERVAL '1 year', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes', true, '{"theme": "dark", "notifications": true, "dashboard_layout": "compact"}', true, '87654321', 'BE987654321', 'Dappastra Analytics BVBA', 'bv', 120.00, 'Analitieklaan 25', '1000', 'Brussels', 'BE', '+32 2 123 4567', 30),
('22222222-2222-2222-2222-222222222223', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user_dappastra_lead', 'nextgendatalead@gmail.com', 'Data', 'Lead', 'admin', NOW() - INTERVAL '10 months', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', true, '{"theme": "light", "notifications": false}', true, NULL, NULL, NULL, NULL, 95.00, NULL, NULL, NULL, NULL, NULL, 30),
('33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'user_masterdata_owner', 'imre@masterdatapartners.be', 'Imre', 'Partners', 'owner', NOW() - INTERVAL '2 years', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes', true, '{"theme": "light", "notifications": true, "advanced_features": true}', true, '55566677', 'BE123456789', 'Master Data Partners NV', 'bv', 150.00, 'Datapark 100', '2000', 'Antwerp', 'BE', '+32 3 456 7890', 45);

-- ====================
-- EXPENSE CATEGORIES (Fixed Dutch expense_type enum + missing columns)
-- ====================

INSERT INTO expense_categories (id, tenant_id, name, description, expense_type, parent_category_id, is_active, gl_account_code, created_at, updated_at, metadata) VALUES
('a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Reiskosten', 'Zakelijke reiskosten', 'reiskosten', NULL, true, '4121', NOW() - INTERVAL '6 months', NOW() - INTERVAL '6 months', '{}'),
('a1111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Kantoorbenodigdheden', 'Kantoorbenodigdheden en materialen', 'kantoorbenodigdheden', NULL, true, '4110', NOW() - INTERVAL '6 months', NOW() - INTERVAL '6 months', '{}'),
('b2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Software en ICT', 'Software licenties en ICT kosten', 'software_ict', NULL, true, '4140', NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year', '{}'),
('b2222222-2222-2222-2222-222222222223', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Marketing en Reclame', 'Marketing en reclame uitgaven', 'marketing_reclame', NULL, true, '4150', NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year', '{}'),
('c3333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Professionele Diensten', 'Training en professionele ontwikkeling', 'professionele_diensten', NULL, true, '4160', NOW() - INTERVAL '2 years', NOW() - INTERVAL '2 years', '{}'),
('c3333333-3333-3333-3333-333333333334', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Software en ICT', 'IT infrastructuur en hosting', 'software_ict', NULL, true, '4140', NOW() - INTERVAL '2 years', NOW() - INTERVAL '2 years', '{}');

-- ====================
-- CLIENTS
-- ====================

INSERT INTO clients (id, tenant_id, created_by, name, company_name, email, phone, address, postal_code, city, country_code, vat_number, is_business, is_supplier, default_payment_terms, notes, created_at, updated_at, invoicing_frequency, auto_invoice_enabled, active, hourly_rate) VALUES
('c1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Dappastra Analytics', 'Dappastra Analytics BVBA', 'imre@dappastra.com', '+32 2 123 4567', 'Analitieklaan 25', '1000', 'Brussels', 'BE', 'BE987654321', true, false, 30, 'Cross-company analytics consulting project', NOW() - INTERVAL '5 months', NOW() - INTERVAL '1 week', 'monthly', true, true, 85.00),
('c1111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Master Data Partners', 'Master Data Partners NV', 'imre@masterdatapartners.be', '+32 3 456 7890', 'Datapark 100', '2000', 'Antwerp', 'BE', 'BE123456789', true, false, 30, 'Data integration and master data management', NOW() - INTERVAL '3 months', NOW() - INTERVAL '2 days', 'on_demand', false, true, 90.00),
('c2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'ID Data Solutions', 'ID Data Solutions BV', 'imre.iddatasolutions@gmail.com', '+31 20 1234567', 'Datastraat 123', '1012AB', 'Amsterdam', 'NL', 'NL123456789', true, false, 30, 'Machine learning and predictive analytics', NOW() - INTERVAL '8 months', NOW() - INTERVAL '3 days', 'monthly', true, true, 120.00),
('c2222222-2222-2222-2222-222222222223', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'NextGen Data Lead', 'NextGen Data Consulting', 'nextgendatalead@gmail.com', '+31 30 9876543', 'Innovatielaan 45', '3512JK', 'Utrecht', 'NL', 'NL987654321', true, false, 30, 'Advanced analytics and data science consulting', NOW() - INTERVAL '6 months', NOW() - INTERVAL '1 week', 'on_demand', false, true, 115.00),
('c3333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'Dekker Analytics', 'Dekker Analytics Solutions', 'dekker.i@gmail.com', '+31 20 5678901', 'Technieklaan 200', '1015CD', 'Amsterdam', 'NL', 'NL555666777', true, false, 45, 'Enterprise data warehouse and BI solutions', NOW() - INTERVAL '18 months', NOW() - INTERVAL '2 days', 'monthly', true, true, 150.00),
('c3333333-3333-3333-3333-333333333334', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'ID Data Solutions Info', 'ID Data Solutions', 'info.iddatasolutions@gmail.com', '+31 20 6789012', 'Datapark 300', '1016EF', 'Amsterdam', 'NL', 'NL888999000', true, false, 30, 'Data governance and compliance consulting', NOW() - INTERVAL '15 months', NOW() - INTERVAL '1 week', 'on_demand', false, true, 140.00);

-- ====================
-- PROJECTS
-- ====================

INSERT INTO projects (id, name, description, client_id, hourly_rate, active, tenant_id, created_by, created_at, updated_at) VALUES
('d1111111-1111-1111-1111-111111111111', 'Website Redesign', 'Complete redesign of bakery website with online ordering', 'c1111111-1111-1111-1111-111111111111', 65.00, true, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '2 months', NOW() - INTERVAL '1 week'),
('d1111111-1111-1111-1111-111111111112', 'Brand Identity', 'Logo and brand guidelines for garden design studio', 'c1111111-1111-1111-1111-111111111112', 75.00, false, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 months', NOW() - INTERVAL '1 month'),
('e2222222-2222-2222-2222-222222222222', 'Mobile Banking App', 'iOS and Android app development for fintech client', 'c2222222-2222-2222-2222-222222222222', 10.20, true, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '6 months', NOW() - INTERVAL '2 days'),
('e2222222-2222-2222-2222-222222222223', 'E-commerce Platform Migration', 'Migration from legacy system to modern platform', 'c2222222-2222-2222-2222-222222222223', 95.00, false, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '8 months', NOW() - INTERVAL '2 months'),
('e2222222-2222-2222-2222-222222222224', 'Healthcare Dashboard', 'Real-time analytics dashboard for healthcare data', 'c2222222-2222-2222-2222-222222222224', 140.00, true, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '3 months', NOW() - INTERVAL '1 week'),
('f3333333-3333-3333-3333-333333333333', 'Digital Transformation Initiative', 'Enterprise-wide digital transformation consulting', 'c3333333-3333-3333-3333-333333333333', 200.00, true, 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '12 months', NOW() - INTERVAL '1 day'),
('f3333333-3333-3333-3333-333333333334', 'Multi-Location POS System', 'Custom POS system for 500+ retail locations', 'c3333333-3333-3333-3333-333333333334', 180.00, false, 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '15 months', NOW() - INTERVAL '3 months'),
('f3333333-3333-3333-3333-333333333335', 'Regulatory Compliance Platform', 'Banking compliance and reporting platform', 'c3333333-3333-3333-3333-333333333335', 250.00, true, 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '8 months', NOW() - INTERVAL '2 days');

-- ====================
-- TIME ENTRIES
-- ====================

INSERT INTO time_entries (id, tenant_id, created_by, client_id, project_name, description, entry_date, hours, hourly_rate, billable, invoiced, invoice_id, created_at, updated_at, project_id, effective_hourly_rate) VALUES
('a1111111-1111-1111-1111-111111111121', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Website Redesign', 'Homepage layout and navigation design', (NOW() - INTERVAL '1 day')::date, 4.0, 65.00, true, false, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 'd1111111-1111-1111-1111-111111111111', 65.00),
('a1111111-1111-1111-1111-111111111122', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111111', 'Website Redesign', 'Online ordering system backend development', (NOW() - INTERVAL '2 days')::date, 5.0, 65.00, true, false, NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 'd1111111-1111-1111-1111-111111111111', 65.00),
('b2222222-2222-2222-2222-222222222221', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Mobile Banking App', 'Mobile app authentication module', (NOW() - INTERVAL '1 day')::date, 6.0, 10.20, true, false, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 'e2222222-2222-2222-2222-222222222222', 10.20),
('b2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222223', 'c2222222-2222-2222-2222-222222222224', 'Healthcare Dashboard', 'Healthcare data visualization components', (NOW() - INTERVAL '3 days')::date, 6.0, 140.00, true, false, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', 'e2222222-2222-2222-2222-222222222224', 140.00),
('b2222222-2222-2222-2222-222222222223', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222224', 'c2222222-2222-2222-2222-222222222222', 'Mobile Banking App', 'API integration and testing', (NOW() - INTERVAL '4 days')::date, 5.0, 10.20, true, false, NULL, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', 'e2222222-2222-2222-2222-222222222222', 10.20),
('c3333333-3333-3333-3333-333333333331', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'Digital Transformation Initiative', 'Digital transformation strategy consulting', (NOW() - INTERVAL '1 day')::date, 8.0, 200.00, true, false, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 'f3333333-3333-3333-3333-333333333333', 200.00),
('c3333333-3333-3333-3333-333333333332', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333334', 'c3333333-3333-3333-3333-333333333335', 'Regulatory Compliance Platform', 'Banking compliance framework development', (NOW() - INTERVAL '2 days')::date, 8.0, 250.00, true, false, NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 'f3333333-3333-3333-3333-333333333335', 250.00);

-- ====================
-- INVOICES (Fixed status and vat_type enums)
-- ====================

INSERT INTO invoices (id, tenant_id, created_by, client_id, invoice_number, invoice_date, due_date, status, subtotal, vat_amount, total_amount, vat_type, vat_rate, currency, reference, notes, sent_at, paid_at, pdf_url, created_at, updated_at, paid_amount) VALUES
('a1111111-1111-1111-1111-111111111131', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111112', 'INV-2024-001', (NOW() - INTERVAL '1 month')::date, (NOW() - INTERVAL '1 month' + INTERVAL '30 days')::date, 'paid', 3500.00, 735.00, 4235.00, 'standard', 0.21, 'EUR', 'Brand identity project', 'Brand identity project - paid via bank transfer', NOW() - INTERVAL '1 month', NOW() - INTERVAL '2 weeks', NULL, NOW() - INTERVAL '1 month', NOW() - INTERVAL '2 weeks', 4235.00),
('a1111111-1111-1111-1111-111111111132', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'INV-2024-002', (NOW() - INTERVAL '2 weeks')::date, (NOW() + INTERVAL '2 weeks')::date, 'sent', 2600.00, 546.00, 3146.00, 'standard', 0.21, 'EUR', 'Website redesign progress', 'Website redesign - monthly progress billing', NOW() - INTERVAL '2 weeks', NULL, NULL, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks', 0.00),
('b2222222-2222-2222-2222-222222222231', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222223', 'TF-2024-001', (NOW() - INTERVAL '2 months')::date, (NOW() - INTERVAL '2 months' + INTERVAL '30 days')::date, 'paid', 45000.00, 9000.00, 54000.00, 'standard', 0.20, 'GBP', 'Platform migration final', 'E-commerce platform migration - final invoice', NOW() - INTERVAL '2 months', NOW() - INTERVAL '1 month', NULL, NOW() - INTERVAL '2 months', NOW() - INTERVAL '1 month', 54000.00),
('b2222222-2222-2222-2222-222222222232', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'TF-2024-002', (NOW() - INTERVAL '3 weeks')::date, (NOW() - INTERVAL '3 weeks' + INTERVAL '30 days')::date, 'sent', 33600.00, 670.20, 4030.20, 'standard', 0.20, 'GBP', 'Mobile app Q4 progress', 'Mobile banking app - Q4 development progress', NOW() - INTERVAL '3 weeks', NULL, NULL, NOW() - INTERVAL '3 weeks', NOW() - INTERVAL '3 weeks', 0.00),
('b2222222-2222-2222-2222-222222222233', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222224', 'TF-2024-003', (NOW() - INTERVAL '1 week')::date, (NOW() + INTERVAL '3 weeks')::date, 'draft', 20300.00, 4060.00, 24360.00, 'standard', 0.20, 'GBP', 'Healthcare dashboard sprint 2', 'Healthcare dashboard - sprint 2 completion', NULL, NULL, NULL, NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week', 0.00),
('c3333333-3333-3333-3333-333333333341', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333334', 'GE-2024-001', (NOW() - INTERVAL '3 months')::date, (NOW() - INTERVAL '3 months' + INTERVAL '30 days')::date, 'paid', 890000.00, 0.00, 890000.00, 'exempt', 0.00, 'USD', 'POS system final payment', 'Multi-location POS system - final payment', NOW() - INTERVAL '3 months', NOW() - INTERVAL '2 months', NULL, NOW() - INTERVAL '3 months', NOW() - INTERVAL '2 months', 890000.00),
('c3333333-3333-3333-3333-333333333342', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'GE-2024-002', (NOW() - INTERVAL '1 month')::date, (NOW() - INTERVAL '1 month' + INTERVAL '45 days')::date, 'sent', 170000.00, 0.00, 170000.00, 'exempt', 0.00, 'USD', 'Digital transformation Q4', 'Digital transformation - Q4 consulting services', NOW() - INTERVAL '1 month', NULL, NULL, NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month', 0.00),
('c3333333-3333-3333-3333-333333333343', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333335', 'GE-2024-003', (NOW() - INTERVAL '2 weeks')::date, (NOW() + INTERVAL '6 weeks')::date, 'sent', 105000.00, 0.00, 105000.00, 'exempt', 0.00, 'USD', 'Banking compliance milestone', 'Banking compliance platform - development milestone', NOW() - INTERVAL '2 weeks', NULL, NULL, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks', 0.00);

-- ====================
-- EXPENSES (Fixed all enum values)
-- ====================

INSERT INTO expenses (id, tenant_id, title, description, expense_date, amount, currency, category_id, expense_type, payment_method, status, current_approval_step, submitted_by, submitted_at, project_code, vendor_name, requires_reimbursement, is_recurring, is_billable, client_id, created_at, updated_at, metadata, vat_rate, vat_amount) VALUES
('e1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Adobe Creative Suite subscription', 'Monthly Adobe Creative Suite subscription for design work', (NOW() - INTERVAL '1 month')::date, 59.99, 'EUR', 'a1111111-1111-1111-1111-111111111112', 'software_ict', 'personal_card', 'approved', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 month', 'DESIGN-001', 'Adobe Systems', true, true, false, NULL, NOW() - INTERVAL '1 month', NOW() - INTERVAL '2 weeks', '{}', 0.21, 12.60),
('e1111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Client meeting travel costs', 'Train tickets for client meeting in Utrecht', (NOW() - INTERVAL '2 weeks')::date, 45.50, 'EUR', 'a1111111-1111-1111-1111-111111111111', 'reiskosten', 'personal_card', 'approved', 0, '11111111-1111-1111-1111-111111111112', NOW() - INTERVAL '2 weeks', 'PROJ-001', 'NS Dutch Railways', true, false, true, 'c1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks', '{}', 0.21, 9.56),
('e2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'AWS infrastructure costs', 'Monthly AWS infrastructure costs for client projects', (NOW() - INTERVAL '1 month')::date, 1250.00, 'GBP', 'b2222222-2222-2222-2222-222222222222', 'software_ict', 'corporate_card', 'approved', 0, '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '1 month', 'INFRA-001', 'Amazon Web Services', true, true, true, 'c2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 week', '{}', 0.20, 250.00),
('e2222222-2222-2222-2222-222222222223', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Healthcare conference attendance', 'Registration and travel for HealthTech conference', (NOW() - INTERVAL '3 weeks')::date, 899.00, 'GBP', 'c3333333-3333-3333-3333-333333333333', 'professionele_diensten', 'corporate_card', 'approved', 0, '22222222-2222-2222-2222-222222222223', NOW() - INTERVAL '3 weeks', 'TRAIN-001', 'HealthTech Conference Ltd', false, false, false, NULL, NOW() - INTERVAL '3 weeks', NOW() - INTERVAL '3 weeks', '{}', 0.20, 179.80),
('e2222222-2222-2222-2222-222222222224', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Mobile testing device rental', 'iPad and Android device rental for app testing', (NOW() - INTERVAL '1 week')::date, 200.00, 'GBP', 'a1111111-1111-1111-1111-111111111112', 'kantoorbenodigdheden', 'personal_card', 'approved', 0, '22222222-2222-2222-2222-222222222224', NOW() - INTERVAL '1 week', 'PROJ-002', 'DeviceRental Pro', true, false, true, 'c2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week', '{}', 0.20, 40.00),
('e3333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Enterprise cloud infrastructure', 'Microsoft Azure enterprise services monthly cost', (NOW() - INTERVAL '1 month')::date, 15000.00, 'USD', 'b2222222-2222-2222-2222-222222222222', 'software_ict', 'corporate_card', 'approved', 0, '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '1 month', 'INFRA-GLOBAL', 'Microsoft Azure', true, true, true, 'c3333333-3333-3333-3333-333333333333', NOW() - INTERVAL '1 month', NOW() - INTERVAL '2 weeks', '{}', 0.00, 0.00),
('e3333333-3333-3333-3333-333333333334', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Banking compliance training', 'Specialized training for banking compliance team', (NOW() - INTERVAL '2 weeks')::date, 5000.00, 'USD', 'c3333333-3333-3333-3333-333333333333', 'professionele_diensten', 'bank_transfer', 'approved', 0, '33333333-3333-3333-3333-333333333334', NOW() - INTERVAL '2 weeks', 'TRAIN-COMP', 'ComplianceTraining Corp', true, false, false, NULL, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks', '{}', 0.00, 0.00);

-- ====================
-- TENANT SUBSCRIPTIONS
-- ====================

INSERT INTO tenant_platform_subscriptions (id, tenant_id, plan_id, payment_provider, status, current_period_start, current_period_end, trial_start, trial_end, canceled_at, cancel_at_period_end, provider_data, created_at, updated_at) VALUES
('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'mollie', 'active', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', NULL, NULL, NULL, false, 
 '{"subscription_id": "sub_mollie_freelance_123", "customer_id": "cst_mollie_freelance_456", "mandate_id": "mdt_mollie_freelance_789"}', 
 NOW() - INTERVAL '6 months', NOW() - INTERVAL '15 days'),

('10000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'stripe', 'active', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', NULL, NULL, NULL, false,
 '{"subscription_id": "sub_stripe_techflow_abc123", "customer_id": "cus_stripe_techflow_def456", "payment_method_id": "pm_stripe_techflow_ghi789"}',
 NOW() - INTERVAL '1 year', NOW() - INTERVAL '10 days'),

('10000000-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'stripe', 'active', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', NULL, NULL, NULL, false,
 '{"subscription_id": "sub_stripe_global_xyz987", "customer_id": "cus_stripe_global_abc654", "payment_method_id": "pm_stripe_global_def321"}',
 NOW() - INTERVAL '2 years', NOW() - INTERVAL '5 days');

-- ====================
-- SUBSCRIPTION USAGE
-- ====================

INSERT INTO subscription_usage (id, tenant_id, subscription_id, period_start, period_end, api_calls, storage_used_gb, active_users, file_uploads, clients_count, time_entries_count, invoices_sent, projects_count, created_at, updated_at) VALUES
('20000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', 3250, 2.5, 2, 45, 2, 6, 2, 2, NOW() - INTERVAL '15 days', NOW()),
('20000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '10000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', 18500, 18.2, 3, 250, 3, 15, 3, 3, NOW() - INTERVAL '10 days', NOW()),
('20000000-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', 67890, 78.5, 2, 890, 3, 8, 3, 3, NOW() - INTERVAL '5 days', NOW());

-- ====================
-- PLATFORM SUBSCRIPTION PAYMENTS
-- ====================

INSERT INTO platform_subscription_payments (id, tenant_id, subscription_id, payment_provider, amount, currency, status, payment_date, failure_reason, description, provider_data, created_at) VALUES
('30000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 'mollie', 29.00, 'EUR', 'paid', (NOW() - INTERVAL '1 month')::date, NULL, 'Monthly subscription payment for Starter plan', 
 '{"payment_method": "directdebit", "mandate_id": "mdt_mollie_freelance_789", "settlement_id": "stl_mollie_settlement_456"}', 
 NOW() - INTERVAL '1 month'),
('30000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '10000000-0000-0000-0000-000000000002', 'stripe', 79.00, 'GBP', 'paid', (NOW() - INTERVAL '1 month')::date, NULL, 'Monthly subscription payment for Professional plan',
 '{"payment_method": "card", "card_brand": "visa", "card_last4": "4242", "receipt_url": "https://pay.stripe.com/receipts/techflow_receipt"}',
 NOW() - INTERVAL '1 month'),
('30000000-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '10000000-0000-0000-0000-000000000003', 'stripe', 199.00, 'USD', 'paid', (NOW() - INTERVAL '1 month')::date, NULL, 'Monthly subscription payment for Enterprise plan',
 '{"payment_method": "card", "card_brand": "amex", "card_last4": "1005", "receipt_url": "https://pay.stripe.com/receipts/global_receipt"}',
 NOW() - INTERVAL '1 month');

-- ====================
-- NOTIFICATIONS
-- ====================

INSERT INTO notifications (id, tenant_id, user_id, type, title, message, data, read_at, created_at, updated_at, expires_at, priority, category) VALUES
('a1111111-1111-1111-1111-111111111141', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'success', 'Invoice Paid', 'Invoice INV-2024-001 has been paid by Local Bakery B.V.', '{"invoice_id": "a1111111-1111-1111-1111-111111111131", "amount": 4235.00}', NULL, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks', NULL, 7, 'billing'),
('a1111111-1111-1111-1111-111111111142', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'info', 'New Project Started', 'Website redesign project has been created for Local Bakery B.V.', '{"project_id": "d1111111-1111-1111-1111-111111111111"}', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months', NULL, 5, 'projects'),
('b2222222-2222-2222-2222-222222222241', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'warning', 'Project Budget Alert', 'Mobile Banking App project has exceeded 70% of allocated budget', '{"project_id": "e2222222-2222-2222-2222-222222222222", "budget_used": 70}', NULL, NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week', NULL, 8, 'projects'),
('b2222222-2222-2222-2222-222222222242', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222223', 'success', 'Migration Completed', 'E-commerce Platform Migration has been successfully completed', '{"project_id": "e2222222-2222-2222-2222-222222222223"}', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months', NULL, 6, 'projects'),
('b2222222-2222-2222-2222-222222222243', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222224', 'info', 'New Team Member', 'Emma Williams has joined the TechFlow Solutions team', '{"user_id": "22222222-2222-2222-2222-222222222224"}', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '8 months', NOW() - INTERVAL '8 months', NULL, 4, 'team'),
('c3333333-3333-3333-3333-333333333351', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'success', 'Major Milestone Reached', 'Digital Transformation Initiative has reached 70% completion', '{"project_id": "f3333333-3333-3333-3333-333333333333", "completion": 70}', NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NULL, 9, 'projects'),
('c3333333-3333-3333-3333-333333333352', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333334', 'info', 'Compliance Review Scheduled', 'Banking compliance platform review meeting scheduled for next week', '{"project_id": "f3333333-3333-3333-3333-333333333335", "meeting_date": "2024-12-20"}', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NULL, 6, 'compliance');

SET row_security = on;