import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse,
  createPaginatedResponse
} from '@/lib/supabase/financial-client'

// Validation schemas
const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  client_id: z.string().uuid('Valid client ID is required'),
  hourly_rate: z.any().optional()
})

const ProjectsQuerySchema = z.object({
  page: z.string().optional().default('1').transform(val => parseInt(val, 10)),
  limit: z.string().optional().default('20').transform(val => Math.min(parseInt(val, 10), 100)),
  search: z.string().optional(),
  client_id: z.string().uuid().optional(),
  active: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined)
})

/**
 * GET /api/projects
 * Retrieves paginated list of projects for the current tenant
 */
export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    const validatedQuery = ProjectsQuerySchema.parse(queryParams)
    
    // Get user's profile and tenant_id
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.UserProfileNotFound, { 
        status: ApiErrors.UserProfileNotFound.status 
      })
    }

    // Build query with client information
    let query = supabaseAdmin
      .from('projects')
      .select(`
        *,
        clients (
          id,
          name,
          company_name,
          is_business,
          hourly_rate
        )
      `, { count: 'exact' })
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (validatedQuery.search) {
      query = query.or(`name.ilike.%${validatedQuery.search}%,description.ilike.%${validatedQuery.search}%`)
    }

    if (validatedQuery.client_id) {
      query = query.eq('client_id', validatedQuery.client_id)
    }

    if (validatedQuery.active !== undefined) {
      query = query.eq('active', validatedQuery.active)
    }

    // Apply pagination
    const from = (validatedQuery.page - 1) * validatedQuery.limit
    const to = from + validatedQuery.limit - 1
    
    query = query.range(from, to)

    const { data: projects, error, count } = await query

    if (error) {
      console.error('Error fetching projects:', error)
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }

    const totalPages = count ? Math.ceil(count / validatedQuery.limit) : 0

    const response = createPaginatedResponse(
      projects || [],
      {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        total: count || 0,
        totalPages
      },
      'Projects fetched successfully'
    )

    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.issues 
      }, { status: 400 })
    }

    console.error('Projects fetch error:', error)
    return NextResponse.json(ApiErrors.InternalError, { 
      status: ApiErrors.InternalError.status 
    })
  }
}

/**
 * POST /api/projects
 * Creates a new project for the current tenant
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: 401 })
    }

    const body = await request.json()
    
    console.log('Project creation request body:', body)
    
    // Validate request data
    const validatedData = CreateProjectSchema.parse(body)
    
    console.log('Validated project data:', validatedData)

    // Get user's profile and tenant_id
    const profile = await getCurrentUserProfile()
    
    console.log('Profile lookup result for project creation:', profile)
    
    if (!profile) {
      console.error('No profile found for current user during project creation')
      return NextResponse.json(ApiErrors.UserProfileNotFound, { 
        status: ApiErrors.UserProfileNotFound.status 
      })
    }

    // Verify client exists and belongs to tenant
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, name')
      .eq('id', validatedData.client_id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    console.log('Client lookup result:', { client, clientError, client_id: validatedData.client_id, tenant_id: profile.tenant_id })

    if (clientError || !client) {
      console.error('Client lookup failed:', clientError)
      return NextResponse.json({ 
        error: 'Client not found or access denied' 
      }, { status: 404 })
    }

    // Create project
    const insertData = {
      ...validatedData,
      tenant_id: profile.tenant_id,
      created_by: profile.id
    }
    
    console.log('About to insert project with data:', insertData)
    
    const { data: newProject, error: createError } = await supabaseAdmin
      .from('projects')
      .insert(insertData)
      .select(`
        *,
        clients (
          id,
          name,
          company_name,
          is_business,
          hourly_rate
        )
      `)
      .single()

    if (createError) {
      console.error('Error creating project:', createError)
      console.error('Error details:', {
        code: createError.code,
        message: createError.message,
        details: createError.details,
        hint: createError.hint
      })
      
      // Handle unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json({ 
          error: 'Er bestaat al een project met deze naam voor deze klant' 
        }, { status: 409 })
      }
      
      // Handle foreign key constraint violation
      if (createError.code === '23503') {
        return NextResponse.json({ 
          error: 'Ongeldige klant ID of gebruikers referentie' 
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to create project',
        details: process.env.NODE_ENV === 'development' ? createError.message : undefined
      }, { status: 500 })
    }

    const response = createApiResponse(newProject, 'Project created successfully')
    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.issues 
      }, { status: 400 })
    }

    console.error('Project creation error:', error)
    return NextResponse.json(ApiErrors.InternalError, { 
      status: ApiErrors.InternalError.status 
    })
  }
}