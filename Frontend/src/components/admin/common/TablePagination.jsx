import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function TablePagination({ count, page, pageSize, onPageChange, itemLabel = 'items' }) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  const firstItem = count === 0 ? 0 : (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, count)
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p>Showing <span className="font-semibold text-slate-700">{firstItem}-{lastItem}</span> of <span className="font-semibold text-slate-700">{count}</span> {itemLabel}</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={14} /> Previous</button>
        <span className="px-2 font-medium text-slate-600">Page {page} of {totalPages}</span>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next <ChevronRight size={14} /></button>
      </div>
    </div>
  )
}
