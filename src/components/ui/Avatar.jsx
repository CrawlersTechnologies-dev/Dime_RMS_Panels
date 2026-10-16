import clsx from 'clsx'

const palette = ['bg-brand-100 text-brand-700', 'bg-info-50 text-info-600', 'bg-ok-50 text-ok-600', 'bg-warn-50 text-warn-600', 'bg-ink-900/8 text-ink-800']

export default function Avatar({ name = '', size = 'md', className }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  const tone = palette[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length]
  return (
    <span
      className={clsx('inline-grid place-items-center rounded-full font-bold shrink-0', tone,
        size === 'sm' ? 'size-7 text-[11px]' : 'size-9 text-[13px]', className)}
      aria-hidden
    >
      {initials}
    </span>
  )
}
