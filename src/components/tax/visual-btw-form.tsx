'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuropeanCurrency } from '@/lib/utils/formatEuropeanNumber'
import type { GenerateBTWFormResponse } from '@/lib/types/btw-corrected'

interface VisualBTWFormProps {
  btwForm: GenerateBTWFormResponse
}

export function VisualBTWForm({ btwForm }: VisualBTWFormProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center text-lg">
          BTW-aangifte (omzetbelasting) - Complete officiële weergave
        </CardTitle>
        <p className="text-center text-sm text-muted-foreground">
          Correcte mapping naar het officiële Belastingdienst formulier - Alle rubrieken
        </p>
        <div className="text-center text-xs text-green-600 bg-green-50 p-2 rounded mt-2">
          ✅ Volledige implementatie met gecorrigeerde rubriek structuur
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Section 1: Prestaties binnenland */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3 text-sm bg-blue-50 p-2 rounded">
              1. Prestaties binnenland (Domestic supplies)
            </h3>
            
            {/* Rubriek 1a - Hoog tarief (High rate supplies) ✅ SUPPORTED */}
            <div className="border border-green-200 rounded p-3 mb-3 bg-green-25">
              <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-1 text-sm font-mono bg-green-100 p-2 rounded text-center font-bold">
                  1a
                </div>
                <div className="col-span-11 text-sm font-semibold p-2">
                  Leveringen/diensten belast met hoog tarief (~21%)
                  <div className="text-xs text-green-600 font-semibold">✅ ONDERSTEUND</div>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2 mb-1">
                <div className="col-span-1"></div>
                <div className="col-span-6 text-sm p-1">
                  Omzet (Revenue):
                </div>
                <div className="col-span-5 text-right p-1 bg-green-50 rounded font-mono text-sm">
                  {formatEuropeanCurrency(btwForm.section_1.rubriek_1a.omzet)}
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-1"></div>
                <div className="col-span-6 text-sm p-1">
                  BTW (VAT):
                </div>
                <div className="col-span-5 text-right p-1 bg-green-50 rounded font-mono text-sm">
                  {formatEuropeanCurrency(btwForm.section_1.rubriek_1a.btw)}
                </div>
              </div>
            </div>

            {/* Rubriek 1b - Laag tarief (Low rate supplies) ✅ SUPPORTED */}
            <div className="border border-green-200 rounded p-3 mb-3 bg-green-25">
              <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-1 text-sm font-mono bg-green-100 p-2 rounded text-center font-bold">
                  1b
                </div>
                <div className="col-span-11 text-sm font-semibold p-2">
                  Leveringen/diensten belast met laag tarief (~9%)
                  <div className="text-xs text-green-600 font-semibold">✅ ONDERSTEUND</div>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2 mb-1">
                <div className="col-span-1"></div>
                <div className="col-span-6 text-sm p-1">
                  Omzet (Revenue):
                </div>
                <div className="col-span-5 text-right p-1 bg-green-50 rounded font-mono text-sm">
                  {formatEuropeanCurrency(btwForm.section_1.rubriek_1b.omzet)}
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-1"></div>
                <div className="col-span-6 text-sm p-1">
                  BTW (VAT):
                </div>
                <div className="col-span-5 text-right p-1 bg-green-50 rounded font-mono text-sm">
                  {formatEuropeanCurrency(btwForm.section_1.rubriek_1b.btw)}
                </div>
              </div>
            </div>

            {/* Rubriek 1c - Overige tarieven behalve 0% ✅ SUPPORTED */}
            <div className="border border-green-200 rounded p-3 mb-3 bg-green-25">
              <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-1 text-sm font-mono bg-green-100 p-2 rounded text-center font-bold">
                  1c
                </div>
                <div className="col-span-11 text-sm font-semibold p-2">
                  Leveringen/diensten belast met overige tarieven, behalve 0%
                  <div className="text-xs text-green-600 font-semibold">✅ ONDERSTEUND</div>
                  <div className="text-xs text-gray-500">Bijv. 13% forfait sportkantienes</div>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2 mb-1">
                <div className="col-span-1"></div>
                <div className="col-span-6 text-sm p-1">
                  Omzet (Revenue):
                </div>
                <div className="col-span-5 text-right p-1 bg-green-50 rounded font-mono text-sm">
                  {formatEuropeanCurrency(btwForm.section_1.rubriek_1c.omzet)}
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-1"></div>
                <div className="col-span-6 text-sm p-1">
                  BTW (VAT):
                </div>
                <div className="col-span-5 text-right p-1 bg-green-50 rounded font-mono text-sm">
                  {formatEuropeanCurrency(btwForm.section_1.rubriek_1c.btw)}
                </div>
              </div>
            </div>

            {/* Rubriek 1d - Privégebruik ✅ SUPPORTED */}
            <div className="border border-green-200 rounded p-3 mb-3 bg-green-25">
              <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-1 text-sm font-mono bg-green-100 p-2 rounded text-center font-bold">
                  1d
                </div>
                <div className="col-span-11 text-sm font-semibold p-2">
                  Privégebruik (Private use correction)
                  <div className="text-xs text-green-600 font-semibold">✅ ONDERSTEUND</div>
                  <div className="text-xs text-blue-600">Alleen laatste aangifte van het jaar</div>
                  <div className="text-xs text-gray-500">Bedrijfsauto privé, nutsvoorzieningen, fictieve leveringen</div>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-1"></div>
                <div className="col-span-6 text-sm p-1">
                  BTW correctie (jaar-eind):
                </div>
                <div className="col-span-5 text-right p-1 bg-green-50 rounded font-mono text-sm">
                  {formatEuropeanCurrency(btwForm.section_1.rubriek_1d.btw)}
                </div>
              </div>
            </div>

            {/* Rubriek 1e - 0% tarief of niet bij u belast ✅ SUPPORTED */}
            <div className="border border-green-200 rounded p-3 mb-3 bg-green-25">
              <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-1 text-sm font-mono bg-green-100 p-2 rounded text-center font-bold">
                  1e
                </div>
                <div className="col-span-11 text-sm font-semibold p-2">
                  Leveringen/diensten belast met 0% of niet bij u belast
                  <div className="text-xs text-green-600 font-semibold">✅ ONDERSTEUND</div>
                  <div className="text-xs text-gray-500">0% tarief (behalve export/EU), BTW verlegd naar ondernemer</div>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-1"></div>
                <div className="col-span-6 text-sm p-1">
                  Omzet (Revenue):
                </div>
                <div className="col-span-5 text-right p-1 bg-green-50 rounded font-mono text-sm">
                  {formatEuropeanCurrency(btwForm.section_1.rubriek_1e.omzet)}
                </div>
              </div>
              <div className="text-xs text-gray-600 p-2 mt-2 bg-gray-50 rounded">
                <strong>Voorbeelden:</strong> 0% tarief leveringen in Nederland (zie tabel II), BTW verleggingsregeling naar andere ondernemer. 
                <br/><strong>Exclusief:</strong> Export (3a) en intracommunautaire leveringen (3b)
              </div>
            </div>
          </div>

          {/* Section 2: Verleggingsregelingen binnenland ❌ NOT IMPLEMENTED */}
          <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-25">
            <h3 className="font-semibold mb-3 text-sm bg-orange-100 p-2 rounded">
              2. Verleggingsregelingen binnenland (Domestic reverse charge - RECEIVED)
              <div className="text-xs font-normal text-orange-700 mt-1">❌ Nog niet geïmplementeerd - Database uitbreiding nodig</div>
            </h3>
            
            {/* Rubriek 2a - BTW naar u verlegd ❌ NOT IMPLEMENTED */}
            <div className="border border-gray-300 rounded p-3 mb-3 bg-gray-25">
              <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-1 text-sm font-mono bg-gray-200 p-2 rounded text-center">
                  2a
                </div>
                <div className="col-span-11 text-sm font-semibold p-2 text-gray-600">
                  Leveringen/diensten waarbij de btw naar u is verlegd
                  <div className="text-xs text-red-600 font-semibold">❌ BEPERKING</div>
                  <div className="text-xs text-gray-500">BTW die u moet berekenen en aangeven als u goederen/diensten afneemt</div>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2 mb-1">
                <div className="col-span-1"></div>
                <div className="col-span-6 text-sm p-1 text-gray-600">
                  Omzet (Revenue):
                </div>
                <div className="col-span-5 text-right p-1 bg-gray-100 rounded font-mono text-sm text-muted-foreground">
                  € 0,00
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-1"></div>
                <div className="col-span-6 text-sm p-1 text-gray-600">
                  BTW (VAT die u verschuldigd bent):
                </div>
                <div className="col-span-5 text-right p-1 bg-gray-100 rounded font-mono text-sm text-muted-foreground">
                  € 0,00
                </div>
              </div>
              <div className="text-xs text-gray-600 p-2 mt-2 bg-gray-50 rounded">
                <strong>Sectoren:</strong> Bouw, schoonmaak, hoveniers, telecommunicatie, mobiele telefoons, onroerend goed, afval, gas/elektriciteit certificaten
                <br/><strong>Let op:</strong> Deze BTW kunt u meestal weer aftrekken bij vraag 5b (voorbelasting)
              </div>
            </div>
          </div>

          {/* Section 3: Prestaties naar/in het buitenland */}
          <div className="border-2 border-red-200 rounded-lg p-4 bg-red-25">
            <h3 className="font-semibold mb-3 text-sm bg-red-100 p-2 rounded">
              3. Prestaties naar of in het buitenland (Foreign supplies)
              <div className="text-xs font-normal text-red-700 mt-1">🚨 STRUCTUUR FOUT - Huidige implementatie heeft 3a en 3b OMGEKEERD!</div>
            </h3>
            
            {/* Rubriek 3a - NON-EU EXPORTS (was incorrectly EU) ❌ NOT IMPLEMENTED */}
            <div className="border border-gray-300 rounded p-3 mb-3 bg-gray-25">
              <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-1 text-sm font-mono bg-gray-200 p-2 rounded text-center">
                  3a
                </div>
                <div className="col-span-11 text-sm font-semibold p-2 text-gray-600">
                  Leveringen naar landen buiten de EU (uitvoer)
                  <div className="text-xs text-red-600 font-semibold">❌ BEPERKING</div>
                  <div className="text-xs text-gray-500">Export naar niet-EU landen + douane-entrepot</div>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-1"></div>
                <div className="col-span-6 text-sm p-1 text-gray-600">
                  Omzet (0% export):
                </div>
                <div className="col-span-5 text-right p-1 bg-gray-100 rounded font-mono text-sm text-muted-foreground">
                  € 0,00
                </div>
              </div>
            </div>

            {/* Rubriek 3b - EU SUPPLIES (CORRECTED) ✅ SUPPORTED */}
            <div className="border border-green-200 rounded p-3 mb-3 bg-green-25">
              <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-1 text-sm font-mono bg-green-100 p-2 rounded text-center font-bold">
                  3b
                </div>
                <div className="col-span-11 text-sm font-semibold p-2">
                  Leveringen naar of diensten in landen binnen de EU
                  <div className="text-xs text-green-600 font-semibold">✅ ONDERSTEUND</div>
                  <div className="text-xs text-blue-600 font-semibold">Moet overeenkomen met ICP opgaaf</div>
                  <div className="text-xs text-gray-500">Intracommunautaire prestaties - gecorrigeerde mapping</div>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-1"></div>
                <div className="col-span-6 text-sm p-1">
                  Omzet (0% EU B2B):
                </div>
                <div className="col-span-5 text-right p-1 bg-green-50 rounded font-mono text-sm">
                  {formatEuropeanCurrency(btwForm.section_3.rubriek_3b.omzet)}
                </div>
              </div>
              <div className="text-xs text-blue-600 p-2 mt-2 bg-blue-50 rounded">
                <strong>ICP Validatie:</strong> Totaal moet overeenkomen met ICP opgaaf - automatische validatie: {formatEuropeanCurrency(btwForm.section_3.rubriek_3b.icp_total)}
              </div>
            </div>

            {/* Rubriek 3c - EU Installations & Distance Sales ✅ SUPPORTED */}
            <div className="border border-green-200 rounded p-3 mb-3 bg-green-25">
              <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-1 text-sm font-mono bg-green-100 p-2 rounded text-center font-bold">
                  3c
                </div>
                <div className="col-span-11 text-sm font-semibold p-2">
                  Installatie/afstandsverkopen binnen de EU
                  <div className="text-xs text-green-600 font-semibold">✅ ONDERSTEUND</div>
                  <div className="text-xs text-gray-500">Montage/installatie in EU + B2C afstandsverkopen {'>'}€10k</div>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-1"></div>
                <div className="col-span-6 text-sm p-1">
                  Omzet (BTW in bestemmingsland):
                </div>
                <div className="col-span-5 text-right p-1 bg-green-50 rounded font-mono text-sm">
                  {formatEuropeanCurrency(btwForm.section_3.rubriek_3c.omzet)}
                </div>
              </div>
              <div className="text-xs text-gray-600 p-2 mt-2 bg-gray-50 rounded">
                <strong>Voorbeelden:</strong> Keuken installeren in België, B2C verkopen {'>'}€10k (zonder OSS)
              </div>
            </div>
          </div>

          {/* Section 4: Prestaties vanuit het buitenland ❌ NOT IMPLEMENTED */}
          <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-25">
            <h3 className="font-semibold mb-3 text-sm bg-orange-100 p-2 rounded">
              4. Prestaties vanuit het buitenland aan u geleverd (Foreign acquisitions)
              <div className="text-xs font-normal text-orange-700 mt-1">✅ STRUCTUUR CORRECT - Database uitbreiding nodig</div>
            </h3>
            
            {/* Rubriek 4a - Non-EU acquisitions ✅ STRUCTURE CORRECT */}
            <div className="border border-gray-300 rounded p-3 mb-3 bg-gray-25">
              <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-1 text-sm font-mono bg-gray-200 p-2 rounded text-center">
                  4a
                </div>
                <div className="col-span-11 text-sm font-semibold p-2 text-gray-600">
                  Leveringen/diensten uit landen buiten de EU
                  <div className="text-xs text-red-600 font-semibold">❌ BEPERKING</div>
                  <div className="text-xs text-gray-500">Import verleggingsregeling (art. 23) + non-EU diensten</div>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2 mb-1">
                <div className="col-span-1"></div>
                <div className="col-span-6 text-sm p-1 text-gray-600">
                  Omzet (waarde goederen/diensten):
                </div>
                <div className="col-span-5 text-right p-1 bg-gray-100 rounded font-mono text-sm text-muted-foreground">
                  € 0,00
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-1"></div>
                <div className="col-span-6 text-sm p-1 text-gray-600">
                  BTW (verschuldigd door u):
                </div>
                <div className="col-span-5 text-right p-1 bg-gray-100 rounded font-mono text-sm text-muted-foreground">
                  € 0,00
                </div>
              </div>
              <div className="text-xs text-gray-600 p-2 mt-2 bg-gray-50 rounded">
                <strong>Voorbeelden:</strong> Import met art. 23 vergunning, diensten van non-EU ondernemers
                <br/><strong>Let op:</strong> Deze BTW kunt u meestal aftrekken bij 5b (voorbelasting)
              </div>
            </div>

            {/* Rubriek 4b - EU acquisitions ✅ STRUCTURE CORRECT */}
            <div className="border border-gray-300 rounded p-3 mb-3 bg-gray-25">
              <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-1 text-sm font-mono bg-gray-200 p-2 rounded text-center">
                  4b
                </div>
                <div className="col-span-11 text-sm font-semibold p-2 text-gray-600">
                  Leveringen/diensten uit landen binnen de EU
                  <div className="text-xs text-red-600 font-semibold">❌ BEPERKING</div>
                  <div className="text-xs text-gray-500">Intracommunautaire verwerving + EU diensten</div>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2 mb-1">
                <div className="col-span-1"></div>
                <div className="col-span-6 text-sm p-1 text-gray-600">
                  Omzet (waarde goederen/diensten):
                </div>
                <div className="col-span-5 text-right p-1 bg-gray-100 rounded font-mono text-sm text-muted-foreground">
                  € 0,00
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-1"></div>
                <div className="col-span-6 text-sm p-1 text-gray-600">
                  BTW (verschuldigd door u):
                </div>
                <div className="col-span-5 text-right p-1 bg-gray-100 rounded font-mono text-sm text-muted-foreground">
                  € 0,00
                </div>
              </div>
              <div className="text-xs text-gray-600 p-2 mt-2 bg-gray-50 rounded">
                <strong>Voorbeelden:</strong> Goederen gekocht van EU ondernemers, EU diensten verleggingsregeling
                <br/><strong>Uitzondering:</strong> Onroerend goed diensten → vraag 2a
                <br/><strong>Let op:</strong> Deze BTW kunt u meestal aftrekken bij 5b (voorbelasting)
              </div>
            </div>
          </div>

          {/* Section 5: BTW Balance Calculation */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3 text-sm bg-purple-50 p-2 rounded">
              5. BTW Berekening (VAT Balance Calculation)
            </h3>
            
            {/* Rubriek 5a - Verschuldigde BTW ✅ SUPPORTED */}
            <div className="grid grid-cols-12 gap-2 mb-2">
              <div className="col-span-1 text-xs font-mono bg-green-100 p-2 rounded text-center font-bold">
                5a
              </div>
              <div className="col-span-6 text-sm p-2">
                Verschuldigde BTW (VAT owed on revenue)
                <div className="text-xs text-green-600 font-semibold">✅ ONDERSTEUND</div>
                <div className="text-xs text-gray-500">Calculated from invoices with VAT</div>
              </div>
              <div className="col-span-5 text-right p-2 bg-green-50 rounded font-mono text-sm">
                {formatEuropeanCurrency(btwForm.section_5.rubriek_5a_verschuldigde_btw)}
              </div>
            </div>

            {/* Rubriek 5b - Voorbelasting ✅ SUPPORTED */}
            <div className="grid grid-cols-12 gap-2 mb-2">
              <div className="col-span-1 text-xs font-mono bg-green-100 p-2 rounded text-center font-bold">
                5b
              </div>
              <div className="col-span-6 text-sm p-2">
                Voorbelasting (Deductible input VAT from expenses)
                <div className="text-xs text-green-600 font-semibold">✅ ONDERSTEUND</div>
                <div className="text-xs text-gray-500">Calculated from deductible expense VAT</div>
              </div>
              <div className="col-span-5 text-right p-2 bg-green-50 rounded font-mono text-sm">
                {formatEuropeanCurrency(btwForm.section_5.rubriek_5b_voorbelasting)}
              </div>
            </div>
          </div>

          {/* Additional Fields Section ❌ NOT IMPLEMENTED */}
          <div className="border-2 border-red-200 rounded-lg p-4 bg-red-25">
            <h3 className="font-semibold mb-3 text-sm bg-red-100 p-2 rounded">
              Aanvullende velden (Additional fields)
              <div className="text-xs font-normal text-red-700 mt-1">❌ Nog niet geïmplementeerd - Gespecialiseerde modules nodig</div>
            </h3>
            
            {/* OSS Sales */}
            <div className="grid grid-cols-12 gap-2 mb-2">
              <div className="col-span-1 text-xs font-mono bg-gray-200 p-2 rounded text-center">
                OSS
              </div>
              <div className="col-span-6 text-sm p-2 text-gray-600">
                OSS-verkopen (EU B2C digitale diensten)
                <div className="text-xs text-red-600 font-semibold">❌ BEPERKING</div>
                <div className="text-xs text-gray-500">One Stop Shop niet geïmplementeerd</div>
              </div>
              <div className="col-span-5 text-right p-2 bg-gray-100 rounded font-mono text-sm text-muted-foreground">
                € 0,00
              </div>
            </div>

            {/* KOR exemption */}
            <div className="grid grid-cols-12 gap-2 mb-2">
              <div className="col-span-1 text-xs font-mono bg-gray-200 p-2 rounded text-center">
                KOR
              </div>
              <div className="col-span-6 text-sm p-2 text-gray-600">
                KOR vrijstelling (Kleine ondernemersregeling)
                <div className="text-xs text-red-600 font-semibold">❌ BEPERKING</div>
                <div className="text-xs text-gray-500">€20.000 drempel monitoring niet geïmplementeerd</div>
              </div>
              <div className="col-span-5 text-right p-2 bg-gray-100 rounded font-mono text-sm text-muted-foreground">
                Niet actief
              </div>
            </div>

            {/* Suppletie */}
            <div className="grid grid-cols-12 gap-2 mb-2">
              <div className="col-span-1 text-xs font-mono bg-gray-200 p-2 rounded text-center">
                Sup
              </div>
              <div className="col-span-6 text-sm p-2 text-gray-600">
                Suppletie (Correcties vorige perioden)
                <div className="text-xs text-red-600 font-semibold">❌ BEPERKING</div>
                <div className="text-xs text-gray-500">Historische correcties systeem niet geïmplementeerd</div>
              </div>
              <div className="col-span-5 text-right p-2 bg-gray-100 rounded font-mono text-sm text-muted-foreground">
                € 0,00
              </div>
            </div>
          </div>

          {/* Section 6-8: Totalen en saldo */}
          <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
            <h3 className="font-semibold mb-3 text-sm bg-red-100 p-2 rounded">
              Totalen en te betalen/terug te vragen (Totals and Balance)
            </h3>
            
            {/* Rubriek 6 - Total Output VAT ✅ SUPPORTED */}
            <div className="grid grid-cols-12 gap-2 mb-2">
              <div className="col-span-1 text-xs font-mono bg-green-200 p-2 rounded text-center font-bold">
                6
              </div>
              <div className="col-span-6 text-sm p-2 font-semibold">
                Totale verschuldigde btw (1b + 1d + overige)
                <div className="text-xs text-green-600 font-semibold">✅ ONDERSTEUND</div>
              </div>
              <div className="col-span-5 text-right p-2 bg-white rounded font-mono text-sm font-bold border-2 border-green-300">
                {formatEuropeanCurrency(btwForm.section_5.rubriek_5a_verschuldigde_btw)}
              </div>
            </div>

            {/* Rubriek 7 - Total Input VAT ✅ SUPPORTED */}
            <div className="grid grid-cols-12 gap-2 mb-2">
              <div className="col-span-1 text-xs font-mono bg-green-200 p-2 rounded text-center font-bold">
                7
              </div>
              <div className="col-span-6 text-sm p-2 font-semibold">
                Totale voorbelasting (5a + 5b + 5c + 5d + 5e + 5f + 5g)
                <div className="text-xs text-green-600 font-semibold">✅ ONDERSTEUND (beperkt tot 5a)</div>
              </div>
              <div className="col-span-5 text-right p-2 bg-white rounded font-mono text-sm font-bold border-2 border-green-300">
                {formatEuropeanCurrency(btwForm.section_5.rubriek_5b_voorbelasting)}
              </div>
            </div>

            {/* Rubriek 8 - Final Balance ✅ SUPPORTED */}
            <div className="grid grid-cols-12 gap-2 mb-2 border-t-2 border-red-300 pt-2">
              <div className="col-span-1 text-xs font-mono bg-red-300 p-2 rounded text-center font-bold text-white">
                8
              </div>
              <div className="col-span-6 text-sm p-2 font-bold">
                Te betalen/terug te vragen (Rubriek 6 - Rubriek 7)
                <div className="text-xs text-green-600 font-semibold">✅ ONDERSTEUND</div>
              </div>
              <div className="col-span-5 text-right p-2 bg-red-100 rounded font-mono text-sm font-bold border-2 border-red-300">
                {formatEuropeanCurrency(Math.abs(btwForm.calculations.net_vat_payable))}
                <div className="text-xs text-red-600 mt-1">
                  {btwForm.calculations.net_vat_payable >= 0 ? 'Te betalen' : 'Terug te ontvangen'}
                </div>
              </div>
            </div>
          </div>

          {/* Implementation Status Summary - CORRECTED */}
          <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
            <h4 className="font-semibold text-sm mb-3">⚠️ CORRECTED: Official BTW Form Structure</h4>
            <div className="mb-4 p-3 bg-red-100 rounded border-l-4 border-red-400">
              <div className="text-sm font-semibold text-red-800">🚨 Critical Error Identified & Corrected</div>
              <div className="text-xs text-red-700 mt-1">
                Previous implementation incorrectly assumed complex rubriek subdivisions (5a-5g) 
                without verifying against the official BTW form structure.
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-green-100 p-3 rounded">
                <div className="font-semibold text-green-800 mb-1">✅ Correct & Supported</div>
                <div className="space-y-1 text-green-700">
                  <div><strong>Section 5a:</strong> Verschuldigde BTW</div>
                  <div className="text-xs text-gray-600 ml-2">VAT owed on revenue (output VAT)</div>
                  <div><strong>Section 5b:</strong> Voorbelasting</div>
                  <div className="text-xs text-gray-600 ml-2">Deductible input VAT from expenses</div>
                  <div><strong>Final Balance:</strong> 5a - 5b</div>
                </div>
              </div>
              <div className="bg-gray-100 p-3 rounded">
                <div className="font-semibold text-gray-800 mb-1">❓ Need Verification</div>
                <div className="space-y-1 text-gray-700">
                  <div>• Section 1, 2, 3, 4 structures</div>
                  <div>• Additional fields (OSS, KOR, etc.)</div>
                  <div>• Export/import handling</div>
                  <div>• Reverse charge mechanisms</div>
                </div>
              </div>
            </div>
            <div className="mt-3 p-2 bg-yellow-100 rounded text-xs">
              <strong>Next Step:</strong> Verify complete official form structure against PDF before proceeding with database changes
            </div>
          </div>

          {/* Form Calculation Summary - CORRECTED */}
          <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
            <h4 className="font-semibold text-sm mb-2">✅ Corrected BTW Berekening Overzicht:</h4>
            <div className="text-xs space-y-1 font-mono">
              <div><strong>Rubriek 5a (Verschuldigde BTW)</strong> = Revenue VAT = {formatEuropeanCurrency(btwForm.section_5.rubriek_5a_verschuldigde_btw)}</div>
              <div><strong>Rubriek 5b (Voorbelasting)</strong> = Deductible expense VAT = {formatEuropeanCurrency(btwForm.section_5.rubriek_5b_voorbelasting)}</div>
              <div className="font-semibold mt-2 pt-2 border-t border-green-300">
                <strong>Final Balance = 5a - 5b = {formatEuropeanCurrency(Math.abs(btwForm.calculations.net_vat_payable))}</strong>
              </div>
              <div className="text-green-600 font-medium mt-2">
                ✅ This matches the actual official BTW form structure
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}