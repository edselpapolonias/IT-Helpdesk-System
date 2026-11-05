import { CalendarDays, Clock3, MapPin, RotateCcw } from 'lucide-react'

const formatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

function MetaItem({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3 py-2.5">
      <Icon size={16} className="mt-0.5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-700">{children || 'Not specified'}</p>
      </div>
    </div>
  )
}

export default function TicketOverview({ ticket }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <h3 className="text-sm font-semibold text-slate-900">Issue overview</h3>
      </div>
      <div className="px-5 py-5 sm:px-6">
        <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{ticket.description}</p>
        {ticket.status === 'REOPENED' && ticket.reopen_reason && (
          <div className="mt-5 flex gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
            <RotateCcw size={17} className="mt-0.5 shrink-0 text-amber-700" />
            <div>
              <p className="text-xs font-semibold text-amber-900">Reason for reopening</p>
              <p className="mt-1 text-xs leading-5 text-amber-800">{ticket.reopen_reason}</p>
            </div>
          </div>
        )}
        <div className="mt-5 grid border-t border-slate-100 pt-3 sm:grid-cols-2">
          <MetaItem icon={MapPin} label="Location">{ticket.location}</MetaItem>
          <MetaItem icon={Clock3} label="Category">{ticket.category?.name || 'Uncategorized'}</MetaItem>
          <MetaItem icon={CalendarDays} label="Submitted">{formatter.format(new Date(ticket.created_at))}</MetaItem>
          <MetaItem icon={CalendarDays} label="Resolution due">{ticket.resolution_due_at ? formatter.format(new Date(ticket.resolution_due_at)) : 'No deadline configured'}</MetaItem>
        </div>
      </div>
    </article>
  )
}
