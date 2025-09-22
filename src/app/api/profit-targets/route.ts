import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenant_id
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get formatted profit targets
    const { data: targets, error } = await supabaseAdmin
      .rpc('get_formatted_profit_targets', { p_tenant_id: profile.tenant_id })

    if (error) {
      console.error('Error fetching profit targets:', error)
      return NextResponse.json({ error: 'Failed to fetch targets' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: targets[0] || null
    })
  } catch (error) {
    console.error('Error in GET /api/profit-targets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      monthly_revenue_target_cents,
      monthly_cost_target_cents,
      monthly_hours_target,
      target_hourly_rate_cents,
      target_monthly_active_users,
      target_avg_subscription_fee_cents,
      setup_step_completed = 0
    } = body

    // Validation for component-based targets (flexible streams)
    const errors = []

    // Convert undefined to 0 for validation
    const hoursTarget = monthly_hours_target || 0
    const rateTargetCents = target_hourly_rate_cents || 0
    const usersTarget = target_monthly_active_users || 0
    const feeTargetCents = target_avg_subscription_fee_cents || 0

    // Validate ranges if values are provided (> 0)
    if (hoursTarget > 0 && (hoursTarget < 1 || hoursTarget > 300)) {
      errors.push('Monthly hours target must be between 1 and 300 (or 0 to disable)')
    }

    if (rateTargetCents > 0 && (rateTargetCents < 100 || rateTargetCents > 50000)) {
      errors.push('Hourly rate must be between €1 and €500 (or 0 to disable)')
    }

    if (usersTarget > 0 && (usersTarget < 1 || usersTarget > 1000)) {
      errors.push('Monthly active users target must be between 1 and 1000 (or 0 to disable)')
    }

    if (feeTargetCents > 0 && (feeTargetCents < 100 || feeTargetCents > 50000)) {
      errors.push('Average subscription fee must be between €1 and €500 (or 0 to disable)')
    }

    // Validate that at least one complete revenue stream is configured
    const hasTimeBasedStream = hoursTarget > 0 && rateTargetCents > 0
    const hasSubscriptionStream = usersTarget > 0 && feeTargetCents > 0

    if (!hasTimeBasedStream && !hasSubscriptionStream) {
      errors.push('At least one complete revenue stream must be configured: either (Hours + Hourly Rate) or (Subscribers + Subscription Fee)')
    }

    // Validate partial configurations
    if ((hoursTarget > 0 && rateTargetCents === 0) || (hoursTarget === 0 && rateTargetCents > 0)) {
      errors.push('Time-based revenue stream requires both Hours and Hourly Rate to be configured')
    }

    if ((usersTarget > 0 && feeTargetCents === 0) || (usersTarget === 0 && feeTargetCents > 0)) {
      errors.push('Subscription revenue stream requires both Users and Subscription Fee to be configured')
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 400 })
    }

    // Legacy validation for backward compatibility
    if (!monthly_revenue_target_cents || !monthly_cost_target_cents) {
      return NextResponse.json(
        { error: 'Revenue and cost targets are required' },
        { status: 400 }
      )
    }

    // Using supabaseAdmin for service role access

    // Get user's tenant_id and profile_id
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, tenant_id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check if targets already exist
    const { data: existingTargets } = await supabaseAdmin
      .from('profit_targets')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .single()

    let result

    if (existingTargets) {
      // Update existing targets
      const updateData: any = {
        monthly_revenue_target_cents,
        monthly_cost_target_cents,
        setup_step_completed,
        setup_completed_at: setup_step_completed >= 3 ? new Date().toISOString() : null,
        updated_by: profile.id
      }

      // Add component-based fields if provided
      if (monthly_hours_target !== undefined) updateData.monthly_hours_target = monthly_hours_target
      if (target_hourly_rate_cents !== undefined) updateData.target_hourly_rate_cents = target_hourly_rate_cents
      if (target_monthly_active_users !== undefined) updateData.target_monthly_active_users = target_monthly_active_users
      if (target_avg_subscription_fee_cents !== undefined) updateData.target_avg_subscription_fee_cents = target_avg_subscription_fee_cents

      const { data, error } = await supabaseAdmin
        .from('profit_targets')
        .update(updateData)
        .eq('tenant_id', profile.tenant_id)
        .select()
        .single()

      if (error) {
        console.error('Error updating profit targets:', error)
        return NextResponse.json({ error: 'Failed to update targets' }, { status: 500 })
      }
      result = data
    } else {
      // Create new targets
      const insertData: any = {
        tenant_id: profile.tenant_id,
        monthly_revenue_target_cents,
        monthly_cost_target_cents,
        setup_step_completed,
        setup_completed_at: setup_step_completed >= 3 ? new Date().toISOString() : null,
        created_by: profile.id,
        updated_by: profile.id,
        // Set component defaults (0 = not configured)
        monthly_hours_target: monthly_hours_target || 0,
        target_hourly_rate_cents: target_hourly_rate_cents || 0,
        target_monthly_active_users: target_monthly_active_users || 0,
        target_avg_subscription_fee_cents: target_avg_subscription_fee_cents || 0
      }

      const { data, error } = await supabaseAdmin
        .from('profit_targets')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('Error creating profit targets:', error)
        return NextResponse.json({ error: 'Failed to create targets' }, { status: 500 })
      }
      result = data
    }

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error in POST /api/profit-targets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      monthly_revenue_target_cents,
      monthly_cost_target_cents,
      monthly_hours_target,
      target_hourly_rate_cents,
      target_monthly_active_users,
      target_avg_subscription_fee_cents
    } = body

    // Validation for component-based targets (flexible streams)
    const errors = []

    // Convert undefined to 0 for validation
    const hoursTarget = monthly_hours_target || 0
    const rateTargetCents = target_hourly_rate_cents || 0
    const usersTarget = target_monthly_active_users || 0
    const feeTargetCents = target_avg_subscription_fee_cents || 0

    // Validate ranges if values are provided (> 0)
    if (hoursTarget > 0 && (hoursTarget < 1 || hoursTarget > 300)) {
      errors.push('Monthly hours target must be between 1 and 300 (or 0 to disable)')
    }

    if (rateTargetCents > 0 && (rateTargetCents < 100 || rateTargetCents > 50000)) {
      errors.push('Hourly rate must be between €1 and €500 (or 0 to disable)')
    }

    if (usersTarget > 0 && (usersTarget < 1 || usersTarget > 1000)) {
      errors.push('Monthly active users target must be between 1 and 1000 (or 0 to disable)')
    }

    if (feeTargetCents > 0 && (feeTargetCents < 100 || feeTargetCents > 50000)) {
      errors.push('Average subscription fee must be between €1 and €500 (or 0 to disable)')
    }

    // Validate that at least one complete revenue stream is configured
    const hasTimeBasedStream = hoursTarget > 0 && rateTargetCents > 0
    const hasSubscriptionStream = usersTarget > 0 && feeTargetCents > 0

    if (!hasTimeBasedStream && !hasSubscriptionStream) {
      errors.push('At least one complete revenue stream must be configured: either (Hours + Hourly Rate) or (Subscribers + Subscription Fee)')
    }

    // Validate partial configurations
    if ((hoursTarget > 0 && rateTargetCents === 0) || (hoursTarget === 0 && rateTargetCents > 0)) {
      errors.push('Time-based revenue stream requires both Hours and Hourly Rate to be configured')
    }

    if ((usersTarget > 0 && feeTargetCents === 0) || (usersTarget === 0 && feeTargetCents > 0)) {
      errors.push('Subscription revenue stream requires both Users and Subscription Fee to be configured')
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 400 })
    }

    // Legacy validation for backward compatibility
    if (!monthly_revenue_target_cents || !monthly_cost_target_cents) {
      return NextResponse.json(
        { error: 'Revenue and cost targets are required' },
        { status: 400 }
      )
    }

    // Using supabaseAdmin for service role access

    // Get user's tenant_id and profile_id
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, tenant_id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Update targets
    const updateData: any = {
      monthly_revenue_target_cents,
      monthly_cost_target_cents,
      updated_by: profile.id
    }

    // Add component-based fields if provided
    if (monthly_hours_target !== undefined) updateData.monthly_hours_target = monthly_hours_target
    if (target_hourly_rate_cents !== undefined) updateData.target_hourly_rate_cents = target_hourly_rate_cents
    if (target_monthly_active_users !== undefined) updateData.target_monthly_active_users = target_monthly_active_users
    if (target_avg_subscription_fee_cents !== undefined) updateData.target_avg_subscription_fee_cents = target_avg_subscription_fee_cents

    const { data, error } = await supabaseAdmin
      .from('profit_targets')
      .update(updateData)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating profit targets:', error)
      return NextResponse.json({ error: 'Failed to update targets' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data
    })
  } catch (error) {
    console.error('Error in PUT /api/profit-targets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}