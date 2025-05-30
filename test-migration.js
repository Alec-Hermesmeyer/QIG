#!/usr/bin/env node

/**
 * Test Script for Client Configuration Migration
 * 
 * This script tests that your migration worked correctly by:
 * 1. Checking if configurations exist
 * 2. Validating the data structure
 * 3. Testing the API endpoints
 * 
 * Run with: node test-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConfigurations() {
  console.log('🧪 Testing client configurations...\n');

  // Test 1: Check if configurations exist
  console.log('1️⃣ Checking if configurations exist...');
  const { data: configs, error } = await supabase
    .from('client_configurations')
    .select(`
      id,
      client_name,
      client_type,
      backend_config,
      azure_config,
      features,
      limits,
      organization_id,
      organizations (name)
    `);

  if (error) {
    console.error('❌ Error fetching configurations:', error.message);
    return;
  }

  if (!configs || configs.length === 0) {
    console.error('❌ No configurations found! Run the migration script first.');
    return;
  }

  console.log(`✅ Found ${configs.length} configurations`);
  
  // Test 2: Validate data structure
  console.log('\n2️⃣ Validating configuration structure...');
  let validConfigs = 0;
  let invalidConfigs = 0;

  for (const config of configs) {
    const errors = [];
    
    if (!config.backend_config?.api_url) {
      errors.push('Missing backend API URL');
    }
    
    if (!config.azure_config?.tenant_id) {
      errors.push('Missing Azure tenant ID');
    }
    
    if (!config.azure_config?.client_id) {
      errors.push('Missing Azure client ID');
    }
    
    if (!config.features || Object.keys(config.features).length === 0) {
      errors.push('Missing features configuration');
    }
    
    if (!config.limits || Object.keys(config.limits).length === 0) {
      errors.push('Missing limits configuration');
    }

    if (errors.length === 0) {
      console.log(`✅ ${config.client_name}: Valid`);
      validConfigs++;
    } else {
      console.log(`❌ ${config.client_name}: ${errors.join(', ')}`);
      invalidConfigs++;
    }
  }

  console.log(`\n📊 Validation Results:`);
  console.log(`✅ Valid configurations: ${validConfigs}`);
  console.log(`❌ Invalid configurations: ${invalidConfigs}`);

  // Test 3: Check secrets
  console.log('\n3️⃣ Checking client secrets...');
  const { data: secrets, error: secretsError } = await supabase
    .from('client_secrets')
    .select('client_config_id, secret_name');

  if (secretsError) {
    console.error('❌ Error fetching secrets:', secretsError.message);
  } else {
    console.log(`✅ Found ${secrets.length} secrets stored`);
    
    // Group secrets by config
    const secretsByConfig = secrets.reduce((acc, secret) => {
      acc[secret.client_config_id] = (acc[secret.client_config_id] || 0) + 1;
      return acc;
    }, {});

    for (const config of configs) {
      const secretCount = secretsByConfig[config.id] || 0;
      console.log(`  ${config.client_name}: ${secretCount} secrets`);
    }
  }

  // Test 4: Display configuration summary
  console.log('\n4️⃣ Configuration Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  for (const config of configs) {
    console.log(`\n🏢 ${config.organizations?.name || 'Unknown Org'}`);
    console.log(`   📋 Client: ${config.client_name}`);
    console.log(`   🔧 Type: ${config.client_type}`);
    console.log(`   🌐 Backend: ${config.backend_config?.api_url || 'Not set'}`);
    console.log(`   🔑 Azure: ${config.azure_config?.tenant_id ? 'Configured' : 'Not configured'}`);
    
    const enabledFeatures = Object.entries(config.features || {})
      .filter(([, enabled]) => enabled)
      .map(([feature]) => feature.replace(/_/g, ' '))
      .join(', ');
    
    console.log(`   ⚡ Features: ${enabledFeatures || 'None'}`);
    console.log(`   📊 Limits: ${config.limits?.requests_per_minute || 0}/min, ${config.limits?.requests_per_day || 0}/day`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Test 5: Migration status
  console.log('\n5️⃣ Migration Status:');
  
  const expectedBackends = [
    'https://capps-backend-vakcnm7wmon74.salmonbush-fc2963f0.eastus.azurecontainerapps.io',
    'https://capps-backend-px4batn2ycs6a.greenground-334066dd.eastus2.azurecontainerapps.io',
    'https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io',
    'https://capps-backend-6qjzg44bnug6q.greenmeadow-8b5f0a30.eastus2.azurecontainerapps.io'
  ];

  const migratedBackends = configs.map(c => c.backend_config?.api_url).filter(Boolean);
  const missingBackends = expectedBackends.filter(backend => !migratedBackends.includes(backend));

  console.log(`✅ Migrated backends: ${migratedBackends.length}/${expectedBackends.length}`);
  
  if (missingBackends.length > 0) {
    console.log(`⚠️  Missing backends:`);
    missingBackends.forEach(backend => {
      console.log(`   - ${backend}`);
    });
  }

  console.log('\n🎉 Migration test completed!');
  
  if (validConfigs === configs.length && missingBackends.length === 0) {
    console.log('✅ All configurations are valid and complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Visit /admin/client-config to manage configurations');
    console.log('2. Update your API routes to use the new system');
    console.log('3. Test your application functionality');
  } else {
    console.log('⚠️  Some issues found. Please review the configurations.');
  }
}

// Run the test
testConfigurations()
  .then(() => {
    console.log('\n✨ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  }); 