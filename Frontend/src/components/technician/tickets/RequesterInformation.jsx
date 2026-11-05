import { Building2, Mail, Phone, UserRound } from 'lucide-react'

function Row({ icon: Icon, label, value, href }) {
  const content = href ? <a href={href} className="break-all text-emerald-700 hover:underline">{value}</a> : value
  return (
    <div className="flex gap-3 border-b border-slate-100 py-3 last:border-0">
      <Icon size={16} className="mt-0.5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-medium text-slate-700">{value ? content : 'Not provided'}</p>
      </div>
    </div>
  )
}

export default function RequesterInformation({ requester }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white px-5 py-4">
      <h3 className="text-sm font-semibold text-slate-900">Requester information</h3>
      <div className="mt-2">
        <Row icon={UserRound} label="Requester" value={requester.name} />
        <Row icon={Building2} label="Department" value={requester.department} />
        <Row icon={Mail} label="Email" value={requester.email} href={requester.email ? `mailto:${requester.email}` : ''} />
        <Row icon={Phone} label="Contact number" value={requester.contact_number} href={requester.contact_number ? `tel:${requester.contact_number}` : ''} />
      </div>
    </article>
  )
}
