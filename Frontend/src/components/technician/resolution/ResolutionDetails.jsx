import { CheckCircle2, Download, Eye, FileText, RotateCcw, X } from 'lucide-react'

const formatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

function Section({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-700">{value}</p>
    </div>
  )
}

export default function ResolutionDetails({ resolution, onClose, onPreview, onDownload, onViewTicket }) {
  if (!resolution) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="resolution-detail-title">
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold text-emerald-700">{resolution.ticket.ticket_number} · Attempt {resolution.attempt_number}</p>
            <h2 id="resolution-detail-title" className="mt-1 text-lg font-semibold text-slate-900">Resolution details</h2>
            <p className="mt-1 text-xs text-slate-500">Recorded {formatter.format(new Date(resolution.resolved_at))}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-400 hover:bg-slate-100" aria-label="Close resolution details"><X size={18} /></button>
        </div>

        <div className="min-h-0 space-y-5 overflow-y-auto p-5 sm:p-6">
          <Section label="Resolution summary" value={resolution.resolution_summary} />
          <Section label="Root cause" value={resolution.root_cause} />
          <Section label="Actions performed" value={resolution.actions_performed} />
          <Section label="Resolution notes" value={resolution.notes} />

          {resolution.closed_at && (
            <div className="flex gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-700" />
              <p className="text-xs leading-5 text-emerald-800">Requester or administrator confirmed this work and closed the ticket on {formatter.format(new Date(resolution.closed_at))}.</p>
            </div>
          )}
          {resolution.reopened_at && (
            <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <RotateCcw size={15} className="mt-0.5 shrink-0 text-amber-700" />
              <div>
                <p className="text-xs font-semibold text-amber-800">Reopened {formatter.format(new Date(resolution.reopened_at))}</p>
                <p className="mt-1 text-xs leading-5 text-amber-700">{resolution.reopen_reason || 'The issue was reported again.'}</p>
              </div>
            </div>
          )}

          {resolution.attachments?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Supporting evidence</p>
              <div className="mt-2 space-y-2">
                {resolution.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex flex-col gap-2 rounded-md border border-slate-200 px-3 py-2 sm:flex-row sm:items-center">
                    <FileText size={15} className="text-slate-400" />
                    <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-600">{attachment.original_filename}</p>
                    {resolution.can_view_ticket && (
                      <div className="flex gap-1.5">
                        {attachment.preview_supported && <button type="button" onClick={() => onPreview(attachment)} className="inline-flex h-7 items-center gap-1 rounded border border-slate-200 px-2 text-[11px] font-semibold text-slate-600"><Eye size={12} /> Preview</button>}
                        <button type="button" onClick={() => onDownload(attachment)} className="inline-flex h-7 items-center gap-1 rounded border border-slate-200 px-2 text-[11px] font-semibold text-slate-600"><Download size={12} /> Download</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
          {resolution.can_view_ticket && <button type="button" onClick={() => onViewTicket(resolution.ticket.id)} className="h-9 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700">View ticket</button>}
          <button type="button" onClick={onClose} className="h-9 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white">Close</button>
        </div>
      </div>
    </div>
  )
}
