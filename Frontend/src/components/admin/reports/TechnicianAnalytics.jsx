import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ReportCard, { ReportEmpty } from './ReportCard'
import { chartTooltipStyle, formatCount, formatDuration, shortName } from './formatters'

function WorkloadChart({ data, activity = false }) {
  if (!data.length) return <ReportEmpty />
  return <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.slice(0, 10)} layout="vertical" margin={{ top: 4, right: 15, left: 25, bottom: 0 }}><CartesianGrid stroke="#e8ece9" strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" width={105} tickFormatter={(value) => shortName(value, 15)} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={chartTooltipStyle} />{activity && <Legend wrapperStyle={{ fontSize: 11 }} />}<Bar dataKey={activity ? 'resolved' : 'count'} name={activity ? 'Distinct resolved tickets' : 'Active assignments'} fill="#087747" radius={[0, 4, 4, 0]} />{activity && <Bar dataKey="attempts" name="Resolution attempts" fill="#94a3b8" radius={[0, 4, 4, 0]} />}</BarChart></ResponsiveContainer></div>
}

export default function TechnicianAnalytics({ technicians }) {
  const navigate = useNavigate()
  return (
    <section className="space-y-4" aria-labelledby="technician-analytics-heading">
      <div><h2 id="technician-analytics-heading" className="text-lg font-semibold text-slate-900">Technician analytics</h2><p className="mt-1 text-xs text-slate-500">Current assignments are separate from work credited to the technician who recorded each resolution.</p></div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <ReportCard title="Current assignment workload" description="Open, assigned, in-progress, and reopened tickets." note="Current state"><WorkloadChart data={technicians.workload} /></ReportCard>
        <ReportCard title="Resolution activity" description="Distinct tickets and resolution attempts recorded during the selected period."><WorkloadChart data={technicians.resolution_activity} activity /></ReportCard>
      </div>
      <ReportCard title="Technician performance" description="Resolver attribution comes from each resolution record, not the ticket's current assignee.">
        {!technicians.performance.length ? <ReportEmpty /> : <div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Technician</th><th className="px-3 py-3">Specialization</th><th className="px-3 py-3 text-right">Active assignments</th><th className="px-3 py-3 text-right">Resolved tickets</th><th className="px-3 py-3 text-right">Attempts</th><th className="px-3 py-3 text-right">Avg. resolution</th><th className="px-3 py-3 text-right">Reopened attempts</th><th className="px-3 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{technicians.performance.map((row) => <tr key={row.id} className="hover:bg-slate-50/70"><td className="px-3 py-3"><span className="font-semibold text-slate-800">{row.name}</span>{!row.is_active && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">Inactive</span>}</td><td className="px-3 py-3 text-slate-600">{row.specialization}</td><td className="px-3 py-3 text-right">{formatCount(row.active_assignments)}</td><td className="px-3 py-3 text-right">{formatCount(row.resolved_tickets)}</td><td className="px-3 py-3 text-right">{formatCount(row.resolution_attempts)}</td><td className="px-3 py-3 text-right">{formatDuration(row.average_resolution_seconds)} <span className="text-slate-400">(n={row.resolution_sample})</span></td><td className="px-3 py-3 text-right">{formatCount(row.reopened_after_resolution)}</td><td className="px-3 py-3"><button type="button" onClick={() => navigate(`/it-admin/technicians/${row.id}`)} className="font-semibold text-emerald-700 hover:underline">View</button></td></tr>)}</tbody></table></div>}
      </ReportCard>
    </section>
  )
}
