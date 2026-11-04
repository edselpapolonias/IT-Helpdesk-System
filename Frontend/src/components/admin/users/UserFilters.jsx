import { Search, SlidersHorizontal, X } from 'lucide-react'

export default function UserFilters({ filters, onChange, onClear }) {
  const hasFilters =
    filters.search ||
    filters.status !== 'all' ||
    filters.ordering !== '-date_joined' ||
    filters.date_from ||
    filters.date_to

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <SlidersHorizontal size={17} className="text-emerald-700" />
        Search and filters
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(240px,1.5fr)_repeat(4,minmax(130px,0.7fr))_auto]">
        <label className="relative block">
          <span className="sr-only">Search users</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            type="search"
            value={filters.search}
            onChange={(event) => onChange('search', event.target.value)}
            placeholder="Search name or email"
            className="h-10 w-full rounded-md border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <label>
          <span className="sr-only">Account status</span>
          <select
            value={filters.status}
            onChange={(event) => onChange('status', event.target.value)}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-emerald-600"
          >
            <option value="all">All users</option>
            <option value="active">Active users</option>
            <option value="inactive">Inactive users</option>
          </select>
        </label>

        <label>
          <span className="sr-only">Sort users</span>
          <select
            value={filters.ordering}
            onChange={(event) => onChange('ordering', event.target.value)}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-emerald-600"
          >
            <option value="-date_joined">Newest first</option>
            <option value="date_joined">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="-name">Name Z–A</option>
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="shrink-0 text-[11px] font-medium text-slate-500 lg:hidden">From</span>
          <input
            type="date"
            value={filters.date_from}
            onChange={(event) => onChange('date_from', event.target.value)}
            aria-label="Registration start date"
            className="h-10 w-full rounded-md border border-slate-200 px-3 text-xs text-slate-700 outline-none focus:border-emerald-600"
          />
        </label>

        <label className="flex items-center gap-2">
          <span className="shrink-0 text-[11px] font-medium text-slate-500 lg:hidden">To</span>
          <input
            type="date"
            value={filters.date_to}
            onChange={(event) => onChange('date_to', event.target.value)}
            aria-label="Registration end date"
            className="h-10 w-full rounded-md border border-slate-200 px-3 text-xs text-slate-700 outline-none focus:border-emerald-600"
          />
        </label>

        <button
          type="button"
          onClick={onClear}
          disabled={!hasFilters}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X size={15} /> Clear
        </button>
      </div>
      <div className="mt-2 hidden grid-cols-[minmax(240px,1.5fr)_repeat(4,minmax(130px,0.7fr))_auto] gap-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 lg:grid">
        <span />
        <span>Status</span>
        <span>Sort</span>
        <span>Registered from</span>
        <span>Registered to</span>
        <span />
      </div>
    </section>
  )
}
