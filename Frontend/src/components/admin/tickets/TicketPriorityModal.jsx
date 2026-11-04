import { LoaderCircle, X } from 'lucide-react'
import { useState } from 'react'
import { getApiError } from '../../../services/api'
import { ticketService } from '../../../services/ticketService'
import TicketBadge from './TicketBadge'
import { priorities, priorityLabels, priorityTone } from './constants'

function TicketPriorityForm({ ticket, onClose, onSaved }) {
  const [priority, setPriority] = useState(ticket.priority)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (priority === ticket.priority) { setError('Select a different priority.'); return }
    setSaving(true); setError('')
    try { const updated = await ticketService.updatePriority(ticket.id, { priority, reason: reason.trim() }); await onSaved(updated) } catch (requestError) { setError(getApiError(requestError, requestError.response?.data?.priority?.[0] || 'Unable to update priority.')) } finally { setSaving(false) }
  }

  return <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="priority-title"><form onSubmit={submit} className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-xl"><div className="flex items-start justify-between border-b border-slate-200 p-5"><div><h3 id="priority-title" className="text-base font-semibold text-slate-900">Change ticket priority</h3><p className="mt-1 text-xs text-slate-500">{ticket.ticket_number}</p></div><button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button></div><div className="space-y-4 p-5"><div><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Current priority</p><div className="mt-2"><TicketBadge className={priorityTone(ticket.priority)}>{priorityLabels[ticket.priority]}</TicketBadge></div></div><label className="block text-xs font-semibold text-slate-700">New priority<select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">{priorities.map((item) => <option key={item} value={item}>{priorityLabels[item]}</option>)}</select></label><label className="block text-xs font-semibold text-slate-700">Reason <span className="font-normal text-slate-400">(optional)</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} placeholder="Briefly explain why the priority changed" className="mt-1.5 w-full resize-none rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>{error && <p className="rounded-md bg-red-50 p-3 text-xs font-medium text-red-700">{error}</p>}</div><div className="flex justify-end gap-2 border-t border-slate-200 p-4"><button type="button" onClick={onClose} className="h-9 rounded-md border border-slate-200 px-4 text-xs font-semibold text-slate-700">Cancel</button><button type="submit" disabled={saving || priority === ticket.priority} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white disabled:opacity-50">{saving && <LoaderCircle size={15} className="animate-spin" />} Save priority</button></div></form></div>
}

export default function TicketPriorityModal({ ticket, onClose, onSaved }) {
  if (!ticket) return null
  return <TicketPriorityForm key={`${ticket.id}-${ticket.priority}`} ticket={ticket} onClose={onClose} onSaved={onSaved} />
}
