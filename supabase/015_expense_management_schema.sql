-- Expense Management System Schema (Fixed)
-- Phase 1: Core Foundation Tables
-- Generated with Claude Code (https://claude.ai/code)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- =====================================================
-- ENUMS for type safety and consistency
-- =====================================================

-- Drop existing types if they exist (in correct order to handle dependencies)
DO $$ BEGIN
    DROP TYPE IF EXISTS expense_status CASCADE;
EXCEPTION
    WHEN others THEN NULL;
END $$;

DO $$ BEGIN
    DROP TYPE IF EXISTS expense_type CASCADE;
EXCEPTION
    WHEN others THEN NULL;
END $$;

DO $$ BEGIN
    DROP TYPE IF EXISTS payment_method CASCADE;
EXCEPTION
    WHEN others THEN NULL;
END $$;

DO $$ BEGIN
    DROP TYPE IF EXISTS approval_action CASCADE;
EXCEPTION
    WHEN others THEN NULL;
END $$;

DO $$ BEGIN
    DROP TYPE IF EXISTS receipt_status CASCADE;
EXCEPTION
    WHEN others THEN NULL;
END $$;

DO $$ BEGIN
    DROP TYPE IF EXISTS currency_code CASCADE;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Expense status workflow
CREATE TYPE expense_status AS ENUM (
    'draft',           -- User is still editing
    'submitted',       -- Submitted for approval
    'under_review',    -- Being reviewed by approver
    'approved',        -- Approved and ready for processing
    'rejected',        -- Rejected by approver
    'reimbursed',      -- Employee has been reimbursed
    'processed',       -- Fully processed in accounting system
    'cancelled'        -- Cancelled by user or admin
);

-- Expense types
CREATE TYPE expense_type AS ENUM (
    'travel',          -- Travel related expenses
    'meals',           -- Meal and entertainment
    'office_supplies', -- Office supplies and equipment  
    'software',        -- Software subscriptions and licenses
    'marketing',       -- Marketing and advertising
    'professional',    -- Professional services
    'utilities',       -- Utilities and services
    'other'           -- Other miscellaneous expenses
);

-- Payment methods
CREATE TYPE payment_method AS ENUM (
    'corporate_card',  -- Company credit card
    'personal_card',   -- Personal card (needs reimbursement)
    'cash',           -- Cash payment
    'bank_transfer',  -- Direct bank payment
    'other'           -- Other payment method
);

-- Approval action types
CREATE TYPE approval_action AS ENUM (
    'approve',
    'reject',
    'request_changes',
    'forward'
);

-- Receipt processing status
CREATE TYPE receipt_status AS ENUM (
    'pending',         -- Awaiting processing
    'processing',      -- Currently being processed
    'processed',       -- Successfully processed
    'failed',         -- Processing failed
    'manual_review'   -- Requires manual review
);

-- Currency codes (ISO 4217)
CREATE TYPE currency_code AS ENUM (
    'EUR', 'USD', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK'
);

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Drop existing tables if they exist (in correct order to handle dependencies)
DROP TABLE IF EXISTS expense_report_items CASCADE;
DROP TABLE IF EXISTS expense_reports CASCADE;
DROP TABLE IF EXISTS corporate_card_transactions CASCADE;
DROP TABLE IF EXISTS expense_approvals CASCADE;
DROP TABLE IF EXISTS expense_receipts CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS approval_workflows CASCADE;
DROP TABLE IF EXISTS expense_policies CASCADE;
DROP TABLE IF EXISTS expense_categories CASCADE;

-- Expense Categories (hierarchical)
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    expense_type expense_type NOT NULL,
    parent_category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    gl_account_code VARCHAR(50), -- General Ledger account code
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_category_per_tenant UNIQUE(tenant_id, name),
    CONSTRAINT no_self_reference CHECK (id != parent_category_id)
);

