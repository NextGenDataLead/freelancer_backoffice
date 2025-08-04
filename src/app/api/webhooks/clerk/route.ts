import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { webhookRateLimiter } from '@/lib/rate-limiter'

export async function POST(req: Request) {
  // Rate limiting
  const clientIP = req.headers.get('x-forwarded-for') || 'unknown'
  if (!webhookRateLimiter.check(clientIP)) {
    return new Response('Rate limit exceeded', { status: 429 })
  }

  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env.local')
  }

  // Get the headers
  const headerPayload = headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.text()
  const body = JSON.parse(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occurred', {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data

    try {
      // Create user profile in Supabase
      const { error } = await supabaseAdmin
        .from('profiles')
        .insert({
          clerk_user_id: id,
          email: email_addresses[0]?.email_address,
          first_name,
          last_name,
          avatar_url: image_url,
          role: 'member', // Default role
          // Note: tenant_id will be set later when user joins/creates organization
        })

      if (error) {
        console.error('Error creating user profile:', error)
        return new Response('Error creating user profile', { status: 500 })
      }

      console.log('User profile created successfully for:', id)
    } catch (err) {
      console.error('Error processing user.created webhook:', err)
      return new Response('Error processing webhook', { status: 500 })
    }
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data

    try {
      // Update user profile in Supabase
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          email: email_addresses[0]?.email_address,
          first_name,
          last_name,
          avatar_url: image_url,
          updated_at: new Date().toISOString(),
        })
        .eq('clerk_user_id', id)

      if (error) {
        console.error('Error updating user profile:', error)
        return new Response('Error updating user profile', { status: 500 })
      }

      console.log('User profile updated successfully for:', id)
    } catch (err) {
      console.error('Error processing user.updated webhook:', err)
      return new Response('Error processing webhook', { status: 500 })
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data

    try {
      // Soft delete or anonymize user data for GDPR compliance
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          is_active: false,
          email: `deleted-${id}@anonymous.local`,
          first_name: 'Deleted',
          last_name: 'User',
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('clerk_user_id', id)

      if (error) {
        console.error('Error deleting user profile:', error)
        return new Response('Error deleting user profile', { status: 500 })
      }

      console.log('User profile soft deleted successfully for:', id)
    } catch (err) {
      console.error('Error processing user.deleted webhook:', err)
      return new Response('Error processing webhook', { status: 500 })
    }
  }

  // Handle organization events
  if (eventType === 'organization.created') {
    const { id, name, slug, created_by } = evt.data

    try {
      // Get the user's profile to extract tenant_id
      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, tenant_id')
        .eq('clerk_user_id', created_by)
        .single()

      if (userProfile) {
        // Create organization in Supabase
        const { error } = await supabaseAdmin
          .from('organizations')
          .insert({
            clerk_org_id: id,
            tenant_id: userProfile.tenant_id,
            name,
            slug,
          })

        if (error) {
          console.error('Error creating organization:', error)
          return new Response('Error creating organization', { status: 500 })
        }

        console.log('Organization created successfully:', id)
      }
    } catch (err) {
      console.error('Error processing organization.created webhook:', err)
      return new Response('Error processing webhook', { status: 500 })
    }
  }

  if (eventType === 'organizationMembership.created') {
    const { organization, public_user_data } = evt.data

    try {
      // Get organization and user data
      const [orgResult, userResult] = await Promise.all([
        supabaseAdmin
          .from('organizations')
          .select('id')
          .eq('clerk_org_id', organization.id)
          .single(),
        supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('clerk_user_id', public_user_data.user_id)
          .single()
      ])

      if (orgResult.data && userResult.data) {
        // Create organization membership
        const { error } = await supabaseAdmin
          .from('organization_memberships')
          .insert({
            organization_id: orgResult.data.id,
            user_id: userResult.data.id,
            role: 'member', // Default role, can be updated later
          })

        if (error) {
          console.error('Error creating organization membership:', error)
          return new Response('Error creating organization membership', { status: 500 })
        }

        console.log('Organization membership created successfully')
      }
    } catch (err) {
      console.error('Error processing organizationMembership.created webhook:', err)
      return new Response('Error processing webhook', { status: 500 })
    }
  }

  return new Response('', { status: 200 })
}