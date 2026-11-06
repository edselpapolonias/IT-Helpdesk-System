import { CalendarDays, IdCard, Mail, MapPin, ShieldCheck, UserRound } from 'lucide-react'

const formatter = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

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

export default function AccountInformation({ profile, showIdentifier = true, showDepartment = true, identifierLabel = 'User ID' }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <h3 className="text-base font-semibold text-slate-900">Account information</h3>
      <p className="mt-1 text-xs text-slate-500">These details are managed by the helpdesk administrator.</p>
      <div className="mt-3">
        {showIdentifier && <Item icon={IdCard} label={identifierLabel} value={`#${profile.id}`} />}
        <Item icon={Mail} label="Email" value={profile.email} />
        <Item icon={UserRound} label="Role" value={profile.role_display} />
        {showDepartment && <Item icon={MapPin} label="Department / Office" value={profile.department} />}
        <Item icon={ShieldCheck} label="Account status" value={profile.account_status} />
        <Item icon={CalendarDays} label="Registered" value={formatter.format(new Date(profile.date_joined))} />
        <Item icon={CalendarDays} label="Last login" value={profile.last_login ? formatter.format(new Date(profile.last_login)) : 'Not recorded'} />
      </div>
    </section>
  )
}
