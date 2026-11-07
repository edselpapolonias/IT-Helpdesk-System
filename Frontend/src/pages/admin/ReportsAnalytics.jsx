import { AlertTriangle, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import BacklogAnalytics from '../../components/admin/reports/BacklogAnalytics'
import CategoryAnalytics from '../../components/admin/reports/CategoryAnalytics'
import InsightsPanel from '../../components/admin/reports/InsightsPanel'
import ReportsFilters from '../../components/admin/reports/ReportsFilters'
import ReportsHeader from '../../components/admin/reports/ReportsHeader'
import ReportsKPIs from '../../components/admin/reports/ReportsKPIs'
import ResolutionAnalytics from '../../components/admin/reports/ResolutionAnalytics'
import TechnicianAnalytics from '../../components/admin/reports/TechnicianAnalytics'
import TicketAnalytics from '../../components/admin/reports/TicketAnalytics'
import { getApiError } from '../../services/api'
import { reportsService } from '../../services/reportsService'

const defaultFilters = {
  date_range: 'last_30_days',
  date_from: '',
  date_to: '',
  category: 'all',
  priority: 'all',
  technician: 'all',
  status: 'all',
  compare: false,
}

function readFilters(searchParams) {
  return {
    ...defaultFilters,
    date_range: searchParams.get('date_range') || defaultFilters.date_range,
    date_from: searchParams.get('date_from') || '',
    date_to: searchParams.get('date_to') || '',
    category: searchParams.get('category') || 'all',
    priority: searchParams.get('priority') || 'all',
    technician: searchParams.get('technician') || 'all',
    status: searchParams.get('status') || 'all',
    compare: searchParams.get('compare') === 'true',
  }
}

function queryFor(filters) {
  const values = Object.entries(filters).filter(([key, value]) => {
    if (key === 'compare') return value
    if (key === 'date_from' || key === 'date_to') return filters.date_range === 'custom' && value
    return value !== '' && value !== 'all'
  })
  return new URLSearchParams(values.map(([key, value]) => [key, String(value)]))
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function appliedFilterLabels(metadata, filters) {
  if (!metadata || !filters) return []
  const category = metadata.categories?.find((item) => item.slug === filters.category)?.name || 'All categories'
  const priority = metadata.priorities?.find((item) => item.value === filters.priority)?.label || 'All priorities'
  const technician = metadata.technicians?.find((item) => item.id === filters.technician)?.name || 'All technicians'
  const status = metadata.statuses?.find((item) => item.value === filters.status)?.label || 'All statuses'
  return [category, priority, technician, status]
}

export default function ReportsAnalytics() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [initialFilters] = useState(() => readFilters(searchParams))
  const [metadata, setMetadata] = useState(null)
  const [appliedFilters, setAppliedFilters] = useState(initialFilters)
  const [draftFilters, setDraftFilters] = useState(initialFilters)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [error, setError] = useState('')
  const [filterError, setFilterError] = useState('')
  const [exporting, setExporting] = useState('')
  const [exportError, setExportError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    reportsService.getMetadata({ signal: controller.signal })
      .then(setMetadata)
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') setError(getApiError(requestError, 'Report filters could not be loaded.'))
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    reportsService.getAnalytics(appliedFilters, { signal: controller.signal })
      .then(setReport)
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') setError(getApiError(requestError, 'The report could not be generated.'))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [appliedFilters, refreshKey])

  function applyFilters() {
    if (draftFilters.date_range === 'custom') {
      if (!draftFilters.date_from || !draftFilters.date_to) {
        setFilterError('Choose both a start date and an end date for a custom report.')
        return
      }
      if (draftFilters.date_from > draftFilters.date_to) {
        setFilterError('The end date must be on or after the start date.')
        return
      }
    }
    setFilterError('')
    setError('')
    setLoading(true)
    setAppliedFilters({ ...draftFilters })
    setSearchParams(queryFor(draftFilters), { replace: true })
  }

  function clearFilters() {
    setFilterError('')
    setError('')
    setLoading(true)
    setDraftFilters(defaultFilters)
    setAppliedFilters(defaultFilters)
    setSearchParams({}, { replace: true })
  }

  async function exportReport(type) {
    setExporting(type)
    setExportError('')
    try {
      const blob = type === 'csv'
        ? await reportsService.exportCsv(appliedFilters)
        : await reportsService.exportPdf(appliedFilters)
      const date = new Date().toISOString().slice(0, 10)
      triggerDownload(blob, type === 'csv' ? `SAM_IT_Service_Tickets_${date}.csv` : `SAM_IT_Service_Report_${date}.pdf`)
    } catch (requestError) {
      setExportError(getApiError(requestError, `The ${type.toUpperCase()} export could not be created.`))
    } finally {
      setExporting('')
    }
  }

  function refreshReport() {
    setError('')
    setLoading(true)
    setRefreshKey((key) => key + 1)
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <ReportsHeader report={report} refreshing={loading} exporting={exporting} onRefresh={refreshReport} onExport={exportReport} />

      {metadata ? <ReportsFilters metadata={metadata} value={draftFilters} onChange={setDraftFilters} onApply={applyFilters} onClear={clearFilters} /> : <div className="h-40 animate-pulse rounded-lg bg-slate-100" />}
      {report && metadata && <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500"><span className="font-semibold uppercase tracking-wide">Applied filters</span>{appliedFilterLabels(metadata, report.filters).map((label, index) => <span key={`${index}-${label}`} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-600">{label}</span>)}{report.filters.compare && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">Previous-period comparison</span>}</div>}
      {filterError && <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">{filterError}</p>}
      {exportError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">{exportError}</p>}

      {loading && !report ? (
        <div className="grid min-h-80 place-items-center rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500"><LoaderCircle size={19} className="animate-spin text-emerald-700" /> Generating report from recorded ticket data…</div>
        </div>
      ) : error ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50/50 p-6 text-center">
          <AlertTriangle size={24} className="text-red-500" />
          <p className="mt-3 text-sm font-semibold text-red-800">{error}</p>
          <button type="button" onClick={refreshReport} className="mt-4 rounded-md border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">Try again</button>
        </div>
      ) : report ? (
        <div className={`space-y-10 transition-opacity ${loading ? 'pointer-events-none opacity-55' : 'opacity-100'}`} aria-busy={loading}>
          <ReportsKPIs overview={report.overview} />
          <TicketAnalytics trends={report.trends} distributions={report.distributions} />
          <CategoryAnalytics categories={report.categories} />
          <TechnicianAnalytics technicians={report.technicians} />
          <ResolutionAnalytics resolution={report.resolution} />
          <BacklogAnalytics backlog={report.backlog} />
          <InsightsPanel insights={report.insights} limitations={report.limitations} />
        </div>
      ) : null}
    </div>
  )
}
