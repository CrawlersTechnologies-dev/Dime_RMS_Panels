export default function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6">
      {Icon && (
        <span className="grid place-items-center size-14 rounded-full bg-brand-50 text-brand-600 mb-4">
          <Icon className="size-6" aria-hidden />
        </span>
      )}
      <h3 className="font-display text-xl font-semibold text-ink-900">{title}</h3>
      {children && <p className="text-ink-500 mt-1.5 max-w-md">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
