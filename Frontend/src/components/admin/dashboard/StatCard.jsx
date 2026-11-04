import { AlertTriangle } from 'lucide-react'

export default function StatCard({ title, value, icon: Icon, tone, loading, error }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
  }

  return (
    <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="min-h-8 text-xs font-semibold uppercase leading-4 tracking-[0.08em] text-slate-500">
            {title}
          </p>
          {loading ? (
            <div className="mt-3 h-9 w-20 animate-pulse rounded bg-slate-100" />
          ) : error ? (
            <div className="mt-3 flex items-center gap-2 text-sm font-medium text-red-600">
              <AlertTriangle size={16} /> Unavailable
            </div>
          ) : (
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {value ?? 0}
            </p>
          )}
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${tones[tone]}`}>
          <Icon size={21} strokeWidth={1.9} />
        </span>
      </div>
    </article>
  )
}
