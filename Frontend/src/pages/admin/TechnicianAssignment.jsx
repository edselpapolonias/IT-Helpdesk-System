import { ClipboardCheck, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AssignmentFilters from '../../components/admin/assignments/AssignmentFilters'
import AssignmentHistory from '../../components/admin/assignments/AssignmentHistory'
import AssignmentStats from '../../components/admin/assignments/AssignmentStats'
import TechnicianAssignmentModal from '../../components/admin/assignments/TechnicianAssignmentModal'
import TechnicianWorkloadOverview from '../../components/admin/assignments/TechnicianWorkloadOverview'
import UnassignedTicketsTable from '../../components/admin/assignments/UnassignedTicketsTable'
import { assignmentService } from '../../services/assignmentService'
import { getApiError } from '../../services/api'
import { ticketService } from '../../services/ticketService'

const PAGE_SIZE = 10
const defaultFilters = { search: '', priority: 'all', category: 'all', date: 'all', date_from: '', date_to: '', ordering: 'priority' }
const defaultHistoryFilters = { ticket: '', technician: 'all', date_from: '', date_to: '' }

export default function TechnicianAssignment() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState(defaultFilters)
  const [historyFilters, setHistoryFilters] = useState(defaultHistoryFilters)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [debouncedHistoryTicket, setDebouncedHistoryTicket] = useState('')
  const [page, setPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  const [stats, setStats] = useState({ data: null, loading: true, error: '' })
  const [unassigned, setUnassigned] = useState({ data: null, loading: true, error: '' })
  const [workloads, setWorkloads] = useState({ data: null, loading: true, error: '' })
  const [history, setHistory] = useState({ data: null, loading: true, error: '' })
  const [categories, setCategories] = useState([])
  const [modalTicket, setModalTicket] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { const timeout = setTimeout(() => { setDebouncedSearch(filters.search.trim()); setPage(1) }, 350); return () => clearTimeout(timeout) }, [filters.search])
  useEffect(() => { const timeout = setTimeout(() => { setDebouncedHistoryTicket(historyFilters.ticket.trim()); setHistoryPage(1) }, 350); return () => clearTimeout(timeout) }, [historyFilters.ticket])
  useEffect(() => { if (!toast) return undefined; const timeout = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timeout) }, [toast])

  const loadStats = useCallback(async (signal) => { setStats((current) => ({ ...current, loading: true, error: '' })); try { setStats({ data: await assignmentService.statistics({ signal }), loading: false, error: '' }) } catch (error) { if (error.code !== 'ERR_CANCELED') setStats((current) => ({ ...current, loading: false, error: getApiError(error, 'Unable to load assignment statistics.') })) } }, [])
  const loadUnassigned = useCallback(async (signal) => { setUnassigned((current) => ({ ...current, loading: true, error: '' })); try { const safeDate = filters.date === 'custom' && !filters.date_from && !filters.date_to ? 'all' : filters.date; setUnassigned({ data: await assignmentService.unassigned({ ...filters, search: debouncedSearch, date: safeDate, page, page_size: PAGE_SIZE }, { signal }), loading: false, error: '' }) } catch (error) { if (error.code !== 'ERR_CANCELED') setUnassigned((current) => ({ ...current, loading: false, error: getApiError(error, 'Unable to load unassigned tickets.') })) } }, [debouncedSearch, filters, page])
  const loadWorkloads = useCallback(async (signal) => { setWorkloads((current) => ({ ...current, loading: true, error: '' })); try { setWorkloads({ data: await assignmentService.workloads({ signal }), loading: false, error: '' }) } catch (error) { if (error.code !== 'ERR_CANCELED') setWorkloads((current) => ({ ...current, loading: false, error: getApiError(error, 'Unable to load technician workloads.') })) } }, [])
  const loadHistory = useCallback(async (signal) => { setHistory((current) => ({ ...current, loading: true, error: '' })); try { setHistory({ data: await assignmentService.history({ ...historyFilters, ticket: debouncedHistoryTicket, page: historyPage, page_size: PAGE_SIZE }, { signal }), loading: false, error: '' }) } catch (error) { if (error.code !== 'ERR_CANCELED') setHistory((current) => ({ ...current, loading: false, error: getApiError(error, 'Unable to load assignment history.') })) } }, [debouncedHistoryTicket, historyFilters, historyPage])

  useEffect(() => { const controller = new AbortController(); const task = setTimeout(() => loadUnassigned(controller.signal), 0); return () => { clearTimeout(task); controller.abort() } }, [loadUnassigned])
  useEffect(() => { const controller = new AbortController(); const task = setTimeout(() => loadHistory(controller.signal), 0); return () => { clearTimeout(task); controller.abort() } }, [loadHistory])
  useEffect(() => { const controller = new AbortController(); const task = setTimeout(() => { loadStats(controller.signal); loadWorkloads(controller.signal); ticketService.categories({ signal: controller.signal }).then((data) => setCategories(Array.isArray(data) ? data : data.results || [])).catch(() => setCategories([])) }, 0); return () => { clearTimeout(task); controller.abort() } }, [loadStats, loadWorkloads])

  function updateFilter(key, value) { setFilters((current) => ({ ...current, [key]: value, ...(key === 'date' && value !== 'custom' ? { date_from: '', date_to: '' } : {}) })); if (key !== 'search') setPage(1) }
  function updateHistoryFilter(key, value) { setHistoryFilters((current) => ({ ...current, [key]: value })); if (key !== 'ticket') setHistoryPage(1) }
  async function refresh() { setRefreshing(true); await Promise.allSettled([loadStats(), loadUnassigned(), loadWorkloads(), loadHistory()]); setRefreshing(false) }
  async function saved(result, action) { setModalTicket(null); setToast(`${result.ticket.ticket_number} ${action} successfully.`); await Promise.allSettled([loadStats(), loadUnassigned(), loadWorkloads(), loadHistory()]) }
  function openHistoryReassign(row) { setModalTicket({ ...row.ticket, assigned_technician: row.new_technician, assignment: { assigned_at: row.assigned_at } }) }

  const hasFilters = debouncedSearch || filters.priority !== 'all' || filters.category !== 'all' || filters.date !== 'all' || filters.ordering !== 'priority'
  return <div className="mx-auto max-w-[1600px] space-y-6"><section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700"><ClipboardCheck size={15} /> Dispatch operations</div><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Technician Assignment</h2><p className="mt-1.5 text-sm text-slate-600">Assign technical support requests and manage technician workloads efficiently.</p></div><button type="button" onClick={refresh} disabled={refreshing} className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white hover:bg-[#06492c] disabled:opacity-60"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh</button></section><AssignmentStats state={stats} /><AssignmentFilters filters={filters} categories={categories} onChange={updateFilter} onClear={() => { setFilters(defaultFilters); setPage(1) }} /><UnassignedTicketsTable state={unassigned} page={page} pageSize={PAGE_SIZE} hasFilters={hasFilters} onPageChange={setPage} onRetry={() => loadUnassigned()} onAssign={setModalTicket} /><TechnicianWorkloadOverview state={workloads} onRetry={() => loadWorkloads()} onView={(technician) => navigate(`/it-admin/technicians/${technician.id}`)} /><AssignmentHistory state={history} filters={historyFilters} technicians={workloads.data?.results || []} page={historyPage} pageSize={PAGE_SIZE} onFilterChange={updateHistoryFilter} onPageChange={setHistoryPage} onRetry={() => loadHistory()} onReassign={openHistoryReassign} /><TechnicianAssignmentModal ticket={modalTicket} onClose={() => setModalTicket(null)} onSaved={saved} />{toast && <div className="fixed bottom-5 right-5 z-[90] rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg" role="status">{toast}</div>}</div>
}
