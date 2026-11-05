import { CheckCircle2, RotateCcw } from 'lucide-react'

const formatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

function Detail({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{value}</p>
    </div>
  )
}

export default function ResolutionPreview({ resolutions }) {
  if (!resolutions.length) return null

  return (
    <article className="rounded-lg border border-emerald-200 bg-white">
      <div className="flex items-center gap-2 border-b border-emerald-100 px-5 py-4 sm:px-6">
        <CheckCircle2 size={17} className="text-emerald-700" />
        <h3 className="text-sm font-semibold text-slate-900">Resolution</h3>
      </div>
      <div className="divide-y divide-slate-100 px-5 sm:px-6">
        {resolutions.map((resolution, index) => (
          <div key={resolution.id} className="space-y-3 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
              {resolutions.length > 1 ? `Resolution attempt ${index + 1}` : 'Resolution summary'}
            </p>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{resolution.resolution_summary}</p>
            <Detail label="Root cause" value={resolution.root_cause} />
            <Detail label="Actions performed" value={resolution.actions_performed} />
            <Detail label="Technician notes" value={resolution.notes} />
            {resolution.closed_at && (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                Closed on {formatter.format(new Date(resolution.closed_at))}
              </p>
            )}
            {resolution.reopened_at && (
              <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                <RotateCcw size={14} className="mt-0.5 shrink-0" />
                <p className="text-xs leading-5">
                  Reopened on {formatter.format(new Date(resolution.reopened_at))}
                  {resolution.reopen_reason ? `: ${resolution.reopen_reason}` : ''}
                </p>
              </div>
            )}
            <p className="text-[11px] text-slate-400">
              Resolved by {resolution.resolved_by.name} · {formatter.format(new Date(resolution.resolved_at))}
            </p>
          </div>
        ))}
      </div>
    </article>
  )
}
