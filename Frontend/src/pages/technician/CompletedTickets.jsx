import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AttachmentPreviewDialog from '../../components/user/tickets/AttachmentPreviewDialog'
import CompletedFilters from '../../components/technician/resolution/CompletedFilters'
import CompletedTicketStats from '../../components/technician/resolution/CompletedTicketStats'
import CompletedTicketsTable from '../../components/technician/resolution/CompletedTicketsTable'
import ResolutionDetails from '../../components/technician/resolution/ResolutionDetails'
import { getApiError } from '../../services/api'
import { resolutionService } from '../../services/resolutionService'
import { technicianTicketService } from '../../services/technicianTicketService'

const PAGE_SIZE = 10
const emptyFilters = { search: '', category: 'all', status: 'all', date_from: '', date_to: '', ordering: '-resolved_at' }

export default function CompletedTickets() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState(emptyFilters)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [list, setList] = useState({ data: null, loading: true, error: '' })
  const [stats, setStats] = useState({ data: null, loading: true, error: '' })
  const [categories, setCategories] = useState([])
  const [selected, setSelected] = useState(null)
  const [preview, setPreview] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [attachmentError, setAttachmentError] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(filters.search.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(timeout)
  }, [filters.search])

  const loadList = useCallback(async (signal) => {
    setList((current) => ({ ...current, loading: true, error: '' }))
    try {
      const data = await resolutionService.completed({ ...filters, search: debouncedSearch, page, page_size: PAGE_SIZE }, { signal })
      setList({ data, loading: false, error: '' })
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') setList((current) => ({ ...current, loading: false, error: getApiError(error, 'Unable to load completed tickets.') }))
    }
  }, [debouncedSearch, filters, page])

  const loadStats = useCallback(async (signal) => {
    setStats((current) => ({ ...current, loading: true, error: '' }))
    try {
      setStats({ data: await resolutionService.statistics({ signal }), loading: false, error: '' })
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') setStats((current) => ({ ...current, loading: false, error: getApiError(error, 'Unable to load completion statistics.') }))
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const task = setTimeout(() => {
      loadList(controller.signal)
      loadStats(controller.signal)
    }, 0)
    return () => {
      clearTimeout(task)
      controller.abort()
    }
  }, [loadList, loadStats])

  useEffect(() => {
    const controller = new AbortController()
    technicianTicketService.categories({ signal: controller.signal })
      .then((data) => setCategories(Array.isArray(data) ? data : data.results || []))
      .catch(() => setCategories([]))
    return () => controller.abort()
  }, [])

  useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url)
  }, [preview])

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
    if (key !== 'search') setPage(1)
  }

  async function refresh() {
    setRefreshing(true)
    await Promise.all([loadList(), loadStats()])
    setRefreshing(false)
  }

  async function attachmentFile(attachment, previewFile) {
    setAttachmentError('')
    try {
      const blob = await technicianTicketService.attachmentFile(selected.ticket.id, attachment.id, previewFile)
      if (previewFile) {
        setPreview({ url: URL.createObjectURL(blob), name: attachment.original_filename, fileType: attachment.file_type })
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.original_filename.split(/[\\/]/).pop()
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setAttachmentError(getApiError(error, 'Unable to open this supporting attachment.'))
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700"><CheckCircle2 size={15} /> Completed technical work</div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Completed Tickets</h2>
          <p className="mt-1.5 text-sm text-slate-600">Review resolved support requests and your completed technical work.</p>
        </div>
        <button type="button" onClick={refresh} disabled={refreshing} className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 disabled:opacity-60"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh</button>
      </section>
      {attachmentError && <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700" role="alert"><AlertCircle size={15} /> {attachmentError}</div>}
      <CompletedTicketStats state={stats} />
      <CompletedFilters filters={filters} categories={categories} onChange={updateFilter} onClear={() => { setFilters(emptyFilters); setPage(1) }} />
      <CompletedTicketsTable state={list} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} onRetry={() => loadList()} onView={setSelected} />
      <ResolutionDetails resolution={selected} onClose={() => setSelected(null)} onPreview={(attachment) => attachmentFile(attachment, true)} onDownload={(attachment) => attachmentFile(attachment, false)} onViewTicket={(ticketId) => navigate(`/technician/tickets/${ticketId}`)} />
      <AttachmentPreviewDialog preview={preview} onClose={() => setPreview(null)} />
    </div>
  )
}
