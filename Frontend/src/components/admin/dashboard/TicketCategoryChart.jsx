import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EmptyState, SectionError, SectionSkeleton } from './SectionState'

export default function TicketCategoryChart({ state, onRetry }) {
  const data = state.data?.results || []
  const hasTickets = data.some((category) => category.count > 0)

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Tickets by category</h2>
        <p className="mt-1 text-xs text-slate-500">Reported issues grouped by support category.</p>
      </div>
      <div className="mt-6">
        {state.loading ? (
          <SectionSkeleton height="h-72" />
        ) : state.error ? (
          <SectionError message={state.error} onRetry={onRetry} />
        ) : !hasTickets ? (
          <EmptyState
            title="No categorized tickets yet"
            description="Category totals will appear after tickets are submitted."
          />
        ) : (
          <div className="h-72 w-full" aria-label="Ticket category chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 38 }}>
                <CartesianGrid stroke="#e8ece9" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  angle={-25}
                  textAnchor="end"
                  height={70}
                  interval={0}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f3' }}
                  contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="count" name="Tickets" fill="#087747" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  )
}
