import { ArrowLeft, Building2, Edit3, Mail, Phone, UserRound, UserRoundCog, Wrench } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import TechnicianAssignmentModal from '../../components/admin/assignments/TechnicianAssignmentModal'
import TicketActivityTimeline from '../../components/admin/tickets/TicketActivityTimeline'
import TicketAttachments from '../../components/admin/tickets/TicketAttachments'
import TicketPriorityModal from '../../components/admin/tickets/TicketPriorityModal'
import TicketResolutionDetails from '../../components/admin/tickets/TicketResolutionDetails'
import TroubleshootingHistory from '../../components/admin/tickets/TroubleshootingHistory'
import TicketBadge from '../../components/admin/tickets/TicketBadge'
import { priorityLabels, priorityTone, statusLabels, statusTone } from '../../components/admin/tickets/constants'
import { getApiError } from '../../services/api'
import { ticketService } from '../../services/ticketService'

const dateFormatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
function formatDate(value) { return value ? dateFormatter.format(new Date(value)) : 'Not recorded' }
function Detail({ label, value, children }) { return <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p><div className="mt-1.5 text-sm font-medium text-slate-700">{children || value || 'Not specified'}</div></div> }
function ContactRow({ icon: Icon, label, value }) { return <div className="flex gap-3 border-b border-slate-100 py-3 last:border-0"><Icon size={17} className="mt-0.5 shrink-0 text-slate-400" /><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-medium text-slate-700">{value || 'Not specified'}</p></div></div> }

export default function TicketDetailsPage() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const [priorityOpen, setPriorityOpen] = useState(false)
  const [assignmentOpen, setAssignmentOpen] = useState(false)
  const [toast, setToast] = useState('')

  const load = useCallback(async (signal) => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const [ticket, history, troubleshooting, resolutions, attachments] = await Promise.all([
        ticketService.get(ticketId, { signal }), ticketService.history(ticketId, { signal }), ticketService.troubleshooting(ticketId, { signal }), ticketService.resolutions(ticketId, { signal }), ticketService.attachments(ticketId, { signal }),
      ])
      setState({ data: { ticket, events: history.results || [], logs: troubleshooting.results || [], resolutions: resolutions.results || [], attachments: attachments.results || [] }, loading: false, error: '' })
    } catch (error) { if (error.code === 'ERR_CANCELED') return; setState({ data: null, loading: false, error: getApiError(error, 'Unable to load this ticket.') }) }
  }, [ticketId])

  useEffect(() => { const controller = new AbortController(); const task = setTimeout(() => load(controller.signal), 0); return () => { clearTimeout(task); controller.abort() } }, [load])
  useEffect(() => { if (!toast) return undefined; const timeout = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timeout) }, [toast])
  useEffect(() => { if (!state.loading && location.hash === '#activity') setTimeout(() => document.getElementById('activity')?.scrollIntoView({ behavior: 'smooth' }), 50) }, [location.hash, state.loading])

  if (state.loading) return <div className="mx-auto max-w-[1450px] space-y-4"><div className="h-36 animate-pulse rounded-lg bg-slate-200" /><div className="grid gap-4 lg:grid-cols-2"><div className="h-80 animate-pulse rounded-lg bg-slate-200" /><div className="h-80 animate-pulse rounded-lg bg-slate-200" /></div></div>
  if (state.error) return <div className="mx-auto max-w-xl rounded-lg border border-red-200 bg-white p-8 text-center"><p className="text-sm font-semibold text-red-700">{state.error}</p><button type="button" onClick={() => navigate('/it-admin/tickets')} className="mt-4 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold">Back to tickets</button></div>

  const { ticket, events, logs, resolutions, attachments } = state.data
  return <div className="mx-auto max-w-[1450px] space-y-6">
    <button type="button" onClick={() => navigate('/it-admin/tickets')} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-700"><ArrowLeft size={15} /> Back to Ticket Management</button>
    <section className="flex flex-col justify-between gap-5 rounded-lg border border-slate-200 bg-white p-5 sm:p-6 lg:flex-row lg:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold uppercase tracking-wider text-emerald-700">{ticket.ticket_number}</span><TicketBadge className={priorityTone(ticket.priority)}>{priorityLabels[ticket.priority]}</TicketBadge><TicketBadge className={statusTone(ticket.status)}>{statusLabels[ticket.status]}</TicketBadge></div><h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">{ticket.title}</h2><p className="mt-2 text-xs text-slate-500">Submitted {formatDate(ticket.created_at)} · Last updated {formatDate(ticket.updated_at)}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setPriorityOpen(true)} className="inline-flex h-9 w-fit shrink-0 items-center gap-2 rounded-md border border-slate-200 px-4 text-xs font-semibold text-slate-700"><Edit3 size={15} /> Change priority</button>{((!ticket.assigned_technician && ticket.status === 'OPEN') || (ticket.assigned_technician && ticket.assignment.history_available && ['ASSIGNED', 'IN_PROGRESS'].includes(ticket.status))) && <button type="button" onClick={() => setAssignmentOpen(true)} className="inline-flex h-9 w-fit shrink-0 items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white"><UserRoundCog size={15} /> {ticket.assigned_technician ? 'Reassign technician' : 'Assign technician'}</button>}</div></section>

    <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
      <article className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6"><h3 className="text-base font-semibold text-slate-900">Ticket overview</h3><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{ticket.description}</p><div className="mt-6 grid gap-x-6 gap-y-5 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-3"><Detail label="Category" value={ticket.category.name} /><Detail label="Location" value={ticket.location} /><Detail label="Reported urgency" value={ticket.reported_urgency ? priorityLabels[ticket.reported_urgency] || ticket.reported_urgency : 'Not specified'} /><Detail label="Final priority"><TicketBadge className={priorityTone(ticket.priority)}>{priorityLabels[ticket.priority]}</TicketBadge></Detail><Detail label="Current status"><TicketBadge className={statusTone(ticket.status)}>{statusLabels[ticket.status]}</TicketBadge></Detail><Detail label="Created" value={formatDate(ticket.created_at)} /><Detail label="Last updated" value={formatDate(ticket.updated_at)} /><Detail label="Resolved" value={formatDate(ticket.resolved_at)} /><Detail label="Closed" value={formatDate(ticket.closed_at)} /></div></article>
      <div className="space-y-6"><article className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6"><h3 className="text-base font-semibold text-slate-900">Requester details</h3><div className="mt-3"><ContactRow icon={UserRound} label="Full name" value={ticket.requester.name} /><ContactRow icon={Mail} label="Email" value={ticket.requester.email} /><ContactRow icon={Building2} label="Department" value={ticket.requester.department} /><ContactRow icon={Phone} label="Contact number" value={ticket.requester.contact_number} /></div></article><article className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6"><h3 className="text-base font-semibold text-slate-900">Assignment information</h3>{ticket.assigned_technician ? <div className="mt-4 space-y-4"><Detail label="Assigned technician" value={ticket.assigned_technician.name} /><Detail label="Email" value={ticket.assigned_technician.email} /><Detail label="Specialization" value={ticket.assigned_technician.specialization} /><Detail label="Assignment date" value={ticket.assignment.history_available ? formatDate(ticket.assignment.assigned_at) : 'Not recorded'} /><Detail label="Assigned by" value={ticket.assignment.assigned_by?.name || 'Not recorded'} />{ticket.assignment.assignment_notes && <Detail label="Assignment notes" value={ticket.assignment.assignment_notes} />}</div> : <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-800">Unassigned</p><p className="mt-1 text-xs leading-5 text-amber-700">No technician is currently assigned to this request.</p></div>}{ticket.assigned_technician && !ticket.assignment.history_available && <p className="mt-4 text-[11px] leading-5 text-slate-400">This legacy assignment predates assignment history, so its date and assigning administrator were not recorded.</p>}</article></div>
    </section>

    <section className="grid gap-6 xl:grid-cols-2"><TicketAttachments ticketId={ticket.id} attachments={attachments} /><TicketResolutionDetails resolutions={resolutions} /></section>
    <TroubleshootingHistory logs={logs} />
    <TicketActivityTimeline events={events} loading={false} />
    <div className="rounded-md border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500"><div className="flex gap-2"><Wrench size={15} className="mt-0.5 shrink-0 text-emerald-700" /><p>Status progression follows the controlled workflow Open → Assigned → In Progress → Resolved → Closed. Assignment and technician-authored work remain managed by their respective workflows.</p></div></div>
    <TicketPriorityModal ticket={priorityOpen ? ticket : null} onClose={() => setPriorityOpen(false)} onSaved={async (updated) => { setPriorityOpen(false); setToast(`${updated.ticket_number} priority updated successfully.`); await load() }} />
    <TechnicianAssignmentModal ticket={assignmentOpen ? ticket : null} onClose={() => setAssignmentOpen(false)} onSaved={async (result, action) => { setAssignmentOpen(false); setToast(`${result.ticket.ticket_number} ${action} successfully.`); await load() }} />
    {toast && <div className="fixed bottom-5 right-5 z-[90] rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg" role="status">{toast}</div>}
  </div>
}
