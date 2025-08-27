/**
 * Test API endpoint to verify Supabase connection and template config query
 * This helps diagnose the logo display issue in PDF generation
 * WARNING: This is a debug endpoint - remove in production
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create direct Supabase admin client to bypass auth
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET() {
  try {
    console.log('🔍 Testing Supabase admin client connection...')
    
    // Test the exact same query used in template-integration.ts
    const { data: configData, error } = await supabaseAdmin
      .from('invoice_template_config')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
    
    console.log('📊 Query results:')
    console.log('  - Error:', error)
    console.log('  - Data:', configData)
    console.log('  - Logo URL:', configData?.brand_settings?.logo_url)
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
        query_status: 'failed'
      }, { status: 500 })
    }
    
    if (!configData) {
      return NextResponse.json({
        success: false,
        message: 'No active template configuration found',
        query_status: 'no_data'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database connection and query successful',
      query_status: 'success',
      config: {
        id: configData.id,
        name: configData.name,
        is_active: configData.is_active,
        logo_url: configData.brand_settings?.logo_url,
        show_logo: configData.brand_settings?.show_logo,
        brand_settings: configData.brand_settings
      }
    })
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : String(error),
      query_status: 'exception'
    }, { status: 500 })
  }
}