export default function FormField({
  label,
  hint,
  error,
  children,
  className = '',
}) {
  return (
    <div className={className}>
      {label && <label className="hig-label">{label}</label>}
      {children}
      {hint && !error && <p className="mt-1 text-hig-caption2 text-hig-text-secondary">{hint}</p>}
      {error && <p className="mt-1 text-hig-caption2 text-hig-red">{error}</p>}
    </div>
  )
}
