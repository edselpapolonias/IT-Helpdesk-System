import { Eye, FileUp, LoaderCircle, LockKeyhole, Paperclip, Trash2, Wrench, X } from 'lucide-react'
import { useState } from 'react'

const allowedTypes = new Set(['image/jpeg', 'image/png', 'application/pdf'])
const maximumSize = 10 * 1024 * 1024

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AddTroubleshootingDialog({ open, submitting, error, onClose, onSubmit }) {
  const [form, setForm] = useState(() => ({
    action_taken: '',
    diagnosis: '',
    notes: '',
    visibility: 'INTERNAL',
    submission_key: crypto.randomUUID(),
  }))
  const [attachments, setAttachments] = useState([])
  const [fileError, setFileError] = useState('')

  if (!open) return null
  const valid = form.action_taken.trim().length > 0

  function addFiles(event) {
    const selected = Array.from(event.target.files || [])
    event.target.value = ''
    setFileError('')
    if (attachments.length + selected.length > 5) {
      setFileError('You can attach up to 5 files to one troubleshooting entry.')
      return
    }
    for (const file of selected) {
      if (!allowedTypes.has(file.type)) {
        setFileError('Only JPG, PNG, and PDF attachments are allowed.')
        return
      }
      if (file.size > maximumSize) {
        setFileError(`${file.name} exceeds the 10 MB file size limit.`)
        return
      }
    }
    setAttachments((current) => [...current, ...selected])
  }

  function submit(event) {
    event.preventDefault()
    if (!valid || fileError) return
    onSubmit(
      {
        ...form,
        action_taken: form.action_taken.trim(),
        diagnosis: form.diagnosis.trim(),
        notes: form.notes.trim(),
      },
      attachments,
    )
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="troubleshooting-title">
      <form onSubmit={submit} className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-md bg-emerald-50 text-emerald-700"><Wrench size={18} /></span><div><h2 id="troubleshooting-title" className="text-base font-semibold text-slate-900">Add troubleshooting log</h2><p className="mt-0.5 text-xs text-slate-500">Document the work performed and what you found.</p></div></div>
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close dialog"><X size={18} /></button>
        </div>

        <div className="min-h-0 space-y-5 overflow-y-auto p-5 sm:p-6">
          <label className="block"><span className="text-xs font-semibold text-slate-700">Action taken <span className="text-red-500">*</span></span><input value={form.action_taken} onChange={(event) => setForm((current) => ({ ...current, action_taken: event.target.value }))} maxLength={220} autoFocus className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" placeholder="Example: Checked network connectivity" /></label>
          <label className="block"><span className="text-xs font-semibold text-slate-700">Diagnosis / findings</span><textarea value={form.diagnosis} onChange={(event) => setForm((current) => ({ ...current, diagnosis: event.target.value }))} maxLength={5000} rows={3} className="mt-1.5 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" placeholder="Example: The network adapter was disabled." /></label>
          <label className="block"><span className="text-xs font-semibold text-slate-700">Additional notes</span><textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} maxLength={5000} rows={4} className="mt-1.5 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" placeholder="Record observations, outcomes, or recommended next steps." /></label>

          <fieldset>
            <legend className="text-xs font-semibold text-slate-700">Visibility <span className="text-red-500">*</span></legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className={`flex cursor-pointer gap-3 rounded-md border p-3 ${form.visibility === 'INTERNAL' ? 'border-emerald-500 bg-emerald-50/60' : 'border-slate-200'}`}><input type="radio" name="visibility" value="INTERNAL" checked={form.visibility === 'INTERNAL'} onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value }))} className="mt-1 accent-emerald-700" /><LockKeyhole size={17} className="mt-0.5 shrink-0 text-slate-500" /><span><span className="block text-xs font-semibold text-slate-800">Internal note</span><span className="mt-1 block text-[11px] leading-4 text-slate-500">Visible to authorized IT staff only.</span></span></label>
              <label className={`flex cursor-pointer gap-3 rounded-md border p-3 ${form.visibility === 'REQUESTER_VISIBLE' ? 'border-emerald-500 bg-emerald-50/60' : 'border-slate-200'}`}><input type="radio" name="visibility" value="REQUESTER_VISIBLE" checked={form.visibility === 'REQUESTER_VISIBLE'} onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value }))} className="mt-1 accent-emerald-700" /><Eye size={17} className="mt-0.5 shrink-0 text-emerald-700" /><span><span className="block text-xs font-semibold text-slate-800">Visible to requester</span><span className="mt-1 block text-[11px] leading-4 text-slate-500">Shares this update and its files with the requester.</span></span></label>
            </div>
            {form.visibility === 'REQUESTER_VISIBLE' && <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800">Do not include passwords, private administrator comments, security secrets, or confidential infrastructure details.</p>}
          </fieldset>

          <div>
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-slate-700">Supporting evidence</p><p className="mt-0.5 text-[11px] text-slate-400">Optional · JPG, PNG, or PDF · up to 10 MB each</p></div><label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"><FileUp size={15} /> Add files<input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" multiple onChange={addFiles} className="sr-only" /></label></div>
            {attachments.length > 0 && <div className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-200 px-3">{attachments.map((file, index) => <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-3 py-2.5"><Paperclip size={15} className="shrink-0 text-slate-400" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-700">{file.name}</p><p className="text-[10px] text-slate-400">{formatSize(file.size)}</p></div><button type="button" onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${file.name}`}><Trash2 size={14} /></button></div>)}</div>}
            {fileError && <p className="mt-2 text-xs font-medium text-red-600">{fileError}</p>}
          </div>

          {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700" role="alert">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6"><button type="button" onClick={onClose} disabled={submitting} className="h-9 rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700">Cancel</button><button type="submit" disabled={!valid || submitting || Boolean(fileError)} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{submitting ? <LoaderCircle size={15} className="animate-spin" /> : <Wrench size={15} />}{submitting ? 'Saving...' : 'Save Log'}</button></div>
      </form>
    </div>
  )
}
