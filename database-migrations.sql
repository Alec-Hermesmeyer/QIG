-- Database migrations for client configuration management
-- Run these in your Supabase SQL editor

-- 1. Create client_configurations table
CREATE TABLE IF NOT EXISTS client_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL,
    client_type VARCHAR(50) NOT NULL CHECK (client_type IN ('default', 'premium', 'enterprise', 'custom')),
    
    -- Backend configuration (JSONB for flexibility)
    backend_config JSONB NOT NULL DEFAULT '{}',
    
    -- Azure configuration (JSONB for flexibility)
    azure_config JSONB NOT NULL DEFAULT '{}',
    
    -- Feature flags (JSONB for flexibility)
    features JSONB NOT NULL DEFAULT '{}',
    
    -- UI configuration (JSONB for flexibility)
    ui_config JSONB NOT NULL DEFAULT '{}',
    
    -- Rate limiting and quotas (JSONB for flexibility)
    limits JSONB NOT NULL DEFAULT '{}',
    
    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    environment VARCHAR(50) NOT NULL DEFAULT 'development' CHECK (environment IN ('development', 'staging', 'production')),
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one active config per organization per environment
    UNIQUE(organization_id, environment, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- 2. Create client_secrets table for encrypted sensitive data
CREATE TABLE IF NOT EXISTS client_secrets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_config_id UUID NOT NULL REFERENCES client_configurations(id) ON DELETE CASCADE,
    secret_name VARCHAR(255) NOT NULL,
    encrypted_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Ensure unique secret names per config
    UNIQUE(client_config_id, secret_name)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_configurations_org_id ON client_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_configurations_active ON client_configurations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_client_configurations_environment ON client_configurations(environment);
CREATE INDEX IF NOT EXISTS idx_client_secrets_config_id ON client_secrets(client_config_id);
CREATE INDEX IF NOT EXISTS idx_client_secrets_expires_at ON client_secrets(expires_at) WHERE expires_at IS NOT NULL;

-- 4. Add RLS (Row Level Security) policies
ALTER TABLE client_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_secrets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their organization's configurations
CREATE POLICY "Users can access their organization's configurations" ON client_configurations
    FOR ALL USING (
        organization_id IN (
            SELECT p.organization_id 
            FROM profiles p 
            WHERE p.id = auth.uid()
        )
    );

-- Policy: Users can only access secrets for their organization's configurations
CREATE POLICY "Users can access their organization's secrets" ON client_secrets
    FOR ALL USING (
        client_config_id IN (
            SELECT cc.id 
            FROM client_configurations cc
            INNER JOIN profiles p ON p.organization_id = cc.organization_id
            WHERE p.id = auth.uid()
        )
    );

-- 5. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Create trigger for auto-updating updated_at
CREATE TRIGGER update_client_configurations_updated_at 
    BEFORE UPDATE ON client_configurations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Insert some default configurations (optional)
-- You can modify these based on your actual organizations
INSERT INTO client_configurations (
    organization_id,
    client_name,
    client_type,
    backend_config,
    azure_config,
    features,
    ui_config,
    limits,
    environment,
    created_by
) VALUES 
-- Example default configuration
(
    (SELECT id FROM organizations WHERE name = 'Default Organization' LIMIT 1),
    'Default Client',
    'default',
    '{"api_url": "https://capps-backend-vakcnm7wmon74.salmonbush-fc2963f0.eastus.azurecontainerapps.io", "chat_endpoint": "/chat", "content_endpoint": "/content", "analyze_endpoint": "/analyze"}',
    '{"tenant_id": "", "client_id": "", "scope": "/.default"}',
    '{"hands_free_chat": false, "document_analysis": true, "contract_search": true, "custom_branding": false, "advanced_analytics": false}',
    '{"theme_primary_color": "#3b82f6", "theme_secondary_color": "#64748b"}',
    '{"requests_per_minute": 60, "requests_per_day": 1000, "max_file_size_mb": 10, "max_concurrent_sessions": 5}',
    'production',
    (SELECT id FROM profiles LIMIT 1)
) ON CONFLICT DO NOTHING;

-- 8. Create function to get client configuration with secrets (for server-side use)
CREATE OR REPLACE FUNCTION get_client_config_with_secrets(org_id UUID, env TEXT DEFAULT 'production')
RETURNS TABLE (
    config_id UUID,
    organization_id UUID,
    client_name VARCHAR(255),
    client_type VARCHAR(50),
    backend_config JSONB,
    azure_config JSONB,
    features JSONB,
    ui_config JSONB,
    limits JSONB,
    secrets JSONB
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH config_data AS (
        SELECT cc.*
        FROM client_configurations cc
        WHERE cc.organization_id = org_id 
        AND cc.environment = env
        AND cc.is_active = true
        LIMIT 1
    ),
    secrets_data AS (
        SELECT 
            cd.id as config_id,
            COALESCE(
                jsonb_object_agg(cs.secret_name, cs.encrypted_value) FILTER (WHERE cs.secret_name IS NOT NULL),
                '{}'::jsonb
            ) as secrets
        FROM config_data cd
        LEFT JOIN client_secrets cs ON cs.client_config_id = cd.id
        WHERE cs.expires_at IS NULL OR cs.expires_at > NOW()
        GROUP BY cd.id
    )
    SELECT 
        cd.id,
        cd.organization_id,
        cd.client_name,
        cd.client_type,
        cd.backend_config,
        cd.azure_config,
        cd.features,
        cd.ui_config,
        cd.limits,
        COALESCE(sd.secrets, '{}'::jsonb)
    FROM config_data cd
    LEFT JOIN secrets_data sd ON sd.config_id = cd.id;
END;
$$; 