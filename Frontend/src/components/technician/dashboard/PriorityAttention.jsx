import { AlertTriangle, ArrowRight, Clock3, Inbox, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'

function waitingTime(seconds) {
  const hours = Math.floor(seconds / 3600)
  if (hours < 1) return `${Math.max(1, Math.floor(seconds / 60))} min`
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'}`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'}`
}

const priorityTone = {
  CRITICAL: 'bg-red-50 text-red-700',
  HIGH: 'bg-orange-50 text-orange-700',
  MEDIUM: 'bg-blue-50 text-blue-700',
  LOW: 'bg-slate-100 text-slate-600',
}

export default function PriorityAttention({ state, onRetry }) {
  const tickets = state.data?.results || []
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6"><h2 className="text-base font-semibold text-slate-900">Tickets requiring attention</h2><p className="mt-1 text-xs text-slate-500">Priority requests, overdue work, and assignments awaiting your first action.</p></div>
      {state.loading ? (
        <div className="space-y-3 p-5">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-md bg-slate-100" />)}</div>
      ) : state.error ? (
        <div className="p-8 text-center"><AlertTriangle size={22} className="mx-auto text-red-500" /><p className="mt-2 text-sm font-medium text-red-700">{state.error}</p><button type="button" onClick={onRetry} className="mx-auto mt-3 inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700"><RotateCcw size={14} /> Retry</button></div>
      ) : tickets.length === 0 ? (
        <div className="p-10 text-center"><Inbox size={23} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No tickets currently require special attention.</p><p className="mt-1 text-xs text-slate-500">Priority and pending work will appear here.</p></div>
      ) : (
        <div className="divide-y divide-slate-100">
          {tickets.map((ticket) => (
            <article key={ticket.id} className="p-5 hover:bg-slate-50/70 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Link to={`/technician/tickets/${ticket.id}`} className="text-xs font-bold text-emerald-700 hover:text-emerald-800">{ticket.ticket_id}</Link><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityTone[ticket.priority]}`}>{ticket.priority}</span></div><h3 className="mt-1.5 truncate text-sm font-semibold text-slate-900" title={ticket.title}>{ticket.title}</h3></div>
                <Link to={`/technician/tickets/${ticket.id}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700" aria-label={`View ${ticket.ticket_id}`}><ArrowRight size={15} /></Link>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2"><span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500"><Clock3 size={13} /> Waiting {waitingTime(ticket.waiting_seconds)}</span>{ticket.attention_reasons.map((reason) => <span key={reason} className={`rounded-full px-2 py-1 text-[10px] font-semibold ${reason === 'Past resolution due date' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{reason}</span>)}</div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
