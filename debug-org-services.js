import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function debugOrgServices() {
  console.log('🔍 Debugging organization services...')
  
  try {
    // Check organization_services table directly
    console.log('\n1. Checking organization_services table...')
    const { data: orgServices, error: orgServicesError } = await supabase
      .from('organization_services')
      .select(`
        id,
        organization_id,
        service_id,
        access_level,
        is_active,
        subscription_start,
        created_at
      `)
    
    if (orgServicesError) {
      console.error('❌ Error fetching organization services:', orgServicesError)
      return
    }
    
    console.log(`Found ${orgServices.length} organization service assignments:`)
    orgServices.forEach(os => {
      console.log(`- Org: ${os.organization_id}, Service: ${os.service_id}, Active: ${os.is_active}, Level: ${os.access_level}`)
    })

    // Check the organization_service_overview view
    console.log('\n2. Checking organization_service_overview view...')
    const { data: overview, error: overviewError } = await supabase
      .from('organization_service_overview')
      .select('*')
      .order('organization_name, service_name')
    
    if (overviewError) {
      console.error('❌ Error fetching service overview:', overviewError)
      return
    }
    
    console.log(`\nService Overview (${overview.length} records):`)
    let currentOrg = ''
    overview.forEach(item => {
      if (item.organization_name !== currentOrg) {
        console.log(`\n🏢 ${item.organization_name}:`)
        currentOrg = item.organization_name
      }
      console.log(`   - ${item.service_name} (${item.access_level}) - Active: ${item.service_active}`)
    })

    // Specifically check Swingle Collins
    console.log('\n3. Specifically checking Swingle Collins...')
    const { data: swingleServices, error: swingleError } = await supabase
      .from('organization_service_overview')
      .select('*')
      .eq('organization_name', 'Swingle Collins')
    
    if (swingleError) {
      console.error('❌ Error fetching Swingle Collins services:', swingleError)
    } else {
      console.log('Swingle Collins services:')
      swingleServices.forEach(service => {
        console.log(`- ${service.service_name}: Active=${service.service_active}, Level=${service.access_level}`)
      })
    }

    // Check for any inactive services
    console.log('\n4. Checking for inactive services...')
    const { data: inactiveServices, error: inactiveError } = await supabase
      .from('organization_services')
      .select(`
        *,
        organizations(name),
        services(service_name)
      `)
      .eq('is_active', false)
    
    if (inactiveError) {
      console.error('❌ Error fetching inactive services:', inactiveError)
    } else {
      console.log(`Found ${inactiveServices.length} inactive service assignments:`)
      inactiveServices.forEach(service => {
        console.log(`- ${service.organizations?.name}: ${service.services?.service_name} (INACTIVE)`)
      })
    }

  } catch (error) {
    console.error('💥 Debug failed:', error)
  }
}

debugOrgServices() 