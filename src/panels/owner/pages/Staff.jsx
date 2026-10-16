import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { ArrowUpRight, Ban, RotateCcw, UserRoundPlus } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Tabs from '../../../components/ui/Tabs'
import Button from '../../../components/ui/Button'
import Avatar from '../../../components/ui/Avatar'
import StatStrip from '../../../components/ui/StatStrip'
import DataTable, { FilterBar } from '../../../components/ui/DataTable'
import { StatusBadge } from '../../../components/ui/Badge'
import { Drawer, Modal } from '../../../components/ui/Overlay'
import { Field, Input, SearchInput, Select } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { useAuth } from '../../../context/AuthContext'
import { FEATURES } from '../../../config/permissions'
import { PLAN_NAMES } from '../../../config/plans'
import { ALL, useOwnerData } from '../data/OwnerDataContext'
import { OutletTag, PickOutlet, SHIFT_LABEL, SHIFT_SHORT, STAFF_TYPE_LABEL, useScopeLabel } from '../components/common'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const todayName = () => DAYS[(new Date().getDay() + 6) % 7]
export const APP_ACCESS = { MANAGER: 'Biller panel', BILLER: 'Biller panel', CHEF: 'Chef app' }
const SHIFT_HOURS = { MORNING: [6.5, 14.5], EVENING: [14.5, 22.5], GENERAL: [10, 19] }

const onShiftNow = (s) => {
  if (s.status !== 'ACTIVE' || s.weeklyOff === todayName()) return false
  const h = new Date().getHours() + new Date().getMinutes() / 60
  const [a, b] = SHIFT_HOURS[s.shift]
  return h >= a && h < b
}

export default function Staff() {
  const d = useOwnerData()
  const scope = useScopeLabel()
  const [tab, setTab] = useState('PEOPLE')
  const [adding, setAdding] = useState(false)
  const staff = d.scoped(d.staff)
  const { user } = useAuth()
  const loginTypes = Object.keys(APP_ACCESS)
  const limit = { starter: 5, growth: 20 }[user.plan]
  const isLogin = (s) => loginTypes.includes(s.staffType) && s.status === 'ACTIVE'
  const logins = d.staff.filter(isLogin).length // the plan limit is for the whole restaurant

  return (
    <>
      <PageHeader
        title="Staff"
        description={`Employees, roles and shifts at ${scope}.`}
        actions={<Button icon={UserRoundPlus} onClick={() => setAdding(true)}>Add staff</Button>}
      />
      <StatStrip
        className="mb-6"
        items={[
          { label: 'Active staff', value: staff.filter((s) => s.status === 'ACTIVE').length, note: `${staff.filter((s) => s.status !== 'ACTIVE').length} inactive` },
          { label: 'On shift now', value: staff.filter(onShiftNow).length, note: `${new Date().toLocaleDateString('en-IN', { weekday: 'long' })}, by roster` },
          { label: 'App logins', value: staff.filter(isLogin).length, note: limit ? `${logins} of ${limit} allowed on ${PLAN_NAMES[user.plan]}` : 'No limit on your plan', tone: limit && logins >= limit ? 'warn' : undefined },
          { label: 'Kitchen team', value: staff.filter((s) => (s.staffType === 'CHEF' || s.staffType === 'HELPER') && s.status === 'ACTIVE').length, note: 'Chefs and helpers' },
        ]}
      />
      <Tabs className="mb-4" tabs={[{ value: 'PEOPLE', label: 'Employees' }, { value: 'ROSTER', label: 'Shift roster' }]} value={tab} onChange={setTab} label="Staff sections" />
      {tab === 'PEOPLE' ? <People /> : (
        <PickOutlet title="Rosters are per outlet. Choose one." summary={(o) => <span className="text-sm text-ink-700">{d.staff.filter((s) => s.outletId === o.id && onShiftNow(s)).length} on shift now</span>}>
          <Roster />
        </PickOutlet>
      )}
      {adding && <StaffForm staff={{}} onClose={() => setAdding(false)} limitReached={limit && logins >= limit} />}
    </>
  )
}

