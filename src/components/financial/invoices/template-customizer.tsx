'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Palette, Layout, Globe, Zap } from 'lucide-react'
import type { InvoiceTemplateConfig } from '@/lib/types/template'

interface TemplateCustomizerProps {
  config: InvoiceTemplateConfig
  onUpdate: (updates: Partial<InvoiceTemplateConfig>) => Promise<void>
  isSaving: boolean
}

export function TemplateCustomizer({ config, onUpdate, isSaving }: TemplateCustomizerProps) {
  const [localConfig, setLocalConfig] = useState(config)

  const handleBrandUpdate = async (field: string, value: any) => {
    const updates = {
      brand_settings: {
        ...localConfig.brand_settings,
        [field]: value
      }
    }
    setLocalConfig({ ...localConfig, ...updates })
    await onUpdate(updates)
  }

  const handleLayoutUpdate = async (field: string, value: any) => {
    const updates = {
      layout_settings: {
        ...localConfig.layout_settings,
        [field]: value
      }
    }
    setLocalConfig({ ...localConfig, ...updates })
    await onUpdate(updates)
  }

  const handleComplianceUpdate = async (field: string, value: any) => {
    const updates = {
      compliance_settings: {
        ...localConfig.compliance_settings,
        [field]: value
      }
    }
    setLocalConfig({ ...localConfig, ...updates })
    await onUpdate(updates)
  }

  const handleFeaturesUpdate = async (field: string, value: any) => {
    const updates = {
      features: {
        ...localConfig.features,
        [field]: value
      }
    }
    setLocalConfig({ ...localConfig, ...updates })
    await onUpdate(updates)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Template Aanpassingen
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="brand" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="brand" className="flex items-center gap-1 text-xs">
              <Palette className="h-3 w-3" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="layout" className="flex items-center gap-1 text-xs">
              <Layout className="h-3 w-3" />
              Layout
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex items-center gap-1 text-xs">
              <Globe className="h-3 w-3" />
              Compliance
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-1 text-xs">
              <Zap className="h-3 w-3" />
              Features
            </TabsTrigger>
          </TabsList>

          {/* Brand Settings */}
          <TabsContent value="brand" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary-color">Primaire Kleur</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="primary-color"
                    type="color"
                    value={localConfig.brand_settings.primary_color}
                    onChange={(e) => handleBrandUpdate('primary_color', e.target.value)}
                    className="w-16 h-10 p-1 border rounded"
                    disabled={isSaving}
                  />
                  <Input
                    type="text"
                    value={localConfig.brand_settings.primary_color}
                    onChange={(e) => handleBrandUpdate('primary_color', e.target.value)}
                    placeholder="#2563eb"
                    className="flex-1"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary-color">Secundaire Kleur</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="secondary-color"
                    type="color"
                    value={localConfig.brand_settings.secondary_color}
                    onChange={(e) => handleBrandUpdate('secondary_color', e.target.value)}
                    className="w-16 h-10 p-1 border rounded"
                    disabled={isSaving}
                  />
                  <Input
                    type="text"
                    value={localConfig.brand_settings.secondary_color}
                    onChange={(e) => handleBrandUpdate('secondary_color', e.target.value)}
                    placeholder="#64748b"
                    className="flex-1"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="font-family">Lettertype</Label>
                <Select
                  value={localConfig.brand_settings.font_family}
                  onValueChange={(value) => handleBrandUpdate('font_family', value)}
                  disabled={isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kies lettertype" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter">Inter (Modern)</SelectItem>
                    <SelectItem value="Roboto">Roboto (Clean)</SelectItem>
                    <SelectItem value="Open Sans">Open Sans (Friendly)</SelectItem>
                    <SelectItem value="Times New Roman">Times New Roman (Classic)</SelectItem>
                    <SelectItem value="Arial">Arial (System)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo-url">Logo URL</Label>
                <Input
                  id="logo-url"
                  type="url"
                  value={localConfig.brand_settings.logo_url || ''}
                  onChange={(e) => handleBrandUpdate('logo_url', e.target.value)}
                  placeholder="https://example.com/logo.png"
                  disabled={isSaving}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="show-logo"
                  checked={localConfig.brand_settings.show_logo}
                  onCheckedChange={(checked) => handleBrandUpdate('show_logo', checked)}
                  disabled={isSaving}
                />
                <Label htmlFor="show-logo">Logo Tonen</Label>
              </div>
            </div>
          </TabsContent>

          {/* Layout Settings */}
          <TabsContent value="layout" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="header-style">Header Stijl</Label>
                <Select
                  value={localConfig.layout_settings.header_style}
                  onValueChange={(value) => handleLayoutUpdate('header_style', value)}
                  disabled={isSaving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="classic">Klassiek</SelectItem>
                    <SelectItem value="minimal">Minimaal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="footer-style">Footer Stijl</Label>
                <Select
                  value={localConfig.layout_settings.footer_style}
                  onValueChange={(value) => handleLayoutUpdate('footer_style', value)}
                  disabled={isSaving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Eenvoudig</SelectItem>
                    <SelectItem value="detailed">Gedetailleerd</SelectItem>
                    <SelectItem value="minimal">Minimaal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="spacing">Ruimte</Label>
                <Select
                  value={localConfig.layout_settings.spacing}
                  onValueChange={(value) => handleLayoutUpdate('spacing', value)}
                  disabled={isSaving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="comfortable">Comfortabel</SelectItem>
                    <SelectItem value="spacious">Ruim</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="border-style">Rand Stijl</Label>
                <Select
                  value={localConfig.layout_settings.border_style}
                  onValueChange={(value) => handleLayoutUpdate('border_style', value)}
                  disabled={isSaving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geen Randen</SelectItem>
                    <SelectItem value="subtle">Subtiele Randen</SelectItem>
                    <SelectItem value="bold">Dikke Randen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Compliance Settings */}
          <TabsContent value="compliance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="language">Taal</Label>
                <Select
                  value={localConfig.compliance_settings.language}
                  onValueChange={(value) => handleComplianceUpdate('language', value)}
                  disabled={isSaving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nl">Nederlands</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vat-display">BTW Weergave</Label>
                <Select
                  value={localConfig.compliance_settings.vat_display}
                  onValueChange={(value) => handleComplianceUpdate('vat_display', value)}
                  disabled={isSaving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="detailed">Gedetailleerd</SelectItem>
                    <SelectItem value="summary">Samenvatting</SelectItem>
                    <SelectItem value="minimal">Minimaal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="include-kvk"
                  checked={localConfig.compliance_settings.include_kvk}
                  onCheckedChange={(checked) => handleComplianceUpdate('include_kvk', checked)}
                  disabled={isSaving}
                />
                <Label htmlFor="include-kvk">KvK Nummer Tonen</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="include-btw"
                  checked={localConfig.compliance_settings.include_btw}
                  onCheckedChange={(checked) => handleComplianceUpdate('include_btw', checked)}
                  disabled={isSaving}
                />
                <Label htmlFor="include-btw">BTW Nummer Tonen</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="show-payment-terms"
                  checked={localConfig.compliance_settings.show_payment_terms}
                  onCheckedChange={(checked) => handleComplianceUpdate('show_payment_terms', checked)}
                  disabled={isSaving}
                />
                <Label htmlFor="show-payment-terms">Betalingsvoorwaarden</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="payment-qr-code"
                  checked={localConfig.compliance_settings.payment_qr_code}
                  onCheckedChange={(checked) => handleComplianceUpdate('payment_qr_code', checked)}
                  disabled={isSaving}
                />
                <Label htmlFor="payment-qr-code">QR Code Betaling</Label>
              </div>
            </div>
          </TabsContent>

          {/* Feature Settings */}
          <TabsContent value="features" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="watermark-enabled"
                  checked={localConfig.features.watermark_enabled}
                  onCheckedChange={(checked) => handleFeaturesUpdate('watermark_enabled', checked)}
                  disabled={isSaving}
                />
                <Label htmlFor="watermark-enabled">Watermerk Inschakelen</Label>
              </div>

              {localConfig.features.watermark_enabled && (
                <div className="space-y-2">
                  <Label htmlFor="watermark-text">Watermerk Tekst</Label>
                  <Input
                    id="watermark-text"
                    value={localConfig.features.watermark_text}
                    onChange={(e) => handleFeaturesUpdate('watermark_text', e.target.value)}
                    placeholder="CONCEPT"
                    disabled={isSaving}
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="show-page-numbers"
                  checked={localConfig.features.show_page_numbers}
                  onCheckedChange={(checked) => handleFeaturesUpdate('show_page_numbers', checked)}
                  disabled={isSaving}
                />
                <Label htmlFor="show-page-numbers">Paginanummers</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-template">Email Template</Label>
                <Select
                  value={localConfig.features.email_template}
                  onValueChange={(value) => handleFeaturesUpdate('email_template', value)}
                  disabled={isSaving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professioneel</SelectItem>
                    <SelectItem value="friendly">Vriendelijk</SelectItem>
                    <SelectItem value="formal">Formeel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-footer-text">Custom Footer Tekst</Label>
                <Input
                  id="custom-footer-text"
                  value={localConfig.features.custom_footer_text || ''}
                  onChange={(e) => handleFeaturesUpdate('custom_footer_text', e.target.value)}
                  placeholder="Optionele footer tekst"
                  disabled={isSaving}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {isSaving && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-800 text-sm">Instellingen worden opgeslagen...</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}