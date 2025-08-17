import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if profile exists and is complete
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, clerk_user_id, onboarding_complete, email, role, tenant_id')
      .eq('clerk_user_id', userId)
      .single()

    if (error) {
      console.log('Profile check error:', error)
      return NextResponse.json({ ready: false, error: error.message })
    }

    // Profile is ready if it exists with essential fields
    const isReady = profile && 
                   profile.onboarding_complete && 
                   profile.email && 
                   profile.tenant_id

    console.log('Profile status check:', {
      userId,
      profileExists: !!profile,
      onboardingComplete: profile?.onboarding_complete,
      hasEmail: !!profile?.email,
      hasTenantId: !!profile?.tenant_id,
      isReady
    })

    return NextResponse.json({ 
      ready: isReady,
      profile: profile ? {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        onboarding_complete: profile.onboarding_complete
      } : null
    })
    
  } catch (error) {
    console.error('Error checking profile status:', error)
    return NextResponse.json({ 
      ready: false, 
      error: 'Failed to check profile status' 
    }, { status: 500 })
  }
}