function People() {
  const d = useOwnerData()
  const [q, setQ] = useState('')
  const [role, setRole] = useState('ALL')
  const [openId, setOpenId] = useState(null)
  const open = d.staff.find((s) => s.id === openId)
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return d.scoped(d.staff)
      .filter((s) => role === 'ALL' || s.staffType === role)
      .filter((s) => !needle || s.name.toLowerCase().includes(needle) || s.phone.replace(/\s/g, '').includes(needle.replace(/\s/g, '')))
      .sort((a, b) => (a.status !== 'ACTIVE') - (b.status !== 'ACTIVE'))
  }, [d.staff, q, role, d.scoped])

  const columns = [
    { key: 'name', header: 'Name', render: (s) => <div className="flex items-center gap-3 min-w-44"><Avatar name={s.name} size="sm" /><div><div className="font-semibold">{s.name}</div><div className="text-[12px] text-ink-500 tabular">{s.phone}</div></div></div> },
    { key: 'role', header: 'Role', render: (s) => <div className="flex flex-col items-start gap-1"><span>{STAFF_TYPE_LABEL[s.staffType]}</span><OutletTag id={s.outletId} /></div> },
    { key: 'shift', header: 'Shift', render: (s) => <span className="whitespace-nowrap">{SHIFT_SHORT[s.shift]}{onShiftNow(s) && <span className="ml-2 text-[12px] text-ok-600 font-semibold">On now</span>}</span> },
    { key: 'off', header: 'Weekly off', render: (s) => s.weeklyOff },
    { key: 'app', header: 'App access', render: (s) => (APP_ACCESS[s.staffType] ? <span className="whitespace-nowrap">{APP_ACCESS[s.staffType]}{s.granted.length ? <span className="text-brand-700"> +{s.granted.length}</span> : ''}</span> : <span className="text-ink-400">No login</span>) },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
  ]
  return (
    <>
      <Panel flush>
        <div className="pt-4" />
        <FilterBar>
          <SearchInput value={q} onChange={setQ} placeholder="Search name or phone" className="flex-1 basis-56" />
          <Select aria-label="Role" className="w-auto" value={role} onChange={(e) => setRole(e.target.value)} options={[{ value: 'ALL', label: 'All roles' }, ...Object.entries(STAFF_TYPE_LABEL).map(([value, label]) => ({ value, label }))]} />
        </FilterBar>
        <DataTable columns={columns} rows={rows} onRowClick={(s) => setOpenId(s.id)} pageSize={15} empty="No staff match these filters." />
      </Panel>
      {open && <StaffForm staff={open} onClose={() => setOpenId(null)} />}
    </>
  )
}

