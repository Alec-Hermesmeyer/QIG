-- Simple Debug Script - Run each section separately
-- Copy and paste each section ONE AT A TIME

-- === SECTION 1: Check what exists ===
-- Run this first and tell me the output
SELECT 'Current tables:' as info;
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- === SECTION 2: Clean up (only run if needed) ===
-- Uncomment and run if you see any of these tables exist
-- DROP TABLE IF EXISTS client_secrets CASCADE;
-- DROP TABLE IF EXISTS client_configurations CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;
-- DROP TABLE IF EXISTS organizations CASCADE;

-- === SECTION 3: Create organizations table only ===
-- Run this after section 1
CREATE TABLE organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT 'Organizations table created' as status;

-- === SECTION 4: Test organizations table ===
-- Run this after section 3
INSERT INTO organizations (name, description) VALUES 
('Test Organization', 'Test organization');

SELECT 'Data inserted successfully' as status;
SELECT * FROM organizations;

-- === SECTION 5: Create client_configurations table ===
-- Only run this after sections 1-4 work
CREATE TABLE client_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL,
    client_type VARCHAR(50) NOT NULL CHECK (client_type IN ('default', 'premium', 'enterprise', 'custom')),
    backend_config JSONB NOT NULL DEFAULT '{}',
    azure_config JSONB NOT NULL DEFAULT '{}',
    features JSONB NOT NULL DEFAULT '{}',
    ui_config JSONB NOT NULL DEFAULT '{}',
    limits JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    environment VARCHAR(50) NOT NULL DEFAULT 'development' CHECK (environment IN ('development', 'staging', 'production')),
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT 'Client configurations table created' as status;

-- Check if client_configurations exists
SELECT 'Checking client_configurations:' as info;
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'client_configurations';

-- Check table structure if it exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'client_configurations'
ORDER BY ordinal_position; 