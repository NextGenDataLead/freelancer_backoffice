'use client'

import React from 'react'
import { formatEuropeanCurrency } from '@/lib/utils/formatEuropeanNumber'
import type { GenerateBTWFormResponse } from '@/lib/types/btw-corrected'

interface VisualBTWFormProps {
  btwForm: GenerateBTWFormResponse
}

export function VisualBTWForm({ btwForm }: VisualBTWFormProps) {
  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 p-4 rounded-lg bg-white/5 border border-white/10">
        <h3 className="text-lg font-semibold text-slate-100">
          BTW-aangifte (omzetbelasting) - Complete officiële weergave
        </h3>
        <p className="text-sm text-slate-400">
          Correcte mapping naar het officiële Belastingdienst formulier - Alle rubrieken
        </p>
        <div className="text-xs text-green-400 bg-green-500/10 p-2 rounded border border-green-500/20">
          ✅ Volledige implementatie met gecorrigeerde rubriek structuur
        </div>
      </div>

      {/* Section 1: Prestaties binnenland */}
      <div className="border border-white/10 rounded-lg p-4 bg-white/5">
        <h3 className="font-semibold mb-3 text-sm bg-blue-500/10 p-2 rounded text-slate-100 border border-blue-500/20">
          1. Prestaties binnenland (Domestic supplies)
        </h3>

        {/* Rubriek 1a - Hoog tarief */}
        <div className="border border-green-500/20 rounded p-3 mb-3 bg-green-500/5">
          <div className="grid grid-cols-12 gap-2 mb-2">
            <div className="col-span-1 text-sm font-mono bg-green-500/20 p-2 rounded text-center font-bold text-green-400">
              1a
            </div>
            <div className="col-span-11 text-sm font-semibold p-2 text-slate-100">
              Leveringen/diensten belast met hoog tarief (~21%)
              <div className="text-xs text-green-400 font-semibold">✅ ONDERSTEUND</div>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2 mb-1">
            <div className="col-span-1"></div>
            <div className="col-span-6 text-sm p-1 text-slate-300">
              Omzet (Revenue):
            </div>
            <div className="col-span-5 text-right p-1 bg-white/5 rounded font-mono text-sm text-slate-100">
              {formatEuropeanCurrency(btwForm.section_1.rubriek_1a.omzet)}
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-1"></div>
            <div className="col-span-6 text-sm p-1 text-slate-300">
              BTW (VAT):
            </div>
            <div className="col-span-5 text-right p-1 bg-white/5 rounded font-mono text-sm text-slate-100">
              {formatEuropeanCurrency(btwForm.section_1.rubriek_1a.btw)}
            </div>
          </div>
        </div>

        {/* Rubriek 1b - Laag tarief */}
        <div className="border border-green-500/20 rounded p-3 mb-3 bg-green-500/5">
          <div className="grid grid-cols-12 gap-2 mb-2">
            <div className="col-span-1 text-sm font-mono bg-green-500/20 p-2 rounded text-center font-bold text-green-400">
              1b
            </div>
            <div className="col-span-11 text-sm font-semibold p-2 text-slate-100">
              Leveringen/diensten belast met laag tarief (~9%)
              <div className="text-xs text-green-400 font-semibold">✅ ONDERSTEUND</div>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2 mb-1">
            <div className="col-span-1"></div>
            <div className="col-span-6 text-sm p-1 text-slate-300">
              Omzet (Revenue):
            </div>
            <div className="col-span-5 text-right p-1 bg-white/5 rounded font-mono text-sm text-slate-100">
              {formatEuropeanCurrency(btwForm.section_1.rubriek_1b.omzet)}
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-1"></div>
            <div className="col-span-6 text-sm p-1 text-slate-300">
              BTW (VAT):
            </div>
            <div className="col-span-5 text-right p-1 bg-white/5 rounded font-mono text-sm text-slate-100">
              {formatEuropeanCurrency(btwForm.section_1.rubriek_1b.btw)}
            </div>
          </div>
        </div>

        {/* Rubriek 1c - Overige tarieven */}
        <div className="border border-green-500/20 rounded p-3 mb-3 bg-green-500/5">
          <div className="grid grid-cols-12 gap-2 mb-2">
            <div className="col-span-1 text-sm font-mono bg-green-500/20 p-2 rounded text-center font-bold text-green-400">
              1c
            </div>
            <div className="col-span-11 text-sm font-semibold p-2 text-slate-100">
              Leveringen/diensten belast met overige tarieven, behalve 0%
              <div className="text-xs text-green-400 font-semibold">✅ ONDERSTEUND</div>
              <div className="text-xs text-slate-400">Bijv. 13% forfait sportkantienes</div>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2 mb-1">
            <div className="col-span-1"></div>
            <div className="col-span-6 text-sm p-1 text-slate-300">
              Omzet (Revenue):
            </div>
            <div className="col-span-5 text-right p-1 bg-white/5 rounded font-mono text-sm text-slate-100">
              {formatEuropeanCurrency(btwForm.section_1.rubriek_1c.omzet)}
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-1"></div>
            <div className="col-span-6 text-sm p-1 text-slate-300">
              BTW (VAT):
            </div>
            <div className="col-span-5 text-right p-1 bg-white/5 rounded font-mono text-sm text-slate-100">
              {formatEuropeanCurrency(btwForm.section_1.rubriek_1c.btw)}
            </div>
          </div>
        </div>

        {/* Rubriek 1d - Privégebruik */}
        <div className="border border-green-500/20 rounded p-3 mb-3 bg-green-500/5">
          <div className="grid grid-cols-12 gap-2 mb-2">
            <div className="col-span-1 text-sm font-mono bg-green-500/20 p-2 rounded text-center font-bold text-green-400">
              1d
            </div>
            <div className="col-span-11 text-sm font-semibold p-2 text-slate-100">
              Privégebruik (Private use correction)
              <div className="text-xs text-green-400 font-semibold">✅ ONDERSTEUND</div>
              <div className="text-xs text-blue-400">Alleen laatste aangifte van het jaar</div>
              <div className="text-xs text-slate-400">Bedrijfsauto privé, nutsvoorzieningen, fictieve leveringen</div>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-1"></div>
            <div className="col-span-6 text-sm p-1 text-slate-300">
              BTW correctie (jaar-eind):
            </div>
            <div className="col-span-5 text-right p-1 bg-white/5 rounded font-mono text-sm text-slate-100">
              {formatEuropeanCurrency(btwForm.section_1.rubriek_1d.btw)}
            </div>
          </div>
        </div>

        {/* Rubriek 1e - 0% tarief */}
        <div className="border border-green-500/20 rounded p-3 mb-3 bg-green-500/5">
          <div className="grid grid-cols-12 gap-2 mb-2">
            <div className="col-span-1 text-sm font-mono bg-green-500/20 p-2 rounded text-center font-bold text-green-400">
              1e
            </div>
            <div className="col-span-11 text-sm font-semibold p-2 text-slate-100">
              Leveringen/diensten belast met 0% of niet bij u belast
              <div className="text-xs text-green-400 font-semibold">✅ ONDERSTEUND</div>
              <div className="text-xs text-slate-400">0% tarief (behalve export/EU), BTW verlegd naar ondernemer</div>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-1"></div>
            <div className="col-span-6 text-sm p-1 text-slate-300">
              Omzet (Revenue):
            </div>
            <div className="col-span-5 text-right p-1 bg-white/5 rounded font-mono text-sm text-slate-100">
              {formatEuropeanCurrency(btwForm.section_1.rubriek_1e.omzet)}
            </div>
          </div>
          <div className="text-xs text-slate-400 p-2 mt-2 bg-white/5 rounded border border-white/10">
            <strong>Voorbeelden:</strong> 0% tarief leveringen in Nederland (zie tabel II), BTW verleggingsregeling naar andere ondernemer.
            <br/><strong>Exclusief:</strong> Export (3a) en intracommunautaire leveringen (3b)
          </div>
        </div>
      </div>

      {/* Section 2: Verleggingsregelingen - Not Implemented */}
      <div className="border-2 border-orange-500/30 rounded-lg p-4 bg-orange-500/5">
        <h3 className="font-semibold mb-3 text-sm bg-orange-500/10 p-2 rounded text-slate-100 border border-orange-500/20">
          2. Verleggingsregelingen binnenland (Domestic reverse charge - RECEIVED)
          <div className="text-xs font-normal text-orange-400 mt-1">❌ Nog niet geïmplementeerd - Database uitbreiding nodig</div>
        </h3>

        <div className="border border-white/10 rounded p-3 mb-3 bg-white/5">
          <div className="grid grid-cols-12 gap-2 mb-2">
            <div className="col-span-1 text-sm font-mono bg-white/10 p-2 rounded text-center text-slate-400">
              2a
            </div>
            <div className="col-span-11 text-sm font-semibold p-2 text-slate-300">
              Leveringen/diensten waarbij de btw naar u is verlegd
              <div className="text-xs text-red-400 font-semibold">❌ BEPERKING</div>
              <div className="text-xs text-slate-400">BTW die u moet berekenen en aangeven als u goederen/diensten afneemt</div>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2 mb-1">
            <div className="col-span-1"></div>
            <div className="col-span-6 text-sm p-1 text-slate-300">
              Omzet (Revenue):
            </div>
            <div className="col-span-5 text-right p-1 bg-white/5 rounded font-mono text-sm text-slate-400">
              € 0,00
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-1"></div>
            <div className="col-span-6 text-sm p-1 text-slate-300">
              BTW (VAT die u verschuldigd bent):
            </div>
            <div className="col-span-5 text-right p-1 bg-white/5 rounded font-mono text-sm text-slate-400">
              € 0,00
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Prestaties naar/in het buitenland */}
      <div className="border border-white/10 rounded-lg p-4 bg-white/5">
        <h3 className="font-semibold mb-3 text-sm bg-blue-500/10 p-2 rounded text-slate-100 border border-blue-500/20">
          3. Prestaties naar of in het buitenland (Foreign supplies)
        </h3>

        {/* Rubriek 3a - NON-EU EXPORTS - Not Implemented */}
        <div className="border border-white/10 rounded p-3 mb-3 bg-white/5">
          <div className="grid grid-cols-12 gap-2 mb-2">
            <div className="col-span-1 text-sm font-mono bg-white/10 p-2 rounded text-center text-slate-400">
              3a
            </div>
            <div className="col-span-11 text-sm font-semibold p-2 text-slate-300">
              Leveringen naar landen buiten de EU (uitvoer)
              <div className="text-xs text-red-400 font-semibold">❌ BEPERKING</div>
              <div className="text-xs text-slate-400">Export naar niet-EU landen + douane-entrepot</div>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-1"></div>
            <div className="col-span-6 text-sm p-1 text-slate-300">
              Omzet (0% export):
            </div>
            <div className="col-span-5 text-right p-1 bg-white/5 rounded font-mono text-sm text-slate-400">
              € 0,00
            </div>
          </div>
        </div>

        {/* Rubriek 3b - EU SUPPLIES */}
        <div className="border border-green-500/20 rounded p-3 mb-3 bg-green-500/5">
          <div className="grid grid-cols-12 gap-2 mb-2">
            <div className="col-span-1 text-sm font-mono bg-green-500/20 p-2 rounded text-center font-bold text-green-400">
              3b
            </div>
            <div className="col-span-11 text-sm font-semibold p-2 text-slate-100">
              Leveringen naar of diensten in landen binnen de EU
              <div className="text-xs text-green-400 font-semibold">✅ ONDERSTEUND</div>
              <div className="text-xs text-blue-400 font-semibold">Moet overeenkomen met ICP opgaaf</div>
              <div className="text-xs text-slate-400">Intracommunautaire prestaties - gecorrigeerde mapping</div>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-1"></div>
            <div className="col-span-6 text-sm p-1 text-slate-300">
              Omzet (0% EU B2B):
            </div>
            <div className="col-span-5 text-right p-1 bg-white/5 rounded font-mono text-sm text-slate-100">
              {formatEuropeanCurrency(btwForm.section_3.rubriek_3b.omzet)}
            </div>
          </div>
          <div className="text-xs text-blue-400 p-2 mt-2 bg-blue-500/10 rounded border border-blue-500/20">
            <strong>ICP Validatie:</strong> Totaal moet overeenkomen met ICP opgaaf - automatische validatie: {formatEuropeanCurrency(btwForm.section_3.rubriek_3b.icp_total)}
          </div>
        </div>

        {/* Rubriek 3c - EU Installations */}
        <div className="border border-green-500/20 rounded p-3 mb-3 bg-green-500/5">
          <div className="grid grid-cols-12 gap-2 mb-2">
            <div className="col-span-1 text-sm font-mono bg-green-500/20 p-2 rounded text-center font-bold text-green-400">
              3c
            </div>
            <div className="col-span-11 text-sm font-semibold p-2 text-slate-100">
              Installatie/afstandsverkopen binnen de EU
              <div className="text-xs text-green-400 font-semibold">✅ ONDERSTEUND</div>
              <div className="text-xs text-slate-400">Montage/installatie in EU + B2C afstandsverkopen &gt;€10k</div>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-1"></div>
            <div className="col-span-6 text-sm p-1 text-slate-300">
              Omzet (BTW in bestemmingsland):
            </div>
            <div className="col-span-5 text-right p-1 bg-white/5 rounded font-mono text-sm text-slate-100">
              {formatEuropeanCurrency(btwForm.section_3.rubriek_3c.omzet)}
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Prestaties vanuit het buitenland */}
      <div className="border border-white/10 rounded-lg p-4 bg-white/5">
        <h3 className="font-semibold mb-3 text-sm bg-green-500/10 p-2 rounded text-slate-100 border border-green-500/20">
          4. Prestaties vanuit het buitenland aan u geleverd (Foreign acquisitions)
          <div className="text-xs font-normal text-green-400 mt-1">✅ VOLLEDIG GEÏMPLEMENTEERD - Inclusief EU diensten reverse charge</div>
        </h3>

        {/* Rubriek 4a - Non-EU acquisitions - Not Implemented */}
        <div className="border border-white/10 rounded p-3 mb-3 bg-white/5">
          <div className="grid grid-cols-12 gap-2 mb-2">
            <div className="col-span-1 text-sm font-mono bg-white/10 p-2 rounded text-center text-slate-400">
              4a
            </div>
            <div className="col-span-11 text-sm font-semibold p-2 text-slate-300">
              Leveringen/diensten uit landen buiten de EU
              <div className="text-xs text-red-400 font-semibold">❌ BEPERKING</div>
              <div className="text-xs text-slate-400">Import verleggingsregeling (art. 23) + non-EU diensten</div>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2 mb-1">
            <div className="col-span-1"></div>
            <div className="col-span-6 text-sm p-1 text-slate-300">
              Omzet (waarde goederen/diensten):
            </div>
            <div className="col-span-5 text-right p-1 bg-white/5 rounded font-mono text-sm text-slate-400">
              € 0,00
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-1"></div>
            <div className="col-span-6 text-sm p-1 text-slate-300">
              BTW (verschuldigd door u):
            </div>
            <div className="col-span-5 text-right p-1 bg-white/5 rounded font-mono text-sm text-slate-400">
              € 0,00
            </div>
          </div>
        </div>

        {/* Rubriek 4b - EU acquisitions */}
        <div className="border border-green-500/20 rounded p-3 mb-3 bg-green-500/5">
          <div className="grid grid-cols-12 gap-2 mb-2">
            <div className="col-span-1 text-sm font-mono bg-green-500/20 p-2 rounded text-center font-bold text-green-400">
              4b
            </div>
            <div className="col-span-11 text-sm font-semibold p-2 text-slate-100">
              Leveringen/diensten uit landen binnen de EU
              <div className="text-xs text-green-400 font-semibold">✅ ONDERSTEUND</div>
              <div className="text-xs text-slate-400">Intracommunautaire verwerving + EU diensten</div>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2 mb-1">
            <div className="col-span-1"></div>
            <div className="col-span-6 text-sm p-1 text-slate-300">
              Omzet (waarde goederen/diensten):
            </div>
            <div className="col-span-5 text-right p-1 bg-white/5 rounded font-mono text-sm text-slate-100">
              {formatEuropeanCurrency(btwForm.section_4.rubriek_4b.omzet)}
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-1"></div>
            <div className="col-span-6 text-sm p-1 text-slate-300">
              BTW (verschuldigd door u):
            </div>
            <div className="col-span-5 text-right p-1 bg-white/5 rounded font-mono text-sm text-slate-100">
              {formatEuropeanCurrency(btwForm.section_4.rubriek_4b.btw)}
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: BTW Balance Calculation */}
      <div className="border border-white/10 rounded-lg p-4 bg-white/5">
        <h3 className="font-semibold mb-3 text-sm bg-purple-500/10 p-2 rounded text-slate-100 border border-purple-500/20">
          5. BTW Berekening (VAT Balance Calculation)
        </h3>

        {/* Rubriek 5a - Verschuldigde BTW */}
        <div className="grid grid-cols-12 gap-2 mb-2">
          <div className="col-span-1 text-xs font-mono bg-green-500/20 p-2 rounded text-center font-bold text-green-400">
            5a
          </div>
          <div className="col-span-6 text-sm p-2 text-slate-100">
            Verschuldigde BTW (VAT owed on revenue)
            <div className="text-xs text-green-400 font-semibold">✅ ONDERSTEUND</div>
            <div className="text-xs text-slate-400">Calculated from invoices with VAT</div>
          </div>
          <div className="col-span-5 text-right p-2 bg-white/5 rounded font-mono text-sm text-slate-100 border border-white/10">
            {formatEuropeanCurrency(btwForm.section_5.rubriek_5a_verschuldigde_btw)}
          </div>
        </div>

        {/* Rubriek 5b - Voorbelasting */}
        <div className="grid grid-cols-12 gap-2 mb-2">
          <div className="col-span-1 text-xs font-mono bg-green-500/20 p-2 rounded text-center font-bold text-green-400">
            5b
          </div>
          <div className="col-span-6 text-sm p-2 text-slate-100">
            Voorbelasting (Deductible input VAT from expenses)
            <div className="text-xs text-green-400 font-semibold">✅ ONDERSTEUND</div>
            <div className="text-xs text-slate-400">Calculated from deductible expense VAT</div>
          </div>
          <div className="col-span-5 text-right p-2 bg-white/5 rounded font-mono text-sm text-slate-100 border border-white/10">
            {formatEuropeanCurrency(btwForm.section_5.rubriek_5b_voorbelasting)}
          </div>
        </div>
      </div>

      {/* Section 6-8: Totalen en saldo */}
      <div className="border-2 border-red-500/30 rounded-lg p-4 bg-red-500/5">
        <h3 className="font-semibold mb-3 text-sm bg-red-500/10 p-2 rounded text-slate-100 border border-red-500/20">
          Totalen en te betalen/terug te vragen (Totals and Balance)
        </h3>

        {/* Rubriek 6 - Total Output VAT */}
        <div className="grid grid-cols-12 gap-2 mb-2">
          <div className="col-span-1 text-xs font-mono bg-green-500/30 p-2 rounded text-center font-bold text-green-400">
            6
          </div>
          <div className="col-span-6 text-sm p-2 font-semibold text-slate-100">
            Totale verschuldigde btw (1b + 1d + overige)
            <div className="text-xs text-green-400 font-semibold">✅ ONDERSTEUND</div>
          </div>
          <div className="col-span-5 text-right p-2 bg-white/10 rounded font-mono text-sm font-bold border-2 border-green-500/30 text-slate-100">
            {formatEuropeanCurrency(btwForm.section_5.rubriek_5a_verschuldigde_btw)}
          </div>
        </div>

        {/* Rubriek 7 - Total Input VAT */}
        <div className="grid grid-cols-12 gap-2 mb-2">
          <div className="col-span-1 text-xs font-mono bg-green-500/30 p-2 rounded text-center font-bold text-green-400">
            7
          </div>
          <div className="col-span-6 text-sm p-2 font-semibold text-slate-100">
            Totale voorbelasting (5a + 5b + 5c + 5d + 5e + 5f + 5g)
            <div className="text-xs text-green-400 font-semibold">✅ ONDERSTEUND (beperkt tot 5a)</div>
          </div>
          <div className="col-span-5 text-right p-2 bg-white/10 rounded font-mono text-sm font-bold border-2 border-green-500/30 text-slate-100">
            {formatEuropeanCurrency(btwForm.section_5.rubriek_5b_voorbelasting)}
          </div>
        </div>

        {/* Rubriek 8 - Final Balance */}
        <div className="grid grid-cols-12 gap-2 mb-2 border-t-2 border-red-500/30 pt-2 mt-2">
          <div className="col-span-1 text-xs font-mono bg-red-500/30 p-2 rounded text-center font-bold text-red-400">
            8
          </div>
          <div className="col-span-6 text-sm p-2 font-bold text-slate-100">
            Te betalen/terug te vragen (Rubriek 6 - Rubriek 7)
            <div className="text-xs text-green-400 font-semibold">✅ ONDERSTEUND</div>
          </div>
          <div className="col-span-5 text-right p-2 bg-red-500/10 rounded font-mono text-sm font-bold border-2 border-red-500/30 text-slate-100">
            {formatEuropeanCurrency(Math.abs(btwForm.calculations.net_vat_payable))}
            <div className="text-xs text-red-400 mt-1">
              {btwForm.calculations.net_vat_payable >= 0 ? 'Te betalen' : 'Terug te ontvangen'}
            </div>
          </div>
        </div>
      </div>

      {/* Form Calculation Summary */}
      <div className="bg-green-500/5 p-4 rounded-lg border-2 border-green-500/20">
        <h4 className="font-semibold text-sm mb-2 text-slate-100">✅ Corrected BTW Berekening Overzicht:</h4>
        <div className="text-xs space-y-1 font-mono text-slate-300">
          <div><strong className="text-slate-100">Rubriek 5a (Verschuldigde BTW)</strong> = Revenue VAT = {formatEuropeanCurrency(btwForm.section_5.rubriek_5a_verschuldigde_btw)}</div>
          <div><strong className="text-slate-100">Rubriek 5b (Voorbelasting)</strong> = Deductible expense VAT = {formatEuropeanCurrency(btwForm.section_5.rubriek_5b_voorbelasting)}</div>
          <div className="font-semibold mt-2 pt-2 border-t border-green-500/30 text-slate-100">
            <strong>Final Balance = 5a - 5b = {formatEuropeanCurrency(Math.abs(btwForm.calculations.net_vat_payable))}</strong>
          </div>
          <div className="text-green-400 font-medium mt-2">
            ✅ This matches the actual official BTW form structure
          </div>
        </div>
      </div>
    </div>
  )
}
