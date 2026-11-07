const dateFormatter = new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'Asia/Manila',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Manila',
})

export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return 'N/A'
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} hr`
  return `${(seconds / 86400).toFixed(1)} days`
}

export function formatDate(value) {
  if (!value) return 'N/A'
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00+08:00`)
    : new Date(value)
  return dateFormatter.format(date)
}

export function formatDateTime(value) {
  return value ? dateTimeFormatter.format(new Date(value)) : 'N/A'
}

export function formatPercent(value) {
  return value === null || value === undefined ? 'N/A' : `${value}%`
}

export function formatCount(value) {
  return new Intl.NumberFormat('en-PH').format(value ?? 0)
}

export function shortName(value, length = 18) {
  return value?.length > length ? `${value.slice(0, length - 1)}…` : value
}

export const chartTooltipStyle = {
  borderRadius: 8,
  borderColor: '#e2e8f0',
  fontSize: 12,
}
