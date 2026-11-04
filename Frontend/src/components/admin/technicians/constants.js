export const SPECIALIZATIONS = [
  { value: 'HARDWARE_SUPPORT', label: 'Hardware Support' },
  { value: 'SOFTWARE_SUPPORT', label: 'Software Support' },
  { value: 'NETWORK_SUPPORT', label: 'Network Support' },
  { value: 'SYSTEM_ADMINISTRATION', label: 'System Administration' },
  { value: 'GENERAL_IT_SUPPORT', label: 'General IT Support' },
]

export const WORKLOAD_LEVELS = [
  { value: 'all', label: 'All workloads' },
  { value: 'none', label: 'No active tickets', description: '0 tickets' },
  { value: 'light', label: 'Light workload', description: '1–3 tickets' },
  { value: 'moderate', label: 'Moderate workload', description: '4–6 tickets' },
  { value: 'heavy', label: 'Heavy workload', description: '7+ tickets' },
]

export function workloadLabel(count) {
  if (count === 0) return 'No active tickets'
  if (count <= 3) return 'Light'
  if (count <= 6) return 'Moderate'
  return 'Heavy'
}

export function workloadTone(count) {
  if (count === 0) return 'bg-slate-100 text-slate-600'
  if (count <= 3) return 'bg-emerald-50 text-emerald-700'
  if (count <= 6) return 'bg-amber-50 text-amber-700'
  return 'bg-red-50 text-red-700'
}
