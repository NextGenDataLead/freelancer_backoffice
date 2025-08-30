'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuropeanCurrency } from '@/lib/utils/formatEuropeanNumber'

interface VisualICPFormProps {
  icpDeclaration: {
    services_provided: Array<{
      customer_name: string
      customer_vat_number: string
      country_code: string
      net_amount: number
      transaction_count: number
    }>
    summary: {
      total_services_provided_amount: number
      requires_icp_submission: boolean
    }
  }
  btwForm: {
    section_3: {
      rubriek_3b: { omzet: number }
    }
  }
}

export function VisualICPForm({ icpDeclaration, btwForm }: VisualICPFormProps) {
  if (!icpDeclaration.summary.requires_icp_submission) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-lg font-medium mb-2">Geen ICP Opgaaf Vereist</h3>
          <p className="text-muted-foreground">Geen intracommunautaire B2B transacties voor dit kwartaal.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center text-lg">
          ICP Opgaaf (Intracommunautaire Prestaties) - Visuele weergave
        </CardTitle>
        <p className="text-center text-sm text-muted-foreground">
          Exacte mapping naar het officiële ICP formulier
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Form Header Information */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <h3 className="font-semibold mb-3 text-sm">
              Algemene Gegevens (General Data)
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Tijdvak:</strong> Kwartaal rapportage
              </div>
              <div>
                <strong>Transactie Type:</strong> 200-299 (Diensten)
              </div>
            </div>
          </div>

          {/* Connection to BTW Form */}
          <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
            <h3 className="font-semibold mb-3 text-sm">
              🔗 Verbinding met BTW Aangifte
            </h3>
            <div className="grid grid-cols-12 gap-2 mb-2">
              <div className="col-span-3 text-sm font-semibold">BTW Rubriek 3b:</div>
              <div className="col-span-5 text-sm">EU B2B Diensten</div>
              <div className="col-span-4 text-right font-mono text-sm bg-white p-2 rounded">
                {formatEuropeanCurrency(btwForm.section_3.rubriek_3b.omzet)}
              </div>
            </div>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-3 text-sm font-semibold">ICP Totaal:</div>
              <div className="col-span-5 text-sm">Som van alle TransactieBedrag</div>
              <div className="col-span-4 text-right font-mono text-sm bg-white p-2 rounded">
                {formatEuropeanCurrency(icpDeclaration.summary.total_services_provided_amount)}
              </div>
            </div>
            {Math.abs(btwForm.section_3.rubriek_3b.omzet - icpDeclaration.summary.total_services_provided_amount) < 0.01 ? (
              <div className="mt-2 text-green-600 text-sm font-semibold">✅ Bedragen komen overeen</div>
            ) : (
              <div className="mt-2 text-red-600 text-sm font-semibold">⚠️ Bedragen komen niet overeen!</div>
            )}
          </div>

          {/* ICP Form Table */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3 text-sm bg-green-50 p-2 rounded">
              Opgaaf Intracommunautaire Prestaties (ICP Declaration)
            </h3>
            
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 mb-2 bg-gray-100 p-2 rounded text-xs font-semibold">
              <div className="col-span-2">
                LandCode
                <div className="text-gray-500 font-normal">(Country)</div>
              </div>
              <div className="col-span-4">
                BtwIdentificatienummer
                <div className="text-gray-500 font-normal">(VAT Number)</div>
              </div>
              <div className="col-span-1">
                SoortTransactieCode
                <div className="text-gray-500 font-normal">(Type)</div>
              </div>
              <div className="col-span-3">
                TransactieBedrag
                <div className="text-gray-500 font-normal">(Amount)</div>
              </div>
              <div className="col-span-2">
                Details
                <div className="text-gray-500 font-normal">(Info)</div>
              </div>
            </div>

            {/* Table Rows */}
            {icpDeclaration.services_provided.map((service, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 mb-2 p-2 bg-green-50 rounded">
                <div className="col-span-2 text-sm font-mono font-bold text-center bg-white p-2 rounded">
                  {service.country_code}
                </div>
                <div className="col-span-4 text-xs font-mono bg-white p-2 rounded">
                  {service.customer_vat_number}
                  <div className="text-gray-600 mt-1">{service.customer_name}</div>
                </div>
                <div className="col-span-1 text-xs text-center bg-white p-2 rounded">
                  200-299
                  <div className="text-gray-500">Services</div>
                </div>
                <div className="col-span-3 text-sm font-mono text-right bg-white p-2 rounded font-semibold">
                  {formatEuropeanCurrency(service.net_amount)}
                </div>
                <div className="col-span-2 text-xs bg-white p-2 rounded">
                  {service.transaction_count} facturen
                </div>
              </div>
            ))}

            {/* Total Row */}
            <div className="grid grid-cols-12 gap-2 mt-3 p-2 bg-green-100 rounded border-t-2 border-green-300">
              <div className="col-span-7 text-sm font-bold">
                TOTAAL (moet gelijk zijn aan BTW Rubriek 3b):
              </div>
              <div className="col-span-3 text-right font-mono text-sm font-bold bg-white p-2 rounded">
                {formatEuropeanCurrency(icpDeclaration.summary.total_services_provided_amount)}
              </div>
              <div className="col-span-2 text-xs bg-white p-2 rounded">
                {icpDeclaration.services_provided.length} klant(en)
              </div>
            </div>
          </div>

          {/* Form Field Explanations */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">ICP Formulier Velden Uitleg:</h4>
            <div className="text-xs space-y-2">
              <div><strong>LandCode:</strong> ISO 3166-1 alpha-2 landcode (BE, DE, FR, etc.)</div>
              <div><strong>BtwIdentificatienummer:</strong> Geldig EU BTW-nummer van de klant</div>
              <div><strong>SoortTransactieCode:</strong> 200-299 voor diensten, specificeert het type EU transactie</div>
              <div><strong>TransactieBedrag:</strong> Totaal bedrag exclusief BTW voor de rapportageperiode</div>
              <div className="mt-3 p-2 bg-yellow-100 rounded">
                <strong>⚠️ Belangrijke regel:</strong> Het totaal van alle TransactieBedrag velden moet exact gelijk zijn aan het bedrag in BTW Rubriek 3b. Anders wordt de opgaaf geweigerd.
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}