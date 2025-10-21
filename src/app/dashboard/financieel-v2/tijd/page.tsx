'use client'

import { TijdContent } from '@/components/financial/time/tijd-content'

export default function TijdPage() {
  return (
    <section className="main-grid" aria-label="Time tracking content">
      <article className="glass-card" style={{gridColumn: 'span 12', gridRow: 'span 1'}}>
        <TijdContent />
      </article>
    </section>
  )
}
