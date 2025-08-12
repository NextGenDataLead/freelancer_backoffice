/**
 * Account Deletion Component
 * GDPR Article 17 compliant account deletion with grace period
 */

'use client'

import { useState, useEffect } from 'react'
import { Trash2, AlertTriangle, Calendar, Clock, Shield, X, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useNotificationActions } from '@/store/notifications-store'

interface DeletionStatus {
  hasPendingDeletion: boolean
  scheduledDeletionAt?: string
  daysRemaining?: number
  canCancel?: boolean
}

export function AccountDeletion() {
  const [deletionStatus, setDeletionStatus] = useState<DeletionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmationText, setConfirmationText] = useState('')
  const [deletionReason, setDeletionReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const { showSuccess, showError } = useNotificationActions()

  // Load deletion status
  useEffect(() => {
    const loadDeletionStatus = async () => {
      try {
        const response = await fetch('/api/user/delete-account', {
          method: 'GET'
        })
        if (response.ok) {
          const status = await response.json()
          setDeletionStatus(status)
        }
      } catch (error) {
        console.error('Failed to load deletion status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDeletionStatus()
  }, [])

  const handleDeleteAccount = async () => {
    if (confirmationText !== 'DELETE MY ACCOUNT') {
      showError('Confirmation Required', 'Please type "DELETE MY ACCOUNT" exactly to confirm.')
      return
    }

    setIsDeleting(true)
    
    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmationText,
          reason: deletionReason,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setDeletionStatus({
          hasPendingDeletion: true,
          scheduledDeletionAt: result.scheduledDeletionAt,
          daysRemaining: result.gracePeriodDays,
          canCancel: true,
        })

        showSuccess('Account Deletion Scheduled', `Your account will be deleted in ${result.gracePeriodDays} days. You can cancel this request anytime during the grace period.`)

        setShowConfirmDialog(false)
        setConfirmationText('')
        setDeletionReason('')
      } else {
        throw new Error(result.error || 'Failed to schedule deletion')
      }
    } catch (error) {
      console.error('Deletion error:', error)
      showError('Deletion Failed', error instanceof Error ? error.message : 'Failed to schedule account deletion')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancelDeletion = async () => {
    setIsCancelling(true)

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
      })

      const result = await response.json()

      if (response.ok) {
        console.log('DEBUG: Deletion cancelled successfully, updating local state')
        setDeletionStatus({
          hasPendingDeletion: false,
        })

        showSuccess('Deletion Cancelled', 'Your account deletion has been successfully cancelled.')
        
        // Trigger a custom event to notify other components to refresh their grace period state
        window.dispatchEvent(new CustomEvent('gracePeriodStatusChanged', { 
          detail: { hasPendingDeletion: false } 
        }))
      } else {
        throw new Error(result.error || 'Failed to cancel deletion')
      }
    } catch (error) {
      console.error('Cancellation error:', error)
      showError('Cancellation Failed', error instanceof Error ? error.message : 'Failed to cancel deletion')
    } finally {
      setIsCancelling(false)
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-48 bg-slate-100 rounded-lg"></div>
      </div>
    )
  }

  // Show pending deletion status
  if (deletionStatus?.hasPendingDeletion) {
    return (
      <div className="space-y-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Account Deletion Scheduled</strong>
            <br />
            Your account is scheduled for permanent deletion. You have {deletionStatus.daysRemaining} days remaining to cancel this request.
          </AlertDescription>
        </Alert>

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <Calendar className="h-5 w-5" />
              Deletion Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700">Scheduled Deletion</Label>
                <p className="text-lg font-semibold text-red-900">
                  {deletionStatus.scheduledDeletionAt && 
                    new Date(deletionStatus.scheduledDeletionAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  }
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Days Remaining</Label>
                <p className="text-lg font-semibold text-red-900">
                  {deletionStatus.daysRemaining} days
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium text-slate-900 mb-2">What happens next:</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Your account will remain accessible during the grace period</li>
                <li>• All data will be permanently deleted on the scheduled date</li>
                <li>• You can cancel this request at any time before deletion</li>
                <li>• After deletion, data recovery will not be possible</li>
              </ul>
            </div>

            {deletionStatus.canCancel && (
              <div className="pt-4 border-t">
                <Button
                  onClick={handleCancelDeletion}
                  disabled={isCancelling}
                  variant="outline"
                  size="lg"
                  className="w-full border-green-200 text-green-700 hover:bg-green-50"
                >
                  {isCancelling ? (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Cancel Account Deletion
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show deletion form
  return (
    <div className="space-y-6">
      {/* Warning Alert */}
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>Permanent Action:</strong> Account deletion cannot be undone after the 30-day grace period. 
          All your data, files, and settings will be permanently removed.
        </AlertDescription>
      </Alert>

      {/* Deletion Process Card */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900">
            <Trash2 className="h-5 w-5" />
            Delete Account
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Deletion Process:</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>1. Request deletion with confirmation</li>
                <li>2. 30-day grace period begins</li>
                <li>3. Email confirmation and reminders sent</li>
                <li>4. Data permanently deleted after grace period</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">What gets deleted:</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Profile and account information</li>
                <li>• All uploaded files and content</li>
                <li>• Settings and preferences</li>
                <li>• Activity history and analytics data</li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-slate-900">Grace Period Protection</span>
            </div>
            <p className="text-sm text-slate-600">
              We provide a 30-day grace period to protect against accidental deletions. During this time, 
              you can cancel the deletion request and restore full access to your account.
            </p>
          </div>

          <div className="pt-4 border-t">
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="lg" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete My Account
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-900">
                    <AlertTriangle className="h-5 w-5" />
                    Confirm Account Deletion
                  </DialogTitle>
                  <DialogDescription>
                    This action will schedule your account for permanent deletion in 30 days.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="reason">Reason for leaving (optional)</Label>
                    <Textarea
                      id="reason"
                      placeholder="Help us improve by sharing why you're leaving..."
                      value={deletionReason}
                      onChange={(e) => setDeletionReason(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirmation">
                      Type <strong>DELETE MY ACCOUNT</strong> to confirm:
                    </Label>
                    <Input
                      id="confirmation"
                      placeholder="DELETE MY ACCOUNT"
                      value={confirmationText}
                      onChange={(e) => setConfirmationText(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      You will have 30 days to cancel this request. After that, 
                      your account and all data will be permanently deleted.
                    </AlertDescription>
                  </Alert>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirmDialog(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || confirmationText !== 'DELETE MY ACCOUNT'}
                  >
                    {isDeleting ? (
                      <>
                        <Clock className="h-4 w-4 mr-2" />
                        Scheduling...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Schedule Deletion
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Additional Info */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline" className="text-xs border-red-200 text-red-700">
              <Calendar className="h-3 w-3 mr-1" />
              30-Day Grace Period
            </Badge>
            <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">
              <Shield className="h-3 w-3 mr-1" />
              GDPR Article 17 Compliant
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}