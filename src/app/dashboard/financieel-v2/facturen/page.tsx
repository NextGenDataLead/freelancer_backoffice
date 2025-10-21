'use client'

import { InvoicesContent } from '@/components/financial/invoices/invoices-content'

export default function FacturenPage() {
  return (
    <section className="main-grid" aria-label="Invoices content">
      <article className="glass-card" style={{gridColumn: 'span 12', gridRow: 'span 1'}}>
        <InvoicesContent showHeader={true} />
      </article>
    </section>
  )
}
