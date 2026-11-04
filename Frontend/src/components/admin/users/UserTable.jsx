import {
  Edit3,
  Eye,
  MoreHorizontal,
  Power,
  PowerOff,
  SearchX,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import TablePagination from '../common/TablePagination'

const dateFormatter = new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function initials(user) {
  return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U'
}

export default function UserTable({
  state,
  page,
  pageSize,
  hasFilters,
  onPageChange,
  onRetry,
  onView,
  onEdit,
  onStatus,
}) {
  const [openMenu, setOpenMenu] = useState(null)
  const users = state.data?.results || []

  function runAction(callback, user) {
    setOpenMenu(null)
    callback(user)
  }

  return (
    <section className="overflow-visible rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Registered users</h2>
          <p className="mt-1 text-xs text-slate-500">Regular accounts with access to IT support services.</p>
        </div>
        {!state.loading && !state.error && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            {state.data?.count ?? 0} accounts
          </span>
        )}
      </div>

      {state.loading ? (
        <div className="space-y-3 p-6">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-14 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      ) : state.error ? (
        <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
          <p className="text-sm font-semibold text-red-700">{state.error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      ) : users.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
            {hasFilters ? <SearchX size={22} /> : <Users size={22} />}
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-700">
            {hasFilters ? 'No users match your filters' : 'No regular users yet'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {hasFilters ? 'Try adjusting or clearing the current filters.' : 'Create the first regular user account to get started.'}
          </p>
        </div>
      ) : (
        <>
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  {['User', 'Department / Office', 'Contact number', 'Status', 'Date registered', ''].map((heading) => (
                    <th key={heading || 'actions'} className="px-4 py-3 font-semibold first:pl-6 last:pr-6">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3.5 pl-6">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-800">
                          {initials(user)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{user.name}</p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">{user.department || <span className="text-slate-400">Not specified</span>}</td>
                    <td className="whitespace-nowrap px-4 py-3.5">{user.contact_number || <span className="text-slate-400">Not specified</span>}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${user.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {!user.account_setup_completed && (
                        <span className="ml-1.5 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                          Setup pending
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">{dateFormatter.format(new Date(user.date_joined))}</td>
                    <td className="relative px-4 py-3.5 pr-6 text-right">
                      <button
                        type="button"
                        onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                        className="inline-grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        aria-label={`Actions for ${user.name}`}
                        aria-expanded={openMenu === user.id}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      {openMenu === user.id && (
                        <div className="absolute right-6 top-11 z-20 w-44 overflow-hidden rounded-md border border-slate-200 bg-white py-1 text-left shadow-lg">
                          <button type="button" onClick={() => runAction(onView, user)} className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
                            <Eye size={15} /> View details
                          </button>
                          <button type="button" onClick={() => runAction(onEdit, user)} className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
                            <Edit3 size={15} /> Edit user
                          </button>
                          <button
                            type="button"
                            onClick={() => runAction(onStatus, user)}
                            className={`flex w-full items-center gap-2.5 border-t border-slate-100 px-3 py-2 text-xs font-medium ${user.is_active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-700 hover:bg-emerald-50'}`}
                          >
                            {user.is_active ? <PowerOff size={15} /> : <Power size={15} />}
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            count={state.data?.count || 0}
            page={page}
            pageSize={pageSize}
            onPageChange={onPageChange}
            itemLabel="users"
          />
        </>
      )}
    </section>
  )
}
