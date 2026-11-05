import { ArrowRight, CheckCircle2, FilePlus2, LayoutDashboard } from 'lucide-react'
import { Link } from 'react-router-dom'

const formatter = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export default function TicketSubmissionSuccess({ ticket, onSubmitAnother }) {
  return (
    <div className="mx-auto max-w-3xl">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-7 text-center sm:px-8">
          <CheckCircle2 size={40} className="mx-auto text-emerald-700" />
          <h2 className="mt-3 text-xl font-bold text-slate-900">Ticket submitted</h2>
          <p className="mt-1 text-sm text-slate-600">Your request is now in the IT helpdesk queue.</p>
        </div>
        <div className="p-5 sm:p-8">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Ticket number
            </p>
            <p className="mt-1 text-lg font-bold tracking-wide text-emerald-800">
              {ticket.ticket_number}
            </p>
            <h3 className="mt-4 text-sm font-semibold text-slate-800">{ticket.title}</h3>
            <dl className="mt-4 grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-3">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-700">Open</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Category</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-700">{ticket.category?.name}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Submitted</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-700">
                  {formatter.format(new Date(ticket.created_at))}
                </dd>
              </div>
            </dl>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Keep the ticket number for reference. You can follow status changes from your dashboard.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Link
              to={`/user/tickets/${ticket.id}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white hover:bg-[#06492c]"
            >
              View ticket <ArrowRight size={14} />
            </Link>
            <button
              type="button"
              onClick={onSubmitAnother}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <FilePlus2 size={15} /> Submit another
            </button>
            <Link
              to="/user/dashboard"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <LayoutDashboard size={15} /> Dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
