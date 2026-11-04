import { ArrowRight, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, SectionError } from './SectionState'

export default function TechnicianWorkload({ state, activeTechnicians, onRetry }) {
  const technicians = state.data?.results || []

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Technician workload</h2>
          <p className="mt-1 text-xs text-slate-500">Active assignments and recent resolutions.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            {activeTechnicians ?? 0} active
          </span>
          <Link
            to="/it-admin/technicians"
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            View team <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {state.loading ? (
        <div className="space-y-3 p-6">
          {[1, 2, 3].map((row) => <div key={row} className="h-12 animate-pulse rounded bg-slate-100" />)}
        </div>
      ) : state.error ? (
        <div className="p-5"><SectionError message={state.error} onRetry={onRetry} /></div>
      ) : technicians.length === 0 ? (
        <EmptyState title="No technicians available" description="Technician accounts will appear here after they are created." />
      ) : (
        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                {['Technician', 'Specialization', 'Active tickets', 'Resolved', 'Account status', ''].map((heading) => (
                  <th key={heading || 'action'} className="px-4 py-3 font-semibold first:pl-6 last:pr-6">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {technicians.map((technician) => (
                <tr key={technician.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-4 pl-6 font-semibold text-slate-900">{technician.name}</td>
                  <td className="px-4 py-4">{technician.specialization || <span className="text-slate-400">Not specified</span>}</td>
                  <td className="px-4 py-4 font-semibold">{technician.active_assigned_tickets}</td>
                  <td className="px-4 py-4 font-semibold">{technician.resolved_tickets}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${technician.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {technician.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-4 pr-6 text-right">
                    <Link
                      to={`/it-admin/assignments?technician=${technician.id}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <UserPlus size={14} /> Assign ticket
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
