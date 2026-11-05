import { AlertCircle, ArrowLeft, CalendarDays, CheckCircle2, Clock3, MapPin, PlayCircle, RefreshCw, UserRound } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import StartWorkDialog from '../../components/technician/tickets/StartWorkDialog'
import { TicketPriorityBadge, TicketStatusBadge } from '../../components/technician/tickets/TicketStatusBadge'
import { getApiError } from '../../services/api'
import { technicianTicketService } from '../../services/technicianTicketService'

const formatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

function InfoItem({ icon: Icon, label, value }) {
  return <div className="flex gap-3 border-b border-slate-100 py-3 last:border-0"><Icon size={16} className="mt-0.5 shrink-0 text-slate-400" /><div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-medium text-slate-700">{value || 'Not specified'}</p></div></div>
}

export default function TechnicianTicketDetails() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')
  const [toast, setToast] = useState('')

  const loadTicket = useCallback(async (signal) => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      setState({ data: await technicianTicketService.detail(ticketId, { signal }), loading: false, error: '' })
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') setState({ data: null, loading: false, error: getApiError(error, 'Unable to load this ticket.') })
    }
  }, [ticketId])

  useEffect(() => {
    const controller = new AbortController()
    const task = setTimeout(() => loadTicket(controller.signal), 0)
    return () => {
      clearTimeout(task)
      controller.abort()
    }
  }, [loadTicket])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(timeout)
  }, [toast])

  async function startWork() {
    setStarting(true)
    setStartError('')
    try {
      const result = await technicianTicketService.startWork(ticketId)
      setState({ data: result.ticket, loading: false, error: '' })
      setDialogOpen(false)
      setToast(result.detail)
    } catch (error) {
      setStartError(getApiError(error, 'Unable to start work on this ticket.'))
      if (error.response?.status === 409) await loadTicket()
    } finally {
      setStarting(false)
    }
  }

  if (state.loading) return <div className="mx-auto max-w-[1200px] space-y-4"><div className="h-24 animate-pulse rounded-lg bg-slate-200" /><div className="h-96 animate-pulse rounded-lg bg-slate-200" /></div>
  if (state.error) return <div className="mx-auto max-w-lg rounded-lg border border-red-200 bg-white p-8 text-center"><AlertCircle size={24} className="mx-auto text-red-500" /><p className="mt-3 text-sm font-semibold text-red-700">{state.error}</p><div className="mt-5 flex justify-center gap-2"><button type="button" onClick={() => navigate('/technician/tickets')} className="h-9 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700">Back to queue</button><button type="button" onClick={() => loadTicket()} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#075b35] px-3 text-xs font-semibold text-white"><RefreshCw size={14} /> Retry</button></div></div>

  const ticket = state.data
  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <button type="button" onClick={() => navigate('/technician/tickets')} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-700"><ArrowLeft size={15} /> Back to My Assigned Tickets</button>
      <section className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:p-6 lg:flex-row lg:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-emerald-700">{ticket.ticket_number}</span><TicketPriorityBadge priority={ticket.priority} /><TicketStatusBadge status={ticket.status} /></div><h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900">{ticket.title}</h2><p className="mt-1 text-xs text-slate-500">Assigned {ticket.date_assigned ? formatter.format(new Date(ticket.date_assigned)) : 'date not recorded'}</p></div>{ticket.can_start_work && <button type="button" onClick={() => setDialogOpen(true)} className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white hover:bg-[#06492c]"><PlayCircle size={16} /> Start Work</button>}</section>
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]"><article className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6"><h3 className="text-base font-semibold text-slate-900">Issue description</h3><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{ticket.description}</p></article><article className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6"><h3 className="text-base font-semibold text-slate-900">Ticket information</h3><div className="mt-3"><InfoItem icon={UserRound} label="Requester" value={`${ticket.requester.name}${ticket.requester.department ? ` — ${ticket.requester.department}` : ''}`} /><InfoItem icon={MapPin} label="Location" value={ticket.location} /><InfoItem icon={Clock3} label="Category" value={ticket.category?.name || 'Uncategorized'} /><InfoItem icon={CalendarDays} label="Submitted" value={formatter.format(new Date(ticket.created_at))} /><InfoItem icon={CalendarDays} label="Resolution due" value={ticket.resolution_due_at ? formatter.format(new Date(ticket.resolution_due_at)) : 'No deadline configured'} /></div></article></section>
      <StartWorkDialog ticket={dialogOpen ? ticket : null} submitting={starting} error={startError} onClose={() => { if (!starting) setDialogOpen(false) }} onConfirm={startWork} />
      {toast && <div className="fixed bottom-5 right-5 z-[90] flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg" role="status"><CheckCircle2 size={17} /> {toast}</div>}
    </div>
  )
}
