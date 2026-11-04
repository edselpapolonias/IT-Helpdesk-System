export const priorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

export const priorityLabels = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
}

export const statusLabels = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

export function priorityTone(priority) {
  return {
    CRITICAL: 'bg-red-50 text-red-700 ring-red-200',
    HIGH: 'bg-orange-50 text-orange-700 ring-orange-200',
    MEDIUM: 'bg-blue-50 text-blue-700 ring-blue-200',
    LOW: 'bg-slate-100 text-slate-600 ring-slate-200',
  }[priority] || 'bg-slate-100 text-slate-600 ring-slate-200'
}

export function statusTone(status) {
  return {
    OPEN: 'bg-slate-100 text-slate-700 ring-slate-200',
    ASSIGNED: 'bg-violet-50 text-violet-700 ring-violet-200',
    IN_PROGRESS: 'bg-blue-50 text-blue-700 ring-blue-200',
    RESOLVED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    CLOSED: 'bg-zinc-100 text-zinc-600 ring-zinc-200',
  }[status] || 'bg-slate-100 text-slate-600 ring-slate-200'
}
