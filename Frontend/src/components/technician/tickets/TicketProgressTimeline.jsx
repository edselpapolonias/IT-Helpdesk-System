import { Activity, CheckCircle2, ClipboardCheck, Flag, UserCheck, Wrench } from 'lucide-react'

const formatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
const iconMap = { submitted: Flag, assignment: UserCheck, priority: Activity, status: ClipboardCheck, troubleshooting: Wrench, resolution: CheckCircle2 }

export default function TicketProgressTimeline({ events }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6"><h3 className="text-sm font-semibold text-slate-900">Activity timeline</h3></div>
      <div className="px-5 py-5 sm:px-6">
        {!events.length ? <p className="text-sm text-slate-500">No ticket activity has been recorded.</p> : (
          <ol>
            {events.map((event, index) => {
              const Icon = iconMap[event.type] || Activity
              return (
                <li key={event.id || `${event.type}-${event.timestamp}`} className="relative flex gap-4 pb-6 last:pb-0">
                  {index < events.length - 1 && <span className="absolute bottom-0 left-[15px] top-8 w-px bg-slate-200" />}
                  <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700"><Icon size={15} /></span>
                  <div className="min-w-0 flex-1 pt-0.5"><div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start"><p className="text-sm font-semibold text-slate-800">{event.title}</p><time className="shrink-0 text-[11px] text-slate-400">{formatter.format(new Date(event.timestamp))}</time></div>{event.description && <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{event.description}</p>}<p className="mt-1 text-[11px] text-slate-400">By {event.actor}</p></div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </article>
  )
}
