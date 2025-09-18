'use client'

import { InvoicesContent } from '@/components/financial/invoices/invoices-content'

export default function InvoicesPage() {
  return (
    <div className="container mx-auto p-6">
      <InvoicesContent showHeader={true} />
    </div>
  )
}