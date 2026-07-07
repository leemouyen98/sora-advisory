/**
 * Utility formatters for HLA
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

/**
 * Contact-form variant of getAge(): returns null (not 0) when dob is empty
 * or invalid, and caps to a sane 0-129 range. getAge() returning 0 for an
 * empty dob is right for planning calculations (a default to compute against)
 * but wrong for form validation/live-preview, where "no dob yet" must be
 * distinguishable from "born this year." Was previously duplicated verbatim
 * in AddContactPage.jsx and EditContactPage.jsx.
 */
export function calcAge(dob) {
  if (!dob) return null
  const d = new Date(dob)
  if (isNaN(d)) return null
  const age = getAge(dob)
  return age >= 0 && age < 130 ? age : null
}

export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max)
}

/** Unique ID — single source of truth shared across all planners */
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

