import { CheckCircle2, ClipboardList, Clock3, PlayCircle, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AssignedTicketsPreview from '../../components/technician/dashboard/AssignedTicketsPreview'
import PriorityAttention from '../../components/technician/dashboard/PriorityAttention'
import RecentWorkActivity from '../../components/technician/dashboard/RecentWorkActivity'
import TechnicianStatCard from '../../components/technician/dashboard/TechnicianStatCard'
import { useAuth } from '../../context/useAuth'
import { getApiError } from '../../services/api'
import { technicianDashboardService } from '../../services/technicianDashboardService'

const initialState = { data: null, loading: true, error: '' }

export default function TechnicianDashboard() {
  const { user } = useAuth()
  const [days, setDays] = useState(30)
  const [summary, setSummary] = useState(initialState)
  const [recent, setRecent] = useState(initialState)
  const [attention, setAttention] = useState(initialState)
  const [activity, setActivity] = useState(initialState)

  const loadSummary = useCallback(async (signal) => {
    setSummary((current) => ({ ...current, loading: true, error: '' }))
    try {
      setSummary({ data: await technicianDashboardService.summary(days, { signal }), loading: false, error: '' })
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') setSummary((current) => ({ ...current, loading: false, error: getApiError(error, 'Unable to load workload statistics.') }))
    }
  }, [days])

  const loadRecent = useCallback(async (signal) => {
    setRecent((current) => ({ ...current, loading: true, error: '' }))
    try {
      setRecent({ data: await technicianDashboardService.recentTickets({ signal }), loading: false, error: '' })
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') setRecent((current) => ({ ...current, loading: false, error: getApiError(error, 'Unable to load assigned tickets.') }))
    }
  }, [])

  const loadAttention = useCallback(async (signal) => {
    setAttention((current) => ({ ...current, loading: true, error: '' }))
    try {
      setAttention({ data: await technicianDashboardService.attention({ signal }), loading: false, error: '' })
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') setAttention((current) => ({ ...current, loading: false, error: getApiError(error, 'Unable to load attention tickets.') }))
    }
  }, [])

  const loadActivity = useCallback(async (signal) => {
    setActivity((current) => ({ ...current, loading: true, error: '' }))
    try {
      setActivity({ data: await technicianDashboardService.activity({ signal }), loading: false, error: '' })
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') setActivity((current) => ({ ...current, loading: false, error: getApiError(error, 'Unable to load recent work activity.') }))
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const task = setTimeout(() => {
      loadSummary(controller.signal)
      loadRecent(controller.signal)
      loadAttention(controller.signal)
      loadActivity(controller.signal)
    }, 0)
    return () => {
      clearTimeout(task)
      controller.abort()
    }
  }, [loadSummary, loadRecent, loadAttention, loadActivity])

  function refreshAll() {
    loadSummary()
    loadRecent()
    loadAttention()
    loadActivity()
  }

  const firstName = user?.name?.split(' ')[0]
  const cards = [
    ['Total Assigned Tickets', summary.data?.total_assigned, 'All tickets whose current assignment belongs to you.', ClipboardList, 'slate'],
    ['Pending Tickets', summary.data?.pending, 'Assigned or reopened requests waiting for work.', Clock3, 'amber'],
    ['In Progress Tickets', summary.data?.in_progress, 'Requests you are actively working on.', PlayCircle, 'blue'],
    ['Resolved Tickets', summary.data?.resolved, summary.data?.definitions?.resolved || 'Resolved by you during the selected period.', CheckCircle2, 'emerald'],
    ['Completed Tickets', summary.data?.completed, summary.data?.definitions?.completed || 'Closed after your latest resolution.', CheckCircle2, 'green'],
  ]
  const refreshing = summary.loading || recent.loading || attention.loading || activity.loading

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Technical support workspace</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{firstName ? `Welcome, ${firstName}` : 'Technician Dashboard'}</h2><p className="mt-1.5 text-sm text-slate-600">Monitor your assigned support tickets and manage technical support activities.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600">Reporting period<select value={days} onChange={(event) => setDays(Number(event.target.value))} className="border-0 bg-transparent text-xs font-semibold text-slate-800 outline-none"><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label>
          <button type="button" onClick={refreshAll} disabled={refreshing} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh</button>
          <Link to="/technician/tickets" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white hover:bg-[#06492c]"><ClipboardList size={16} /> View My Tickets</Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([title, value, description, Icon, tone]) => <TechnicianStatCard key={title} title={title} value={value} description={description} icon={Icon} tone={tone} loading={summary.loading} error={summary.error} />)}
      </section>

      <AssignedTicketsPreview state={recent} onRetry={() => loadRecent()} />

      <section className="grid items-start gap-6 xl:grid-cols-2">
        <PriorityAttention state={attention} onRetry={() => loadAttention()} />
        <RecentWorkActivity state={activity} onRetry={() => loadActivity()} />
      </section>
    </div>
  )
}
