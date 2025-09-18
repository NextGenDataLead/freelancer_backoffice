'use client'

import { ExpensesContent } from '@/components/financial/expenses/expenses-content'

export default function ExpensesPage() {
  return (
    <div className="container mx-auto p-6">
      <ExpensesContent showHeader={true} />
    </div>
  )
}