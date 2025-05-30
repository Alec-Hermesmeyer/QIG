#!/usr/bin/env node

/**
 * Service Migration Script
 * 
 * This script sets up the service mapping system by:
 * 1. Running the service migrations
 * 2. Creating default service subscriptions for existing organizations
 * 3. Mapping existing client configurations to appropriate services
 * 
 * Run with: node migrate-services.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Service mapping based on organization names and backend URLs
const SERVICE_MAPPING = {
  'contract-analyst': [
    'Contract',
    'Legal',
    'Attorney',
    'Law',
    'contracts-backend',
    'capps-backend-dka66scue7f4y' // contracts backend URL
  ],
  'open-records': [
    'Records',
    'FOIA',
    'Public',
    'Government',
    'Municipal',
    'City',
    'County',
    'State'
  ],
  'insurance-broker': [
    'Insurance',
    'Broker',
    'Policy',
    'Coverage',
    'Claims'
  ]
};

async function checkServicesTableExists() {
  console.log('🔍 Checking if services table exists...');
  
  try {
    const { data, error } = await supabase
      .from('services')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Services table not found!');
      console.error('Please run the service migrations first:');
      console.error('1. Open your Supabase SQL editor');
      console.error('2. Copy and paste the SQL from database-migrations-services.sql');
      console.error('3. Execute the SQL');
      return false;
    }
    
    console.log('✅ Services table exists');
    return true;
  } catch (error) {
    console.error('❌ Error checking services table:', error.message);
    return false;
  }
}

async function getOrganizations() {
  const { data, error } = await supabase
    .from('organizations')
    .select('*');

  if (error) {
    throw error;
  }

  return data || [];
}

async function getServices() {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true);

  if (error) {
    throw error;
  }

  return data || [];
}

async function getClientConfigurations() {
  const { data, error } = await supabase
    .from('client_configurations')
    .select('*');

  if (error) {
    throw error;
  }

  return data || [];
}

function determineServiceForOrganization(org, clientConfigs) {
  const orgName = org.name.toLowerCase();
  
  // Check organization name against service keywords
  for (const [serviceKey, keywords] of Object.entries(SERVICE_MAPPING)) {
    if (keywords.some(keyword => orgName.includes(keyword.toLowerCase()))) {
      console.log(`📍 Matched "${org.name}" to ${serviceKey} (name match)`);
      return serviceKey;
    }
  }

  // Check backend URLs in client configurations
  const orgConfigs = clientConfigs.filter(c => c.organization_id === org.id);
  for (const config of orgConfigs) {
    const apiUrl = config.backend_config?.api_url;
    if (apiUrl) {
      for (const [serviceKey, keywords] of Object.entries(SERVICE_MAPPING)) {
        if (keywords.some(keyword => apiUrl.includes(keyword))) {
          console.log(`📍 Matched "${org.name}" to ${serviceKey} (backend URL match)`);
          return serviceKey;
        }
      }
    }
  }

  // Default to contract analyst for now
  console.log(`📍 Using default service for "${org.name}": contract-analyst`);
  return 'contract-analyst';
}

async function subscribeOrganizationToService(org, service, accessLevel = 'basic') {
  // Check if already subscribed
  const { data: existing } = await supabase
    .from('organization_services')
    .select('id')
    .eq('organization_id', org.id)
    .eq('service_id', service.id)
    .single();

  if (existing) {
    console.log(`   ⚠️  Already subscribed to ${service.service_name}`);
    return existing;
  }

  const { data, error } = await supabase
    .from('organization_services')
    .insert([{
      organization_id: org.id,
      service_id: service.id,
      access_level: accessLevel,
      is_active: true,
      service_config: {}
    }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  console.log(`   ✅ Subscribed to ${service.service_name} (${accessLevel})`);
  return data;
}

async function updateClientConfigurationService(config, service) {
  const { error } = await supabase
    .from('client_configurations')
    .update({ service_id: service.id })
    .eq('id', config.id);

  if (error) {
    throw error;
  }

  console.log(`   🔗 Linked client config "${config.client_name}" to ${service.service_name}`);
}

async function migrateServices() {
  console.log('🚀 Starting service migration...\n');

  // Check if services table exists
  const servicesExist = await checkServicesTableExists();
  if (!servicesExist) {
    return;
  }

  try {
    // Load data
    console.log('📊 Loading current data...');
    const organizations = await getOrganizations();
    const services = await getServices();
    const clientConfigurations = await getClientConfigurations();

    console.log(`Found ${organizations.length} organizations`);
    console.log(`Found ${services.length} services`);
    console.log(`Found ${clientConfigurations.length} client configurations\n`);

    // Create service lookup
    const servicesByKey = services.reduce((acc, service) => {
      acc[service.service_key] = service;
      return acc;
    }, {});

    let subscriptionCount = 0;
    let configUpdateCount = 0;

    // Process each organization
    for (const org of organizations) {
      console.log(`\n🏢 Processing organization: ${org.name}`);
      
      // Determine which service this organization should use
      const serviceKey = determineServiceForOrganization(org, clientConfigurations);
      const service = servicesByKey[serviceKey];

      if (!service) {
        console.log(`   ❌ Service not found: ${serviceKey}`);
        continue;
      }

      // Subscribe organization to the service
      try {
        await subscribeOrganizationToService(org, service, 'basic');
        subscriptionCount++;
      } catch (error) {
        console.log(`   ❌ Error subscribing: ${error.message}`);
      }

      // Update client configurations to link to this service
      const orgConfigs = clientConfigurations.filter(c => c.organization_id === org.id);
      for (const config of orgConfigs) {
        try {
          await updateClientConfigurationService(config, service);
          configUpdateCount++;
        } catch (error) {
          console.log(`   ❌ Error updating config: ${error.message}`);
        }
      }
    }

    console.log('\n🎉 Service migration completed!');
    console.log(`✅ Service subscriptions created: ${subscriptionCount}`);
    console.log(`✅ Client configurations updated: ${configUpdateCount}`);
    
    console.log('\n📋 Next steps:');
    console.log('1. Visit /admin/client-config to review service assignments');
    console.log('2. Adjust access levels as needed');
    console.log('3. Create service-specific configurations');
    console.log('4. Test the service-aware API endpoints');

  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateServices()
  .then(() => {
    console.log('\n✨ Service migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Service migration failed:', error);
    process.exit(1);
  }); 