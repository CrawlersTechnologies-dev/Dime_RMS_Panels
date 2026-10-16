import { useId } from 'react'
import clsx from 'clsx'

const control =
  'rounded-xl border border-line-strong bg-surface px-3.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 disabled:bg-canvas disabled:text-ink-500'

/** Label + control + hint/error. Pass a render function to receive the generated id. */
export function Field({ label, hint, error, required, className, children }) {
  const id = useId()
  return (
    <div className={clsx('flex flex-col gap-1.5 min-w-0', className)}>
      {label && (
        <label htmlFor={id} className="text-[13px] font-semibold text-ink-800">
          {label} {required && <span className="text-brand-700" aria-hidden>*</span>}
        </label>
      )}
      {typeof children === 'function' ? children({ id, invalid: !!error }) : children}
      {error ? (
        <p className="text-[12px] text-danger-600">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-ink-500">{hint}</p>
      ) : null}
    </div>
  )
}

/** Full width unless the caller sets its own width class (w-auto, w-48…). */
const width = (className) => (/(^|\s)(\w+:)?w-/.test(className ?? '') ? '' : 'w-full')

export function Input({ className, invalid, ...props }) {
  return <input className={clsx(control, width(className), 'h-10', invalid && 'border-danger-600', className)} aria-invalid={invalid || undefined} {...props} />
}

export function Textarea({ className, invalid, rows = 3, ...props }) {
  return <textarea rows={rows} className={clsx(control, width(className), 'py-2.5 resize-y', invalid && 'border-danger-600', className)} aria-invalid={invalid || undefined} {...props} />
}

export function Select({ className, options, invalid, ...props }) {
  return (
    <select className={clsx(control, width(className), 'h-10 pr-9 appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:16px] cursor-pointer select-chevron', invalid && 'border-danger-600', className)} {...props}>
      {options.map((o) => {
        const { value, label } = typeof o === 'string' ? { value: o, label: o } : o
        return <option key={value} value={value}>{label}</option>
      })}
    </select>
  )
}

/** Accessible on/off switch. */
export function Toggle({ checked, onChange, label, description, ariaLabel, disabled, size = 'md' }) {
  const id = useId()
  const sw = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ? undefined : ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative shrink-0 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' ? 'h-5 w-9' : 'h-6 w-11',
        checked ? 'bg-brand-500' : 'bg-ink-300',
      )}
    >
      <span
        className={clsx(
          'absolute top-0.5 left-0.5 rounded-full bg-white shadow transition-transform',
          size === 'sm' ? 'size-4' : 'size-5',
          checked && (size === 'sm' ? 'translate-x-4' : 'translate-x-5'),
        )}
      />
    </button>
  )
  if (!label) return sw
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-semibold text-ink-900">{label}</span>
        {description && <span className="block text-[13px] text-ink-500 mt-0.5">{description}</span>}
      </label>
      {sw}
    </div>
  )
}

export function Checkbox({ checked, onChange, label, disabled, className }) {
  return (
    <label className={clsx('inline-flex items-center gap-2.5 text-sm cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed', className)}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded accent-brand-500 cursor-pointer"
      />
      {label}
    </label>
  )
}

/** Search box used at the start of filter rows. */
export function SearchInput({ value, onChange, placeholder = 'Search', className }) {
  return (
    <label className={clsx('relative block min-w-0', className)}>
      <span className="sr-only">{placeholder}</span>
      <svg viewBox="0 0 24 24" className="size-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={clsx(control, 'w-full h-10 pl-10')}
      />
    </label>
  )
}
