import clsx from 'clsx'

/** The base white surface. Header is optional; `flush` drops body padding for tables. */
export default function Panel({ title, description, actions, flush = false, className, children }) {
  return (
    // min-w-0 lets wide content (tables) scroll inside the panel instead of stretching a grid column.
    <section className={clsx('min-w-0 bg-surface rounded-[var(--radius-panel)] border border-line', className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-bold text-ink-900">{title}</h2>}
            {description && <p className="text-[13px] text-ink-500 mt-0.5">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      <div className={clsx(!flush && 'px-5 pb-5', !title && !actions && !flush && 'pt-5')}>{children}</div>
    </section>
  )
}
