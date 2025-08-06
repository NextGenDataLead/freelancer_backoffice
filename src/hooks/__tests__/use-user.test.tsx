import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Import the hook we want to test
import { useUserProfile } from '../../../hooks/use-user'

// Import the hooks that need to be mocked
import { useUser } from '@clerk/nextjs'
import { useSupabaseClient } from '@/lib/supabase'

// --- Mocking Setup ---
// According to Vitest documentation, `vi.mock` is hoisted to the top of the file.
// This is the correct way to mock entire modules.

// Mock the Clerk hook. We will provide specific implementations for each test.
vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn(),
  useOrganization: vi.fn(() => ({ organization: null })),
}))

// Mock our custom Supabase client hook.
vi.mock('@/lib/supabase', () => ({
  useSupabaseClient: vi.fn(),
}))

// --- Test Wrapper Setup ---
// Hooks that use `react-query` need to be wrapped in a `QueryClientProvider`.
// This helper function creates a new QueryClient for each test to ensure isolation.
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Disable retries for tests to make them run faster and be more predictable
        retry: false,
      },
    },
  })
  // The wrapper component that will provide the context
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// --- Test Suite ---
describe('useUserProfile hook', () => {
  // This is a mock of the Supabase client's fluent API.
  // We create it once and can then specify what its methods return for each test.
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  }

  beforeEach(() => {
    // Reset mocks before each test to ensure a clean state
    vi.resetAllMocks()

    // Set the return value for our mocked custom hook.
    // `vi.mocked` is a Vitest utility to get a typed reference to a mocked function.
    vi.mocked(useSupabaseClient).mockReturnValue(mockSupabase)
  })

  it('should not fetch data if the user is not logged in', () => {
    // --- ARRANGE ---
    // For this test, we simulate an unauthenticated user.
    vi.mocked(useUser).mockReturnValue({ user: null })

    // --- ACT ---
    // Render the hook using the testing library's `renderHook`
    const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper() })

    // --- ASSERT ---
    // The hook should not be in a loading state and should not have data.
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
    // Crucially, we check that no call to the database was made.
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it('should fetch and return the user profile if the user is logged in', async () => {
    // --- ARRANGE ---
    const mockProfileData = { clerk_user_id: 'user_123', email: 'test@example.com', role: 'member' }
    // Simulate an authenticated user
    vi.mocked(useUser).mockReturnValue({ user: { id: 'user_123' } })
    // Tell our mock Supabase client what to return when `single()` is called
    mockSupabase.single.mockResolvedValueOnce({ data: mockProfileData, error: null })

    // --- ACT ---
    const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper() })

    // --- ASSERT ---
    // We need to wait for the `useQuery` hook to resolve.
    await waitFor(() => {
      // isSuccess is a flag from react-query that becomes true after a successful fetch
      expect(result.current.isSuccess).toBe(true)
    })

    // Check that the data returned by the hook is what we expect.
    expect(result.current.data).toEqual(mockProfileData)
    // Verify that the Supabase client was called correctly.
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    expect(mockSupabase.eq).toHaveBeenCalledWith('clerk_user_id', 'user_123')
  })
})