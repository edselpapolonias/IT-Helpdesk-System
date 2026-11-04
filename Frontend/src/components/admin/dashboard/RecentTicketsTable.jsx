import { ArrowRight, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, SectionError } from './SectionState'

const priorityStyles = {
  CRITICAL: 'bg-red-50 text-red-700 ring-red-600/15',
  HIGH: 'bg-orange-50 text-orange-700 ring-orange-600/15',
  MEDIUM: 'bg-blue-50 text-blue-700 ring-blue-600/15',
  LOW: 'bg-slate-100 text-slate-600 ring-slate-500/15',
}

const statusStyles = {
  OPEN: 'bg-slate-100 text-slate-700 ring-slate-500/15',
  ASSIGNED: 'bg-violet-50 text-violet-700 ring-violet-600/15',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 ring-blue-600/15',
  RESOLVED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  CLOSED: 'bg-slate-200 text-slate-700 ring-slate-600/15',
}

const dateFormatter = new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function label(value) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}

function Badge({ value, styles }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${styles[value]}`}>
      {label(value)}
    </span>
  )
}

export default function RecentTicketsTable({ state, onRetry }) {
  const tickets = state.data?.results || []

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Recent tickets</h2>
          <p className="mt-1 text-xs text-slate-500">Latest support requests submitted to the helpdesk.</p>
        </div>
        <Link
          to="/it-admin/tickets"
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
        >
          View all <ArrowRight size={15} />
        </Link>
      </div>

      {state.loading ? (
        <div className="space-y-3 p-6">
          {[1, 2, 3, 4].map((row) => (
            <div key={row} className="h-12 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      ) : state.error ? (
        <div className="p-5"><SectionError message={state.error} onRetry={onRetry} /></div>
      ) : tickets.length === 0 ? (
        <EmptyState title="No tickets submitted yet" description="New support requests will appear here." />
      ) : (
        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                {['Ticket ID', 'Issue title', 'Requester', 'Category', 'Priority', 'Status', 'Technician', 'Submitted', ''].map((heading) => (
                  <th key={heading || 'action'} className="px-4 py-3 font-semibold first:pl-6 last:pr-6">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-4 py-4 pl-6 font-semibold text-emerald-700">{ticket.ticket_id}</td>
                  <td className="max-w-56 truncate px-4 py-4 font-medium text-slate-900" title={ticket.title}>{ticket.title}</td>
                  <td className="whitespace-nowrap px-4 py-4">{ticket.requester}</td>
                  <td className="whitespace-nowrap px-4 py-4">{ticket.category}</td>
                  <td className="px-4 py-4"><Badge value={ticket.priority} styles={priorityStyles} /></td>
                  <td className="px-4 py-4"><Badge value={ticket.status} styles={statusStyles} /></td>
                  <td className="whitespace-nowrap px-4 py-4">{ticket.assigned_technician || <span className="text-slate-400">Unassigned</span>}</td>
                  <td className="whitespace-nowrap px-4 py-4">{dateFormatter.format(new Date(ticket.created_at))}</td>
                  <td className="px-4 py-4 pr-6 text-right">
                    <Link
                      to={`/it-admin/tickets/${ticket.id}`}
                      className="inline-grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                      aria-label={`View ${ticket.ticket_id}`}
                    >
                      <Eye size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
