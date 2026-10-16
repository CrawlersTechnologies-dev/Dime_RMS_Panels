import clsx from 'clsx'

const variants = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-[0_1px_0_rgba(18,32,41,.15)]',
  dark: 'bg-ink-900 text-white hover:bg-ink-800',
  secondary: 'bg-surface text-ink-900 border border-line-strong hover:border-ink-400',
  ghost: 'text-ink-700 hover:bg-ink-900/5',
  danger: 'bg-surface text-danger-600 border border-line-strong hover:border-danger-600',
}
const sizes = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
}

export default function Button({ variant = 'primary', size = 'md', icon: Icon, className, children, ...props }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-full font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
        variants[variant], sizes[size], className,
      )}
      {...props}
    >
      {Icon && <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} strokeWidth={2.25} aria-hidden />}
      {children}
    </button>
  )
}
