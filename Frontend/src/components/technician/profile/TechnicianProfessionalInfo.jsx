import { Building2, CalendarDays, IdCard, ShieldCheck, Wrench } from 'lucide-react'

const formatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' })

function Item({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3 border-b border-slate-100 py-3 last:border-0">
      <Icon size={16} className="mt-0.5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1 break-words text-sm font-medium text-slate-700">{value || 'Not specified'}</p>
      </div>
    </div>
  )
}

export default function TechnicianProfessionalInfo({ profile }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-700"><Wrench size={17} /></span>
        <div>
          <h3 className="text-base font-semibold text-slate-900">Professional information</h3>
          <p className="mt-1 text-xs text-slate-500">Your assignment details are maintained by an IT administrator.</p>
        </div>
      </div>
      <div className="mt-3">
        <Item icon={IdCard} label="Technician ID" value={`#${profile.id}`} />
        <Item icon={Wrench} label="Primary specialization" value={profile.specialization_display} />
        <Item icon={Building2} label="Department / Office" value={profile.department} />
        <Item icon={CalendarDays} label="Date registered" value={formatter.format(new Date(profile.date_joined))} />
        <Item icon={ShieldCheck} label="Account status" value={profile.account_status} />
      </div>
    </section>
  )
}
