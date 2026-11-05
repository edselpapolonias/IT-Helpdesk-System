import { LoaderCircle, Wrench, X } from 'lucide-react'
import { useState } from 'react'

export default function AddTroubleshootingDialog({ open, submitting, error, onClose, onSubmit }) {
  const [form, setForm] = useState({ action_taken: '', notes: '' })

  if (!open) return null
  const valid = form.action_taken.trim().length > 0
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="troubleshooting-title">
      <form onSubmit={(event) => { event.preventDefault(); if (valid) onSubmit({ action_taken: form.action_taken.trim(), notes: form.notes.trim() }) }} className="w-full max-w-lg rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-md bg-emerald-50 text-emerald-700"><Wrench size={18} /></span><div><h2 id="troubleshooting-title" className="text-base font-semibold text-slate-900">Add troubleshooting update</h2><p className="mt-0.5 text-xs text-slate-500">Saved as an internal technician note.</p></div></div><button type="button" onClick={onClose} disabled={submitting} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close dialog"><X size={18} /></button></div>
        <div className="space-y-4 p-5">
          <label className="block"><span className="text-xs font-semibold text-slate-700">Action taken <span className="text-red-500">*</span></span><input value={form.action_taken} onChange={(event) => setForm((current) => ({ ...current, action_taken: event.target.value }))} maxLength={220} autoFocus className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" placeholder="Example: Ran network connectivity tests" /></label>
          <label className="block"><span className="text-xs font-semibold text-slate-700">Technical notes</span><textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} maxLength={5000} rows={5} className="mt-1.5 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" placeholder="Record findings, commands, or next steps." /></label>
          {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700" role="alert">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4"><button type="button" onClick={onClose} disabled={submitting} className="h-9 rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700">Cancel</button><button type="submit" disabled={!valid || submitting} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{submitting ? <LoaderCircle size={15} className="animate-spin" /> : <Wrench size={15} />}{submitting ? 'Saving...' : 'Save Update'}</button></div>
      </form>
    </div>
  )
}
