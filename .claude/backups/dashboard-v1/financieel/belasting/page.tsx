'use client'

import { VATReportingDashboard } from '@/components/tax/vat-reporting-dashboard'

export default function TaxPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Belasting & BTW</h1>
          <p className="text-muted-foreground">
            Nederlandse BTW-aangiften en ICP-opgaven voor zzp'ers
          </p>
        </div>
      </div>

      <VATReportingDashboard />
    </div>
  )
}