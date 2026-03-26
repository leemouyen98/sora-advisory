export default function SectionCard({
  title,
  subtitle,
  action = null,
  children,
  className = '',
  bodyClassName = '',
}) {
  return (
    <section className={`hig-card overflow-hidden ${className}`.trim()}>
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between gap-4 border-b border-hig-gray-5 px-4 py-3">
          <div className="min-w-0">
            {title && <h3 className="text-hig-subhead font-semibold text-hig-text truncate">{title}</h3>}
            {subtitle && <p className="mt-1 text-hig-caption1 text-hig-text-secondary">{subtitle}</p>}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}
      <div className={bodyClassName || 'p-4'}>{children}</div>
    </section>
  )
}
