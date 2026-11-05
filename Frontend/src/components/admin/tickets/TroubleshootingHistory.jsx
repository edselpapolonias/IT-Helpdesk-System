import { Eye, EyeOff, LoaderCircle, Paperclip, Wrench } from 'lucide-react'
import { useState } from 'react'
import { getApiError } from '../../../services/api'
import { ticketService } from '../../../services/ticketService'

const formatter = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export default function TroubleshootingHistory({ ticketId, logs, onChanged }) {
  const [editing, setEditing] = useState(null)
  const [publicNotes, setPublicNotes] = useState('')
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')

  async function updateVisibility(log, visible, notes = log.public_notes) {
    setSaving(log.id)
    setError('')
    try {
      const updated = await ticketService.updateTroubleshootingVisibility(
        ticketId,
        log.id,
        { is_requester_visible: visible, public_notes: notes },
      )
      setEditing(null)
      setPublicNotes('')
      onChanged?.(updated)
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to update requester visibility.'))
    } finally {
      setSaving(null)
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-center gap-2"><Wrench size={17} className="text-emerald-700" /><h3 className="text-base font-semibold text-slate-900">Troubleshooting history</h3></div>
      <p className="mt-1 text-xs text-slate-500">Internal notes stay private. Share a separate public note only after review.</p>
      {error && <p className="mt-3 text-xs font-medium text-red-600">{error}</p>}
      {logs.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No troubleshooting activity has been recorded.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {logs.map((log) => (
            <article key={log.id} className="rounded-md border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="text-sm font-semibold text-slate-800">{log.action_taken}</p><p className="mt-1 text-[11px] font-medium text-slate-500">Technician: {log.technician.name}</p></div>
                <div className="text-right"><time className="text-[11px] text-slate-400">{formatter.format(new Date(log.created_at))}</time><p className={`mt-1 text-[10px] font-bold uppercase tracking-wide ${log.is_requester_visible ? 'text-emerald-700' : 'text-slate-400'}`}>{log.is_requester_visible ? 'Shared with requester' : 'Internal only'}</p></div>
              </div>
              {log.diagnosis && <div className="mt-3 rounded bg-white p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Diagnosis / findings</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{log.diagnosis}</p></div>}
              <div className="mt-3 rounded bg-white p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Internal notes</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{log.notes || 'No additional notes.'}</p></div>
              {log.is_requester_visible && <div className="mt-2 rounded border border-emerald-100 bg-emerald-50/50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Requester-visible note</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{log.public_notes}</p></div>}
              {log.attachments?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{log.attachments.map((attachment) => <span key={attachment.id} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600"><Paperclip size={12} /> {attachment.original_filename}</span>)}</div>}

              {editing === log.id ? (
                <div className="mt-3"><label className="text-[11px] font-semibold text-slate-600" htmlFor={`public-note-${log.id}`}>Requester-visible note</label><textarea id={`public-note-${log.id}`} value={publicNotes} onChange={(event) => setPublicNotes(event.target.value)} rows={4} maxLength={5000} className="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-xs leading-5 outline-none focus:border-emerald-700" placeholder="Write a safe, public-facing update without internal or sensitive details." /><div className="mt-2 flex gap-2"><button type="button" onClick={() => updateVisibility(log, true, publicNotes.trim())} disabled={saving === log.id} className="inline-flex items-center gap-1.5 rounded-md bg-[#075b35] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{saving === log.id ? <LoaderCircle size={14} className="animate-spin" /> : <Eye size={14} />} Share Update</button><button type="button" onClick={() => { setEditing(null); setPublicNotes('') }} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button></div></div>
              ) : (
                <div className="mt-3"><button type="button" onClick={() => log.is_requester_visible ? updateVisibility(log, false) : (setEditing(log.id), setPublicNotes(log.public_notes || ''))} disabled={saving === log.id} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-60">{saving === log.id ? <LoaderCircle size={14} className="animate-spin" /> : log.is_requester_visible ? <EyeOff size={14} /> : <Eye size={14} />}{log.is_requester_visible ? ' Make Internal' : ' Share with Requester'}</button></div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