-- Expense Policies (spending rules and limits)
CREATE TABLE expense_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Spending limits
    daily_limit DECIMAL(10,2) CHECK (daily_limit > 0),
    monthly_limit DECIMAL(10,2) CHECK (monthly_limit > 0),
    per_expense_limit DECIMAL(10,2) CHECK (per_expense_limit > 0),
    currency currency_code NOT NULL DEFAULT 'EUR',
    
    -- Flexible rules stored as JSONB for extensibility
    rules JSONB NOT NULL DEFAULT '{}',
    
    -- Auto-approval settings
    auto_approve_under DECIMAL(10,2) CHECK (auto_approve_under >= 0),
    require_receipt_over DECIMAL(10,2) CHECK (require_receipt_over >= 0),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    CONSTRAINT unique_policy_per_tenant UNIQUE(tenant_id, name)
);

-- Approval Workflows (configurable approval chains)
CREATE TABLE approval_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Workflow steps stored as JSONB array
    -- Format: [{"step": 1, "role": "manager", "threshold": 1000, "approver_ids": [...], "is_required": true}]
    steps JSONB NOT NULL DEFAULT '[]',
    
    -- Conditions for workflow application
    conditions JSONB NOT NULL DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    CONSTRAINT unique_workflow_per_tenant UNIQUE(tenant_id, name)
);

-- Main Expenses table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Basic expense information
    title VARCHAR(200) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    currency currency_code NOT NULL DEFAULT 'EUR',
    
    -- Categorization
    category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
    expense_type expense_type NOT NULL DEFAULT 'other',
    
    -- Payment and processing
    payment_method payment_method NOT NULL,
    status expense_status NOT NULL DEFAULT 'draft',
    current_approval_step INTEGER NOT NULL DEFAULT 0,
    workflow_id UUID REFERENCES approval_workflows(id) ON DELETE SET NULL,
    policy_id UUID REFERENCES expense_policies(id) ON DELETE SET NULL,
    
    -- User and submission tracking
    submitted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    
    -- Project and cost tracking
    project_code VARCHAR(50),
    cost_center VARCHAR(50),
    vendor_name VARCHAR(200),
    reference_number VARCHAR(100),
    
    -- Reimbursement tracking
    requires_reimbursement BOOLEAN NOT NULL DEFAULT false,
    reimbursed_at TIMESTAMP WITH TIME ZONE,
    reimbursement_amount DECIMAL(10,2),
    
    -- External system integration
    external_transaction_id VARCHAR(100),
    accounting_export_id VARCHAR(100),
    exported_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Additional flags
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    is_billable BOOLEAN NOT NULL DEFAULT false,
    client_id UUID, -- For billable expenses
    
    -- Flexible metadata and tags
    tags TEXT[] DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}'
);

-- Expense Receipts (file attachments and OCR data)
CREATE TABLE expense_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    
    -- File information
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    mime_type VARCHAR(100) NOT NULL,
    
    -- OCR processing
    ocr_status receipt_status NOT NULL DEFAULT 'pending',
    ocr_data JSONB NOT NULL DEFAULT '{}',
    ocr_confidence DECIMAL(3,2) CHECK (ocr_confidence >= 0 AND ocr_confidence <= 1),
    ocr_processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Verification
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense Approvals (approval history and decisions)
CREATE TABLE expense_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    approver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    action approval_action NOT NULL,
    comments TEXT,
    approved_amount DECIMAL(10,2), -- Can approve partial amounts
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_approval_step UNIQUE(expense_id, step_number, approver_id)
);

