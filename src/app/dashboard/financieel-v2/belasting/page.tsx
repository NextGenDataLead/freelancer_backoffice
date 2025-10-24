'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { GlassmorphicMetricCard } from '@/components/dashboard/glassmorphic-metric-card'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Euro, FileText, AlertTriangle, CheckCircle, RefreshCw, Download } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { VisualBTWForm } from '@/components/tax/visual-btw-form'
import { VisualICPForm } from '@/components/tax/visual-icp-form'
import { formatEuropeanCurrency } from '@/lib/utils/formatEuropeanNumber'
import type { GenerateBTWFormResponse } from '@/lib/types/btw-corrected'

interface ICPDeclaration {
  period: {
    year: number
    quarter: number
    date_from: string
    date_to: string
    generated_at: string
  }
  services_provided: Array<{
    customer_name: string
    customer_vat_number: string
    country_code: string
    net_amount: number
    transaction_count: number
  }>
  services_received: Array<{
    supplier_name: string
    supplier_vat_number: string
    country_code: string
    net_amount: number
    transaction_count: number
  }>
  summary: {
    total_customers: number
    total_suppliers: number
    total_services_provided_amount: number
    total_services_received_amount: number
    countries_involved: string[]
    requires_icp_submission: boolean
  }
  compliance_notes: {
    submission_required: boolean
    submission_deadline: string
    notes: string[]
    warnings: string[]
  }
  validation?: {
    vat_numbers_checked: boolean
    consistency_with_vat_return: boolean
  }
}

