import { Filter, RotateCcw } from 'lucide-react'

const selectClass = 'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'

export default function ReportsFilters({ metadata, value, onChange, onApply, onClear }) {
  function update(field, nextValue) {
    onChange({ ...value, [field]: nextValue })
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Filter size={16} className="text-emerald-700" /> Report filters
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <label className="space-y-1.5 text-xs font-semibold text-slate-600">
          Date range
          <select className={selectClass} value={value.date_range} onChange={(event) => update('date_range', event.target.value)}>
            {metadata.date_ranges?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        {value.date_range === 'custom' ? (
          <>
            <label className="space-y-1.5 text-xs font-semibold text-slate-600">
              Start date
              <input type="date" className={selectClass} value={value.date_from} onChange={(event) => update('date_from', event.target.value)} />
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-slate-600">
              End date
              <input type="date" className={selectClass} value={value.date_to} onChange={(event) => update('date_to', event.target.value)} />
            </label>
          </>
        ) : null}
        <label className="space-y-1.5 text-xs font-semibold text-slate-600">
          Category
          <select className={selectClass} value={value.category} onChange={(event) => update('category', event.target.value)}>
            <option value="all">All categories</option>
            {metadata.categories?.map((option) => <option key={option.id} value={option.slug}>{option.name}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-semibold text-slate-600">
          Priority
          <select className={selectClass} value={value.priority} onChange={(event) => update('priority', event.target.value)}>
            <option value="all">All priorities</option>
            {metadata.priorities?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-semibold text-slate-600">
          Technician
          <select className={selectClass} value={value.technician} onChange={(event) => update('technician', event.target.value)}>
            <option value="all">All technicians</option>
            {metadata.technicians?.map((option) => <option key={option.id} value={option.id}>{option.name}{option.is_active ? '' : ' (Inactive)'}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-semibold text-slate-600">
          Current status
          <select className={selectClass} value={value.status} onChange={(event) => update('status', event.target.value)}>
            <option value="all">All statuses</option>
            {metadata.statuses?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            checked={value.compare}
            onChange={(event) => update('compare', event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
          />
          Compare key metrics with the previous equivalent period
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={onClear} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <RotateCcw size={14} /> Clear
          </button>
          <button type="button" onClick={onApply} className="h-9 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white hover:bg-[#06492c]">
            Apply filters
          </button>
        </div>
      </div>
    </section>
  )
}
