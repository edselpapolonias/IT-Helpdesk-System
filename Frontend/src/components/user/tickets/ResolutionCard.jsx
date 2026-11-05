import { CheckCircle2, RotateCcw } from 'lucide-react'

const formatter = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatDate(value) {
  return value ? formatter.format(new Date(value)) : 'Not recorded'
}

export default function ResolutionCard({ ticket, onConfirm, onReopen }) {
  if (!ticket.resolution) return null
  return (
    <section className="rounded-lg border border-emerald-200 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 size={19} /></span>
        <div>
          <h3 className="text-base font-semibold text-slate-900">Resolution Provided</h3>
          <p className="mt-1 text-xs text-slate-500">Review the solution recorded by the IT team.</p>
        </div>
      </div>
      <div className="mt-5 rounded-md bg-slate-50 p-4">
        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{ticket.resolution.summary}</p>
        <p className="mt-3 text-[11px] text-slate-500">Resolved by {ticket.resolution.resolved_by} on {formatDate(ticket.resolution.resolved_at)}</p>
      </div>

      {ticket.needs_confirmation && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-slate-900">Has your technical issue been resolved?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={onConfirm} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white hover:bg-[#06492c]"><CheckCircle2 size={15} /> Yes, Issue Resolved</button>
            <button type="button" onClick={onReopen} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"><RotateCcw size={15} /> No, Issue Still Exists</button>
          </div>
        </div>
      )}

      {ticket.resolution_response === 'CONFIRMED' && (
        <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">Resolution confirmed on {formatDate(ticket.requester_confirmed_at)}. This ticket is closed.</div>
      )}
      {ticket.resolution_response === 'REOPEN_REQUESTED' && (
        <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3"><p className="text-xs font-semibold text-amber-800">Ticket reopened on {formatDate(ticket.reopen_requested_at)}</p><p className="mt-1 text-xs leading-5 text-amber-700">{ticket.reopen_reason}</p></div>
      )}
    </section>
  )
}
