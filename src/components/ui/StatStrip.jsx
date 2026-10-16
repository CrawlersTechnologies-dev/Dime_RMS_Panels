import clsx from 'clsx'

/** One joined strip of headline figures. items: [{ label, value, note?, tone? }] */
export default function StatStrip({ items, className }) {
  const cols = { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5' }[items.length] ?? 'lg:grid-cols-4'
  return (
    // 1px gaps over a line-colored background draw the dividers at every breakpoint.
    <dl className={clsx('grid grid-cols-2 gap-px bg-line border border-line rounded-[var(--radius-panel)] overflow-hidden', cols, className)}>
      {items.map((k) => (
        <div key={k.label} className="bg-surface px-5 py-4 min-w-0">
          <dt className="text-[13px] text-ink-500">{k.label}</dt>
          <dd className={clsx('font-display text-[26px] font-semibold leading-tight tabular mt-0.5', k.tone === 'warn' && 'text-brand-700')}>{k.value}</dd>
          {k.note && <dd className="text-[12px] text-ink-500">{k.note}</dd>}
        </div>
      ))}
    </dl>
  )
}
