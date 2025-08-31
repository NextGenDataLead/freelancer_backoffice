-- Migration: Add OCR metadata fields to expenses table
-- Description: Support OCR processing with confidence scores and manual review flags

-- Add OCR-related fields to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS ocr_confidence_score DECIMAL(3,2);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS ocr_extracted_fields JSONB;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS manual_override_fields JSONB;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS requires_manual_review BOOLEAN DEFAULT FALSE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_likely_foreign_supplier BOOLEAN DEFAULT FALSE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS requires_vat_number BOOLEAN DEFAULT FALSE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS ocr_raw_text TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS processing_engine VARCHAR(50);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_requires_manual_review ON expenses(requires_manual_review) WHERE requires_manual_review = TRUE;
CREATE INDEX IF NOT EXISTS idx_expenses_is_likely_foreign_supplier ON expenses(is_likely_foreign_supplier) WHERE is_likely_foreign_supplier = TRUE;
CREATE INDEX IF NOT EXISTS idx_expenses_ocr_confidence ON expenses(ocr_confidence_score) WHERE ocr_confidence_score IS NOT NULL;

-- Add comments to document the new fields
COMMENT ON COLUMN expenses.ocr_confidence_score IS 'Average confidence score from OCR processing (0.0 to 1.0)';
COMMENT ON COLUMN expenses.ocr_extracted_fields IS 'Raw extracted fields from OCR processing';
COMMENT ON COLUMN expenses.manual_override_fields IS 'Fields that were manually corrected after OCR';
COMMENT ON COLUMN expenses.requires_manual_review IS 'Flag indicating this expense needs manual verification';
COMMENT ON COLUMN expenses.is_likely_foreign_supplier IS 'Flag indicating supplier might be foreign (potential reverse charge)';
COMMENT ON COLUMN expenses.requires_vat_number IS 'Flag indicating foreign supplier VAT number is required';
COMMENT ON COLUMN expenses.ocr_raw_text IS 'Raw text extracted by OCR engine';
COMMENT ON COLUMN expenses.processing_engine IS 'OCR engine used for processing (e.g., PaddleOCR, Tesseract)';

-- Create a view for expenses needing manual review
CREATE OR REPLACE VIEW expenses_requiring_review AS
SELECT 
    e.*,
    CASE 
        WHEN e.requires_manual_review THEN 'Manual Review Required'
        WHEN e.is_likely_foreign_supplier AND e.supplier_vat_number IS NULL THEN 'VAT Number Required'
        WHEN e.ocr_confidence_score < 0.7 THEN 'Low OCR Confidence'
        ELSE 'Ready'
    END AS review_status
FROM expenses e
WHERE 
    e.requires_manual_review = TRUE 
    OR (e.is_likely_foreign_supplier = TRUE AND e.supplier_vat_number IS NULL)
    OR e.ocr_confidence_score < 0.7;

-- Add RLS policy for the new view
CREATE POLICY "Users can view expenses requiring review for their tenant"
    ON expenses_requiring_review FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = expenses_requiring_review.tenant_id
        )
    );

-- Create function to update manual override tracking
CREATE OR REPLACE FUNCTION track_manual_overrides()
RETURNS TRIGGER AS $$
BEGIN
    -- If OCR extracted data exists and fields are being changed manually
    IF OLD.ocr_extracted_fields IS NOT NULL AND NEW.ocr_extracted_fields IS NOT NULL THEN
        -- Track which fields were manually overridden
        NEW.manual_override_fields = jsonb_build_object(
            'vendor_name_overridden', (OLD.vendor_name != NEW.vendor_name),
            'amount_overridden', (OLD.amount != NEW.amount),
            'vat_amount_overridden', (OLD.vat_amount != NEW.vat_amount),
            'expense_date_overridden', (OLD.expense_date != NEW.expense_date),
            'override_timestamp', NOW()
        );
        
        -- Mark as no longer requiring manual review if it was updated
        NEW.requires_manual_review = FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for manual override tracking
DROP TRIGGER IF EXISTS trigger_track_manual_overrides ON expenses;
CREATE TRIGGER trigger_track_manual_overrides
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION track_manual_overrides();

-- Create function to validate foreign supplier VAT requirements
CREATE OR REPLACE FUNCTION validate_foreign_supplier_vat()
RETURNS TRIGGER AS $$
BEGIN
    -- If marked as likely foreign supplier but no VAT number provided
    IF NEW.is_likely_foreign_supplier = TRUE AND 
       (NEW.supplier_vat_number IS NULL OR NEW.supplier_vat_number = '') THEN
        NEW.requires_vat_number = TRUE;
        NEW.requires_manual_review = TRUE;
    ELSE
        NEW.requires_vat_number = FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for VAT validation
DROP TRIGGER IF EXISTS trigger_validate_foreign_supplier_vat ON expenses;
CREATE TRIGGER trigger_validate_foreign_supplier_vat
    BEFORE INSERT OR UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION validate_foreign_supplier_vat();