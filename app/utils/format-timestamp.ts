export function formatTimestamp(value: string | number | undefined): string {
  if (value === undefined || value === '') {
    return '—'
  }
  const date = typeof value === 'number'
    ? new Date(value * 1000)
    : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}
