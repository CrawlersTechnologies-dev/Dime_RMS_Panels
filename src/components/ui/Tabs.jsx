import { useRef } from 'react'
import clsx from 'clsx'

/**
 * Segmented tabs. tabs: [{ value, label, count? }]
 * Arrow keys move between tabs (roving tabindex).
 */
export default function Tabs({ tabs, value, onChange, className, label = 'Sections' }) {
  const refs = useRef([])
  const onKey = (e, i) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const next = (i + dir + tabs.length) % tabs.length
    refs.current[next]?.focus()
    onChange(tabs[next].value)
  }
  return (
    <div className={clsx('overflow-x-auto -mx-1 px-1', className)}>
      <div role="tablist" aria-label={label} className="inline-flex gap-1 rounded-full bg-ink-900/5 p-1">
        {tabs.map((t, i) => {
          const active = t.value === value
          return (
            <button
              key={t.value}
              ref={(el) => (refs.current[i] = el)}
              role="tab"
              type="button"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onKeyDown={(e) => onKey(e, i)}
              onClick={() => onChange(t.value)}
              className={clsx(
                'inline-flex items-center gap-2 h-8 px-3.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors cursor-pointer',
                active ? 'bg-surface text-ink-900 shadow-[0_1px_2px_rgba(18,32,41,.12)]' : 'text-ink-500 hover:text-ink-900',
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={clsx('tabular text-[12px] rounded-full px-1.5 min-w-5', active ? 'bg-brand-50 text-brand-700' : 'bg-ink-900/6 text-ink-500')}>
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
