import { useId, useState } from 'react'
import clsx from 'clsx'
import { niceTicks } from './LineChart'

/**
 * Single-series column chart. data: [{ label, value, partial? }]
 * A `partial` column (the hour still in progress) is drawn lighter and labelled "so far".
 * Hover or focus a column for its value; arrow keys move between columns.
 */
export default function ColumnChart({ data, height = 190, formatValue = String, formatTick = formatValue, ariaLabel, labelEvery = 1, tone = 'brand' }) {
  const [active, setActive] = useState(null)
  const id = useId()
  const max = Math.max(1, ...data.map((d) => d.value))
  const ticks = niceTicks(0, max, 4)
  const top = ticks[ticks.length - 1]
  const pct = (v) => `${(v / top) * 100}%`

  const onKey = (e, i) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const next = Math.min(data.length - 1, Math.max(0, i + dir))
    document.getElementById(`${id}-${next}`)?.focus()
  }

  return (
    <figure className="m-0" aria-label={ariaLabel}>
      <div className="flex gap-2">
        <div className="relative w-11 shrink-0" style={{ height }} aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 translate-y-1/2 text-[11px] text-ink-400 tabular" style={{ bottom: pct(t) }}>{formatTick(t)}</span>
          ))}
        </div>
        <div className="relative flex-1 min-w-0" style={{ height }}>
          {ticks.map((t) => (
            <div key={t} className={clsx('absolute inset-x-0 border-t', t === 0 ? 'border-line' : 'border-dashed border-line/80')} style={{ bottom: pct(t) }} aria-hidden />
          ))}
          <div className="absolute inset-0 flex items-end gap-[3px] sm:gap-1">
            {data.map((d, i) => (
              <div key={d.label} className="relative flex-1 h-full flex items-end min-w-0">
                <div
                  id={`${id}-${i}`}
                  tabIndex={0}
                  role="img"
                  aria-label={`${d.label}: ${formatValue(d.value)}${d.partial ? ' so far' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  onKeyDown={(e) => onKey(e, i)}
                  className={clsx(
                    'w-full rounded-t-[4px] outline-none transition-opacity',
                    tone === 'brand' ? (d.partial ? 'bg-brand-200' : 'bg-brand-500') : d.partial ? 'bg-ink-300' : 'bg-ink-800',
                    active !== null && active !== i && 'opacity-55',
                    'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                  )}
                  style={{ height: d.value > 0 ? `max(2px, ${pct(d.value)})` : 0 }}
                />
                {active === i && (
                  <div
                    className="pointer-events-none absolute z-10 left-1/2 -translate-x-1/2 rounded-lg bg-ink-900 text-white px-2.5 py-1.5 text-[12px] whitespace-nowrap shadow-lg"
                    style={{ bottom: `calc(${pct(d.value)} + 8px)` }}
                  >
                    <div className="text-ink-300">{d.label}{d.partial ? ', so far' : ''}</div>
                    <div className="font-semibold tabular">{formatValue(d.value)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-1.5" aria-hidden>
        <div className="w-11 shrink-0" />
        <div className="flex-1 min-w-0 flex gap-[3px] sm:gap-1">
          {data.map((d, i) => (
            <span key={d.label} className={clsx('flex-1 min-w-0 text-center text-[11px] whitespace-nowrap overflow-visible', i === active ? 'text-ink-900 font-semibold' : 'text-ink-400')}>
              {i % labelEvery === 0 || i === active ? d.label : ''}
            </span>
          ))}
        </div>
      </div>
    </figure>
  )
}