-- Corporate Card Transactions (for matching and reconciliation)
CREATE TABLE corporate_card_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Transaction identification
    external_transaction_id VARCHAR(200) NOT NULL,
    card_holder_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Transaction details
    merchant_name VARCHAR(200) NOT NULL,
    transaction_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency currency_code NOT NULL DEFAULT 'EUR',
    
    -- Card information
    card_last_four VARCHAR(4),
    card_type VARCHAR(50),
    
    -- AI categorization
    suggested_category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
    suggested_expense_type expense_type,
    ai_confidence DECIMAL(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
    
    -- Expense matching
    expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
    is_matched BOOLEAN NOT NULL DEFAULT false,
    matched_at TIMESTAMP WITH TIME ZONE,
    matched_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Import tracking
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    import_batch_id UUID,
    raw_data JSONB NOT NULL DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_transaction_per_tenant UNIQUE(tenant_id, external_transaction_id)
);

-- Expense Reports (grouping expenses for submission/review)
CREATE TABLE expense_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    report_period_start DATE NOT NULL,
    report_period_end DATE NOT NULL,
    status expense_status NOT NULL DEFAULT 'draft',
    submitted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency currency_code NOT NULL DEFAULT 'EUR',
    expense_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_report_period CHECK (report_period_start <= report_period_end)
);

-- Report Items (many-to-many relationship between reports and expenses)
CREATE TABLE expense_report_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES expense_reports(id) ON DELETE CASCADE,
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_expense_per_report UNIQUE(report_id, expense_id)
);

-- =====================================================
-- INDEXES for performance optimization
-- =====================================================

