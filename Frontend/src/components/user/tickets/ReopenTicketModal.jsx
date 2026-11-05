import { AlertCircle, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'

export default function ReopenTicketModal({ open, loading, error, onClose, onSubmit }) {
  const [reason, setReason] = useState('')
  const [localError, setLocalError] = useState('')

  if (!open) return null

  function submit(event) {
    event.preventDefault()
    if (reason.trim().length < 10) {
      setLocalError('Describe the remaining problem using at least 10 characters.')
      return
    }
    setLocalError('')
    onSubmit(reason.trim())
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4" role="presentation">
      <section className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="reopen-ticket-title">
        <div className="flex items-start justify-between gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-700"><RotateCcw size={19} /></span>
          <button type="button" onClick={onClose} disabled={loading} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close reopening dialog"><X size={18} /></button>
        </div>
        <h2 id="reopen-ticket-title" className="mt-4 text-lg font-bold text-slate-900">Issue still exists</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Explain what remains unresolved. The ticket will return to the active support queue and retain its previous resolution history.</p>
        <form onSubmit={submit} className="mt-5">
          <label htmlFor="reopen-reason" className="text-xs font-semibold text-slate-700">Remaining problem <span className="text-red-600">*</span></label>
          <textarea id="reopen-reason" value={reason} onChange={(event) => { setReason(event.target.value); setLocalError('') }} maxLength={1000} rows={5} placeholder="Describe what happened after trying the provided resolution." className="mt-2 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10" />
          {(localError || error) && <p className="mt-2 flex items-start gap-2 text-xs font-medium text-red-600"><AlertCircle size={14} className="shrink-0" /> {localError || error}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={loading} className="rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="rounded-md bg-[#075b35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#06492c] disabled:opacity-60">{loading ? 'Reopening ticket...' : 'Submit Reopening Request'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
