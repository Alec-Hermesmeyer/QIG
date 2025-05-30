# Migration Guide: Hardcoded Config → Database-Driven Config

## Current State Analysis

Your project currently has these hardcoded configurations:

### Backend URLs Found:
1. `https://capps-backend-vakcnm7wmon74.salmonbush-fc2963f0.eastus.azurecontainerapps.io` (default)
2. `https://capps-backend-px4batn2ycs6a.greenground-334066dd.eastus2.azurecontainerapps.io` (client2)
3. `https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io` (contracts)
4. `https://capps-backend-6qjzg44bnug6q.greenmeadow-8b5f0a30.eastus2.azurecontainerapps.io` (content)

### Files That Need Migration:
- `src/app/api/chat-stream/route.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/proxy-content/route.ts`
- `src/app/api/proxy-list_uploaded/route.ts`
- `src/lib/contract-service.ts`
- `src/hooks/useClientConfig.ts`

## Step-by-Step Migration

### Phase 1: Database Setup (30 minutes)

1. **Run Database Migrations**
   ```bash
   # Copy the SQL from database-migrations.sql and run in Supabase SQL editor
   ```

2. **Verify Tables Created**
   - Check `client_configurations` table exists
   - Check `client_secrets` table exists
   - Verify RLS policies are active

### Phase 2: Create Initial Configurations (15 minutes)

3. **Set Environment Variables**
   Add to your `.env.local`:
   ```env
   NEXT_PUBLIC_DEFAULT_BACKEND_URL=https://capps-backend-vakcnm7wmon74.salmonbush-fc2963f0.eastus.azurecontainerapps.io
   ```

4. **Create Client Configurations**
   Run the migration script (see below) or use the admin interface

### Phase 3: Update API Routes (45 minutes)

5. **Migrate Each API Route**
   - Start with non-critical routes
   - Test each route after migration
   - Keep old routes as backup initially

### Phase 4: Test & Validate (30 minutes)

6. **Testing**
   - Test all API endpoints
   - Verify feature flags work
   - Check organization-specific configs

### Phase 5: Cleanup (15 minutes)

7. **Remove Old Code**
   - Remove hardcoded URLs
   - Clean up old environment variables
   - Update documentation

## Total Time: ~2.5 hours

---

## Detailed Migration Steps

### 1. Database Setup

First, run the SQL migrations in your Supabase SQL editor:

```sql
-- Copy and paste the entire content from database-migrations.sql
-- This creates the tables, indexes, RLS policies, and helper functions
```

### 2. Create Initial Client Configurations

Create configurations for your existing backends. You can do this via the admin interface or SQL:

```sql
-- Configuration 1: Default Backend
INSERT INTO client_configurations (
    organization_id,
    client_name,
    client_type,
    backend_config,
    azure_config,
    features,
    limits,
    environment,
    created_by
) VALUES (
    (SELECT id FROM organizations LIMIT 1), -- Replace with actual org ID
    'Default Backend',
    'default',
    '{"api_url": "https://capps-backend-vakcnm7wmon74.salmonbush-fc2963f0.eastus.azurecontainerapps.io", "chat_endpoint": "/chat", "content_endpoint": "/content", "analyze_endpoint": "/analyze"}',
    '{"tenant_id": "' || (SELECT value FROM secrets WHERE name = 'AZURE_TENANT_ID') || '", "client_id": "' || (SELECT value FROM secrets WHERE name = 'AZURE_CLIENT_ID') || '"}',
    '{"hands_free_chat": false, "document_analysis": true, "contract_search": true, "custom_branding": false, "advanced_analytics": false}',
    '{"requests_per_minute": 60, "requests_per_day": 1000, "max_file_size_mb": 10, "max_concurrent_sessions": 5}',
    'production',
    (SELECT id FROM profiles LIMIT 1) -- Replace with actual user ID
);

-- Configuration 2: Client2 Backend
INSERT INTO client_configurations (
    organization_id,
    client_name,
    client_type,
    backend_config,
    azure_config,
    features,
    limits,
    environment,
    created_by
) VALUES (
    (SELECT id FROM organizations WHERE name = 'Client 2 Organization' LIMIT 1), -- Replace with actual org ID
    'Client 2 Backend',
    'premium',
    '{"api_url": "https://capps-backend-px4batn2ycs6a.greenground-334066dd.eastus2.azurecontainerapps.io", "chat_endpoint": "/chat", "content_endpoint": "/content", "analyze_endpoint": "/analyze"}',
    '{"tenant_id": "' || (SELECT value FROM secrets WHERE name = 'CLIENT2_AZURE_TENANT_ID') || '", "client_id": "' || (SELECT value FROM secrets WHERE name = 'CLIENT2_AZURE_CLIENT_ID') || '"}',
    '{"hands_free_chat": true, "document_analysis": true, "contract_search": true, "custom_branding": true, "advanced_analytics": true}',
    '{"requests_per_minute": 120, "requests_per_day": 5000, "max_file_size_mb": 50, "max_concurrent_sessions": 20}',
    'production',
    (SELECT id FROM profiles LIMIT 1) -- Replace with actual user ID
);
```

