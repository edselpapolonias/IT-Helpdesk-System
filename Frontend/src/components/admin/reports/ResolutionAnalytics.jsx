import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ReportCard, { ReportEmpty } from './ReportCard'
import { chartTooltipStyle, formatDate, formatDuration, shortName } from './formatters'

function DurationTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const sample = payload[0].payload?.count
  return <div className="rounded-md border border-slate-200 bg-white p-2.5 text-xs shadow-sm"><p className="font-semibold text-slate-700">{label}</p><p className="mt-1 text-emerald-700">{formatDuration(payload[0].value)}</p>{sample !== undefined && <p className="mt-1 text-slate-500">Sample: {sample} first resolutions</p>}</div>
}

export default function ResolutionAnalytics({ resolution }) {
  const hasDistribution = resolution.distribution.some((item) => item.count > 0)
  return (
    <section className="space-y-4" aria-labelledby="resolution-analytics-heading">
      <div><h2 id="resolution-analytics-heading" className="text-lg font-semibold text-slate-900">Resolution analytics</h2><p className="mt-1 text-xs text-slate-500">{resolution.definition}</p></div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <ReportCard title="First-resolution duration distribution" description="Only valid first resolution records within the selected period are included.">
          {!hasDistribution ? <ReportEmpty /> : <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={resolution.distribution} margin={{ top: 4, right: 10, left: -18, bottom: 36 }}><CartesianGrid stroke="#e8ece9" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" angle={-20} textAnchor="end" height={65} interval={0} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={chartTooltipStyle} /><Bar dataKey="count" name="First resolutions" fill="#087747" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>}
        </ReportCard>
        <ReportCard title="Average first resolution by category" description="Sample size is shown in each tooltip.">
          {!resolution.by_category.length ? <ReportEmpty /> : <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={resolution.by_category.slice(0, 10)} layout="vertical" margin={{ top: 4, right: 20, left: 22, bottom: 0 }}><CartesianGrid stroke="#e8ece9" strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tickFormatter={(value) => formatDuration(value)} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" width={105} tickFormatter={(value) => shortName(value, 15)} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip content={<DurationTooltip />} /><Bar dataKey="average_resolution_seconds" name="Average first resolution" fill="#2563eb" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>}
        </ReportCard>
      </div>
      <ReportCard title="Resolution-time trend" description={`Average first-resolution duration grouped by ${resolution.granularity}.`}>
        {!resolution.trends.length ? <ReportEmpty /> : <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={resolution.trends} margin={{ top: 5, right: 12, left: 4, bottom: 0 }}><CartesianGrid stroke="#e8ece9" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tickFormatter={formatDate} minTickGap={30} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => formatDuration(value)} width={62} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip content={<DurationTooltip />} /><Line type="monotone" dataKey="average_resolution_seconds" name="Average first resolution" stroke="#087747" strokeWidth={2} dot={false} activeDot={{ r: 4 }} /></LineChart></ResponsiveContainer></div>}
      </ReportCard>
    </section>
  )
}
