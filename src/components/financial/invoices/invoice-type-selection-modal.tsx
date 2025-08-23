'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Edit, FileText, Users, Timer, Euro } from 'lucide-react'

interface InvoiceTypeSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectTimeBasedInvoice: () => void
  onSelectManualInvoice: () => void
}

export function InvoiceTypeSelectionModal({
  isOpen,
  onClose,
  onSelectTimeBasedInvoice,
  onSelectManualInvoice
}: InvoiceTypeSelectionModalProps) {
  
  const handleTimeBasedClick = () => {
    onSelectTimeBasedInvoice()
    onClose()
  }

  const handleManualClick = () => {
    onSelectManualInvoice()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Nieuwe Factuur Maken
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <p className="text-muted-foreground mb-4">
            Kies het type factuur dat je wilt maken:
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Time-based Invoice Option */}
            <Card 
              className="border-2 border-blue-200 hover:border-blue-400 transition-colors cursor-pointer group"
              onClick={handleTimeBasedClick}
            >
              <CardHeader className="text-center pb-3">
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-blue-200 transition-colors">
                  <Timer className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg text-blue-900">
                  Tijd-gebaseerde Factuur
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center pt-0">
                <CardDescription className="text-sm mb-4">
                  Maak een factuur gebaseerd op geregistreerde tijdsinvoer van klanten
                </CardDescription>
                
                <div className="space-y-2 text-sm text-left">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Users className="h-4 w-4" />
                    <span>Selecteer klant met onfactureert tijd</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700">
                    <Clock className="h-4 w-4" />
                    <span>Kies tijd registraties</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700">
                    <Euro className="h-4 w-4" />
                    <span>Automatische berekening</span>
                  </div>
                </div>

                <Button 
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleTimeBasedClick()
                  }}
                >
                  Tijd-gebaseerde Factuur
                </Button>
              </CardContent>
            </Card>

            {/* Manual Invoice Option */}
            <Card 
              className="border-2 border-gray-200 hover:border-gray-400 transition-colors cursor-pointer group"
              onClick={handleManualClick}
            >
              <CardHeader className="text-center pb-3">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-gray-200 transition-colors">
                  <Edit className="h-6 w-6 text-gray-600" />
                </div>
                <CardTitle className="text-lg text-gray-900">
                  Handmatige Factuur
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center pt-0">
                <CardDescription className="text-sm mb-4">
                  Maak een factuur handmatig met eigen regels en prijzen
                </CardDescription>
                
                <div className="space-y-2 text-sm text-left">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Users className="h-4 w-4" />
                    <span>Kies elke klant</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Edit className="h-4 w-4" />
                    <span>Voer regels handmatig in</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Euro className="h-4 w-4" />
                    <span>Volledige controle over prijzen</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full mt-4 border-gray-300 hover:bg-gray-50"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleManualClick()
                  }}
                >
                  Handmatige Factuur
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Voor de meeste freelancers en ZZP'ers is een tijd-gebaseerde factuur 
              de snelste en meest accurate manier om te factureren.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}