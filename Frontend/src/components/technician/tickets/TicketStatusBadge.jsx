const statusStyles = {
  ASSIGNED: 'bg-violet-50 text-violet-700 ring-violet-600/15',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 ring-blue-600/15',
  REOPENED: 'bg-amber-50 text-amber-700 ring-amber-600/15',
  RESOLVED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  CLOSED: 'bg-slate-100 text-slate-600 ring-slate-500/15',
}

const priorityStyles = {
  CRITICAL: 'bg-red-50 text-red-700 ring-red-600/15',
  HIGH: 'bg-orange-50 text-orange-700 ring-orange-600/15',
  MEDIUM: 'bg-blue-50 text-blue-700 ring-blue-600/15',
  LOW: 'bg-slate-100 text-slate-600 ring-slate-500/15',
}

function label(value) {
  return value.toLowerCase().split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
}

export function TicketStatusBadge({ status }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusStyles[status] || statusStyles.CLOSED}`}>{label(status)}</span>
}

export function TicketPriorityBadge({ priority }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${priorityStyles[priority] || priorityStyles.LOW}`}>{label(priority)}</span>
}
