import { RefreshCw, Tickets } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TicketFilters from '../../components/admin/tickets/TicketFilters'
import TicketPriorityModal from '../../components/admin/tickets/TicketPriorityModal'
import TicketStats from '../../components/admin/tickets/TicketStats'
import TicketTable from '../../components/admin/tickets/TicketTable'
import { getApiError } from '../../services/api'
import { ticketService } from '../../services/ticketService'

const PAGE_SIZE = 10
const emptyFilters = { search: '', status: 'all', priority: 'all', category: 'all', assignment: 'all', date: 'all', date_from: '', date_to: '', ordering: '-created_at' }

function initialFilters(searchParams) {
  const priority = searchParams.get('priority')?.toUpperCase()
  const status = searchParams.get('status')?.toUpperCase()
  return {
    ...emptyFilters,
    assignment: searchParams.get('filter') === 'unassigned' ? 'unassigned' : 'all',
    priority: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(priority) ? priority : 'all',
    status: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status) ? status : 'all',
  }
}

export default function TicketManagement() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState(() => initialFilters(searchParams))
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [listState, setListState] = useState({ data: null, loading: true, error: '' })
  const [statsState, setStatsState] = useState({ data: null, loading: true, error: '' })
  const [categories, setCategories] = useState([])
  const [priorityTicket, setPriorityTicket] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { const timeout = setTimeout(() => { setDebouncedSearch(filters.search.trim()); setPage(1) }, 400); return () => clearTimeout(timeout) }, [filters.search])
  useEffect(() => { if (!toast) return undefined; const timeout = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timeout) }, [toast])

  const loadList = useCallback(async (signal) => {
    setListState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const safeDate = filters.date === 'custom' && !filters.date_from && !filters.date_to ? 'all' : filters.date
      const data = await ticketService.list({ ...filters, search: debouncedSearch, date: safeDate, page, page_size: PAGE_SIZE }, { signal })
      setListState({ data, loading: false, error: '' })
    } catch (error) { if (error.code === 'ERR_CANCELED') return; setListState((current) => ({ ...current, loading: false, error: getApiError(error, 'Unable to load tickets.') })) }
  }, [debouncedSearch, filters, page])

  const loadStats = useCallback(async (signal) => {
    setStatsState((current) => ({ ...current, loading: true, error: '' }))
    try { setStatsState({ data: await ticketService.statistics({ signal }), loading: false, error: '' }) } catch (error) { if (error.code === 'ERR_CANCELED') return; setStatsState((current) => ({ ...current, loading: false, error: getApiError(error, 'Unable to load ticket statistics.') })) }
  }, [])

  useEffect(() => { const controller = new AbortController(); const task = setTimeout(() => loadList(controller.signal), 0); return () => { clearTimeout(task); controller.abort() } }, [loadList])
  useEffect(() => { const controller = new AbortController(); const task = setTimeout(() => { loadStats(controller.signal); ticketService.categories({ signal: controller.signal }).then((data) => setCategories(Array.isArray(data) ? data : data.results || [])).catch((error) => { if (error.code !== 'ERR_CANCELED') setCategories([]) }) }, 0); return () => { clearTimeout(task); controller.abort() } }, [loadStats])

  function updateFilter(key, value) { setFilters((current) => ({ ...current, [key]: value, ...(key === 'date' && value !== 'custom' ? { date_from: '', date_to: '' } : {}) })); if (key !== 'search') setPage(1) }
  async function refresh() { setRefreshing(true); await Promise.allSettled([loadList(), loadStats()]); setRefreshing(false) }
  async function prioritySaved(updated) { setPriorityTicket(null); setToast(`${updated.ticket_number} priority updated successfully.`); await Promise.allSettled([loadList(), loadStats()]) }

  const hasFilters = debouncedSearch || filters.status !== 'all' || filters.priority !== 'all' || filters.category !== 'all' || filters.assignment !== 'all' || filters.date !== 'all' || filters.ordering !== '-created_at'
  return <div className="mx-auto max-w-[1600px] space-y-6">
    <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700"><Tickets size={15} /> Support operations</div><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Ticket Management</h2><p className="mt-1.5 text-sm text-slate-600">Review, prioritize, and monitor technical support requests.</p></div><button type="button" onClick={refresh} disabled={refreshing} className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white hover:bg-[#06492c] disabled:opacity-60"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh</button></section>
    <TicketStats state={statsState} />
    <TicketFilters filters={filters} categories={categories} onChange={updateFilter} onClear={() => { setFilters(emptyFilters); setPage(1) }} />
    <TicketTable state={listState} page={page} pageSize={PAGE_SIZE} hasFilters={hasFilters} onPageChange={setPage} onRetry={() => loadList()} onView={(ticket) => navigate(`/it-admin/tickets/${ticket.id}`)} onPriority={setPriorityTicket} onHistory={(ticket) => navigate(`/it-admin/tickets/${ticket.id}#activity`)} />
    <TicketPriorityModal ticket={priorityTicket} onClose={() => setPriorityTicket(null)} onSaved={prioritySaved} />
    {toast && <div className="fixed bottom-5 right-5 z-[90] rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg" role="status">{toast}</div>}
  </div>
}
