import { CalendarClock, ClipboardCheck, ShieldCheck, UserCog } from 'lucide-react'

const formatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3 border-b border-slate-100 py-3 last:border-0">
      <Icon size={16} className="mt-0.5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-5 text-slate-700">{value || 'Not recorded'}</p>
      </div>
    </div>
  )
}

export default function AssignmentInformation({ assignment }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white px-5 py-4">
      <h3 className="text-sm font-semibold text-slate-900">Assignment information</h3>
      {assignment ? (
        <div className="mt-2">
          <Row icon={UserCog} label="Technician" value={assignment.technician.name} />
          <Row icon={ShieldCheck} label="Specialization" value={assignment.technician.specialization} />
          <Row icon={CalendarClock} label="Assigned" value={assignment.assigned_at ? formatter.format(new Date(assignment.assigned_at)) : ''} />
          <Row icon={ClipboardCheck} label="Assigned by" value={assignment.assigned_by?.name} />
          {assignment.assignment_notes && <Row icon={ClipboardCheck} label="Assignment notes" value={assignment.assignment_notes} />}
        </div>
      ) : <p className="mt-4 text-sm leading-6 text-slate-500">No assignment record is associated with your historical access.</p>}
    </article>
  )
}
