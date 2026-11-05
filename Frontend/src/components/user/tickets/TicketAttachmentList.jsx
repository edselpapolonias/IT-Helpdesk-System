import { Download, Eye, FileText, Paperclip } from 'lucide-react'

function formatSize(bytes) {
  if (!bytes) return 'Size unavailable'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function TicketAttachmentList({ attachments, error, onDownload, onPreview }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Paperclip size={17} className="text-emerald-700" />
        <h3 className="text-base font-semibold text-slate-900">Attachments</h3>
      </div>
      <p className="mt-1 text-xs text-slate-500">Files you uploaded or the IT team explicitly shared with you.</p>
      {error && <p className="mt-3 text-xs font-medium text-red-600">{error}</p>}
      {attachments.length === 0 ? (
        <p className="mt-5 rounded-md bg-slate-50 p-5 text-center text-xs text-slate-500">No requester-visible attachments.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500"><FileText size={17} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{attachment.original_filename}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{attachment.file_type} · {formatSize(attachment.file_size)}</p>
              </div>
              <div className="flex gap-2">
                {attachment.preview_supported && <button type="button" onClick={() => onPreview(attachment)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Eye size={14} /> Preview</button>}
                <button type="button" onClick={() => onDownload(attachment)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Download size={14} /> Download</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