function Roster() {
  const d = useOwnerData()
  const today = todayName()
  const staff = d.staff.filter((s) => s.outletId === d.outletId && s.status === 'ACTIVE')
  return (
    <Panel flush title={`${d.outlet?.name ?? ''} roster`} description="Weekly offs and shifts. Change them from each employee’s details.">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[12px] text-ink-500 border-y border-line bg-canvas/60">
              <th scope="col" className="text-left font-medium pl-5 pr-3 py-2.5">Employee</th>
              {DAYS.map((day) => <th key={day} scope="col" className={clsx('font-medium px-2 py-2.5 text-center w-20', day === today && 'text-brand-700 font-bold')}>{day}{day === today ? ', today' : ''}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {staff.map((s) => (
              <tr key={s.id}>
                <th scope="row" className="text-left font-medium pl-5 pr-3 py-2.5 whitespace-nowrap">{s.name} <span className="text-[12px] text-ink-500 font-normal">{STAFF_TYPE_LABEL[s.staffType]}</span></th>
                {DAYS.map((day) => (
                  <td key={day} className={clsx('px-2 py-2 text-center', day === today && 'bg-brand-50/60')}>
                    {s.weeklyOff === day ? <span className="text-ink-400 text-[12px]">Off</span> : (
                      <span className={clsx('inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold', s.shift === 'MORNING' ? 'bg-warn-50 text-warn-600' : s.shift === 'EVENING' ? 'bg-info-50 text-info-600' : 'bg-ink-900/6 text-ink-700')}>{SHIFT_SHORT[s.shift]}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-3 border-t border-line text-[12px] text-ink-500">{Object.entries(SHIFT_LABEL).map(([, v]) => v).join('. ')}.</p>
    </Panel>
  )
}

function StaffForm({ staff, onClose, limitReached }) {
  const d = useOwnerData()
  const toast = useToast()
  const { can } = useAuth()
  const isNew = !staff.id
  const [form, setForm] = useState({
    name: staff.name ?? '', phone: staff.phone ?? '', staffType: staff.staffType ?? 'BILLER',
    outletId: staff.outletId ?? (d.outletId !== ALL ? d.outletId : d.activeOutlets[0].id), shift: staff.shift ?? 'MORNING', weeklyOff: staff.weeklyOff ?? 'Tue',
  })
  const [errors, setErrors] = useState({})
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setErrors({ ...errors, [k]: null }) }
  const needsLogin = !!APP_ACCESS[form.staffType]
  const blocked = isNew && needsLogin && limitReached

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Enter a name.'
    if (form.phone.replace(/\D/g, '').length < 10) errs.phone = 'Enter a 10-digit mobile number.'
    if (Object.keys(errs).length) return setErrors(errs)
    const saved = d.saveStaff({ ...staff, ...form, name: form.name.trim(), phone: form.phone.trim() })
    toast(isNew ? (needsLogin ? `${saved.name} added. Login details sent by SMS to ${saved.phone}.` : `${saved.name} added.`) : `${saved.name} saved.`)
    onClose()
  }

  const fields = (
    <form id="staff-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name" error={errors.name}>{({ id, invalid }) => <Input id={id} invalid={invalid} value={form.name} onChange={set('name')} />}</Field>
      <Field label="Mobile number" error={errors.phone} hint={needsLogin ? 'Used to sign in with OTP' : undefined}>{({ id, invalid }) => <Input id={id} invalid={invalid} type="tel" value={form.phone} onChange={set('phone')} placeholder="98450 12345" />}</Field>
      <Field label="Role" hint={needsLogin ? `Signs in to the ${APP_ACCESS[form.staffType].toLowerCase()}` : 'No app login'}>{({ id }) => <Select id={id} value={form.staffType} onChange={set('staffType')} options={Object.entries(STAFF_TYPE_LABEL).map(([value, label]) => ({ value, label }))} />}</Field>
      {d.outlets.length > 1 && <Field label="Outlet">{({ id }) => <Select id={id} value={form.outletId} onChange={set('outletId')} options={d.activeOutlets.map((o) => ({ value: o.id, label: o.name }))} />}</Field>}
      <Field label="Shift">{({ id }) => <Select id={id} value={form.shift} onChange={set('shift')} options={Object.entries(SHIFT_LABEL).map(([value, label]) => ({ value, label }))} />}</Field>
      <Field label="Weekly off">{({ id }) => <Select id={id} value={form.weeklyOff} onChange={set('weeklyOff')} options={DAYS} />}</Field>
      {blocked && <p className="sm:col-span-2 text-[13px] text-danger-600">Your plan’s staff login limit is reached. Deactivate someone or upgrade your plan to add another {STAFF_TYPE_LABEL[form.staffType].toLowerCase()}.</p>}
    </form>
  )

  if (isNew) {
    return (
      <Modal open onClose={onClose} title="Add staff" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="staff-form" disabled={blocked}>Add staff</Button></>}>
        {fields}
      </Modal>
    )
  }
  return (
    <Drawer
      open
      onClose={onClose}
      title={staff.name}
      subtitle={<span className="inline-flex items-center gap-2">{STAFF_TYPE_LABEL[staff.staffType]}, {d.outletName(staff.outletId)} <StatusBadge status={staff.status} /></span>}
      footer={
        <>
          {staff.status === 'ACTIVE'
            ? <Button variant="danger" icon={Ban} className="mr-auto" onClick={() => { d.setStaffStatus(staff, 'INACTIVE'); toast(`${staff.name} deactivated and signed out.`); onClose() }}>Deactivate</Button>
            : <Button variant="secondary" icon={RotateCcw} className="mr-auto" onClick={() => { d.setStaffStatus(staff, 'ACTIVE'); toast(`${staff.name} reactivated.`) }}>Reactivate</Button>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="staff-form">Save</Button>
        </>
      }
    >
      {fields}
      {APP_ACCESS[staff.staffType] && can(FEATURES.owner.ACCESS) && (
        <Link to="/owner/access" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-600">
          Change what {staff.name.split(' ')[0]} can open <ArrowUpRight className="size-4" />
        </Link>
      )}
    </Drawer>
  )
}
