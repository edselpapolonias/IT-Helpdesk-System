import { LoaderCircle, PlayCircle, X } from 'lucide-react'

export default function StartWorkDialog({ ticket, submitting, error, onClose, onConfirm }) {
  if (!ticket) return null
  const isResuming = ticket.status === 'REOPENED'
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="start-work-title">
      <div className="w-full max-w-md rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-md bg-blue-50 text-blue-700"><PlayCircle size={18} /></span><div><h2 id="start-work-title" className="text-base font-semibold text-slate-900">{isResuming ? 'Resume work on this ticket?' : 'Start work on this ticket?'}</h2><p className="mt-0.5 text-xs text-slate-500">{ticket.ticket_number}</p></div></div><button type="button" onClick={onClose} disabled={submitting} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close dialog"><X size={18} /></button></div>
        <div className="p-5"><p className="text-sm leading-6 text-slate-600">This will move <span className="font-semibold text-slate-800">{ticket.title}</span> from {isResuming ? 'Reopened' : 'Assigned'} to In Progress and record the action in ticket history.</p>{error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700" role="alert">{error}</p>}</div>
        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4"><button type="button" onClick={onClose} disabled={submitting} className="h-9 rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Cancel</button><button type="button" onClick={onConfirm} disabled={submitting} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white hover:bg-[#06492c] disabled:cursor-wait disabled:opacity-70">{submitting ? <LoaderCircle size={15} className="animate-spin" /> : <PlayCircle size={15} />}{submitting ? (isResuming ? 'Resuming...' : 'Starting...') : (isResuming ? 'Resume Work' : 'Start Work')}</button></div>
      </div>
    </div>
  )
}
