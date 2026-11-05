import { AlertTriangle } from 'lucide-react'

const tones = {
  slate: 'bg-slate-100 text-slate-700',
  amber: 'bg-amber-50 text-amber-700',
  blue: 'bg-blue-50 text-blue-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  green: 'bg-green-50 text-green-700',
}

export default function TechnicianStatCard({ title, value, description, icon: Icon, tone, loading, error }) {
  return (
    <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase leading-4 tracking-[0.07em] text-slate-500">{title}</p>
          {loading ? <div className="mt-3 h-9 w-16 animate-pulse rounded bg-slate-100" /> : error ? <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-red-600"><AlertTriangle size={15} /> Unavailable</p> : <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value ?? 0}</p>}
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${tones[tone]}`}><Icon size={21} /></span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>
    </article>
  )
}
