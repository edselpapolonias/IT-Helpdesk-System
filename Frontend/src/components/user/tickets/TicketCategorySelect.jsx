import { ChevronDown } from 'lucide-react'

const baseClass =
  'h-11 w-full appearance-none rounded-md border bg-white px-3 pr-10 text-sm text-slate-800 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10 disabled:cursor-wait disabled:bg-slate-50'

export default function TicketCategorySelect({
  value,
  onChange,
  categories,
  loading,
  error,
}) {
  return (
    <div>
      <label htmlFor="ticket-category" className="text-sm font-semibold text-slate-700">
        Category <span className="text-red-600">*</span>
      </label>
      <div className="relative mt-2">
        <select
          id="ticket-category"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={loading}
          aria-invalid={Boolean(error)}
          className={`${baseClass} ${error ? 'border-red-400' : 'border-slate-300'}`}
        >
          <option value="">{loading ? 'Loading categories...' : 'Select a category'}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}
