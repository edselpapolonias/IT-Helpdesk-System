import { AlertCircle, CheckCircle2, Clock3, RotateCcw, Tickets } from 'lucide-react'

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '—'
  const totalMinutes = Math.round(seconds / 60)
  if (totalMinutes < 1) return '<1m'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`
  if (!hours) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

const cards = [
  ['resolved_this_month_attempts', 'Resolved This Month', Tickets, 'emerald'],
  ['closed_after_my_resolution', 'Closed After My Resolution', CheckCircle2, 'green'],
  ['average_resolution_seconds', 'Average Resolution Time', Clock3, 'blue'],
  ['reopened_after_my_resolution', 'Reopened After My Resolution', RotateCcw, 'amber'],
]

function iconStyle(tone) {
  if (tone === 'emerald') return 'bg-emerald-50 text-emerald-700'
  if (tone === 'green') return 'bg-green-50 text-green-700'
  if (tone === 'blue') return 'bg-blue-50 text-blue-700'
  return 'bg-amber-50 text-amber-700'
}

export default function CompletedTicketStats({ state }) {
  if (state.error && !state.data) {
    return <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700"><AlertCircle size={15} /> {state.error}</div>
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([key, label, Icon, tone]) => {
        const value = key === 'average_resolution_seconds' ? formatDuration(state.data?.[key]) : state.data?.[key]
        return (
          <article key={key} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{state.loading ? '—' : value ?? 0}</p>
              </div>
              <span className={`grid h-9 w-9 place-items-center rounded-md ${iconStyle(tone)}`}><Icon size={17} /></span>
            </div>
            {key === 'resolved_this_month_attempts' && !state.loading && <p className="mt-2 text-[11px] text-slate-400">{state.data?.resolved_this_month_tickets || 0} distinct tickets</p>}
          </article>
        )
      })}
    </section>
  )
}
