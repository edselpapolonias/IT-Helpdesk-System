import { AlertCircle, ArrowRight, Inbox, RefreshCw } from 'lucide-react'
import TablePagination from '../../admin/common/TablePagination'
import VisibilityBadge from './VisibilityBadge'

const formatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

function ViewButton({ log, onView }) {
  if (!log.can_view_ticket) return <span className="text-[11px] font-medium text-slate-400" title="The active ticket has been reassigned">Ticket reassigned</span>
  return <button type="button" onClick={() => onView(log.ticket.id)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700">View ticket <ArrowRight size={13} /></button>
}

export default function TroubleshootingTable({ state, page, pageSize, onPageChange, onRetry, onView }) {
  if (state.loading && !state.data) return <section className="overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="space-y-3 p-5">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-14 animate-pulse rounded bg-slate-100" />)}</div></section>
  if (state.error && !state.data) return <section className="rounded-lg border border-red-200 bg-white p-8 text-center"><AlertCircle size={22} className="mx-auto text-red-500" /><p className="mt-3 text-sm font-semibold text-red-700">{state.error}</p><button type="button" onClick={onRetry} className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white"><RefreshCw size={14} /> Retry</button></section>

  const logs = state.data?.results || []
  const count = state.data?.count || 0
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6"><h3 className="text-sm font-semibold text-slate-900">Recorded activities</h3><span className="text-xs text-slate-400">{count} total</span></div>
      {state.error && <p className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-xs font-medium text-amber-800">{state.error}</p>}
      {!logs.length ? <div className="px-5 py-12 text-center"><Inbox size={25} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-600">No troubleshooting logs found</p><p className="mt-1 text-xs text-slate-400">Try clearing the filters or record work from an active ticket.</p></div> : <>
        <div className="hidden overflow-x-auto md:block"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3 pl-6">Ticket ID</th><th className="px-5 py-3">Issue title</th><th className="px-5 py-3">Action taken</th><th className="px-5 py-3">Visibility</th><th className="px-5 py-3">Date recorded</th><th className="px-5 py-3 pr-6 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{logs.map((log) => <tr key={log.id} className="hover:bg-slate-50/70"><td className="whitespace-nowrap px-5 py-4 pl-6 font-semibold text-emerald-700">{log.ticket.ticket_number}</td><td className="max-w-56 truncate px-5 py-4 font-medium text-slate-700" title={log.ticket.title}>{log.ticket.title}</td><td className="max-w-72 truncate px-5 py-4 text-slate-600" title={log.action_taken}>{log.action_taken}</td><td className="whitespace-nowrap px-5 py-4"><VisibilityBadge visibility={log.visibility} /></td><td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatter.format(new Date(log.created_at))}</td><td className="whitespace-nowrap px-5 py-4 pr-6 text-right"><ViewButton log={log} onView={onView} /></td></tr>)}</tbody></table></div>
        <div className="divide-y divide-slate-100 md:hidden">{logs.map((log) => <article key={log.id} className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold text-emerald-700">{log.ticket.ticket_number}</p><h4 className="mt-1 truncate text-sm font-semibold text-slate-800">{log.ticket.title}</h4></div><VisibilityBadge visibility={log.visibility} /></div><p className="mt-3 text-xs leading-5 text-slate-600">{log.action_taken}</p><div className="mt-3 flex items-center justify-between gap-3"><time className="text-[11px] text-slate-400">{formatter.format(new Date(log.created_at))}</time><ViewButton log={log} onView={onView} /></div></article>)}</div>
        <TablePagination count={count} page={page} pageSize={pageSize} onPageChange={onPageChange} itemLabel="logs" />
      </>}
    </section>
  )
}
