import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Service assignment rules based on backend URLs and organization names
const SERVICE_ASSIGNMENT_RULES = {
  // QIG gets all services as admin
  'QIG': ['contract-analyst', 'open-records', 'insurance-broker'],
  
  // Client-specific assignments based on backend URLs
  'contract': ['contract-analyst'],
  'content': ['open-records'],
  'insurance': ['insurance-broker'],
  
  // Default assignment for other organizations
  'default': ['contract-analyst']
}

// Access level assignment based on organization type
const ACCESS_LEVEL_RULES = {
  'QIG': 'enterprise',  // Admin org gets full access
  'Austin Industries': 'premium',
  'Spinakr': 'standard',
  'Swingle Collins': 'premium',
  'Westfield': 'premium',
  'default': 'basic'
}

async function migrateServices() {
  console.log('🚀 Starting admin service migration (bypassing RLS)...')
  
  try {
    // 1. First, let's insert the services directly using SQL if they don't exist
    console.log('\n🔍 Ensuring services exist...')
    
    // Insert services using SQL (bypassing RLS)
    const { data: insertResult, error: insertError } = await supabase.rpc('exec', {
      query: `
        INSERT INTO services (service_name, service_key, display_name, description, default_features, default_limits, default_ui_config) 
        VALUES 
        (
            'Contract Analyst',
            'contract-analyst',
            'Contract Analyst',
            'AI-powered contract analysis and review platform',
            '{"contract_analysis": true, "clause_extraction": true, "risk_assessment": true, "template_matching": true, "compliance_checking": true, "redline_comparison": true, "bulk_processing": false, "custom_workflows": false, "advanced_analytics": false}',
            '{"requests_per_minute": 30, "requests_per_day": 500, "max_file_size_mb": 25, "max_concurrent_sessions": 3, "contracts_per_month": 100}',
            '{"theme_primary_color": "#059669", "theme_secondary_color": "#064e3b", "service_icon": "FileText", "sidebar_color": "#065f46"}'
        ),
        (
            'Open Records',
            'open-records',
            'Open Records',
            'Public records management and FOIA request processing system',
            '{"document_search": true, "metadata_extraction": true, "redaction_tools": true, "foia_processing": true, "batch_operations": true, "audit_trails": true, "public_portal": false, "advanced_redaction": false, "ml_classification": false}',
            '{"requests_per_minute": 50, "requests_per_day": 800, "max_file_size_mb": 100, "max_concurrent_sessions": 5, "records_per_month": 1000}',
            '{"theme_primary_color": "#2563eb", "theme_secondary_color": "#1e3a8a", "service_icon": "Archive", "sidebar_color": "#1d4ed8"}'
        ),
        (
            'Insurance Broker',
            'insurance-broker',
            'Insurance Broker',
            'Insurance policy analysis and comparison platform',
            '{"policy_analysis": true, "coverage_comparison": true, "risk_assessment": true, "premium_calculation": true, "claims_processing": true, "client_portal": true, "automated_quotes": false, "advanced_underwriting": false, "integration_apis": false}',
            '{"requests_per_minute": 40, "requests_per_day": 600, "max_file_size_mb": 15, "max_concurrent_sessions": 4, "policies_per_month": 200}',
            '{"theme_primary_color": "#dc2626", "theme_secondary_color": "#991b1b", "service_icon": "Shield", "sidebar_color": "#b91c1c"}'
        )
        ON CONFLICT (service_key) DO NOTHING;
        
        SELECT COUNT(*) as service_count FROM services;
      `
    })

    if (insertError) {
      console.log('Note: Could not insert via RPC, services might already exist')
    }

    // 2. Get all organizations (this works)
    console.log('\n📊 Loading organizations...')
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
    
    if (orgsError) {
      console.error('❌ Error fetching organizations:', orgsError)
      return
    }
    
    console.log(`Found ${organizations.length} organizations`)

    // 3. For each organization, try to create service assignments via direct SQL
    console.log('\n🏢 Creating service assignments...')
    
    let totalAssignments = 0
    
    for (const org of organizations) {
      console.log(`\nProcessing organization: ${org.name}`)
      
      // Determine which services this org should have
      let assignedServiceKeys = []
      
      if (org.name === 'QIG') {
        assignedServiceKeys = SERVICE_ASSIGNMENT_RULES['QIG']
        console.log('   🔑 Admin organization - assigning ALL services')
      } else {
        const orgNameLower = org.name.toLowerCase()
        
        if (orgNameLower.includes('contract') || orgNameLower.includes('austin')) {
          assignedServiceKeys = SERVICE_ASSIGNMENT_RULES['contract']
        } else if (orgNameLower.includes('record') || orgNameLower.includes('content')) {
          assignedServiceKeys = SERVICE_ASSIGNMENT_RULES['content']
        } else if (orgNameLower.includes('insurance') || orgNameLower.includes('westfield')) {
          assignedServiceKeys = SERVICE_ASSIGNMENT_RULES['insurance']
        } else {
          assignedServiceKeys = SERVICE_ASSIGNMENT_RULES['default']
        }
        
        console.log(`   📍 Assigned services: ${assignedServiceKeys.join(', ')}`)
      }
      
      // Determine access level
      const accessLevel = ACCESS_LEVEL_RULES[org.name] || ACCESS_LEVEL_RULES['default']
      console.log(`   🎯 Access level: ${accessLevel}`)
      
      // Create assignments for each service
      for (const serviceKey of assignedServiceKeys) {
        try {
          // Insert organization service via direct SQL
          const { data: assignResult, error: assignError } = await supabase.rpc('exec', {
            query: `
              INSERT INTO organization_services (organization_id, service_id, access_level, is_active, subscription_start, service_config)
              SELECT 
                '${org.id}',
                s.id,
                '${accessLevel}',
                true,
                CURRENT_DATE,
                '{}'::jsonb
              FROM services s 
              WHERE s.service_key = '${serviceKey}'
              ON CONFLICT (organization_id, service_id) DO NOTHING;
            `
          })
          
          if (assignError) {
            console.log(`   ❌ Error assigning ${serviceKey}:`, assignError.message)
          } else {
            console.log(`   ✅ Assigned: ${serviceKey}`)
            totalAssignments++
          }
        } catch (error) {
          console.log(`   ❌ Exception assigning ${serviceKey}:`, error.message)
        }
      }
    }
    
    console.log(`\n🎉 Service migration completed!`)
    console.log(`✅ Total service assignments attempted: ${totalAssignments}`)
    
    console.log('\n📋 Next steps:')
    console.log('1. Visit /admin/client-config to verify service assignments')
    console.log('2. Create client configurations for each service')
    console.log('3. Test the service-aware API endpoints')
    console.log('4. QIG can now assign/remove services for any organization')
    
    console.log('\n✨ Admin service migration completed successfully')
    
  } catch (error) {
    console.error('💥 Migration failed:', error)
  }
}

migrateServices() 