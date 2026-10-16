import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

/** Shared shell for every web panel: pass that panel's nav config and name. */
export default function AppShell({ nav, panelName, unread, onBell, searchPlaceholder, topbarSlot, banner }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-dvh">
      <Sidebar nav={nav} panelName={panelName} open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-64">
        <Topbar onMenu={() => setOpen(true)} unread={unread} onBell={onBell} searchPlaceholder={searchPlaceholder} slot={topbarSlot} />
        {banner}
        <main className="px-4 py-6 lg:px-8 lg:py-8 max-w-[1400px]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
