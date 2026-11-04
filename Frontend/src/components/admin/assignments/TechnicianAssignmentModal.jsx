import { LoaderCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getApiError } from '../../../services/api'
import { assignmentService } from '../../../services/assignmentService'
import TicketBadge from '../tickets/TicketBadge'
import { priorityLabels, priorityTone } from '../tickets/constants'
import EligibleTechnicianList from './EligibleTechnicianList'

const dateFormatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

function AssignmentForm({ ticket, onClose, onSaved }) {
  const reassigning = Boolean(ticket.assigned_technician)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300); return () => clearTimeout(timeout) }, [search])
  useEffect(() => { const controller = new AbortController(); const task = setTimeout(async () => { setLoading(true); try { const data = await assignmentService.eligibleTechnicians(ticket.id, debouncedSearch, { signal: controller.signal }); setTechnicians(data.results || []) } catch (requestError) { if (requestError.code !== 'ERR_CANCELED') setError(getApiError(requestError, 'Unable to load eligible technicians.')) } finally { if (!controller.signal.aborted) setLoading(false) } }, 0); return () => { clearTimeout(task); controller.abort() } }, [ticket.id, debouncedSearch])

  async function submit(event) {
    event.preventDefault()
    if (!selectedId) { setError('Select a technician before continuing.'); return }
    if (reassigning && !reason.trim()) { setError('A reassignment reason is required.'); return }
    setSaving(true); setError('')
    const payload = { ticket_id: ticket.id, technician_id: selectedId, assignment_notes: notes.trim(), ...(reassigning ? { reassignment_reason: reason.trim() } : {}) }
    try { const result = reassigning ? await assignmentService.reassign(payload) : await assignmentService.assign(payload); await onSaved(result, reassigning ? 'reassigned' : 'assigned') } catch (requestError) { setError(getApiError(requestError, reassigning ? 'Unable to reassign this ticket.' : 'Unable to assign this ticket.')) } finally { setSaving(false) }
  }

  return <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="assignment-title"><form onSubmit={submit} className="my-4 w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-xl"><div className="flex items-start justify-between border-b border-slate-200 p-5"><div><h3 id="assignment-title" className="text-base font-semibold text-slate-900">{reassigning ? 'Reassign Technician' : 'Assign Technician'}</h3><p className="mt-1 text-xs text-slate-500">{ticket.ticket_number}</p></div><button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button></div><div className="space-y-5 p-5"><section className="rounded-md border border-slate-200 bg-slate-50/70 p-4"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-slate-900">{ticket.title}</p><TicketBadge className={priorityTone(ticket.priority)}>{priorityLabels[ticket.priority]}</TicketBadge></div><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{ticket.description || 'No description available.'}</p><p className="mt-2 text-[11px] text-slate-400">{ticket.category?.name || 'Uncategorized'} · Submitted {dateFormatter.format(new Date(ticket.created_at))}</p>{reassigning && <div className="mt-3 border-t border-slate-200 pt-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Current technician</p><p className="mt-1 text-xs font-semibold text-slate-700">{ticket.assigned_technician.name}</p><p className="mt-0.5 text-[11px] text-slate-500">Assigned {ticket.assignment?.assigned_at ? dateFormatter.format(new Date(ticket.assignment.assigned_at)) : 'date not recorded'}</p></div>}</section><div><p className="mb-2 text-xs font-semibold text-slate-700">Select technician</p><EligibleTechnicianList technicians={technicians} loading={loading} search={search} onSearch={setSearch} selectedId={selectedId} currentId={ticket.assigned_technician?.id} onSelect={setSelectedId} /></div>{reassigning && <label className="block text-xs font-semibold text-slate-700">Reassignment reason <span className="text-red-600">*</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={2000} placeholder="Explain why this ticket is being reassigned" className="mt-1.5 w-full resize-none rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>}<label className="block text-xs font-semibold text-slate-700">Assignment notes <span className="font-normal text-slate-400">(optional)</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={2000} placeholder="Add instructions or context for the technician" className="mt-1.5 w-full resize-none rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>{error && <p className="rounded-md bg-red-50 p-3 text-xs font-medium text-red-700">{error}</p>}</div><div className="flex justify-end gap-2 border-t border-slate-200 p-4"><button type="button" onClick={onClose} className="h-9 rounded-md border border-slate-200 px-4 text-xs font-semibold text-slate-700">Cancel</button><button type="submit" disabled={saving || !selectedId || (reassigning && !reason.trim())} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white disabled:opacity-50">{saving && <LoaderCircle size={15} className="animate-spin" />} {reassigning ? 'Confirm Reassignment' : 'Confirm Assignment'}</button></div></form></div>
}

export default function TechnicianAssignmentModal({ ticket, onClose, onSaved }) {
  if (!ticket) return null
  return <AssignmentForm key={`${ticket.id}-${ticket.assigned_technician?.id || 'unassigned'}`} ticket={ticket} onClose={onClose} onSaved={onSaved} />
}
