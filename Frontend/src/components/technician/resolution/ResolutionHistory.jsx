import { CheckCircle2, RotateCcw } from 'lucide-react'

const formatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

export default function ResolutionHistory({ resolutions }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4"><h3 className="text-sm font-semibold text-slate-900">Previous resolution attempts</h3></div>
      {!resolutions.length ? <p className="px-5 py-6 text-sm text-slate-500">This is the first resolution attempt for this ticket.</p> : <div className="divide-y divide-slate-100 px-5">{resolutions.map((resolution, index) => <article key={resolution.id} className="py-4"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-emerald-700">Attempt {index + 1}</p><time className="text-[11px] text-slate-400">{formatter.format(new Date(resolution.resolved_at))}</time></div><p className="mt-2 text-sm leading-6 text-slate-700">{resolution.resolution_summary}</p>{resolution.reopened_at && <div className="mt-3 flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2"><RotateCcw size={14} className="mt-0.5 shrink-0 text-amber-700" /><p className="text-xs leading-5 text-amber-800">Reopened: {resolution.reopen_reason || 'The issue was reported again.'}</p></div>}{resolution.closed_at && <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700"><CheckCircle2 size={13} /> Confirmed and closed</p>}</article>)}</div>}
    </section>
  )
}
