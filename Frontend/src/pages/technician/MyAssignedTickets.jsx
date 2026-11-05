import { CheckCircle2, ClipboardList, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AssignedTicketFilters from '../../components/technician/tickets/AssignedTicketFilters'
import AssignedTicketStats from '../../components/technician/tickets/AssignedTicketStats'
import AssignedTicketsTable from '../../components/technician/tickets/AssignedTicketsTable'
import StartWorkDialog from '../../components/technician/tickets/StartWorkDialog'
import { getApiError } from '../../services/api'
import { technicianTicketService } from '../../services/technicianTicketService'

const PAGE_SIZE = 10
const emptyFilters = {
  search: '',
  status: 'all',
  priority: 'all',
  category: 'all',
  date: 'all',
  date_from: '',
  date_to: '',
  ordering: 'priority',
}
const initialState = { data: null, loading: true, error: '' }

export default function MyAssignedTickets() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState(emptyFilters)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [categories, setCategories] = useState([])
  const [tickets, setTickets] = useState(initialState)
  const [stats, setStats] = useState(initialState)
  const [refreshing, setRefreshing] = useState(false)
  const [startTicket, setStartTicket] = useState(null)
  const [startError, setStartError] = useState('')
  const [starting, setStarting] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(filters.search.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(timeout)
  }, [filters.search])

  const loadTickets = useCallback(async (signal) => {
    setTickets((current) => ({ ...current, loading: true, error: '' }))
    try {
      const safeDate = filters.date === 'custom' && !filters.date_from && !filters.date_to ? 'all' : filters.date
      const data = await technicianTicketService.list({
        search: debouncedSearch,
        status: filters.status,
        priority: filters.priority,
        category: filters.category,
        date: safeDate,
        date_from: filters.date_from,
        date_to: filters.date_to,
        ordering: filters.ordering,
        page,
        page_size: PAGE_SIZE,
      }, { signal })
      setTickets({ data, loading: false, error: '' })
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') setTickets((current) => ({ ...current, loading: false, error: getApiError(error, 'Unable to load your assigned tickets.') }))
    }
  }, [debouncedSearch, filters.status, filters.priority, filters.category, filters.date, filters.date_from, filters.date_to, filters.ordering, page])

  const loadStats = useCallback(async (signal) => {
    setStats((current) => ({ ...current, loading: true, error: '' }))
    try {
      setStats({ data: await technicianTicketService.statistics({ signal }), loading: false, error: '' })
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') setStats((current) => ({ ...current, loading: false, error: getApiError(error, 'Unable to load ticket statistics.') }))
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const task = setTimeout(() => loadTickets(controller.signal), 0)
    return () => {
      clearTimeout(task)
      controller.abort()
    }
  }, [loadTickets])

  useEffect(() => {
    const controller = new AbortController()
    const task = setTimeout(() => loadStats(controller.signal), 0)
    return () => {
      clearTimeout(task)
      controller.abort()
    }
  }, [loadStats])

  useEffect(() => {
    const controller = new AbortController()
    technicianTicketService.categories({ signal: controller.signal }).then((data) => setCategories(Array.isArray(data) ? data : data.results || [])).catch((error) => { if (error.code !== 'ERR_CANCELED') setCategories([]) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(timeout)
  }, [toast])

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value, ...(key === 'date' && value !== 'custom' ? { date_from: '', date_to: '' } : {}) }))
    if (key !== 'search') setPage(1)
  }

  function clearFilters() {
    setFilters(emptyFilters)
    setPage(1)
  }

  async function refresh() {
    setRefreshing(true)
    await Promise.all([loadTickets(), loadStats()])
    setRefreshing(false)
  }

  async function confirmStartWork() {
    setStarting(true)
    setStartError('')
    try {
      const result = await technicianTicketService.startWork(startTicket.id)
      setStartTicket(null)
      setToast(result.detail)
      await Promise.all([loadTickets(), loadStats()])
    } catch (error) {
      setStartError(getApiError(error, 'Unable to start work on this ticket.'))
      if (error.response?.status === 409) await Promise.all([loadTickets(), loadStats()])
    } finally {
      setStarting(false)
    }
  }

  const hasFilters = Boolean(debouncedSearch) || filters.status !== 'all' || filters.priority !== 'all' || filters.category !== 'all' || filters.date !== 'all'

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700"><ClipboardList size={15} /> Technician work queue</div><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">My Assigned Tickets</h2><p className="mt-1.5 text-sm text-slate-600">View and manage technical support requests assigned to you.</p></div><button type="button" onClick={refresh} disabled={refreshing} className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh</button></section>
      <AssignedTicketStats state={stats} />
      <AssignedTicketFilters filters={filters} categories={categories} onChange={updateFilter} onClear={clearFilters} />
      <AssignedTicketsTable state={tickets} page={page} pageSize={PAGE_SIZE} hasFilters={hasFilters} onPageChange={setPage} onRetry={() => loadTickets()} onView={(ticket) => navigate(`/technician/tickets/${ticket.id}`)} onStart={(ticket) => { setStartTicket(ticket); setStartError('') }} onClear={clearFilters} />
      <StartWorkDialog ticket={startTicket} submitting={starting} error={startError} onClose={() => { if (!starting) setStartTicket(null) }} onConfirm={confirmStartWork} />
      {toast && <div className="fixed bottom-5 right-5 z-[90] flex max-w-sm items-start gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg" role="status"><CheckCircle2 size={17} className="mt-0.5 shrink-0" /> {toast}</div>}
    </div>
  )
}
