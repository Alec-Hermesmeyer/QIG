import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function debugServices() {
  console.log('🔍 Debugging services setup...')
  
  try {
    // Test basic connection
    console.log('\n1. Testing Supabase connection...')
    const { data: testData, error: testError } = await supabase
      .from('organizations')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.error('❌ Connection test failed:', testError)
      return
    } else {
      console.log('✅ Supabase connection working')
    }

    // Check if services table exists
    console.log('\n2. Checking services table...')
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
    
    console.log('Services query result:')
    console.log('- Data:', services)
    console.log('- Error:', servicesError)
    console.log('- Count:', services?.length || 0)

    // Check if we can access services with different queries
    console.log('\n3. Testing different service queries...')
    
    // Try count query
    const { data: countData, error: countError } = await supabase
      .from('services')
      .select('id', { count: 'exact' })
    
    console.log('Count query:')
    console.log('- Data:', countData)
    console.log('- Error:', countError)

    // Try without RLS (if possible)
    const { data: publicServices, error: publicError } = await supabase
      .from('services')
      .select('id, service_name, service_key')
    
    console.log('Public services query:')
    console.log('- Data:', publicServices)
    console.log('- Error:', publicError)

    // Check organizations table
    console.log('\n4. Checking organizations...')
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name')
    
    console.log('Organizations:')
    console.log('- Data:', orgs)
    console.log('- Error:', orgsError)
    console.log('- Count:', orgs?.length || 0)

    // Check if we're authenticated
    console.log('\n5. Checking authentication...')
    const { data: authData, error: authError } = await supabase.auth.getUser()
    console.log('Auth status:')
    console.log('- User:', authData?.user?.id || 'Not authenticated')
    console.log('- Error:', authError)

  } catch (error) {
    console.error('💥 Debug failed:', error)
  }
}

debugServices() 