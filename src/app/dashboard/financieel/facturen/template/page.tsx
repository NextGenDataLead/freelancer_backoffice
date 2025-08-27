'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, FileText, Palette, Settings, Eye, Download, Building } from 'lucide-react'
import Link from 'next/link'
import { templateService } from '@/lib/services/template-service'
import type { InvoiceTemplateConfig, TemplateThemeConfig } from '@/lib/types/template'
import { TemplateCustomizer } from '@/components/financial/invoices/template-customizer'
import { TemplatePreview } from '@/components/financial/invoices/template-preview'

export default function TemplateSettingsPage() {
  // State management
  const [templateConfig, setTemplateConfig] = useState<InvoiceTemplateConfig | null>(null)
  const [themes, setThemes] = useState<TemplateThemeConfig[]>([])
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setSaving] = useState(false)

  // Preview state
  const [showPreview, setShowPreview] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const previewUrlRef = useRef<string | null>(null)

  // Load template configuration and themes
  useEffect(() => {
    loadTemplateData()
  }, [])

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  const loadTemplateData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Load current template config and available themes
      const [config, themesData] = await Promise.all([
        templateService.getTemplateConfig().catch(() => null),
        templateService.getThemes()
      ])

      if (config) {
        setTemplateConfig(config)
        // Determine current theme based on color scheme
        const currentTheme = themesData.themes.find(t => 
          t.layout_settings.color_scheme === config.layout_settings.color_scheme
        )
        setSelectedTheme(currentTheme?.id || 'modern_blue')
      } else {
        // Use default theme if no config exists
        setSelectedTheme('modern_blue')
      }
      
      setThemes(themesData.themes)
    } catch (err) {
      console.error('Error loading template data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load template settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleThemeChange = async (themeId: string) => {
    try {
      setSaving(true)
      setSelectedTheme(themeId)
      
      // Apply theme to configuration
      const updatedConfig = await templateService.applyTheme(themeId)
      setTemplateConfig(updatedConfig)
    } catch (err) {
      console.error('Error applying theme:', err)
      setError(err instanceof Error ? err.message : 'Failed to apply theme')
    } finally {
      setSaving(false)
    }
  }

  const handleConfigUpdate = async (updates: Partial<InvoiceTemplateConfig>) => {
    try {
      setSaving(true)
      const updatedConfig = await templateService.updateTemplateConfig(updates)
      setTemplateConfig(updatedConfig)
    } catch (err) {
      console.error('Error updating configuration:', err)
      setError(err instanceof Error ? err.message : 'Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const handlePreviewGenerate = async () => {
    try {
      // Clean up previous blob URL
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
      
      const htmlContent = await templateService.generateHTMLPreview(templateConfig || undefined)
      setPreviewContent(htmlContent)
      
      // Create a blob URL for the iframe
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      previewUrlRef.current = url
      setPreviewUrl(url)
      setShowPreview(true)
    } catch (err) {
      console.error('Error generating preview:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate preview')
    }
  }

  const handleDownloadPreview = async () => {
    if (previewContent) {
      // Download HTML version
      const blob = new Blob([previewContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'invoice-template-preview.html'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } else if (templateConfig) {
      // Fall back to PDF download
      try {
        const pdfUrl = await templateService.generatePDFPreview(templateConfig)
        const link = document.createElement('a')
        link.href = pdfUrl
        link.download = 'invoice-template-preview.pdf'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (err) {
        console.error('Error generating PDF for download:', err)
        setError(err instanceof Error ? err.message : 'Failed to download preview')
      }
    }
  }

  const resetToDefault = async () => {
    try {
      setSaving(true)
      const defaultConfig = await templateService.resetToDefault()
      setTemplateConfig(defaultConfig)
      setSelectedTheme('modern_blue')
    } catch (err) {
      console.error('Error resetting to default:', err)
      setError(err instanceof Error ? err.message : 'Failed to reset to default')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/financieel/facturen">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Terug naar Facturen
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Template Instellingen</h1>
            <p className="text-muted-foreground mt-1">Laden...</p>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/financieel/facturen">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Terug naar Facturen
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Factuur Templates</h1>
            <p className="text-muted-foreground mt-1">
              Pas de vormgeving en instellingen van je facturen aan
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/dashboard/settings/business">
            <Button variant="outline" size="sm">
              <Building className="h-4 w-4 mr-2" />
              Bedrijfsinstellingen
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={handlePreviewGenerate}
            disabled={!templateConfig}
          >
            <Eye className="h-4 w-4 mr-2" />
            Voorbeeld
          </Button>
          <Button
            variant="outline"
            onClick={resetToDefault}
            disabled={isSaving}
          >
            <Settings className="h-4 w-4 mr-2" />
            Standaard
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-800 text-sm">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => setError(null)}
            >
              Sluiten
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Theme Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Template Thema's
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {themes.map((theme) => (
                  <div
                    key={theme.id}
                    className={`
                      relative cursor-pointer rounded-lg border p-4 transition-all
                      ${selectedTheme === theme.id 
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                        : 'border-gray-200 hover:border-gray-300'}
                    `}
                    onClick={() => handleThemeChange(theme.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-6 h-6 rounded-full border border-gray-300"
                        style={{ 
                          backgroundColor: theme.brand_settings.primary_color 
                        }}
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{theme.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {theme.description}
                        </p>
                      </div>
                    </div>
                    {selectedTheme === theme.id && (
                      <div className="absolute top-2 right-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {isSaving && (
                <p className="text-sm text-blue-600 mt-2">Thema wordt toegepast...</p>
              )}
            </CardContent>
          </Card>

          {/* Customization Options */}
          {templateConfig && (
            <TemplateCustomizer
              config={templateConfig}
              onUpdate={handleConfigUpdate}
              isSaving={isSaving}
            />
          )}
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Voorbeeld
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TemplatePreview
                config={templateConfig}
                onPreview={handlePreviewGenerate}
                onDownload={handleDownloadPreview}
                previewUrl={previewUrl}
                previewContent={previewContent}
              />
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Template Status</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actieve Template:</span>
                <span className="font-medium">
                  {themes.find(t => t.id === selectedTheme)?.name || 'Modern Blue'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taal:</span>
                <span className="font-medium">
                  {templateConfig?.compliance_settings?.language === 'nl' ? 'Nederlands' : 'Engels'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">BTW Type:</span>
                <span className="font-medium">
                  {templateConfig?.compliance_settings?.vat_display || 'Gedetailleerd'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Template Voorbeeld</h3>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPreview}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(false)}
                >
                  Sluiten
                </Button>
              </div>
            </div>
            <div className="p-4 bg-gray-50 h-[calc(90vh-80px)] overflow-auto">
              <iframe
                src={previewUrl}
                className="w-full h-full border rounded"
                title="Template Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}