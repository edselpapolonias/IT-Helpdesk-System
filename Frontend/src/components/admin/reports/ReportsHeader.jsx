import { CalendarDays, Download, FileText, RefreshCw } from 'lucide-react'
import { formatDate, formatDateTime } from './formatters'

export default function ReportsHeader({ report, refreshing, exporting, onRefresh, onExport }) {
  const filters = report?.filters
  return (
    <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports &amp; Analytics</h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Analyze support performance, identify recurring issues, and improve IT service efficiency.
        </p>
        {filters && (
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-500">
            <CalendarDays size={15} />
            {formatDate(filters.date_from)} – {formatDate(filters.date_to)}
            <span className="text-slate-300">•</span>
            Generated {formatDateTime(report.generated_at)}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
        <button
          type="button"
          onClick={() => onExport('csv')}
          disabled={Boolean(exporting)}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-700 bg-white px-3.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60"
        >
          <Download size={15} /> {exporting === 'csv' ? 'Preparing…' : 'Export CSV'}
        </button>
        <button
          type="button"
          onClick={() => onExport('pdf')}
          disabled={Boolean(exporting)}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-[#075b35] px-3.5 text-xs font-semibold text-white hover:bg-[#06492c] disabled:cursor-wait disabled:opacity-60"
        >
          <FileText size={15} /> {exporting === 'pdf' ? 'Preparing…' : 'Export PDF'}
        </button>
      </div>
    </section>
  )
}
