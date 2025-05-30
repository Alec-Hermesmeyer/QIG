-- Setup Client Backend Configurations
-- Run this in your Supabase SQL Editor

-- First, let's see what organizations we have
SELECT id, name, created_at FROM organizations ORDER BY name;

-- Check for existing configurations
SELECT 
    o.name as organization_name,
    cc.client_name,
    cc.backend_config->>'api_url' as backend_url,
    cc.is_active,
    cc.created_at
FROM client_configurations cc
JOIN organizations o ON o.id = cc.organization_id
ORDER BY o.name;

-- Delete existing configurations if you want to start fresh (optional)
-- DELETE FROM client_configurations WHERE organization_id IN (
--     SELECT id FROM organizations WHERE name IN ('QIG', 'Austin Industries', 'Westfield', 'Content Organization')
-- );

-- QIG Configuration
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
) VALUES (
    (SELECT id FROM organizations WHERE name = 'QIG' LIMIT 1),
    'QIG Client',
    'default',
    '{"api_url": "https://capps-backend-vakcnm7wmon74.salmonbush-fc2963f0.eastus.azurecontainerapps.io", "chat_endpoint": "/chat", "content_endpoint": "/content", "analyze_endpoint": "/analyze"}',
    '{"tenant_id": "", "client_id": ""}',
    '{"hands_free_chat": false, "document_analysis": true, "contract_search": true, "custom_branding": false, "advanced_analytics": false}',
    '{"requests_per_minute": 60, "requests_per_day": 1000, "max_file_size_mb": 10, "max_concurrent_sessions": 5}',
    true,
    'production',
    (SELECT id FROM organizations WHERE name = 'QIG' LIMIT 1)
);

-- Austin Industries Configuration  
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
) VALUES (
    (SELECT id FROM organizations WHERE name = 'Austin Industries' LIMIT 1),
    'Austin Industries Client',
    'default',
    '{"api_url": "https://capps-backend-px4batn2ycs6a.greenground-334066dd.eastus2.azurecontainerapps.io", "chat_endpoint": "/chat", "content_endpoint": "/content", "analyze_endpoint": "/analyze"}',
    '{"tenant_id": "", "client_id": ""}',
    '{"hands_free_chat": false, "document_analysis": true, "contract_search": true, "custom_branding": false, "advanced_analytics": false}',
    '{"requests_per_minute": 60, "requests_per_day": 1000, "max_file_size_mb": 10, "max_concurrent_sessions": 5}',
    true,
    'production',
    (SELECT id FROM organizations WHERE name = 'Austin Industries' LIMIT 1)
);

-- Westfield Configuration
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
) VALUES (
    (SELECT id FROM organizations WHERE name = 'Westfield' LIMIT 1),
    'Westfield Client',
    'default',
    '{"api_url": "https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io", "chat_endpoint": "/chat", "content_endpoint": "/content", "analyze_endpoint": "/analyze"}',
    '{"tenant_id": "", "client_id": ""}',
    '{"hands_free_chat": false, "document_analysis": true, "contract_search": true, "custom_branding": false, "advanced_analytics": false}',
    '{"requests_per_minute": 60, "requests_per_day": 1000, "max_file_size_mb": 10, "max_concurrent_sessions": 5}',
    true,
    'production',
    (SELECT id FROM organizations WHERE name = 'Westfield' LIMIT 1)
);

-- Content Organization (create if doesn't exist)
INSERT INTO organizations (name, created_at)
VALUES ('Content Organization', NOW())
ON CONFLICT (name) DO NOTHING;

-- Content Organization Configuration
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
) VALUES (
    (SELECT id FROM organizations WHERE name = 'Content Organization' LIMIT 1),
    'Content Organization Client',
    'default',
    '{"api_url": "https://capps-backend-6qjzg44bnug6q.greenmeadow-8b5f0a30.eastus2.azurecontainerapps.io", "chat_endpoint": "/chat", "content_endpoint": "/content", "analyze_endpoint": "/analyze"}',
    '{"tenant_id": "", "client_id": ""}',
    '{"hands_free_chat": false, "document_analysis": true, "contract_search": true, "custom_branding": false, "advanced_analytics": false}',
    '{"requests_per_minute": 60, "requests_per_day": 1000, "max_file_size_mb": 10, "max_concurrent_sessions": 5}',
    true,
    'production',
    (SELECT id FROM organizations WHERE name = 'Content Organization' LIMIT 1)
);

-- Show final results
SELECT 
    o.name as organization_name,
    cc.client_name,
    cc.backend_config->>'api_url' as backend_url,
    cc.is_active,
    cc.created_at
FROM client_configurations cc
JOIN organizations o ON o.id = cc.organization_id
ORDER BY o.name; 