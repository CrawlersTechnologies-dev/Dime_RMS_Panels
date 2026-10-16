import { useState } from 'react'
import { Printer } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Button from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/Badge'
import { Field, Select, Toggle } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { usePos } from '../data/PosDataContext'

const DEFAULTS = { defaultType: 'DINE_IN', kotCopies: 1, autoPrintBill: true, onlineSound: true, askGuests: true }

/** Counter settings for this outlet. Restaurant-wide settings stay with the owner. */
export default function Settings() {
  const pos = usePos()
  const toast = useToast()
  const saved = { ...DEFAULTS, ...pos.settings.pos?.[pos.outlet.id] }
  const [form, setForm] = useState(saved)
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const printers = pos.settings.printers.filter((p) => p.outletId === pos.outlet.id)

  return (
    <>
      <PageHeader title="Settings" description={`Counter settings for ${pos.outlet.name}. Bill format, taxes and payment options are set by the owner.`} />
      <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
        <Panel title="Billing counter">
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => { e.preventDefault(); pos.saveSettings('pos', { ...pos.settings.pos, [pos.outlet.id]: form }); toast('Counter settings saved.') }}
          >
            <Field label="Start new bills as">{({ id }) => <Select id={id} value={form.defaultType} onChange={(e) => set('defaultType', e.target.value)} options={[{ value: 'DINE_IN', label: 'Dine-in' }, { value: 'TAKEAWAY', label: 'Takeaway' }]} />}</Field>
            <Field label="KOT copies">{({ id }) => <Select id={id} value={form.kotCopies} onChange={(e) => set('kotCopies', Number(e.target.value))} options={[{ value: 1, label: '1 copy' }, { value: 2, label: '2 copies (kitchen and pass)' }]} />}</Field>
            <div className="sm:col-span-2 flex flex-col gap-4">
              <Toggle label="Print the bill when it’s settled" checked={form.autoPrintBill} onChange={(v) => set('autoPrintBill', v)} />
              <Toggle label="Ask for number of guests on dine-in" checked={form.askGuests} onChange={(v) => set('askGuests', v)} />
              <Toggle label="Ring for new Swiggy and Zomato orders" description="Plays until the order is accepted or rejected." checked={form.onlineSound} onChange={(v) => set('onlineSound', v)} />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 border-t border-line pt-4">
              <Button type="button" variant="ghost" disabled={!dirty} onClick={() => setForm(saved)}>Discard</Button>
              <Button type="submit" disabled={!dirty}>Save changes</Button>
            </div>
          </form>
        </Panel>
        <Panel flush title="Printers">
          <ul className="divide-y divide-line border-t border-line">
            {printers.map((p) => (
              <li key={p.id} className="px-5 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="grid place-items-center size-9 rounded-full bg-canvas text-ink-700 shrink-0"><Printer className="size-4" aria-hidden /></span>
                <div className="min-w-0 flex-1 basis-40"><div className="font-semibold">{p.name}, {p.kind === 'KOT' ? 'KOT' : 'bills'}</div><div className="text-[12px] text-ink-500">{p.model}, {p.connection}</div></div>
                <StatusBadge status={p.status} />
                <Button size="sm" variant="secondary" onClick={() => toast(p.status === 'ERROR' ? `${p.name} printer isn’t responding. Check its power and that it’s on the same Wi-Fi as this counter.` : `Test page sent to ${p.name}.`, p.status === 'ERROR' ? 'error' : 'ok')}>Print test page</Button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  )
}
