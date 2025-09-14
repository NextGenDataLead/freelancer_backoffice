-- Migration: 030 - Essential Seed Data  
-- Simplified version focusing on core data only
-- Created: 2025-01-10

BEGIN;

-- Clear existing data in safe order
TRUNCATE TABLE 
  platform_subscription_payments,
  subscription_usage,
  tenant_platform_subscriptions,
  time_entries,
  invoices,
  expenses,
  projects,
  clients,
  notifications,
  profiles,
  expense_categories,
  platform_subscription_plans,
  tenants
RESTART IDENTITY CASCADE;

-- 1. PLATFORM SUBSCRIPTION PLANS
INSERT INTO platform_subscription_plans (id, name, description, price, billing_interval, features, limits, is_active, sort_order, supported_providers, provider_configs) VALUES
('11111111-1111-1111-1111-111111111111', 'Starter', 'Perfect for freelancers and small teams', 29.00, 'monthly', 
 '{"max_clients": 25, "api_calls": 5000, "support_level": "email"}',
 '{"storage_gb": 5, "users": 3, "projects": 10}', 
 true, 1, ARRAY['mollie'], '{}'),
('22222222-2222-2222-2222-222222222222', 'Professional', 'Ideal for growing businesses', 79.00, 'monthly',
 '{"max_clients": 100, "api_calls": 25000, "support_level": "priority"}',
 '{"storage_gb": 25, "users": 10, "projects": 50}',
 true, 2, ARRAY['mollie', 'stripe'], '{}'),
('33333333-3333-3333-3333-333333333333', 'Enterprise', 'Full-featured solution', 199.00, 'monthly',
 '{"max_clients": -1, "api_calls": 100000, "support_level": "dedicated"}',
 '{"storage_gb": 100, "users": -1, "projects": -1}',
 true, 3, ARRAY['mollie', 'stripe'], '{}');

-- 2. TENANTS
INSERT INTO tenants (id, name, subdomain, settings, subscription_status, billing_email, created_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme Consulting', 'acme-consulting', 
 '{"currency": "EUR", "timezone": "Europe/Amsterdam"}',
 'active', 'billing@acme-consulting.nl', NOW() - INTERVAL '6 months'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'TechStart BV', 'techstart-bv',
 '{"currency": "EUR", "timezone": "Europe/Amsterdam"}', 
 'active', 'finance@techstart.nl', NOW() - INTERVAL '4 months'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'GlobalCorp International', 'globalcorp',
 '{"currency": "EUR", "timezone": "Europe/Amsterdam"}',
 'active', 'billing@globalcorp.com', NOW() - INTERVAL '2 years');

-- 3. PROFILES 
INSERT INTO profiles (id, tenant_id, clerk_user_id, email, first_name, last_name, role, created_at, onboarding_complete, hourly_rate) VALUES
-- Acme Consulting Users
('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_acme_owner', 'owner@acme-consulting.nl', 'Jan', 'de Vries', 'owner', NOW() - INTERVAL '6 months', true, 85.00),
('10000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_acme_admin', 'admin@acme-consulting.nl', 'Maria', 'Jansen', 'admin', NOW() - INTERVAL '5 months', true, 65.00),
('10000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_acme_member', 'freelancer@acme-consulting.nl', 'Ahmed', 'Hassan', 'member', NOW() - INTERVAL '4 months', true, 75.00),

-- TechStart BV Users
('20000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user_techstart_owner', 'ceo@techstart.nl', 'Emma', 'van der Berg', 'owner', NOW() - INTERVAL '4 months', true, 95.00),
('20000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user_techstart_admin', 'cfo@techstart.nl', 'Lars', 'Nielsen', 'admin', NOW() - INTERVAL '3 months', true, 80.00),

