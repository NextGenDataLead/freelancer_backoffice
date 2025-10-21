-- Migration 046: Recurring Expense Templates
-- Description: Add support for recurring expense templates to improve cash flow forecasting
-- Created: 2025-01-20

-- =====================================================
-- TABLE: recurring_expense_templates
-- =====================================================
-- Purpose: Store templates for recurring expenses (monthly subscriptions, rent, etc.)
-- Used by: Cash flow forecast to predict future expenses accurately

CREATE TABLE IF NOT EXISTS recurring_expense_templates (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Template Information
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,

  -- Amount & Currency
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',

  -- Frequency & Schedule
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE, -- NULL = indefinite recurring
  next_occurrence DATE NOT NULL,
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31), -- For monthly recurring (e.g., 25th)

  -- Amount Escalation
  amount_escalation_percentage DECIMAL(5, 2) CHECK (amount_escalation_percentage >= 0), -- Annual increase %
  last_escalation_date DATE,

  -- VAT & Tax Information
  vat_rate DECIMAL(5, 2) DEFAULT 21.00,
  is_vat_deductible BOOLEAN DEFAULT true,
  business_use_percentage DECIMAL(5, 2) DEFAULT 100.00 CHECK (business_use_percentage BETWEEN 0 AND 100),

  -- Accounting & Classification
  supplier_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  payment_method VARCHAR(50),

  -- Billable to Client
  is_billable BOOLEAN DEFAULT false,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  notes TEXT,
  tags TEXT[],
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_escalation CHECK (
    (amount_escalation_percentage IS NULL AND last_escalation_date IS NULL) OR
    (amount_escalation_percentage IS NOT NULL)
  ),
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT valid_billable CHECK (
    (is_billable = false) OR
    (is_billable = true AND client_id IS NOT NULL)
  )
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_recurring_expense_templates_tenant
  ON recurring_expense_templates(tenant_id);

CREATE INDEX idx_recurring_expense_templates_active
  ON recurring_expense_templates(tenant_id, is_active)
  WHERE is_active = true;

CREATE INDEX idx_recurring_expense_templates_next_occurrence
  ON recurring_expense_templates(next_occurrence)
  WHERE is_active = true;

CREATE INDEX idx_recurring_expense_templates_category
  ON recurring_expense_templates(category_id);

CREATE INDEX idx_recurring_expense_templates_client
  ON recurring_expense_templates(client_id)
  WHERE client_id IS NOT NULL;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER set_recurring_expense_templates_updated_at
  BEFORE UPDATE ON recurring_expense_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE recurring_expense_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their tenant's recurring expense templates
CREATE POLICY "Users can view their tenant's recurring expense templates"
  ON recurring_expense_templates
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can create recurring expense templates for their tenant
CREATE POLICY "Users can create recurring expense templates"
  ON recurring_expense_templates
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can update their tenant's recurring expense templates
CREATE POLICY "Users can update their tenant's recurring expense templates"
  ON recurring_expense_templates
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can delete their tenant's recurring expense templates
CREATE POLICY "Users can delete their tenant's recurring expense templates"
  ON recurring_expense_templates
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE recurring_expense_templates IS 'Templates for recurring expenses used in cash flow forecasting';
COMMENT ON COLUMN recurring_expense_templates.frequency IS 'How often the expense recurs: weekly, monthly, quarterly, yearly';
COMMENT ON COLUMN recurring_expense_templates.next_occurrence IS 'Next calculated date this expense will occur';
COMMENT ON COLUMN recurring_expense_templates.day_of_month IS 'Specific day of month for monthly recurring (e.g., 25th)';
COMMENT ON COLUMN recurring_expense_templates.amount_escalation_percentage IS 'Annual percentage increase (e.g., 2% for inflation adjustment)';
COMMENT ON COLUMN recurring_expense_templates.business_use_percentage IS 'Percentage used for business (affects VAT deduction)';
COMMENT ON COLUMN recurring_expense_templates.is_billable IS 'Whether this expense should be billed to a client';
