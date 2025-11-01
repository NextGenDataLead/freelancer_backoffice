'use client'

import { useState } from 'react'
import { Trash2, CheckCircle, X, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface BulkActionBarProps {
  selectedCount: number
  onClearSelection: () => void
  onBulkDelete: () => Promise<void>
  onBulkApprove?: () => Promise<void>
  onBulkExport?: () => void
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkDelete,
  onBulkApprove,
  onBulkExport,
}: BulkActionBarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isApproving, setIsApproving] = useState(false)

  if (selectedCount === 0) return null

  const handleBulkDelete = async () => {
    setIsDeleting(true)
    try {
      await onBulkDelete()
      toast.success(`${selectedCount} expense${selectedCount > 1 ? 's' : ''} deleted successfully`)
      setShowDeleteConfirm(false)
    } catch (error) {
      toast.error('Failed to delete expenses')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkApprove = async () => {
    if (!onBulkApprove) return
    setIsApproving(true)
    try {
      await onBulkApprove()
      toast.success(`${selectedCount} expense${selectedCount > 1 ? 's' : ''} approved successfully`)
    } catch (error) {
      toast.error('Failed to approve expenses')
    } finally {
      setIsApproving(false)
    }
  }

  return (
    <>
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-card shadow-2xl"
        style={{
          padding: '1rem 1.5rem',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          minWidth: '400px',
        }}
      >
        <div className="flex items-center justify-between gap-4">
          {/* Selection info */}
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center"
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              <CheckCircle className="h-5 w-5" style={{ color: 'rgba(59, 130, 246, 0.9)' }} />
            </div>
            <div>
              <p className="font-medium text-slate-100">
                {selectedCount} {selectedCount === 1 ? 'expense' : 'expenses'} selected
              </p>
              <button
                onClick={onClearSelection}
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Clear selection
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onBulkExport && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBulkExport}
                className="text-slate-300 hover:text-slate-100 hover:bg-slate-700/50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}

            {onBulkApprove && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkApprove}
                disabled={isApproving}
                className="bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </>
                )}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent
          className="bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95 border border-white/10 backdrop-blur-2xl text-slate-100"
        >
          <DialogHeader>
            <DialogTitle>Delete {selectedCount} expenses?</DialogTitle>
            <DialogDescription className="text-slate-400">
              This action cannot be undone. This will permanently delete the selected expenses from the database.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
