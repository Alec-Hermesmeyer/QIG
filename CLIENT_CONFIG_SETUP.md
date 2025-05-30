# Client Configuration Management System

This guide explains how to set up and use the new database-driven client configuration system for managing multiple clients, backends, and solutions.

## Overview

The client configuration system allows you to:
- Manage multiple backend URLs per organization
- Configure Azure authentication settings per client
- Enable/disable features based on client type
- Set rate limits and quotas
- Store sensitive configuration securely
- Support different environments (dev, staging, production)

## Database Setup

### 1. Run Database Migrations

Execute the SQL in `database-migrations.sql` in your Supabase SQL editor:

```sql
-- This will create:
-- - client_configurations table
-- - client_secrets table  
-- - Indexes for performance
-- - Row Level Security policies
-- - Helper functions
```

### 2. Verify Tables Created

Check that these tables exist in your Supabase database:
- `client_configurations`
- `client_secrets`

## Environment Variables

Add these to your `.env.local`:

```env
# Default backend URL (fallback)
NEXT_PUBLIC_DEFAULT_BACKEND_URL=https://your-default-backend.com

# Supabase (you should already have these)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Usage

### 1. Admin Configuration Interface

Add the client config manager to your admin routes:

```tsx
// app/admin/client-config/page.tsx
import { ClientConfigManager } from '@/components/admin/ClientConfigManager';

export default function ClientConfigPage() {
  return <ClientConfigManager />;
}
```

### 2. Using Configuration in Components

```tsx
// In any component
import { useClientConfig, useFeatureFlags, useBackendUrls } from '@/hooks/useClientConfig';

function MyComponent() {
  const { config, loading, error } = useClientConfig();
  const { canUseHandsFreeChat, canAnalyzeDocuments } = useFeatureFlags();
  const { chatUrl, analyzeUrl } = useBackendUrls();

  if (loading) return <div>Loading configuration...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Client: {config?.client_name}</h2>
      <p>Type: {config?.client_type}</p>
      
      {canUseHandsFreeChat && (
        <button>🎤 Start Voice Chat</button>
      )}
      
      {canAnalyzeDocuments && (
        <button>📄 Analyze Document</button>
      )}
    </div>
  );
}
```

### 3. Using in API Routes

```tsx
// In your API routes
import { clientConfigService } from '@/services/clientConfigService';

export async function POST(request: NextRequest) {
  // Get user's organization ID from session
  const organizationId = 'user-org-id';
  
  // Load configuration
  const config = await clientConfigService.getClientConfig(organizationId);
  
  if (!config) {
    return NextResponse.json({ error: 'No configuration found' }, { status: 404 });
  }

  // Use configuration
  const backendUrl = config.backend_config.api_url;
  const hasFeature = config.features.document_analysis;
  
  // Make request to configured backend
  const response = await fetch(`${backendUrl}/api/endpoint`, {
    // ... your request
  });
}
```

## Client Types and Features

### Default Client
- Basic document analysis
- Contract search
- 60 requests/minute, 1000/day
- 10MB file limit
- No hands-free chat
- No custom branding

### Premium Client
- All default features
- Hands-free chat enabled
- Custom branding
- Advanced analytics
- 120 requests/minute, 5000/day
- 50MB file limit

### Enterprise Client
- All premium features
- Higher rate limits (300/min, 25000/day)
- 100MB file limit
- 100 concurrent sessions
- Priority support

### Custom Client
- Fully customizable configuration
- Define your own feature set
- Custom rate limits
- Tailored for specific use cases

## Configuration Structure

### Backend Configuration
```json
{
  "api_url": "https://your-backend.com",
  "chat_endpoint": "/chat",
  "content_endpoint": "/content", 
  "analyze_endpoint": "/analyze"
}
```

### Azure Configuration
```json
{
  "tenant_id": "your-azure-tenant-id",
  "client_id": "your-azure-client-id",
  "client_secret": "stored-separately-encrypted",
  "scope": "/.default"
}
```

### Feature Flags
```json
{
  "hands_free_chat": true,
  "document_analysis": true,
  "contract_search": true,
  "custom_branding": true,
  "advanced_analytics": false
}
```

### Rate Limits
```json
{
  "requests_per_minute": 120,
  "requests_per_day": 5000,
  "max_file_size_mb": 50,
  "max_concurrent_sessions": 20
}
```

## Setting Up a New Client

### 1. Through Admin Interface
1. Go to `/admin/client-config`
2. Select client type (default/premium/enterprise/custom)
3. Configure backend URL and Azure settings
4. Enable/disable features as needed
5. Set rate limits
6. Save configuration

### 2. Programmatically
```tsx
import { clientConfigService } from '@/services/clientConfigService';

