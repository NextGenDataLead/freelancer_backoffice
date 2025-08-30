-- Migration: Dutch fiscal-compliant expense categories (FIXED VERSION)
-- Replaces generic expense categories with Dutch tax law compliant categories for ZZP'ers
-- Fixed: Adds metadata column first, then populates Dutch categories

-- First, add the metadata column to expense_categories if it doesn't exist
ALTER TABLE expense_categories 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add indexes for metadata column
CREATE INDEX IF NOT EXISTS idx_expense_categories_metadata ON expense_categories USING GIN (metadata);

-- Function to seed Dutch fiscal expense categories for a tenant
CREATE OR REPLACE FUNCTION seed_dutch_fiscal_expense_categories(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
    -- Clear existing system categories (keep user-created ones)
    DELETE FROM expense_categories 
    WHERE tenant_id = p_tenant_id 
    AND (metadata->>'is_system')::boolean = true;

    -- Insert Dutch fiscal-compliant categories
    INSERT INTO expense_categories (tenant_id, name, description, expense_type, is_active, parent_category_id, metadata) VALUES
    
    -- 1. Kantoorkosten (Office costs) - 21% VAT, fully deductible
    (p_tenant_id, 'Kantoorkosten', 'Algemene kantoorkosten zoals bureaubenodigdheden, papier, pennen', 'office_supplies', true, null, 
     jsonb_build_object('is_system', true, 'default_vat_rate', 0.21, 'vat_deductible', true, 'business_percentage', 100, 'description_nl', 'Kantoorartikelen en algemene kantoorkosten')),
    
    -- 2. Auto en vervoer (Car and transport) - 21% VAT, business portion deductible
    (p_tenant_id, 'Auto en vervoer', 'Brandstof, parkeerkosten, onderhoud, verzekering auto', 'travel', true, null,
     jsonb_build_object('is_system', true, 'default_vat_rate', 0.21, 'vat_deductible', true, 'business_percentage', 100, 'requires_business_split', true, 'description_nl', 'Autokosten en vervoerskosten voor zakelijk gebruik')),
    
    -- 3. Reis- en verblijfkosten (Travel and accommodation) - 21% VAT, business only
    (p_tenant_id, 'Reis- en verblijfkosten', 'Hotels, treintickets, vliegtickets, taxi voor zakelijke reizen', 'travel', true, null,
     jsonb_build_object('is_system', true, 'default_vat_rate', 0.21, 'vat_deductible', true, 'business_percentage', 100, 'description_nl', 'Kosten voor zakelijke reizen en verblijf')),
    
    -- 4. Representatie (Business entertainment) - 21% VAT, limited deductibility
    (p_tenant_id, 'Representatie', 'Zakelijke diners, relatiegeschenken (let op: beperkte aftrekbaarheid BTW)', 'meals', true, null,
     jsonb_build_object('is_system', true, 'default_vat_rate', 0.21, 'vat_deductible', false, 'business_percentage', 100, 'vat_note', 'BTW op representatie is niet aftrekbaar', 'description_nl', 'Representatiekosten en zakelijke entertainment')),
    
    -- 5. Telefoon en internet (Phone and internet) - 21% VAT, business portion
    (p_tenant_id, 'Telefoon en internet', 'Telefoonkosten, internetabonnement, mobiele telefoon', 'utilities', true, null,
     jsonb_build_object('is_system', true, 'default_vat_rate', 0.21, 'vat_deductible', true, 'business_percentage', 80, 'requires_business_split', true, 'description_nl', 'Telecommunicatie en internetkosten')),
    
    -- 6. Vakliteratuur en cursussen (Professional literature and courses)
    (p_tenant_id, 'Vakliteratuur en cursussen', 'Vakboeken, tijdschriften, online cursussen, conferenties', 'professional', true, null,
     jsonb_build_object('is_system', true, 'default_vat_rate', 0.21, 'vat_deductible', true, 'business_percentage', 100, 'note', 'Boeken kunnen 9% BTW hebben', 'description_nl', 'Professionele ontwikkeling en vakliteratuur')),
    
    -- 7. Verzekeringen (Insurance) - Often 21% VAT, business portion
    (p_tenant_id, 'Verzekeringen', 'Bedrijfsaansprakelijkheid, rechtsbijstand, beroepsaansprakelijkheid', 'professional', true, null,
     jsonb_build_object('is_system', true, 'default_vat_rate', 0.21, 'vat_deductible', true, 'business_percentage', 100, 'note', 'Sommige verzekeringen zijn BTW-vrijgesteld', 'description_nl', 'Zakelijke verzekeringen en aansprakelijkheid')),
    
    -- 8. Accountant en administratie (Accountant and administration) - 21% VAT
    (p_tenant_id, 'Accountant en administratie', 'Kosten accountant, boekhoudsoftware, administratiekantoor', 'professional', true, null,
     jsonb_build_object('is_system', true, 'default_vat_rate', 0.21, 'vat_deductible', true, 'business_percentage', 100, 'description_nl', 'Kosten voor accountancy en administratie')),
    
    -- 9. Marketing en website (Marketing and website) - 21% VAT
    (p_tenant_id, 'Marketing en website', 'Website ontwikkeling, online advertenties, visitekaartjes, LinkedIn premium', 'marketing', true, null,
     jsonb_build_object('is_system', true, 'default_vat_rate', 0.21, 'vat_deductible', true, 'business_percentage', 100, 'description_nl', 'Marketing en promotionele uitgaven')),
    
    -- 10. Kantoor aan huis (Home office) - Special ZZP rules, mixed rates
    (p_tenant_id, 'Kantoor aan huis', 'Huur, gas, water, licht, internet (zakelijk gedeelte thuiswerkplek)', 'utilities', true, null,
     jsonb_build_object('is_system', true, 'default_vat_rate', 0.21, 'vat_deductible', true, 'business_percentage', 20, 'requires_business_split', true, 'special_rules', true, 'description_nl', 'Huisvestingskosten kantoor aan huis', 'note', 'Bijzondere regels voor ZZP''ers - raadpleeg accountant')),

    -- 11. Software en licenties (Software and licenses) - 21% VAT
    (p_tenant_id, 'Software en licenties', 'SaaS abonnementen, software licenties, cloud services', 'software', true, null,
     jsonb_build_object('is_system', true, 'default_vat_rate', 0.21, 'vat_deductible', true, 'business_percentage', 100, 'description_nl', 'Software en digitale diensten')),

    -- 12. Bank- en financieringskosten (Banking and financing costs) - Often VAT exempt
    (p_tenant_id, 'Bank- en financieringskosten', 'Bankkosten, rente, transactiekosten', 'other', true, null,
     jsonb_build_object('is_system', true, 'default_vat_rate', 0.0, 'vat_deductible', false, 'business_percentage', 100, 'vat_type', 'exempt', 'description_nl', 'Bank en financieringskosten')),

    -- 13. EU zakelijke inkopen (EU business purchases) - Reverse charge
    (p_tenant_id, 'EU zakelijke inkopen', 'Inkopen van EU leveranciers met BTW nummer (BTW verlegd)', 'other', true, null,
     jsonb_build_object('is_system', true, 'default_vat_rate', 0.0, 'vat_deductible', true, 'business_percentage', 100, 'vat_type', 'reverse_charge', 'requires_vat_number', true, 'description_nl', 'EU B2B inkopen met verlegging van BTW'));

    -- Log the seeding operation (only if financial_logs table exists)
    BEGIN
        INSERT INTO financial_logs (tenant_id, entity_type, entity_id, action_type, performed_by, new_values)
        VALUES (p_tenant_id, 'expense_categories', 'system', 'dutch_categories_seeded', 'system', 
                jsonb_build_object('categories_created', 13, 'category_type', 'dutch_fiscal'));
    EXCEPTION WHEN undefined_table THEN
        -- Ignore if financial_logs table doesn't exist
        NULL;
    END;
END;
$$ LANGUAGE plpgsql;

-- Update the existing seed function to use Dutch categories by default
CREATE OR REPLACE FUNCTION seed_default_expense_categories(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
    -- Use Dutch fiscal categories instead of generic ones
    PERFORM seed_dutch_fiscal_expense_categories(p_tenant_id);
END;
$$ LANGUAGE plpgsql;

-- Add indexes for efficient category lookups by metadata (now that metadata column exists)
CREATE INDEX IF NOT EXISTS idx_expense_categories_system ON expense_categories(tenant_id) WHERE (metadata->>'is_system')::boolean = true;
CREATE INDEX IF NOT EXISTS idx_expense_categories_vat_rate ON expense_categories(tenant_id, ((metadata->>'default_vat_rate')::decimal));
CREATE INDEX IF NOT EXISTS idx_expense_categories_business_split ON expense_categories(tenant_id) WHERE (metadata->>'requires_business_split')::boolean = true;

-- Comment for documentation
COMMENT ON COLUMN expense_categories.metadata IS 'JSONB metadata for Dutch fiscal compliance: VAT rates, deductibility, business percentages, and system flags';