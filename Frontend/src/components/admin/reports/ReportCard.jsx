import { Inbox } from 'lucide-react'

export default function ReportCard({ title, description, note, children, className = '' }) {
  return (
    <section className={`min-w-0 rounded-lg border border-slate-200 bg-white p-5 sm:p-6 ${className}`}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
        </div>
        {note && (
          <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {note}
          </span>
        )}
      </div>
      <div className="mt-5 min-w-0">{children}</div>
    </section>
  )
}

export function ReportEmpty({ title = 'No data for this period', description }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center px-6 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-400">
        <Inbox size={20} />
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{description}</p>}
    </div>
  )
}

