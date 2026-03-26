/**
 * ProtectedImg — drops a transparent shield over an image to deter casual saving.
 *
 * What it does:
 *  • Overlay div absorbs right-click → no "Save image as..." context menu
 *  • draggable={false} + onDragStart → can't drag to desktop / file manager
 *  • -webkit-user-drag: none + pointer-events: none on <img> → extra layer
 *  • user-select: none on wrapper → no accidental text / image selection
 *
 * Note: this is a deterrent, not DRM. DevTools / network tab can still reach
 * the file. Stops 99% of casual "right-click → Save" attempts.
 *
 * Props:
 *   src, alt, className, style  — forwarded to <img>
 *   wrapperClassName             — classes applied to the outer wrapper
 *   wrapperStyle                 — inline styles for the outer wrapper
 *   ...rest                      — any other <img> props (e.g. onClick)
 */

const prevent = (e) => e.preventDefault()

export default function ProtectedImg({
  src,
  alt,
  className,
  style,
  wrapperClassName = '',
  wrapperStyle = {},
  ...rest
}) {
  return (
    <span
      className={wrapperClassName}
      style={{
        position: 'relative',
        display: 'inline-block',
        lineHeight: 0,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        ...wrapperStyle,
      }}
    >
      {/* The actual image — pointer-events off so all mouse actions hit the overlay */}
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ display: 'block', WebkitUserDrag: 'none', pointerEvents: 'none', ...style }}
        draggable={false}
        onContextMenu={prevent}
        onDragStart={prevent}
        {...rest}
      />

      {/* Transparent shield — sits on top, eats right-click and drag events */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          cursor: 'default',
        }}
        onContextMenu={prevent}
        onDragStart={prevent}
        onMouseDown={prevent}
      />
    </span>
  )
}
