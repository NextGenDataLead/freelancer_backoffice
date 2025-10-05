import { NextRequest, NextResponse } from 'next/server'
import { getCurrentDate } from '@/lib/current-date'

/**
 * Test endpoint to verify basic API functionality
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') || '2024'
    const quarter = searchParams.get('quarter') || '4'

    return NextResponse.json({
      success: true,
      message: 'Test API working',
      data: {
        year: parseInt(year),
        quarter: parseInt(quarter),
        timestamp: getCurrentDate().toISOString()
      }
    })
  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}