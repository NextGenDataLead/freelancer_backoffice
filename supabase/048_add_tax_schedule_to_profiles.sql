-- Migration 048: Add Tax Schedule Fields to Profiles
-- Description: Add configurable tax payment schedules to improve cash flow forecasting
-- Created: 2025-01-20

-- =====================================================
-- EXTEND: profiles table with tax schedule configuration
-- =====================================================

-- VAT/BTW Filing Configuration
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS vat_filing_frequency VARCHAR(20) DEFAULT 'quarterly'
    CHECK (vat_filing_frequency IN ('monthly', 'quarterly'));

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS vat_payment_day INTEGER DEFAULT 25
    CHECK (vat_payment_day BETWEEN 1 AND 31);

-- Income Tax Configuration
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS income_tax_payment_schedule JSONB DEFAULT '{"frequency": "quarterly", "months": [3, 6, 9, 12]}'::jsonb;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS estimated_annual_tax_rate DECIMAL(5, 2) DEFAULT 21.00
    CHECK (estimated_annual_tax_rate BETWEEN 0 AND 100);

-- Social Security Contributions (Dutch: ZVW, AOW)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS social_security_payment_schedule JSONB DEFAULT '{"frequency": "quarterly", "months": [3, 6, 9, 12]}'::jsonb;

-- Tax Year Configuration
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS fiscal_year_end_month INTEGER DEFAULT 12
    CHECK (fiscal_year_end_month BETWEEN 1 AND 12);

-- Cash Flow Settings
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cash_flow_forecast_days INTEGER DEFAULT 90
    CHECK (cash_flow_forecast_days BETWEEN 30 AND 365);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cash_flow_confidence_threshold DECIMAL(3, 2) DEFAULT 0.70
    CHECK (cash_flow_confidence_threshold BETWEEN 0 AND 1);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN profiles.vat_filing_frequency IS 'How often VAT is filed: monthly (for businesses >€1.5M) or quarterly (default)';
COMMENT ON COLUMN profiles.vat_payment_day IS 'Day of month after period end when VAT payment is due (default 25th)';
COMMENT ON COLUMN profiles.income_tax_payment_schedule IS 'JSON config for income tax advance payments (quarterly default)';
COMMENT ON COLUMN profiles.estimated_annual_tax_rate IS 'Estimated effective tax rate for cash flow forecasting (%)';
COMMENT ON COLUMN profiles.social_security_payment_schedule IS 'JSON config for ZVW/AOW payment schedule';
COMMENT ON COLUMN profiles.fiscal_year_end_month IS 'Month when fiscal year ends (1-12, default 12 for calendar year)';
COMMENT ON COLUMN profiles.cash_flow_forecast_days IS 'Number of days to forecast in cash flow predictions (default 90)';
COMMENT ON COLUMN profiles.cash_flow_confidence_threshold IS 'Minimum confidence level for cash flow predictions (0-1, default 0.70)';

-- =====================================================
-- HELPER FUNCTION: Get next VAT payment date
-- =====================================================

CREATE OR REPLACE FUNCTION get_next_vat_payment_date(
  p_tenant_id UUID,
  p_from_date DATE DEFAULT CURRENT_DATE
)
RETURNS DATE AS $$
DECLARE
  v_frequency VARCHAR(20);
  v_payment_day INTEGER;
  v_next_date DATE;
  v_current_month INTEGER;
  v_quarter_end_month INTEGER;
BEGIN
  -- Get user's VAT settings
  SELECT vat_filing_frequency, vat_payment_day
  INTO v_frequency, v_payment_day
  FROM profiles
  WHERE tenant_id = p_tenant_id
  LIMIT 1;

  -- Default to quarterly on 25th if not configured
  v_frequency := COALESCE(v_frequency, 'quarterly');
  v_payment_day := COALESCE(v_payment_day, 25);

  v_current_month := EXTRACT(MONTH FROM p_from_date);

  IF v_frequency = 'monthly' THEN
    -- Payment due on payment_day of following month
    v_next_date := DATE_TRUNC('month', p_from_date) + INTERVAL '1 month';
    v_next_date := v_next_date + (v_payment_day - 1 || ' days')::INTERVAL;
  ELSE
    -- Quarterly: find next quarter end (March=3, June=6, Sept=9, Dec=12)
    v_quarter_end_month := CASE
      WHEN v_current_month <= 3 THEN 3
      WHEN v_current_month <= 6 THEN 6
      WHEN v_current_month <= 9 THEN 9
      ELSE 12
    END;

    -- If we're past the quarter end, move to next quarter
    IF v_current_month >= v_quarter_end_month THEN
      v_quarter_end_month := v_quarter_end_month + 3;
      IF v_quarter_end_month > 12 THEN
        v_quarter_end_month := 3;
      END IF;
    END IF;

    -- Payment due payment_day of month following quarter end
    v_next_date := MAKE_DATE(
      EXTRACT(YEAR FROM p_from_date)::INTEGER,
      v_quarter_end_month,
      1
    ) + INTERVAL '1 month' + (v_payment_day - 1 || ' days')::INTERVAL;
  END IF;

  RETURN v_next_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- HELPER FUNCTION: Calculate all VAT payment dates in range
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_vat_payment_dates(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(payment_date DATE, period_label TEXT) AS $$
DECLARE
  v_frequency VARCHAR(20);
  v_payment_day INTEGER;
  v_current_date DATE;
  v_period TEXT;
BEGIN
  -- Get user's VAT settings
  SELECT vat_filing_frequency, vat_payment_day
  INTO v_frequency, v_payment_day
  FROM profiles
  WHERE tenant_id = p_tenant_id
  LIMIT 1;

  v_frequency := COALESCE(v_frequency, 'quarterly');
  v_payment_day := COALESCE(v_payment_day, 25);

  v_current_date := p_start_date;

  WHILE v_current_date <= p_end_date LOOP
    payment_date := get_next_vat_payment_date(p_tenant_id, v_current_date);

    IF payment_date > p_end_date THEN
      EXIT;
    END IF;

    -- Generate period label
    IF v_frequency = 'monthly' THEN
      v_period := TO_CHAR(payment_date - INTERVAL '1 month', 'Month YYYY');
    ELSE
      v_period := 'Q' || EXTRACT(QUARTER FROM payment_date - INTERVAL '1 month') || ' ' || EXTRACT(YEAR FROM payment_date - INTERVAL '1 month');
    END IF;

    period_label := v_period;

    RETURN NEXT;

    -- Move to next period
    IF v_frequency = 'monthly' THEN
      v_current_date := v_current_date + INTERVAL '1 month';
    ELSE
      v_current_date := v_current_date + INTERVAL '3 months';
    END IF;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- COMMENTS ON FUNCTIONS
-- =====================================================

COMMENT ON FUNCTION get_next_vat_payment_date IS 'Returns next VAT payment date based on user frequency settings';
COMMENT ON FUNCTION calculate_vat_payment_dates IS 'Returns all VAT payment dates in a given date range';
