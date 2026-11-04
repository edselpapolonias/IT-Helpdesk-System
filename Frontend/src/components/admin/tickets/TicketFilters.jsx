import { Search, SlidersHorizontal, X } from 'lucide-react'

const selectClass = 'h-10 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'

export default function TicketFilters({ filters, categories, onChange, onClear }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500"><SlidersHorizontal size={15} /> Search and filters</div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="relative md:col-span-2">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input value={filters.search} onChange={(event) => onChange('search', event.target.value)} placeholder="Search ID, issue, requester, or email" className="h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
        </label>
        <select value={filters.status} onChange={(event) => onChange('status', event.target.value)} className={selectClass} aria-label="Status"><option value="all">All statuses</option><option value="OPEN">Open</option><option value="ASSIGNED">Assigned</option><option value="IN_PROGRESS">In Progress</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select>
        <select value={filters.priority} onChange={(event) => onChange('priority', event.target.value)} className={selectClass} aria-label="Priority"><option value="all">All priorities</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select>
        <select value={filters.category} onChange={(event) => onChange('category', event.target.value)} className={selectClass} aria-label="Category"><option value="all">All categories</option>{categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}</select>
        <select value={filters.assignment} onChange={(event) => onChange('assignment', event.target.value)} className={selectClass} aria-label="Assignment"><option value="all">All assignments</option><option value="assigned">Assigned</option><option value="unassigned">Unassigned</option></select>
        <select value={filters.date} onChange={(event) => onChange('date', event.target.value)} className={selectClass} aria-label="Date range"><option value="all">All dates</option><option value="today">Today</option><option value="last_7">Last 7 days</option><option value="last_30">Last 30 days</option><option value="custom">Custom range</option></select>
        <select value={filters.ordering} onChange={(event) => onChange('ordering', event.target.value)} className={selectClass} aria-label="Sort tickets"><option value="-created_at">Newest first</option><option value="created_at">Oldest first</option><option value="priority">Highest priority</option><option value="-priority">Lowest priority</option><option value="-updated_at">Recently updated</option></select>
      </div>
      {filters.date === 'custom' && <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:max-w-xl"><label className="text-[11px] font-medium text-slate-500">From<input type="date" value={filters.date_from} onChange={(event) => onChange('date_from', event.target.value)} className={`${selectClass} mt-1 w-full`} /></label><label className="text-[11px] font-medium text-slate-500">To<input type="date" value={filters.date_to} onChange={(event) => onChange('date_to', event.target.value)} className={`${selectClass} mt-1 w-full`} /></label></div>}
      <div className="mt-4 flex justify-end"><button type="button" onClick={onClear} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700"><X size={14} /> Clear filters</button></div>
    </section>
  )
}
