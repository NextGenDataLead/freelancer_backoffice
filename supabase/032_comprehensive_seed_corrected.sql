-- Migration: 032 - Comprehensive Seed Data (Schema Corrected)
-- Clear all existing data and populate with comprehensive test data matching actual schema

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
-- CLEAR ALL EXISTING DATA IN DEPENDENCY ORDER
-- Based on foreign key analysis - clearing dependent tables first
-- ====================

TRUNCATE TABLE 
  -- Level 7: Most dependent tables
  notification_events,
  expense_vat_calculation,
  expense_report_items,
  expense_receipts,
  expense_approvals,
  corporate_card_transactions,
  invoice_btw_classification,
  invoice_items,
  invoice_payments,
  kilometer_entries,
  icp_declarations,
  
  -- Level 6: Tables dependent on main business entities
  platform_subscription_payments,
  subscription_usage,
  time_entries,
  
  -- Level 5: Main business entities with foreign keys
  expense_reports,
  expenses,
  invoices,
  notifications,
  
  -- Level 4: Secondary entities
  projects,
  
  -- Level 3: Primary business entities
  clients,
  
  -- Level 2: User and organization data
  organization_memberships,
  deletion_requests,
  password_reset_tokens,
  
  -- Level 1: Core user data
  profiles,
  
  -- Level 0: Reference data and tenants
  tenant_platform_subscriptions,
  organizations,
  documents,
  expense_categories,
  platform_subscription_plans,
  tenants
RESTART IDENTITY CASCADE;

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
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'FreelanceHub', 'freelancehub', NOW() - INTERVAL '6 months', NOW(), 
 '{"timezone": "Europe/Amsterdam", "currency": "EUR", "language": "nl"}', 
 'active', 'billing@freelancehub.nl', 5, 10),

('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'TechFlow Solutions', 'techflow', NOW() - INTERVAL '1 year', NOW(),
 '{"timezone": "Europe/London", "currency": "GBP", "language": "en", "features": {"advanced_reporting": true}}',
 'active', 'accounts@techflow.co.uk', 20, 50),

('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Global Enterprise Corp', 'globalenterprise', NOW() - INTERVAL '2 years', NOW(),
 '{"timezone": "America/New_York", "currency": "USD", "language": "en", "features": {"sso": true, "custom_branding": true}}',
 'active', 'billing@globalenterprise.com', 100, 200);

-- ====================
-- USER PROFILES (Updated with actual schema)
-- ====================

