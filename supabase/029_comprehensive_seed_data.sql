-- Migration: 029 - Comprehensive Seed Data
-- Clears all existing data and populates with realistic test data for development and testing
-- Created: 2025-01-10
-- Purpose: Complete database reset with multi-tenant, multi-provider subscription test data

-- ====================
-- SAFETY SETTINGS
-- ====================
SET session_replication_role = replica;
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- ====================
-- DATA CLEANUP PHASE
-- Clear all tables in proper dependency order
-- ====================

BEGIN;

-- Disable triggers temporarily for faster cleanup
SET session_replication_role = replica;

-- Clear all dependent tables first (following foreign key dependencies)
TRUNCATE TABLE 
  notification_events,
  expense_vat_calculation,
  expense_report_items,
  expense_receipts,
  expense_approvals,
  corporate_card_transactions,
  invoice_btw_classification,
  invoice_payments,
  invoice_items,
  kilometer_entries,
  time_entries,
  icp_declarations,
  international_trade_transactions,
  quarterly_btw_forms,
  transaction_log,
  vat_corrections,
  btw_form_calculation,
  financial_reports,
  platform_subscription_payments,
  subscription_usage,
  tenant_platform_subscriptions,
  expenses,
  expense_reports,
  invoices,
  projects,
  clients,
  documents,
  organization_memberships,
  organizations,
  notifications,
  password_reset_tokens,
  deletion_requests,
  gdpr_audit_logs,
  profiles,
  expense_policies,
  expense_categories,
  approval_workflows,
  invoice_template_config,
  vat_rates,
  vat_rate_rules,
  icp_btw_validation,
  client_invoicing_summary,
  client_project_stats,
  expenses_requiring_review,
  platform_subscription_plans,
  tenants
RESTART IDENTITY CASCADE;

-- Re-enable triggers
SET session_replication_role = default;

-- ====================
-- SEED DATA POPULATION
-- ====================

-- 1. PLATFORM SUBSCRIPTION PLANS
-- Create multi-provider subscription plans
INSERT INTO platform_subscription_plans (id, name, description, price, billing_interval, features, limits, is_active, sort_order, supported_providers, provider_configs) VALUES
-- Starter Plan - Mollie only
('11111111-1111-1111-1111-111111111111', 'Starter', 'Perfect for freelancers and small teams getting started with financial management', 29.00, 'monthly', 
 '{"max_clients": 25, "api_calls": 5000, "support_level": "email", "features": ["time_tracking", "basic_invoicing", "expense_management", "basic_reporting"]}',
 '{"storage_gb": 5, "users": 3, "projects": 10, "integrations": 1}', 
 true, 1, ARRAY['mollie'], 
 '{"mollie": {"product_id": "starter_monthly"}, "stripe": {"price_id": "price_starter_monthly"}}'),

-- Professional Plan - Both providers  
('22222222-2222-2222-2222-222222222222', 'Professional', 'Ideal for growing businesses and established teams', 79.00, 'monthly',
 '{"max_clients": 100, "api_calls": 25000, "support_level": "priority", "features": ["time_tracking", "advanced_invoicing", "expense_management", "financial_reporting", "client_portal", "team_collaboration"]}',
 '{"storage_gb": 25, "users": 10, "projects": 50, "integrations": 5}',
 true, 2, ARRAY['mollie', 'stripe'],
 '{"mollie": {"product_id": "professional_monthly"}, "stripe": {"price_id": "price_professional_monthly"}}'),

-- Enterprise Plan - Both providers
('33333333-3333-3333-3333-333333333333', 'Enterprise', 'Full-featured solution for large organizations', 199.00, 'monthly',
 '{"max_clients": -1, "api_calls": 100000, "support_level": "dedicated", "features": ["time_tracking", "advanced_invoicing", "expense_management", "financial_reporting", "client_portal", "team_collaboration", "api_access", "custom_integrations", "sso", "white_label"]}',
 '{"storage_gb": 100, "users": -1, "projects": -1, "integrations": -1}',
 true, 3, ARRAY['mollie', 'stripe'],
 '{"mollie": {"product_id": "enterprise_monthly"}, "stripe": {"price_id": "price_enterprise_monthly"}}');

-- 2. TENANTS (Organizations)
-- Create 3 different tenant types representing different business scales
INSERT INTO tenants (id, name, subdomain, settings, subscription_status, billing_email, max_users, max_storage_gb, created_at) VALUES
-- Startup/Freelancer Tenant
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme Consulting', 'acme-consulting', 
 '{"currency": "EUR", "timezone": "Europe/Amsterdam", "language": "nl", "fiscal_year_start": "01-01", "vat_number": "NL123456789B01"}',
 'active', 'nextgendatalead@gmail.com', 10, 25, NOW() - INTERVAL '6 months'),

-- SME Tenant  
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'TechStart BV', 'techstart-bv',
 '{"currency": "EUR", "timezone": "Europe/Amsterdam", "language": "en", "fiscal_year_start": "01-01", "vat_number": "NL987654321B01"}', 
 'active', 'dekker.i@gmail.com', 50, 100, NOW() - INTERVAL '4 months'),

-- Enterprise Tenant
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'GlobalCorp International', 'globalcorp',
 '{"currency": "EUR", "timezone": "Europe/Amsterdam", "language": "en", "fiscal_year_start": "01-01", "vat_number": "NL456789123B01", "multi_currency": true}',
 'active', 'imre.iddatasolutions@gmail.com', 200, 500, NOW() - INTERVAL '2 years');

-- 3. PROFILES (Users)
-- Create users across different tenants and roles
INSERT INTO profiles (id, tenant_id, clerk_user_id, email, first_name, last_name, role, created_at, last_sign_in_at, is_active, onboarding_complete, business_name, business_type, kvk_number, btw_number, hourly_rate, country_code) VALUES
-- Acme Consulting Users
('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_acme_owner', 'owner@acme-consulting.nl', 'Jan', 'de Vries', 'owner', NOW() - INTERVAL '6 months', NOW() - INTERVAL '1 hour', true, true, 'Acme Consulting', 'sole_trader', '12345678', 'NL123456789B01', 85.00, 'NL'),
('10000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_acme_admin', 'admin@acme-consulting.nl', 'Maria', 'Jansen', 'admin', NOW() - INTERVAL '5 months', NOW() - INTERVAL '2 hours', true, true, NULL, 'employee', NULL, NULL, 65.00, 'NL'),
('10000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_acme_member', 'freelancer@acme-consulting.nl', 'Ahmed', 'Hassan', 'member', NOW() - INTERVAL '4 months', NOW() - INTERVAL '30 minutes', true, true, NULL, 'contractor', NULL, NULL, 75.00, 'NL'),

