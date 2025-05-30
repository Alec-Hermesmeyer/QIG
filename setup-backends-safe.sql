-- Safe Setup Client Backend Configurations
-- This version checks for existing configurations before inserting
-- Run this in your Supabase SQL Editor

-- First, let's see what organizations we have
SELECT 'Organizations in database:' as info;
SELECT id, name, created_at FROM organizations ORDER BY name;

-- Check for existing configurations
SELECT 'Existing configurations:' as info;
SELECT 
    o.name as organization_name,
    cc.client_name,
    cc.backend_config->>'api_url' as backend_url,
    cc.is_active,
    cc.created_at
FROM client_configurations cc
JOIN organizations o ON o.id = cc.organization_id
ORDER BY o.name;

-- Content Organization (create if doesn't exist)
INSERT INTO organizations (name, created_at)
SELECT 'Content Organization', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM organizations WHERE name = 'Content Organization'
);

-- QIG Configuration (only if doesn't exist)
INSERT INTO client_configurations (
    organization_id,
    client_name,
    client_type,
    backend_config,
    azure_config,
    features,
    limits,
    is_active,
    environment,
    created_by
)
SELECT 
    org.id,
    'QIG Client',
    'default',
    '{"api_url": "https://capps-backend-vakcnm7wmon74.salmonbush-fc2963f0.eastus.azurecontainerapps.io", "chat_endpoint": "/chat", "content_endpoint": "/content", "analyze_endpoint": "/analyze"}',
    '{"tenant_id": "", "client_id": ""}',
    '{"hands_free_chat": false, "document_analysis": true, "contract_search": true, "custom_branding": false, "advanced_analytics": false}',
    '{"requests_per_minute": 60, "requests_per_day": 1000, "max_file_size_mb": 10, "max_concurrent_sessions": 5}',
    true,
    'production',
    org.id
FROM organizations org
WHERE org.name = 'QIG'
AND NOT EXISTS (
    SELECT 1 FROM client_configurations cc 
    WHERE cc.organization_id = org.id
);

-- Austin Industries Configuration (only if doesn't exist)
INSERT INTO client_configurations (
    organization_id,
    client_name,
    client_type,
    backend_config,
    azure_config,
    features,
    limits,
    is_active,
    environment,
    created_by
)
SELECT 
    org.id,
    'Austin Industries Client',
    'default',
    '{"api_url": "https://capps-backend-px4batn2ycs6a.greenground-334066dd.eastus2.azurecontainerapps.io", "chat_endpoint": "/chat", "content_endpoint": "/content", "analyze_endpoint": "/analyze"}',
    '{"tenant_id": "", "client_id": ""}',
    '{"hands_free_chat": false, "document_analysis": true, "contract_search": true, "custom_branding": false, "advanced_analytics": false}',
    '{"requests_per_minute": 60, "requests_per_day": 1000, "max_file_size_mb": 10, "max_concurrent_sessions": 5}',
    true,
    'production',
    org.id
FROM organizations org
WHERE org.name = 'Austin Industries'
AND NOT EXISTS (
    SELECT 1 FROM client_configurations cc 
    WHERE cc.organization_id = org.id
);

-- Westfield Configuration (only if doesn't exist)
INSERT INTO client_configurations (
    organization_id,
    client_name,
    client_type,
    backend_config,
    azure_config,
    features,
    limits,
    is_active,
    environment,
    created_by
)
SELECT 
    org.id,
    'Westfield Client',
    'default',
    '{"api_url": "https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io", "chat_endpoint": "/chat", "content_endpoint": "/content", "analyze_endpoint": "/analyze"}',
    '{"tenant_id": "", "client_id": ""}',
    '{"hands_free_chat": false, "document_analysis": true, "contract_search": true, "custom_branding": false, "advanced_analytics": false}',
    '{"requests_per_minute": 60, "requests_per_day": 1000, "max_file_size_mb": 10, "max_concurrent_sessions": 5}',
    true,
    'production',
    org.id
FROM organizations org
WHERE org.name = 'Westfield'
AND NOT EXISTS (
    SELECT 1 FROM client_configurations cc 
    WHERE cc.organization_id = org.id
);

-- Content Organization Configuration (only if doesn't exist)
INSERT INTO client_configurations (
    organization_id,
    client_name,
    client_type,
    backend_config,
    azure_config,
    features,
    limits,
    is_active,
    environment,
    created_by
)
SELECT 
    org.id,
    'Content Organization Client',
    'default',
    '{"api_url": "https://capps-backend-6qjzg44bnug6q.greenmeadow-8b5f0a30.eastus2.azurecontainerapps.io", "chat_endpoint": "/chat", "content_endpoint": "/content", "analyze_endpoint": "/analyze"}',
    '{"tenant_id": "", "client_id": ""}',
    '{"hands_free_chat": false, "document_analysis": true, "contract_search": true, "custom_branding": false, "advanced_analytics": false}',
    '{"requests_per_minute": 60, "requests_per_day": 1000, "max_file_size_mb": 10, "max_concurrent_sessions": 5}',
    true,
    'production',
    org.id
FROM organizations org
WHERE org.name = 'Content Organization'
AND NOT EXISTS (
    SELECT 1 FROM client_configurations cc 
    WHERE cc.organization_id = org.id
);

-- Show final results
SELECT 'Final configurations:' as info;
SELECT 
    o.name as organization_name,
    cc.client_name,
    cc.backend_config->>'api_url' as backend_url,
    cc.is_active,
    cc.created_at
FROM client_configurations cc
JOIN organizations o ON o.id = cc.organization_id
ORDER BY o.name; 