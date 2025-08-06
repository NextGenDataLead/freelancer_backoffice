import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthGuard } from '../auth-guard'
import { useUser } from '@clerk/nextjs'

// Mock dependencies according to Vitest documentation
vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn(),
}))

const mockUseRouter = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockUseRouter,
  }),
}))

describe('AuthGuard Component', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should show a loading spinner while checking auth status', () => {
    vi.mocked(useUser).mockReturnValue({ isLoaded: false, isSignedIn: false })
    render(<AuthGuard><div>Protected Content</div></AuthGuard>)
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('should redirect unauthenticated users from a protected route', () => {
    vi.mocked(useUser).mockReturnValue({ isLoaded: true, isSignedIn: false })
    render(<AuthGuard><div>Protected Content</div></AuthGuard>)
    expect(mockUseRouter).toHaveBeenCalledWith('/sign-in')
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('should render children for authenticated users', () => {
    vi.mocked(useUser).mockReturnValue({ isLoaded: true, isSignedIn: true })
    render(<AuthGuard><div>Protected Content</div></AuthGuard>)
    expect(mockUseRouter).not.toHaveBeenCalled()
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('should not redirect if requireAuth is false', () => {
    vi.mocked(useUser).mockReturnValue({ isLoaded: true, isSignedIn: false })
    render(<AuthGuard requireAuth={false}><div>Public Content</div></AuthGuard>)
    expect(mockUseRouter).not.toHaveBeenCalled()
    expect(screen.getByText('Public Content')).toBeInTheDocument()
  })
})
