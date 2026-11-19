import { Plus, RefreshCw, UserCog } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TechnicianFilters from '../../components/admin/technicians/TechnicianFilters'
import TechnicianFormModal from '../../components/admin/technicians/TechnicianFormModal'
import TechnicianStats from '../../components/admin/technicians/TechnicianStats'
import TechnicianStatusDialog from '../../components/admin/technicians/TechnicianStatusDialog'
import TechnicianTable from '../../components/admin/technicians/TechnicianTable'
import UserSetupLinkDialog from '../../components/admin/users/UserSetupLinkDialog'
import { getApiError } from '../../services/api'
import { technicianService } from '../../services/technicianService'

const PAGE_SIZE = 10
const defaultFilters = { search: '', status: 'all', specialization: '', workload: 'all', ordering: 'name' }

export default function TechnicianManagement() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState(defaultFilters)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [listState, setListState] = useState({ data: null, loading: true, error: '' })
  const [statsState, setStatsState] = useState({ data: null, loading: true, error: '' })
  const [formOpen, setFormOpen] = useState(() => searchParams.get('action') === 'create')
  const [editingTechnician, setEditingTechnician] = useState(null)
  const [statusTechnician, setStatusTechnician] = useState(null)
  const [invitation, setInvitation] = useState(null)
  const [toast, setToast] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => { const timeout = setTimeout(() => { setDebouncedSearch(filters.search.trim()); setPage(1) }, 400); return () => clearTimeout(timeout) }, [filters.search])
  useEffect(() => { if (!toast) return; const timeout = setTimeout(() => setToast(null), 3500); return () => clearTimeout(timeout) }, [toast])

  const loadList = useCallback(async (signal) => {
    setListState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const data = await technicianService.list({ search: debouncedSearch, status: filters.status, specialization: filters.specialization, workload: filters.workload, ordering: filters.ordering, page, page_size: PAGE_SIZE }, { signal })
      setListState({ data, loading: false, error: '' })
    } catch (error) { if (error.code === 'ERR_CANCELED') return; setListState((current) => ({ ...current, loading: false, error: getApiError(error, 'Unable to load technicians.') })) }
  }, [debouncedSearch, filters.status, filters.specialization, filters.workload, filters.ordering, page])

  const loadStats = useCallback(async (signal) => {
    setStatsState((current) => ({ ...current, loading: true, error: '' }))
    try { setStatsState({ data: await technicianService.statistics({ signal }), loading: false, error: '' }) } catch (error) { if (error.code === 'ERR_CANCELED') return; setStatsState((current) => ({ ...current, loading: false, error: getApiError(error, 'Unable to load technician statistics.') })) }
  }, [])

  useEffect(() => { const controller = new AbortController(); const task = setTimeout(() => loadList(controller.signal), 0); return () => { clearTimeout(task); controller.abort() } }, [loadList])
  useEffect(() => { const controller = new AbortController(); const task = setTimeout(() => loadStats(controller.signal), 0); return () => { clearTimeout(task); controller.abort() } }, [loadStats])

  function updateFilter(key, value) { setFilters((current) => ({ ...current, [key]: value })); if (key !== 'search') setPage(1) }
  function viewTickets(technician) { setStatusTechnician(null); navigate(`/it-admin/technicians/${technician.id}#assigned-tickets`) }
  async function refresh() { setIsRefreshing(true); await Promise.allSettled([loadList(), loadStats()]); setIsRefreshing(false) }
  async function saved(technician, action) { setFormOpen(false); setEditingTechnician(null); if (action === 'created' && technician.invitation) setInvitation(technician.invitation); setToast({ message: action === 'created' ? 'Technician account created successfully.' : 'Technician information updated successfully.', error: false }); await Promise.allSettled([loadList(), loadStats()]) }
  async function statusChanged(_technician, action) { setStatusTechnician(null); setToast({ message: `Technician account ${action} successfully.`, error: false }); await Promise.allSettled([loadList(), loadStats()]) }
  async function showSetupLink(technician) {
    try {
      const result = await technicianService.setupLink(technician.id)
      setInvitation(result.invitation)
    } catch (error) {
      setToast({ message: getApiError(error, 'Unable to generate the password setup link.'), error: true })
    }
  }

  const hasFilters = debouncedSearch || filters.status !== 'all' || filters.specialization || filters.workload !== 'all' || filters.ordering !== 'name'
  return <div className="mx-auto max-w-[1550px] space-y-6">
    <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700"><UserCog size={15} /> Technical workforce</div><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Technician Management</h2><p className="mt-1.5 text-sm text-slate-600">Manage IT support personnel, specializations, assignments, and performance.</p></div><div className="flex gap-2"><button type="button" onClick={refresh} disabled={isRefreshing} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700"><RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} /> Refresh</button><button type="button" onClick={() => { setEditingTechnician(null); setFormOpen(true) }} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white"><Plus size={16} /> Add technician</button></div></section>
    <TechnicianStats state={statsState} />
    <TechnicianFilters filters={filters} onChange={updateFilter} onClear={() => { setFilters(defaultFilters); setPage(1) }} />
    <TechnicianTable state={listState} page={page} pageSize={PAGE_SIZE} hasFilters={hasFilters} onPageChange={setPage} onRetry={() => loadList()} onView={(technician) => navigate(`/it-admin/technicians/${technician.id}`)} onEdit={(technician) => { setEditingTechnician(technician); setFormOpen(true) }} onTickets={viewTickets} onStatus={setStatusTechnician} onSetup={showSetupLink} />
    <TechnicianFormModal open={formOpen} technician={editingTechnician} onClose={() => { setFormOpen(false); setEditingTechnician(null) }} onSaved={saved} />
    <TechnicianStatusDialog technician={statusTechnician} onClose={() => setStatusTechnician(null)} onChanged={statusChanged} onViewTickets={viewTickets} />
    <UserSetupLinkDialog invitation={invitation} onClose={() => setInvitation(null)} />
    {toast && <div className={`fixed bottom-5 right-5 z-[90] rounded-lg border bg-white px-4 py-3 text-sm font-semibold shadow-lg ${toast.error ? 'border-red-200 text-red-700' : 'border-emerald-200 text-emerald-800'}`} role="status">{toast.message}</div>}
  </div>
}
