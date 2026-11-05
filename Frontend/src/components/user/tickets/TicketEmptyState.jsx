import { FilePlus2, SearchX, Ticket } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function TicketEmptyState({ filtered, onClear }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
        {filtered ? <SearchX size={22} /> : <Ticket size={22} />}
      </span>
      <h3 className="mt-4 text-sm font-semibold text-slate-800">
        {filtered ? 'No tickets match your filters' : 'No Tickets Yet'}
      </h3>
      <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
        {filtered
          ? 'No tickets match your search or selected filters.'
          : "You haven't submitted any support requests. Create your first ticket to get assistance from the IT support team."}
      </p>
      {filtered ? (
        <button type="button" onClick={onClear} className="mt-4 rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          Clear Filters
        </button>
      ) : (
        <Link to="/user/tickets/new" className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#075b35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#06492c]">
          <FilePlus2 size={15} /> Submit Ticket
        </Link>
      )}
    </div>
  )
}
