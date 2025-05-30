-- Debug Client Configuration Issues
-- Run this in Supabase SQL Editor to diagnose insertion problems

-- 1. Check current organizations
SELECT 'Current Organizations:' as info;
SELECT id, name, created_at FROM organizations ORDER BY name;

-- 2. Check existing client configurations
SELECT 'Existing Client Configurations:' as info;
SELECT 
    cc.id,
    o.name as organization_name,
    cc.client_name,
    cc.environment,
    cc.is_active,
    cc.backend_config->>'api_url' as backend_url,
    cc.created_by,
    cc.created_at
FROM client_configurations cc
JOIN organizations o ON o.id = cc.organization_id
ORDER BY o.name, cc.created_at;

-- 3. Check for duplicate active configurations (this is what's likely causing the issue)
SELECT 'Organizations with Multiple Active Configs:' as info;
SELECT 
    organization_id,
    COUNT(*) as active_config_count,
    array_agg(environment) as environments
FROM client_configurations 
WHERE is_active = true 
GROUP BY organization_id 
HAVING COUNT(*) > 1;

-- 4. Check profiles table (for created_by field)
SELECT 'Available Profiles:' as info;
SELECT id, full_name, email, organization_id FROM profiles LIMIT 5;

-- 5. Test if we can insert a simple configuration (this will show the actual error)
SELECT 'Testing Insert for QIG:' as info;

-- Get QIG organization ID
WITH qig_org AS (
    SELECT id FROM organizations WHERE name = 'QIG' LIMIT 1
),
test_insert AS (
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
        qig_org.id,
        'Test QIG Client',
        'default',
        '{"api_url": "https://test-backend.com"}',
        '{"tenant_id": "", "client_id": ""}',
        '{}',
        '{}',
        true,
        'production',
        qig_org.id  -- Using org ID as created_by for now
    FROM qig_org
    WHERE EXISTS (SELECT 1 FROM qig_org)
    AND NOT EXISTS (
        SELECT 1 FROM client_configurations cc 
        WHERE cc.organization_id = qig_org.id 
        AND cc.environment = 'production' 
        AND cc.is_active = true
    )
    RETURNING id, client_name
)
SELECT * FROM test_insert
UNION ALL
SELECT null::uuid, 'No insert - either QIG not found or active config already exists'
WHERE NOT EXISTS (SELECT 1 FROM test_insert);

-- 6. Show table constraints to understand what's blocking us
SELECT 'Client Configurations Table Constraints:' as info;
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'client_configurations'
ORDER BY tc.constraint_type, tc.constraint_name; 