import { BadgeCheck, Mail } from 'lucide-react'

function getInitials(profile) {
  return `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() || 'U'
}

export default function ProfileHeader({ profile, avatarUrl }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${profile.name}'s profile`}
            className="h-20 w-20 shrink-0 rounded-full border border-slate-200 object-cover shadow-sm"
          />
        ) : (
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-800">
            {getInitials(profile)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {profile.name}
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              <BadgeCheck size={13} /> {profile.account_status}
            </span>
          </div>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <Mail size={15} className="shrink-0 text-slate-400" />
            <span className="truncate">{profile.email}</span>
          </p>
          <p className="mt-2 text-xs font-medium text-slate-400">{profile.role_display}</p>
        </div>
      </div>
    </section>
  )
}
