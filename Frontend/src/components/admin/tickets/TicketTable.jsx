import { Eye, History, SearchX, Tag, Ticket } from 'lucide-react'
import TablePagination from '../common/TablePagination'
import TicketBadge from './TicketBadge'
import { priorityLabels, priorityTone, statusLabels, statusTone } from './constants'

const dateFormatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

export default function TicketTable({ state, page, pageSize, hasFilters, onPageChange, onRetry, onView, onPriority, onHistory }) {
  const tickets = state.data?.results || []
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {state.loading ? <div className="space-y-3 p-6">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded bg-slate-100" />)}</div> : state.error ? <div className="p-10 text-center"><p className="text-sm font-semibold text-red-700">{state.error}</p><button type="button" onClick={onRetry} className="mt-3 rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700">Retry</button></div> : tickets.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">{hasFilters ? <SearchX size={22} /> : <Ticket size={22} />}</span><p className="mt-3 text-sm font-semibold text-slate-700">{hasFilters ? 'No tickets match your filters' : 'No support tickets yet'}</p><p className="mt-1 text-xs text-slate-500">{hasFilters ? 'Adjust or clear the current filters.' : 'Submitted support requests will appear here.'}</p></div>
      ) : <>
        <div className="overflow-x-auto"><table className="w-full min-w-[1260px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr>{['Ticket ID', 'Issue title', 'Requester', 'Category', 'Priority', 'Status', 'Assigned technician', 'Date submitted', 'Actions'].map((heading) => <th key={heading} className="px-4 py-3 font-semibold first:pl-6 last:pr-6">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 text-slate-700">{tickets.map((ticket) => <tr key={ticket.id} className="align-top hover:bg-slate-50/70">
          <td className="whitespace-nowrap px-4 py-3.5 pl-6 font-semibold text-emerald-700">{ticket.ticket_number}</td>
          <td className="max-w-56 px-4 py-3.5"><button type="button" onClick={() => onView(ticket)} className="line-clamp-2 text-left font-semibold text-slate-900 hover:text-emerald-700">{ticket.title}</button></td>
          <td className="px-4 py-3.5"><p className="font-medium text-slate-800">{ticket.requester.name}</p><p className="mt-0.5 text-[11px] text-slate-500">{ticket.requester.email}</p></td>
          <td className="px-4 py-3.5">{ticket.category.name}</td>
          <td className="px-4 py-3.5"><TicketBadge className={priorityTone(ticket.priority)}>{priorityLabels[ticket.priority]}</TicketBadge></td>
          <td className="px-4 py-3.5"><TicketBadge className={statusTone(ticket.status)}>{statusLabels[ticket.status]}</TicketBadge></td>
          <td className="px-4 py-3.5">{ticket.assigned_technician ? <><p className="font-medium text-slate-800">{ticket.assigned_technician.name}</p><p className="mt-0.5 text-[11px] text-slate-500">{ticket.assigned_technician.specialization}</p></> : <span className="font-medium text-amber-700">Unassigned</span>}</td>
          <td className="whitespace-nowrap px-4 py-3.5 text-slate-500">{dateFormatter.format(new Date(ticket.created_at))}</td>
          <td className="px-4 py-3.5 pr-6"><div className="flex items-center gap-1"><button type="button" onClick={() => onView(ticket)} title="View details" className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-emerald-700"><Eye size={16} /></button><button type="button" onClick={() => onPriority(ticket)} title="Change priority" className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-emerald-700"><Tag size={16} /></button><button type="button" onClick={() => onHistory(ticket)} title="View history" className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-emerald-700"><History size={16} /></button></div></td>
        </tr>)}</tbody></table></div>
        <TablePagination count={state.data?.count || 0} page={page} pageSize={pageSize} onPageChange={onPageChange} itemLabel="tickets" />
      </>}
    </section>
  )
}
