'use client'

import { AuthGuard } from '@/components/auth/auth-guard'
import { BusinessForm } from '@/components/business/business-form'
import { ProfitTargetSettings } from '@/components/financial/profit-targets/profit-target-settings-v2'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Building } from 'lucide-react'
import Link from 'next/link'

export default function BusinessSettingsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/settings">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Terug naar Instellingen
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                  <Building className="mr-2 h-6 w-6" />
                  Bedrijfsinstellingen
                </h1>
                <p className="text-slate-600 mt-1">
                  Configureer uw bedrijfsinformatie voor professionele facturen
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
          <BusinessForm />

          {/* Profit Target Settings */}
          <ProfitTargetSettings />

          {/* Help Information */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Building className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">
                  Waarom bedrijfsinformatie belangrijk is
                </h4>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>KvK Nummer:</strong> Verplicht voor Nederlandse bedrijven op facturen</li>
                    <li><strong>BTW Nummer:</strong> Nodig voor BTW-plichtige ondernemers</li>
                    <li><strong>Bedrijfsnaam:</strong> Zorgt voor professionele uitstraling</li>
                    <li><strong>Contactgegevens:</strong> Maken communicatie met klanten mogelijk</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}