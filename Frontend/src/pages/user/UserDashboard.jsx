import { Activity, CheckCircle2, FilePlus2, Inbox, Ticket } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import RecentTicketActivity from '../../components/user/dashboard/RecentTicketActivity'
import RecentUserTickets from '../../components/user/dashboard/RecentUserTickets'
import TicketStatusOverview from '../../components/user/dashboard/TicketStatusOverview'
import UserStatCard from '../../components/user/dashboard/UserStatCard'
import { useAuth } from '../../context/useAuth'
import { getApiError } from '../../services/api'
import { userDashboardService } from '../../services/userDashboardService'

const initialState = { data: null, loading: true, error: '' }

export default function UserDashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(initialState)
  const [recent, setRecent] = useState(initialState)
  const [activity, setActivity] = useState(initialState)

  const loadSummary = useCallback(async (signal) => { setSummary((current) => ({ ...current, loading: true, error: '' })); try { setSummary({ data: await userDashboardService.summary({ signal }), loading: false, error: '' }) } catch (error) { if (error.code !== 'ERR_CANCELED') setSummary((current) => ({ ...current, loading: false, error: getApiError(error, 'Unable to load your ticket summary.') })) } }, [])
  const loadRecent = useCallback(async (signal) => { setRecent((current) => ({ ...current, loading: true, error: '' })); try { setRecent({ data: await userDashboardService.recentTickets({ signal }), loading: false, error: '' }) } catch (error) { if (error.code !== 'ERR_CANCELED') setRecent((current) => ({ ...current, loading: false, error: getApiError(error, 'Unable to load your recent tickets.') })) } }, [])
  const loadActivity = useCallback(async (signal) => { setActivity((current) => ({ ...current, loading: true, error: '' })); try { setActivity({ data: await userDashboardService.recentActivity({ signal }), loading: false, error: '' }) } catch (error) { if (error.code !== 'ERR_CANCELED') setActivity((current) => ({ ...current, loading: false, error: getApiError(error, 'Unable to load recent activity.') })) } }, [])

  useEffect(() => { const controller = new AbortController(); const task = setTimeout(() => { loadSummary(controller.signal); loadRecent(controller.signal); loadActivity(controller.signal) }, 0); return () => { clearTimeout(task); controller.abort() } }, [loadSummary, loadRecent, loadActivity])

  const firstName = user?.name?.split(' ')[0]
  const cards = [
    ['Total Tickets', summary.data?.total, 'All support requests you have submitted.', Ticket, 'bg-slate-100 text-slate-700'],
    ['Open Tickets', summary.data?.open, 'Requests waiting for initial review.', Inbox, 'bg-amber-50 text-amber-700'],
    ['In Progress', summary.data?.in_progress, 'Requests currently being handled.', Activity, 'bg-blue-50 text-blue-700'],
    ['Resolved Tickets', summary.data?.resolved, 'Requests marked as resolved.', CheckCircle2, 'bg-emerald-50 text-emerald-700'],
  ]

  return <div className="mx-auto max-w-[1500px] space-y-6"><section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Support overview</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{firstName ? `Welcome, ${firstName}` : 'My Dashboard'}</h2><p className="mt-1.5 text-sm text-slate-600">Track your IT support requests and stay updated on their progress.</p></div><Link to="/user/tickets/new" className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white hover:bg-[#06492c]"><FilePlus2 size={16} /> Submit New Ticket</Link></section><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([title, value, description, Icon, tone]) => <UserStatCard key={title} title={title} value={value} description={description} icon={Icon} tone={tone} loading={summary.loading} />)}</section>{summary.error && <p className="text-xs font-medium text-red-600">{summary.error}</p>}<RecentUserTickets state={recent} onRetry={() => loadRecent()} /><section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]"><TicketStatusOverview state={summary} onRetry={() => loadSummary()} /><RecentTicketActivity state={activity} onRetry={() => loadActivity()} /></section></div>
}
