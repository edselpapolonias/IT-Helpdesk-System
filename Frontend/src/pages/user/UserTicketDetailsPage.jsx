import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Flag,
  Folder,
  MapPin,
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
import AttachmentPreviewDialog from '../../components/user/tickets/AttachmentPreviewDialog'
import ConfirmResolutionDialog from '../../components/user/tickets/ConfirmResolutionDialog'
import PublicTechnicianUpdates from '../../components/user/tickets/PublicTechnicianUpdates'
import ReopenTicketModal from '../../components/user/tickets/ReopenTicketModal'
import ResolutionCard from '../../components/user/tickets/ResolutionCard'
import TicketAttachmentList from '../../components/user/tickets/TicketAttachmentList'
import TicketProgressTimeline from '../../components/user/tickets/TicketProgressTimeline'
import { getApiError } from '../../services/api'
import { userTicketService } from '../../services/userTicketService'

const formatter = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatDate(value) {
  return value ? formatter.format(new Date(value)) : 'Not recorded'
}

function Info({ icon: Icon, label, value, children }) {
  return (
    <div className="flex gap-3 border-b border-slate-100 py-3 last:border-0">
      <Icon size={17} className="mt-0.5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <div className="mt-1 text-sm font-medium text-slate-700">{children || value || 'Not specified'}</div>
      </div>
    </div>
  )
}

