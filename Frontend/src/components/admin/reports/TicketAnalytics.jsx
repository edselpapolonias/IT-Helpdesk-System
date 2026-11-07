import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ReportCard, { ReportEmpty } from './ReportCard'
import { chartTooltipStyle, formatDate, shortName } from './formatters'

const statusColors = ['#64748b', '#2563eb', '#d97706', '#15803d', '#7c3aed', '#be123c']
const priorityColors = { LOW: '#94a3b8', MEDIUM: '#2563eb', HIGH: '#d97706', CRITICAL: '#be123c' }

export default function TicketAnalytics({ trends, distributions }) {
  const hasTrend = trends.results.some((item) => item.submitted || item.resolved)
  const statuses = distributions.status.filter((item) => item.count > 0)
  const priorities = distributions.priority.filter((item) => item.count > 0)

  return (
    <section className="space-y-4" aria-labelledby="ticket-analytics-heading">
      <div>
        <h2 id="ticket-analytics-heading" className="text-lg font-semibold text-slate-900">Ticket analytics</h2>
        <p className="mt-1 text-xs text-slate-500">Submission demand and resolution output use their own event timestamps.</p>
      </div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <ReportCard title="Submitted and resolved trend" description={`Grouped by ${trends.granularity}. Resolution totals count distinct tickets.`}>
          {!hasTrend ? <ReportEmpty /> : (
            <div className="h-72" aria-label="Submitted and resolved ticket trend chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends.results} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#e8ece9" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatDate} minTickGap={30} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip labelFormatter={formatDate} contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
                  <Line type="monotone" dataKey="submitted" name="Submitted" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#15803d" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ReportCard>
        <ReportCard title="Current status distribution" description={distributions.definition} note="Current state">
          {!statuses.length ? <ReportEmpty /> : (
            <div className="h-72" aria-label="Current ticket status distribution chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statuses} dataKey="count" nameKey="label" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {statuses.map((item, index) => <Cell key={item.key} fill={statusColors[index % statusColors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(value, name, item) => [`${value} (${item.payload.percentage}%)`, name]} />
                  <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11 }} formatter={(value) => shortName(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ReportCard>
      </div>
      <ReportCard title="Priority distribution" description="Current priority of tickets submitted during the selected period." note="Current state">
        {!priorities.length ? <ReportEmpty /> : (
          <div className="h-64" aria-label="Ticket priority distribution chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorities} margin={{ top: 4, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#e8ece9" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value, name, item) => [`${value} (${item.payload.percentage}%)`, name]} />
                <Bar dataKey="count" name="Tickets" radius={[4, 4, 0, 0]}>{priorities.map((item) => <Cell key={item.key} fill={priorityColors[item.key] || '#64748b'} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ReportCard>
    </section>
  )
}