-- TechStart BV Users
('20000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user_techstart_owner', 'ceo@techstart.nl', 'Emma', 'van der Berg', 'owner', NOW() - INTERVAL '4 months', NOW() - INTERVAL '45 minutes', true, true, 'TechStart BV', 'bv', '87654321', 'NL987654321B01', 95.00, 'NL'),
('20000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user_techstart_admin', 'cfo@techstart.nl', 'Lars', 'Nielsen', 'admin', NOW() - INTERVAL '3 months', NOW() - INTERVAL '2 hours', true, true, NULL, 'employee', NULL, NULL, 80.00, 'NL'),
('20000000-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user_techstart_dev1', 'dev1@techstart.nl', 'Sofia', 'Rodriguez', 'member', NOW() - INTERVAL '3 months', NOW() - INTERVAL '1 hour', true, true, NULL, 'employee', NULL, NULL, 70.00, 'NL'),
('20000000-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user_techstart_dev2', 'dev2@techstart.nl', 'Chen', 'Wei', 'member', NOW() - INTERVAL '2 months', NOW() - INTERVAL '3 hours', true, true, NULL, 'contractor', NULL, NULL, 75.00, 'NL'),

-- GlobalCorp Users
('30000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'user_global_owner', 'ceo@globalcorp.com', 'Michael', 'Thompson', 'owner', NOW() - INTERVAL '2 years', NOW() - INTERVAL '20 minutes', true, true, 'GlobalCorp International', 'nv', '45678912', 'NL456789123B01', 125.00, 'NL'),
('30000000-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'user_global_admin', 'finance@globalcorp.com', 'Isabella', 'García', 'admin', NOW() - INTERVAL '18 months', NOW() - INTERVAL '1 hour', true, true, NULL, 'employee', NULL, NULL, 90.00, 'NL');

-- 4. TENANT PLATFORM SUBSCRIPTIONS
-- Link tenants to subscription plans with different providers
INSERT INTO tenant_platform_subscriptions (id, tenant_id, plan_id, payment_provider, status, current_period_start, current_period_end, trial_start, trial_end, provider_data, created_at) VALUES
-- Acme Consulting - Starter Plan with Mollie (cost-optimized for EU)
('sub00000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'mollie', 'active', 
 DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') - INTERVAL '1 day',
 NULL, NULL,
 '{"subscription_id": "sub_mollie_acme_001", "customer_id": "cst_mollie_acme", "mandate_id": "mdt_mollie_acme"}',
 NOW() - INTERVAL '5 months'),

-- TechStart BV - Professional Plan with Mollie (trialing Stripe features)
('sub00000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'mollie', 'active',
 DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') - INTERVAL '1 day', 
 NULL, NULL,
 '{"subscription_id": "sub_mollie_techstart_001", "customer_id": "cst_mollie_techstart", "mandate_id": "mdt_mollie_techstart"}',
 NOW() - INTERVAL '3 months'),

-- GlobalCorp - Enterprise Plan with Stripe (global features needed)
('sub00000-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'stripe', 'active',
 DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') - INTERVAL '1 day',
 NULL, NULL,
 '{"subscription_id": "sub_stripe_globalcorp_001", "customer_id": "cus_stripe_globalcorp", "payment_method": "pm_stripe_globalcorp"}',
 NOW() - INTERVAL '18 months');

-- 5. SUBSCRIPTION USAGE TRACKING
-- Generate usage data for current and previous periods
INSERT INTO subscription_usage (tenant_id, subscription_id, period_start, period_end, api_calls, storage_used_gb, active_users, file_uploads, clients_count, time_entries_count, invoices_sent, projects_count) VALUES
-- Current month usage
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'sub00000-0000-0000-0000-000000000001', DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') - INTERVAL '1 day', 2400, 3.2, 3, 45, 8, 67, 12, 5),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'sub00000-0000-0000-0000-000000000002', DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') - INTERVAL '1 day', 15600, 18.7, 4, 123, 23, 189, 28, 12),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'sub00000-0000-0000-0000-000000000003', DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') - INTERVAL '1 day', 67800, 89.4, 2, 567, 45, 423, 67, 28),

-- Previous month usage
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'sub00000-0000-0000-0000-000000000001', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month'), DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day', 1890, 2.8, 3, 38, 7, 54, 9, 4),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'sub00000-0000-0000-0000-000000000002', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month'), DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day', 12300, 16.2, 4, 98, 21, 156, 23, 11),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'sub00000-0000-0000-0000-000000000003', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month'), DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day', 58900, 82.1, 2, 445, 42, 378, 58, 25);

-- 6. EXPENSE CATEGORIES (Required for expenses)
-- Create basic expense categories for all tenants
INSERT INTO expense_categories (id, tenant_id, name, description, category_type, deduction_percentage, btw_category) VALUES
-- Acme Consulting Categories
('cat00000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Office Supplies', 'Kantoorbenodigdheden', 'overige_zakelijk', 100, 'standard'),
('cat00000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Travel & Transport', 'Reis- en transportkosten', 'transport', 100, 'standard'),
('cat00000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Professional Services', 'Professionele diensten', 'overige_zakelijk', 100, 'standard'),

