import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  MapPin,
  RotateCcw,
  UserRound,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import TicketBadge from '../../components/admin/tickets/TicketBadge'
import {
  priorityLabels,
  priorityTone,
  statusLabels,
  statusTone,
  urgencyLabels,
} from '../../components/admin/tickets/constants'
import { getApiError } from '../../services/api'
import { userDashboardService } from '../../services/userDashboardService'
import { userTicketService } from '../../services/userTicketService'

const formatter = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatDate(value) {
  return value ? formatter.format(new Date(value)) : 'Not recorded'
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3 border-b border-slate-100 py-3 last:border-0">
      <Icon size={17} className="mt-0.5 shrink-0 text-slate-400" />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-medium text-slate-700">{value || 'Not specified'}</p>
      </div>
    </div>
  )
}

export default function UserTicketDetailsPage() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const [downloadError, setDownloadError] = useState('')
  const [action, setAction] = useState({ loading: '', error: '' })
  const [showReopenForm, setShowReopenForm] = useState(false)
  const [reopenReason, setReopenReason] = useState('')

  const load = useCallback(
    async (signal) => {
      setState((current) => ({ ...current, loading: true, error: '' }))
      try {
        setState({
          data: await userDashboardService.ticket(ticketId, { signal }),
          loading: false,
          error: '',
        })
      } catch (error) {
        if (error.code !== 'ERR_CANCELED') {
          setState({
            data: null,
            loading: false,
            error: getApiError(error, 'Unable to load this ticket.'),
          })
        }
      }
    },
    [ticketId],
  )

  useEffect(() => {
    const controller = new AbortController()
    const task = setTimeout(() => load(controller.signal), 0)
    return () => {
      clearTimeout(task)
      controller.abort()
    }
  }, [load])

  async function downloadAttachment(attachment) {
    setDownloadError('')
    try {
      const blob = await userTicketService.downloadAttachment(ticketId, attachment.id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = attachment.original_filename
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setDownloadError(getApiError(error, 'Unable to download this attachment.'))
    }
  }

  async function confirmResolution() {
    setAction({ loading: 'confirm', error: '' })
    try {
      const data = await userTicketService.confirmResolution(ticketId)
      setState({ data, loading: false, error: '' })
    } catch (error) {
      setAction({
        loading: '',
        error: getApiError(error, 'Unable to confirm this resolution.'),
      })
      return
    }
    setAction({ loading: '', error: '' })
  }

  async function requestReopen(event) {
    event.preventDefault()
    if (reopenReason.trim().length < 10) {
      setAction({ loading: '', error: 'Explain what is still not working using at least 10 characters.' })
      return
    }
    setAction({ loading: 'reopen', error: '' })
    try {
      const data = await userTicketService.requestReopen(ticketId, reopenReason.trim())
      setState({ data, loading: false, error: '' })
      setShowReopenForm(false)
      setReopenReason('')
    } catch (error) {
      setAction({
        loading: '',
        error: getApiError(error, 'Unable to submit the reopening request.'),
      })
      return
    }
    setAction({ loading: '', error: '' })
  }

  if (state.loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="h-32 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-80 animate-pulse rounded-lg bg-slate-200" />
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-red-200 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-red-700">{state.error}</p>
        <button type="button" onClick={() => navigate('/user/tickets')} className="mt-4 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold">
          Back to My Tickets
        </button>
      </div>
    )
  }

  const ticket = state.data
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <button type="button" onClick={() => navigate('/user/tickets')} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-700">
        <ArrowLeft size={15} /> Back to My Tickets
      </button>

      <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">{ticket.ticket_number}</span>
          <TicketBadge className={priorityTone(ticket.priority)}>{priorityLabels[ticket.priority]}</TicketBadge>
          <TicketBadge className={statusTone(ticket.status)}>{statusLabels[ticket.status]}</TicketBadge>
        </div>
        <h2 className="mt-3 text-xl font-bold text-slate-900 sm:text-2xl">{ticket.title}</h2>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{ticket.description}</p>
      </section>

      {ticket.resolution && (
        <section className="rounded-lg border border-emerald-200 bg-white p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 size={18} /></span>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Resolution review</h3>
              <p className="mt-1 text-xs text-slate-500">Review the technician's solution and let the helpdesk know whether the issue is fixed.</p>
            </div>
          </div>
          <div className="mt-5 rounded-md bg-slate-50 p-4">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{ticket.resolution.summary}</p>
            <p className="mt-3 text-[11px] text-slate-500">Recorded by {ticket.resolution.resolved_by} on {formatDate(ticket.resolution.resolved_at)}</p>
          </div>

          {ticket.resolution_response === 'PENDING' && (
            <div className="mt-5">
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Awaiting Your Confirmation</p>
                <p className="mt-1 text-xs leading-5 text-amber-700">Confirming will close the ticket. If the issue continues, request reopening and explain what is still happening.</p>
              </div>
              {action.error && <p className="mt-3 flex items-center gap-2 text-xs font-medium text-red-600"><AlertCircle size={14} /> {action.error}</p>}
              {!showReopenForm ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={confirmResolution} disabled={Boolean(action.loading)} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white hover:bg-[#06492c] disabled:opacity-60"><CheckCircle2 size={15} /> {action.loading === 'confirm' ? 'Confirming...' : 'Confirm Resolution'}</button>
                  <button type="button" onClick={() => { setShowReopenForm(true); setAction({ loading: '', error: '' }) }} disabled={Boolean(action.loading)} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"><RotateCcw size={15} /> Request Reopening</button>
                </div>
              ) : (
                <form onSubmit={requestReopen} className="mt-4 rounded-md border border-slate-200 p-4">
                  <label htmlFor="reopen-reason" className="text-xs font-semibold text-slate-700">What is still not working?</label>
                  <textarea id="reopen-reason" value={reopenReason} onChange={(event) => setReopenReason(event.target.value)} maxLength={1000} rows={4} placeholder="Describe what happened after trying the resolution." className="mt-2 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="submit" disabled={action.loading === 'reopen'} className="rounded-md bg-[#075b35] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">{action.loading === 'reopen' ? 'Submitting...' : 'Submit Request'}</button>
                    <button type="button" onClick={() => { setShowReopenForm(false); setAction({ loading: '', error: '' }) }} className="rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {ticket.resolution_response === 'CONFIRMED' && (
            <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3"><p className="text-xs font-semibold text-emerald-800">Resolution confirmed on {formatDate(ticket.requester_confirmed_at)}. This ticket is closed.</p></div>
          )}
          {ticket.resolution_response === 'REOPEN_REQUESTED' && (
            <div className="mt-5 rounded-md border border-orange-200 bg-orange-50 px-4 py-3"><p className="text-xs font-semibold text-orange-800">Reopening requested on {formatDate(ticket.reopen_requested_at)}</p><p className="mt-1 text-xs leading-5 text-orange-700">{ticket.reopen_reason}</p></div>
          )}
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
          <h3 className="text-base font-semibold text-slate-900">Request information</h3>
          <div className="mt-3"><Info icon={Clock3} label="Category" value={ticket.category?.name || 'Uncategorized'} /><Info icon={Clock3} label="Reported urgency" value={urgencyLabels[ticket.reported_urgency]} /><Info icon={MapPin} label="Location" value={ticket.location} /><Info icon={CalendarDays} label="Submitted" value={formatDate(ticket.created_at)} /><Info icon={CalendarDays} label="Last updated" value={formatDate(ticket.updated_at)} /></div>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
          <h3 className="text-base font-semibold text-slate-900">Support progress</h3>
          <div className="mt-3"><Info icon={UserRound} label="Assigned technician" value={ticket.assigned_technician?.name || 'Not Yet Assigned'} /><Info icon={UserRound} label="Specialization" value={ticket.assigned_technician?.specialization} /><Info icon={Clock3} label="Resolved" value={formatDate(ticket.resolved_at)} /><Info icon={Clock3} label="Closed" value={formatDate(ticket.closed_at)} /></div>
        </article>
      </section>

      {ticket.attachments?.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
          <h3 className="text-base font-semibold text-slate-900">Attachments</h3>
          {downloadError && <p className="mt-3 text-xs font-medium text-red-600">{downloadError}</p>}
          <ul className="mt-3 divide-y divide-slate-100">
            {ticket.attachments.map((attachment) => (
              <li key={attachment.id} className="flex items-center gap-3 py-3"><FileText size={17} className="shrink-0 text-emerald-700" /><span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{attachment.original_filename}</span><button type="button" onClick={() => downloadAttachment(attachment)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Download size={14} /> Download</button></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
