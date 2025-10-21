'use client'

import { ClientsContent } from '@/components/financial/clients/clients-content'

export default function KlantenPage() {
  return (
    <section className="main-grid" aria-label="Clients content">
      <article className="glass-card" style={{gridColumn: 'span 12', gridRow: 'span 1'}}>
        <ClientsContent showHeader={true} />
      </article>
    </section>
  )
}
