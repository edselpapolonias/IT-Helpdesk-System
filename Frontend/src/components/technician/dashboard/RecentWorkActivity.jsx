import { CheckCircle2, ClipboardCheck, History, Inbox, PlayCircle, RotateCcw, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'

const formatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

const eventStyles = {
  ASSIGNED: [ClipboardCheck, 'bg-violet-50 text-violet-700'],
  REASSIGNED_AWAY: [History, 'bg-slate-100 text-slate-600'],
  WORK_STARTED: [PlayCircle, 'bg-blue-50 text-blue-700'],
  STATUS_UPDATED: [History, 'bg-amber-50 text-amber-700'],
  TROUBLESHOOTING: [Wrench, 'bg-orange-50 text-orange-700'],
  RESOLVED: [CheckCircle2, 'bg-emerald-50 text-emerald-700'],
}

export default function RecentWorkActivity({ state, onRetry }) {
  const events = state.data?.results || []
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6"><h2 className="text-base font-semibold text-slate-900">Recent work activity</h2><p className="mt-1 text-xs text-slate-500">Recorded assignment and support actions related to your work.</p></div>
      {state.loading ? (
        <div className="space-y-4 p-5">{[1, 2, 3, 4].map((item) => <div key={item} className="h-14 animate-pulse rounded bg-slate-100" />)}</div>
      ) : state.error ? (
        <div className="p-8 text-center"><p className="text-sm font-medium text-red-700">{state.error}</p><button type="button" onClick={onRetry} className="mx-auto mt-3 inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700"><RotateCcw size={14} /> Retry</button></div>
      ) : events.length === 0 ? (
        <div className="p-10 text-center"><Inbox size={23} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No technician activity recorded yet.</p><p className="mt-1 text-xs text-slate-500">Your ticket work history will appear here.</p></div>
      ) : (
        <div className="divide-y divide-slate-100 px-5 sm:px-6">
          {events.map((event) => {
            const [Icon, tone] = eventStyles[event.event_type] || eventStyles.STATUS_UPDATED
            return <article key={event.id} className="flex gap-3 py-4"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${tone}`}><Icon size={16} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><Link to={`/technician/tickets/${event.ticket_id}`} className="text-xs font-bold text-emerald-700 hover:text-emerald-800">{event.ticket_number}</Link><time className="text-[10px] text-slate-400">{formatter.format(new Date(event.timestamp))}</time></div><p className="mt-1 text-xs leading-5 text-slate-600">{event.description}</p></div></article>
          })}
        </div>
      )}
    </section>
  )
}
