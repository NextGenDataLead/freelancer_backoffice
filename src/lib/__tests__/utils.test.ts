import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('px-2 py-1', 'px-3')).toBe('py-1 px-3')
    })

    it('should handle conditional classes', () => {
      expect(cn('px-2', true && 'py-1', false && 'hidden')).toBe('px-2 py-1')
    })

    it('should handle empty inputs', () => {
      expect(cn()).toBe('')
    })
  })
})