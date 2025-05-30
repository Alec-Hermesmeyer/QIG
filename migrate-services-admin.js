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
  console.log('🚀 Starting admin service migration...')
  
  try {
    // 1. Check if services exist
    console.log('\n🔍 Checking services...')
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
    
    if (servicesError) {
      console.error('❌ Error fetching services:', servicesError)
      return
    }
    
    if (services.length === 0) {
      console.log('⚠️  No services found! Please run the services migration SQL first.')
      console.log('📝 Go to Supabase → SQL Editor and run: database-migrations-services.sql')
      return
    }
    
    console.log(`✅ Found ${services.length} services:`)
    services.forEach(service => {
      console.log(`   - ${service.service_name} (${service.service_key})`)
    })
    
    // 2. Get all organizations
    console.log('\n📊 Loading organizations...')
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
    
    if (orgsError) {
      console.error('❌ Error fetching organizations:', orgsError)
      return
    }
    
    console.log(`Found ${organizations.length} organizations`)
    
    // 3. Get existing service assignments
    const { data: existingAssignments } = await supabase
      .from('organization_services')
      .select('organization_id, service_id')
    
    const assignmentSet = new Set(
      existingAssignments?.map(a => `${a.organization_id}-${a.service_id}`) || []
    )
    
    let assignmentsCreated = 0
    
    // 4. Process each organization
    for (const org of organizations) {
      console.log(`\n🏢 Processing organization: ${org.name}`)
      
      // Determine which services this org should have
      let assignedServiceKeys = []
      
      if (org.name === 'QIG') {
        // QIG gets all services as admin
        assignedServiceKeys = SERVICE_ASSIGNMENT_RULES['QIG']
        console.log('   🔑 Admin organization - assigning ALL services')
      } else {
        // Check for service-specific assignment rules
        const orgNameLower = org.name.toLowerCase()
        
        // Check if org name contains service keywords
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
      
      // Create service assignments
      for (const serviceKey of assignedServiceKeys) {
        const service = services.find(s => s.service_key === serviceKey)
        if (!service) {
          console.log(`   ❌ Service not found: ${serviceKey}`)
          continue
        }
        
        const assignmentKey = `${org.id}-${service.id}`
        if (assignmentSet.has(assignmentKey)) {
          console.log(`   ⏩ Already assigned: ${service.service_name}`)
          continue
        }
        
        // Create organization service assignment
        const { error: assignError } = await supabase
          .from('organization_services')
          .insert({
            organization_id: org.id,
            service_id: service.id,
            access_level: accessLevel,
            is_active: true,
            subscription_start: new Date().toISOString().split('T')[0],
            service_config: {
              // Custom config can be added here per organization
              features: {},
              limits: {},
              ui_config: {}
            }
          })
        
        if (assignError) {
          console.log(`   ❌ Error assigning ${service.service_name}:`, assignError.message)
        } else {
          console.log(`   ✅ Assigned: ${service.service_name}`)
          assignmentsCreated++
          assignmentSet.add(assignmentKey)
        }
      }
    }
    
    console.log(`\n🎉 Service migration completed!`)
    console.log(`✅ Service assignments created: ${assignmentsCreated}`)
    
    // 5. Show summary
    console.log('\n📋 Assignment Summary:')
    const { data: summary } = await supabase
      .from('organization_service_overview')
      .select('*')
      .order('organization_name, service_name')
    
    if (summary) {
      let currentOrg = ''
      summary.forEach(row => {
        if (row.organization_name !== currentOrg) {
          console.log(`\n🏢 ${row.organization_name}:`)
          currentOrg = row.organization_name
        }
        console.log(`   - ${row.service_name} (${row.access_level})`)
      })
    }
    
    console.log('\n📋 Next steps:')
    console.log('1. Visit /admin/client-config to manage service assignments')
    console.log('2. Create client configurations for each service')
    console.log('3. Test the service-aware API endpoints')
    console.log('4. QIG can now assign/remove services for any organization')
    
    console.log('\n✨ Admin service migration completed successfully')
    
  } catch (error) {
    console.error('💥 Migration failed:', error)
  }
}

migrateServices() 