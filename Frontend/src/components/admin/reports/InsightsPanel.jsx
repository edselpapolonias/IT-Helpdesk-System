import { AlertTriangle, ArrowUpRight, CheckCircle2, Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const styles = {
  critical: { icon: AlertTriangle, shell: 'border-red-200 bg-red-50/60', iconTone: 'text-red-600' },
  warning: { icon: AlertTriangle, shell: 'border-amber-200 bg-amber-50/60', iconTone: 'text-amber-600' },
  info: { icon: Info, shell: 'border-blue-200 bg-blue-50/60', iconTone: 'text-blue-600' },
  neutral: { icon: CheckCircle2, shell: 'border-slate-200 bg-slate-50', iconTone: 'text-slate-500' },
}

export default function InsightsPanel({ insights, limitations }) {
  const navigate = useNavigate()
  return (
    <section className="space-y-4" aria-labelledby="insights-heading">
      <div><h2 id="insights-heading" className="text-lg font-semibold text-slate-900">Operational insights</h2><p className="mt-1 text-xs text-slate-500">Deterministic findings generated only when the filtered records meet defined evidence thresholds.</p></div>
      <div className="grid gap-4 lg:grid-cols-2">
        {insights.map((insight, index) => {
          const style = styles[insight.severity] || styles.neutral
          const Icon = style.icon
          return <article key={`${insight.title}-${index}`} className={`rounded-lg border p-5 ${style.shell}`}><div className="flex items-start gap-3"><Icon size={19} className={`mt-0.5 shrink-0 ${style.iconTone}`} /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-slate-900">{insight.title}</h3><span className="rounded bg-white/80 px-2 py-0.5 text-[10px] font-bold text-slate-600">{insight.metric}</span></div><p className="mt-2 text-xs leading-5 text-slate-600">{insight.explanation}</p><p className="mt-2 text-xs font-medium leading-5 text-slate-700">Recommended: {insight.recommendation}</p><button type="button" onClick={() => navigate(insight.link)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline">Review records <ArrowUpRight size={13} /></button></div></div></article>
        })}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5"><h3 className="text-sm font-semibold text-slate-900">Metric boundaries</h3><ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">{limitations.map((item) => <li key={item} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" />{item}</li>)}</ul></div>
    </section>
  )
}
