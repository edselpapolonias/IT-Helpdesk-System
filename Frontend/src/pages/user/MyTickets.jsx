import { FilePlus2, RefreshCw, Tickets } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MyTicketFilters from '../../components/user/tickets/MyTicketFilters'
import MyTicketStats from '../../components/user/tickets/MyTicketStats'
import MyTicketsTable from '../../components/user/tickets/MyTicketsTable'
import { getApiError } from '../../services/api'
import { userTicketService } from '../../services/userTicketService'

const PAGE_SIZE = 10
const emptyFilters = {
  search: '',
  status: 'all',
  category: 'all',
  priority: 'all',
  date: 'all',
  date_from: '',
  date_to: '',
  ordering: '-created_at',
}

export default function MyTickets() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState(emptyFilters)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [categories, setCategories] = useState([])
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(filters.search.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(timeout)
  }, [filters.search])

  const loadTickets = useCallback(
    async (signal) => {
      setState((current) => ({ ...current, loading: true, error: '' }))
      try {
        const safeDate =
          filters.date === 'custom' && !filters.date_from && !filters.date_to
            ? 'all'
            : filters.date
        const data = await userTicketService.list(
          {
            search: debouncedSearch,
            status: filters.status,
            category: filters.category,
            priority: filters.priority,
            date: safeDate,
            date_from: filters.date_from,
            date_to: filters.date_to,
            ordering: filters.ordering,
            page,
            page_size: PAGE_SIZE,
          },
          { signal },
        )
        setState({ data, loading: false, error: '' })
      } catch (error) {
        if (error.code !== 'ERR_CANCELED') {
          setState((current) => ({
            ...current,
            loading: false,
            error: getApiError(error, 'Unable to load your tickets.'),
          }))
        }
      }
    },
    [
      debouncedSearch,
      filters.status,
      filters.category,
      filters.priority,
      filters.date,
      filters.date_from,
      filters.date_to,
      filters.ordering,
      page,
    ],
  )

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
    userTicketService
      .categories({ signal: controller.signal })
      .then((data) => setCategories(Array.isArray(data) ? data : data.results || []))
      .catch((error) => {
        if (error.code !== 'ERR_CANCELED') setCategories([])
      })
    return () => controller.abort()
  }, [])

  function updateFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === 'date' && value !== 'custom'
        ? { date_from: '', date_to: '' }
        : {}),
    }))
    if (key !== 'search') setPage(1)
  }

  function clearFilters() {
    setFilters(emptyFilters)
    setPage(1)
  }

  async function refresh() {
    setRefreshing(true)
    await loadTickets()
    setRefreshing(false)
  }

  const hasFilters =
    Boolean(debouncedSearch) ||
    filters.status !== 'all' ||
    filters.category !== 'all' ||
    filters.priority !== 'all' ||
    filters.date !== 'all'

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
            <Tickets size={15} /> Support requests
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">My Tickets</h2>
          <p className="mt-1.5 text-sm text-slate-600">
            View and track all your submitted IT support requests.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <Link
            to="/user/tickets/new"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white hover:bg-[#06492c]"
          >
            <FilePlus2 size={15} /> Submit New Ticket
          </Link>
        </div>
      </section>
      <MyTicketStats summary={state.data?.summary} loading={state.loading && !state.data} />
      <MyTicketFilters
        filters={filters}
        categories={categories}
        onChange={updateFilter}
        onClear={clearFilters}
      />
      <MyTicketsTable
        state={state}
        page={page}
        pageSize={PAGE_SIZE}
        hasFilters={hasFilters}
        onPageChange={setPage}
        onRetry={() => loadTickets()}
        onView={(ticket) => navigate(`/user/tickets/${ticket.id}`)}
        onClear={clearFilters}
      />
    </div>
  )
}
