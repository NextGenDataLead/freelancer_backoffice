-- Migration 047: Invoice Payment Analytics
-- Description: Track invoice payment patterns for ML-based payment predictions
-- Created: 2025-01-20

-- =====================================================
-- TABLE: invoice_payment_analytics
-- =====================================================
-- Purpose: Store historical payment data for machine learning predictions
-- Auto-populated via trigger when invoice payments are recorded

CREATE TABLE IF NOT EXISTS invoice_payment_analytics (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Date Information
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE NOT NULL,

  -- Payment Terms & Amount
  payment_terms INTEGER, -- Days (e.g., 30 for Net 30)
  invoice_amount DECIMAL(12, 2) NOT NULL,

  -- Payment Analysis (calculated fields)
  days_to_payment INTEGER NOT NULL, -- paid_date - invoice_date
  days_from_due INTEGER NOT NULL, -- paid_date - due_date (negative = early, positive = late)
  was_early BOOLEAN GENERATED ALWAYS AS (paid_date < due_date) STORED,
  was_late BOOLEAN GENERATED ALWAYS AS (paid_date > due_date) STORED,
  was_on_time BOOLEAN GENERATED ALWAYS AS (paid_date = due_date) STORED,

  -- ML Features
  payment_score DECIMAL(5, 2), -- 0-100 score for prediction quality

  -- Context
  invoice_status_at_payment VARCHAR(50),
  payment_amount DECIMAL(12, 2), -- Actual payment amount (may differ from invoice)
  was_partial_payment BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_invoice_payment_analytics_tenant
  ON invoice_payment_analytics(tenant_id);

CREATE INDEX idx_invoice_payment_analytics_client
  ON invoice_payment_analytics(client_id);

CREATE INDEX idx_invoice_payment_analytics_dates
  ON invoice_payment_analytics(tenant_id, paid_date DESC);

CREATE INDEX idx_invoice_payment_analytics_performance
  ON invoice_payment_analytics(client_id, was_late, days_to_payment);

-- =====================================================
-- TRIGGER FUNCTION: Auto-populate payment analytics
-- =====================================================

CREATE OR REPLACE FUNCTION populate_invoice_payment_analytics()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice RECORD;
  v_client RECORD;
  v_total_paid DECIMAL(12, 2);
BEGIN
  -- Get invoice details
  SELECT
    i.*,
    c.default_payment_terms
  INTO v_invoice
  FROM invoices i
  LEFT JOIN clients c ON i.client_id = c.id
  WHERE i.id = NEW.invoice_id;

  -- Only create analytics for the FINAL payment (when invoice is marked as paid)
  -- Calculate total amount paid
  SELECT COALESCE(SUM(amount), 0) + NEW.amount INTO v_total_paid
  FROM invoice_payments
  WHERE invoice_id = NEW.invoice_id
    AND id != NEW.id; -- Exclude current payment

  -- Check if this payment completes the invoice
  IF v_total_paid >= v_invoice.total_amount THEN
    INSERT INTO invoice_payment_analytics (
      tenant_id,
      invoice_id,
      client_id,
      invoice_date,
      due_date,
      paid_date,
      payment_terms,
      invoice_amount,
      days_to_payment,
      days_from_due,
      invoice_status_at_payment,
      payment_amount,
      was_partial_payment
    )
    VALUES (
      v_invoice.tenant_id,
      v_invoice.id,
      v_invoice.client_id,
      v_invoice.invoice_date,
      v_invoice.due_date,
      NEW.payment_date,
      v_invoice.payment_terms,
      v_invoice.total_amount,
      NEW.payment_date - v_invoice.invoice_date, -- days_to_payment
      NEW.payment_date - v_invoice.due_date, -- days_from_due
      v_invoice.status,
      v_total_paid,
      v_total_paid < v_invoice.total_amount
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: Auto-populate on payment
-- =====================================================

DROP TRIGGER IF EXISTS trigger_populate_payment_analytics ON invoice_payments;

CREATE TRIGGER trigger_populate_payment_analytics
  AFTER INSERT ON invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION populate_invoice_payment_analytics();

-- =====================================================
-- VIEW: Payment Prediction Readiness
-- =====================================================
-- Purpose: Track when tenant has enough data for ML predictions

CREATE OR REPLACE VIEW payment_prediction_readiness AS
SELECT
  tenant_id,
  COUNT(*) AS total_paid_invoices,
  COUNT(DISTINCT client_id) AS clients_with_payment_history,
  ROUND(AVG(days_to_payment), 1) AS avg_days_to_payment,
  ROUND(AVG(CASE WHEN was_late THEN 1 ELSE 0 END) * 100, 1) AS late_payment_percentage,
  MIN(paid_date) AS earliest_payment,
  MAX(paid_date) AS latest_payment,
  ROUND(
    EXTRACT(EPOCH FROM (MAX(paid_date) - MIN(paid_date))) / 86400 / 30.44,
    1
  ) AS months_of_history,
  CASE
    WHEN COUNT(*) >= 200 AND EXTRACT(EPOCH FROM (MAX(paid_date) - MIN(paid_date))) / 86400 / 30.44 >= 6
      THEN 'production_ready'
    WHEN COUNT(*) >= 50 AND EXTRACT(EPOCH FROM (MAX(paid_date) - MIN(paid_date))) / 86400 / 30.44 >= 3
      THEN 'minimum_viable'
    ELSE 'not_ready'
  END AS readiness_status,
  CASE
    WHEN COUNT(*) >= 200 THEN 0
    ELSE 200 - COUNT(*)
  END AS invoices_until_production_ready
FROM invoice_payment_analytics
GROUP BY tenant_id;

-- =====================================================
-- VIEW: Client Payment Patterns
-- =====================================================
-- Purpose: Analyze payment behavior per client for smart predictions

CREATE OR REPLACE VIEW client_payment_patterns AS
SELECT
  tenant_id,
  client_id,
  COUNT(*) AS total_invoices_paid,
  ROUND(AVG(days_to_payment), 1) AS avg_days_to_payment,
  ROUND(STDDEV(days_to_payment), 1) AS stddev_days_to_payment,
  ROUND(AVG(days_from_due), 1) AS avg_days_from_due,
  ROUND(AVG(CASE WHEN was_early THEN 1 ELSE 0 END) * 100, 1) AS early_payment_rate,
  ROUND(AVG(CASE WHEN was_on_time THEN 1 ELSE 0 END) * 100, 1) AS on_time_payment_rate,
  ROUND(AVG(CASE WHEN was_late THEN 1 ELSE 0 END) * 100, 1) AS late_payment_rate,
  MIN(paid_date) AS first_payment_date,
  MAX(paid_date) AS most_recent_payment_date,
  -- Reliability score (0-100, higher is more reliable)
  ROUND(
    (AVG(CASE WHEN was_early OR was_on_time THEN 1 ELSE 0 END) * 50) +
    (50 - LEAST(50, ABS(AVG(days_from_due)) * 2)),
    1
  ) AS reliability_score,
  -- Sample size quality
  CASE
    WHEN COUNT(*) >= 20 THEN 'high'
    WHEN COUNT(*) >= 10 THEN 'medium'
    WHEN COUNT(*) >= 3 THEN 'low'
    ELSE 'insufficient'
  END AS sample_quality
FROM invoice_payment_analytics
GROUP BY tenant_id, client_id;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE invoice_payment_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their tenant's payment analytics
CREATE POLICY "Users can view their tenant's payment analytics"
  ON invoice_payment_analytics
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Note: No INSERT/UPDATE/DELETE policies - table is auto-populated via trigger

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE invoice_payment_analytics IS 'Historical payment patterns for ML-based payment predictions';
COMMENT ON COLUMN invoice_payment_analytics.days_to_payment IS 'Days from invoice date to payment date';
COMMENT ON COLUMN invoice_payment_analytics.days_from_due IS 'Days from due date to payment (negative=early, positive=late)';
COMMENT ON COLUMN invoice_payment_analytics.payment_score IS 'ML prediction quality score (0-100)';
COMMENT ON VIEW payment_prediction_readiness IS 'Tracks when tenant has enough payment data for ML predictions';
COMMENT ON VIEW client_payment_patterns IS 'Payment behavior analysis per client for smart forecasting';
