import { Activity, CheckCircle2, Clock3, Inbox, RotateCcw, Ticket, UserRoundCheck, UserRoundX } from 'lucide-react'
import { formatCount, formatDuration, formatPercent } from './formatters'

function Comparison({ comparison, duration = false }) {
  if (!comparison) return null
  const change = comparison.change_percent
  return (
    <p className="mt-3 text-[11px] text-slate-500">
      Previous: {duration ? formatDuration(comparison.previous) : comparison.previous ?? 'N/A'}
      {change !== null && change !== undefined ? ` · ${change > 0 ? '+' : ''}${change}%` : ''}
    </p>
  )
}

export default function ReportsKPIs({ overview }) {
  const cards = [
    { key: 'submitted', title: 'Tickets submitted', value: formatCount(overview.submitted), icon: Ticket, help: 'Created during the selected period.' },
    { key: 'resolved', title: 'Tickets resolved', value: formatCount(overview.resolved), icon: CheckCircle2, help: 'Distinct tickets with a resolution record in the period.' },
    { key: 'cohort_resolution_rate', title: 'Cohort resolution rate', value: formatPercent(overview.cohort_resolution_rate), icon: Activity, help: 'Submitted in the period and resolved by its cutoff.' },
    { key: 'average_resolution_seconds', title: 'Average first resolution', value: formatDuration(overview.average_resolution_seconds), icon: Clock3, help: 'Creation to first valid resolution for resolutions in the period.', duration: true },
    { key: 'current_open_backlog', title: 'Current open backlog', value: formatCount(overview.current_open_backlog), icon: Inbox, help: 'Current unresolved tickets matching the filters.' },
    { key: 'current_unassigned', title: 'Current unassigned', value: formatCount(overview.current_unassigned), icon: UserRoundX, help: 'Current unresolved tickets without an assigned technician.' },
    { key: 'reopened', title: 'Reopened tickets', value: formatCount(overview.reopened), icon: RotateCcw, help: `${formatPercent(overview.attempt_reopen_rate)} of ${formatCount(overview.resolution_attempts)} resolution attempts were reopened.` },
    { key: 'active_technicians', title: 'Active technicians', value: formatCount(overview.active_technicians), icon: UserRoundCheck, help: 'Active technician accounts matching the filter.' },
  ]

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Report summary metrics">
      {cards.map(({ key, title, value, icon: Icon, help, duration }) => (
        <article key={key} className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500">{title}</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-700"><Icon size={19} /></span>
          </div>
          <p className="mt-3 text-[11px] leading-4 text-slate-500">{help}</p>
          <Comparison comparison={overview.comparison?.[key]} duration={duration} />
        </article>
      ))}
    </section>
  )
}
