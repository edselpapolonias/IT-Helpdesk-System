import { Download, Eye, FileText, MessageSquareText, Wrench } from 'lucide-react'

const formatter = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export default function PublicTechnicianUpdates({ updates, onPreview, onDownload }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Wrench size={17} className="text-emerald-700" />
        <h3 className="text-base font-semibold text-slate-900">Technician updates</h3>
      </div>
      <p className="mt-1 text-xs text-slate-500">Updates the IT team has shared with you.</p>
      {updates.length === 0 ? (
        <div className="mt-5 rounded-md bg-slate-50 p-6 text-center">
          <MessageSquareText size={20} className="mx-auto text-slate-300" />
          <p className="mt-2 text-xs text-slate-500">No requester-visible technician updates yet.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {updates.map((update) => (
            <article key={update.id} className="rounded-md border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-800">{update.action_summary}</h4>
                <time className="text-[11px] text-slate-400">{formatter.format(new Date(update.created_at))}</time>
              </div>
              {update.diagnosis && <div className="mt-3 rounded bg-white px-3 py-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Findings</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{update.diagnosis}</p></div>}
              {update.public_notes && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{update.public_notes}</p>}
              {update.attachments?.length > 0 && <div className="mt-3 space-y-2">{update.attachments.map((attachment) => <div key={attachment.id} className="flex flex-col gap-2 rounded border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center"><FileText size={14} className="shrink-0 text-slate-400" /><p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-600">{attachment.original_filename}</p><div className="flex gap-1.5">{attachment.preview_supported && <button type="button" onClick={() => onPreview(attachment)} className="inline-flex h-7 items-center gap-1 rounded border border-slate-200 px-2 text-[11px] font-semibold text-slate-600"><Eye size={12} /> Preview</button>}<button type="button" onClick={() => onDownload(attachment)} className="inline-flex h-7 items-center gap-1 rounded border border-slate-200 px-2 text-[11px] font-semibold text-slate-600"><Download size={12} /> Download</button></div></div>)}</div>}
              <p className="mt-2 text-[11px] font-medium text-slate-500">Technician: {update.technician}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
