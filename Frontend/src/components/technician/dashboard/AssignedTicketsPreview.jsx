import { ArrowRight, Eye, Inbox, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'

const priorityStyles = {
  CRITICAL: 'bg-red-50 text-red-700 ring-red-600/15',
  HIGH: 'bg-orange-50 text-orange-700 ring-orange-600/15',
  MEDIUM: 'bg-blue-50 text-blue-700 ring-blue-600/15',
  LOW: 'bg-slate-100 text-slate-600 ring-slate-500/15',
}

const statusStyles = {
  ASSIGNED: 'bg-violet-50 text-violet-700 ring-violet-600/15',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 ring-blue-600/15',
  REOPENED: 'bg-amber-50 text-amber-700 ring-amber-600/15',
}

const formatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

function label(value) {
  return value.toLowerCase().split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
}

function Badge({ value, styles }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${styles[value]}`}>{label(value)}</span>
}

export default function AssignedTicketsPreview({ state, onRetry }) {
  const tickets = state.data?.results || []
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div><h2 className="text-base font-semibold text-slate-900">My assigned tickets</h2><p className="mt-1 text-xs text-slate-500">Your five most recently assigned active requests.</p></div>
        <Link to="/technician/tickets" className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800">View all <ArrowRight size={15} /></Link>
      </div>
      {state.loading ? (
        <div className="space-y-3 p-6">{[1, 2, 3, 4].map((row) => <div key={row} className="h-12 animate-pulse rounded bg-slate-100" />)}</div>
      ) : state.error ? (
        <div className="p-8 text-center"><p className="text-sm font-medium text-red-700">{state.error}</p><button type="button" onClick={onRetry} className="mx-auto mt-3 inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"><RotateCcw size={14} /> Retry</button></div>
      ) : tickets.length === 0 ? (
        <div className="p-10 text-center"><Inbox size={23} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No tickets have been assigned to you yet.</p><p className="mt-1 text-xs text-slate-500">New assignments from the IT administrator will appear here.</p></div>
      ) : (
        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr>{['Ticket ID', 'Issue title', 'Category', 'Priority', 'Status', 'Date assigned', 'Action'].map((heading) => <th key={heading} className="px-4 py-3 font-semibold first:pl-6 last:pr-6">{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {tickets.map((ticket) => <tr key={ticket.id} className="hover:bg-slate-50/70"><td className="whitespace-nowrap px-4 py-4 pl-6 font-semibold text-emerald-700">{ticket.ticket_id}</td><td className="max-w-64 truncate px-4 py-4 font-medium text-slate-900" title={ticket.title}>{ticket.title}</td><td className="whitespace-nowrap px-4 py-4">{ticket.category}</td><td className="px-4 py-4"><Badge value={ticket.priority} styles={priorityStyles} /></td><td className="px-4 py-4"><Badge value={ticket.status} styles={statusStyles} /></td><td className="whitespace-nowrap px-4 py-4">{formatter.format(new Date(ticket.date_assigned))}</td><td className="px-4 py-4 pr-6"><Link to={`/technician/tickets/${ticket.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 font-semibold text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"><Eye size={14} /> View details</Link></td></tr>)}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
