import { Search, SlidersHorizontal, X } from 'lucide-react'

const selectClass = 'h-10 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'

export default function TroubleshootingFilters({ filters, onChange, onClear }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500"><SlidersHorizontal size={15} /> Search and filters</div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="relative md:col-span-2"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input value={filters.search} onChange={(event) => onChange('search', event.target.value)} placeholder="Search action, diagnosis, notes, or issue" className="h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
        <input value={filters.ticket} onChange={(event) => onChange('ticket', event.target.value)} placeholder="Filter by ticket ID" className="h-10 rounded-md border border-slate-200 px-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
        <select value={filters.visibility} onChange={(event) => onChange('visibility', event.target.value)} className={selectClass} aria-label="Visibility"><option value="all">All visibility</option><option value="INTERNAL">Internal notes</option><option value="REQUESTER_VISIBLE">Requester visible</option></select>
        <label className="text-[11px] font-medium text-slate-500">From<input type="date" value={filters.date_from} onChange={(event) => onChange('date_from', event.target.value)} className={`${selectClass} mt-1 w-full`} /></label>
        <label className="text-[11px] font-medium text-slate-500">To<input type="date" value={filters.date_to} onChange={(event) => onChange('date_to', event.target.value)} className={`${selectClass} mt-1 w-full`} /></label>
        <select value={filters.ordering} onChange={(event) => onChange('ordering', event.target.value)} className={`${selectClass} self-end`} aria-label="Sort troubleshooting logs"><option value="-created_at">Newest first</option><option value="created_at">Oldest first</option><option value="ticket">Ticket ID</option></select>
      </div>
      <div className="mt-4 flex justify-end"><button type="button" onClick={onClear} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700"><X size={14} /> Clear filters</button></div>
    </section>
  )
}
