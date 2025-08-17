-- Migration: Create documents table with vector embeddings
-- This creates the documents table for AI/ML features with vector search capabilities

-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table for AI/ML document storage and search
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    organization_id UUID REFERENCES organizations(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- OpenAI embeddings dimension
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at);

-- Create vector similarity search index
CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
CREATE POLICY "documents_select_policy" ON documents
FOR SELECT
TO authenticated
USING (tenant_id = get_current_tenant_id());

CREATE POLICY "documents_insert_policy" ON documents
FOR INSERT
TO authenticated
WITH CHECK (tenant_id = get_current_tenant_id() AND can_create_data());

CREATE POLICY "documents_update_policy" ON documents
FOR UPDATE
TO authenticated
USING (tenant_id = get_current_tenant_id())
WITH CHECK (tenant_id = get_current_tenant_id() AND can_create_data());

CREATE POLICY "documents_delete_policy" ON documents
FOR DELETE
TO authenticated
USING (tenant_id = get_current_tenant_id());