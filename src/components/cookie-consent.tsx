"use client"

import * as React from "react"
// Removed framer-motion to fix JavaScript compilation errors
import { Cookie, Settings, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface CookiePreferences {
  essential: boolean
  analytics: boolean
  marketing: boolean
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = React.useState(false)
  const [showSettings, setShowSettings] = React.useState(false)
  const [preferences, setPreferences] = React.useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
  })

  React.useEffect(() => {
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      // Show banner after 2 seconds to avoid disrupting the landing page experience
      const timer = setTimeout(() => setShowBanner(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  const acceptAll = () => {
    const allPreferences = { essential: true, analytics: true, marketing: true }
    setPreferences(allPreferences)
    localStorage.setItem('cookie-consent', JSON.stringify(allPreferences))
    setShowBanner(false)
    setShowSettings(false)
  }

  const acceptSelected = () => {
    localStorage.setItem('cookie-consent', JSON.stringify(preferences))
    setShowBanner(false)
    setShowSettings(false)
  }

  const rejectAll = () => {
    const minimalPreferences = { essential: true, analytics: false, marketing: false }
    setPreferences(minimalPreferences)
    localStorage.setItem('cookie-consent', JSON.stringify(minimalPreferences))
    setShowBanner(false)
    setShowSettings(false)
  }

  return (
    <>
      <React.Fragment>
        {showBanner && (
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg"
            role="banner"
            aria-label="Cookie consent banner"
          >
            <div className="max-w-7xl mx-auto p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <Cookie className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" aria-hidden="true" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-900">We value your privacy</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. 
                      You can choose to accept all cookies or customize your preferences.
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSettings(true)}
                    className="w-full sm:w-auto"
                    aria-label="Customize cookie preferences"
                  >
                    <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
                    Customize
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={rejectAll}
                    className="w-full sm:w-auto"
                    aria-label="Reject all non-essential cookies"
                  >
                    Reject All
                  </Button>
                  <Button
                    size="sm"
                    onClick={acceptAll}
                    className="w-full sm:w-auto"
                    aria-label="Accept all cookies"
                  >
                    Accept All
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </React.Fragment>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-labelledby="cookie-settings-title">
          <DialogHeader>
            <DialogTitle id="cookie-settings-title">Cookie Preferences</DialogTitle>
            <DialogDescription>
              Manage your cookie preferences. Essential cookies are required for the website to function properly and cannot be disabled.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-start justify-between p-4 border rounded-lg bg-slate-50">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-slate-900">Essential Cookies</h4>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Required</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    These cookies are necessary for the website to function and cannot be switched off. They are usually only set in response to actions made by you.
                  </p>
                </div>
                <div className="ml-4">
                  <div className="w-12 h-6 bg-green-500 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                  </div>
                </div>
              </div>

              <div className="flex items-start justify-between p-4 border rounded-lg">
                <div className="space-y-2 flex-1">
                  <h4 className="font-medium text-slate-900">Analytics Cookies</h4>
                  <p className="text-sm text-slate-600">
                    These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site.
                  </p>
                </div>
                <div className="ml-4">
                  <button
                    onClick={() => setPreferences(prev => ({ ...prev, analytics: !prev.analytics }))}
                    className={`w-12 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      preferences.analytics ? 'bg-blue-500' : 'bg-slate-300'
                    }`}
                    aria-label={`${preferences.analytics ? 'Disable' : 'Enable'} analytics cookies`}
                    aria-pressed={preferences.analytics}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${
                      preferences.analytics ? 'translate-x-6' : 'translate-x-0.5'
                    }`}></div>
                  </button>
                </div>
              </div>

              <div className="flex items-start justify-between p-4 border rounded-lg">
                <div className="space-y-2 flex-1">
                  <h4 className="font-medium text-slate-900">Marketing Cookies</h4>
                  <p className="text-sm text-slate-600">
                    These cookies are used to deliver advertising that is more relevant to you and your interests. They may be used to build a profile of your interests.
                  </p>
                </div>
                <div className="ml-4">
                  <button
                    onClick={() => setPreferences(prev => ({ ...prev, marketing: !prev.marketing }))}
                    className={`w-12 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      preferences.marketing ? 'bg-blue-500' : 'bg-slate-300'
                    }`}
                    aria-label={`${preferences.marketing ? 'Disable' : 'Enable'} marketing cookies`}
                    aria-pressed={preferences.marketing}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${
                      preferences.marketing ? 'translate-x-6' : 'translate-x-0.5'
                    }`}></div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={rejectAll} aria-label="Reject all non-essential cookies">
              Reject All
            </Button>
            <Button onClick={acceptSelected} aria-label="Save selected cookie preferences">
              Save Preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}