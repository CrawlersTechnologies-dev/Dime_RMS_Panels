import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import logoMark from '../../assets/logo-mark.png'

/**
 * Permission-aware sidebar. `nav` is an array of sections:
 *   [{ label, items: [{ to, label, icon, feature, badge? }] }]
 * Items whose feature the user lacks are hidden; empty sections drop out.
 */
export default function Sidebar({ nav, panelName, open, onClose }) {
  const { can } = useAuth()
  const sections = nav
    .map((s) => ({ ...s, items: s.items.filter((i) => can(i.feature)) }))
    .filter((s) => s.items.length)

  return (
    <>
      <div
        className={clsx('fixed inset-0 z-30 bg-ink-950/50 lg:hidden transition-opacity', open ? 'opacity-100' : 'opacity-0 pointer-events-none')}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={clsx(
          'fixed z-40 inset-y-0 left-0 w-64 bg-ink-900 text-ink-300 flex flex-col transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-3 px-5 h-16 shrink-0">
          <span className="grid place-items-center size-10 rounded-xl bg-white p-1">
            <img src={logoMark} alt="" className="w-full h-auto" />
          </span>
          <div className="leading-tight">
            <div className="font-display text-[19px] font-semibold text-white">Dime Quest</div>
            <div className="text-[12px] text-brand-400 font-medium">{panelName}</div>
          </div>
          <button onClick={onClose} className="ml-auto lg:hidden p-1.5 rounded-lg hover:bg-white/10" aria-label="Close menu">
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-6" aria-label="Main">
          {sections.map((section) => (
            <div key={section.label} className="mt-5 first:mt-2">
              <div className="px-3 mb-1.5 text-[12px] font-medium text-ink-400">{section.label}</div>
              <ul className="space-y-0.5">
                {section.items.map(({ to, label, icon: Icon, badge, end }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      onClick={onClose}
                      className={({ isActive }) =>
                        clsx(
                          'group flex items-center gap-3 rounded-full pl-3 pr-2.5 h-10 text-[14px] font-medium transition-colors',
                          isActive ? 'bg-brand-500 text-white' : 'hover:bg-white/6 hover:text-white',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className="size-[18px] shrink-0" strokeWidth={2} aria-hidden />
                          <span className="truncate">{label}</span>
                          {badge ? (
                            <span
                              className={clsx(
                                'ml-auto min-w-6 h-6 px-1.5 grid place-items-center rounded-full text-[12px] font-bold tabular',
                                isActive ? 'bg-white text-brand-600' : 'bg-brand-500 text-white',
                              )}
                            >
                              {badge}
                            </span>
                          ) : null}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
