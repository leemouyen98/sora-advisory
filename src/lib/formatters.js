/**
 * Utility formatters for GoalsMapping
 */

export function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function getAge(dob) {
  if (!dob) return 0
  const d = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  if (
    now.getMonth() < d.getMonth() ||
    (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())
  ) {
    age--
  }
  return age
}

export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max)
}
