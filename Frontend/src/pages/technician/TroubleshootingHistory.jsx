import { RefreshCw, Wrench } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TroubleshootingFilters from '../../components/technician/troubleshooting/TroubleshootingFilters'
import TroubleshootingTable from '../../components/technician/troubleshooting/TroubleshootingTable'
import { getApiError } from '../../services/api'
import { troubleshootingService } from '../../services/troubleshootingService'

const PAGE_SIZE = 10
const emptyFilters = { search: '', ticket: '', visibility: 'all', date_from: '', date_to: '', ordering: '-created_at' }

export default function TroubleshootingHistory() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState(emptyFilters)
  const [debounced, setDebounced] = useState({ search: '', ticket: '' })
  const [page, setPage] = useState(1)
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebounced({ search: filters.search.trim(), ticket: filters.ticket.trim() })
      setPage(1)
    }, 350)
    return () => clearTimeout(timeout)
  }, [filters.search, filters.ticket])

  const load = useCallback(async (signal) => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const data = await troubleshootingService.list({
        search: debounced.search,
        ticket: debounced.ticket,
        visibility: filters.visibility,
        date_from: filters.date_from,
        date_to: filters.date_to,
        ordering: filters.ordering,
        page,
        page_size: PAGE_SIZE,
      }, { signal })
      setState({ data, loading: false, error: '' })
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') setState((current) => ({ ...current, loading: false, error: getApiError(error, 'Unable to load troubleshooting history.') }))
    }
  }, [debounced.search, debounced.ticket, filters.visibility, filters.date_from, filters.date_to, filters.ordering, page])

  useEffect(() => {
    const controller = new AbortController()
    const task = setTimeout(() => load(controller.signal), 0)
    return () => { clearTimeout(task); controller.abort() }
  }, [load])

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
    if (!['search', 'ticket'].includes(key)) setPage(1)
  }

  async function refresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700"><Wrench size={15} /> Technical service history</div><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Troubleshooting History</h2><p className="mt-1.5 text-sm text-slate-600">Review technical diagnoses, troubleshooting actions, and support activities.</p></div><button type="button" onClick={refresh} disabled={refreshing} className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh</button></section>
      <TroubleshootingFilters filters={filters} onChange={updateFilter} onClear={() => { setFilters(emptyFilters); setPage(1) }} />
      <TroubleshootingTable state={state} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} onRetry={() => load()} onView={(ticketId) => navigate(`/technician/tickets/${ticketId}`)} />
    </div>
  )
}