-- GlobalCorp Users  
('30000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'user_global_owner', 'ceo@globalcorp.com', 'Michael', 'Thompson', 'owner', NOW() - INTERVAL '2 years', true, 125.00),
('30000000-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'user_global_admin', 'finance@globalcorp.com', 'Isabella', 'García', 'admin', NOW() - INTERVAL '18 months', true, 90.00);

-- 4. TENANT PLATFORM SUBSCRIPTIONS
INSERT INTO tenant_platform_subscriptions (id, tenant_id, plan_id, payment_provider, status, current_period_start, current_period_end, provider_data, created_at) VALUES
('sub00000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'mollie', 'active', 
 DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') - INTERVAL '1 day',
 '{"subscription_id": "sub_mollie_acme_001", "customer_id": "cst_mollie_acme"}',
 NOW() - INTERVAL '5 months'),
('sub00000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'mollie', 'active',
 DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') - INTERVAL '1 day', 
 '{"subscription_id": "sub_mollie_techstart_001", "customer_id": "cst_mollie_techstart"}',
 NOW() - INTERVAL '3 months'),
('sub00000-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'stripe', 'active',
 DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') - INTERVAL '1 day',
 '{"subscription_id": "sub_stripe_globalcorp_001", "customer_id": "cus_stripe_globalcorp"}',
 NOW() - INTERVAL '18 months');

-- 5. SUBSCRIPTION USAGE TRACKING
INSERT INTO subscription_usage (tenant_id, subscription_id, period_start, period_end, api_calls, storage_used_gb, active_users, clients_count, time_entries_count, invoices_sent, projects_count) VALUES
-- Current month usage
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'sub00000-0000-0000-0000-000000000001', DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') - INTERVAL '1 day', 2400, 3.2, 3, 8, 67, 12, 5),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'sub00000-0000-0000-0000-000000000002', DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') - INTERVAL '1 day', 15600, 18.7, 4, 23, 189, 28, 12),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'sub00000-0000-0000-0000-000000000003', DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') - INTERVAL '1 day', 67800, 89.4, 2, 45, 423, 67, 28);

