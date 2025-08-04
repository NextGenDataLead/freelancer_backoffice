-- Migration: Setup vector database and storage
-- Created: 2025-08-02
-- Description: Enable vector extension, create documents table, and setup storage policies

BEGIN;

-- Enable pgvector extension for AI features
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Documents table with embeddings for future AI features
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 dimension
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optimized vector index
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Regular indexes
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON documents(organization_id);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy for documents
CREATE POLICY "documents_tenant_isolation" ON documents
  FOR ALL TO authenticated
  USING (tenant_id = get_current_tenant_id());

-- Add updated_at trigger for documents
CREATE TRIGGER update_documents_updated_at 
  BEFORE UPDATE ON documents
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage buckets (Note: This might need to be run manually in Supabase dashboard)
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('avatars', 'avatars', true),
  ('documents', 'documents', false),
  ('exports', 'gdpr-exports', false)
ON CONFLICT (id) DO NOTHING;

COMMIT;