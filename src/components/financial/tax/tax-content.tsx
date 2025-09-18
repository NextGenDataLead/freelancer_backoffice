'use client'

import { VATReportingDashboard } from '@/components/tax/vat-reporting-dashboard'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface TaxContentProps {
  showHeader?: boolean
  className?: string
}

export function TaxContent({ showHeader = true, className = '' }: TaxContentProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header - conditional rendering based on showHeader prop */}
      {showHeader ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/financieel">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Terug naar Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Belasting & BTW</h1>
              <p className="text-muted-foreground mt-1">
                Nederlandse BTW-aangiften en ICP-opgaven voor zzp'ers
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Belasting & BTW</h3>
            <p className="text-muted-foreground text-sm">
              Nederlandse BTW-aangiften en ICP-opgaven voor zzp'ers
            </p>
          </div>
        </div>
      )}

      <VATReportingDashboard />
    </div>
  )
}