-- Primary lookup indexes
CREATE INDEX idx_expenses_tenant_status ON expenses(tenant_id, status);
CREATE INDEX idx_expenses_tenant_date ON expenses(tenant_id, expense_date DESC);
CREATE INDEX idx_expenses_submitted_by ON expenses(submitted_by);
CREATE INDEX idx_expenses_category ON expenses(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_expenses_workflow ON expenses(workflow_id) WHERE workflow_id IS NOT NULL;
CREATE INDEX idx_expenses_external_transaction ON expenses(external_transaction_id) WHERE external_transaction_id IS NOT NULL;

-- Search and filtering indexes
CREATE INDEX idx_expenses_vendor_search ON expenses USING GIN(to_tsvector('english', vendor_name)) WHERE vendor_name IS NOT NULL;
CREATE INDEX idx_expenses_title_search ON expenses USING GIN(to_tsvector('english', title));
CREATE INDEX idx_expenses_tags ON expenses USING GIN(tags);
CREATE INDEX idx_expenses_metadata ON expenses USING GIN(metadata);
CREATE INDEX idx_expenses_amount_range ON expenses(tenant_id, amount);

-- Receipt processing indexes
CREATE INDEX idx_receipts_expense ON expense_receipts(expense_id);
CREATE INDEX idx_receipts_ocr_status ON expense_receipts(ocr_status) WHERE ocr_status IN ('pending', 'processing');

-- Approval workflow indexes
CREATE INDEX idx_approvals_expense ON expense_approvals(expense_id);
CREATE INDEX idx_approvals_approver ON expense_approvals(approver_id);

-- Corporate card indexes
CREATE INDEX idx_card_transactions_tenant_date ON corporate_card_transactions(tenant_id, transaction_date DESC);
CREATE INDEX idx_card_transactions_matching ON corporate_card_transactions(tenant_id, is_matched, card_holder_id);
CREATE INDEX idx_card_transactions_merchant ON corporate_card_transactions USING GIN(to_tsvector('english', merchant_name));

-- Category and policy indexes
CREATE INDEX idx_categories_tenant_type ON expense_categories(tenant_id, expense_type) WHERE is_active = true;
CREATE INDEX idx_policies_tenant_active ON expense_policies(tenant_id) WHERE is_active = true;
CREATE INDEX idx_workflows_tenant_active ON approval_workflows(tenant_id) WHERE is_active = true;

-- Report indexes
CREATE INDEX idx_reports_tenant_period ON expense_reports(tenant_id, report_period_start, report_period_end);
CREATE INDEX idx_report_items_report ON expense_report_items(report_id);

-- =====================================================
-- TRIGGERS for automated updates
-- =====================================================

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at columns
CREATE TRIGGER update_expense_categories_updated_at BEFORE UPDATE ON expense_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_policies_updated_at BEFORE UPDATE ON expense_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_approval_workflows_updated_at BEFORE UPDATE ON approval_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_receipts_updated_at BEFORE UPDATE ON expense_receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_corporate_card_transactions_updated_at BEFORE UPDATE ON corporate_card_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_reports_updated_at BEFORE UPDATE ON expense_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_report_items ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT tenant_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub';
$$;

-- RLS Policies - Tenant isolation for all tables

-- Expense Categories
CREATE POLICY "Expense categories are tenant-isolated" ON expense_categories
    FOR ALL USING (tenant_id = get_user_tenant_id());

-- Expense Policies  
CREATE POLICY "Expense policies are tenant-isolated" ON expense_policies
    FOR ALL USING (tenant_id = get_user_tenant_id());

-- Approval Workflows
CREATE POLICY "Approval workflows are tenant-isolated" ON approval_workflows
    FOR ALL USING (tenant_id = get_user_tenant_id());

-- Expenses (with additional user restrictions)
CREATE POLICY "Users can view all expenses in their tenant" ON expenses
    FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create expenses in their tenant" ON expenses
    FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() AND submitted_by = (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'));

CREATE POLICY "Users can update their own draft expenses" ON expenses
    FOR UPDATE USING (
        tenant_id = get_user_tenant_id() 
        AND submitted_by = (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
        AND status = 'draft'
    );

CREATE POLICY "Users can delete their own draft expenses" ON expenses
    FOR DELETE USING (
        tenant_id = get_user_tenant_id() 
        AND submitted_by = (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
        AND status = 'draft'
    );

-- Expense Receipts (through expense relationship)
CREATE POLICY "Expense receipts follow expense permissions" ON expense_receipts
    FOR ALL USING (
        expense_id IN (
            SELECT id FROM expenses WHERE tenant_id = get_user_tenant_id()
        )
    );

-- Expense Approvals (through expense relationship)  
CREATE POLICY "Expense approvals follow expense permissions" ON expense_approvals
    FOR SELECT USING (
        expense_id IN (
            SELECT id FROM expenses WHERE tenant_id = get_user_tenant_id()
        )
    );

CREATE POLICY "Users can create approvals for expenses they can approve" ON expense_approvals
    FOR INSERT WITH CHECK (
        expense_id IN (
            SELECT id FROM expenses WHERE tenant_id = get_user_tenant_id()
        )
        AND approver_id = (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
    );

-- Corporate Card Transactions
CREATE POLICY "Corporate card transactions are tenant-isolated" ON corporate_card_transactions
    FOR ALL USING (tenant_id = get_user_tenant_id());

-- Expense Reports
CREATE POLICY "Expense reports are tenant-isolated" ON expense_reports
    FOR ALL USING (tenant_id = get_user_tenant_id());

-- Expense Report Items (through report relationship)
CREATE POLICY "Expense report items follow report permissions" ON expense_report_items
    FOR ALL USING (
        report_id IN (
            SELECT id FROM expense_reports WHERE tenant_id = get_user_tenant_id()
        )
    );

-- =====================================================
-- SEED DATA FUNCTIONS
-- =====================================================

-- Function to seed default expense categories for a tenant
CREATE OR REPLACE FUNCTION seed_default_expense_categories(p_tenant_id UUID)
RETURNS VOID AS $$
DECLARE
    travel_cat_id UUID;
    meals_cat_id UUID;
    office_cat_id UUID;
    software_cat_id UUID;
    marketing_cat_id UUID;
    professional_cat_id UUID;
    utilities_cat_id UUID;
    other_cat_id UUID;
BEGIN
    -- Insert main categories
    INSERT INTO expense_categories (tenant_id, name, expense_type, gl_account_code) VALUES
        (p_tenant_id, 'Travel & Transportation', 'travel', '6100'),
        (p_tenant_id, 'Meals & Entertainment', 'meals', '6200'),
        (p_tenant_id, 'Office Supplies', 'office_supplies', '6300'),
        (p_tenant_id, 'Software & Licenses', 'software', '6400'),
        (p_tenant_id, 'Marketing & Advertising', 'marketing', '6500'),
        (p_tenant_id, 'Professional Services', 'professional', '6600'),
        (p_tenant_id, 'Utilities & Services', 'utilities', '6700'),
        (p_tenant_id, 'Other Expenses', 'other', '6800');

    -- Get IDs for subcategories
    SELECT id INTO travel_cat_id FROM expense_categories WHERE tenant_id = p_tenant_id AND name = 'Travel & Transportation';
    SELECT id INTO meals_cat_id FROM expense_categories WHERE tenant_id = p_tenant_id AND name = 'Meals & Entertainment';
    SELECT id INTO office_cat_id FROM expense_categories WHERE tenant_id = p_tenant_id AND name = 'Office Supplies';
    
    -- Insert subcategories
    INSERT INTO expense_categories (tenant_id, name, expense_type, parent_category_id, gl_account_code) VALUES
        -- Travel subcategories
        (p_tenant_id, 'Flights', 'travel', travel_cat_id, '6110'),
        (p_tenant_id, 'Hotels', 'travel', travel_cat_id, '6120'),
        (p_tenant_id, 'Car Rental', 'travel', travel_cat_id, '6130'),
        (p_tenant_id, 'Public Transport', 'travel', travel_cat_id, '6140'),
        (p_tenant_id, 'Parking & Tolls', 'travel', travel_cat_id, '6150'),
        
        -- Meals subcategories
        (p_tenant_id, 'Business Meals', 'meals', meals_cat_id, '6210'),
        (p_tenant_id, 'Client Entertainment', 'meals', meals_cat_id, '6220'),
        (p_tenant_id, 'Conference Meals', 'meals', meals_cat_id, '6230'),
        
        -- Office subcategories
        (p_tenant_id, 'Stationery', 'office_supplies', office_cat_id, '6310'),
        (p_tenant_id, 'Equipment', 'office_supplies', office_cat_id, '6320'),
        (p_tenant_id, 'Furniture', 'office_supplies', office_cat_id, '6330');
END;
$$ LANGUAGE plpgsql;

-- Function to seed default approval workflow
CREATE OR REPLACE FUNCTION seed_default_approval_workflow(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO approval_workflows (tenant_id, name, description, steps, conditions) VALUES (
        p_tenant_id,
        'Standard Approval Workflow',
        'Default workflow for most expenses - manager approval for amounts over €50',
        '[
            {
                "step": 1,
                "role": "manager",
                "threshold": 1000.00,
                "is_required": true
            },
            {
                "step": 2,
                "role": "finance_admin",
                "threshold": 5000.00,
                "is_required": true
            }
        ]'::jsonb,
        '{"auto_approve_under": 50.00}'::jsonb
    );
END;
$$ LANGUAGE plpgsql;

-- Function to seed default expense policy
CREATE OR REPLACE FUNCTION seed_default_expense_policy(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO expense_policies (tenant_id, name, description, daily_limit, monthly_limit, per_expense_limit, auto_approve_under, require_receipt_over, rules) VALUES (
        p_tenant_id,
        'Standard Expense Policy',
        'Default policy for employee expenses',
        200.00,     -- €200 daily limit
        2000.00,    -- €2000 monthly limit
        1000.00,    -- €1000 per expense limit
        50.00,      -- Auto-approve under €50
        25.00,      -- Require receipt over €25
        '{
            "meal_limit_per_day": 75.00,
            "require_manager_approval": true,
            "max_hotel_rate_per_night": 200.00,
            "require_receipt_always": false,
            "allow_personal_card": true
        }'::jsonb
    );
END;
$$ LANGUAGE plpgsql;