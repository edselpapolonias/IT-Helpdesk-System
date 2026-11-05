import { CheckCircle2, FileText, RotateCcw } from 'lucide-react'

const dateFormatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

function Detail({ label, value, className = '' }) {
  if (!value) return null
  return (
    <div className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{value}</p>
    </div>
  )
}

export default function TicketResolutionDetails({ resolutions }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <CheckCircle2 size={17} className="text-emerald-700" />
        <h3 className="text-base font-semibold text-slate-900">Resolution details</h3>
      </div>
      {resolutions.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No resolution has been recorded.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {resolutions.map((resolution, index) => (
            <article key={resolution.id} className="rounded-md border border-emerald-100 bg-emerald-50/50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                {resolutions.length > 1 ? `Resolution attempt ${index + 1}` : 'Resolution summary'}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{resolution.resolution_summary}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Detail label="Root cause" value={resolution.root_cause} />
                <Detail label="Actions performed" value={resolution.actions_performed} />
              </div>
              <Detail label="Technician notes" value={resolution.notes} className="mt-3" />
              {resolution.closed_at && (
                <p className="mt-3 rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-800">
                  Closed on {dateFormatter.format(new Date(resolution.closed_at))}
                </p>
              )}
              {resolution.reopened_at && (
                <div className="mt-3 flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                  <RotateCcw size={14} className="mt-0.5 shrink-0 text-amber-700" />
                  <p className="text-xs leading-5 text-amber-800">
                    Reopened on {dateFormatter.format(new Date(resolution.reopened_at))}
                    {resolution.reopen_reason ? `: ${resolution.reopen_reason}` : ''}
                  </p>
                </div>
              )}
              {resolution.attachments?.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Supporting evidence</p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {resolution.attachments.map((attachment) => (
                      <span key={attachment.id} className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">
                        <FileText size={12} />
                        {attachment.original_filename}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-3 text-[11px] text-slate-500">
                Resolved by {resolution.resolved_by.name} · {dateFormatter.format(new Date(resolution.resolved_at))}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
