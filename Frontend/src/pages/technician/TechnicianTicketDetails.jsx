import { AlertCircle, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import AttachmentPreviewDialog from '../../components/user/tickets/AttachmentPreviewDialog'
import AddTroubleshootingDialog from '../../components/technician/tickets/AddTroubleshootingDialog'
import AssignmentInformation from '../../components/technician/tickets/AssignmentInformation'
import RequesterInformation from '../../components/technician/tickets/RequesterInformation'
import ResolutionPreview from '../../components/technician/tickets/ResolutionPreview'
import StartWorkDialog from '../../components/technician/tickets/StartWorkDialog'
import TechnicianTicketAttachments from '../../components/technician/tickets/TechnicianTicketAttachments'
import TicketOverview from '../../components/technician/tickets/TicketOverview'
import TicketProgressTimeline from '../../components/technician/tickets/TicketProgressTimeline'
import TicketStatusActions from '../../components/technician/tickets/TicketStatusActions'
import { TicketPriorityBadge, TicketStatusBadge } from '../../components/technician/tickets/TicketStatusBadge'
import TroubleshootingPreview from '../../components/technician/tickets/TroubleshootingPreview'
import { getApiError } from '../../services/api'
import { technicianTicketService } from '../../services/technicianTicketService'

const formatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
const emptyRelated = { history: [], attachments: [], troubleshooting: [], resolutions: [], loading: true, error: '' }

export default function TechnicianTicketDetails() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const [related, setRelated] = useState(emptyRelated)
  const [startOpen, setStartOpen] = useState(false)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')
  const [troubleshootingOpen, setTroubleshootingOpen] = useState(false)
  const [savingTroubleshooting, setSavingTroubleshooting] = useState(false)
  const [troubleshootingError, setTroubleshootingError] = useState('')
  const [attachmentLoading, setAttachmentLoading] = useState(null)
  const [attachmentError, setAttachmentError] = useState('')
  const [preview, setPreview] = useState(null)
  const [toast, setToast] = useState(() => location.state?.success || '')

  const loadTicket = useCallback(async (signal) => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const data = await technicianTicketService.detail(ticketId, { signal })
      setState({ data, loading: false, error: '' })
      return data
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') {
        setState({ data: null, loading: false, error: getApiError(error, 'Unable to load this ticket.') })
      }
      return null
    }
  }, [ticketId])

  const loadRelated = useCallback(async (signal) => {
    setRelated((current) => ({ ...current, loading: true, error: '' }))
    try {
      const [history, attachments, troubleshooting, resolutions] = await Promise.all([
        technicianTicketService.history(ticketId, { signal }),
        technicianTicketService.attachments(ticketId, { signal }),
        technicianTicketService.troubleshooting(ticketId, { signal }),
        technicianTicketService.resolutions(ticketId, { signal }),
      ])
      setRelated({
        history: history.results || [],
        attachments: attachments.results || [],
        troubleshooting: troubleshooting.results || [],
        resolutions: resolutions.results || [],
        loading: false,
        error: '',
      })
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') {
        setRelated((current) => ({ ...current, loading: false, error: getApiError(error, 'Some ticket activity could not be loaded.') }))
      }
    }
  }, [ticketId])

  useEffect(() => {
    const controller = new AbortController()
    const task = setTimeout(() => {
      loadTicket(controller.signal)
      loadRelated(controller.signal)
    }, 0)
    return () => {
      clearTimeout(task)
      controller.abort()
    }
  }, [loadRelated, loadTicket])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(timeout)
  }, [toast])

  useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url)
  }, [preview])

  async function startWork() {
    setStarting(true)
    setStartError('')
    try {
      const result = await technicianTicketService.startWork(ticketId)
      setState({ data: result.ticket, loading: false, error: '' })
      setStartOpen(false)
      setToast(result.detail)
      await loadRelated()
    } catch (error) {
      setStartError(getApiError(error, 'Unable to start work on this ticket.'))
      if (error.response?.status === 409) await loadTicket()
    } finally {
      setStarting(false)
    }
  }

  async function addTroubleshooting(payload, attachments) {
    setSavingTroubleshooting(true)
    setTroubleshootingError('')
    try {
      const result = await technicianTicketService.addTroubleshooting(ticketId, payload, attachments)
      setTroubleshootingOpen(false)
      setToast(result.duplicate_submission ? 'This troubleshooting log was already saved.' : result.visibility === 'REQUESTER_VISIBLE' ? 'Troubleshooting log saved and shared with the requester.' : 'Troubleshooting log saved as an internal note.')
      await loadRelated()
    } catch (error) {
      setTroubleshootingError(getApiError(error, 'Unable to save this troubleshooting update.'))
      if (error.response?.status === 409) await loadTicket()
    } finally {
      setSavingTroubleshooting(false)
    }
  }

  async function previewAttachment(attachment) {
    setAttachmentLoading(attachment.id)
    setAttachmentError('')
    try {
      const blob = await technicianTicketService.attachmentFile(ticketId, attachment.id, true)
      setPreview({
        url: URL.createObjectURL(blob),
        name: attachment.original_filename,
        fileType: attachment.file_type,
      })
    } catch (error) {
      setAttachmentError(getApiError(error, 'Unable to preview this attachment.'))
    } finally {
      setAttachmentLoading(null)
    }
  }

  async function downloadAttachment(attachment) {
    setAttachmentLoading(attachment.id)
    setAttachmentError('')
    try {
      const blob = await technicianTicketService.attachmentFile(ticketId, attachment.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.original_filename.split(/[\\/]/).pop()
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setAttachmentError(getApiError(error, 'Unable to download this attachment.'))
    } finally {
      setAttachmentLoading(null)
    }
  }

  if (state.loading) {
    return <div className="mx-auto max-w-[1240px] space-y-4"><div className="h-28 animate-pulse rounded-lg bg-slate-200" /><div className="grid gap-5 lg:grid-cols-[1fr_360px]"><div className="h-96 animate-pulse rounded-lg bg-slate-200" /><div className="h-96 animate-pulse rounded-lg bg-slate-200" /></div></div>
  }

  if (state.error) {
    return <div className="mx-auto max-w-lg rounded-lg border border-red-200 bg-white p-8 text-center"><AlertCircle size={24} className="mx-auto text-red-500" /><p className="mt-3 text-sm font-semibold text-red-700">{state.error}</p><div className="mt-5 flex justify-center gap-2"><button type="button" onClick={() => navigate('/technician/tickets')} className="h-9 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700">Back to queue</button><button type="button" onClick={() => { loadTicket(); loadRelated() }} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#075b35] px-3 text-xs font-semibold text-white"><RefreshCw size={14} /> Retry</button></div></div>
  }

  const ticket = state.data
  return (
    <div className="mx-auto max-w-[1240px] space-y-5">
      <button type="button" onClick={() => navigate('/technician/tickets')} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-700"><ArrowLeft size={15} /> Back to My Assigned Tickets</button>

      <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-emerald-700">{ticket.ticket_number}</span><TicketPriorityBadge priority={ticket.priority} /><TicketStatusBadge status={ticket.status} /></div>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{ticket.title}</h2>
            <p className="mt-1.5 text-xs text-slate-500">{ticket.category?.name || 'Uncategorized'} · {ticket.reported_urgency.toLowerCase()} urgency · updated {formatter.format(new Date(ticket.updated_at))}</p>
          </div>
          <TicketStatusActions ticket={ticket} onStart={() => { setStartError(''); setStartOpen(true) }} onAddTroubleshooting={() => { setTroubleshootingError(''); setTroubleshootingOpen(true) }} onResolve={() => navigate(`/technician/tickets/${ticket.id}/resolve`)} />
        </div>
      </section>

      {related.error && <div className="flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3"><p className="text-xs font-medium text-amber-800">{related.error}</p><button type="button" onClick={() => loadRelated()} className="text-xs font-semibold text-amber-900 hover:underline">Retry</button></div>}
      {related.loading && <div className="h-1 overflow-hidden rounded bg-slate-100"><div className="h-full w-1/3 animate-pulse rounded bg-emerald-600" /></div>}

      <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <TicketOverview ticket={ticket} />
          <TechnicianTicketAttachments attachments={related.attachments} loadingId={attachmentLoading} error={attachmentError} onPreview={previewAttachment} onDownload={downloadAttachment} />
          <TroubleshootingPreview logs={related.troubleshooting} canAdd={ticket.can_add_troubleshooting} onAdd={() => { setTroubleshootingError(''); setTroubleshootingOpen(true) }} onPreview={previewAttachment} onDownload={downloadAttachment} attachmentLoading={attachmentLoading} />
          <ResolutionPreview resolutions={related.resolutions} />
          <TicketProgressTimeline events={related.history} />
        </div>
        <aside className="space-y-5 lg:sticky lg:top-24">
          <RequesterInformation requester={ticket.requester} />
          <AssignmentInformation assignment={ticket.assignment} />
        </aside>
      </section>

      <StartWorkDialog ticket={startOpen ? ticket : null} submitting={starting} error={startError} onClose={() => { if (!starting) setStartOpen(false) }} onConfirm={startWork} />
      <AddTroubleshootingDialog key={troubleshootingOpen ? 'troubleshooting-open' : 'troubleshooting-closed'} open={troubleshootingOpen} submitting={savingTroubleshooting} error={troubleshootingError} onClose={() => { if (!savingTroubleshooting) setTroubleshootingOpen(false) }} onSubmit={addTroubleshooting} />
      <AttachmentPreviewDialog preview={preview} onClose={() => setPreview(null)} />
      {toast && <div className="fixed bottom-5 right-5 z-[90] flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg" role="status"><CheckCircle2 size={17} /> {toast}</div>}
    </div>
  )
}
