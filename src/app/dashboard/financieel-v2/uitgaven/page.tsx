'use client'

import { ExpensesContent } from '@/components/financial/expenses/expenses-content'

export default function UitgavenPage() {
  return (
    <section className="main-grid" aria-label="Expenses content">
      <article className="glass-card" style={{gridColumn: 'span 12', gridRow: 'span 1'}}>
        <ExpensesContent showHeader={true} />
      </article>
    </section>
  )
}
