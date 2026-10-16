import clsx from 'clsx'

/**
 * Ranked horizontal bars with the label above each bar and the value at the right.
 * items: [{ label, value, note? }]. Bars are scaled to the largest value.
 * Share is shown next to the value when `showShare` is set.
 */
export default function BarList({ items, formatValue = String, showShare = false, tone = 'ink', className }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  const total = items.reduce((s, i) => s + i.value, 0) || 1
  return (
    <ul className={clsx('flex flex-col gap-3.5', className)}>
      {items.map((i) => (
        <li key={i.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium truncate">{i.label}</span>
            <span className="tabular text-ink-800 whitespace-nowrap">
              {formatValue(i.value)}
              {showShare && <span className="text-ink-400"> ({Math.round((i.value / total) * 100)}%)</span>}
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-canvas">
            <div className={clsx('h-full rounded-full', tone === 'brand' ? 'bg-brand-500' : 'bg-ink-800')} style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
          {i.note && <div className="text-[12px] text-ink-500 mt-1">{i.note}</div>}
        </li>
      ))}
    </ul>
  )
}
