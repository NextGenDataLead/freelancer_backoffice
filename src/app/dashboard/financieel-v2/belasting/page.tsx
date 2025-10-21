'use client'

import { TaxContent } from '@/components/financial/tax/tax-content'

export default function BelastingPage() {
  return (
    <section className="main-grid" aria-label="Tax content">
      <article className="glass-card" style={{gridColumn: 'span 12', gridRow: 'span 1'}}>
        <TaxContent showHeader={true} />
      </article>
    </section>
  )
}