### 3. Store Azure Secrets

```sql
-- Store Azure secrets securely
INSERT INTO client_secrets (client_config_id, secret_name, encrypted_value) VALUES
((SELECT id FROM client_configurations WHERE client_name = 'Default Backend'), 'client_secret', encode('YOUR_AZURE_SECRET', 'base64')),
((SELECT id FROM client_configurations WHERE client_name = 'Client 2 Backend'), 'client_secret', encode('YOUR_CLIENT2_AZURE_SECRET', 'base64'));
```

### 4. Update API Routes One by One

#### A. Update chat-stream route (Recommended: Use the new v2 route)

Instead of modifying the existing route, use the new `chat-stream-v2` route that's already database-driven:

```tsx
// In your components, change the API endpoint from:
const response = await fetch('/api/chat-stream', { ... });

// To:
const response = await fetch('/api/chat-stream-v2', { ... });
```

#### B. Update contract-service.ts

```tsx
// Before:
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io';

// After:
import { useBackendUrls } from '@/hooks/useClientConfig';

export function useContractService() {
  const { baseUrl } = useBackendUrls();
  
  const searchContracts = async (query: string) => {
    const response = await fetch(`${baseUrl}/api/contracts/search?q=${encodeURIComponent(query)}`, {
      // ... rest of your code
    });
  };

  return { searchContracts };
}
```

#### C. Update other API routes

For server-side API routes, update them to use the client config service:

```tsx
// Before (in any API route):
const BACKEND_URL = "https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io";

// After:
import { clientConfigService } from '@/services/clientConfigService';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function POST(request: NextRequest) {
  // Get user's organization
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', session.user.id)
    .single();

  // Load client configuration
  const clientConfig = await clientConfigService.getClientConfig(profile.organization_id);
  
  if (!clientConfig) {
    return NextResponse.json({ error: 'No configuration found' }, { status: 404 });
  }

  // Use the configured backend URL
  const backendUrl = clientConfig.backend_config.api_url;
  const response = await fetch(`${backendUrl}/your-endpoint`, {
    // ... your request
  });
}
```

### 5. Testing Strategy

#### Test Each Route Individually:

1. **Chat Stream**
   ```bash
   curl -X POST http://localhost:3000/api/chat-stream-v2 \
     -H "Content-Type: application/json" \
     -d '{"message": "test message", "sessionId": "test-session"}'
   ```

2. **Contract Service**
   - Test contract search functionality
   - Verify it's using the correct backend

3. **Other Routes**
   - Test each migrated route
   - Check logs for configuration loading

#### Test Organization Switching:
- Create test organizations with different configs
- Switch between them and verify different backends are used

### 6. Rollback Plan

If something goes wrong, you can quickly rollback:

1. **Keep old routes active** during migration
2. **Switch back to old endpoints** in your frontend
3. **Revert environment variables** if needed

### 7. Post-Migration Cleanup

Once everything is working:

1. **Remove old hardcoded configurations**
2. **Delete unused environment variables**
3. **Remove backup API routes**
4. **Update documentation**

---

## Migration Script

Here's a Node.js script to help automate the migration:

