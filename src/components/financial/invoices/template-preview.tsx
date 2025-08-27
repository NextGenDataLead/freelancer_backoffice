'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Eye, Download, RefreshCw, AlertCircle } from 'lucide-react'
import type { InvoiceTemplateConfig } from '@/lib/types/template'

interface TemplatePreviewProps {
  config: InvoiceTemplateConfig | null
  onPreview: () => Promise<void>
  onDownload: () => void
  previewUrl: string | null
  previewContent?: string | null
}

export function TemplatePreview({ config, onPreview, onDownload, previewUrl, previewContent }: TemplatePreviewProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePreview = async () => {
    try {
      setIsGenerating(true)
      setError(null)
      await onPreview()
    } catch (err) {
      console.error('Preview generation failed:', err)
      setError(err instanceof Error ? err.message : 'Voorbeeld genereren mislukt')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!config) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Geen template configuratie beschikbaar</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Preview Thumbnail */}
      <div className="relative">
        {previewUrl ? (
          <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
            <iframe
              src={previewUrl}
              className="w-full h-40 border-0"
              title="Template Preview"
            />
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg h-40 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Eye className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">Klik op "Voorbeeld" om een preview te genereren</p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-red-800">
              <p className="font-medium">Fout bij genereren voorbeeld</p>
              <p>{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <Button
          onClick={handlePreview}
          disabled={isGenerating}
          size="sm"
          className="flex-1"
        >
          {isGenerating ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Eye className="h-4 w-4 mr-2" />
          )}
          {isGenerating ? 'Genereren...' : 'Voorbeeld'}
        </Button>
        
        {previewUrl && (
          <Button
            onClick={onDownload}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        )}
      </div>

      {/* Template Info */}
      <div className="text-xs space-y-1 text-muted-foreground border-t pt-3">
        <div className="flex justify-between">
          <span>Template:</span>
          <span className="font-medium">{config.name}</span>
        </div>
        <div className="flex justify-between">
          <span>Thema:</span>
          <span className="font-medium capitalize">
            {config.layout_settings.color_scheme}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Lettertype:</span>
          <span className="font-medium">{config.brand_settings.font_family}</span>
        </div>
        <div className="flex justify-between">
          <span>Header:</span>
          <span className="font-medium capitalize">
            {config.layout_settings.header_style}
          </span>
        </div>
        <div className="flex justify-between">
          <span>BTW Weergave:</span>
          <span className="font-medium capitalize">
            {config.compliance_settings.vat_display}
          </span>
        </div>
        {config.features.watermark_enabled && (
          <div className="flex justify-between">
            <span>Watermerk:</span>
            <span className="font-medium">{config.features.watermark_text}</span>
          </div>
        )}
      </div>

      {/* Generation Stats */}
      {previewUrl && (
        <div className="text-xs text-center text-muted-foreground">
          Voorbeeld succesvol gegenereerd
        </div>
      )}
    </div>
  )
}