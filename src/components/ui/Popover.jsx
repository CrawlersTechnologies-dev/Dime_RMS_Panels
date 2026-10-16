import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

/**
 * Button + floating panel. Closes on outside click, Escape (returning focus to the
 * button) and when `close()` is called from inside. `children` gets { close }.
 */
export default function Popover({ trigger, label, align = 'left', panelClassName, children }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const button = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => !root.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); button.current?.focus() }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer rounded-full"
      >
        {trigger(open)}
      </button>
      {open && (
        <div
          className={clsx(
            'absolute z-40 mt-2 rounded-2xl border border-line bg-surface shadow-[0_12px_40px_rgba(12,22,29,.18)] p-1.5',
            align === 'right' ? 'right-0' : 'left-0',
            panelClassName,
          )}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  )
}

/** A row inside a Popover menu. */
export function MenuItem({ icon: Icon, children, onClick, selected, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? 'true' : undefined}
      className={clsx('w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm cursor-pointer hover:bg-canvas', selected && 'bg-brand-50', className)}
    >
      {Icon && <Icon className="size-4 text-ink-500 shrink-0" aria-hidden />}
      {children}
    </button>
  )
}
