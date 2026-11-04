import { AlertTriangle, LoaderCircle, Power, PowerOff, X } from 'lucide-react'
import { useState } from 'react'
import { getApiError } from '../../../services/api'
import { userManagementService } from '../../../services/userManagementService'

export default function UserStatusDialog({ user, onClose, onChanged }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!user) return null
  const willDeactivate = user.is_active

  async function confirm() {
    setIsSubmitting(true)
    setError('')
    try {
      const result = willDeactivate
        ? await userManagementService.deactivate(user.id)
        : await userManagementService.activate(user.id)
      onChanged(result.user, willDeactivate ? 'deactivated' : 'activated')
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to update this account.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/45 p-4" role="alertdialog" aria-modal="true" aria-labelledby="status-dialog-title">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <span className={`grid h-11 w-11 place-items-center rounded-full ${willDeactivate ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
            {willDeactivate ? <PowerOff size={21} /> : <Power size={21} />}
          </span>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close dialog"><X size={18} /></button>
        </div>
        <h2 id="status-dialog-title" className="mt-4 text-lg font-semibold text-slate-900">{willDeactivate ? 'Deactivate account?' : 'Activate account?'}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {willDeactivate ? 'This will prevent the user from signing in while preserving all historical tickets.' : 'This will restore account access if secure password setup is complete.'}
        </p>
        <div className="mt-4 rounded-md bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">{user.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">{user.email}</p>
        </div>
        {error && (
          <div className="mt-4 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertTriangle size={16} className="shrink-0" /> {error}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={confirm} disabled={isSubmitting} className={`inline-flex h-9 items-center gap-2 rounded-md px-4 text-xs font-semibold text-white disabled:opacity-60 ${willDeactivate ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-700 hover:bg-emerald-800'}`}>
            {isSubmitting && <LoaderCircle size={14} className="animate-spin" />}
            {willDeactivate ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  )
}
