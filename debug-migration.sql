-- Debug Migration - Step by step table creation
-- Run this in Supabase SQL Editor to debug the issue

-- 1. First, let's see what tables already exist
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Check if there are any policies that might be interfering
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- 3. Drop any existing policies that might conflict (if they exist)
DROP POLICY IF EXISTS "Users can access their organization's configurations" ON client_configurations;
DROP POLICY IF EXISTS "Users can access their organization's secrets" ON client_secrets;
DROP POLICY IF EXISTS "Users can access their organization" ON organizations;
DROP POLICY IF EXISTS "Users can access profiles in their organization" ON profiles;

-- 4. Drop tables in reverse dependency order (if they exist)
DROP TABLE IF EXISTS client_secrets CASCADE;
DROP TABLE IF EXISTS client_configurations CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- 5. Drop functions if they exist
DROP FUNCTION IF EXISTS get_client_config_with_secrets(UUID, TEXT);
DROP FUNCTION IF EXISTS update_updated_at_column();

-- 6. Now create tables step by step
CREATE TABLE organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create profiles table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    email VARCHAR(255),
    full_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create client_configurations table
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

-- 9. Create client_secrets table
CREATE TABLE client_secrets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_config_id UUID NOT NULL REFERENCES client_configurations(id) ON DELETE CASCADE,
    secret_name VARCHAR(255) NOT NULL,
    encrypted_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(client_config_id, secret_name)
);

-- 10. Create indexes
CREATE INDEX idx_organizations_name ON organizations(name);
CREATE INDEX idx_profiles_org_id ON profiles(organization_id);
CREATE INDEX idx_client_configurations_org_id ON client_configurations(organization_id);
CREATE INDEX idx_client_configurations_active ON client_configurations(is_active) WHERE is_active = true;
CREATE INDEX idx_client_configurations_environment ON client_configurations(environment);
CREATE INDEX idx_client_secrets_config_id ON client_secrets(client_config_id);

-- 11. Create the update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 12. Create triggers
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_configurations_updated_at 
    BEFORE UPDATE ON client_configurations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 13. Insert default organization
INSERT INTO organizations (name, description) VALUES 
('Default Organization', 'Default organization for initial setup');

-- 14. Show what we created
SELECT 'Tables created successfully:' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name; 