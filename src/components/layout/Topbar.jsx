import { Bell, ChevronDown, LogOut, Menu, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useAuth } from '../../context/AuthContext'
import { userRoleLabel } from '../../config/permissions'
import Avatar from '../ui/Avatar'
import Popover, { MenuItem } from '../ui/Popover'

/**
 * `slot` renders next to the menu button (the owner panel puts its outlet switcher here).
 * When a slot is present the search box hides on small screens to leave it room.
 */
export default function Topbar({ onMenu, unread = 0, onBell, searchPlaceholder = 'Search', slot }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-20 h-16 bg-surface/90 backdrop-blur border-b border-line flex items-center gap-3 px-4 lg:px-8">
      <button onClick={onMenu} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-ink-900/5" aria-label="Open menu">
        <Menu className="size-5" />
      </button>

      {slot}

      <label className={clsx('relative flex-1 max-w-md', slot && 'max-md:hidden')}>
        <span className="sr-only">Search</span>
        <Search className="size-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden />
        <input
          type="search"
          placeholder={searchPlaceholder}
          className="w-full h-10 rounded-full bg-canvas border border-transparent pl-10 pr-4 text-sm placeholder:text-ink-400 focus:bg-surface focus:border-line-strong outline-none"
        />
      </label>

      <div className="ml-auto flex items-center gap-1">
        <button onClick={onBell} className="relative p-2.5 rounded-full hover:bg-ink-900/5" aria-label={`Notifications, ${unread} unread`}>
          <Bell className="size-5 text-ink-700" />
          {unread > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-brand-500 ring-2 ring-surface" />}
        </button>
        <Popover
          align="right"
          label="Account menu"
          panelClassName="w-64"
          trigger={(open) => (
            <span className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-full hover:bg-ink-900/5">
              <Avatar name={user?.name} />
              <span className="hidden sm:block leading-tight text-left">
                <span className="block text-sm font-semibold">{user?.name}</span>
                <span className="block text-[12px] text-ink-500">{userRoleLabel(user)}</span>
              </span>
              <ChevronDown className={clsx('size-4 text-ink-500 transition-transform hidden sm:block', open && 'rotate-180')} aria-hidden />
            </span>
          )}
        >
          {({ close }) => (
            <>
              <div className="px-3 py-2.5 border-b border-line mb-1">
                <div className="text-sm font-semibold truncate">{user?.name}</div>
                <div className="text-[12px] text-ink-500 truncate">{user?.email}</div>
              </div>
              <MenuItem icon={LogOut} onClick={() => { close(); logout(); navigate('/login', { replace: true }) }}>
                Sign out
              </MenuItem>
            </>
          )}
        </Popover>
      </div>
    </header>
  )
}
