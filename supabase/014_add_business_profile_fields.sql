-- Add missing business profile fields to profiles table
-- Generated with Claude Code (https://claude.ai/code)

-- Add address and contact information fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) DEFAULT 'NL',
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS website TEXT;

-- Add invoice defaults fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS default_payment_terms INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS late_payment_interest NUMERIC(5,2) DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS default_invoice_description TEXT,
ADD COLUMN IF NOT EXISTS custom_footer_text TEXT,
ADD COLUMN IF NOT EXISTS terms_conditions TEXT;

-- Add constraints
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_default_payment_terms_check 
  CHECK (default_payment_terms > 0 AND default_payment_terms <= 365);

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_late_payment_interest_check 
  CHECK (late_payment_interest >= 0 AND late_payment_interest <= 50);

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_country_code_check 
  CHECK (country_code ~ '^[A-Z]{2}$');

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.address IS 'Business street address';
COMMENT ON COLUMN public.profiles.postal_code IS 'Business postal/ZIP code';
COMMENT ON COLUMN public.profiles.city IS 'Business city';
COMMENT ON COLUMN public.profiles.country_code IS 'ISO 3166-1 alpha-2 country code';
COMMENT ON COLUMN public.profiles.phone IS 'Business phone number';
COMMENT ON COLUMN public.profiles.website IS 'Business website URL';
COMMENT ON COLUMN public.profiles.default_payment_terms IS 'Default payment terms in days';
COMMENT ON COLUMN public.profiles.late_payment_interest IS 'Late payment interest rate per month (%)';
COMMENT ON COLUMN public.profiles.default_invoice_description IS 'Default description for new invoices';
COMMENT ON COLUMN public.profiles.custom_footer_text IS 'Custom footer text for invoices';
COMMENT ON COLUMN public.profiles.terms_conditions IS 'Terms and conditions text';