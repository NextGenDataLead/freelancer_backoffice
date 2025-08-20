import { Suspense } from 'react'
import Link from 'next/link'
import { DashboardStats } from '@/components/financial/dashboard-stats'
import { ClientList } from '@/components/financial/clients/client-list'
import { InvoiceList } from '@/components/financial/invoices/invoice-list'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, FileText, Users, Calculator, Euro, Clock } from 'lucide-react'

export default function FinancialDashboardPage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financieel Overzicht</h1>
          <p className="text-muted-foreground mt-2">
            Beheer je ZZP financiën, facturen en klanten vanuit één dashboard
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Calculator className="h-4 w-4 mr-2" />
            BTW Aangifte
          </Button>
          <Button variant="outline" size="sm">
            <TrendingUp className="h-4 w-4 mr-2" />
            Rapporten
          </Button>
        </div>
      </div>

      {/* Dashboard Statistics */}
      <Suspense fallback={
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded w-20 mb-1"></div>
                <div className="h-3 bg-muted animate-pulse rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      }>
        <DashboardStats />
      </Suspense>

      {/* Quick Actions Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/financieel/facturen" className="block">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center p-6">
              <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-4" />
              <div>
                <h3 className="font-semibold">Nieuwe Factuur</h3>
                <p className="text-sm text-muted-foreground">Maak een factuur</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/dashboard/financieel/klanten" className="block">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center p-6">
              <Users className="h-8 w-8 text-green-600 dark:text-green-400 mr-4" />
              <div>
                <h3 className="font-semibold">Nieuwe Klant</h3>
                <p className="text-sm text-muted-foreground">Voeg klant toe</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/dashboard/financieel/uitgaven" className="block">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center p-6">
              <Euro className="h-8 w-8 text-purple-600 dark:text-purple-400 mr-4" />
              <div>
                <h3 className="font-semibold">Uitgave Toevoegen</h3>
                <p className="text-sm text-muted-foreground">Registreer uitgave</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/dashboard/financieel/tijd" className="block">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center p-6">
              <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400 mr-4" />
              <div>
                <h3 className="font-semibold">Uren Registreren</h3>
                <p className="text-sm text-muted-foreground">Log gewerkte tijd</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent Invoices */}
        <div>
          <Suspense fallback={
            <Card>
              <CardHeader>
                <CardTitle>Facturen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                      <div className="h-4 bg-muted animate-pulse rounded flex-1"></div>
                      <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          }>
            <InvoiceList />
          </Suspense>
        </div>

        {/* Recent Clients */}
        <div>
          <Suspense fallback={
            <Card>
              <CardHeader>
                <CardTitle>Klanten</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-4 bg-muted animate-pulse rounded w-8"></div>
                      <div className="h-4 bg-muted animate-pulse rounded flex-1"></div>
                      <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          }>
            <ClientList />
          </Suspense>
        </div>
      </div>

      {/* Recent Activity and Notifications */}
      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recente Activiteit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Factuur #2024-001 betaald</p>
                  <p className="text-xs text-muted-foreground">Klant: Acme BV - €1,210.00 - 2 uur geleden</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Nieuwe klant toegevoegd</p>
                  <p className="text-xs text-muted-foreground">TechStart BV - 5 uur geleden</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Uitgave geregistreerd</p>
                  <p className="text-xs text-muted-foreground">Kantoorbenodigdheden - €45.50 - 1 dag geleden</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">8 uren geregistreerd</p>
                  <p className="text-xs text-muted-foreground">Project: Website ontwikkeling - 2 dagen geleden</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Belangrijke Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-red-900 dark:text-red-300">
                    BTW Aangifte Q4 2024
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400">
                    Deadline: 31 januari 2025
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-300">
                    Factuur vervalt binnenkort
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">
                    #2024-015 - Acme BV - 3 dagen
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                    Backup maken
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    Wekelijkse backup - 2 dagen
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}