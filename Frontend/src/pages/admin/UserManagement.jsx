import { Plus, RefreshCw, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import UserFilters from '../../components/admin/users/UserFilters'
import UserFormModal from '../../components/admin/users/UserFormModal'
import UserSetupLinkDialog from '../../components/admin/users/UserSetupLinkDialog'
import UserStats from '../../components/admin/users/UserStats'
import UserStatusDialog from '../../components/admin/users/UserStatusDialog'
import UserTable from '../../components/admin/users/UserTable'
import { getApiError } from '../../services/api'
import { userManagementService } from '../../services/userManagementService'

const PAGE_SIZE = 10
const defaultFilters = {
  search: '',
  status: 'all',
  ordering: '-date_joined',
  date_from: '',
  date_to: '',
}

export default function UserManagement() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState(defaultFilters)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [usersState, setUsersState] = useState({ data: null, loading: true, error: '' })
  const [statsState, setStatsState] = useState({ data: null, loading: true, error: '' })
  const [formOpen, setFormOpen] = useState(
    () => searchParams.get('action') === 'create',
  )
  const [editingUser, setEditingUser] = useState(null)
  const [statusUser, setStatusUser] = useState(null)
  const [invitation, setInvitation] = useState(null)
  const [toast, setToast] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(filters.search.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(timeout)
  }, [filters.search])

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(timeout)
  }, [toast])

  const loadUsers = useCallback(
    async (signal) => {
      setUsersState((current) => ({ ...current, loading: true, error: '' }))
      try {
        const data = await userManagementService.list(
          {
            search: debouncedSearch,
            status: filters.status,
            ordering: filters.ordering,
            date_from: filters.date_from,
            date_to: filters.date_to,
            page,
            page_size: PAGE_SIZE,
          },
          { signal },
        )
        setUsersState({ data, loading: false, error: '' })
      } catch (error) {
        if (error.code === 'ERR_CANCELED') return
        setUsersState((current) => ({
          ...current,
          loading: false,
          error: getApiError(error, 'Unable to load user accounts.'),
        }))
      }
    },
    [debouncedSearch, filters.status, filters.ordering, filters.date_from, filters.date_to, page],
  )

  const loadStats = useCallback(async (signal) => {
    setStatsState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const data = await userManagementService.statistics({ signal })
      setStatsState({ data, loading: false, error: '' })
    } catch (error) {
      if (error.code === 'ERR_CANCELED') return
      setStatsState((current) => ({
        ...current,
        loading: false,
        error: getApiError(error, 'Unable to load user statistics.'),
      }))
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const task = setTimeout(() => loadUsers(controller.signal), 0)
    return () => {
      clearTimeout(task)
      controller.abort()
    }
  }, [loadUsers])

  useEffect(() => {
    const controller = new AbortController()
    const task = setTimeout(() => loadStats(controller.signal), 0)
    return () => {
      clearTimeout(task)
      controller.abort()
    }
  }, [loadStats])

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
    if (key !== 'search') setPage(1)
  }

  function openCreate() {
    setEditingUser(null)
    setFormOpen(true)
  }

  function openEdit(user) {
    setEditingUser(user)
    setFormOpen(true)
  }

  async function refresh() {
    setIsRefreshing(true)
    await Promise.allSettled([loadUsers(), loadStats()])
    setIsRefreshing(false)
  }

  async function handleSaved(user, action) {
    setFormOpen(false)
    setEditingUser(null)
    if (action === 'created' && user.invitation) setInvitation(user.invitation)
    setToast(action === 'created' ? 'User account created successfully.' : 'User information updated successfully.')
    await Promise.allSettled([loadUsers(), loadStats()])
  }

  async function handleStatusChanged(_user, action) {
    setStatusUser(null)
    setToast(`User account ${action} successfully.`)
    await Promise.allSettled([loadUsers(), loadStats()])
  }

  const hasFilters =
    debouncedSearch ||
    filters.status !== 'all' ||
    filters.ordering !== '-date_joined' ||
    filters.date_from ||
    filters.date_to

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
            <Users size={15} /> Account administration
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">User Management</h2>
          <p className="mt-1.5 text-sm text-slate-600">Manage registered users, account information, and access to IT support services.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={refresh} disabled={isRefreshing} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button type="button" onClick={openCreate} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white hover:bg-[#06492c]">
            <Plus size={16} /> Add user
          </button>
        </div>
      </section>

      <UserStats state={statsState} />
      <UserFilters filters={filters} onChange={updateFilter} onClear={() => { setFilters(defaultFilters); setPage(1) }} />
      <UserTable
        state={usersState}
        page={page}
        pageSize={PAGE_SIZE}
        hasFilters={hasFilters}
        onPageChange={setPage}
        onRetry={() => loadUsers()}
        onView={(user) => navigate(`/it-admin/users/${user.id}`)}
        onEdit={openEdit}
        onStatus={setStatusUser}
      />

      <UserFormModal
        open={formOpen}
        user={editingUser}
        onClose={() => { setFormOpen(false); setEditingUser(null) }}
        onSaved={handleSaved}
      />
      <UserStatusDialog user={statusUser} onClose={() => setStatusUser(null)} onChanged={handleStatusChanged} />
      <UserSetupLinkDialog invitation={invitation} onClose={() => setInvitation(null)} />

      {toast && (
        <div className="fixed bottom-5 right-5 z-[90] rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
