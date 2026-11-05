import { MessageSquareText, Wrench } from 'lucide-react'

const formatter = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export default function PublicTechnicianUpdates({ updates }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Wrench size={17} className="text-emerald-700" />
        <h3 className="text-base font-semibold text-slate-900">Technician updates</h3>
      </div>
      <p className="mt-1 text-xs text-slate-500">Updates the IT team has shared with you.</p>
      {updates.length === 0 ? (
        <div className="mt-5 rounded-md bg-slate-50 p-6 text-center">
          <MessageSquareText size={20} className="mx-auto text-slate-300" />
          <p className="mt-2 text-xs text-slate-500">No requester-visible technician updates yet.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {updates.map((update) => (
            <article key={update.id} className="rounded-md border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-800">{update.action_summary}</h4>
                <time className="text-[11px] text-slate-400">{formatter.format(new Date(update.created_at))}</time>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{update.public_notes}</p>
              <p className="mt-2 text-[11px] font-medium text-slate-500">Technician: {update.technician}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
