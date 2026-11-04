import { Wrench } from 'lucide-react'

const dateFormatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
export default function TroubleshootingHistory({ logs }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center gap-2"><Wrench size={17} className="text-emerald-700" /><h3 className="text-base font-semibold text-slate-900">Troubleshooting history</h3></div>{logs.length === 0 ? <p className="mt-4 text-sm text-slate-500">No troubleshooting activity has been recorded.</p> : <div className="mt-4 space-y-3">{logs.map((log) => <article key={log.id} className="rounded-md border border-slate-100 bg-slate-50/70 p-4"><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-semibold text-slate-800">{log.action_taken}</p><time className="text-[11px] text-slate-400">{dateFormatter.format(new Date(log.created_at))}</time></div><p className="mt-2 text-xs leading-5 text-slate-600">{log.notes || 'No additional notes.'}</p><p className="mt-2 text-[11px] font-medium text-slate-500">Technician: {log.technician.name}</p></article>)}</div>}</section>
}
