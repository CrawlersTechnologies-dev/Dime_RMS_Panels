import { useEffect, useId, useRef, useState } from 'react'

/** Round axis ticks: 0…max in 4–5 even steps of 1/2/2.5/5 × 10ⁿ. */
export function niceTicks(min, max, count = 4) {
  const span = max - min || 1
  const raw = span / count
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const ticks = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v)
  return ticks
}

/**
 * Single-series line chart with crosshair tooltip and keyboard support.
 * data: [{ label, value }]. The series is named by the panel title, so no legend.
 */
export default function LineChart({ data, height = 240, formatValue = String, formatTick = formatValue, ariaLabel }) {
  const wrap = useRef(null)
  const [width, setWidth] = useState(640)
  const [active, setActive] = useState(null)
  const id = useId()

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const pad = { top: 16, right: 16, bottom: 28, left: 52 }
  const values = data.map((d) => d.value)
  const ticks = niceTicks(Math.min(...values) * 0.9, Math.max(...values))
  const y0 = ticks[0]
  const y1 = ticks[ticks.length - 1]
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const x = (i) => pad.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
  const y = (v) => pad.top + innerH - ((v - y0) / (y1 - y0)) * innerH
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join('')
  const last = data.length - 1
  const shown = active ?? null

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * width
    const i = Math.round(((px - pad.left) / innerW) * last)
    setActive(Math.min(last, Math.max(0, i)))
  }
  const onKey = (e) => {
    if (e.key === 'ArrowRight') setActive((a) => Math.min(last, (a ?? -1) + 1))
    else if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? last + 1) - 1))
    else if (e.key === 'Escape') setActive(null)
    else return
    e.preventDefault()
  }

  return (
    <div ref={wrap} className="relative">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block max-w-full focus-visible:outline-2 focus-visible:outline-brand-500 rounded-lg"
        role="img"
        aria-label={ariaLabel}
        aria-describedby={`${id}-table`}
        tabIndex={0}
        onMouseMove={onMove}
        onMouseLeave={() => setActive(null)}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeDasharray={t === y0 ? undefined : '3 4'} />
            <text x={pad.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-400 text-[11px] tabular">{formatTick(t)}</text>
          </g>
        ))}
        {data.map((d, i) => (
          <text key={d.label} x={x(i)} y={height - 8} textAnchor="middle" className={i === shown ? 'fill-ink-900 text-[11px] font-semibold' : 'fill-ink-400 text-[11px]'}>
            {d.label}
          </text>
        ))}

        {shown !== null && <line x1={x(shown)} x2={x(shown)} y1={pad.top} y2={pad.top + innerH} stroke="var(--color-ink-300)" />}

        <path d={path} fill="none" stroke="var(--color-brand-500)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Latest point always marked; hovered point gets the same ringed marker. */}
        {[last, shown].filter((v, i, a) => v !== null && a.indexOf(v) === i).map((i) => (
          <circle key={i} cx={x(i)} cy={y(data[i].value)} r={5} fill="var(--color-brand-500)" stroke="var(--color-surface)" strokeWidth={2} />
        ))}
      </svg>

      {shown !== null && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-ink-900 text-white px-3 py-2 text-[13px] shadow-lg whitespace-nowrap"
          style={{
            left: Math.min(Math.max(x(shown), 70), width - 70),
            top: y(data[shown].value) - 12,
            transform: 'translate(-50%, -100%)',
          }}
          role="status"
        >
          <div className="text-ink-300 text-[12px]">{data[shown].label}</div>
          <div className="font-semibold tabular">{formatValue(data[shown].value)}</div>
        </div>
      )}

      <table id={`${id}-table`} className="sr-only">
        <tbody>
          {data.map((d) => (
            <tr key={d.label}><th scope="row">{d.label}</th><td>{formatValue(d.value)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