export default function UserTicketDetailsPage() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState({ ticket: null, events: [], loading: true, error: '' })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [action, setAction] = useState({ loading: '', error: '' })
  const [attachmentError, setAttachmentError] = useState('')
  const [preview, setPreview] = useState(null)
  const [toast, setToast] = useState('')

  const load = useCallback(
    async (signal) => {
      setState((current) => ({ ...current, loading: true, error: '' }))
      try {
        const [ticket, activity] = await Promise.all([
          userTicketService.get(ticketId, { signal }),
          userTicketService.activity(ticketId, { signal }),
        ])
        setState({
          ticket,
          events: activity.results || [],
          loading: false,
          error: '',
        })
      } catch (error) {
        if (error.code !== 'ERR_CANCELED') {
          setState({
            ticket: null,
            events: [],
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

  useEffect(() => {
    if (!toast) return undefined
    const timeout = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(timeout)
  }, [toast])

  useEffect(
    () => () => {
      if (preview?.url) URL.revokeObjectURL(preview.url)
    },
    [preview],
  )

  async function confirmResolution() {
    setAction({ loading: 'confirm', error: '' })
    try {
      await userTicketService.confirmResolution(ticketId)
      setConfirmOpen(false)
      setToast('Resolution confirmed. The ticket is now closed.')
      await load()
      setAction({ loading: '', error: '' })
    } catch (error) {
      setAction({
        loading: '',
        error: getApiError(error, 'Unable to confirm this resolution.'),
      })
    }
  }

  async function requestReopen(reason) {
    setAction({ loading: 'reopen', error: '' })
    try {
      await userTicketService.requestReopen(ticketId, reason)
      setReopenOpen(false)
      setToast('Ticket reopened and returned to the support queue.')
      await load()
      setAction({ loading: '', error: '' })
    } catch (error) {
      setAction({
        loading: '',
        error: getApiError(error, 'Unable to reopen this ticket.'),
      })
    }
  }

  async function downloadAttachment(attachment) {
    setAttachmentError('')
    try {
      const blob = await userTicketService.downloadAttachment(ticketId, attachment.id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = attachment.original_filename
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setAttachmentError(getApiError(error, 'Unable to download this attachment.'))
    }
  }

  async function previewAttachment(attachment) {
    setAttachmentError('')
    try {
      const blob = await userTicketService.previewAttachment(ticketId, attachment.id)
      setPreview({
        url: URL.createObjectURL(blob),
        name: attachment.original_filename,
        fileType: attachment.file_type,
      })
    } catch (error) {
      setAttachmentError(getApiError(error, 'Unable to preview this attachment.'))
    }
  }

  if (state.loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="h-36 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid gap-4 lg:grid-cols-2"><div className="h-80 animate-pulse rounded-lg bg-slate-200" /><div className="h-80 animate-pulse rounded-lg bg-slate-200" /></div>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-red-200 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-red-700">{state.error}</p>
        <button type="button" onClick={() => navigate('/user/tickets')} className="mt-4 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold">Back to My Tickets</button>
      </div>
    )
  }

  const ticket = state.ticket
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <button type="button" onClick={() => navigate('/user/tickets')} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-700"><ArrowLeft size={15} /> Back to My Tickets</button>

      <header className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Ticket Details</p>
        <div className="mt-2 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold uppercase tracking-wider text-emerald-700">{ticket.ticket_number}</span><TicketBadge className={statusTone(ticket.status)}>{statusLabels[ticket.status]}</TicketBadge><TicketBadge className={priorityTone(ticket.priority)}>{priorityLabels[ticket.priority]}</TicketBadge></div>
            <h1 className="mt-3 text-xl font-bold text-slate-900 sm:text-2xl">{ticket.title}</h1>
            <p className="mt-2 text-sm text-slate-600">Track your support request and review updates from the IT team.</p>
          </div>
          <p className="shrink-0 text-xs text-slate-400">Last updated {formatDate(ticket.updated_at)}</p>
        </div>
      </header>

      <ResolutionCard ticket={ticket} onConfirm={() => { setAction({ loading: '', error: '' }); setConfirmOpen(true) }} onReopen={() => { setAction({ loading: '', error: '' }); setReopenOpen(true) }} />

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">Ticket information</h2>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{ticket.description}</p>
          <div className="mt-5 grid gap-x-6 border-t border-slate-100 sm:grid-cols-2">
            <Info icon={Folder} label="Category" value={ticket.category?.name || 'Uncategorized'} />
            <Info icon={MapPin} label="Location" value={ticket.location} />
            <Info icon={Flag} label="Reported urgency" value={urgencyLabels[ticket.reported_urgency]} />
            <Info icon={Flag} label="Administrator priority"><TicketBadge className={priorityTone(ticket.priority)}>{priorityLabels[ticket.priority]}</TicketBadge></Info>
            <Info icon={Clock3} label="Current status"><TicketBadge className={statusTone(ticket.status)}>{statusLabels[ticket.status]}</TicketBadge></Info>
            <Info icon={CalendarDays} label="Submitted" value={formatDate(ticket.created_at)} />
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">Assigned technician</h2>
          {ticket.assigned_technician ? (
            <div className="mt-4">
              <div className="flex items-center gap-3 rounded-md bg-slate-50 p-4"><span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-emerald-700"><UserRound size={19} /></span><div><p className="text-sm font-semibold text-slate-800">{ticket.assigned_technician.name}</p><p className="mt-0.5 text-xs text-slate-500">{ticket.assigned_technician.specialization}</p></div></div>
              <div className="mt-3"><Info icon={UserRound} label="Assignment status" value="Assigned" /><Info icon={CalendarDays} label="Assignment date" value={formatDate(ticket.assignment?.assigned_at)} /></div>
            </div>
          ) : (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-800">No technician has been assigned yet.</p><p className="mt-1 text-xs leading-5 text-amber-700">The IT helpdesk will assign the appropriate technician after reviewing your request.</p></div>
          )}
        </article>
      </section>

      <TicketProgressTimeline events={state.events} loading={false} />
      <PublicTechnicianUpdates updates={ticket.technician_updates || []} />
      <TicketAttachmentList attachments={ticket.attachments || []} error={attachmentError} onDownload={downloadAttachment} onPreview={previewAttachment} />

      <ConfirmResolutionDialog open={confirmOpen} loading={action.loading === 'confirm'} error={confirmOpen ? action.error : ''} onClose={() => { if (!action.loading) setConfirmOpen(false) }} onConfirm={confirmResolution} />
      <ReopenTicketModal key={reopenOpen ? 'reopen-open' : 'reopen-closed'} open={reopenOpen} loading={action.loading === 'reopen'} error={reopenOpen ? action.error : ''} onClose={() => { if (!action.loading) setReopenOpen(false) }} onSubmit={requestReopen} />
      <AttachmentPreviewDialog preview={preview} onClose={() => setPreview(null)} />
      {toast && <div className="fixed bottom-5 right-5 z-[90] rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg" role="status">{toast}</div>}
    </div>
  )
}