export default function BelastingPage() {
  const searchParams = useSearchParams()

  const getInitialYear = () => {
    const yearParam = searchParams.get('year')
    return yearParam ? parseInt(yearParam) : new Date().getFullYear()
  }

  const getInitialQuarter = () => {
    const quarterParam = searchParams.get('quarter')
    return quarterParam ? parseInt(quarterParam) : Math.floor((new Date().getMonth() + 3) / 3)
  }

  const [selectedYear, setSelectedYear] = useState(getInitialYear())
  const [selectedQuarter, setSelectedQuarter] = useState(getInitialQuarter())
  const [btwForm, setBtwForm] = useState<GenerateBTWFormResponse | null>(null)
  const [icpDeclaration, setIcpDeclaration] = useState<ICPDeclaration | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const quarters = [
    { value: '1', label: 'Q1 (Jan-Mar)' },
    { value: '2', label: 'Q2 (Apr-Jun)' },
    { value: '3', label: 'Q3 (Jul-Sep)' },
    { value: '4', label: 'Q4 (Oct-Dec)' }
  ]

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  const getSubmissionDeadline = (year: number, quarter: number) => {
    const deadlines = {
      1: `${year}-04-30`,
      2: `${year}-07-31`,
      3: `${year}-10-31`,
      4: `${year + 1}-01-31`
    }
    return deadlines[quarter as keyof typeof deadlines]
  }

  const isSubmissionOverdue = (deadline: string) => {
    return new Date() > new Date(deadline)
  }

  const fetchReports = async () => {
    setLoading(true)
    setError(null)

    try {
      const vatResponse = await fetch(`/api/reports/btw-corrected?year=${selectedYear}&quarter=${selectedQuarter}`)
      if (!vatResponse.ok) {
        throw new Error('Failed to fetch VAT return')
      }
      const vatData = await vatResponse.json()
      setBtwForm(vatData.data || vatData)

      const icpResponse = await fetch(`/api/reports/icp-declaration?year=${selectedYear}&quarter=${selectedQuarter}`)
      if (!icpResponse.ok) {
        throw new Error('Failed to fetch ICP declaration')
      }
      const icpData = await icpResponse.json()
      setIcpDeclaration(icpData.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports')
      console.error('Error fetching VAT reports:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const yearParam = searchParams.get('year')
    const quarterParam = searchParams.get('quarter')

    if (yearParam) setSelectedYear(parseInt(yearParam))
    if (quarterParam) setSelectedQuarter(parseInt(quarterParam))

    if (yearParam || quarterParam) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams])

  useEffect(() => {
    fetchReports()
  }, [selectedYear, selectedQuarter])

  const deadline = getSubmissionDeadline(selectedYear, selectedQuarter)
  const isOverdue = isSubmissionOverdue(deadline)

  const handleExportVATReturn = () => {
    if (!btwForm) return

    const dataStr = JSON.stringify(btwForm, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `btw-aangifte-${selectedYear}-Q${selectedQuarter}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleExportICP = () => {
    if (!icpDeclaration) return

    const dataStr = JSON.stringify(icpDeclaration, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `icp-opgaaf-${selectedYear}-Q${selectedQuarter}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="main-grid" aria-label="Tax content">
      {/* Metric Cards Section */}
      <article className="glass-card" style={{ gridColumn: 'span 12', gridRow: 'span 1' }}>
        <div className="card-header">
          <div className="flex gap-3 ml-auto">
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-24 bg-white/5 border-white/10 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedQuarter.toString()} onValueChange={(value) => setSelectedQuarter(parseInt(value))}>
              <SelectTrigger className="w-32 bg-white/5 border-white/10 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {quarters.map(quarter => (
                  <SelectItem key={quarter.value} value={quarter.value}>{quarter.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              className="action-chip"
              onClick={fetchReports}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Ververs
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
            {/* Card 1: Reporting Period */}
            <div style={{ gridColumn: 'span 4' }}>
              <GlassmorphicMetricCard
                icon={Calendar}
                iconColor="rgba(59, 130, 246, 0.7)"
                title="Rapportageperiode"
                value={`Q${selectedQuarter} ${selectedYear}`}
                subtitle={btwForm ? `${btwForm.period.date_from} - ${btwForm.period.date_to}` : 'Laden...'}
                badge={{
                  label: `Q${selectedQuarter}`,
                  color: 'rgba(59, 130, 246, 0.25)',
                }}
                gradient="linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(37, 99, 235, 0.08))"
              />
            </div>

            {/* Card 2: Net VAT Position */}
            <div style={{ gridColumn: 'span 4' }}>
              <GlassmorphicMetricCard
                icon={Euro}
                iconColor={btwForm?.calculations.net_vat_payable >= 0 ? "rgba(239, 68, 68, 0.7)" : "rgba(16, 185, 129, 0.7)"}
                title="Netto BTW Positie"
                value={btwForm ? formatEuropeanCurrency(Math.abs(btwForm.calculations.net_vat_payable)) : '...'}
                subtitle={btwForm ? (btwForm.calculations.net_vat_payable >= 0 ? 'te betalen' : 'terug te ontvangen') : 'Laden...'}
                badge={{
                  label: btwForm?.calculations.net_vat_payable >= 0 ? 'Payable' : 'Refund',
                  color: btwForm?.calculations.net_vat_payable >= 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)',
                }}
                gradient={btwForm?.calculations.net_vat_payable >= 0
                  ? "linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.08))"
                  : "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.08))"
                }
              />
            </div>

            {/* Card 3: Filing Status */}
            <div style={{ gridColumn: 'span 4' }}>
              <GlassmorphicMetricCard
                icon={btwForm?.validation?.valid ? CheckCircle : AlertTriangle}
                iconColor={btwForm?.validation?.valid ? "rgba(16, 185, 129, 0.7)" : "rgba(251, 146, 60, 0.7)"}
                title="Aangiftestatus"
                value={btwForm?.validation?.valid ? 'Klaar' : 'Problemen'}
                subtitle={`Uiterlijk: ${deadline}${isOverdue ? ' (Verlopen)' : ''}`}
                badge={{
                  label: btwForm?.validation?.valid ? 'Ready' : 'Issues',
                  color: btwForm?.validation?.valid ? 'rgba(16, 185, 129, 0.25)' : 'rgba(251, 146, 60, 0.35)',
                }}
                gradient={btwForm?.validation?.valid
                  ? "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.08))"
                  : "linear-gradient(135deg, rgba(251, 146, 60, 0.12), rgba(249, 115, 22, 0.08))"
                }
              />
            </div>
          </div>
        )}
      </article>

      {/* Compliance Issues & Warnings */}
      {!loading && !error && (
        <>
          {(btwForm?.validation?.issues?.length || 0) > 0 && (
            <article className="glass-card" style={{ gridColumn: 'span 12', gridRow: 'span 1' }}>
              <CardContent className="pt-6">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Problemen gevonden:</strong>
                    <ul className="mt-1 list-disc list-inside">
                      {btwForm?.validation?.issues?.map((issue, index) => (
                        <li key={index} className="text-sm">{issue}</li>
                      )) || []}
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </article>
          )}

          {(btwForm?.validation?.warnings?.length || 0) > 0 && (
            <article className="glass-card" style={{ gridColumn: 'span 12', gridRow: 'span 1' }}>
              <CardContent className="pt-6">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Waarschuwingen:</strong>
                    <ul className="mt-1 list-disc list-inside">
                      {btwForm?.validation?.warnings?.map((warning, index) => (
                        <li key={index} className="text-sm">{warning}</li>
                      )) || []}
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </article>
          )}
        </>
      )}

      {/* BTW & ICP Tabs */}
      {!loading && !error && btwForm && (
        <article className="glass-card" style={{ gridColumn: 'span 12', gridRow: 'span 1' }}>
          <CardContent className="pt-6">
            <Tabs defaultValue="vat-return" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-white/5">
                <TabsTrigger value="vat-return">BTW Aangifte</TabsTrigger>
                <TabsTrigger value="icp-declaration">ICP Opgaaf</TabsTrigger>
                <TabsTrigger value="export">Exporteren</TabsTrigger>
              </TabsList>

              <TabsContent value="vat-return" className="space-y-4 mt-6">
                {btwForm && <VisualBTWForm btwForm={btwForm} />}
              </TabsContent>

              <TabsContent value="icp-declaration" className="space-y-4 mt-6">
                {icpDeclaration && btwForm && <VisualICPForm icpDeclaration={icpDeclaration} btwForm={btwForm} />}
              </TabsContent>

              <TabsContent value="export" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-100">Rapporten Exporteren</h3>
                    <p className="text-sm text-slate-400">
                      Download rapporten voor handmatige indiening bij de Belastingdienst
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <button
                      onClick={handleExportVATReturn}
                      disabled={!btwForm}
                      className="action-chip h-20 flex flex-col items-center justify-center gap-2"
                    >
                      <Download className="h-5 w-5" />
                      <span>Download BTW Aangifte</span>
                      <span className="text-xs opacity-75">JSON Formaat</span>
                    </button>

                    <button
                      onClick={handleExportICP}
                      disabled={!icpDeclaration?.summary.requires_icp_submission}
                      className="action-chip h-20 flex flex-col items-center justify-center gap-2"
                      style={{ background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)' }}
                    >
                      <Download className="h-5 w-5" />
                      <span>Download ICP Opgaaf</span>
                      <span className="text-xs opacity-75">
                        {icpDeclaration?.summary.requires_icp_submission ? 'JSON Formaat' : 'Niet Vereist'}
                      </span>
                    </button>
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Handmatige Indiening Vereist:</strong> Deze rapporten moeten ingediend worden via
                      Mijn Belastingdienst Zakelijk of goedgekeurde boekhoudsoftware.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3 mt-6 p-4 rounded-lg bg-white/5">
                    <h4 className="font-semibold text-slate-100">Indiening Checklist</h4>
                    <div className="flex items-center gap-3">
                      {btwForm?.validation?.valid ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                      )}
                      <span className="text-sm text-slate-300">BTW aangifte validatie geslaagd</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {(icpDeclaration?.summary.requires_icp_submission ?
                        (icpDeclaration.validation?.vat_numbers_checked) : true) ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                      )}
                      <span className="text-sm text-slate-300">EU BTW-nummers gevalideerd</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {icpDeclaration?.validation?.consistency_with_vat_return ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                      )}
                      <span className="text-sm text-slate-300">ICP consistent met BTW aangifte</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <span className="text-sm text-slate-300">Indieningstermijn: {deadline}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </article>
      )}
    </section>
  )
}
