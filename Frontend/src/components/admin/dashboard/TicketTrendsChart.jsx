import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EmptyState, SectionError, SectionSkeleton } from './SectionState'

const shortDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})

function formatDate(value) {
  return shortDate.format(new Date(`${value}T00:00:00`))
}

export default function TicketTrendsChart({ state, onRetry }) {
  const data = state.data?.results || []
  const hasActivity = data.some((item) => item.submitted || item.resolved)

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Ticket trends</h2>
        <p className="mt-1 text-xs text-slate-500">Submitted compared with resolved tickets.</p>
      </div>
      <div className="mt-6">
        {state.loading ? (
          <SectionSkeleton height="h-72" />
        ) : state.error ? (
          <SectionError message={state.error} onRetry={onRetry} />
        ) : !hasActivity ? (
          <EmptyState
            title="No ticket activity for this period"
            description="Submitted and resolved tickets will appear here."
          />
        ) : (
          <div className="h-72 w-full" aria-label="Ticket trends chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#e8ece9" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={28}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={formatDate}
                  contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
                <Line
                  type="monotone"
                  dataKey="submitted"
                  name="Submitted"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="resolved"
                  name="Resolved"
                  stroke="#15803d"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  )
}
