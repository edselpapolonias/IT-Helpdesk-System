import { ArrowUpRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ReportCard, { ReportEmpty } from './ReportCard'
import { chartTooltipStyle, formatCount, formatDateTime, formatDuration, formatPercent, shortName } from './formatters'

function SortHeading({ field, children, align = '', sort, onSort }) {
  return <th className={`px-3 py-3 ${align}`}><button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-1 font-semibold hover:text-slate-800">{children}{sort.field === field ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ''}</button></th>
}

export default function CategoryAnalytics({ categories }) {
  const navigate = useNavigate()
  const performance = categories.performance
  const [sort, setSort] = useState({ field: 'submitted', direction: 'desc' })
  const sortedPerformance = useMemo(() => [...performance].sort((left, right) => {
    const leftValue = left[sort.field] ?? -1
    const rightValue = right[sort.field] ?? -1
    const result = typeof leftValue === 'string'
      ? leftValue.localeCompare(rightValue)
      : leftValue - rightValue
    return sort.direction === 'asc' ? result : -result
  }), [performance, sort])

  function updateSort(field) {
    setSort((current) => ({
      field,
      direction: current.field === field && current.direction === 'desc' ? 'asc' : 'desc',
    }))
  }

  return (
    <section className="space-y-4" aria-labelledby="category-analytics-heading">
      <div>
        <h2 id="category-analytics-heading" className="text-lg font-semibold text-slate-900">Category analytics</h2>
        <p className="mt-1 text-xs text-slate-500">Volume, first-resolution performance, and recurring issue signals.</p>
      </div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <ReportCard title="Ticket volume by category" description="Tickets submitted during the selected period.">
          {!performance.length ? <ReportEmpty /> : (
            <div className="h-80" aria-label="Ticket volume by category chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performance.slice(0, 10)} layout="vertical" margin={{ top: 4, right: 15, left: 18, bottom: 0 }}>
                  <CartesianGrid stroke="#e8ece9" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={105} tickFormatter={(value) => shortName(value, 15)} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="submitted" name="Submitted" fill="#087747" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ReportCard>
        <ReportCard title="Recurring issue signals" description="Repeated category and location combinations; this does not assert a shared root cause.">
          {!categories.recurring.length ? <ReportEmpty title="No recurring pattern detected" description="At least two matching tickets are needed before a pattern is shown." /> : (
            <div className="space-y-3">
              {categories.recurring.map((item, index) => (
                <article key={`${item.category}-${item.location}-${index}`} className="rounded-md border border-slate-200 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                  <div><p className="text-sm font-semibold text-slate-800">{item.category}</p><p className="mt-1 text-xs text-slate-500">{item.location} · {item.basis}{item.recent_at ? ` · Latest ${formatDateTime(item.recent_at)}` : ''}</p></div>
                    <span className="rounded bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">{item.count} tickets</span>
                  </div>
                  {item.related_tickets.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{item.related_tickets.map((ticket) => <button key={ticket.id} type="button" onClick={() => navigate(`/it-admin/tickets/${ticket.id}`)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline">{ticket.ticket_number}<ArrowUpRight size={12} /></button>)}</div>}
                </article>
              ))}
            </div>
          )}
        </ReportCard>
      </div>
      <ReportCard title="Category performance" description="Average time uses first valid resolutions recorded in the period.">
        {!performance.length ? <ReportEmpty /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><SortHeading field="name" sort={sort} onSort={updateSort}>Category</SortHeading><SortHeading field="submitted" align="text-right" sort={sort} onSort={updateSort}>Submitted</SortHeading><SortHeading field="percentage" align="text-right" sort={sort} onSort={updateSort}>Share</SortHeading><SortHeading field="cohort_resolved" align="text-right" sort={sort} onSort={updateSort}>Cohort resolved</SortHeading><SortHeading field="cohort_resolution_rate" align="text-right" sort={sort} onSort={updateSort}>Cohort rate</SortHeading><SortHeading field="average_resolution_seconds" align="text-right" sort={sort} onSort={updateSort}>Avg. first resolution</SortHeading><SortHeading field="current_backlog" align="text-right" sort={sort} onSort={updateSort}>Current backlog</SortHeading><th className="px-3 py-3">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{sortedPerformance.map((row) => <tr key={row.id ?? row.name} className="hover:bg-slate-50/70"><td className="px-3 py-3 font-semibold text-slate-800">{row.name}</td><td className="px-3 py-3 text-right">{formatCount(row.submitted)}</td><td className="px-3 py-3 text-right">{formatPercent(row.percentage)}</td><td className="px-3 py-3 text-right">{formatCount(row.cohort_resolved)}</td><td className="px-3 py-3 text-right">{formatPercent(row.cohort_resolution_rate)}</td><td className="px-3 py-3 text-right">{formatDuration(row.average_resolution_seconds)} <span className="text-slate-400">(n={row.resolution_sample})</span></td><td className="px-3 py-3 text-right font-semibold text-slate-700">{formatCount(row.current_backlog)}</td><td className="px-3 py-3"><button type="button" onClick={() => navigate(`/it-admin/tickets?category=${encodeURIComponent(row.slug)}`)} className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline">View <ArrowUpRight size={12} /></button></td></tr>)}</tbody>
            </table>
          </div>
        )}
      </ReportCard>
    </section>
  )
}
