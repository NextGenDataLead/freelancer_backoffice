'use client'

import { useState, useEffect } from 'react'
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Euro,
  Building2,
  RefreshCw,
  Info,
  Hash
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatEuropeanCurrency, formatBTWBoxAmount } from '@/lib/utils/formatEuropeanNumber'
import { VisualBTWForm } from './visual-btw-form'
import { VisualICPForm } from './visual-icp-form'
import type { GenerateBTWFormResponse } from '@/lib/types/btw-corrected'

// Using the corrected BTW form response structure

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
}

export function VATReportingDashboard() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor((new Date().getMonth() + 3) / 3))
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

  const fetchReports = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch VAT return using corrected BTW endpoint
      const vatResponse = await fetch(`/api/reports/btw-corrected?year=${selectedYear}&quarter=${selectedQuarter}`)
      if (!vatResponse.ok) {
        throw new Error('Failed to fetch VAT return')
      }
      const vatData = await vatResponse.json()
      setBtwForm(vatData.data || vatData)

      // Fetch ICP declaration
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

  useEffect(() => {
    fetchReports()
  }, [selectedYear, selectedQuarter])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            BTW-rapporten laden...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Fout bij laden rapporten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchReports} className="mt-4" variant="outline">
            Opnieuw proberen
          </Button>
        </CardContent>
      </Card>
    )
  }

  const deadline = getSubmissionDeadline(selectedYear, selectedQuarter)
  const isOverdue = isSubmissionOverdue(deadline)
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Nederlandse BTW & ICP Rapportage
              </CardTitle>
              <CardDescription>
                Kwartaal BTW-aangiften en ICP-opgaven voor Nederlandse belastingplicht
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedQuarter.toString()} onValueChange={(value) => setSelectedQuarter(parseInt(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {quarters.map(quarter => (
                    <SelectItem key={quarter.value} value={quarter.value}>{quarter.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={fetchReports} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Ververs
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Rapportageperiode</span>
                </div>
                <div className="text-lg font-bold">Q{selectedQuarter} {selectedYear}</div>
                <p className="text-xs text-muted-foreground">
                  {btwForm ? `Periode: Q${btwForm.period.quarter} ${btwForm.period.year}` : 'Laden...'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Euro className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Netto BTW Positie</span>
                </div>
                <div className="text-lg font-bold">
                  {btwForm ? (
                    <>
                      {formatEuropeanCurrency(Math.abs(btwForm.calculations.net_vat_payable))}
                      <span className="text-sm ml-1">
                        {btwForm.calculations.net_vat_payable >= 0 ? 'te betalen' : 'terug te ontvangen'}
                      </span>
                    </>
                  ) : (
                    'Laden...'
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">
                    Verschuldigd: {formatEuropeanCurrency(btwForm?.section_5.rubriek_5a_verschuldigde_btw || 0)} - Voorbelasting: {formatEuropeanCurrency(btwForm?.section_5.rubriek_5b_voorbelasting || 0)}
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Hash className="h-3 w-3 text-blue-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>BTW Form Rubriek 8: Te betalen/terug te vragen</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Aangiftestatus</span>
                </div>
                <div className="flex items-center gap-2">
                  {btwForm?.validation?.valid ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600">Klaar</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-600">Problemen</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Uiterlijk: {deadline} {isOverdue && <span className="text-red-600">(Verlopen)</span>}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Compliance Issues & Warnings */}
          {(btwForm?.validation?.issues?.length || 0) > 0 && (
            <Alert variant="destructive" className="mb-4">
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
          )}

          {(btwForm?.validation?.warnings?.length || 0) > 0 && (
            <Alert className="mb-4">
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
          )}

          <Tabs defaultValue="vat-return" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="vat-return">BTW Aangifte</TabsTrigger>
              <TabsTrigger value="icp-declaration">ICP Opgaaf</TabsTrigger>
              <TabsTrigger value="export">Exporteren</TabsTrigger>
            </TabsList>

            <TabsContent value="vat-return" className="space-y-4">
              {btwForm && <VisualBTWForm btwForm={btwForm} />}
            </TabsContent>

            <TabsContent value="icp-declaration" className="space-y-4">
              {icpDeclaration && btwForm && <VisualICPForm icpDeclaration={icpDeclaration} btwForm={btwForm} />}
            </TabsContent>

            <TabsContent value="export" className="space-y-4">
              <ExportAndSubmit 
                btwForm={btwForm} 
                icpDeclaration={icpDeclaration} 
                year={selectedYear} 
                quarter={selectedQuarter}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

// VATReturnDetails component removed - VisualBTWForm now handles all BTW display

function ICPDeclarationDetails({ icpDeclaration }: { icpDeclaration: ICPDeclaration }) {
  if (!icpDeclaration.summary.requires_icp_submission) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Geen ICP Opgaaf Vereist</h3>
          <p className="text-muted-foreground">Geen intracommunautaire B2B transacties gevonden voor dit kwartaal.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{icpDeclaration.summary.total_customers}</div>
              <p className="text-sm text-muted-foreground">EU Klanten</p>
              <p className="text-xs">{formatEuropeanCurrency(icpDeclaration.summary.total_services_provided_amount)} geleverd</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{icpDeclaration.summary.total_suppliers}</div>
              <p className="text-sm text-muted-foreground">EU Leveranciers</p>
              <p className="text-xs">{formatEuropeanCurrency(icpDeclaration.summary.total_services_received_amount)} ontvangen</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{icpDeclaration.summary.countries_involved.length}</div>
              <p className="text-sm text-muted-foreground">EU Landen</p>
              <p className="text-xs">{icpDeclaration.summary.countries_involved.join(', ')}</p>
            </CardContent>
          </Card>
        </div>

        {icpDeclaration.services_provided.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Diensten Geleverd aan EU</CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="text-xs">
                      ICP Form
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <p><strong>LandCode:</strong> Country (ISO 3166-1 alpha-2)</p>
                      <p><strong>BtwIdentificatienummer:</strong> EU VAT number</p>
                      <p><strong>TransactieBedrag:</strong> Amount (must match BTW 3b)</p>
                      <p><strong>SoortTransactieCode:</strong> 200-299 for services</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {icpDeclaration.services_provided.map((service, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{service.customer_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {service.customer_vat_number} ({service.country_code})
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatEuropeanCurrency(service.net_amount)}</div>
                      <div className="text-sm text-muted-foreground">{service.transaction_count} facturen</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {icpDeclaration.services_received.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Diensten Ontvangen uit EU</CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-blue-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <p>EU services received are not part of the ICP form.</p>
                      <p>They are reported via reverse charge in the BTW return.</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {icpDeclaration.services_received.map((service, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{service.supplier_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {service.supplier_vat_number} ({service.country_code})
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatEuropeanCurrency(service.net_amount)}</div>
                      <div className="text-sm text-muted-foreground">{service.transaction_count} uitgaven</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  )
}

function ExportAndSubmit({ 
  btwForm, 
  icpDeclaration, 
  year, 
  quarter 
}: { 
  btwForm: GenerateBTWFormResponse | null
  icpDeclaration: ICPDeclaration | null
  year: number
  quarter: number
}) {
  const handleExportVATReturn = () => {
    if (!btwForm) return
    
    const dataStr = JSON.stringify(btwForm, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `btw-aangifte-${year}-Q${quarter}.json`
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
    link.download = `icp-opgaaf-${year}-Q${quarter}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rapporten Exporteren</CardTitle>
          <CardDescription>
            Download rapporten voor handmatige indiening bij de Belastingdienst
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Button 
              onClick={handleExportVATReturn}
              disabled={!btwForm}
              className="h-20 flex flex-col items-center justify-center gap-2"
            >
              <Download className="h-5 w-5" />
              <span>Download BTW Aangifte</span>
              <span className="text-xs opacity-75">JSON Formaat</span>
            </Button>

            <Button 
              onClick={handleExportICP}
              disabled={!icpDeclaration?.summary.requires_icp_submission}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2"
            >
              <Download className="h-5 w-5" />
              <span>Download ICP Opgaaf</span>
              <span className="text-xs opacity-75">
                {icpDeclaration?.summary.requires_icp_submission ? 'JSON Formaat' : 'Niet Vereist'}
              </span>
            </Button>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Handmatige Indiening Vereist:</strong> Deze rapporten moeten ingediend worden via 
              Mijn Belastingdienst Zakelijk of goedgekeurde boekhoudsoftware. Automatische indiening 
              integratie is gepland voor toekomstige releases.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Indiening Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {btwForm?.validation?.valid ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              )}
              <span>BTW aangifte validatie geslaagd</span>
            </div>
            
            <div className="flex items-center gap-3">
              {(icpDeclaration?.summary.requires_icp_submission ? 
                (icpDeclaration.validation?.vat_numbers_checked) : true) ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              )}
              <span>EU BTW-nummers gevalideerd</span>
            </div>

            <div className="flex items-center gap-3">
              {icpDeclaration?.validation?.consistency_with_vat_return ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              )}
              <span>ICP consistent met BTW aangifte</span>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span>Indieningstermijn: {getSubmissionDeadline(year, quarter)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getSubmissionDeadline(year: number, quarter: number): string {
  const deadlines = {
    1: `${year}-04-30`,
    2: `${year}-07-31`, 
    3: `${year}-10-31`,
    4: `${year + 1}-01-31`
  }
  return deadlines[quarter as keyof typeof deadlines]
}