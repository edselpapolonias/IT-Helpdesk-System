import { Activity, UserCheck, UserRoundX, UsersRound } from 'lucide-react'

const cards = [
  { key: 'total', label: 'Total technicians', icon: UsersRound, tone: 'bg-emerald-50 text-emerald-700' },
  { key: 'active', label: 'Active technicians', icon: UserCheck, tone: 'bg-green-50 text-green-700' },
  { key: 'inactive', label: 'Inactive technicians', icon: UserRoundX, tone: 'bg-slate-100 text-slate-600' },
  { key: 'with_active_assignments', label: 'With active assignments', icon: Activity, tone: 'bg-blue-50 text-blue-700' },
]

export default function TechnicianStats({ state }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Technician statistics">
      {cards.map(({ key, label, icon: Icon, tone }) => (
        <article key={key} className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="min-h-8 text-xs font-semibold uppercase leading-4 tracking-[0.08em] text-slate-500">{label}</p>
              {state.loading ? <div className="mt-3 h-9 w-16 animate-pulse rounded bg-slate-100" /> : state.error ? <p className="mt-3 text-sm font-semibold text-red-600">Unavailable</p> : <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{state.data?.[key] ?? 0}</p>}
            </div>
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${tone}`}><Icon size={21} /></span>
          </div>
        </article>
      ))}
    </section>
  )
}