-- TechStart BV Categories  
('cat00000-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Software & Tools', 'Software en tools', 'overige_zakelijk', 100, 'standard'),
('cat00000-0000-0000-0000-000000000005', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Marketing & Advertising', 'Marketing en advertenties', 'marketing', 100, 'standard'),
('cat00000-0000-0000-0000-000000000006', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Equipment', 'Apparatuur', 'equipment', 100, 'standard'),

-- GlobalCorp Categories
('cat00000-0000-0000-0000-000000000007', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'IT Services', 'IT-diensten', 'overige_zakelijk', 100, 'standard'),
('cat00000-0000-0000-0000-000000000008', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Legal & Compliance', 'Juridisch en compliance', 'overige_zakelijk', 100, 'standard'),
('cat00000-0000-0000-0000-000000000009', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Training & Education', 'Training en onderwijs', 'overige_zakelijk', 100, 'standard');

-- 7. CLIENTS
-- Create diverse clients across different industries and sizes
INSERT INTO clients (id, tenant_id, created_by, name, company_name, email, phone, address, postal_code, city, country_code, vat_number, is_business, hourly_rate, active, created_at) VALUES
-- Acme Consulting Clients (Starter Plan - up to 25 clients)
('cli00000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 'Local Restaurant Chain', 'Restaurant De Gouden Lepel BV', 'info@goudenleper.nl', '+31 20 123 4567', 'Hoofdstraat 123', '1012 AB', 'Amsterdam', 'NL', 'NL801234567B01', true, 85.00, true, NOW() - INTERVAL '5 months'),
('cli00000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 'Boutique Shop Owner', 'Boutique Clara', 'clara@boutiqueclara.nl', '+31 20 234 5678', 'Prinsengracht 456', '1016 CD', 'Amsterdam', 'NL', 'NL812345678B01', true, 75.00, true, NOW() - INTERVAL '4 months'),
('cli00000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000002', 'Freelance Photographer', 'Photo Studio Lens', 'contact@photolens.nl', '+31 20 345 6789', 'Vondelstraat 789', '1054 EF', 'Amsterdam', 'NL', NULL, false, 95.00, true, NOW() - INTERVAL '3 months'),
('cli00000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 'Online Retailer', 'E-commerce Solutions NL', 'support@ecommerce-nl.com', '+31 30 456 7890', 'Utrechtseweg 101', '3702 AA', 'Zeist', 'NL', 'NL823456789B01', true, 80.00, true, NOW() - INTERVAL '2 months'),
('cli00000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000003', 'Healthcare Practice', 'Tandartspraktijk Centrum', 'info@tandarts-centrum.nl', '+31 10 567 8901', 'Coolsingel 234', '3012 BC', 'Rotterdam', 'NL', 'NL834567890B01', true, 90.00, true, NOW() - INTERVAL '6 weeks'),
('cli00000-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000002', 'Construction Company', 'Bouwbedrijf van Dijk', 'info@bouwbedrijf-vandijk.nl', '+31 40 678 9012', 'Industrieweg 567', '5612 CD', 'Eindhoven', 'NL', 'NL845678901B01', true, 70.00, true, NOW() - INTERVAL '1 month'),
('cli00000-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 'Marketing Agency', 'Creative Minds Agency', 'hello@creativeminds.nl', '+31 70 789 0123', 'Lange Voorhout 890', '2514 EF', 'Den Haag', 'NL', 'NL856789012B01', true, 85.00, true, NOW() - INTERVAL '3 weeks'),
('cli00000-0000-0000-0000-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000003', 'Personal Client', 'Jan Pietersen', NULL, 'j.pietersen@email.com', '+31 6 1234 5678', 'Dorpsstraat 12', '1234 AB', 'Dorp', 'NL', NULL, false, 65.00, true, NOW() - INTERVAL '2 weeks'),

-- TechStart BV Clients (Professional Plan - up to 100 clients, more sophisticated)
('cli00001-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000001', 'FinTech Startup', 'PayFast Technologies BV', 'tech@payfast.com', '+31 20 111 2222', 'Science Park 904', '1098 XH', 'Amsterdam', 'NL', 'NL901234567B01', true, 120.00, true, NOW() - INTERVAL '3 months'),
('cli00001-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000002', 'E-learning Platform', 'LearnTech Solutions', 'contact@learntech.eu', '+31 30 222 3333', 'Papendorpseweg 100', '3528 BJ', 'Utrecht', 'NL', 'NL912345678B01', true, 100.00, true, NOW() - INTERVAL '2 months'),
('cli00001-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000003', 'SaaS Platform', 'CloudSync Enterprise', 'dev@cloudsync.com', '+31 40 333 4444', 'High Tech Campus 1', '5656 AE', 'Eindhoven', 'NL', 'NL923456789B01', true, 110.00, true, NOW() - INTERVAL '6 weeks'),
('cli00001-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000004', 'IoT Solutions', 'SmartCity IoT BV', 'info@smartcity-iot.nl', '+31 50 444 5555', 'Zernike Campus 42', '9747 AN', 'Groningen', 'NL', 'NL934567890B01', true, 95.00, true, NOW() - INTERVAL '1 month'),
('cli00001-0000-0000-0000-000000000005', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000001', 'AI Research Lab', 'Neural Networks Institute', 'research@neural-networks.org', '+31 15 555 6666', 'Mekelweg 4', '2628 CD', 'Delft', 'NL', 'NL945678901B01', true, 130.00, true, NOW() - INTERVAL '3 weeks'),
('cli00001-0000-0000-0000-000000000006', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000002', 'Green Energy Startup', 'SolarWind Innovations', 'green@solarwind.nl', '+31 13 666 7777', 'Strijp-S 32', '5611 ZX', 'Eindhoven', 'NL', 'NL956789012B01', true, 105.00, true, NOW() - INTERVAL '2 weeks'),
('cli00001-0000-0000-0000-000000000007', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000003', 'Blockchain Company', 'ChainLink Solutions', 'blockchain@chainlink.tech', '+31 20 777 8888', 'Zuidas Plaza 1', '1077 XX', 'Amsterdam', 'NL', 'NL967890123B01', true, 140.00, true, NOW() - INTERVAL '1 week'),
('cli00001-0000-0000-0000-000000000008', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000004', 'VR/AR Development', 'Immersive Experiences BV', 'vr@immersive.nl', '+31 24 888 9999', 'Toernooiveld 300', '6525 EC', 'Nijmegen', 'NL', 'NL978901234B01', true, 115.00, true, NOW() - INTERVAL '5 days'),
('cli00001-0000-0000-0000-000000000009', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000001', 'Cybersecurity Firm', 'SecureNet Defense', 'security@securenet.nl', '+31 26 999 0000', 'Cyberstraat 18', '6826 CC', 'Arnhem', 'NL', 'NL989012345B01', true, 125.00, true, NOW() - INTERVAL '3 days'),
('cli00001-0000-0000-0000-000000000010', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000002', 'HealthTech Platform', 'MediConnect Digital', 'health@mediconnect.eu', '+31 76 000 1111', 'BioPartner Center 5', '2333 BE', 'Leiden', 'NL', 'NL990123456B01', true, 108.00, true, NOW() - INTERVAL '1 day'),
('cli00001-0000-0000-0000-000000000011', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000003', 'Data Analytics', 'BigData Insights BV', 'analytics@bigdata-insights.com', '+31 35 111 2222', 'DataLaan 25', '1234 DS', 'Hilversum', 'NL', 'NL901234567B02', true, 98.00, true, NOW() - INTERVAL '12 hours'),
('cli00001-0000-0000-0000-000000000012', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000004', 'Mobile App Agency', 'AppCraft Studios', 'mobile@appcraft.nl', '+31 23 222 3333', 'Innovatieweg 7', '2031 AB', 'Haarlem', 'NL', 'NL912345678B02', true, 92.00, true, NOW() - INTERVAL '6 hours'),
('cli00001-0000-0000-0000-000000000013', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000001', 'Cloud Infrastructure', 'HyperCloud Services', 'cloud@hypercloud.tech', '+31 71 333 4444', 'CloudCenter 88', '2333 ZG', 'Leiden', 'NL', 'NL923456789B02', true, 118.00, true, NOW() - INTERVAL '3 hours'),

-- GlobalCorp International Clients (Enterprise Plan - unlimited clients, global scope)
('cli00002-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', 'Fortune 500 Tech', 'Microsoft Netherlands BV', 'enterprise@microsoft.nl', '+31 20 5505000', 'Evert van de Beekstraat 1-104', '1118 CL', 'Schiphol', 'NL', 'NL004394061B04', true, 150.00, true, NOW() - INTERVAL '18 months'),
('cli00002-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000002', 'Global Banking', 'ING Bank N.V.', 'corporate@ing.nl', '+31 20 5639111', 'Bijlmerplein 888', '1102 MG', 'Amsterdam', 'NL', 'NL000334259B01', true, 160.00, true, NOW() - INTERVAL '15 months'),
('cli00002-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', 'International Retailer', 'H&M Hennes & Mauritz', 'nl-corporate@hm.com', '+31 20 3060000', 'Rokin 126', '1012 LA', 'Amsterdam', 'NL', 'NL009291901B01', true, 140.00, true, NOW() - INTERVAL '12 months'),
('cli00002-0000-0000-0000-000000000004', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000002', 'Logistics Giant', 'DHL Express Netherlands', 'enterprise@dhl.nl', '+31 88 3455555', 'Stationsplein 4', '3013 AK', 'Rotterdam', 'NL', 'NL001709043B01', true, 135.00, true, NOW() - INTERVAL '10 months'),
('cli00002-0000-0000-0000-000000000005', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', 'Energy Multinational', 'Shell Nederland BV', 'corporate-nl@shell.com', '+31 70 3773377', 'Carel van Bylandtlaan 16', '2596 HR', 'Den Haag', 'NL', 'NL002241440B01', true, 165.00, true, NOW() - INTERVAL '24 months'),
('cli00002-0000-0000-0000-000000000006', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000002', 'Telecom Leader', 'KPN B.V.', 'business@kpn.com', '+31 70 3434343', 'Maanplein 55', '2516 CK', 'Den Haag', 'NL', 'NL000012607B01', true, 145.00, true, NOW() - INTERVAL '20 months'),
('cli00002-0000-0000-0000-000000000007', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', 'European Airlines', 'KLM Royal Dutch Airlines', 'corporate@klm.nl', '+31 20 6494787', 'Amsterdamseweg 55', '1182 GP', 'Amstelveen', 'NL', 'NL000000727B01', true, 155.00, true, NOW() - INTERVAL '18 months'),
('cli00002-0000-0000-0000-000000000008', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000002', 'Media Conglomerate', 'RTL Nederland BV', 'corporate@rtl.nl', '+31 35 6719911', 'Lange Voorhout 15', '1213 RC', 'Hilversum', 'NL', 'NL009289382B01', true, 130.00, true, NOW() - INTERVAL '16 months'),
('cli00002-0000-0000-0000-000000000009', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', 'Insurance Giant', 'Aegon N.V.', 'corporate@aegon.nl', '+31 70 3444444', 'Aegonplein 50', '2591 TV', 'Den Haag', 'NL', 'NL000011896B63', true, 148.00, true, NOW() - INTERVAL '14 months'),
('cli00002-0000-0000-0000-000000000010', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000002', 'Global Consulting', 'Deloitte Consulting', 'corporate@deloitte.nl', '+31 88 2882888', 'Gustav Mahlerlaan 2970', '1081 LA', 'Amsterdam', 'NL', 'NL003350025B01', true, 175.00, true, NOW() - INTERVAL '22 months'),
('cli00002-0000-0000-0000-000000000011', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', 'Pharmaceutical', 'Johnson & Johnson', 'enterprise@jnj.nl', '+31 76 7118111', 'Anklaarseweg 161', '4904 VL', 'Oosterhout', 'NL', 'NL005635988B02', true, 170.00, true, NOW() - INTERVAL '12 months'),
('cli00002-0000-0000-0000-000000000012', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000002', 'Tech Hardware', 'ASML Netherlands', 'corporate@asml.com', '+31 40 2683000', 'De Run 6501', '5504 DR', 'Veldhoven', 'NL', 'NL000334359B01', true, 180.00, true, NOW() - INTERVAL '8 months');

-- 8. PROJECTS  
-- Create projects linked to clients with different complexity levels
INSERT INTO projects (id, name, description, client_id, hourly_rate, active, tenant_id, created_by, created_at) VALUES
-- Acme Consulting Projects
('prj00000-0000-0000-0000-000000000001', 'Website Redesign', 'Complete redesign of restaurant website with online ordering system', 'cli00000-0000-0000-0000-000000000001', 85.00, true, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', NOW() - INTERVAL '4 months'),
('prj00000-0000-0000-0000-000000000002', 'E-commerce Setup', 'Setup and configuration of online store with payment integration', 'cli00000-0000-0000-0000-000000000002', 75.00, true, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000002', NOW() - INTERVAL '3 months'),
('prj00000-0000-0000-0000-000000000003', 'Brand Photography', 'Product photography for online portfolio and marketing', 'cli00000-0000-0000-0000-000000000003', 95.00, true, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '2 months'),
('prj00000-0000-0000-0000-000000000004', 'SEO Optimization', 'Search engine optimization and digital marketing strategy', 'cli00000-0000-0000-0000-000000000004', 80.00, true, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', NOW() - INTERVAL '6 weeks'),
('prj00000-0000-0000-0000-000000000005', 'Practice Management System', 'Digital appointment and patient management system', 'cli00000-0000-0000-0000-000000000005', 90.00, true, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000002', NOW() - INTERVAL '1 month'),

-- TechStart BV Projects
('prj00001-0000-0000-0000-000000000001', 'Mobile Payment App', 'Full-stack development of mobile payment application with blockchain integration', 'cli00001-0000-0000-0000-000000000001', 120.00, true, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '2 months'),
('prj00001-0000-0000-0000-000000000002', 'LMS Platform Enhancement', 'Advanced features for learning management system including AI tutoring', 'cli00001-0000-0000-0000-000000000002', 100.00, true, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000002', NOW() - INTERVAL '6 weeks'),
('prj00001-0000-0000-0000-000000000003', 'Cloud Migration', 'Migration of legacy systems to cloud infrastructure with DevOps setup', 'cli00001-0000-0000-0000-000000000003', 110.00, true, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000003', NOW() - INTERVAL '1 month'),
('prj00001-0000-0000-0000-000000000004', 'IoT Dashboard', 'Real-time monitoring dashboard for smart city IoT sensors', 'cli00001-0000-0000-0000-000000000004', 95.00, true, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000004', NOW() - INTERVAL '3 weeks'),
('prj00001-0000-0000-0000-000000000005', 'AI Model Training', 'Custom machine learning models for neural network research', 'cli00001-0000-0000-0000-000000000005', 130.00, true, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '2 weeks'),
('prj00001-0000-0000-0000-000000000006', 'Blockchain Smart Contracts', 'Development of DeFi smart contracts and security auditing', 'cli00001-0000-0000-0000-000000000007', 140.00, true, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000003', NOW() - INTERVAL '1 week'),
('prj00001-0000-0000-0000-000000000007', 'VR Training Platform', 'Virtual reality training modules for enterprise clients', 'cli00001-0000-0000-0000-000000000008', 115.00, true, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000004', NOW() - INTERVAL '5 days'),
('prj00001-0000-0000-0000-000000000008', 'Cybersecurity Audit', 'Comprehensive security assessment and penetration testing', 'cli00001-0000-0000-0000-000000000009', 125.00, true, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '3 days'),
('prj00001-0000-0000-0000-000000000009', 'HealthTech API', 'FHIR-compliant API development for healthcare data integration', 'cli00001-0000-0000-0000-000000000010', 108.00, true, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000002', NOW() - INTERVAL '1 day'),
('prj00001-0000-0000-0000-000000000010', 'Data Warehouse', 'Big data analytics pipeline with real-time processing', 'cli00001-0000-0000-0000-000000000011', 98.00, true, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000003', NOW() - INTERVAL '12 hours'),
('prj00001-0000-0000-0000-000000000011', 'Mobile App Modernization', 'React Native app development with cross-platform compatibility', 'cli00001-0000-0000-0000-000000000012', 92.00, true, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000004', NOW() - INTERVAL '6 hours'),
('prj00001-0000-0000-0000-000000000012', 'Cloud Infrastructure Optimization', 'Kubernetes deployment and cost optimization strategies', 'cli00001-0000-0000-0000-000000000013', 118.00, true, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '3 hours'),

-- GlobalCorp Projects
('prj00002-0000-0000-0000-000000000001', 'Enterprise Digital Transformation', 'Global digital transformation initiative for Microsoft Netherlands', 'cli00002-0000-0000-0000-000000000001', 150.00, true, 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', NOW() - INTERVAL '15 months'),
('prj00002-0000-0000-0000-000000000002', 'Banking API Integration', 'Open banking API development and regulatory compliance', 'cli00002-0000-0000-0000-000000000002', 160.00, true, 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000002', NOW() - INTERVAL '12 months'),
('prj00002-0000-0000-0000-000000000003', 'Global E-commerce Platform', 'Multi-region e-commerce platform with advanced personalization', 'cli00002-0000-0000-0000-000000000003', 140.00, true, 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', NOW() - INTERVAL '10 months'),
('prj00002-0000-0000-0000-000000000004', 'Supply Chain Optimization', 'AI-driven logistics optimization and tracking system', 'cli00002-0000-0000-0000-000000000004', 135.00, true, 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000002', NOW() - INTERVAL '8 months'),
('prj00002-0000-0000-0000-000000000005', 'Energy Trading Platform', 'Real-time energy trading platform with blockchain settlement', 'cli00002-0000-0000-0000-000000000005', 165.00, true, 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', NOW() - INTERVAL '20 months'),
('prj00002-0000-0000-0000-000000000006', '5G Network Management', 'Next-generation network management system for 5G infrastructure', 'cli00002-0000-0000-0000-000000000006', 145.00, true, 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000002', NOW() - INTERVAL '18 months'),
('prj00002-0000-0000-0000-000000000007', 'Airline Operations System', 'Comprehensive flight operations and crew management system', 'cli00002-0000-0000-0000-000000000007', 155.00, true, 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', NOW() - INTERVAL '16 months'),
('prj00002-0000-0000-0000-000000000008', 'Media Streaming Platform', 'High-performance video streaming platform with CDN optimization', 'cli00002-0000-0000-0000-000000000008', 130.00, true, 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000002', NOW() - INTERVAL '14 months'),
('prj00002-0000-0000-0000-000000000009', 'Insurance Claims AI', 'Machine learning system for automated insurance claims processing', 'cli00002-0000-0000-0000-000000000009', 148.00, true, 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', NOW() - INTERVAL '12 months'),
('prj00002-0000-0000-0000-000000000010', 'Global Tax Compliance', 'Multi-jurisdiction tax compliance and reporting system', 'cli00002-0000-0000-0000-000000000010', 175.00, true, 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000002', NOW() - INTERVAL '20 months');

-- 9. TIME ENTRIES
-- Generate realistic time entries with varying patterns
INSERT INTO time_entries (tenant_id, created_by, client_id, project_id, description, entry_date, hours, hourly_rate, billable, created_at) VALUES
-- Recent time entries for all tenants (last 30 days)
-- Acme Consulting - Various patterns
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 'cli00000-0000-0000-0000-000000000001', 'prj00000-0000-0000-0000-000000000001', 'Frontend development for menu integration', CURRENT_DATE - INTERVAL '1 day', 6.5, 85.00, true, NOW() - INTERVAL '1 day'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000002', 'cli00000-0000-0000-0000-000000000002', 'prj00000-0000-0000-0000-000000000002', 'Product catalog setup and configuration', CURRENT_DATE - INTERVAL '2 days', 4.0, 75.00, true, NOW() - INTERVAL '2 days'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000003', 'cli00000-0000-0000-0000-000000000003', 'prj00000-0000-0000-0000-000000000003', 'Portrait session and post-processing', CURRENT_DATE - INTERVAL '3 days', 8.0, 95.00, true, NOW() - INTERVAL '3 days'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 'cli00000-0000-0000-0000-000000000004', 'prj00000-0000-0000-0000-000000000004', 'Keyword research and competitor analysis', CURRENT_DATE - INTERVAL '5 days', 3.5, 80.00, true, NOW() - INTERVAL '5 days'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000002', 'cli00000-0000-0000-0000-000000000005', 'prj00000-0000-0000-0000-000000000005', 'Database design for patient records', CURRENT_DATE - INTERVAL '7 days', 5.5, 90.00, true, NOW() - INTERVAL '7 days'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000003', 'cli00000-0000-0000-0000-000000000001', 'prj00000-0000-0000-0000-000000000001', 'Backend API development for ordering system', CURRENT_DATE - INTERVAL '8 days', 7.0, 85.00, true, NOW() - INTERVAL '8 days'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 'cli00000-0000-0000-0000-000000000002', 'prj00000-0000-0000-0000-000000000002', 'Payment gateway integration testing', CURRENT_DATE - INTERVAL '10 days', 4.5, 75.00, true, NOW() - INTERVAL '10 days'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000002', 'cli00000-0000-0000-0000-000000000006', NULL, 'Project consultation and requirements gathering', CURRENT_DATE - INTERVAL '12 days', 2.0, 70.00, true, NOW() - INTERVAL '12 days'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000003', 'cli00000-0000-0000-0000-000000000007', NULL, 'Creative strategy brainstorming session', CURRENT_DATE - INTERVAL '14 days', 3.0, 85.00, true, NOW() - INTERVAL '14 days'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 'cli00000-0000-0000-0000-000000000008', NULL, 'Personal financial planning consultation', CURRENT_DATE - INTERVAL '16 days', 2.5, 65.00, true, NOW() - INTERVAL '16 days'),

-- TechStart BV - More complex development work
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000001', 'cli00001-0000-0000-0000-000000000001', 'prj00001-0000-0000-0000-000000000001', 'Blockchain integration architecture design', CURRENT_DATE - INTERVAL '1 day', 8.0, 120.00, true, NOW() - INTERVAL '1 day'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000002', 'cli00001-0000-0000-0000-000000000002', 'prj00001-0000-0000-0000-000000000002', 'AI tutoring algorithm implementation', CURRENT_DATE - INTERVAL '2 days', 7.5, 100.00, true, NOW() - INTERVAL '2 days'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000003', 'cli00001-0000-0000-0000-000000000003', 'prj00001-0000-0000-0000-000000000003', 'Kubernetes cluster configuration and monitoring', CURRENT_DATE - INTERVAL '3 days', 6.0, 110.00, true, NOW() - INTERVAL '3 days'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000004', 'cli00001-0000-0000-0000-000000000004', 'prj00001-0000-0000-0000-000000000004', 'IoT sensor data processing pipeline', CURRENT_DATE - INTERVAL '4 days', 5.5, 95.00, true, NOW() - INTERVAL '4 days'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000001', 'cli00001-0000-0000-0000-000000000005', 'prj00001-0000-0000-0000-000000000005', 'Neural network model training and optimization', CURRENT_DATE - INTERVAL '5 days', 9.0, 130.00, true, NOW() - INTERVAL '5 days'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000002', 'cli00001-0000-0000-0000-000000000006', NULL, 'Renewable energy data analysis consultation', CURRENT_DATE - INTERVAL '6 days', 3.0, 105.00, true, NOW() - INTERVAL '6 days'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000003', 'cli00001-0000-0000-0000-000000000007', 'prj00001-0000-0000-0000-000000000006', 'Smart contract security audit and testing', CURRENT_DATE - INTERVAL '8 days', 6.5, 140.00, true, NOW() - INTERVAL '8 days'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000004', 'cli00001-0000-0000-0000-000000000008', 'prj00001-0000-0000-0000-000000000007', 'VR environment development and testing', CURRENT_DATE - INTERVAL '9 days', 7.0, 115.00, true, NOW() - INTERVAL '9 days'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000001', 'cli00001-0000-0000-0000-000000000009', 'prj00001-0000-0000-0000-000000000008', 'Penetration testing and vulnerability assessment', CURRENT_DATE - INTERVAL '10 days', 8.0, 125.00, true, NOW() - INTERVAL '10 days'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000002', 'cli00001-0000-0000-0000-000000000010', 'prj00001-0000-0000-0000-000000000009', 'FHIR API development and healthcare compliance', CURRENT_DATE - INTERVAL '12 days', 6.0, 108.00, true, NOW() - INTERVAL '12 days'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000003', 'cli00001-0000-0000-0000-000000000011', 'prj00001-0000-0000-0000-000000000010', 'Big data ETL pipeline development', CURRENT_DATE - INTERVAL '14 days', 5.0, 98.00, true, NOW() - INTERVAL '14 days'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000004', 'cli00001-0000-0000-0000-000000000012', 'prj00001-0000-0000-0000-000000000011', 'React Native performance optimization', CURRENT_DATE - INTERVAL '15 days', 4.5, 92.00, true, NOW() - INTERVAL '15 days'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000001', 'cli00001-0000-0000-0000-000000000013', 'prj00001-0000-0000-0000-000000000012', 'Cloud cost optimization analysis', CURRENT_DATE - INTERVAL '17 days', 7.5, 118.00, true, NOW() - INTERVAL '17 days'),

-- GlobalCorp - Enterprise-scale projects
('cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', 'cli00002-0000-0000-0000-000000000001', 'prj00002-0000-0000-0000-000000000001', 'Enterprise architecture review and optimization', CURRENT_DATE - INTERVAL '1 day', 8.0, 150.00, true, NOW() - INTERVAL '1 day'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000002', 'cli00002-0000-0000-0000-000000000002', 'prj00002-0000-0000-0000-000000000002', 'Open banking API compliance and security review', CURRENT_DATE - INTERVAL '2 days', 6.5, 160.00, true, NOW() - INTERVAL '2 days'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', 'cli00002-0000-0000-0000-000000000003', 'prj00002-0000-0000-0000-000000000003', 'Global personalization engine architecture', CURRENT_DATE - INTERVAL '3 days', 7.0, 140.00, true, NOW() - INTERVAL '3 days'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000002', 'cli00002-0000-0000-0000-000000000004', 'prj00002-0000-0000-0000-000000000004', 'Supply chain AI model training and validation', CURRENT_DATE - INTERVAL '5 days', 9.0, 135.00, true, NOW() - INTERVAL '5 days'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', 'cli00002-0000-0000-0000-000000000005', 'prj00002-0000-0000-0000-000000000005', 'Blockchain settlement system development', CURRENT_DATE - INTERVAL '6 days', 8.5, 165.00, true, NOW() - INTERVAL '6 days'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000002', 'cli00002-0000-0000-0000-000000000006', 'prj00002-0000-0000-0000-000000000006', '5G network slice management implementation', CURRENT_DATE - INTERVAL '8 days', 7.5, 145.00, true, NOW() - INTERVAL '8 days'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', 'cli00002-0000-0000-0000-000000000007', 'prj00002-0000-0000-0000-000000000007', 'Flight operations optimization algorithms', CURRENT_DATE - INTERVAL '10 days', 6.0, 155.00, true, NOW() - INTERVAL '10 days'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000002', 'cli00002-0000-0000-0000-000000000008', 'prj00002-0000-0000-0000-000000000008', 'CDN optimization and global content delivery', CURRENT_DATE - INTERVAL '12 days', 5.5, 130.00, true, NOW() - INTERVAL '12 days'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', 'cli00002-0000-0000-0000-000000000009', 'prj00002-0000-0000-0000-000000000009', 'ML model deployment and A/B testing framework', CURRENT_DATE - INTERVAL '14 days', 8.0, 148.00, true, NOW() - INTERVAL '14 days'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000002', 'cli00002-0000-0000-0000-000000000010', 'prj00002-0000-0000-0000-000000000010', 'Multi-jurisdiction tax engine development', CURRENT_DATE - INTERVAL '16 days', 7.0, 175.00, true, NOW() - INTERVAL '16 days');

-- Add more historical time entries for better analytics (last 60-90 days)
-- This would continue with more entries for realistic reporting data...

-- 10. INVOICES
-- Create invoices with various statuses and realistic data
INSERT INTO invoices (id, tenant_id, created_by, client_id, invoice_number, invoice_date, due_date, status, subtotal, vat_amount, total_amount, vat_rate, currency, created_at) VALUES
-- Acme Consulting Invoices
('inv00000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 'cli00000-0000-0000-0000-000000000001', 'AC-2024-001', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, 'paid', 2125.00, 446.25, 2571.25, 0.21, 'EUR', NOW() - INTERVAL '30 days'),
('inv00000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000002', 'cli00000-0000-0000-0000-000000000002', 'AC-2024-002', CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE - INTERVAL '25 days' + INTERVAL '30 days', 'paid', 1200.00, 252.00, 1452.00, 0.21, 'EUR', NOW() - INTERVAL '25 days'),
('inv00000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000003', 'cli00000-0000-0000-0000-000000000003', 'AC-2024-003', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '10 days', 'sent', 1520.00, 319.20, 1839.20, 0.21, 'EUR', NOW() - INTERVAL '20 days'),
('inv00000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 'cli00000-0000-0000-0000-000000000004', 'AC-2024-004', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days', 'sent', 840.00, 176.40, 1016.40, 0.21, 'EUR', NOW() - INTERVAL '15 days'),
('inv00000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000002', 'cli00000-0000-0000-0000-000000000005', 'AC-2024-005', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days', 'draft', 1980.00, 415.80, 2395.80, 0.21, 'EUR', NOW() - INTERVAL '10 days'),

-- TechStart BV Invoices (Higher values, more sophisticated)  
('inv00001-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000001', 'cli00001-0000-0000-0000-000000000001', 'TS-2024-001', CURRENT_DATE - INTERVAL '35 days', CURRENT_DATE - INTERVAL '5 days', 'paid', 9600.00, 2016.00, 11616.00, 0.21, 'EUR', NOW() - INTERVAL '35 days'),
('inv00001-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000002', 'cli00001-0000-0000-0000-000000000002', 'TS-2024-002', CURRENT_DATE - INTERVAL '28 days', CURRENT_DATE - INTERVAL '28 days' + INTERVAL '30 days', 'paid', 7500.00, 1575.00, 9075.00, 0.21, 'EUR', NOW() - INTERVAL '28 days'),
('inv00001-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000003', 'cli00001-0000-0000-0000-000000000003', 'TS-2024-003', CURRENT_DATE - INTERVAL '22 days', CURRENT_DATE + INTERVAL '8 days', 'sent', 6600.00, 1386.00, 7986.00, 0.21, 'EUR', NOW() - INTERVAL '22 days'),
('inv00001-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000004', 'cli00001-0000-0000-0000-000000000004', 'TS-2024-004', CURRENT_DATE - INTERVAL '18 days', CURRENT_DATE + INTERVAL '12 days', 'sent', 5225.00, 1097.25, 6322.25, 0.21, 'EUR', NOW() - INTERVAL '18 days'),
('inv00001-0000-0000-0000-000000000005', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000001', 'cli00001-0000-0000-0000-000000000005', 'TS-2024-005', CURRENT_DATE - INTERVAL '12 days', CURRENT_DATE + INTERVAL '18 days', 'draft', 11700.00, 2457.00, 14157.00, 0.21, 'EUR', NOW() - INTERVAL '12 days'),
('inv00001-0000-0000-0000-000000000006', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000002', 'cli00001-0000-0000-0000-000000000006', 'TS-2024-006', CURRENT_DATE - INTERVAL '8 days', CURRENT_DATE + INTERVAL '22 days', 'draft', 3150.00, 661.50, 3811.50, 0.21, 'EUR', NOW() - INTERVAL '8 days'),
('inv00001-0000-0000-0000-000000000007', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000003', 'cli00001-0000-0000-0000-000000000007', 'TS-2024-007', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '25 days', 'sent', 9100.00, 1911.00, 11011.00, 0.21, 'EUR', NOW() - INTERVAL '5 days'),
('inv00001-0000-0000-0000-000000000008', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000004', 'cli00001-0000-0000-0000-000000000008', 'TS-2024-008', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '27 days', 'draft', 8050.00, 1690.50, 9740.50, 0.21, 'EUR', NOW() - INTERVAL '3 days'),

-- GlobalCorp Invoices (Enterprise-level, high values)
('inv00002-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', 'cli00002-0000-0000-0000-000000000001', 'GC-2024-001', CURRENT_DATE - INTERVAL '40 days', CURRENT_DATE - INTERVAL '10 days', 'paid', 24000.00, 5040.00, 29040.00, 0.21, 'EUR', NOW() - INTERVAL '40 days'),
('inv00002-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000002', 'cli00002-0000-0000-0000-000000000002', 'GC-2024-002', CURRENT_DATE - INTERVAL '35 days', CURRENT_DATE - INTERVAL '5 days', 'paid', 20800.00, 4368.00, 25168.00, 0.21, 'EUR', NOW() - INTERVAL '35 days'),
('inv00002-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', 'cli00002-0000-0000-0000-000000000003', 'GC-2024-003', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, 'sent', 19600.00, 4116.00, 23716.00, 0.21, 'EUR', NOW() - INTERVAL '30 days'),
('inv00002-0000-0000-0000-000000000004', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000002', 'cli00002-0000-0000-0000-000000000004', 'GC-2024-004', CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE + INTERVAL '5 days', 'sent', 24300.00, 5103.00, 29403.00, 0.21, 'EUR', NOW() - INTERVAL '25 days'),
('inv00002-0000-0000-0000-000000000005', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', 'cli00002-0000-0000-0000-000000000005', 'GC-2024-005', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '10 days', 'draft', 28050.00, 5890.50, 33940.50, 0.21, 'EUR', NOW() - INTERVAL '20 days');

-- 11. EXPENSES  
-- Create realistic expenses across categories
INSERT INTO expenses (id, tenant_id, title, description, expense_date, amount, currency, category_id, expense_type, payment_method, status, submitted_by, vat_rate, vat_amount, created_at) VALUES
-- Acme Consulting Expenses
('exp00000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Office Supplies - Printer Paper', 'A4 printer paper and office stationery', CURRENT_DATE - INTERVAL '5 days', 127.45, 'EUR', 'cat00000-0000-0000-0000-000000000001', 'overige_zakelijk', 'business_credit_card', 'approved', '10000000-0000-0000-0000-000000000001', 0.21, 26.76, NOW() - INTERVAL '5 days'),
('exp00000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Client Meeting - Lunch', 'Business lunch with Restaurant De Gouden Lepel client', CURRENT_DATE - INTERVAL '8 days', 89.50, 'EUR', 'cat00000-0000-0000-0000-000000000003', 'representatie', 'personal_card', 'approved', '10000000-0000-0000-0000-000000000002', 0.21, 18.80, NOW() - INTERVAL '8 days'),
('exp00000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Travel - Amsterdam Client Visit', 'Train tickets and parking for client meeting', CURRENT_DATE - INTERVAL '12 days', 67.80, 'EUR', 'cat00000-0000-0000-0000-000000000002', 'transport', 'personal_card', 'approved', '10000000-0000-0000-0000-000000000003', 0.21, 14.24, NOW() - INTERVAL '12 days'),
('exp00000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Professional Development', 'Online course: Advanced Web Development', CURRENT_DATE - INTERVAL '15 days', 299.00, 'EUR', 'cat00000-0000-0000-0000-000000000003', 'overige_zakelijk', 'business_bank_transfer', 'approved', '10000000-0000-0000-0000-000000000001', 0.21, 62.79, NOW() - INTERVAL '15 days'),
('exp00000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mobile Phone Bill', 'Monthly business mobile phone subscription', CURRENT_DATE - INTERVAL '20 days', 45.99, 'EUR', 'cat00000-0000-0000-0000-000000000001', 'overige_zakelijk', 'business_bank_transfer', 'approved', '10000000-0000-0000-0000-000000000002', 0.21, 9.66, NOW() - INTERVAL '20 days'),

-- TechStart BV Expenses (More tech-focused)
('exp00001-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'AWS Cloud Services', 'Monthly cloud infrastructure costs', CURRENT_DATE - INTERVAL '3 days', 1247.60, 'EUR', 'cat00000-0000-0000-0000-000000000004', 'overige_zakelijk', 'business_credit_card', 'approved', '20000000-0000-0000-0000-000000000002', 0.21, 261.99, NOW() - INTERVAL '3 days'),
('exp00001-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Software Licenses', 'JetBrains development tools annual license', CURRENT_DATE - INTERVAL '7 days', 649.00, 'EUR', 'cat00000-0000-0000-0000-000000000004', 'overige_zakelijk', 'business_bank_transfer', 'approved', '20000000-0000-0000-0000-000000000003', 0.21, 136.29, NOW() - INTERVAL '7 days'),
('exp00001-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Conference Attendance', 'Tech conference tickets and accommodation', CURRENT_DATE - INTERVAL '10 days', 1850.75, 'EUR', 'cat00000-0000-0000-0000-000000000005', 'overige_zakelijk', 'personal_card', 'approved', '20000000-0000-0000-0000-000000000001', 0.21, 388.66, NOW() - INTERVAL '10 days'),
('exp00001-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Office Equipment', 'MacBook Pro for new developer', CURRENT_DATE - INTERVAL '14 days', 2799.00, 'EUR', 'cat00000-0000-0000-0000-000000000006', 'equipment', 'business_credit_card', 'approved', '20000000-0000-0000-0000-000000000002', 0.21, 587.79, NOW() - INTERVAL '14 days'),
('exp00001-0000-0000-0000-000000000005', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Marketing Campaign', 'Google Ads for Q1 marketing campaign', CURRENT_DATE - INTERVAL '18 days', 2500.00, 'EUR', 'cat00000-0000-0000-0000-000000000005', 'marketing', 'business_credit_card', 'approved', '20000000-0000-0000-0000-000000000004', 0.21, 525.00, NOW() - INTERVAL '18 days'),
('exp00001-0000-0000-0000-000000000006', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Team Building Event', 'Quarterly team building and dinner', CURRENT_DATE - INTERVAL '22 days', 456.80, 'EUR', 'cat00000-0000-0000-0000-000000000005', 'representatie', 'business_credit_card', 'approved', '20000000-0000-0000-0000-000000000001', 0.21, 95.93, NOW() - INTERVAL '22 days'),

-- GlobalCorp Expenses (Enterprise-scale)
('exp00002-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Enterprise Software License', 'Microsoft Enterprise Agreement renewal', CURRENT_DATE - INTERVAL '2 days', 15750.00, 'EUR', 'cat00000-0000-0000-0000-000000000007', 'overige_zakelijk', 'business_bank_transfer', 'approved', '30000000-0000-0000-0000-000000000002', 0.21, 3307.50, NOW() - INTERVAL '2 days'),
('exp00002-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Legal Consultation', 'International compliance consultation', CURRENT_DATE - INTERVAL '6 days', 8940.00, 'EUR', 'cat00000-0000-0000-0000-000000000008', 'overige_zakelijk', 'business_bank_transfer', 'approved', '30000000-0000-0000-0000-000000000001', 0.21, 1877.40, NOW() - INTERVAL '6 days'),
('exp00002-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Executive Training', 'Leadership development program for C-suite', CURRENT_DATE - INTERVAL '11 days', 12500.00, 'EUR', 'cat00000-0000-0000-0000-000000000009', 'overige_zakelijk', 'business_credit_card', 'approved', '30000000-0000-0000-0000-000000000002', 0.21, 2625.00, NOW() - INTERVAL '11 days'),
('exp00002-0000-0000-0000-000000000004', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Data Center Hosting', 'Enterprise data center colocation services', CURRENT_DATE - INTERVAL '16 days', 18750.00, 'EUR', 'cat00000-0000-0000-0000-000000000007', 'overige_zakelijk', 'business_bank_transfer', 'approved', '30000000-0000-0000-0000-000000000001', 0.21, 3937.50, NOW() - INTERVAL '16 days'),
('exp00002-0000-0000-0000-000000000005', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'International Business Travel', 'Executive travel to US and Asia offices', CURRENT_DATE - INTERVAL '21 days', 6780.45, 'EUR', 'cat00000-0000-0000-0000-000000000009', 'transport', 'corporate_card', 'approved', '30000000-0000-0000-0000-000000000002', 0.21, 1423.89, NOW() - INTERVAL '21 days');

-- 12. NOTIFICATIONS
-- Create some sample notifications for real-time features
INSERT INTO notifications (id, tenant_id, user_id, type, title, message, data, read, created_at) VALUES
('not00000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 'invoice_paid', 'Invoice Paid', 'Invoice AC-2024-001 has been paid by Restaurant De Gouden Lepel BV', '{"invoice_id": "inv00000-0000-0000-0000-000000000001", "amount": 2571.25}', false, NOW() - INTERVAL '2 hours'),
('not00000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000001', 'usage_warning', 'Usage Alert', 'Your API usage is at 78% of your monthly limit', '{"usage_percentage": 78, "limit_type": "api_calls"}', false, NOW() - INTERVAL '6 hours'),
('not00000-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', 'new_client', 'New Client Added', 'New enterprise client ASML Netherlands has been added to your account', '{"client_id": "cli00002-0000-0000-0000-000000000012"}', true, NOW() - INTERVAL '1 day'),
('not00000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000002', 'expense_approved', 'Expense Approved', 'Your professional development expense has been approved', '{"expense_id": "exp00000-0000-0000-0000-000000000004", "amount": 299.00}', true, NOW() - INTERVAL '2 days'),
('not00000-0000-0000-0000-000000000005', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000002', 'subscription_renewal', 'Subscription Renewed', 'Your Professional plan has been renewed via Mollie', '{"subscription_id": "sub00000-0000-0000-0000-000000000002", "next_billing": "2025-02-01"}', false, NOW() - INTERVAL '3 days');

-- 13. PLATFORM SUBSCRIPTION PAYMENTS
-- Create payment records for subscription tracking
INSERT INTO platform_subscription_payments (id, tenant_id, subscription_id, amount, currency, status, payment_method, payment_provider, provider_payment_id, created_at) VALUES
-- Acme Consulting Payments (Mollie)
('pay00000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'sub00000-0000-0000-0000-000000000001', 29.00, 'EUR', 'completed', 'sepa_direct_debit', 'mollie', 'tr_mollie_acme_001', NOW() - INTERVAL '1 month'),
('pay00000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'sub00000-0000-0000-0000-000000000001', 29.00, 'EUR', 'completed', 'sepa_direct_debit', 'mollie', 'tr_mollie_acme_002', NOW() - INTERVAL '2 months'),

-- TechStart BV Payments (Mollie)  
('pay00001-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'sub00000-0000-0000-0000-000000000002', 79.00, 'EUR', 'completed', 'sepa_direct_debit', 'mollie', 'tr_mollie_techstart_001', NOW() - INTERVAL '1 month'),
('pay00001-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'sub00000-0000-0000-0000-000000000002', 79.00, 'EUR', 'completed', 'sepa_direct_debit', 'mollie', 'tr_mollie_techstart_002', NOW() - INTERVAL '2 months'),

-- GlobalCorp Payments (Stripe)
('pay00002-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'sub00000-0000-0000-0000-000000000003', 199.00, 'EUR', 'completed', 'card', 'stripe', 'pi_stripe_globalcorp_001', NOW() - INTERVAL '1 month'),
('pay00002-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'sub00000-0000-0000-0000-000000000003', 199.00, 'EUR', 'completed', 'card', 'stripe', 'pi_stripe_globalcorp_002', NOW() - INTERVAL '2 months');

-- Re-enable row security
SET row_security = on;

-- Reset session settings
SET session_replication_role = default;

COMMIT;

-- ====================
-- VERIFICATION QUERIES
-- ====================

-- Verify data consistency
DO $$
DECLARE
    tenant_count INTEGER;
    profile_count INTEGER;
    client_count INTEGER;
    project_count INTEGER;
    time_entry_count INTEGER;
    invoice_count INTEGER;
    expense_count INTEGER;
    subscription_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tenant_count FROM tenants;
    SELECT COUNT(*) INTO profile_count FROM profiles;
    SELECT COUNT(*) INTO client_count FROM clients;
    SELECT COUNT(*) INTO project_count FROM projects;
    SELECT COUNT(*) INTO time_entry_count FROM time_entries;
    SELECT COUNT(*) INTO invoice_count FROM invoices;
    SELECT COUNT(*) INTO expense_count FROM expenses;
    SELECT COUNT(*) INTO subscription_count FROM tenant_platform_subscriptions;
    
    RAISE NOTICE 'Seed data verification:';
    RAISE NOTICE '- Tenants: %', tenant_count;
    RAISE NOTICE '- Profiles: %', profile_count;
    RAISE NOTICE '- Clients: %', client_count;
    RAISE NOTICE '- Projects: %', project_count;
    RAISE NOTICE '- Time Entries: %', time_entry_count;
    RAISE NOTICE '- Invoices: %', invoice_count;
    RAISE NOTICE '- Expenses: %', expense_count;
    RAISE NOTICE '- Subscriptions: %', subscription_count;
    
    IF tenant_count = 3 AND profile_count >= 8 AND client_count >= 30 AND project_count >= 20 THEN
        RAISE NOTICE '✅ Seed data migration completed successfully!';
    ELSE
        RAISE WARNING '⚠️  Seed data may be incomplete. Please verify.';
    END IF;
END $$;