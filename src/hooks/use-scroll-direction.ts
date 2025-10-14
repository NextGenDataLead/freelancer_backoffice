import { useState, useEffect } from 'react'

export type ScrollDirection = 'up' | 'down' | 'none'

interface UseScrollDirectionOptions {
  threshold?: number
  initialDirection?: ScrollDirection
}

export function useScrollDirection({
  threshold = 10,
  initialDirection = 'none',
}: UseScrollDirectionOptions = {}) {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>(initialDirection)
  const [isStuck, setIsStuck] = useState(false)

  useEffect(() => {
    let lastScrollY = window.scrollY
    let ticking = false

    const updateScrollDirection = () => {
      const scrollY = window.scrollY

      // Determine if element is stuck (scrolled past initial position)
      setIsStuck(scrollY > threshold)

      // Determine scroll direction
      if (Math.abs(scrollY - lastScrollY) < threshold) {
        ticking = false
        return
      }

      setScrollDirection(scrollY > lastScrollY ? 'down' : 'up')
      lastScrollY = scrollY > 0 ? scrollY : 0
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection)
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [threshold])

  return { scrollDirection, isStuck }
}
