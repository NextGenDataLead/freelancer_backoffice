-- Migration: 040 - Realistic Seed Data for Testing
-- Two tenants with proper role separation and comprehensive test data

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
 true, 2, ARRAY['mollie', 'stripe'], '{"mollie": {"mandate_required": true}, "stripe": {"trial_days": 14}}', NOW(), NOW());

-- ====================
-- TENANTS
-- ====================

INSERT INTO tenants (id, name, subdomain, created_at, updated_at, settings, subscription_status, billing_email, max_users, max_storage_gb) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TechFlow Solutions', 'techflow', NOW() - INTERVAL '6 months', NOW(), 
 '{"timezone": "Europe/Amsterdam", "currency": "EUR", "language": "en"}', 
 'active', 'imre.iddatasolutions@gmail.com', 5, 10),

('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Data Analytics Pro', 'dataanalyticspr', NOW() - INTERVAL '3 months', NOW(),
 '{"timezone": "Europe/Brussels", "currency": "EUR", "language": "en"}',
 'active', 'imre@dappastra.com', 15, 25);

-- ====================
-- PROFILES (Realistic role separation)
-- ====================

INSERT INTO profiles (id, tenant_id, clerk_user_id, email, first_name, last_name, role, created_at, updated_at, last_sign_in_at, is_active, preferences, onboarding_complete, kvk_number, btw_number, business_name, business_type, hourly_rate, address, postal_code, city, country_code, phone, default_payment_terms) VALUES
-- Tenant 1: Owner + Admin
('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_techflow_owner', 'imre.iddatasolutions@gmail.com', 'Imre', 'van der Berg', 'owner', NOW() - INTERVAL '6 months', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', true, '{"theme": "light", "notifications": true}', true, '12345678', 'NL123456789B01', 'TechFlow Solutions BV', 'bv', 85.00, 'Techstraat 123', '1012AB', 'Amsterdam', 'NL', '+31 20 1234567', 30),

('11111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_techflow_admin', 'dekker.i@gmail.com', 'Imre', 'Dekker', 'admin', NOW() - INTERVAL '5 months', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', true, '{"theme": "dark", "notifications": true}', true, NULL, NULL, NULL, NULL, 75.00, NULL, NULL, NULL, NULL, NULL, 30),

-- Tenant 2: Owner only
('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user_dataanalytics_owner', 'imre@dappastra.com', 'Imre', 'Dappastra', 'owner', NOW() - INTERVAL '3 months', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes', true, '{"theme": "dark", "notifications": true, "dashboard_layout": "compact"}', true, '87654321', 'BE987654321', 'Data Analytics Pro BVBA', 'bv', 120.00, 'Analitieklaan 25', '1000', 'Brussels', 'BE', '+32 2 123 4567', 30);

-- ====================
-- EXPENSE CATEGORIES
-- ====================

INSERT INTO expense_categories (id, tenant_id, name, description, expense_type, parent_category_id, is_active, gl_account_code, created_at, updated_at, metadata) VALUES
-- Tenant 1 categories
('a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Travel & Transport', 'Business travel and transportation costs', 'reiskosten', NULL, true, '4121', NOW() - INTERVAL '6 months', NOW() - INTERVAL '6 months', '{}'),
('a1111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Software & IT', 'Software licenses and IT infrastructure', 'software_ict', NULL, true, '4140', NOW() - INTERVAL '6 months', NOW() - INTERVAL '6 months', '{}'),

-- Tenant 2 categories  
('b2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Professional Services', 'Training and professional development', 'professionele_diensten', NULL, true, '4160', NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months', '{}'),
('b2222222-2222-2222-2222-222222222223', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Office Supplies', 'Office materials and supplies', 'kantoorbenodigdheden', NULL, true, '4110', NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months', '{}');

-- ====================
-- CLIENTS (No email conflicts)
-- ====================

INSERT INTO clients (id, tenant_id, created_by, name, company_name, email, phone, address, postal_code, city, country_code, vat_number, is_business, is_supplier, default_payment_terms, notes, created_at, updated_at, invoicing_frequency, auto_invoice_enabled, active, hourly_rate) VALUES
-- Tenant 1 clients (created by owner)
('c1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'NextGen Data Lead', 'NextGen Data Consulting', 'nextgendatalead@gmail.com', '+31 30 9876543', 'Innovatielaan 45', '3512JK', 'Utrecht', 'NL', 'NL987654321', true, false, 30, 'External freelance data consultant - machine learning projects', NOW() - INTERVAL '4 months', NOW() - INTERVAL '1 week', 'monthly', true, true, 85.00),

('c1111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'ID Data Solutions Branch', 'ID Data Solutions Info Dept', 'info.iddatasolutions@gmail.com', '+31 20 6789012', 'Datapark 300', '1016EF', 'Amsterdam', 'NL', 'NL888999000', true, false, 30, 'Internal consulting - different department/branch services', NOW() - INTERVAL '2 months', NOW() - INTERVAL '3 days', 'on_demand', false, true, 90.00),

-- Tenant 2 client (created by owner)
('c2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Master Data Partners', 'Master Data Partners NV', 'imre@masterdatapartners.be', '+32 3 456 7890', 'Datapark 100', '2000', 'Antwerp', 'BE', 'BE123456789', true, false, 45, 'Enterprise data management and consulting services', NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 days', 'monthly', true, true, 120.00);

-- ====================
-- PROJECTS
-- ====================

INSERT INTO projects (id, name, description, client_id, hourly_rate, active, tenant_id, created_by, created_at, updated_at) VALUES
-- Tenant 1 projects
('d1111111-1111-1111-1111-111111111111', 'ML Data Pipeline', 'Machine learning data pipeline development', 'c1111111-1111-1111-1111-111111111111', 85.00, true, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 months', NOW() - INTERVAL '1 week'),
('d1111111-1111-1111-1111-111111111112', 'Analytics Dashboard', 'Business analytics dashboard creation', 'c1111111-1111-1111-1111-111111111112', 90.00, true, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 month', NOW() - INTERVAL '2 days'),
('d1111111-1111-1111-1111-111111111113', 'Legacy Migration', 'Legacy system migration project', 'c1111111-1111-1111-1111-111111111112', 90.00, false, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '5 months', NOW() - INTERVAL '2 months'),

-- Tenant 2 projects
('e2222222-2222-2222-2222-222222222222', 'Master Data Architecture', 'Enterprise master data management architecture', 'c2222222-2222-2222-2222-222222222222', 120.00, true, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '2 months', NOW() - INTERVAL '1 day'),
('e2222222-2222-2222-2222-222222222223', 'Data Quality Framework', 'Data quality and governance framework', 'c2222222-2222-2222-2222-222222222222', 120.00, false, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '4 months', NOW() - INTERVAL '1 month');

-- ====================
-- TIME ENTRIES (Created by both owner and admin in Tenant 1)
-- ====================

INSERT INTO time_entries (id, tenant_id, created_by, client_id, project_name, description, entry_date, hours, hourly_rate, billable, invoiced, invoice_id, created_at, updated_at, project_id, effective_hourly_rate) VALUES
-- Tenant 1 - Owner's time entries
('a1111111-1111-1111-1111-111111111121', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'ML Data Pipeline', 'Data pipeline architecture design', (NOW() - INTERVAL '5 days')::date, 6.0, 85.00, true, false, NULL, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', 'd1111111-1111-1111-1111-111111111111', 85.00),
('a1111111-1111-1111-1111-111111111122', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111112', 'Analytics Dashboard', 'Dashboard wireframe and planning', (NOW() - INTERVAL '3 days')::date, 4.0, 90.00, true, false, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', 'd1111111-1111-1111-1111-111111111112', 90.00),
('a1111111-1111-1111-1111-111111111123', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'ML Data Pipeline', 'Client meeting and requirements gathering', (NOW() - INTERVAL '1 day')::date, 2.0, 85.00, false, false, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 'd1111111-1111-1111-1111-111111111111', 85.00),

-- Tenant 1 - Admin's time entries  
('a1111111-1111-1111-1111-111111111124', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111111', 'ML Data Pipeline', 'Data cleaning and preprocessing implementation', (NOW() - INTERVAL '4 days')::date, 8.0, 75.00, true, false, NULL, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', 'd1111111-1111-1111-1111-111111111111', 75.00),
('a1111111-1111-1111-1111-111111111125', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111112', 'Analytics Dashboard', 'Frontend development and API integration', (NOW() - INTERVAL '2 days')::date, 7.0, 75.00, true, false, NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 'd1111111-1111-1111-1111-111111111112', 75.00),

-- Tenant 2 - Owner's time entries
('b2222222-2222-2222-2222-222222222221', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Master Data Architecture', 'Architecture planning and system design', (NOW() - INTERVAL '3 days')::date, 8.0, 120.00, true, false, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', 'e2222222-2222-2222-2222-222222222222', 120.00),
('b2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Master Data Architecture', 'Data modeling and entity relationships', (NOW() - INTERVAL '1 day')::date, 6.0, 120.00, true, false, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 'e2222222-2222-2222-2222-222222222222', 120.00);

-- ====================
-- INVOICES (Different statuses for testing)
-- ====================

INSERT INTO invoices (id, tenant_id, created_by, client_id, invoice_number, invoice_date, due_date, status, subtotal, vat_amount, total_amount, vat_type, vat_rate, currency, reference, notes, sent_at, paid_at, pdf_url, created_at, updated_at, paid_amount) VALUES
-- Tenant 1 invoices
('inv11111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'TF-2024-001', (NOW() - INTERVAL '1 month')::date, (NOW() - INTERVAL '1 month' + INTERVAL '30 days')::date, 'paid', 1275.00, 267.75, 1542.75, 'standard', 0.21, 'EUR', 'ML Pipeline - Phase 1', 'Machine learning pipeline development - first phase completed', NOW() - INTERVAL '1 month', NOW() - INTERVAL '2 weeks', NULL, NOW() - INTERVAL '1 month', NOW() - INTERVAL '2 weeks', 1542.75),

('inv11111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111112', 'TF-2024-002', (NOW() - INTERVAL '2 weeks')::date, (NOW() + INTERVAL '2 weeks')::date, 'sent', 885.00, 185.85, 1070.85, 'standard', 0.21, 'EUR', 'Analytics Dashboard - Sprint 1', 'Business analytics dashboard - first sprint', NOW() - INTERVAL '2 weeks', NULL, NULL, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks', 0.00),

('inv11111-1111-1111-1111-111111111113', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'TF-2024-003', (NOW() - INTERVAL '1 week')::date, (NOW() + INTERVAL '3 weeks')::date, 'draft', 600.00, 126.00, 726.00, 'standard', 0.21, 'EUR', 'ML Pipeline - Phase 2', 'Machine learning pipeline - second phase (draft)', NULL, NULL, NULL, NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week', 0.00),

-- Tenant 2 invoices
('inv22222-2222-2222-2222-222222222221', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'DAP-2024-001', (NOW() - INTERVAL '2 weeks')::date, (NOW() + INTERVAL '6 weeks')::date, 'sent', 1680.00, 352.80, 2032.80, 'standard', 0.21, 'EUR', 'Master Data Architecture', 'Master data management architecture design', NOW() - INTERVAL '2 weeks', NULL, NULL, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks', 0.00);

-- ====================
-- EXPENSES (Different payment methods and categories)
-- ====================

INSERT INTO expenses (id, tenant_id, title, description, expense_date, amount, currency, category_id, expense_type, payment_method, status, current_approval_step, submitted_by, submitted_at, project_code, vendor_name, requires_reimbursement, is_recurring, is_billable, client_id, created_at, updated_at, metadata, vat_rate, vat_amount) VALUES
-- Tenant 1 expenses
('exp11111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Client meeting travel', 'Train tickets to Utrecht for client meeting', (NOW() - INTERVAL '1 week')::date, 45.50, 'EUR', 'a1111111-1111-1111-1111-111111111111', 'reiskosten', 'personal_card', 'approved', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 week', 'ML-PIPELINE', 'NS Dutch Railways', true, false, true, 'c1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week', '{}', 0.21, 9.56),

('exp11111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Development tools subscription', 'Monthly JetBrains All Products Pack', (NOW() - INTERVAL '1 month')::date, 24.90, 'EUR', 'a1111111-1111-1111-1111-111111111112', 'software_ict', 'corporate_card', 'approved', 0, '11111111-1111-1111-1111-111111111112', NOW() - INTERVAL '1 month', 'DEV-TOOLS', 'JetBrains', true, true, false, NULL, NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 week', '{}', 0.21, 5.23),

-- Tenant 2 expenses  
('exp22222-2222-2222-2222-222222222221', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Data governance training', 'Professional certification course', (NOW() - INTERVAL '2 weeks')::date, 899.00, 'EUR', 'b2222222-2222-2222-2222-222222222222', 'professionele_diensten', 'bank_transfer', 'approved', 0, '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '2 weeks', 'TRAINING', 'Data Governance Institute', false, false, false, NULL, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks', '{}', 0.21, 188.79),

('exp22222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Office supplies order', 'Printer paper and stationery supplies', (NOW() - INTERVAL '3 days')::date, 67.50, 'EUR', 'b2222222-2222-2222-2222-222222222223', 'kantoorbenodigdheden', 'personal_card', 'approved', 0, '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '3 days', 'OFFICE', 'Office Depot', true, false, false, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', '{}', 0.21, 14.18);

-- ====================
-- TENANT SUBSCRIPTIONS
-- ====================

INSERT INTO tenant_platform_subscriptions (id, tenant_id, plan_id, payment_provider, status, current_period_start, current_period_end, trial_start, trial_end, canceled_at, cancel_at_period_end, provider_data, created_at, updated_at) VALUES
('sub11111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'mollie', 'active', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', NULL, NULL, NULL, false, 
 '{"subscription_id": "sub_mollie_techflow_123", "customer_id": "cst_mollie_techflow_456", "mandate_id": "mdt_mollie_techflow_789"}', 
 NOW() - INTERVAL '6 months', NOW() - INTERVAL '15 days'),

('sub22222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'stripe', 'active', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', NULL, NULL, NULL, false,
 '{"subscription_id": "sub_stripe_dataanalytics_abc123", "customer_id": "cus_stripe_dataanalytics_def456", "payment_method_id": "pm_stripe_dataanalytics_ghi789"}',
 NOW() - INTERVAL '3 months', NOW() - INTERVAL '10 days');

-- ====================
-- SUBSCRIPTION USAGE
-- ====================

INSERT INTO subscription_usage (id, tenant_id, subscription_id, period_start, period_end, api_calls, storage_used_gb, active_users, file_uploads, clients_count, time_entries_count, invoices_sent, projects_count, created_at, updated_at) VALUES
('usage111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'sub11111-1111-1111-1111-111111111111', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', 2150, 3.2, 2, 28, 2, 5, 2, 3, NOW() - INTERVAL '15 days', NOW()),
('usage222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'sub22222-2222-2222-2222-222222222222', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', 8450, 12.8, 1, 76, 1, 2, 1, 2, NOW() - INTERVAL '10 days', NOW());

-- ====================
-- PLATFORM SUBSCRIPTION PAYMENTS
-- ====================

INSERT INTO platform_subscription_payments (id, tenant_id, subscription_id, payment_provider, amount, currency, status, payment_date, failure_reason, description, provider_data, created_at) VALUES
('pay11111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'sub11111-1111-1111-1111-111111111111', 'mollie', 29.00, 'EUR', 'paid', (NOW() - INTERVAL '1 month')::date, NULL, 'Monthly subscription payment for Starter plan', 
 '{"payment_method": "directdebit", "mandate_id": "mdt_mollie_techflow_789", "settlement_id": "stl_mollie_settlement_456"}', 
 NOW() - INTERVAL '1 month'),

('pay22222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'sub22222-2222-2222-2222-222222222222', 'stripe', 79.00, 'EUR', 'paid', (NOW() - INTERVAL '1 month')::date, NULL, 'Monthly subscription payment for Professional plan',
 '{"payment_method": "card", "card_brand": "visa", "card_last4": "4242", "receipt_url": "https://pay.stripe.com/receipts/dataanalytics_receipt"}',
 NOW() - INTERVAL '1 month');

-- ====================
-- NOTIFICATIONS
-- ====================

INSERT INTO notifications (id, tenant_id, user_id, type, title, message, data, read_at, created_at, updated_at, expires_at, priority, category) VALUES
-- Tenant 1 notifications
('not11111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'success', 'Invoice Paid', 'Invoice TF-2024-001 has been paid by NextGen Data Lead', '{"invoice_id": "inv11111-1111-1111-1111-111111111111", "amount": 1542.75}', NULL, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks', NULL, 7, 'billing'),

('not11111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111112', 'info', 'New Project Created', 'Analytics Dashboard project has been created', '{"project_id": "d1111111-1111-1111-1111-111111111112"}', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month', NULL, 5, 'projects'),

-- Tenant 2 notifications
('not22222-2222-2222-2222-222222222221', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'warning', 'Invoice Overdue Soon', 'Invoice DAP-2024-001 is due in 7 days', '{"invoice_id": "inv22222-2222-2222-2222-222222222221", "days_until_due": 7}', NULL, NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week', NULL, 8, 'billing'),

('not22222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'success', 'Expense Approved', 'Training expense has been approved for reimbursement', '{"expense_id": "exp22222-2222-2222-2222-222222222221", "amount": 899.00}', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks', NULL, 6, 'expenses');

SET row_security = on;