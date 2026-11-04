import { Search, SlidersHorizontal, X } from 'lucide-react'
import { SPECIALIZATIONS, WORKLOAD_LEVELS } from './constants'

export default function TechnicianFilters({ filters, onChange, onClear }) {
  const hasFilters = filters.search || filters.status !== 'all' || filters.specialization || filters.workload !== 'all' || filters.ordering !== 'name'
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><SlidersHorizontal size={17} className="text-emerald-700" />Search and filters</div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(230px,1.3fr)_repeat(4,minmax(150px,0.8fr))_auto]">
        <label className="relative block"><span className="sr-only">Search technicians</span><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input type="search" value={filters.search} onChange={(event) => onChange('search', event.target.value)} placeholder="Search name, email, specialization" className="h-10 w-full rounded-md border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
        <select value={filters.status} onChange={(event) => onChange('status', event.target.value)} aria-label="Account status" className="h-10 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-emerald-600"><option value="all">All technicians</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        <select value={filters.specialization} onChange={(event) => onChange('specialization', event.target.value)} aria-label="Specialization" className="h-10 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-emerald-600"><option value="">All specializations</option>{SPECIALIZATIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        <select value={filters.workload} onChange={(event) => onChange('workload', event.target.value)} aria-label="Workload level" className="h-10 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-emerald-600">{WORKLOAD_LEVELS.map((item) => <option key={item.value} value={item.value}>{item.label}{item.description ? ` (${item.description})` : ''}</option>)}</select>
        <select value={filters.ordering} onChange={(event) => onChange('ordering', event.target.value)} aria-label="Sort technicians" className="h-10 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-emerald-600"><option value="name">Name A–Z</option><option value="-name">Name Z–A</option><option value="-date_joined">Newest first</option><option value="date_joined">Oldest first</option><option value="-active_tickets">Most active tickets</option><option value="active_tickets">Fewest active tickets</option></select>
        <button type="button" onClick={onClear} disabled={!hasFilters} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"><X size={15} /> Clear</button>
      </div>
      <p className="mt-3 text-[11px] text-slate-400">Workload rules: none 0 · light 1–3 · moderate 4–6 · heavy 7+ active tickets.</p>
    </section>
  )
}
