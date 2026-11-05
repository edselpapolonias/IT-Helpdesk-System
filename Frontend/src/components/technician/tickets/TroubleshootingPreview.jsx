import { Plus, Wrench } from 'lucide-react'

const formatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

export default function TroubleshootingPreview({ logs, canAdd, onAdd }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2"><Wrench size={17} className="text-slate-400" /><h3 className="text-sm font-semibold text-slate-900">Troubleshooting notes</h3></div>
        {canAdd && <button type="button" onClick={onAdd} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-200 px-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><Plus size={14} /> Add update</button>}
      </div>
      <div className="px-5 py-4 sm:px-6">
        {!logs.length ? <p className="py-2 text-sm text-slate-500">No troubleshooting work has been recorded yet.</p> : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => <div key={log.id} className="py-3 first:pt-0 last:pb-0"><div className="flex flex-col justify-between gap-1 sm:flex-row"><p className="text-sm font-semibold text-slate-800">{log.action_taken}</p><time className="text-[11px] text-slate-400">{formatter.format(new Date(log.created_at))}</time></div>{log.notes && <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{log.notes}</p>}<p className="mt-1.5 text-[11px] text-slate-400">{log.technician.name} · Internal technician note</p></div>)}
          </div>
        )}
      </div>
    </article>
  )
}
