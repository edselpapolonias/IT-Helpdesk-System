import { AlertTriangle, ClipboardList, LoaderCircle, Power, PowerOff, X } from 'lucide-react'
import { useState } from 'react'
import { getApiError } from '../../../services/api'
import { technicianService } from '../../../services/technicianService'

export default function TechnicianStatusDialog({ technician, onClose, onChanged, onViewTickets }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [activeTicketCount, setActiveTicketCount] = useState(null)
  if (!technician) return null
  const deactivating = technician.is_active
  async function confirm() {
    setIsSubmitting(true); setError(''); setActiveTicketCount(null)
    try {
      const result = deactivating ? await technicianService.deactivate(technician.id) : await technicianService.activate(technician.id)
      onChanged(result.technician, deactivating ? 'deactivated' : 'activated')
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to update this technician.'))
      setActiveTicketCount(requestError.response?.data?.active_ticket_count ?? null)
    } finally { setIsSubmitting(false) }
  }
  return <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/45 p-4" role="alertdialog" aria-modal="true"><div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><span className={`grid h-11 w-11 place-items-center rounded-full ${deactivating ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>{deactivating ? <PowerOff size={21} /> : <Power size={21} />}</span><button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close dialog"><X size={18} /></button></div><h2 className="mt-4 text-lg font-semibold text-slate-900">{deactivating ? 'Deactivate technician?' : 'Activate technician?'}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{deactivating ? 'Deactivation is allowed only when no active tickets remain assigned. Historical work will be preserved.' : 'Reactivation restores eligibility for future assignments but does not restore old assignments.'}</p><div className="mt-4 rounded-md bg-slate-50 px-4 py-3"><p className="text-sm font-semibold text-slate-800">{technician.name}</p><p className="mt-0.5 text-xs text-slate-500">{technician.email}</p><p className="mt-2 text-xs font-medium text-slate-600">Current active tickets: {technician.active_assigned_tickets}</p></div>{error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700"><div className="flex gap-2"><AlertTriangle size={16} className="shrink-0" /><span>{error}{activeTicketCount !== null && ` (${activeTicketCount} affected ticket${activeTicketCount === 1 ? '' : 's'})`}</span></div>{activeTicketCount > 0 && <button type="button" onClick={() => onViewTickets(technician)} className="mt-3 inline-flex items-center gap-2 font-semibold underline"><ClipboardList size={14} /> View assigned tickets</button>}</div>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="h-9 rounded-md border border-slate-200 px-4 text-xs font-semibold text-slate-700">Cancel</button><button type="button" onClick={confirm} disabled={isSubmitting} className={`inline-flex h-9 items-center gap-2 rounded-md px-4 text-xs font-semibold text-white disabled:opacity-60 ${deactivating ? 'bg-red-600' : 'bg-emerald-700'}`}>{isSubmitting && <LoaderCircle size={14} className="animate-spin" />}{deactivating ? 'Deactivate' : 'Activate'}</button></div></div></div>
}
