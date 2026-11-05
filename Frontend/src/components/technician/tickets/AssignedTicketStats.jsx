import { AlertTriangle, ClipboardList, Clock3, PlayCircle } from 'lucide-react'

const cards = [
  ['Active Assigned Tickets', 'active', ClipboardList, 'bg-slate-100 text-slate-700'],
  ['Awaiting Action', 'awaiting_action', Clock3, 'bg-amber-50 text-amber-700'],
  ['In Progress', 'in_progress', PlayCircle, 'bg-blue-50 text-blue-700'],
  ['Critical Priority', 'critical', AlertTriangle, 'bg-red-50 text-red-700'],
]

export default function AssignedTicketStats({ state }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([title, key, Icon, tone]) => (
        <article key={key} className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase leading-4 tracking-[0.07em] text-slate-500">{title}</p>{state.loading ? <div className="mt-3 h-8 w-14 animate-pulse rounded bg-slate-100" /> : state.error ? <p className="mt-3 text-xs font-semibold text-red-600">Unavailable</p> : <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{state.data?.[key] ?? 0}</p>}</div><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${tone}`}><Icon size={20} /></span></div>
        </article>
      ))}
    </section>
  )
}
