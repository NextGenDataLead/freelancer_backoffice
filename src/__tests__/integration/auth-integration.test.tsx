import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { useUser } from '@clerk/nextjs'

// Mock useRouter
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock Clerk with different scenarios
vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn(),
}))

describe('Authentication Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AuthGuard Component', () => {
    it('shows loading state when Clerk is not loaded', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: false,
        isSignedIn: false,
      })

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('redirects to sign-in when user is not authenticated', async () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: false,
      })

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/sign-in')
      })

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('renders children when user is authenticated', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
      })

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('uses custom redirect path', async () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: false,
      })

      render(
        <AuthGuard redirectTo="/custom-login">
          <div>Protected Content</div>
        </AuthGuard>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/custom-login')
      })
    })

    it('allows access when requireAuth is false', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: false,
      })

      render(
        <AuthGuard requireAuth={false}>
          <div>Public Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Public Content')).toBeInTheDocument()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('handles Clerk loading state transitions', async () => {
      // Start with loading
      vi.mocked(useUser).mockReturnValue({
        isLoaded: false,
        isSignedIn: false,
      })

      const { rerender } = render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()

      // Simulate Clerk finishing load with authenticated user
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
      })

      rerender(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('handles authentication state changes', async () => {
      // Start authenticated
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
      })

      const { rerender } = render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Protected Content')).toBeInTheDocument()

      // User logs out
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: false,
      })

      rerender(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/sign-in')
      })
    })
  })

  describe('Authentication Flow Scenarios', () => {
    it('handles rapid authentication state changes', async () => {
      const states = [
        { isLoaded: false, isSignedIn: false },
        { isLoaded: true, isSignedIn: false },
        { isLoaded: true, isSignedIn: true },
      ]

      let stateIndex = 0
      vi.mocked(useUser).mockImplementation(() => states[stateIndex])

      const { rerender } = render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      // Loading state
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()

      // Not authenticated
      stateIndex = 1
      rerender(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/sign-in')
      })

      // Authenticated
      stateIndex = 2
      mockPush.mockClear()
      
      rerender(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('preserves loading spinner styling', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: false,
        isSignedIn: false,
      })

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      const spinner = screen.getByTestId('loading-spinner')
      expect(spinner).toHaveClass(
        'animate-spin',
        'rounded-full',
        'h-8',
        'w-8',
        'border-b-2',
        'border-blue-600'
      )
    })

    it('centers loading spinner properly', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: false,
        isSignedIn: false,
      })

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      const container = screen.getByTestId('loading-spinner').parentElement
      expect(container).toHaveClass(
        'min-h-screen',
        'flex',
        'items-center',
        'justify-center'
      )
    })
  })
})