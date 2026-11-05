import { Download, Eye, FileText, LoaderCircle, Plus, Wrench } from 'lucide-react'
import VisibilityBadge from '../troubleshooting/VisibilityBadge'

const formatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

export default function TroubleshootingPreview({ logs, canAdd, onAdd, onPreview, onDownload, attachmentLoading }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2"><Wrench size={17} className="text-slate-400" /><h3 className="text-sm font-semibold text-slate-900">Troubleshooting activity</h3></div>
        {canAdd && <button type="button" onClick={onAdd} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-200 px-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><Plus size={14} /> Add log</button>}
      </div>
      <div className="px-5 py-4 sm:px-6">
        {!logs.length ? <p className="py-2 text-sm text-slate-500">No troubleshooting activity has been recorded yet.</p> : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <section key={log.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><p className="text-sm font-semibold text-slate-800">{log.action_taken}</p><p className="mt-1 text-[11px] text-slate-400">{log.technician.name}</p></div><div className="flex flex-wrap items-center gap-2"><VisibilityBadge visibility={log.visibility} /><time className="text-[11px] text-slate-400">{formatter.format(new Date(log.created_at))}</time></div></div>
                {log.diagnosis && <div className="mt-3 rounded-md bg-slate-50 px-3 py-2.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Diagnosis / findings</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{log.diagnosis}</p></div>}
                {log.notes && <div className="mt-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Additional notes</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{log.notes}</p></div>}
                {log.attachments?.length > 0 && <div className="mt-3 space-y-2">{log.attachments.map((attachment) => <div key={attachment.id} className="flex flex-col gap-2 rounded-md border border-slate-200 px-3 py-2 sm:flex-row sm:items-center"><FileText size={15} className="shrink-0 text-slate-400" /><p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-600">{attachment.original_filename}</p><div className="flex gap-1.5">{attachment.preview_supported && <button type="button" onClick={() => onPreview(attachment)} disabled={attachmentLoading === attachment.id} className="inline-flex h-7 items-center gap-1 rounded border border-slate-200 px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">{attachmentLoading === attachment.id ? <LoaderCircle size={12} className="animate-spin" /> : <Eye size={12} />} Preview</button>}<button type="button" onClick={() => onDownload(attachment)} disabled={attachmentLoading === attachment.id} className="inline-flex h-7 items-center gap-1 rounded border border-slate-200 px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"><Download size={12} /> Download</button></div></div>)}</div>}
              </section>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
