#!/usr/bin/env node

/**
 * Migration Script for Client Configurations
 * 
 * This script migrates your existing hardcoded backend configurations
 * to the new database-driven system.
 * 
 * Run with: node migrate-configs.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration data based on your current setup
const CONFIGURATIONS = [
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
      tenant_id: process.env.AZURE_TENANT_ID || '',
      client_id: process.env.AZURE_CLIENT_ID || '',
      scope: '/.default'
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
      tenant_id: process.env.CLIENT2_AZURE_TENANT_ID || '',
      client_id: process.env.CLIENT2_AZURE_CLIENT_ID || '',
      scope: '/.default'
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
  },
  {
    organization_name: 'Contracts Organization',
    client_name: 'Contracts Backend',
    client_type: 'default',
    backend_config: {
      api_url: 'https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io',
      chat_endpoint: '/chat',
      content_endpoint: '/content',
      analyze_endpoint: '/analyze'
    },
    azure_config: {
      tenant_id: process.env.AZURE_TENANT_ID || '',
      client_id: process.env.AZURE_CLIENT_ID || '',
      scope: '/.default'
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
    organization_name: 'Content Organization',
    client_name: 'Content Backend',
    client_type: 'default',
    backend_config: {
      api_url: 'https://capps-backend-6qjzg44bnug6q.greenmeadow-8b5f0a30.eastus2.azurecontainerapps.io',
      chat_endpoint: '/chat',
      content_endpoint: '/content',
      analyze_endpoint: '/analyze'
    },
    azure_config: {
      tenant_id: process.env.AZURE_TENANT_ID || '',
      client_id: process.env.AZURE_CLIENT_ID || '',
      scope: '/.default'
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
  }
];

async function checkTablesExist() {
  console.log('🔍 Checking if migration tables exist...');
  
  try {
    const { data, error } = await supabase
      .from('client_configurations')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Client configurations table not found!');
      console.error('Please run the database migrations first:');
      console.error('1. Open your Supabase SQL editor');
      console.error('2. Copy and paste the SQL from database-migrations.sql');
      console.error('3. Execute the SQL');
      return false;
    }
    
    console.log('✅ Tables exist, proceeding with migration...');
    return true;
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
    return false;
  }
}

async function findOrCreateOrganization(name) {
  // First, try to find existing organization
  let { data: org, error } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('name', name)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    throw error;
  }

  if (!org) {
    console.log(`📝 Creating organization: ${name}`);
    const { data: newOrg, error: createError } = await supabase
      .from('organizations')
      .insert([{ name: name }])
      .select()
      .single();

    if (createError) {
      throw createError;
    }
    
    org = newOrg;
  } else {
    console.log(`✅ Found existing organization: ${name}`);
  }

  return org;
}

async function createClientConfiguration(config, organizationId, userId) {
  console.log(`📝 Creating client configuration: ${config.client_name}`);
  
  const configData = {
    organization_id: organizationId,
    client_name: config.client_name,
    client_type: config.client_type,
    backend_config: config.backend_config,
    azure_config: config.azure_config,
    features: config.features,
    ui_config: {},
    limits: config.limits,
    is_active: true,
    environment: 'production',
    created_by: userId
  };

  const { data: clientConfig, error } = await supabase
    .from('client_configurations')
    .insert([configData])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return clientConfig;
}

async function storeSecrets(clientConfigId, secrets) {
  for (const [secretName, secretValue] of Object.entries(secrets)) {
    if (secretValue && secretValue.trim()) {
      console.log(`🔐 Storing secret: ${secretName}`);
      
      const { error } = await supabase
        .from('client_secrets')
        .insert([{
          client_config_id: clientConfigId,
          secret_name: secretName,
          encrypted_value: btoa(secretValue), // Basic encoding - implement proper encryption in production!
        }]);

      if (error) {
        console.warn(`⚠️  Warning: Could not store secret ${secretName}:`, error.message);
      }
    }
  }
}

async function migrateConfigurations() {
  console.log('🚀 Starting client configuration migration...\n');

  // Check if tables exist
  const tablesExist = await checkTablesExist();
  if (!tablesExist) {
    return;
  }

  // Get a default user for created_by field
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);

  const defaultUserId = profiles?.[0]?.id;
  if (!defaultUserId) {
    console.error('❌ No profiles found. Please ensure you have at least one user profile in the database.');
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const config of CONFIGURATIONS) {
    try {
      console.log(`\n📋 Processing: ${config.organization_name} -> ${config.client_name}`);
      
      // Find or create organization
      const organization = await findOrCreateOrganization(config.organization_name);
      
      // Check if configuration already exists
      const { data: existingConfig } = await supabase
        .from('client_configurations')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('client_name', config.client_name)
        .single();

      if (existingConfig) {
        console.log(`⚠️  Configuration already exists, skipping...`);
        continue;
      }

      // Create client configuration
      const clientConfig = await createClientConfiguration(config, organization.id, defaultUserId);
      
      // Store secrets
      if (config.secrets && Object.keys(config.secrets).length > 0) {
        await storeSecrets(clientConfig.id, config.secrets);
      }
      
      console.log(`✅ Successfully migrated: ${config.client_name}`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ Error migrating ${config.client_name}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n🎉 Migration completed!');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  
  if (successCount > 0) {
    console.log('\n📋 Next steps:');
    console.log('1. Visit your admin interface to verify configurations');
    console.log('2. Test the new API endpoints');
    console.log('3. Update your frontend to use the new hooks');
    console.log('4. Consider creating the admin page: /admin/client-config');
  }
}

// Run the migration
migrateConfigurations()
  .then(() => {
    console.log('\n✨ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  }); 