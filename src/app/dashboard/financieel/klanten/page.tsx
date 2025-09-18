'use client'

import { ClientsContent } from '@/components/financial/clients/clients-content'

export default function ClientsPage() {
  return (
    <div className="container mx-auto p-6">
      <ClientsContent showHeader={true} />
    </div>
  )
}