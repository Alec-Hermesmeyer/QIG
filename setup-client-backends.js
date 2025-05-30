const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Define the client backend configurations to set up
const CLIENT_BACKENDS = [
  {
    organization_name: 'QIG',
    backend_url: 'https://capps-backend-vakcnm7wmon74.salmonbush-fc2963f0.eastus.azurecontainerapps.io',
    description: 'Default/Primary Backend'
  },
  {
    organization_name: 'Austin Industries',
    backend_url: 'https://capps-backend-px4batn2ycs6a.greenground-334066dd.eastus2.azurecontainerapps.io',
    description: 'Austin Industries Backend'
  },
  {
    organization_name: 'Westfield',
    backend_url: 'https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io',
    description: 'Contracts Backend'
  },
  {
    organization_name: 'Content Organization',
    backend_url: 'https://capps-backend-6qjzg44bnug6q.greenmeadow-8b5f0a30.eastus2.azurecontainerapps.io',
    description: 'Content Management Backend'
  }
];

async function checkTablesExist() {
  console.log('🔍 Checking if required tables exist...');
  
  try {
    // Check organizations table
    const { data: orgsData, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1);
    
    if (orgsError) {
      console.error('❌ Organizations table not found!');
      console.error('Please ensure your database is set up with organizations table');
      return false;
    }

    // Check client_configurations table
    const { data: configsData, error: configsError } = await supabase
      .from('client_configurations')
      .select('id')
      .limit(1);
    
    if (configsError) {
      console.error('❌ Client configurations table not found!');
      console.error('Please run the database migrations first');
      return false;
    }
    
    console.log('✅ All required tables exist');
    return true;
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
    return false;
  }
}

async function getOrCreateOrganization(name) {
  // First, try to find existing organization
  const { data: existingOrg, error: findError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('name', name)
    .single();

  if (existingOrg) {
    console.log(`✅ Found existing organization: ${name}`);
    return existingOrg;
  }

  if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw findError;
  }

  // Organization doesn't exist, create it
  console.log(`🏢 Creating organization: ${name}`);
  const { data: newOrg, error: createError } = await supabase
    .from('organizations')
    .insert([{ 
      name: name,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (createError) {
    throw createError;
  }

  console.log(`✅ Created organization: ${name}`);
  return newOrg;
}

async function createClientConfiguration(org, backendUrl, description) {
  // Check if configuration already exists
  const { data: existingConfig } = await supabase
    .from('client_configurations')
    .select('id')
    .eq('organization_id', org.id)
    .single();

  if (existingConfig) {
    console.log(`⚠️  Configuration already exists for ${org.name}, updating...`);
    
    const { error: updateError } = await supabase
      .from('client_configurations')
      .update({
        backend_config: {
          api_url: backendUrl,
          chat_endpoint: '/chat',
          content_endpoint: '/content',
          analyze_endpoint: '/analyze'
        },
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', org.id);

    if (updateError) {
      throw updateError;
    }

    console.log(`✅ Updated backend URL for ${org.name}`);
    return;
  }

  // Create new configuration
  const { data: newConfig, error: createError } = await supabase
    .from('client_configurations')
    .insert([{
      organization_id: org.id,
      client_name: `${org.name} Client`,
      client_type: 'default',
      backend_config: {
        api_url: backendUrl,
        chat_endpoint: '/chat',
        content_endpoint: '/content',
        analyze_endpoint: '/analyze'
      },
      azure_config: {
        tenant_id: '',
        client_id: ''
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
      is_active: true,
      environment: 'production',
      created_by: org.id // Using org.id as fallback for user ID
    }])
    .select()
    .single();

  if (createError) {
    throw createError;
  }

  console.log(`✅ Created configuration for ${org.name}`);
}

async function setupClientBackends() {
  console.log('🚀 Setting up client backend configurations...\n');

  for (const config of CLIENT_BACKENDS) {
    try {
      console.log(`\n📋 Processing: ${config.organization_name}`);
      console.log(`   Backend: ${config.backend_url}`);
      console.log(`   Description: ${config.description}`);

      // Get or create organization
      const org = await getOrCreateOrganization(config.organization_name);

      // Create client configuration
      await createClientConfiguration(org, config.backend_url, config.description);

    } catch (error) {
      console.error(`❌ Error processing ${config.organization_name}:`, error.message);
    }
  }
}

async function showCurrentState() {
  console.log('\n📊 Current backend configurations:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const { data: configs, error } = await supabase
      .from('client_configurations')
      .select(`
        id,
        client_name,
        backend_config,
        is_active,
        organizations!inner(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching configurations:', error);
      return;
    }

    if (!configs || configs.length === 0) {
      console.log('No configurations found.');
      return;
    }

    configs.forEach((config, index) => {
      console.log(`${index + 1}. ${config.organizations.name}`);
      console.log(`   Client: ${config.client_name}`);
      console.log(`   Backend: ${config.backend_config?.api_url || 'Not set'}`);
      console.log(`   Status: ${config.is_active ? 'Active' : 'Inactive'}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error showing current state:', error);
  }
}

async function main() {
  try {
    // Check if required tables exist
    const tablesExist = await checkTablesExist();
    if (!tablesExist) {
      console.log('\n💡 Next steps:');
      console.log('1. Run database migrations first');
      console.log('2. Then run this script again');
      process.exit(1);
    }

    // Set up backend configurations
    await setupClientBackends();

    // Show results
    await showCurrentState();

    console.log('\n🎉 Client backend setup complete!');
    console.log('💡 Next steps:');
    console.log('1. Visit /admin/client-config to manage backends');
    console.log('2. Update your API routes to use the new database-driven URLs');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
main(); 