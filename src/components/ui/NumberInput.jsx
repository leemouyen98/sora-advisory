import { useState } from 'react'

/**
 * NumberInput — shows formatted value with thousands separator on blur,
 * raw digits while the field is focused (so typing feels natural).
 *
 * Props:
 *   value       {number}    — controlled numeric value (0 → shows empty)
 *   onChange    {Function}  — called with (numericValue: number) on every keystroke
 *   className   {string}
 *   placeholder {string}
 *   ...rest                 — forwarded to <input> (avoid type/inputMode)
 */
export default function NumberInput({
  value,
  onChange,
  className = '',
  placeholder = '0',
  ...rest
}) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState('')

  // Formatted display: empty string for zero/null/undefined so placeholder shows
  const formatted = value ? Number(value).toLocaleString('en-MY') : ''

  const handleFocus = () => {
    setRaw(value ? String(value) : '')
    setFocused(true)
  }

  const handleBlur = () => {
    setFocused(false)
    const num = parseFloat(raw.replace(/,/g, '')) || 0
    onChange(num)
    setRaw('')
  }

  const handleChange = (e) => {
    // Strip everything except digits and one decimal point
    const cleaned = e.target.value
      .replace(/[^\d.]/g, '')
      .replace(/(\..*)\./g, '$1') // discard second decimal point
    setRaw(cleaned)
    onChange(parseFloat(cleaned) || 0)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={focused ? raw : formatted}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      {...rest}
    />
  )
}
