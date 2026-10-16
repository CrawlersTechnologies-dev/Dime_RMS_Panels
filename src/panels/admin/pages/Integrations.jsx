import { useState } from 'react'
import { TriangleAlert, RefreshCw, Settings2 } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Button from '../../../components/ui/Button'
import Avatar from '../../../components/ui/Avatar'
import { StatusBadge } from '../../../components/ui/Badge'
import { Drawer } from '../../../components/ui/Overlay'
import { Checkbox, Field, Input, Toggle } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { formatNumber, timeAgo } from '../../../lib/format'
import * as seed from '../data/records'
import { useAdminData } from '../data/AdminDataContext'

export default function Integrations() {
  const { log, plans } = useAdminData()
  const toast = useToast()
  const [items, setItems] = useState(() => seed.thirdParty.map((i) => ({ ...i, plans: i.category === 'Online orders' ? ['growth', 'enterprise'] : plans.map((p) => p.id), selfConnect: i.category === 'Online orders' })))
  const [editingId, setEditingId] = useState(null)
  const editing = items.find((i) => i.id === editingId)

  const patch = (item, p, action) => {
    setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, ...p } : x)))
    log('Integrations', action, item.name)
  }
  const categories = [...new Set(items.map((i) => i.category))]
  const errors = items.filter((i) => i.status === 'ERROR')

  return (
    <>
      <PageHeader title="Third-party integrations" description="Services Dime Quest connects to for online orders, messaging, apps and accounting." />

      {errors.map((i) => (
        <div key={i.id} role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-panel)] border border-danger-600/30 bg-danger-50 px-5 py-3.5 text-sm">
          <TriangleAlert className="size-5 text-danger-600 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1"><span className="font-semibold">{i.name} isn’t working.</span> {i.error} Customer app maps and directions are affected.</span>
          <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => { patch(i, { status: 'CONNECTED', error: null, lastSync: new Date().toISOString() }, 'Retried connection'); toast(`${i.name} reconnected.`) }}>Retry now</Button>
        </div>
      ))}

      {categories.map((cat) => (
        <section key={cat} className="mb-8 last:mb-0">
          <h2 className="text-[13px] font-bold text-ink-500 mb-3">{cat}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.filter((i) => i.category === cat).map((i) => (
              <article key={i.id} className="min-w-0 bg-surface border border-line rounded-[var(--radius-panel)] p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={i.name} />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold truncate">{i.name}</h3>
                    <StatusBadge status={i.status} />
                  </div>
                </div>
                <p className="text-[13px] text-ink-700 flex-1">{i.description}</p>
                <p className="text-[12px] text-ink-500">
                  {i.status === 'NOT_CONNECTED'
                    ? 'Not set up yet'
                    : [i.restaurants && `${formatNumber(i.restaurants)} restaurants using it`, i.lastSync && `synced ${timeAgo(i.lastSync)}`].filter(Boolean).join(', ')}
                </p>
                <div className="flex gap-2 border-t border-line pt-3">
                  {i.status === 'NOT_CONNECTED' ? (
                    <Button size="sm" onClick={() => setEditingId(i.id)}>Connect</Button>
                  ) : (
                    <Button size="sm" variant="secondary" icon={Settings2} onClick={() => setEditingId(i.id)}>Configure</Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      {editing && (
        <Drawer
          open
          onClose={() => setEditingId(null)}
          title={editing.name}
          subtitle={editing.description}
          footer={
            <>
              {editing.status !== 'NOT_CONNECTED' && (
                <Button variant="danger" className="mr-auto" onClick={() => { patch(editing, { status: 'NOT_CONNECTED', lastSync: null, restaurants: null }, 'Disconnected'); toast(`${editing.name} disconnected.`); setEditingId(null) }}>
                  Disconnect
                </Button>
              )}
              <Button variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  const connecting = editing.status === 'NOT_CONNECTED'
                  patch(editing, connecting ? { status: 'CONNECTED', lastSync: new Date().toISOString() } : {}, connecting ? 'Connected' : 'Changed settings')
                  toast(connecting ? `${editing.name} connected.` : `${editing.name} settings saved.`)
                  setEditingId(null)
                }}
              >
                {editing.status === 'NOT_CONNECTED' ? 'Connect' : 'Save'}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-5">
            <Field label="API key">{({ id }) => <Input id={id} type="password" placeholder={editing.status === 'NOT_CONNECTED' ? 'Paste the API key' : '•••••••••••• saved'} autoComplete="new-password" />}</Field>
            {editing.category === 'Online orders' && (
              <Toggle
                label="Restaurants connect their own account"
                description="Owners link their store ID in Settings > Integrations. Turn off to manage every link from here."
                checked={editing.selfConnect}
                onChange={(v) => patch(editing, { selfConnect: v }, v ? 'Allowed owner self-connect' : 'Blocked owner self-connect')}
              />
            )}
            <fieldset>
              <legend className="text-[13px] font-semibold text-ink-800 mb-2">Available on plans</legend>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {plans.map((p) => (
                  <Checkbox
                    key={p.id}
                    label={p.name}
                    checked={editing.plans.includes(p.id)}
                    onChange={(v) => patch(editing, { plans: v ? [...editing.plans, p.id] : editing.plans.filter((x) => x !== p.id) }, 'Changed plan availability')}
                  />
                ))}
              </div>
            </fieldset>
          </div>
        </Drawer>
      )}
    </>
  )
}
