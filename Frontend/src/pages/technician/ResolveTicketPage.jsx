import { AlertCircle, ArrowLeft, RefreshCw, Wrench } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ResolutionForm from '../../components/technician/resolution/ResolutionForm'
import ResolutionHistory from '../../components/technician/resolution/ResolutionHistory'
import { TicketPriorityBadge, TicketStatusBadge } from '../../components/technician/tickets/TicketStatusBadge'
import { getApiError } from '../../services/api'
import { resolutionService } from '../../services/resolutionService'
import { technicianTicketService } from '../../services/technicianTicketService'

export default function ResolveTicketPage() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState({ ticket: null, logs: [], resolutions: [], loading: true, error: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const load = useCallback(async (signal) => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const [ticket, troubleshooting, resolutions] = await Promise.all([
        technicianTicketService.detail(ticketId, { signal }),
        technicianTicketService.troubleshooting(ticketId, { signal }),
        technicianTicketService.resolutions(ticketId, { signal }),
      ])
      setState({ ticket, logs: troubleshooting.results || [], resolutions: resolutions.results || [], loading: false, error: '' })
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') setState({ ticket: null, logs: [], resolutions: [], loading: false, error: getApiError(error, 'Unable to load this ticket for resolution.') })
    }
  }, [ticketId])

  useEffect(() => {
    const controller = new AbortController()
    const task = setTimeout(() => load(controller.signal), 0)
    return () => { clearTimeout(task); controller.abort() }
  }, [load])

  async function submitResolution(payload, attachments) {
    setSubmitting(true)
    setSubmitError('')
    try {
      const result = await resolutionService.resolve(ticketId, payload, attachments)
      navigate(`/technician/tickets/${ticketId}`, {
        replace: true,
        state: { success: result.detail },
      })
    } catch (error) {
      setSubmitError(getApiError(error, 'Unable to record this resolution. Your form has been preserved.'))
      if (error.response?.status === 409) await load()
    } finally {
      setSubmitting(false)
    }
  }

  if (state.loading) return <div className="mx-auto max-w-[1200px] space-y-4"><div className="h-24 animate-pulse rounded-lg bg-slate-200" /><div className="grid gap-5 lg:grid-cols-[1fr_360px]"><div className="h-[620px] animate-pulse rounded-lg bg-slate-200" /><div className="h-96 animate-pulse rounded-lg bg-slate-200" /></div></div>
  if (state.error) return <div className="mx-auto max-w-lg rounded-lg border border-red-200 bg-white p-8 text-center"><AlertCircle size={24} className="mx-auto text-red-500" /><p className="mt-3 text-sm font-semibold text-red-700">{state.error}</p><button type="button" onClick={() => load()} className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white"><RefreshCw size={14} /> Retry</button></div>

  const { ticket, logs, resolutions } = state
  if (!ticket.can_resolve) return <div className="mx-auto max-w-lg rounded-lg border border-amber-200 bg-white p-8 text-center"><AlertCircle size={24} className="mx-auto text-amber-600" /><p className="mt-3 text-sm font-semibold text-slate-800">This ticket is not eligible for resolution.</p><p className="mt-1 text-xs leading-5 text-slate-500">Only your current In Progress assignment can be resolved.</p><button type="button" onClick={() => navigate(`/technician/tickets/${ticketId}`)} className="mt-4 h-9 rounded-md border border-slate-300 px-4 text-xs font-semibold text-slate-700">Return to ticket</button></div>

  return <div className="mx-auto max-w-[1200px] space-y-5"><button type="button" onClick={() => navigate(`/technician/tickets/${ticketId}`)} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-700"><ArrowLeft size={15} /> Back to Ticket Details</button><header className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-emerald-700">{ticket.ticket_number}</span><TicketPriorityBadge priority={ticket.priority} /><TicketStatusBadge status={ticket.status} /></div><h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">Resolve Ticket</h2><p className="mt-1.5 text-sm text-slate-600">{ticket.title}</p></header><section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"><ResolutionForm submitting={submitting} error={submitError} onSubmit={submitResolution} /><aside className="space-y-5 lg:sticky lg:top-24"><article className="rounded-lg border border-slate-200 bg-white p-5"><h3 className="text-sm font-semibold text-slate-900">Issue summary</h3><p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-slate-600">{ticket.description}</p></article><article className="rounded-lg border border-slate-200 bg-white"><div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4"><Wrench size={15} className="text-emerald-700" /><h3 className="text-sm font-semibold text-slate-900">Troubleshooting reviewed</h3></div>{!logs.length ? <p className="px-5 py-5 text-xs text-slate-500">No troubleshooting logs were recorded.</p> : <div className="divide-y divide-slate-100 px-5">{logs.slice(-5).map((log) => <div key={log.id} className="py-3"><p className="text-xs font-semibold text-slate-700">{log.action_taken}</p>{log.diagnosis && <p className="mt-1 text-[11px] leading-5 text-slate-500">{log.diagnosis}</p>}</div>)}</div>}</article><ResolutionHistory resolutions={resolutions} /></aside></section></div>
}
