import { AlertCircle, CheckCircle2, X } from 'lucide-react'

export default function ConfirmResolutionDialog({ open, loading, error, onClose, onConfirm }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4" role="presentation">
      <section className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="confirm-resolution-title">
        <div className="flex items-start justify-between gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 size={20} /></span>
          <button type="button" onClick={onClose} disabled={loading} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close confirmation dialog"><X size={18} /></button>
        </div>
        <h2 id="confirm-resolution-title" className="mt-4 text-lg font-bold text-slate-900">Confirm resolution</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Are you sure the issue has been resolved? Confirming will close this support ticket.</p>
        {error && <p className="mt-3 flex items-start gap-2 rounded-md bg-red-50 p-3 text-xs font-medium text-red-700"><AlertCircle size={15} className="shrink-0" /> {error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={loading} className="rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={loading} className="rounded-md bg-[#075b35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#06492c] disabled:opacity-60">{loading ? 'Closing ticket...' : 'Yes, Close Ticket'}</button>
        </div>
      </section>
    </div>
  )
}
