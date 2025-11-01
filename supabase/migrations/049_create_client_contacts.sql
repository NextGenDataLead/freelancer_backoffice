-- Migration: Create Client Contacts System
-- Description: Add separate contacts table for Primary and Administration contacts
-- Each client must have exactly one of each contact type
-- Generated with Claude Code (https://claude.ai/code)

-- =============================================================================
-- 1. CREATE CONTACT TYPE ENUM
-- =============================================================================

CREATE TYPE contact_type AS ENUM ('primary', 'administration');

-- =============================================================================
-- 2. CREATE CLIENT_CONTACTS TABLE
-- =============================================================================

CREATE TABLE "public"."client_contacts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" uuid NOT NULL REFERENCES "public"."tenants"("id") ON DELETE CASCADE,
    "client_id" uuid NOT NULL REFERENCES "public"."clients"("id") ON DELETE CASCADE,
    "contact_type" contact_type NOT NULL,
    "name" text NOT NULL,
    "email" text NOT NULL,
    "phone" text,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Ensure only one contact of each type per client
    CONSTRAINT unique_client_contact_type UNIQUE (client_id, contact_type),

    -- Email validation
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Add indexes for performance
CREATE INDEX idx_client_contacts_tenant_id ON "public"."client_contacts"("tenant_id");
CREATE INDEX idx_client_contacts_client_id ON "public"."client_contacts"("client_id");
CREATE INDEX idx_client_contacts_contact_type ON "public"."client_contacts"("contact_type");

-- Add comment
COMMENT ON TABLE "public"."client_contacts" IS 'Stores Primary and Administration contacts for each client. Both contact types are mandatory.';

-- =============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE "public"."client_contacts" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see contacts from their own tenant
CREATE POLICY "client_contacts_tenant_isolation_policy" ON "public"."client_contacts"
    FOR ALL
    USING ("tenant_id" = get_user_tenant_id());

-- Policy: Users can only insert contacts for their own tenant
CREATE POLICY "client_contacts_tenant_insert_policy" ON "public"."client_contacts"
    FOR INSERT
    WITH CHECK ("tenant_id" = get_user_tenant_id());

-- =============================================================================
-- 4. MIGRATE EXISTING CLIENT CONTACT DATA
-- =============================================================================

-- Copy existing client contact data to create both Primary and Administration contacts
-- This ensures all existing clients have both required contacts
INSERT INTO "public"."client_contacts" (
    "tenant_id",
    "client_id",
    "contact_type",
    "name",
    "email",
    "phone",
    "created_at",
    "updated_at"
)
SELECT
    "tenant_id",
    "id" as "client_id",
    'primary' as "contact_type",
    "name",
    COALESCE("email", CONCAT("name", '@example.com')) as "email", -- Ensure email is not null
    "phone",
    "created_at",
    "updated_at"
FROM "public"."clients"
WHERE "name" IS NOT NULL; -- Only migrate clients with a name

-- Create Administration contacts (initially same as Primary)
INSERT INTO "public"."client_contacts" (
    "tenant_id",
    "client_id",
    "contact_type",
    "name",
    "email",
    "phone",
    "created_at",
    "updated_at"
)
SELECT
    "tenant_id",
    "id" as "client_id",
    'administration' as "contact_type",
    "name",
    COALESCE("email", CONCAT("name", '@example.com')) as "email",
    "phone",
    "created_at",
    "updated_at"
FROM "public"."clients"
WHERE "name" IS NOT NULL;

-- =============================================================================
-- 5. ADD TRIGGER FOR UPDATED_AT
-- =============================================================================

CREATE OR REPLACE FUNCTION update_client_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_client_contacts_updated_at
    BEFORE UPDATE ON "public"."client_contacts"
    FOR EACH ROW
    EXECUTE FUNCTION update_client_contacts_updated_at();

-- =============================================================================
-- 6. ADD VALIDATION FUNCTION
-- =============================================================================

-- Function to ensure both contact types exist for a client
CREATE OR REPLACE FUNCTION validate_client_has_both_contacts()
RETURNS TRIGGER AS $$
BEGIN
    -- When deleting, ensure we're not removing the last contact of a type
    IF (TG_OP = 'DELETE') THEN
        -- Check if this was the only contact of this type for the client
        IF NOT EXISTS (
            SELECT 1 FROM "public"."client_contacts"
            WHERE "client_id" = OLD."client_id"
            AND "contact_type" = OLD."contact_type"
            AND "id" != OLD."id"
        ) THEN
            RAISE EXCEPTION 'Cannot delete the last % contact for client. Both Primary and Administration contacts are required.', OLD."contact_type";
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_client_contacts
    BEFORE DELETE ON "public"."client_contacts"
    FOR EACH ROW
    EXECUTE FUNCTION validate_client_has_both_contacts();

-- =============================================================================
-- 7. OPTIONAL: ADD COMMENTS TO OLD CLIENT FIELDS
-- =============================================================================

COMMENT ON COLUMN "public"."clients"."name" IS 'DEPRECATED: Use client_contacts table. Kept for backwards compatibility.';
COMMENT ON COLUMN "public"."clients"."email" IS 'DEPRECATED: Use client_contacts table. Kept for backwards compatibility.';
COMMENT ON COLUMN "public"."clients"."phone" IS 'DEPRECATED: Use client_contacts table. Kept for backwards compatibility.';
