import { Download, Eye, FileText, LoaderCircle, Paperclip } from 'lucide-react'

function formatSize(bytes) {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function TechnicianTicketAttachments({ attachments, loadingId, error, onPreview, onDownload }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2"><Paperclip size={17} className="text-slate-400" /><h3 className="text-sm font-semibold text-slate-900">Attachments</h3></div>
        <span className="text-xs text-slate-400">{attachments.length} file{attachments.length === 1 ? '' : 's'}</span>
      </div>
      <div className="px-5 py-3 sm:px-6">
        {error && <p className="my-2 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}
        {!attachments.length ? <p className="py-5 text-sm text-slate-500">No attachments were added to this ticket.</p> : (
          <div className="divide-y divide-slate-100">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500"><FileText size={17} /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800" title={attachment.original_filename}>{attachment.original_filename}</p><p className="mt-0.5 text-[11px] text-slate-400">{attachment.file_type} · {formatSize(attachment.file_size)} · uploaded by {attachment.uploaded_by.name}</p></div>
                <div className="flex gap-2">
                  {attachment.preview_supported && <button type="button" onClick={() => onPreview(attachment)} disabled={loadingId === attachment.id} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">{loadingId === attachment.id ? <LoaderCircle size={14} className="animate-spin" /> : <Eye size={14} />} Preview</button>}
                  <button type="button" onClick={() => onDownload(attachment)} disabled={loadingId === attachment.id} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"><Download size={14} /> Download</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
