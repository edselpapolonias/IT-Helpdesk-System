import { Eye, Inbox, PlayCircle, RotateCcw, SearchX } from 'lucide-react'
import TablePagination from '../../admin/common/TablePagination'
import { TicketPriorityBadge, TicketStatusBadge } from './TicketStatusBadge'

const formatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

export default function AssignedTicketsTable({ state, page, pageSize, hasFilters, onPageChange, onRetry, onView, onStart, onClear }) {
  const tickets = state.data?.results || []
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6"><h2 className="text-base font-semibold text-slate-900">Assigned ticket queue</h2><p className="mt-1 text-xs text-slate-500">Only current active assignments are shown.</p></div>
      {state.loading ? (
        <div className="space-y-3 p-6">{[1, 2, 3, 4, 5].map((row) => <div key={row} className="h-12 animate-pulse rounded bg-slate-100" />)}</div>
      ) : state.error ? (
        <div className="p-10 text-center"><p className="text-sm font-semibold text-red-700">{state.error}</p><button type="button" onClick={onRetry} className="mx-auto mt-4 inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"><RotateCcw size={14} /> Retry</button></div>
      ) : tickets.length === 0 ? (
        <div className="p-12 text-center">{hasFilters ? <SearchX size={25} className="mx-auto text-slate-300" /> : <Inbox size={25} className="mx-auto text-slate-300" />}<p className="mt-3 text-sm font-semibold text-slate-700">{hasFilters ? 'No tickets match your filters.' : 'No active tickets are currently assigned to you.'}</p><p className="mt-1 text-xs text-slate-500">{hasFilters ? 'Try changing or clearing the current filters.' : 'New administrator assignments will appear here.'}</p>{hasFilters && <button type="button" onClick={onClear} className="mt-4 text-xs font-semibold text-emerald-700 hover:text-emerald-800">Clear all filters</button>}</div>
      ) : (
        <>
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr>{['Ticket ID', 'Issue title', 'Category', 'Priority', 'Status', 'Requester', 'Date assigned', 'Actions'].map((heading) => <th key={heading} className="px-4 py-3 font-semibold first:pl-6 last:pr-6">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {tickets.map((ticket) => <tr key={ticket.id} className="hover:bg-slate-50/70"><td className="whitespace-nowrap px-4 py-4 pl-6 font-semibold text-emerald-700">{ticket.ticket_number}</td><td className="max-w-64 truncate px-4 py-4 font-medium text-slate-900" title={ticket.title}>{ticket.title}</td><td className="whitespace-nowrap px-4 py-4">{ticket.category?.name || 'Uncategorized'}</td><td className="px-4 py-4"><TicketPriorityBadge priority={ticket.priority} /></td><td className="px-4 py-4"><TicketStatusBadge status={ticket.status} /></td><td className="whitespace-nowrap px-4 py-4">{ticket.requester.name}</td><td className="whitespace-nowrap px-4 py-4">{ticket.date_assigned ? formatter.format(new Date(ticket.date_assigned)) : 'Not recorded'}</td><td className="px-4 py-4 pr-6"><div className="flex items-center gap-2"><button type="button" onClick={() => onView(ticket)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 font-semibold text-slate-600 hover:bg-slate-50"><Eye size={14} /> View</button>{ticket.can_start_work && <button type="button" onClick={() => onStart(ticket)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#075b35] px-2.5 font-semibold text-white hover:bg-[#06492c]"><PlayCircle size={14} /> Start Work</button>}</div></td></tr>)}
              </tbody>
            </table>
          </div>
          <TablePagination count={state.data.count} page={page} pageSize={pageSize} onPageChange={onPageChange} itemLabel="tickets" />
        </>
      )}
    </section>
  )
}
