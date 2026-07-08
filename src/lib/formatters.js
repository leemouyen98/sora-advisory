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

/**
 * Timezone-safe local-date parser for 'YYYY-MM-DD' strings. Unlike
 * `new Date('YYYY-MM-DD')` (which parses as UTC midnight — an off-by-one-day
 * risk once local-midnight math like .setHours(0,0,0,0) is applied for
 * browsers west of UTC) or `new Date('0')`/other malformed strings (which
 * silently parse to an unrelated valid-looking date instead of failing),
 * this constructs the Date directly in local time and returns null for
 * anything that isn't cleanly Y-M-D. Single source of truth — was
 * previously duplicated in DatePicker.jsx, and the UTC-vs-local mismatch
 * separately duplicated (uncaught) in ContactsPage.jsx/ContactDetailPage.jsx.
 */
export function parseYMD(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

/**
 * Whole days between today (local midnight) and a 'YYYY-MM-DD' date string.
 * 0 = today, negative = in the past. Returns null for an empty/invalid date.
 * Was duplicated as daysUntilReview() (ContactsPage) and daysUntilDate()
 * (ContactDetailPage) — both re-implementing the same UTC/local parsing bug.
 */
export function daysUntil(dateStr) {
  const target = parseYMD(dateStr)
  if (!target) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((target - now) / 86400000)
}

export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max)
}

/** Unique ID — single source of truth shared across all planners */
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

