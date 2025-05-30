-- Service Mapping Extensions for Multi-Service Architecture
-- Run these migrations after the main database-migrations.sql

-- 1. Create services table to define available services
CREATE TABLE IF NOT EXISTS services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_name VARCHAR(255) NOT NULL UNIQUE,
    service_key VARCHAR(100) NOT NULL UNIQUE, -- URL-friendly key
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Service-specific configuration defaults
    default_features JSONB NOT NULL DEFAULT '{}',
    default_limits JSONB NOT NULL DEFAULT '{}',
    default_ui_config JSONB NOT NULL DEFAULT '{}',
    
    -- Service metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create organization_services junction table (many-to-many)
CREATE TABLE IF NOT EXISTS organization_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    
    -- Service-specific configuration overrides for this organization
    service_config JSONB NOT NULL DEFAULT '{}',
    
    -- Subscription/access metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    access_level VARCHAR(50) NOT NULL DEFAULT 'basic' CHECK (access_level IN ('basic', 'standard', 'premium', 'enterprise')),
    subscription_start DATE,
    subscription_end DATE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique organization-service pairs
    UNIQUE(organization_id, service_id)
);

-- 3. Update client_configurations to include service reference
ALTER TABLE client_configurations 
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE SET NULL;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_services_key ON services(service_key);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_org_services_org_id ON organization_services(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_services_service_id ON organization_services(service_id);
CREATE INDEX IF NOT EXISTS idx_org_services_active ON organization_services(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_client_config_service_id ON client_configurations(service_id);

-- 5. Add RLS policies for new tables
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_services ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read services (public data)
CREATE POLICY "All users can read services" ON services
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policy: Users can only access their organization's service subscriptions
CREATE POLICY "Users can access their organization's services" ON organization_services
    FOR ALL USING (
        organization_id IN (
            SELECT p.organization_id 
            FROM profiles p 
            WHERE p.id = auth.uid()
        )
    );

-- 6. Create triggers for updated_at
CREATE TRIGGER update_services_updated_at 
    BEFORE UPDATE ON services 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_services_updated_at 
    BEFORE UPDATE ON organization_services 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Insert the three main services
INSERT INTO services (service_name, service_key, display_name, description, default_features, default_limits, default_ui_config) VALUES 
(
    'Contract Analyst',
    'contract-analyst',
    'Contract Analyst',
    'AI-powered contract analysis and review platform',
    '{
        "contract_analysis": true,
        "clause_extraction": true,
        "risk_assessment": true,
        "template_matching": true,
        "compliance_checking": true,
        "redline_comparison": true,
        "bulk_processing": false,
        "custom_workflows": false,
        "advanced_analytics": false
    }',
    '{
        "requests_per_minute": 30,
        "requests_per_day": 500,
        "max_file_size_mb": 25,
        "max_concurrent_sessions": 3,
        "contracts_per_month": 100
    }',
    '{
        "theme_primary_color": "#059669",
        "theme_secondary_color": "#064e3b",
        "service_icon": "FileText",
        "sidebar_color": "#065f46"
    }'
),
(
    'Open Records',
    'open-records',
    'Open Records',
    'Public records management and FOIA request processing system',
    '{
        "document_search": true,
        "metadata_extraction": true,
        "redaction_tools": true,
        "foia_processing": true,
        "batch_operations": true,
        "audit_trails": true,
        "public_portal": false,
        "advanced_redaction": false,
        "ml_classification": false
    }',
    '{
        "requests_per_minute": 50,
        "requests_per_day": 800,
        "max_file_size_mb": 100,
        "max_concurrent_sessions": 5,
        "records_per_month": 1000
    }',
    '{
        "theme_primary_color": "#2563eb",
        "theme_secondary_color": "#1e3a8a",
        "service_icon": "Archive",
        "sidebar_color": "#1d4ed8"
    }'
),
(
    'Insurance Broker',
    'insurance-broker',
    'Insurance Broker',
    'Insurance policy analysis and comparison platform',
    '{
        "policy_analysis": true,
        "coverage_comparison": true,
        "risk_assessment": true,
        "premium_calculation": true,
        "claims_processing": true,
        "client_portal": true,
        "automated_quotes": false,
        "advanced_underwriting": false,
        "integration_apis": false
    }',
    '{
        "requests_per_minute": 40,
        "requests_per_day": 600,
        "max_file_size_mb": 15,
        "max_concurrent_sessions": 4,
        "policies_per_month": 200
    }',
    '{
        "theme_primary_color": "#dc2626",
        "theme_secondary_color": "#991b1b",
        "service_icon": "Shield",
        "sidebar_color": "#b91c1c"
    }'
) ON CONFLICT (service_key) DO NOTHING;

-- 8. Create function to get organization services with configurations
CREATE OR REPLACE FUNCTION get_organization_services(org_id UUID)
RETURNS TABLE (
    service_id UUID,
    service_key VARCHAR(100),
    service_name VARCHAR(255),
    display_name VARCHAR(255),
    description TEXT,
    access_level VARCHAR(50),
    is_active BOOLEAN,
    merged_features JSONB,
    merged_limits JSONB,
    merged_ui_config JSONB,
    service_config JSONB,
    subscription_start DATE,
    subscription_end DATE
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.service_key,
        s.service_name,
        s.display_name,
        s.description,
        os.access_level,
        os.is_active,
        -- Merge default features with organization-specific overrides
        (s.default_features || COALESCE(os.service_config->'features', '{}'::jsonb)) as merged_features,
        (s.default_limits || COALESCE(os.service_config->'limits', '{}'::jsonb)) as merged_limits,
        (s.default_ui_config || COALESCE(os.service_config->'ui_config', '{}'::jsonb)) as merged_ui_config,
        os.service_config,
        os.subscription_start,
        os.subscription_end
    FROM services s
    INNER JOIN organization_services os ON os.service_id = s.id
    WHERE os.organization_id = org_id
    AND s.is_active = true
    AND os.is_active = true
    AND (os.subscription_end IS NULL OR os.subscription_end >= CURRENT_DATE);
END;
$$;

-- 9. Create function to get client configuration for a specific service
CREATE OR REPLACE FUNCTION get_service_client_config(org_id UUID, service_key_param VARCHAR(100), env TEXT DEFAULT 'production')
RETURNS TABLE (
    config_id UUID,
    organization_id UUID,
    service_id UUID,
    service_key VARCHAR(100),
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
    WITH service_data AS (
        SELECT s.id as service_id, s.service_key
        FROM services s
        WHERE s.service_key = service_key_param
        AND s.is_active = true
    ),
    config_data AS (
        SELECT cc.*, sd.service_key
        FROM client_configurations cc
        INNER JOIN service_data sd ON sd.service_id = cc.service_id
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
        cd.service_id,
        cd.service_key,
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

-- 10. Create view for easy service overview
CREATE OR REPLACE VIEW organization_service_overview AS
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    s.id as service_id,
    s.service_key,
    s.service_name,
    s.display_name,
    os.access_level,
    os.is_active as service_active,
    os.subscription_start,
    os.subscription_end,
    COUNT(cc.id) as configuration_count
FROM organizations o
INNER JOIN organization_services os ON os.organization_id = o.id
INNER JOIN services s ON s.id = os.service_id
LEFT JOIN client_configurations cc ON cc.organization_id = o.id AND cc.service_id = s.id
WHERE s.is_active = true
GROUP BY o.id, o.name, s.id, s.service_key, s.service_name, s.display_name, os.access_level, os.is_active, os.subscription_start, os.subscription_end; 