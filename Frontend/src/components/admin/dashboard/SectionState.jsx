import { AlertTriangle, Inbox, RotateCcw } from 'lucide-react'

export function SectionError({ message, onRetry }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-md border border-dashed border-red-200 bg-red-50/50 p-6 text-center">
      <AlertTriangle size={22} className="text-red-500" />
      <p className="mt-2 text-sm font-medium text-red-800">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
      >
        <RotateCcw size={14} /> Retry
      </button>
    </div>
  )
}

export function EmptyState({ title, description }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center p-6 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-400">
        <Inbox size={20} />
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-700">{title}</p>
      {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
    </div>
  )
}

export function SectionSkeleton({ height = 'h-64' }) {
  return (
    <div className={`${height} animate-pulse rounded-md bg-slate-100`} aria-label="Loading" />
  )
}
