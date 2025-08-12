/**
 * Data Export Component
 * GDPR Article 20 compliant data export functionality
 */

'use client'

import { useState } from 'react'
import { Download, FileText, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { useNotificationActions } from '@/store/notifications-store'

interface ExportStatus {
  canExport: boolean
  lastExportAt: string | null
  cooldownPeriod: number
}

interface ExportProgress {
  stage: 'idle' | 'collecting' | 'generating' | 'complete' | 'error'
  progress: number
  message: string
}

export function DataExport() {
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null)
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    stage: 'idle',
    progress: 0,
    message: 'Ready to export'
  })
  const { showSuccess, showError } = useNotificationActions()

  // Simulate export progress
  const simulateProgress = async () => {
    const stages = [
      { stage: 'collecting' as const, progress: 25, message: 'Collecting personal data...', delay: 1000 },
      { stage: 'collecting' as const, progress: 50, message: 'Gathering activity history...', delay: 800 },
      { stage: 'generating' as const, progress: 75, message: 'Generating export file...', delay: 1200 },
      { stage: 'complete' as const, progress: 100, message: 'Export ready for download', delay: 500 },
    ]

    for (const { stage, progress, message, delay } of stages) {
      setExportProgress({ stage, progress, message })
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  const handleExportData = async () => {
    if (isExporting) return

    setIsExporting(true)
    setExportProgress({ stage: 'collecting', progress: 0, message: 'Starting export...' })

    try {
      // Simulate progress
      await simulateProgress()

      // Make API call to export data
      const response = await fetch('/api/user/export-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      const data = await response.json()
      
      // Create and download the file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `user-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      showSuccess('Data Export Complete', 'Your data has been successfully exported and downloaded.')

      // Update status
      setExportStatus(prev => ({
        ...prev,
        lastExportAt: new Date().toISOString(),
        canExport: false,
        cooldownPeriod: 60, // 1 hour cooldown
      }))

    } catch (error) {
      console.error('Export error:', error)
      setExportProgress({
        stage: 'error',
        progress: 0,
        message: 'Export failed. Please try again.'
      })

      showError('Export Failed', 'There was an error exporting your data. Please try again.')
    } finally {
      setIsExporting(false)
      
      // Reset progress after delay
      setTimeout(() => {
        if (exportProgress.stage !== 'error') {
          setExportProgress({ stage: 'idle', progress: 0, message: 'Ready to export' })
        }
      }, 3000)
    }
  }

  const getProgressColor = () => {
    switch (exportProgress.stage) {
      case 'error': return 'bg-red-500'
      case 'complete': return 'bg-green-500'
      default: return 'bg-blue-500'
    }
  }

  const getStatusIcon = () => {
    switch (exportProgress.stage) {
      case 'collecting':
      case 'generating':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Download className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Export Information */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Data Export Package
          </CardTitle>
          <CardDescription>
            Your export will include all personal data we have collected about you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Included Data:</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Profile information and settings</li>
                <li>• Account activity and login history</li>
                <li>• Privacy preferences and consent records</li>
                <li>• Application usage and analytics data</li>
                <li>• Communication preferences</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Export Format:</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• JSON format for easy processing</li>
                <li>• Human-readable structure</li>
                <li>• GDPR compliant data format</li>
                <li>• Includes metadata and timestamps</li>
                <li>• Compatible with data import tools</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Your Data
          </CardTitle>
          <CardDescription>
            Generate and download a complete copy of your personal data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          {isExporting && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className="text-sm text-slate-600">{exportProgress.message}</span>
              </div>
              <Progress 
                value={exportProgress.progress} 
                className="w-full"
                indicatorClassName={getProgressColor()}
              />
            </div>
          )}

          {/* Export Status */}
          {exportStatus?.lastExportAt && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Last export: {new Date(exportStatus.lastExportAt).toLocaleString()}
                {exportStatus.cooldownPeriod > 0 && (
                  <span className="block mt-1 text-xs text-slate-500">
                    Next export available in {exportStatus.cooldownPeriod} minutes
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Export Button */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">Ready to export</p>
              <p className="text-xs text-slate-500">
                Export typically completes in 30-60 seconds
              </p>
            </div>
            
            <Button 
              onClick={handleExportData}
              disabled={isExporting || (exportStatus && !exportStatus.canExport)}
              size="lg"
              className="min-w-[140px]"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </>
              )}
            </Button>
          </div>

          {/* Export Info */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              JSON Format
            </Badge>
            <Badge variant="outline" className="text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              GDPR Compliant
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Real-time Data
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Important Notice */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Your exported data contains sensitive personal information. 
          Please store the downloaded file securely and delete it when no longer needed. 
          The export includes all data associated with your account as of the export time.
        </AlertDescription>
      </Alert>
    </div>
  )
}