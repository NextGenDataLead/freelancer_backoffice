import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/'),
}))

// Mock Next.js link
vi.mock('next/link', () => ({
  default: vi.fn(({ children, href, ...props }) => {
    // Return a React element, not a DOM element
    return React.createElement('a', { href, ...props }, children)
  })
}))

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    section: 'section',
    h1: 'h1', 
    h2: 'h2',
    p: 'p',
    button: 'button',
  },
  AnimatePresence: vi.fn(({ children }) => children),
}))

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn(() => ({
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: 'test-user-id',
      firstName: 'Test',
      lastName: 'User',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      phoneNumbers: [{ phoneNumber: '+1234567890' }],
    },
  })),
  useOrganization: vi.fn(() => ({
    organization: {
      id: 'test-org-id',
      name: 'Test Organization',
    },
  })),
  SignIn: vi.fn(() => React.createElement('div', { 'data-testid': 'clerk-sign-in' })),
  SignUp: vi.fn(() => React.createElement('div', { 'data-testid': 'clerk-sign-up' })),
  UserButton: vi.fn(() => React.createElement('div', { 'data-testid': 'user-button' })),
}))

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: vi.fn(({ children }) => 
    React.createElement('div', { 'data-testid': 'responsive-container' }, children)
  ),
  AreaChart: vi.fn(({ children }) => 
    React.createElement('div', { 'data-testid': 'area-chart' }, children)
  ),
  LineChart: vi.fn(({ children }) => 
    React.createElement('div', { 'data-testid': 'line-chart' }, children)
  ),
  Area: vi.fn(() => null),
  Line: vi.fn(() => null),
  XAxis: vi.fn(() => null),
  YAxis: vi.fn(() => null),
  CartesianGrid: vi.fn(() => null),
  Tooltip: vi.fn(() => null),
}))

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})