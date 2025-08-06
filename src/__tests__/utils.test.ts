import { describe, it, expect } from 'vitest'
import { cn } from '../lib/utils'

describe('Utilities', () => {
  describe('cn', () => {
    it('should merge and deduplicate tailwind classes', () => {
      // Simple merge
      expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white')

      // Overriding classes
      expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')

      // Merging with conditional classes
      expect(cn('p-4', { 'm-2': true, 'm-4': false })).toBe('p-4 m-2')

      // Handling conflicting classes
      expect(cn('p-2', 'p-4')).toBe('p-4')
      expect(cn('px-2', 'p-4')).toBe('p-4')
      expect(cn('p-4', 'px-2')).toBe('p-4 px-2')

      // Handling null, undefined, and boolean values
      expect(cn('p-4', null, undefined, false, 'm-2')).toBe('p-4 m-2')
    })
  })
})
