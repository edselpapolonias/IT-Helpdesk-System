import { Download, Eye, EyeOff, FileText, LoaderCircle, Paperclip } from 'lucide-react'
import { useState } from 'react'
import { getApiError } from '../../../services/api'
import { ticketService } from '../../../services/ticketService'

const formatter = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function fileSize(bytes) {
  if (!bytes) return 'Size unavailable'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function TicketAttachments({ ticketId, attachments, onChanged }) {
  const [downloading, setDownloading] = useState(null)
  const [sharing, setSharing] = useState(null)
  const [error, setError] = useState('')

  async function download(attachment) {
    setDownloading(attachment.id)
    setError('')
    try {
      const blob = await ticketService.downloadAttachment(ticketId, attachment.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.original_filename
      link.click()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to download this attachment.'))
    } finally {
      setDownloading(null)
    }
  }

  async function toggleVisibility(attachment) {
    setSharing(attachment.id)
    setError('')
    try {
      const updated = await ticketService.updateAttachmentVisibility(
        ticketId,
        attachment.id,
        !attachment.is_requester_visible,
      )
      onChanged?.(updated)
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to update attachment visibility.'))
    } finally {
      setSharing(null)
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-center gap-2"><Paperclip size={17} className="text-emerald-700" /><h3 className="text-base font-semibold text-slate-900">Attachments</h3></div>
      <p className="mt-1 text-xs text-slate-500">Control which support-provided files are visible to the requester.</p>
      {attachments.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No attachments were submitted with this ticket.</p>
      ) : (
        <div className="mt-4 divide-y divide-slate-100">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500"><FileText size={17} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{attachment.original_filename}</p><p className="mt-0.5 text-[11px] text-slate-400">{fileSize(attachment.file_size)} · {attachment.uploaded_by.name} · {formatter.format(new Date(attachment.uploaded_at))}</p><p className={`mt-1 text-[10px] font-bold uppercase tracking-wide ${attachment.is_requester_visible ? 'text-emerald-700' : 'text-slate-400'}`}>{attachment.is_requester_visible ? 'Shared with requester' : 'Internal only'}</p></div></div>
              <div className="flex gap-2"><button type="button" onClick={() => toggleVisibility(attachment)} disabled={sharing === attachment.id} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">{sharing === attachment.id ? <LoaderCircle size={14} className="animate-spin" /> : attachment.is_requester_visible ? <EyeOff size={14} /> : <Eye size={14} />}{attachment.is_requester_visible ? ' Internal' : ' Share'}</button><button type="button" onClick={() => download(attachment)} disabled={downloading === attachment.id} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">{downloading === attachment.id ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />} Download</button></div>
            </div>
          ))}
        </div>
      )}
      {error && <p className="mt-3 text-xs font-medium text-red-600">{error}</p>}
    </section>
  )
}
