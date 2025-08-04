// Manual webhook test
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Supabase URL:', supabaseUrl)
console.log('Service Key exists:', !!supabaseServiceKey)

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testWebhook() {
  console.log('Testing manual user creation...')
  
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      clerk_user_id: 'test_user_123',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'member'
    })
    .select()

  if (error) {
    console.error('Error creating profile:', error)
  } else {
    console.log('Profile created successfully:', data)
  }

  // Check if it exists
  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .limit(5)

  if (fetchError) {
    console.error('Error fetching profiles:', fetchError)
  } else {
    console.log('Current profiles:', profiles)
  }
}

testWebhook()