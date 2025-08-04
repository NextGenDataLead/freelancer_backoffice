'use client'

import { useReportWebVitals } from 'next/web-vitals'
import { configureWebVitals } from '@/lib/analytics'

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Handle specific Web Vitals metrics
    switch (metric.name) {
      case 'FCP': {
        // First Contentful Paint - when the first DOM content renders
        console.log('FCP:', metric.value, 'ms')
        break
      }
      case 'LCP': {
        // Largest Contentful Paint - when the main content finishes loading
        console.log('LCP:', metric.value, 'ms')
        break
      }
      case 'CLS': {
        // Cumulative Layout Shift - measure of visual stability
        console.log('CLS:', metric.value)
        break
      }
      case 'FID': {
        // First Input Delay - responsiveness to user interaction
        console.log('FID:', metric.value, 'ms')
        break
      }
      case 'INP': {
        // Interaction to Next Paint - newer responsiveness metric
        console.log('INP:', metric.value, 'ms')
        break
      }
      case 'TTFB': {
        // Time to First Byte - server response time
        console.log('TTFB:', metric.value, 'ms')
        break
      }
      case 'Next.js-hydration': {
        // Next.js specific - hydration performance
        console.log('Hydration:', metric.value, 'ms')
        break
      }
      case 'Next.js-route-change-to-render': {
        // Next.js specific - route change performance
        console.log('Route change to render:', metric.value, 'ms')
        break
      }
      case 'Next.js-render': {
        // Next.js specific - render performance
        console.log('Render:', metric.value, 'ms')
        break
      }
      default: {
        console.log('Other metric:', metric.name, metric.value)
        break
      }
    }

    // Send to analytics using the configured function
    const reportWebVitals = configureWebVitals()
    if (reportWebVitals) {
      reportWebVitals(metric)
    }
  })

  return null
}