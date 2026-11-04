import { AlertOctagon, ArrowRight, TimerOff, UserRoundX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SectionError } from './SectionState'

const items = [
  {
    key: 'unassigned',
    title: 'Unassigned tickets',
    description: 'Open requests waiting for a technician.',
    icon: UserRoundX,
    tone: 'bg-amber-50 text-amber-700',
    href: '/it-admin/tickets?filter=unassigned',
  },
  {
    key: 'critical',
    title: 'Critical priority',
    description: 'Unresolved incidents marked as critical.',
    icon: AlertOctagon,
    tone: 'bg-red-50 text-red-700',
    href: '/it-admin/tickets?priority=critical',
  },
  {
    key: 'overdue',
    title: 'Overdue tickets',
    description: 'Requests beyond their resolution deadline.',
    icon: TimerOff,
    tone: 'bg-violet-50 text-violet-700',
    href: '/it-admin/tickets?filter=overdue',
  },
]

export default function TicketsAttention({ state, onRetry }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Tickets requiring attention</h2>
        <p className="mt-1 text-xs text-slate-500">Incidents that may need administrator action.</p>
      </div>

      <div className="mt-5">
        {state.loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((row) => <div key={row} className="h-20 animate-pulse rounded-md bg-slate-100" />)}
          </div>
        ) : state.error ? (
          <SectionError message={state.error} onRetry={onRetry} />
        ) : (
          <div className="space-y-3">
            {items.map(({ key, title, description, icon: Icon, tone, href }) => (
              <Link
                key={key}
                to={href}
                className="group flex items-center gap-3 rounded-md border border-slate-200 p-3.5 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${tone}`}>
                  <Icon size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{title}</span>
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                      {state.data?.[key] ?? 0}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{description}</span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-slate-300 group-hover:text-emerald-700" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
