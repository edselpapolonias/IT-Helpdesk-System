import { Activity, CheckCircle2, Inbox, Tickets } from 'lucide-react'

const cards = [
  ['total', 'Total Tickets', Tickets, 'bg-slate-100 text-slate-700'],
  ['open', 'Open Tickets', Inbox, 'bg-amber-50 text-amber-700'],
  ['active', 'Active Tickets', Activity, 'bg-blue-50 text-blue-700'],
  ['resolved', 'Resolved Tickets', CheckCircle2, 'bg-emerald-50 text-emerald-700'],
]

export default function MyTicketStats({ summary, loading }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([key, label, Icon, tone]) => (
        <article key={key} className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500">{label}</p>
              {loading ? (
                <div className="mt-3 h-8 w-14 animate-pulse rounded bg-slate-100" />
              ) : (
                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                  {summary?.[key] ?? 0}
                </p>
              )}
            </div>
            <span className={`grid h-9 w-9 place-items-center rounded-md ${tone}`}>
              <Icon size={18} />
            </span>
          </div>
          {key === 'active' && (
            <p className="mt-3 text-[11px] leading-4 text-slate-400">Assigned or in progress</p>
          )}
        </article>
      ))}
    </section>
  )
}