const newConfig = await clientConfigService.createClientConfig(
  organizationId,
  'Client Name',
  'premium',
  {
    backend_config: {
      api_url: 'https://custom-backend.com'
    },
    features: {
      hands_free_chat: true,
      custom_branding: true
    }
  }
);
```

## Security Considerations

### Secrets Management
- Client secrets are stored separately in `client_secrets` table
- Secrets should be encrypted before storage (implement proper encryption!)
- Use environment variables for shared secrets
- Rotate secrets regularly

### Row Level Security
- Users can only access their organization's configurations
- Secrets are protected by RLS policies
- Admin functions require proper permissions

### Rate Limiting
- Implement rate limiting based on configuration
- Monitor usage against configured limits
- Graceful degradation when limits exceeded

## Migration from Hardcoded Configuration

### 1. Identify Current Clients
Look at your current hardcoded configurations in:
- `chat-stream/route.ts`
- Environment variables
- Other API routes

### 2. Create Database Configurations
For each client, create a configuration record:

```sql
INSERT INTO client_configurations (
  organization_id,
  client_name,
  client_type,
  backend_config,
  azure_config,
  features,
  limits,
  environment
) VALUES (
  'org-uuid',
  'Client 1',
  'premium',
  '{"api_url": "https://backend1.com"}',
  '{"tenant_id": "tenant1", "client_id": "client1"}',
  '{"hands_free_chat": true}',
  '{"requests_per_minute": 120}',
  'production'
);
```

### 3. Update API Routes
- Replace hardcoded URLs with configuration lookups
- Use `useBackendUrls()` hook in components
- Test thoroughly before removing old code

### 4. Store Secrets
```tsx
await clientConfigService.storeClientSecret(
  configId,
  'client_secret',
  actualSecret
);
```

## Monitoring and Maintenance

### Configuration Monitoring
- Track configuration usage
- Monitor rate limit violations
- Log configuration changes
- Alert on configuration errors

### Regular Maintenance
- Review and update configurations
- Rotate secrets
- Clean up unused configurations
- Update feature flags as needed

## Troubleshooting

### Common Issues

**Configuration Not Found**
- Check organization ID is correct
- Verify configuration exists in database
- Check RLS policies allow access

**Backend Connection Errors**
- Verify backend URL is correct
- Check Azure authentication configuration
- Test backend connectivity

**Feature Not Working**
- Check feature flag is enabled
- Verify client type supports feature
- Check rate limits not exceeded

**Rate Limiting Issues**
- Monitor current usage
- Adjust limits as needed
- Implement graceful degradation

### Debug Tools

Use the debug endpoint to check configuration:
```bash
GET /api/debug/organization
```

Check environment variables:
```bash
GET /api/env-check
```

## Best Practices

### Configuration Management
- Use descriptive client names
- Document custom configurations
- Version control configuration changes
- Test configurations in staging first

### Security
- Encrypt all sensitive data
- Use secure secret storage
- Implement proper access controls
- Regular security audits

### Performance
- Cache configurations appropriately
- Monitor database performance
- Optimize queries as needed
- Use proper indexing

### Scalability
- Design for multiple environments
- Plan for configuration growth
- Monitor resource usage
- Implement proper error handling

## Future Enhancements

Potential improvements to consider:
- Configuration versioning and rollback
- A/B testing configurations
- Real-time configuration updates
- Configuration templates
- Automated secret rotation
- Advanced monitoring and alerting
- Multi-tenant isolation improvements 