```javascript
// migration-script.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function migrateConfigurations() {
  // Define your existing configurations
  const configurations = [
    {
      organization_name: 'Default Organization',
      client_name: 'Default Backend',
      client_type: 'default',
      backend_config: {
        api_url: 'https://capps-backend-vakcnm7wmon74.salmonbush-fc2963f0.eastus.azurecontainerapps.io',
        chat_endpoint: '/chat',
        content_endpoint: '/content',
        analyze_endpoint: '/analyze'
      },
      azure_config: {
        tenant_id: process.env.AZURE_TENANT_ID,
        client_id: process.env.AZURE_CLIENT_ID,
      },
      features: {
        hands_free_chat: false,
        document_analysis: true,
        contract_search: true,
        custom_branding: false,
        advanced_analytics: false
      },
      limits: {
        requests_per_minute: 60,
        requests_per_day: 1000,
        max_file_size_mb: 10,
        max_concurrent_sessions: 5
      },
      secrets: {
        client_secret: process.env.AZURE_SECRET
      }
    },
    {
      organization_name: 'Client 2 Organization',
      client_name: 'Client 2 Backend',
      client_type: 'premium',
      backend_config: {
        api_url: 'https://capps-backend-px4batn2ycs6a.greenground-334066dd.eastus2.azurecontainerapps.io',
        chat_endpoint: '/chat',
        content_endpoint: '/content',
        analyze_endpoint: '/analyze'
      },
      azure_config: {
        tenant_id: process.env.CLIENT2_AZURE_TENANT_ID,
        client_id: process.env.CLIENT2_AZURE_CLIENT_ID,
      },
      features: {
        hands_free_chat: true,
        document_analysis: true,
        contract_search: true,
        custom_branding: true,
        advanced_analytics: true
      },
      limits: {
        requests_per_minute: 120,
        requests_per_day: 5000,
        max_file_size_mb: 50,
        max_concurrent_sessions: 20
      },
      secrets: {
        client_secret: process.env.CLIENT2_AZURE_SECRET
      }
    }
  ];

  for (const config of configurations) {
    try {
      // Find or create organization
      let { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('name', config.organization_name)
        .single();

      if (!org) {
        const { data: newOrg } = await supabase
          .from('organizations')
          .insert([{ name: config.organization_name }])
          .select()
          .single();
        org = newOrg;
      }

      // Create client configuration
      const { data: clientConfig, error } = await supabase
        .from('client_configurations')
        .insert([{
          organization_id: org.id,
          client_name: config.client_name,
          client_type: config.client_type,
          backend_config: config.backend_config,
          azure_config: config.azure_config,
          features: config.features,
          limits: config.limits,
          environment: 'production',
          created_by: org.id // You might want to use a real user ID
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating config:', error);
        continue;
      }

      // Store secrets
      for (const [secretName, secretValue] of Object.entries(config.secrets)) {
        if (secretValue) {
          await supabase
            .from('client_secrets')
            .insert([{
              client_config_id: clientConfig.id,
              secret_name: secretName,
              encrypted_value: btoa(secretValue) // Basic encoding - use proper encryption!
            }]);
        }
      }

      console.log(`✅ Migrated configuration for ${config.client_name}`);
    } catch (error) {
      console.error(`❌ Error migrating ${config.client_name}:`, error);
    }
  }
}

// Run the migration
migrateConfigurations()
  .then(() => console.log('🎉 Migration completed!'))
  .catch(console.error);
```

---

## Verification Checklist

After migration, verify:

- [ ] Database tables created successfully
- [ ] Client configurations inserted
- [ ] Secrets stored securely
- [ ] API routes updated
- [ ] Frontend components using new hooks
- [ ] All existing functionality still works
- [ ] Organization switching works correctly
- [ ] Rate limiting ready for implementation
- [ ] Feature flags working
- [ ] Error handling in place

## Need Help?

If you encounter issues during migration:

1. Check Supabase logs for RLS policy errors
2. Verify organization IDs are correct
3. Test with the debug endpoints: `/api/debug/organization`
4. Check the browser console for client-side errors
5. Review server logs for API route errors

Remember: You can always rollback to the old system if needed! 