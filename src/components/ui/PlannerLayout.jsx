export default function PlannerLayout({ left, right, leftClassName = '', rightClassName = '' }) {
  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-5">
      <div className={leftClassName}>{left}</div>
      <aside className={`space-y-4 ${rightClassName}`.trim()}>{right}</aside>
    </div>
  )
}
