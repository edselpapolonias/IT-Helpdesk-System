import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Inbox,
  RefreshCw,
  Ticket,
  UserRoundX,
  AlertOctagon,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import QuickActions from '../../components/admin/dashboard/QuickActions'
import RecentTicketsTable from '../../components/admin/dashboard/RecentTicketsTable'
import StatCard from '../../components/admin/dashboard/StatCard'
import TechnicianWorkload from '../../components/admin/dashboard/TechnicianWorkload'
import TicketCategoryChart from '../../components/admin/dashboard/TicketCategoryChart'
import TicketTrendsChart from '../../components/admin/dashboard/TicketTrendsChart'
import TicketsAttention from '../../components/admin/dashboard/TicketsAttention'
import { adminDashboardService } from '../../services/adminDashboardService'
import { getApiError } from '../../services/api'

const sectionKeys = ['summary', 'trends', 'categories', 'recent', 'attention', 'workload']
const currentDate = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'long',
  timeZone: 'Asia/Manila',
}).format(new Date())

function initialSections() {
  return Object.fromEntries(
    sectionKeys.map((key) => [key, { data: null, loading: true, error: '' }]),
  )
}

export default function AdminDashboard() {
  const [days, setDays] = useState(30)
  const [sections, setSections] = useState(initialSections)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const getLoader = useCallback(
    (key, signal) => {
      const config = { signal }
      const loaders = {
        summary: () => adminDashboardService.getSummary(config),
        trends: () => adminDashboardService.getTicketTrends(days, config),
        categories: () => adminDashboardService.getTicketCategories(days, config),
        recent: () => adminDashboardService.getRecentTickets(config),
        attention: () => adminDashboardService.getAttention(config),
        workload: () => adminDashboardService.getTechnicianWorkload(days, config),
      }
      return loaders[key]
    },
    [days],
  )

  const loadSection = useCallback(
    async (key, signal) => {
      setSections((current) => ({
        ...current,
        [key]: { ...current[key], loading: true, error: '' },
      }))
      try {
        const data = await getLoader(key, signal)()
        setSections((current) => ({
          ...current,
          [key]: { data, loading: false, error: '' },
        }))
      } catch (error) {
        if (error.code === 'ERR_CANCELED') return
        setSections((current) => ({
          ...current,
          [key]: {
            ...current[key],
            loading: false,
            error: getApiError(error, 'This dashboard section could not be loaded.'),
          },
        }))
      }
    },
    [getLoader],
  )

  const loadAll = useCallback(
    async (signal) => {
      await Promise.allSettled(sectionKeys.map((key) => loadSection(key, signal)))
    },
    [loadSection],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadAll(controller.signal)
    return () => controller.abort()
  }, [loadAll])

  async function refreshDashboard() {
    setIsRefreshing(true)
    await loadAll()
    setIsRefreshing(false)
  }

  const summary = sections.summary.data || {}
  const statCards = [
    { title: 'Total tickets', value: summary.total, icon: Ticket, tone: 'emerald' },
    { title: 'Open tickets', value: summary.open, icon: Inbox, tone: 'slate' },
    { title: 'In progress', value: summary.in_progress, icon: Activity, tone: 'blue' },
    { title: 'Resolved tickets', value: summary.resolved, icon: CheckCircle2, tone: 'green' },
    { title: 'Critical tickets', value: summary.critical, icon: AlertOctagon, tone: 'violet' },
    { title: 'Unassigned tickets', value: summary.unassigned, icon: UserRoundX, tone: 'amber' },
  ]

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard overview</h2>
          <p className="mt-1.5 text-sm text-slate-600">
            Monitor helpdesk tickets, technician activities, and IT support performance.
          </p>
          <p className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500">
            <CalendarDays size={15} /> {currentDate}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="date-range" className="text-xs font-semibold text-slate-500">
            Analytics period
          </label>
          <select
            id="date-range"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            type="button"
            onClick={refreshDashboard}
            disabled={isRefreshing}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white hover:bg-[#06492c] disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Ticket statistics">
        {statCards.map((card) => (
          <StatCard
            key={card.title}
            {...card}
            loading={sections.summary.loading}
            error={sections.summary.error}
          />
        ))}
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-2">
        <TicketTrendsChart
          state={sections.trends}
          onRetry={() => loadSection('trends')}
        />
        <TicketCategoryChart
          state={sections.categories}
          onRetry={() => loadSection('categories')}
        />
      </section>

      <RecentTicketsTable
        state={sections.recent}
        onRetry={() => loadSection('recent')}
      />

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.7fr)]">
        <TechnicianWorkload
          state={sections.workload}
          activeTechnicians={summary.active_technicians}
          onRetry={() => loadSection('workload')}
        />
        <TicketsAttention
          state={sections.attention}
          onRetry={() => loadSection('attention')}
        />
      </section>

      <QuickActions />
    </div>
  )
}
