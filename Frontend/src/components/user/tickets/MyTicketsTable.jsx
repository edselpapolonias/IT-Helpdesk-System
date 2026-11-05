import { ArrowRight, Clock3, Eye } from 'lucide-react'
import TablePagination from '../../admin/common/TablePagination'
import TicketBadge from '../../admin/tickets/TicketBadge'
import { priorityLabels, priorityTone } from '../../admin/tickets/constants'
import TicketEmptyState from './TicketEmptyState'
import TicketStatusBadge from './TicketStatusBadge'

const formatter = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function ResolutionIndicator({ ticket }) {
  if (ticket.needs_confirmation) {
    return (
      <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
        <Clock3 size={11} /> Awaiting Your Confirmation
      </p>
    )
  }
  if (ticket.resolution_response === 'REOPEN_REQUESTED') {
    return (
      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-orange-700">
        Reopening Requested
      </p>
    )
  }
  return null
}

function Technician({ technician }) {
  if (!technician) return <span className="font-medium text-amber-700">Not Yet Assigned</span>
  return (
    <div>
      <p className="font-medium text-slate-800">{technician.name}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{technician.specialization}</p>
    </div>
  )
}

function MobileTicketCard({ ticket, onView }) {
  return (
    <button
      type="button"
      onClick={() => onView(ticket)}
      className="block w-full p-4 text-left hover:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
            {ticket.ticket_number}
          </p>
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-900">
            {ticket.title}
          </h3>
        </div>
        <ArrowRight size={16} className="mt-1 shrink-0 text-slate-400" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <TicketStatusBadge status={ticket.status} />
        <TicketBadge className={priorityTone(ticket.priority)}>
          {priorityLabels[ticket.priority]}
        </TicketBadge>
      </div>
      <ResolutionIndicator ticket={ticket} />
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs">
        <div><dt className="text-[10px] uppercase tracking-wide text-slate-400">Category</dt><dd className="mt-1 font-medium text-slate-700">{ticket.category?.name || 'Uncategorized'}</dd></div>
        <div><dt className="text-[10px] uppercase tracking-wide text-slate-400">Submitted</dt><dd className="mt-1 font-medium text-slate-700">{formatter.format(new Date(ticket.created_at))}</dd></div>
        <div className="col-span-2"><dt className="text-[10px] uppercase tracking-wide text-slate-400">Assigned technician</dt><dd className="mt-1"><Technician technician={ticket.assigned_technician} /></dd></div>
      </dl>
    </button>
  )
}

export default function MyTicketsTable({
  state,
  page,
  pageSize,
  hasFilters,
  onPageChange,
  onRetry,
  onView,
  onClear,
}) {
  const tickets = state.data?.results || []
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {state.loading ? (
        <div className="space-y-3 p-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      ) : state.error ? (
        <div className="p-10 text-center">
          <p className="text-sm font-semibold text-red-700">{state.error}</p>
          <button type="button" onClick={onRetry} className="mt-3 rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700">
            Retry
          </button>
        </div>
      ) : tickets.length === 0 ? (
        <TicketEmptyState filtered={hasFilters} onClear={onClear} />
      ) : (
        <>
          <div className="divide-y divide-slate-100 md:hidden">
            {tickets.map((ticket) => <MobileTicketCard key={ticket.id} ticket={ticket} onView={onView} />)}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1120px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  {['Ticket ID', 'Issue Title', 'Category', 'Priority', 'Status', 'Assigned Technician', 'Date Submitted', 'Action'].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-semibold first:pl-6 last:pr-6">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="align-top hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3.5 pl-6 font-semibold text-emerald-700">{ticket.ticket_number}</td>
                    <td className="max-w-64 px-4 py-3.5"><button type="button" onClick={() => onView(ticket)} className="line-clamp-2 text-left font-semibold text-slate-900 hover:text-emerald-700">{ticket.title}</button><ResolutionIndicator ticket={ticket} /></td>
                    <td className="px-4 py-3.5">{ticket.category?.name || 'Uncategorized'}</td>
                    <td className="px-4 py-3.5"><TicketBadge className={priorityTone(ticket.priority)}>{priorityLabels[ticket.priority]}</TicketBadge></td>
                    <td className="px-4 py-3.5"><TicketStatusBadge status={ticket.status} /></td>
                    <td className="px-4 py-3.5"><Technician technician={ticket.assigned_technician} /></td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-500">{formatter.format(new Date(ticket.created_at))}</td>
                    <td className="px-4 py-3.5 pr-6"><button type="button" onClick={() => onView(ticket)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 hover:text-emerald-700"><Eye size={14} /> View Details</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination count={state.data?.count || 0} page={page} pageSize={pageSize} onPageChange={onPageChange} itemLabel="tickets" />
        </>
      )}
    </section>
  )
}
