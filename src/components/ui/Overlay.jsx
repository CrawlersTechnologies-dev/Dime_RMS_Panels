import { useEffect, useRef } from 'react'
import clsx from 'clsx'
import { X } from 'lucide-react'

/** Locks body scroll, closes on Escape, moves focus in and restores it on close. */
function useOverlay(open, onClose) {
  const panel = useRef(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement
    const onKey = (e) => e.key === 'Escape' && close.current()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      prev?.focus?.()
    }
  }, [open])
  return panel
}

/** Right-side panel for reviewing or editing one record without leaving the list. */
export function Drawer({ open, onClose, title, subtitle, footer, width = 'max-w-xl', children }) {
  const panel = useOverlay(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink-950/45" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={clsx('absolute inset-y-0 right-0 w-full bg-surface shadow-2xl flex flex-col outline-none', width)}
      >
        <header className="flex items-start gap-4 px-6 py-5 border-b border-line">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[22px] font-semibold leading-tight">{title}</h2>
            {subtitle && <div className="text-[13px] text-ink-500 mt-1">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-ink-900/5" aria-label="Close">
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="px-6 py-4 border-t border-line bg-canvas/60 flex flex-wrap justify-end gap-2">{footer}</footer>}
      </div>
    </div>
  )
}

/** Centered dialog for short forms and confirmations. */
export function Modal({ open, onClose, title, description, footer, children, width = 'max-w-lg' }) {
  const panel = useOverlay(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink-950/45" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx('relative w-full bg-surface rounded-[var(--radius-panel)] shadow-2xl outline-none max-h-[90dvh] flex flex-col', width)}
      >
        <header className="px-6 pt-5 pb-2">
          <h2 className="font-display text-[22px] font-semibold leading-tight">{title}</h2>
          {description && <p className="text-[13px] text-ink-500 mt-1">{description}</p>}
        </header>
        {children && <div className="px-6 py-3 overflow-y-auto">{children}</div>}
        {footer && <footer className="px-6 pb-5 pt-3 flex flex-wrap justify-end gap-2">{footer}</footer>}
      </div>
    </div>
  )
}