INSERT INTO profiles (id, tenant_id, clerk_user_id, email, first_name, last_name, role, created_at, updated_at, last_sign_in_at, is_active, preferences, onboarding_complete, kvk_number, btw_number, business_name, business_type, hourly_rate, address, postal_code, city, country_code, phone, default_payment_terms) VALUES
-- FreelanceHub users
('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_freelance_owner', 'anna@freelancehub.nl', 'Anna', 'van Berg', 'owner', NOW() - INTERVAL '6 months', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', true, '{"theme": "light", "notifications": true}', true, '12345678', 'NL123456789B01', 'FreelanceHub', 'sole_proprietorship', 65.00, 'Hoofdstraat 123', '1012AB', 'Amsterdam', 'NL', '+31 20 1234567', 30),
('11111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_freelance_admin', 'jan@freelancehub.nl', 'Jan', 'de Vries', 'admin', NOW() - INTERVAL '5 months', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', true, '{"theme": "dark", "notifications": true}', true, NULL, NULL, NULL, NULL, 55.00, NULL, NULL, NULL, NULL, NULL, 30),

-- TechFlow users  
('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user_techflow_owner', 'sarah@techflow.co.uk', 'Sarah', 'Johnson', 'owner', NOW() - INTERVAL '1 year', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes', true, '{"theme": "dark", "notifications": true, "dashboard_layout": "compact"}', true, '87654321', 'GB987654321', 'TechFlow Solutions Ltd', 'limited_company', 120.00, '25 King Street', 'SW1Y 6QY', 'London', 'GB', '+44 20 7123 4567', 30),
('22222222-2222-2222-2222-222222222223', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user_techflow_admin', 'mike@techflow.co.uk', 'Mike', 'Thompson', 'admin', NOW() - INTERVAL '10 months', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', true, '{"theme": "light", "notifications": false}', true, NULL, NULL, NULL, NULL, 95.00, NULL, NULL, NULL, NULL, NULL, 30),
('22222222-2222-2222-2222-222222222224', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user_techflow_member', 'emma@techflow.co.uk', 'Emma', 'Williams', 'member', NOW() - INTERVAL '8 months', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours', true, '{"theme": "auto", "notifications": true}', true, NULL, NULL, NULL, NULL, 85.00, NULL, NULL, NULL, NULL, NULL, 30),

-- Global Enterprise users
('33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'user_global_owner', 'david@globalenterprise.com', 'David', 'Rodriguez', 'owner', NOW() - INTERVAL '2 years', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes', true, '{"theme": "light", "notifications": true, "advanced_features": true}', true, '55566677', 'US123456789', 'Global Enterprise Corp', 'corporation', 200.00, '1000 Corporate Plaza', '10001', 'New York', 'US', '+1 212 555 0123', 45),
('33333333-3333-3333-3333-333333333334', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'user_global_admin', 'lisa@globalenterprise.com', 'Lisa', 'Chen', 'admin', NOW() - INTERVAL '18 months', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '45 minutes', true, '{"theme": "dark", "notifications": true}', true, NULL, NULL, NULL, NULL, 180.00, NULL, NULL, NULL, NULL, NULL, 45);

-- ====================
-- EXPENSE CATEGORIES (Updated with actual schema)
-- ====================

INSERT INTO expense_categories (id, tenant_id, name, description, expense_type, is_active, created_at, updated_at) VALUES
('cat11111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Travel', 'Business travel expenses', 'travel', true, NOW() - INTERVAL '6 months', NOW() - INTERVAL '6 months'),
('cat11111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Equipment', 'Office equipment and supplies', 'equipment', true, NOW() - INTERVAL '6 months', NOW() - INTERVAL '6 months'),
('cat22222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Software', 'Software licenses and subscriptions', 'software', true, NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year'),
('cat22222-2222-2222-2222-222222222223', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Marketing', 'Marketing and advertising expenses', 'marketing', true, NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year'),
('cat33333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Training', 'Employee training and development', 'training', true, NOW() - INTERVAL '2 years', NOW() - INTERVAL '2 years'),
('cat33333-3333-3333-3333-333333333334', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Infrastructure', 'IT infrastructure and hosting', 'technology', true, NOW() - INTERVAL '2 years', NOW() - INTERVAL '2 years');

-- ====================
-- CLIENTS (Updated with actual schema)
-- ====================

INSERT INTO clients (id, tenant_id, created_by, name, company_name, email, phone, address, postal_code, city, country_code, vat_number, is_business, is_supplier, default_payment_terms, notes, created_at, updated_at, invoicing_frequency, auto_invoice_enabled, active, hourly_rate) VALUES
-- FreelanceHub clients
('c1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Local Bakery B.V.', 'Local Bakery B.V.', 'peter@localbakery.nl', '+31 20 1234567', 'Hoofdstraat 123', '1012AB', 'Amsterdam', 'NL', 'NL123456789B01', true, false, 30, 'Regular client, monthly website updates', NOW() - INTERVAL '5 months', NOW() - INTERVAL '1 week', 'monthly', true, true, 65.00),
('c1111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Garden Design Studio', 'Garden Design Studio', 'maria@gardendesign.nl', '+31 30 9876543', 'Parkweg 45', '3512JK', 'Utrecht', 'NL', 'NL987654321B01', true, false, 30, 'New branding project started', NOW() - INTERVAL '3 months', NOW() - INTERVAL '2 days', 'project_based', false, true, 75.00),

-- TechFlow clients
('c2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'FinTech Innovations Ltd', 'FinTech Innovations Ltd', 'j.wilson@fintech-innovations.com', '+44 20 7123 4567', '25 King Street', 'SW1Y 6QY', 'London', 'GB', 'GB123456789', true, false, 30, 'Long-term development partnership', NOW() - INTERVAL '8 months', NOW() - INTERVAL '3 days', 'monthly', true, true, 120.00),
('c2222222-2222-2222-2222-222222222223', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'E-commerce Solutions', 'E-commerce Solutions Ltd', 'rachel@ecommerce-solutions.co.uk', '+44 161 234 5678', '14 Market Street', 'M1 1PT', 'Manchester', 'GB', 'GB987654321', true, false, 30, 'Platform modernization project', NOW() - INTERVAL '6 months', NOW() - INTERVAL '1 week', 'project_based', false, true, 95.00),
('c2222222-2222-2222-2222-222222222224', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Healthcare Analytics', 'Healthcare Analytics Ltd', 'a.clark@healthcare-analytics.com', '+44 131 345 6789', '8 Royal Mile', 'EH1 1RE', 'Edinburgh', 'GB', 'GB456789123', true, false, 45, 'Data dashboard development', NOW() - INTERVAL '4 months', NOW() - INTERVAL '5 days', 'monthly', true, true, 140.00),

-- Global Enterprise clients
('c3333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'Fortune 500 Manufacturing', 'Fortune 500 Manufacturing Inc', 'r.taylor@fortune500mfg.com', '+1 212 555 0123', '1000 Corporate Plaza', '10001', 'New York', 'US', 'US123456789', true, false, 45, 'Enterprise digital transformation', NOW() - INTERVAL '18 months', NOW() - INTERVAL '2 days', 'monthly', true, true, 200.00),
('c3333333-3333-3333-3333-333333333334', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'Global Retail Chain', 'Global Retail Chain Corp', 'j.adams@globalretail.com', '+1 312 555 0456', '500 Commerce Street', '60601', 'Chicago', 'US', 'US987654321', true, false, 30, 'Multi-location POS system', NOW() - INTERVAL '15 months', NOW() - INTERVAL '1 week', 'project_based', false, true, 180.00),
('c3333333-3333-3333-3333-333333333335', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'International Bank Corp', 'International Bank Corp', 'm.brown@intlbank.com', '+1 415 555 0789', '100 Financial District', '94104', 'San Francisco', 'US', 'US456789123', true, false, 60, 'Regulatory compliance platform', NOW() - INTERVAL '12 months', NOW() - INTERVAL '3 days', 'monthly', true, true, 250.00);

-- ====================
-- PROJECTS (Updated with actual schema)
-- ====================

INSERT INTO projects (id, name, description, client_id, hourly_rate, active, tenant_id, created_by, created_at, updated_at) VALUES
-- FreelanceHub projects
('p1111111-1111-1111-1111-111111111111', 'Website Redesign', 'Complete redesign of bakery website with online ordering', 'c1111111-1111-1111-1111-111111111111', 65.00, true, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '2 months', NOW() - INTERVAL '1 week'),
('p1111111-1111-1111-1111-111111111112', 'Brand Identity', 'Logo and brand guidelines for garden design studio', 'c1111111-1111-1111-1111-111111111112', 75.00, false, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 months', NOW() - INTERVAL '1 month'),

-- TechFlow projects
('p2222222-2222-2222-2222-222222222222', 'Mobile Banking App', 'iOS and Android app development for fintech client', 'c2222222-2222-2222-2222-222222222222', 120.00, true, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '6 months', NOW() - INTERVAL '2 days'),
('p2222222-2222-2222-2222-222222222223', 'E-commerce Platform Migration', 'Migration from legacy system to modern platform', 'c2222222-2222-2222-2222-222222222223', 95.00, false, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '8 months', NOW() - INTERVAL '2 months'),
('p2222222-2222-2222-2222-222222222224', 'Healthcare Dashboard', 'Real-time analytics dashboard for healthcare data', 'c2222222-2222-2222-2222-222222222224', 140.00, true, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '3 months', NOW() - INTERVAL '1 week'),

-- Global Enterprise projects
('p3333333-3333-3333-3333-333333333333', 'Digital Transformation Initiative', 'Enterprise-wide digital transformation consulting', 'c3333333-3333-3333-3333-333333333333', 200.00, true, 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '12 months', NOW() - INTERVAL '1 day'),
('p3333333-3333-3333-3333-333333333334', 'Multi-Location POS System', 'Custom POS system for 500+ retail locations', 'c3333333-3333-3333-3333-333333333334', 180.00, false, 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '15 months', NOW() - INTERVAL '3 months'),
('p3333333-3333-3333-3333-333333333335', 'Regulatory Compliance Platform', 'Banking compliance and reporting platform', 'c3333333-3333-3333-3333-333333333335', 250.00, true, 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '8 months', NOW() - INTERVAL '2 days');

-- ====================
-- TIME ENTRIES (Updated with actual schema)
-- ====================

INSERT INTO time_entries (id, tenant_id, created_by, client_id, project_name, description, entry_date, hours, hourly_rate, billable, invoiced, invoice_id, created_at, updated_at, project_id, effective_hourly_rate) VALUES
-- FreelanceHub time entries (recent entries)
('t1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Website Redesign', 'Homepage layout and navigation design', (NOW() - INTERVAL '1 day')::date, 4.0, 65.00, true, false, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 'p1111111-1111-1111-1111-111111111111', 65.00),
('t1111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111111', 'Website Redesign', 'Online ordering system backend development', (NOW() - INTERVAL '2 days')::date, 5.0, 65.00, true, false, NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 'p1111111-1111-1111-1111-111111111111', 65.00),

-- TechFlow time entries
('t2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Mobile Banking App', 'Mobile app authentication module', (NOW() - INTERVAL '1 day')::date, 6.0, 120.00, true, false, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 'p2222222-2222-2222-2222-222222222222', 120.00),
('t2222222-2222-2222-2222-222222222223', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222223', 'c2222222-2222-2222-2222-222222222224', 'Healthcare Dashboard', 'Healthcare data visualization components', (NOW() - INTERVAL '3 days')::date, 6.0, 140.00, true, false, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', 'p2222222-2222-2222-2222-222222222224', 140.00),
('t2222222-2222-2222-2222-222222222224', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222224', 'c2222222-2222-2222-2222-222222222222', 'Mobile Banking App', 'API integration and testing', (NOW() - INTERVAL '4 days')::date, 5.0, 120.00, true, false, NULL, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', 'p2222222-2222-2222-2222-222222222222', 120.00),

-- Global Enterprise time entries
('t3333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'Digital Transformation Initiative', 'Digital transformation strategy consulting', (NOW() - INTERVAL '1 day')::date, 8.0, 200.00, true, false, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 'p3333333-3333-3333-3333-333333333333', 200.00),
('t3333333-3333-3333-3333-333333333334', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333334', 'c3333333-3333-3333-3333-333333333335', 'Regulatory Compliance Platform', 'Banking compliance framework development', (NOW() - INTERVAL '2 days')::date, 8.0, 250.00, true, false, NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 'p3333333-3333-3333-3333-333333333335', 250.00);

-- ====================
-- INVOICES (Updated with actual schema)
-- ====================

INSERT INTO invoices (id, tenant_id, created_by, client_id, invoice_number, invoice_date, due_date, status, subtotal, vat_amount, total_amount, vat_type, vat_rate, currency, reference, notes, sent_at, paid_at, pdf_url, created_at, updated_at, paid_amount) VALUES
-- FreelanceHub invoices
('i1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111112', 'INV-2024-001', (NOW() - INTERVAL '1 month')::date, (NOW() - INTERVAL '1 month' + INTERVAL '30 days')::date, 'paid', 3500.00, 735.00, 4235.00, 'high', 21.00, 'EUR', 'Brand identity project', 'Brand identity project - paid via bank transfer', NOW() - INTERVAL '1 month', NOW() - INTERVAL '2 weeks', NULL, NOW() - INTERVAL '1 month', NOW() - INTERVAL '2 weeks', 4235.00),
('i1111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'INV-2024-002', (NOW() - INTERVAL '2 weeks')::date, (NOW() + INTERVAL '2 weeks')::date, 'sent', 2600.00, 546.00, 3146.00, 'high', 21.00, 'EUR', 'Website redesign progress', 'Website redesign - monthly progress billing', NOW() - INTERVAL '2 weeks', NULL, NULL, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks', 0.00),

-- TechFlow invoices
('i2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222223', 'TF-2024-001', (NOW() - INTERVAL '2 months')::date, (NOW() - INTERVAL '2 months' + INTERVAL '30 days')::date, 'paid', 45000.00, 9000.00, 54000.00, 'high', 20.00, 'GBP', 'Platform migration final', 'E-commerce platform migration - final invoice', NOW() - INTERVAL '2 months', NOW() - INTERVAL '1 month', NULL, NOW() - INTERVAL '2 months', NOW() - INTERVAL '1 month', 54000.00),
('i2222222-2222-2222-2222-222222222223', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'TF-2024-002', (NOW() - INTERVAL '3 weeks')::date, (NOW() - INTERVAL '3 weeks' + INTERVAL '30 days')::date, 'sent', 33600.00, 6720.00, 40320.00, 'high', 20.00, 'GBP', 'Mobile app Q4 progress', 'Mobile banking app - Q4 development progress', NOW() - INTERVAL '3 weeks', NULL, NULL, NOW() - INTERVAL '3 weeks', NOW() - INTERVAL '3 weeks', 0.00),
('i2222222-2222-2222-2222-222222222224', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222224', 'TF-2024-003', (NOW() - INTERVAL '1 week')::date, (NOW() + INTERVAL '3 weeks')::date, 'draft', 20300.00, 4060.00, 24360.00, 'high', 20.00, 'GBP', 'Healthcare dashboard sprint 2', 'Healthcare dashboard - sprint 2 completion', NULL, NULL, NULL, NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week', 0.00),

-- Global Enterprise invoices
('i3333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333334', 'GE-2024-001', (NOW() - INTERVAL '3 months')::date, (NOW() - INTERVAL '3 months' + INTERVAL '30 days')::date, 'paid', 890000.00, 0.00, 890000.00, 'zero', 0.00, 'USD', 'POS system final payment', 'Multi-location POS system - final payment', NOW() - INTERVAL '3 months', NOW() - INTERVAL '2 months', NULL, NOW() - INTERVAL '3 months', NOW() - INTERVAL '2 months', 890000.00),
('i3333333-3333-3333-3333-333333333334', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'GE-2024-002', (NOW() - INTERVAL '1 month')::date, (NOW() - INTERVAL '1 month' + INTERVAL '45 days')::date, 'sent', 170000.00, 0.00, 170000.00, 'zero', 0.00, 'USD', 'Digital transformation Q4', 'Digital transformation - Q4 consulting services', NOW() - INTERVAL '1 month', NULL, NULL, NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month', 0.00),
('i3333333-3333-3333-3333-333333333335', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333335', 'GE-2024-003', (NOW() - INTERVAL '2 weeks')::date, (NOW() + INTERVAL '6 weeks')::date, 'sent', 105000.00, 0.00, 105000.00, 'zero', 0.00, 'USD', 'Banking compliance milestone', 'Banking compliance platform - development milestone', NOW() - INTERVAL '2 weeks', NULL, NULL, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks', 0.00);

-- ====================
-- EXPENSES (Updated with actual schema)
-- ====================

INSERT INTO expenses (id, tenant_id, title, description, expense_date, amount, currency, category_id, expense_type, payment_method, status, current_approval_step, submitted_by, submitted_at, project_code, vendor_name, requires_reimbursement, is_recurring, is_billable, client_id, created_at, updated_at, metadata, vat_rate, vat_amount) VALUES
-- FreelanceHub expenses
('e1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Adobe Creative Suite subscription', 'Monthly Adobe Creative Suite subscription for design work', (NOW() - INTERVAL '1 month')::date, 59.99, 'EUR', 'cat11111-1111-1111-1111-111111111112', 'software', 'credit_card', 'approved', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 month', 'DESIGN-001', 'Adobe Systems', true, true, false, NULL, NOW() - INTERVAL '1 month', NOW() - INTERVAL '2 weeks', '{}', 21.00, 12.60),
('e1111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Client meeting travel costs', 'Train tickets for client meeting in Utrecht', (NOW() - INTERVAL '2 weeks')::date, 45.50, 'EUR', 'cat11111-1111-1111-1111-111111111111', 'travel', 'debit_card', 'approved', 0, '11111111-1111-1111-1111-111111111112', NOW() - INTERVAL '2 weeks', 'PROJ-001', 'NS Dutch Railways', true, false, true, 'c1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks', '{}', 21.00, 9.56),

-- TechFlow expenses
('e2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'AWS infrastructure costs', 'Monthly AWS infrastructure costs for client projects', (NOW() - INTERVAL '1 month')::date, 1250.00, 'GBP', 'cat22222-2222-2222-2222-222222222222', 'cloud_services', 'credit_card', 'approved', 0, '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '1 month', 'INFRA-001', 'Amazon Web Services', true, true, true, 'c2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 week', '{}', 20.00, 250.00),
('e2222222-2222-2222-2222-222222222223', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Healthcare conference attendance', 'Registration and travel for HealthTech conference', (NOW() - INTERVAL '3 weeks')::date, 899.00, 'GBP', 'cat22222-2222-2222-2222-222222222223', 'training', 'business_account', 'approved', 0, '22222222-2222-2222-2222-222222222223', NOW() - INTERVAL '3 weeks', 'TRAIN-001', 'HealthTech Conference Ltd', false, false, false, NULL, NOW() - INTERVAL '3 weeks', NOW() - INTERVAL '3 weeks', '{}', 20.00, 179.80),
('e2222222-2222-2222-2222-222222222224', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Mobile testing device rental', 'iPad and Android device rental for app testing', (NOW() - INTERVAL '1 week')::date, 200.00, 'GBP', 'cat22222-2222-2222-2222-222222222222', 'equipment', 'credit_card', 'approved', 0, '22222222-2222-2222-2222-222222222224', NOW() - INTERVAL '1 week', 'PROJ-002', 'DeviceRental Pro', true, false, true, 'c2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week', '{}', 20.00, 40.00),

-- Global Enterprise expenses
('e3333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Enterprise cloud infrastructure', 'Microsoft Azure enterprise services monthly cost', (NOW() - INTERVAL '1 month')::date, 15000.00, 'USD', 'cat33333-3333-3333-3333-333333333334', 'cloud_services', 'enterprise_account', 'approved', 0, '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '1 month', 'INFRA-GLOBAL', 'Microsoft Azure', true, true, true, 'c3333333-3333-3333-3333-333333333333', NOW() - INTERVAL '1 month', NOW() - INTERVAL '2 weeks', '{}', 0.00, 0.00),
('e3333333-3333-3333-3333-333333333334', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Banking compliance training', 'Specialized training for banking compliance team', (NOW() - INTERVAL '2 weeks')::date, 5000.00, 'USD', 'cat33333-3333-3333-3333-333333333333', 'training', 'business_check', 'approved', 0, '33333333-3333-3333-3333-333333333334', NOW() - INTERVAL '2 weeks', 'TRAIN-COMP', 'ComplianceTraining Corp', true, false, false, NULL, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks', '{}', 0.00, 0.00);

-- ====================
-- TENANT SUBSCRIPTIONS
-- ====================

INSERT INTO tenant_platform_subscriptions (id, tenant_id, plan_id, payment_provider, status, current_period_start, current_period_end, trial_start, trial_end, canceled_at, cancel_at_period_end, provider_data, created_at, updated_at) VALUES
('sub11111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'mollie', 'active', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', NULL, NULL, NULL, false, 
 '{"subscription_id": "sub_mollie_freelance_123", "customer_id": "cst_mollie_freelance_456", "mandate_id": "mdt_mollie_freelance_789"}', 
 NOW() - INTERVAL '6 months', NOW() - INTERVAL '15 days'),

('sub22222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'stripe', 'active', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', NULL, NULL, NULL, false,
 '{"subscription_id": "sub_stripe_techflow_abc123", "customer_id": "cus_stripe_techflow_def456", "payment_method_id": "pm_stripe_techflow_ghi789"}',
 NOW() - INTERVAL '1 year', NOW() - INTERVAL '10 days'),

('sub33333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'stripe', 'active', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', NULL, NULL, NULL, false,
 '{"subscription_id": "sub_stripe_global_xyz987", "customer_id": "cus_stripe_global_abc654", "payment_method_id": "pm_stripe_global_def321"}',
 NOW() - INTERVAL '2 years', NOW() - INTERVAL '5 days');

-- ====================
-- SUBSCRIPTION USAGE (matching actual schema)
-- ====================

INSERT INTO subscription_usage (id, tenant_id, subscription_id, period_start, period_end, api_calls, storage_used_gb, active_users, file_uploads, clients_count, time_entries_count, invoices_sent, projects_count, usage_percentage, created_at, updated_at) VALUES
('usage111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'sub11111-1111-1111-1111-111111111111', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', 3250, 2.5, 2, 45, 2, 6, 2, 2, 65.0, NOW() - INTERVAL '15 days', NOW()),

('usage222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'sub22222-2222-2222-2222-222222222222', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', 18500, 18.2, 3, 250, 3, 15, 3, 3, 74.0, NOW() - INTERVAL '10 days', NOW()),

('usage333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'sub33333-3333-3333-3333-333333333333', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', 67890, 78.5, 2, 890, 3, 8, 3, 3, 67.9, NOW() - INTERVAL '5 days', NOW());

-- ====================
-- PLATFORM SUBSCRIPTION PAYMENTS (matching actual schema)
-- ====================

INSERT INTO platform_subscription_payments (id, tenant_id, subscription_id, payment_provider, amount, currency, status, payment_date, failure_reason, description, provider_data, created_at) VALUES
('pay11111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'sub11111-1111-1111-1111-111111111111', 'mollie', 29.00, 'EUR', 'succeeded', (NOW() - INTERVAL '1 month')::date, NULL, 'Monthly subscription payment for Starter plan', 
 '{"payment_method": "directdebit", "mandate_id": "mdt_mollie_freelance_789", "settlement_id": "stl_mollie_settlement_456"}', 
 NOW() - INTERVAL '1 month'),

('pay22222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'sub22222-2222-2222-2222-222222222222', 'stripe', 79.00, 'GBP', 'succeeded', (NOW() - INTERVAL '1 month')::date, NULL, 'Monthly subscription payment for Professional plan',
 '{"payment_method": "card", "card_brand": "visa", "card_last4": "4242", "receipt_url": "https://pay.stripe.com/receipts/techflow_receipt"}',
 NOW() - INTERVAL '1 month'),

('pay33333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'sub33333-3333-3333-3333-333333333333', 'stripe', 199.00, 'USD', 'succeeded', (NOW() - INTERVAL '1 month')::date, NULL, 'Monthly subscription payment for Enterprise plan',
 '{"payment_method": "card", "card_brand": "amex", "card_last4": "1005", "receipt_url": "https://pay.stripe.com/receipts/global_receipt"}',
 NOW() - INTERVAL '1 month');

-- ====================
-- NOTIFICATIONS
-- ====================

INSERT INTO notifications (id, tenant_id, user_id, type, title, message, data, read_at, created_at, updated_at, expires_at, priority, category) VALUES
-- FreelanceHub notifications
('n1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'success', 'Invoice Paid', 'Invoice INV-2024-001 has been paid by Local Bakery B.V.', '{"invoice_id": "i1111111-1111-1111-1111-111111111111", "amount": 4235.00}', NULL, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks', NULL, 7, 'billing'),
('n1111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'info', 'New Project Started', 'Website redesign project has been created for Local Bakery B.V.', '{"project_id": "p1111111-1111-1111-1111-111111111111"}', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months', NULL, 5, 'projects'),

-- TechFlow notifications
('n2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'warning', 'Project Budget Alert', 'Mobile Banking App project has exceeded 70% of allocated budget', '{"project_id": "p2222222-2222-2222-2222-222222222222", "budget_used": 70}', NULL, NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week', NULL, 8, 'projects'),
('n2222222-2222-2222-2222-222222222223', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222223', 'success', 'Migration Completed', 'E-commerce Platform Migration has been successfully completed', '{"project_id": "p2222222-2222-2222-2222-222222222223"}', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months', NULL, 6, 'projects'),
('n2222222-2222-2222-2222-222222222224', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222224', 'info', 'New Team Member', 'Emma Williams has joined the TechFlow Solutions team', '{"user_id": "22222222-2222-2222-2222-222222222224"}', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '8 months', NOW() - INTERVAL '8 months', NULL, 4, 'team'),

-- Global Enterprise notifications
('n3333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'success', 'Major Milestone Reached', 'Digital Transformation Initiative has reached 70% completion', '{"project_id": "p3333333-3333-3333-3333-333333333333", "completion": 70}', NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NULL, 9, 'projects'),
('n3333333-3333-3333-3333-333333333334', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333334', 'info', 'Compliance Review Scheduled', 'Banking compliance platform review meeting scheduled for next week', '{"project_id": "p3333333-3333-3333-3333-333333333335", "meeting_date": "2024-12-20"}', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NULL, 6, 'compliance');

SET row_security = on;