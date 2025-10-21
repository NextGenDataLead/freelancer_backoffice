'use client'

import { RecurringExpensesContent } from '@/components/financial/recurring-expenses/recurring-expenses-content'

export default function TerugkerendeUitgavenPage() {
  return (
    <section className="main-grid" aria-label="Recurring expenses content">
      <article className="glass-card" style={{gridColumn: 'span 12', gridRow: 'span 1'}}>
        <RecurringExpensesContent showHeader={true} />
      </article>
    </section>
  )
}
