import { AlertTriangle, CheckCircle2, CircleDot, Clock3, Inbox, UserRoundX } from 'lucide-react'

const cards = [
  ['total', 'Total Tickets', Inbox, 'bg-slate-100 text-slate-700'],
  ['open', 'Open Tickets', CircleDot, 'bg-slate-100 text-slate-700'],
  ['in_progress', 'In Progress', Clock3, 'bg-blue-50 text-blue-700'],
  ['resolved', 'Resolved Tickets', CheckCircle2, 'bg-emerald-50 text-emerald-700'],
  ['critical', 'Critical Tickets', AlertTriangle, 'bg-red-50 text-red-700'],
  ['unassigned', 'Unassigned Tickets', UserRoundX, 'bg-amber-50 text-amber-700'],
]

export default function TicketStats({ state }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(([key, label, Icon, tone]) => (
        <article key={key} className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
          {state.loading ? <div className="h-14 animate-pulse rounded bg-slate-100" /> : (
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{state.data?.[key] ?? 0}</p></div>
              <span className={`grid h-10 w-10 place-items-center rounded-md ${tone}`}><Icon size={19} /></span>
            </div>
          )}
        </article>
      ))}
      {state.error && <p className="sm:col-span-2 xl:col-span-3 text-xs font-medium text-red-600">{state.error}</p>}
    </section>
  )
}