-- 6. EXPENSE CATEGORIES 
INSERT INTO expense_categories (id, tenant_id, name, description, category_type, deduction_percentage, btw_category) VALUES
('cat00000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Office Supplies', 'Kantoorbenodigdheden', 'overige_zakelijk', 100, 'standard'),
('cat00000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Software & Tools', 'Software en tools', 'overige_zakelijk', 100, 'standard'),
('cat00000-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'IT Services', 'IT-diensten', 'overige_zakelijk', 100, 'standard');

-- 7. CLIENTS (Sample data)
INSERT INTO clients (id, tenant_id, created_by, name, email, hourly_rate, active, created_at) VALUES
-- Acme Consulting Clients
('cli00000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 'Restaurant De Gouden Lepel', 'info@goudenleper.nl', 85.00, true, NOW() - INTERVAL '5 months'),
('cli00000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 'Boutique Clara', 'clara@boutiqueclara.nl', 75.00, true, NOW() - INTERVAL '4 months'),
('cli00000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000002', 'Photo Studio Lens', 'contact@photolens.nl', 95.00, true, NOW() - INTERVAL '3 months'),

-- TechStart BV Clients  
('cli00001-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000001', 'PayFast Technologies', 'tech@payfast.com', 120.00, true, NOW() - INTERVAL '3 months'),
('cli00001-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000002', 'LearnTech Solutions', 'contact@learntech.eu', 100.00, true, NOW() - INTERVAL '2 months'),

-- GlobalCorp Clients
('cli00002-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', 'Microsoft Netherlands', 'enterprise@microsoft.nl', 150.00, true, NOW() - INTERVAL '18 months'),
('cli00002-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000002', 'ING Bank N.V.', 'corporate@ing.nl', 160.00, true, NOW() - INTERVAL '15 months');

-- 8. PROJECTS
INSERT INTO projects (id, name, description, client_id, hourly_rate, active, tenant_id, created_by, created_at) VALUES
-- Acme Consulting Projects
('prj00000-0000-0000-0000-000000000001', 'Website Redesign', 'Restaurant website redesign', 'cli00000-0000-0000-0000-000000000001', 85.00, true, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', NOW() - INTERVAL '4 months'),
('prj00000-0000-0000-0000-000000000002', 'E-commerce Setup', 'Online store setup', 'cli00000-0000-0000-0000-000000000002', 75.00, true, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000002', NOW() - INTERVAL '3 months'),

-- TechStart BV Projects  
('prj00001-0000-0000-0000-000000000001', 'Mobile Payment App', 'Full-stack payment app development', 'cli00001-0000-0000-0000-000000000001', 120.00, true, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '2 months'),
('prj00001-0000-0000-0000-000000000002', 'LMS Platform', 'Learning management system', 'cli00001-0000-0000-0000-000000000002', 100.00, true, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000002', NOW() - INTERVAL '6 weeks'),

-- GlobalCorp Projects
('prj00002-0000-0000-0000-000000000001', 'Digital Transformation', 'Enterprise digital transformation', 'cli00002-0000-0000-0000-000000000001', 150.00, true, 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', NOW() - INTERVAL '15 months'),
('prj00002-0000-0000-0000-000000000002', 'Banking API', 'Open banking API development', 'cli00002-0000-0000-0000-000000000002', 160.00, true, 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000002', NOW() - INTERVAL '12 months');

-- 9. TIME ENTRIES (Recent entries)
INSERT INTO time_entries (tenant_id, created_by, client_id, project_id, description, entry_date, hours, hourly_rate, billable, created_at) VALUES
-- Acme Consulting
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 'cli00000-0000-0000-0000-000000000001', 'prj00000-0000-0000-0000-000000000001', 'Frontend development', CURRENT_DATE - INTERVAL '1 day', 6.5, 85.00, true, NOW() - INTERVAL '1 day'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000002', 'cli00000-0000-0000-0000-000000000002', 'prj00000-0000-0000-0000-000000000002', 'Product catalog setup', CURRENT_DATE - INTERVAL '2 days', 4.0, 75.00, true, NOW() - INTERVAL '2 days'),

-- TechStart BV
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000001', 'cli00001-0000-0000-0000-000000000001', 'prj00001-0000-0000-0000-000000000001', 'Blockchain integration', CURRENT_DATE - INTERVAL '1 day', 8.0, 120.00, true, NOW() - INTERVAL '1 day'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000002', 'cli00001-0000-0000-0000-000000000002', 'prj00001-0000-0000-0000-000000000002', 'AI tutoring system', CURRENT_DATE - INTERVAL '2 days', 7.5, 100.00, true, NOW() - INTERVAL '2 days'),

-- GlobalCorp  
('cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', 'cli00002-0000-0000-0000-000000000001', 'prj00002-0000-0000-0000-000000000001', 'Enterprise architecture', CURRENT_DATE - INTERVAL '1 day', 8.0, 150.00, true, NOW() - INTERVAL '1 day'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000002', 'cli00002-0000-0000-0000-000000000002', 'prj00002-0000-0000-0000-000000000002', 'API compliance review', CURRENT_DATE - INTERVAL '2 days', 6.5, 160.00, true, NOW() - INTERVAL '2 days');

-- 10. INVOICES
INSERT INTO invoices (id, tenant_id, created_by, client_id, invoice_number, invoice_date, due_date, status, subtotal, vat_amount, total_amount, created_at) VALUES
-- Acme Consulting
('inv00000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 'cli00000-0000-0000-0000-000000000001', 'AC-2024-001', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, 'paid', 2125.00, 446.25, 2571.25, NOW() - INTERVAL '30 days'),
('inv00000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000002', 'cli00000-0000-0000-0000-000000000002', 'AC-2024-002', CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE + INTERVAL '5 days', 'sent', 1200.00, 252.00, 1452.00, NOW() - INTERVAL '25 days'),

-- TechStart BV
('inv00001-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000001', 'cli00001-0000-0000-0000-000000000001', 'TS-2024-001', CURRENT_DATE - INTERVAL '35 days', CURRENT_DATE - INTERVAL '5 days', 'paid', 9600.00, 2016.00, 11616.00, NOW() - INTERVAL '35 days'),
('inv00001-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000002', 'cli00001-0000-0000-0000-000000000002', 'TS-2024-002', CURRENT_DATE - INTERVAL '28 days', CURRENT_DATE + INTERVAL '2 days', 'sent', 7500.00, 1575.00, 9075.00, NOW() - INTERVAL '28 days'),

-- GlobalCorp
('inv00002-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', 'cli00002-0000-0000-0000-000000000001', 'GC-2024-001', CURRENT_DATE - INTERVAL '40 days', CURRENT_DATE - INTERVAL '10 days', 'paid', 24000.00, 5040.00, 29040.00, NOW() - INTERVAL '40 days'),
('inv00002-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000002', 'cli00002-0000-0000-0000-000000000002', 'GC-2024-002', CURRENT_DATE - INTERVAL '35 days', CURRENT_DATE, 'sent', 20800.00, 4368.00, 25168.00, NOW() - INTERVAL '35 days');

-- 11. EXPENSES
INSERT INTO expenses (id, tenant_id, title, expense_date, amount, currency, category_id, expense_type, payment_method, status, submitted_by, created_at) VALUES
-- Acme Consulting
('exp00000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Office Supplies', CURRENT_DATE - INTERVAL '5 days', 127.45, 'EUR', 'cat00000-0000-0000-0000-000000000001', 'overige_zakelijk', 'business_credit_card', 'approved', '10000000-0000-0000-0000-000000000001', NOW() - INTERVAL '5 days'),
('exp00000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Professional Development', CURRENT_DATE - INTERVAL '15 days', 299.00, 'EUR', 'cat00000-0000-0000-0000-000000000001', 'overige_zakelijk', 'business_bank_transfer', 'approved', '10000000-0000-0000-0000-000000000001', NOW() - INTERVAL '15 days'),

-- TechStart BV
('exp00001-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'AWS Cloud Services', CURRENT_DATE - INTERVAL '3 days', 1247.60, 'EUR', 'cat00000-0000-0000-0000-000000000002', 'overige_zakelijk', 'business_credit_card', 'approved', '20000000-0000-0000-0000-000000000002', NOW() - INTERVAL '3 days'),
('exp00001-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Software Licenses', CURRENT_DATE - INTERVAL '7 days', 649.00, 'EUR', 'cat00000-0000-0000-0000-000000000002', 'overige_zakelijk', 'business_bank_transfer', 'approved', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '7 days'),

-- GlobalCorp  
('exp00002-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Enterprise Software License', CURRENT_DATE - INTERVAL '2 days', 15750.00, 'EUR', 'cat00000-0000-0000-0000-000000000003', 'overige_zakelijk', 'business_bank_transfer', 'approved', '30000000-0000-0000-0000-000000000002', NOW() - INTERVAL '2 days'),
('exp00002-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Legal Consultation', CURRENT_DATE - INTERVAL '6 days', 8940.00, 'EUR', 'cat00000-0000-0000-0000-000000000003', 'overige_zakelijk', 'business_bank_transfer', 'approved', '30000000-0000-0000-0000-000000000001', NOW() - INTERVAL '6 days');

-- 12. NOTIFICATIONS
INSERT INTO notifications (id, tenant_id, user_id, type, title, message, data, read, created_at) VALUES
('not00000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 'invoice_paid', 'Invoice Paid', 'Invoice AC-2024-001 has been paid', '{"invoice_id": "inv00000-0000-0000-0000-000000000001"}', false, NOW() - INTERVAL '2 hours'),
('not00001-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20000000-0000-0000-0000-000000000001', 'usage_warning', 'Usage Alert', 'API usage at 78% of monthly limit', '{"usage_percentage": 78}', false, NOW() - INTERVAL '6 hours'),
('not00002-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '30000000-0000-0000-0000-000000000001', 'new_client', 'New Client Added', 'New enterprise client added', '{"client_id": "cli00002-0000-0000-0000-000000000002"}', true, NOW() - INTERVAL '1 day');

-- 13. PLATFORM SUBSCRIPTION PAYMENTS
INSERT INTO platform_subscription_payments (id, tenant_id, subscription_id, amount, currency, status, payment_method, payment_provider, provider_payment_id, created_at) VALUES
('pay00000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'sub00000-0000-0000-0000-000000000001', 29.00, 'EUR', 'completed', 'sepa_direct_debit', 'mollie', 'tr_mollie_001', NOW() - INTERVAL '1 month'),
('pay00001-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'sub00000-0000-0000-0000-000000000002', 79.00, 'EUR', 'completed', 'sepa_direct_debit', 'mollie', 'tr_mollie_002', NOW() - INTERVAL '1 month'),
('pay00002-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'sub00000-0000-0000-0000-000000000003', 199.00, 'EUR', 'completed', 'card', 'stripe', 'pi_stripe_001', NOW() - INTERVAL '1 month');

COMMIT;

-- Verification
DO $$
DECLARE
    tenant_count INTEGER;
    profile_count INTEGER;
    client_count INTEGER;
    subscription_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tenant_count FROM tenants;
    SELECT COUNT(*) INTO profile_count FROM profiles;
    SELECT COUNT(*) INTO client_count FROM clients;
    SELECT COUNT(*) INTO subscription_count FROM tenant_platform_subscriptions;
    
    RAISE NOTICE 'Essential seed data created:';
    RAISE NOTICE '- Tenants: %', tenant_count;
    RAISE NOTICE '- Profiles: %', profile_count; 
    RAISE NOTICE '- Clients: %', client_count;
    RAISE NOTICE '- Subscriptions: %', subscription_count;
    
    IF tenant_count = 3 AND profile_count = 7 AND subscription_count = 3 THEN
        RAISE NOTICE '✅ Essential seed data migration completed successfully!';
    ELSE
        RAISE WARNING '⚠️ Seed data may be incomplete. Please verify.';
    END IF;
END $$;