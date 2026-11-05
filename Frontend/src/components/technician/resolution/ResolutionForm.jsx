import { CheckCircle2, FileUp, LoaderCircle, Paperclip, Trash2 } from 'lucide-react'
import { useState } from 'react'

const allowedTypes = new Set(['image/jpeg', 'image/png', 'application/pdf'])
const maximumSize = 10 * 1024 * 1024

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ResolutionForm({ submitting, error, onSubmit }) {
  const [form, setForm] = useState(() => ({
    resolution_summary: '',
    root_cause: '',
    actions_performed: '',
    notes: '',
    confirmed_accurate: false,
    submission_key: crypto.randomUUID(),
  }))
  const [attachments, setAttachments] = useState([])
  const [fileError, setFileError] = useState('')

  function addFiles(event) {
    const selected = Array.from(event.target.files || [])
    event.target.value = ''
    setFileError('')

    if (attachments.length + selected.length > 5) {
      setFileError('You can attach up to 5 files to one resolution.')
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

  const valid = form.resolution_summary.trim() && form.actions_performed.trim() && form.confirmed_accurate && !fileError

  function submit(event) {
    event.preventDefault()
    if (!valid) return
    onSubmit({
      ...form,
      resolution_summary: form.resolution_summary.trim(),
      root_cause: form.root_cause.trim(),
      actions_performed: form.actions_performed.trim(),
      notes: form.notes.trim(),
    }, attachments)
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <h3 className="text-base font-semibold text-slate-900">Resolution record</h3>
        <p className="mt-1 text-xs text-slate-500">Document the final solution before moving this ticket to Resolved.</p>
      </div>
      <div className="space-y-5 p-5 sm:p-6">
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Resolution summary <span className="text-red-500">*</span></span>
          <textarea value={form.resolution_summary} onChange={(event) => setForm((current) => ({ ...current, resolution_summary: event.target.value }))} maxLength={5000} rows={4} autoFocus className="mt-1.5 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" placeholder="Describe how the issue was fixed." />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Root cause</span>
          <textarea value={form.root_cause} onChange={(event) => setForm((current) => ({ ...current, root_cause: event.target.value }))} maxLength={5000} rows={3} className="mt-1.5 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" placeholder="What caused the issue?" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Actions performed <span className="text-red-500">*</span></span>
          <textarea value={form.actions_performed} onChange={(event) => setForm((current) => ({ ...current, actions_performed: event.target.value }))} maxLength={5000} rows={4} className="mt-1.5 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" placeholder="List the corrective actions and final verification performed." />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Resolution notes</span>
          <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} maxLength={5000} rows={3} className="mt-1.5 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" placeholder="Optional technical information or follow-up guidance." />
        </label>

        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-700">Supporting attachments</p>
              <p className="mt-0.5 text-[11px] text-slate-400">Optional internal evidence · JPG, PNG, or PDF · up to 10 MB each</p>
            </div>
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              <FileUp size={15} /> Add files
              <input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" multiple onChange={addFiles} className="sr-only" />
            </label>
          </div>
          {attachments.length > 0 && (
            <div className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-200 px-3">
              {attachments.map((file, index) => (
                <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-3 py-2.5">
                  <Paperclip size={15} className="shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-700">{file.name}</p><p className="text-[10px] text-slate-400">{formatSize(file.size)}</p></div>
                  <button type="button" onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${file.name}`}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
          {fileError && <p className="mt-2 text-xs font-medium text-red-600">{fileError}</p>}
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
          <input type="checkbox" checked={form.confirmed_accurate} onChange={(event) => setForm((current) => ({ ...current, confirmed_accurate: event.target.checked }))} className="mt-1 accent-emerald-700" />
          <span className="text-xs leading-5 text-slate-600">I confirm that I have completed the troubleshooting process and recorded the resolution accurately.</span>
        </label>
        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700" role="alert">{error}</p>}
      </div>
      <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
        <button type="submit" disabled={!valid || submitting} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#075b35] px-5 text-xs font-semibold text-white hover:bg-[#06492c] disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          {submitting ? 'Recording Resolution...' : 'Mark as Resolved'}
        </button>
      </div>
    </form>
  )
}
