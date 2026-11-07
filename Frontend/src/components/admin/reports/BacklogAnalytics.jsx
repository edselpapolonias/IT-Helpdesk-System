import { ArrowUpRight, Clock3, UserRoundX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ReportCard, { ReportEmpty } from './ReportCard'
import { chartTooltipStyle, formatCount, formatDuration, formatPercent } from './formatters'

const priorityTone = { LOW: 'bg-slate-100 text-slate-600', MEDIUM: 'bg-blue-50 text-blue-700', HIGH: 'bg-amber-50 text-amber-700', CRITICAL: 'bg-red-50 text-red-700' }

export default function BacklogAnalytics({ backlog }) {
  const navigate = useNavigate()
  const hasAging = backlog.aging.some((item) => item.count > 0)
  const unassigned = backlog.unassigned
  return (
    <section className="space-y-4" aria-labelledby="backlog-analytics-heading">
      <div><h2 id="backlog-analytics-heading" className="text-lg font-semibold text-slate-900">Current backlog and aging</h2><p className="mt-1 text-xs text-slate-500">{backlog.definition} Historical backlog snapshots are not inferred.</p></div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
        <ReportCard title="Backlog aging" description={`${formatCount(backlog.total)} unresolved tickets currently match the filters.`} note="Current state">
          {!hasAging ? <ReportEmpty title="No current backlog" /> : <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={backlog.aging} margin={{ top: 4, right: 10, left: -18, bottom: 28 }}><CartesianGrid stroke="#e8ece9" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" angle={-15} textAnchor="end" height={52} interval={0} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={chartTooltipStyle} formatter={(value, name, item) => [`${value} (${formatPercent(item.payload.percentage)})`, name]} /><Bar dataKey="count" name="Open tickets" fill="#d97706" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>}
        </ReportCard>
        <ReportCard title="Assignment waiting" description="First assignment timing for tickets submitted during the period; never-assigned counts use current state." note="Mixed scope">
          <div className="space-y-3">
            <div className="rounded-md bg-slate-50 p-4"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Clock3 size={15} /> Average first assignment</div><p className="mt-2 text-xl font-bold text-slate-900">{formatDuration(unassigned.average_first_assignment_seconds)}</p><p className="mt-1 text-[11px] text-slate-500">Based on {formatCount(unassigned.assigned_ticket_count)} submitted tickets.</p></div>
            <div className="rounded-md bg-amber-50 p-4"><div className="flex items-center gap-2 text-xs font-semibold text-amber-700"><UserRoundX size={15} /> Never assigned and open</div><p className="mt-2 text-xl font-bold text-amber-900">{formatCount(unassigned.never_assigned_current_count)}</p><p className="mt-1 text-[11px] text-amber-700">Average wait {formatDuration(unassigned.average_never_assigned_wait_seconds)} · Longest {formatDuration(unassigned.longest_never_assigned_wait_seconds)}</p></div>
          </div>
        </ReportCard>
      </div>
      <ReportCard title="Oldest unresolved tickets" description="The ten oldest current backlog items matching the selected dimensions." note="Current state">
        {!backlog.oldest.length ? <ReportEmpty title="No unresolved tickets" /> : <div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Ticket</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Priority</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Technician</th><th className="px-3 py-3 text-right">Days open</th><th className="px-3 py-3"><span className="sr-only">Open</span></th></tr></thead><tbody className="divide-y divide-slate-100">{backlog.oldest.map((row) => <tr key={row.id} className="hover:bg-slate-50/70"><td className="max-w-xs px-3 py-3"><p className="font-semibold text-slate-800">{row.ticket_number}</p><p className="mt-0.5 truncate text-slate-500" title={row.title}>{row.title}</p></td><td className="px-3 py-3 text-slate-600">{row.category}</td><td className="px-3 py-3"><span className={`rounded px-2 py-1 text-[10px] font-bold ${priorityTone[row.priority] || priorityTone.LOW}`}>{row.priority}</span></td><td className="px-3 py-3 text-slate-600">{row.status.replaceAll('_', ' ')}</td><td className="px-3 py-3 text-slate-600">{row.technician}</td><td className="px-3 py-3 text-right font-semibold text-slate-800">{row.days_open}</td><td className="px-3 py-3"><button type="button" onClick={() => navigate(`/it-admin/tickets/${row.id}`)} className="rounded p-1.5 text-emerald-700 hover:bg-emerald-50" aria-label={`Open ${row.ticket_number}`}><ArrowUpRight size={15} /></button></td></tr>)}</tbody></table></div>}
      </ReportCard>
    </section>
  )
}
