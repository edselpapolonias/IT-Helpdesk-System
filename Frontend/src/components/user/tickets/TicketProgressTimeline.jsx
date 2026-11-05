import {
  CheckCircle2,
  CircleDot,
  LockKeyhole,
  Play,
  RotateCcw,
  Ticket,
  UserRoundCheck,
  Wrench,
} from 'lucide-react'

const formatter = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const icons = {
  submitted: Ticket,
  assignment: UserRoundCheck,
  troubleshooting: Wrench,
  resolution: CheckCircle2,
}

function eventIcon(event) {
  if (event.title === 'Work Started') return Play
  if (event.title === 'Ticket Reopened') return RotateCcw
  if (event.title === 'Ticket Closed') return LockKeyhole
  return icons[event.type] || CircleDot
}

export default function TicketProgressTimeline({ events, loading }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <h3 className="text-base font-semibold text-slate-900">Ticket progress</h3>
      <p className="mt-1 text-xs text-slate-500">Recorded activity from submission to the current stage.</p>
      {loading ? (
        <div className="mt-5 space-y-4">{[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded bg-slate-100" />)}</div>
      ) : (
        <ol className="relative mt-5 space-y-0 before:absolute before:bottom-5 before:left-[17px] before:top-5 before:w-px before:bg-slate-200">
          {events.map((event) => {
            const Icon = eventIcon(event)
            return (
              <li key={`${event.type}-${event.timestamp}-${event.title}`} className="relative flex gap-4 pb-6 last:pb-0">
                <span className={`relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full ring-4 ring-white ${event.is_current ? 'bg-[#075b35] text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Icon size={16} />
                </span>
                <div className="min-w-0 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{event.title}</p>
                    {event.is_current && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Current</span>}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{event.description}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{formatter.format(new Date(event.timestamp))}{event.actor ? ` · ${event.actor}` : ''}</p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
