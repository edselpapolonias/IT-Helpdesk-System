import {
  Activity,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Mail,
  MapPin,
  Phone,
  Power,
  PowerOff,
  Ticket,
  UserRound,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import UserFormModal from '../../components/admin/users/UserFormModal'
import UserStatusDialog from '../../components/admin/users/UserStatusDialog'
import { getApiError } from '../../services/api'
import { userManagementService } from '../../services/userManagementService'

const dateTimeFormatter = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function initials(user) {
  return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U'
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3 border-b border-slate-100 py-3 last:border-0">
      <Icon size={17} className="mt-0.5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1 break-words text-sm font-medium text-slate-700">{value || 'Not specified'}</p>
      </div>
    </div>
  )
}

export default function UserDetailsPage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [userState, setUserState] = useState({ data: null, loading: true, error: '' })
  const [ticketState, setTicketState] = useState({ data: null, loading: true, error: '' })
  const [editOpen, setEditOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [toast, setToast] = useState('')

  const loadUser = useCallback(async (signal) => {
    setUserState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const data = await userManagementService.get(userId, { signal })
      setUserState({ data, loading: false, error: '' })
    } catch (error) {
      if (error.code === 'ERR_CANCELED') return
      setUserState({ data: null, loading: false, error: getApiError(error, 'Unable to load this user.') })
    }
  }, [userId])

  const loadTickets = useCallback(async (signal) => {
    setTicketState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const data = await userManagementService.tickets(userId, { signal })
      setTicketState({ data, loading: false, error: '' })
    } catch (error) {
      if (error.code === 'ERR_CANCELED') return
      setTicketState({ data: null, loading: false, error: getApiError(error, 'Unable to load ticket information.') })
    }
  }, [userId])

  useEffect(() => {
    const controller = new AbortController()
    const task = setTimeout(() => {
      loadUser(controller.signal)
      loadTickets(controller.signal)
    }, 0)
    return () => {
      clearTimeout(task)
      controller.abort()
    }
  }, [loadUser, loadTickets])

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(timeout)
  }, [toast])

  if (userState.loading) {
    return <div className="mx-auto max-w-[1300px] space-y-4"><div className="h-32 animate-pulse rounded-lg bg-slate-200" /><div className="h-80 animate-pulse rounded-lg bg-slate-200" /></div>
  }

  if (userState.error) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-red-200 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-red-700">{userState.error}</p>
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" onClick={() => navigate('/it-admin/users')} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">Back to users</button>
          <button type="button" onClick={() => loadUser()} className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white">Retry</button>
        </div>
      </div>
    )
  }

  const user = userState.data
  const stats = ticketState.data?.statistics || {}
  const ticketCards = [
    ['Total submitted', stats.total, Ticket, 'text-slate-700 bg-slate-100'],
    ['Open tickets', stats.open, Ticket, 'text-amber-700 bg-amber-50'],
    ['In progress', stats.in_progress, Activity, 'text-blue-700 bg-blue-50'],
    ['Resolved', stats.resolved, CheckCircle2, 'text-emerald-700 bg-emerald-50'],
  ]

  return (
    <div className="mx-auto max-w-[1300px] space-y-6">
      <button type="button" onClick={() => navigate('/it-admin/users')} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-700">
        <ArrowLeft size={15} /> Back to User Management
      </button>

      <section className="flex flex-col justify-between gap-5 rounded-lg border border-slate-200 bg-white p-5 sm:p-6 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-800">{initials(user)}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-bold tracking-tight text-slate-900">{user.name}</h2>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${user.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{user.is_active ? 'Active' : 'Inactive'}</span>
              {!user.account_setup_completed && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">Setup pending</span>}
            </div>
            <p className="mt-1 truncate text-sm text-slate-500">{user.email}</p>
            <p className="mt-2 text-xs text-slate-400">User ID #{user.id}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setEditOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Edit3 size={15} /> Edit user</button>
          <button type="button" onClick={() => setStatusOpen(true)} className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold text-white ${user.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-700 hover:bg-emerald-800'}`}>
            {user.is_active ? <PowerOff size={15} /> : <Power size={15} />} {user.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
          <h3 className="text-base font-semibold text-slate-900">Personal information</h3>
          <div className="mt-3">
            <InfoItem icon={UserRound} label="Full name" value={user.name} />
            <InfoItem icon={Mail} label="Email address" value={user.email} />
            <InfoItem icon={Phone} label="Contact number" value={user.contact_number} />
            <InfoItem icon={MapPin} label="Department / Office" value={user.department} />
          </div>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
          <h3 className="text-base font-semibold text-slate-900">Account information</h3>
          <div className="mt-3">
            <InfoItem icon={UserRound} label="Role" value={user.role} />
            <InfoItem icon={Power} label="Account status" value={user.is_active ? 'Active' : 'Inactive'} />
            <InfoItem icon={CalendarDays} label="Date registered" value={dateTimeFormatter.format(new Date(user.date_joined))} />
            <InfoItem icon={CalendarDays} label="Last login" value={user.last_login ? dateTimeFormatter.format(new Date(user.last_login)) : 'Never'} />
          </div>
        </article>
      </section>

      <section>
        <h3 className="text-base font-semibold text-slate-900">Ticket statistics</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ticketCards.map(([label, value, Icon, tone]) => (
            <article key={label} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{ticketState.loading ? '—' : value ?? 0}</p></div>
                <span className={`grid h-9 w-9 place-items-center rounded-md ${tone}`}><Icon size={17} /></span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6"><h3 className="text-base font-semibold text-slate-900">Recent tickets</h3><p className="mt-1 text-xs text-slate-500">Latest support requests submitted by this user.</p></div>
        {ticketState.loading ? (
          <div className="space-y-3 p-6">{[1, 2, 3].map((row) => <div key={row} className="h-11 animate-pulse rounded bg-slate-100" />)}</div>
        ) : ticketState.error ? (
          <div className="p-8 text-center text-sm font-medium text-red-600">{ticketState.error}</div>
        ) : ticketState.data?.recent_tickets.length === 0 ? (
          <div className="p-10 text-center"><Ticket size={23} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No tickets submitted yet</p><p className="mt-1 text-xs text-slate-500">This user’s support requests will appear here.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr>{['Ticket ID', 'Issue title', 'Category', 'Priority', 'Status', 'Submitted'].map((heading) => <th key={heading} className="px-4 py-3 font-semibold first:pl-6">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{ticketState.data.recent_tickets.map((ticket) => <tr key={ticket.id} className="hover:bg-slate-50"><td className="px-4 py-3.5 pl-6"><Link to={`/it-admin/tickets/${ticket.id}`} className="font-semibold text-emerald-700">{ticket.ticket_id}</Link></td><td className="px-4 py-3.5 font-medium text-slate-800">{ticket.title}</td><td className="px-4 py-3.5 text-slate-600">{ticket.category}</td><td className="px-4 py-3.5 text-slate-600">{ticket.priority}</td><td className="px-4 py-3.5 text-slate-600">{ticket.status.replace('_', ' ')}</td><td className="whitespace-nowrap px-4 py-3.5 text-slate-600">{dateTimeFormatter.format(new Date(ticket.created_at))}</td></tr>)}</tbody></table>
          </div>
        )}
      </section>

      <UserFormModal open={editOpen} user={user} onClose={() => setEditOpen(false)} onSaved={async () => { setEditOpen(false); setToast('User information updated successfully.'); await loadUser() }} />
      <UserStatusDialog user={statusOpen ? user : null} onClose={() => setStatusOpen(false)} onChanged={async (_updated, action) => { setStatusOpen(false); setToast(`User account ${action} successfully.`); await loadUser() }} />
      {toast && <div className="fixed bottom-5 right-5 z-[90] rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg" role="status">{toast}</div>}
    </div>
  )
}
