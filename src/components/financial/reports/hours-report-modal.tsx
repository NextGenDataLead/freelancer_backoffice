'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  BarChart3,
  Download,
  Calendar,
  Clock,
  Euro,
  Users,
  TrendingUp,
  FileText,
  Loader2,
  Plus
} from 'lucide-react'

interface HoursReportModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ReportData {
  summary: {
    totalHours: number
    billableHours: number
    nonBillableHours: number
    totalRevenue: number
    averageHourlyRate: number
  }
  clientBreakdown: Array<{
    clientId: string
    clientName: string
    totalHours: number
    billableHours: number
    revenue: number
    averageRate: number
  }>
  projectBreakdown: Array<{
    projectId: string
    projectName: string
    clientName: string
    totalHours: number
    revenue: number
  }>
  dailyBreakdown: Array<{
    date: string
    totalHours: number
    billableHours: number
    revenue: number
  }>
}

export function HoursReportModal({ isOpen, onClose }: HoursReportModalProps) {
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [reportPeriod, setReportPeriod] = useState('this_month')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')

  const fetchReportData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()

      if (reportPeriod === 'custom') {
        if (customDateFrom) params.append('date_from', customDateFrom)
        if (customDateTo) params.append('date_to', customDateTo)
      } else {
        params.append('period', reportPeriod)
      }

      const response = await fetch(`/api/reports/hours?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setReportData(data.data)
      } else {
        console.error('Failed to fetch report data')
      }
    } catch (error) {
      console.error('Error fetching report:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchReportData()
    }
  }, [isOpen, reportPeriod, customDateFrom, customDateTo])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatHours = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}:${m.toString().padStart(2, '0')}`
  }

  const exportToPDF = () => {
    // TODO: Implement PDF export
    alert('PDF export functionality will be implemented soon!')
  }

  const exportToExcel = () => {
    // TODO: Implement Excel export
    alert('Excel export functionality will be implemented soon!')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-6xl w-full h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Uren Rapport</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <Plus className="h-4 w-4 rotate-45" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

        {/* Report Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-2">
            <Label>Periode</Label>
            <Select value={reportPeriod} onValueChange={setReportPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_week">Deze week</SelectItem>
                <SelectItem value="this_month">Deze maand</SelectItem>
                <SelectItem value="this_quarter">Dit kwartaal</SelectItem>
                <SelectItem value="this_year">Dit jaar</SelectItem>
                <SelectItem value="last_month">Vorige maand</SelectItem>
                <SelectItem value="last_quarter">Vorig kwartaal</SelectItem>
                <SelectItem value="custom">Aangepaste periode</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reportPeriod === 'custom' && (
            <>
              <div className="space-y-2">
                <Label>Van datum</Label>
                <Input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tot datum</Label>
                <Input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="flex items-end gap-2">
            <Button onClick={exportToPDF} variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button onClick={exportToExcel} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Rapport wordt geladen...</span>
          </div>
        ) : reportData ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Totale Uren
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatHours(reportData.summary.totalHours)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Factureerbaar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatHours(reportData.summary.billableHours)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-600" />
                    Niet-factureerbaar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatHours(reportData.summary.nonBillableHours)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Euro className="h-4 w-4 text-blue-600" />
                    Totale Omzet
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(reportData.summary.totalRevenue)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Gem. Uurtarief
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(reportData.summary.averageHourlyRate)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Breakdown */}
            <Tabs defaultValue="clients" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="clients">Per Klant</TabsTrigger>
                <TabsTrigger value="projects">Per Project</TabsTrigger>
                <TabsTrigger value="daily">Dagelijks</TabsTrigger>
              </TabsList>

              <TabsContent value="clients" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Overzicht per Klant
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Klant</TableHead>
                          <TableHead className="text-right">Totale Uren</TableHead>
                          <TableHead className="text-right">Factureerbare Uren</TableHead>
                          <TableHead className="text-right">Omzet</TableHead>
                          <TableHead className="text-right">Gem. Tarief</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.clientBreakdown.map((client) => (
                          <TableRow key={client.clientId}>
                            <TableCell className="font-medium">{client.clientName}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatHours(client.totalHours)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatHours(client.billableHours)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(client.revenue)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(client.averageRate)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="projects" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Overzicht per Project
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Project</TableHead>
                          <TableHead>Klant</TableHead>
                          <TableHead className="text-right">Uren</TableHead>
                          <TableHead className="text-right">Omzet</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.projectBreakdown.map((project, index) => (
                          <TableRow key={project.projectId || index}>
                            <TableCell className="font-medium">{project.projectName}</TableCell>
                            <TableCell>{project.clientName}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatHours(project.totalHours)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(project.revenue)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="daily" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Dagelijks Overzicht
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Datum</TableHead>
                          <TableHead className="text-right">Totale Uren</TableHead>
                          <TableHead className="text-right">Factureerbare Uren</TableHead>
                          <TableHead className="text-right">Omzet</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.dailyBreakdown.map((day) => (
                          <TableRow key={day.date}>
                            <TableCell className="font-medium">
                              {new Date(day.date).toLocaleDateString('nl-NL', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short'
                              })}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatHours(day.totalHours)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatHours(day.billableHours)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(day.revenue)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Geen rapportgegevens beschikbaar</p>
          </div>
        )}

        </div>
      </div>
    </div>
  )
}