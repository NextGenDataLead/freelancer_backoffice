'use client'

import { TaxContent } from '@/components/financial/tax/tax-content'

export default function TaxPage() {
  return (
    <div className="container mx-auto p-6">
      <TaxContent showHeader={true} />
    </div>
  )
}