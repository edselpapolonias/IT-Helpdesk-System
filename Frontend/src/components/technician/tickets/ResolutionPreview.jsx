import { CheckCircle2 } from 'lucide-react'

const formatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

export default function ResolutionPreview({ resolutions }) {
  if (!resolutions.length) return null
  return (
    <article className="rounded-lg border border-emerald-200 bg-white">
      <div className="flex items-center gap-2 border-b border-emerald-100 px-5 py-4 sm:px-6"><CheckCircle2 size={17} className="text-emerald-700" /><h3 className="text-sm font-semibold text-slate-900">Resolution</h3></div>
      <div className="divide-y divide-slate-100 px-5 sm:px-6">
        {resolutions.map((resolution) => <div key={resolution.id} className="py-4"><p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{resolution.resolution_summary}</p><p className="mt-2 text-[11px] text-slate-400">Resolved by {resolution.resolved_by.name} · {formatter.format(new Date(resolution.resolved_at))}</p></div>)}
      </div>
    </article>
  )
}
