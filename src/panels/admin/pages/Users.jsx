import { useMemo, useState } from 'react'
import { Ban, KeyRound, RotateCcw, UserPlus } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Tabs from '../../../components/ui/Tabs'
import Button from '../../../components/ui/Button'
import Avatar from '../../../components/ui/Avatar'
import DataTable, { FilterBar } from '../../../components/ui/DataTable'
import { StatusBadge } from '../../../components/ui/Badge'
import { Drawer, Modal } from '../../../components/ui/Overlay'
import { Field, Input, SearchInput, Select } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { ROLE_LABELS } from '../../../config/permissions'
import { timeAgo } from '../../../lib/format'
import { ADMIN_TEAM_ROLES } from '../data/records'
import { useAdminData } from '../data/AdminDataContext'
import { Dl, Section } from '../components/RegistrationReview'

const STAFF_LABELS = { MANAGER: 'Manager', BILLER: 'Biller', CHEF: 'Chef' }
export const roleLabel = (u) =>
  u.role === 'GLOBAL_ADMIN' ? `Admin, ${u.teamRole}` : u.role === 'RMS_STAFF' ? STAFF_LABELS[u.staffType] : ROLE_LABELS[u.role]

const TABS = [
  { value: 'ALL', label: 'All', roles: null },
  { value: 'ADMIN', label: 'Admin team', roles: ['GLOBAL_ADMIN'] },
  { value: 'OWNERS', label: 'Owners and partners', roles: ['OWNER_ADMIN', 'OWNER_PARTNER'] },
  { value: 'STAFF', label: 'Restaurant staff', roles: ['RMS_STAFF'] },
  { value: 'SALES', label: 'Sales people', roles: ['SALES_PERSON'] },
  { value: 'CUSTOMERS', label: 'Customers', roles: ['CUSTOMER'] },
]

export default function Users() {
  const { users } = useAdminData()
  const [tab, setTab] = useState('ALL')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('ALL')
  const [selectedId, setSelectedId] = useState(null)
  const [inviting, setInviting] = useState(false)
  const selected = users.find((u) => u.id === selectedId)

  const inTab = (u, t) => !t.roles || t.roles.includes(u.role)
  const rows = useMemo(() => {
    const t = TABS.find((x) => x.value === tab)
    const needle = q.trim().toLowerCase()
    return users
      .filter((u) => inTab(u, t))
      .filter((u) => status === 'ALL' || u.status === status)
      .filter((u) => !needle || [u.name, u.email, u.phone, u.org].some((v) => v?.toLowerCase().includes(needle)))
  }, [users, tab, q, status])

  const columns = [
    {
      key: 'name', header: 'Name',
      render: (u) => (
        <div className="flex items-center gap-3 min-w-52">
          <Avatar name={u.name} size="sm" />
          <div className="min-w-0">
            <div className="font-semibold">{u.name}</div>
            <div className="text-[12px] text-ink-500 truncate">{u.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', render: roleLabel, className: 'whitespace-nowrap' },
    { key: 'org', header: 'Organisation', render: (u) => <span className="whitespace-nowrap">{u.org}</span> },
    { key: 'lastActive', header: 'Last active', render: (u) => <span className="text-ink-500 whitespace-nowrap">{u.lastActive ? timeAgo(u.lastActive) : 'Never'}</span> },
    { key: 'status', header: 'Status', render: (u) => <StatusBadge status={u.status} /> },
  ]

  return (
    <>
      <PageHeader
        title="User management"
        description="Everyone who can sign in to Dime Quest. Owners manage their own staff; you can suspend any account."
        actions={<Button icon={UserPlus} onClick={() => setInviting(true)}>Invite admin user</Button>}
      />
      <Panel flush>
        <div className="px-5 pt-4 pb-3">
          <Tabs tabs={TABS.map((t) => ({ value: t.value, label: t.label, count: users.filter((u) => inTab(u, t)).length }))} value={tab} onChange={setTab} label="User type" />
        </div>
        <FilterBar>
          <SearchInput value={q} onChange={setQ} placeholder="Search name, email, phone or restaurant" className="flex-1 basis-64" />
          <Select aria-label="Status" className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'ALL', label: 'Any status' }, { value: 'ACTIVE', label: 'Active' }, { value: 'INVITED', label: 'Invited' }, { value: 'SUSPENDED', label: 'Suspended' }]} />
        </FilterBar>
        <DataTable columns={columns} rows={rows} onRowClick={(u) => setSelectedId(u.id)} empty="No users match these filters." />
      </Panel>
      {selected && <UserDrawer u={selected} onClose={() => setSelectedId(null)} />}
      <InviteModal open={inviting} onClose={() => setInviting(false)} />
    </>
  )
}

function UserDrawer({ u, onClose }) {
  const { setUserStatus } = useAdminData()
  const toast = useToast()
  const isSelf = u.id === 'U-001'
  return (
    <Drawer
      open
      onClose={onClose}
      title={u.name}
      subtitle={<span className="inline-flex items-center gap-2">{roleLabel(u)} <StatusBadge status={u.status} /></span>}
      footer={
        <>
          <Button variant="secondary" icon={KeyRound} onClick={() => toast(`Password reset link sent to ${u.email}.`)}>Send password reset</Button>
          {u.status === 'SUSPENDED' ? (
            <Button icon={RotateCcw} onClick={() => { setUserStatus(u, 'ACTIVE'); toast(`${u.name} reactivated.`) }}>Reactivate</Button>
          ) : (
            <Button variant="danger" icon={Ban} disabled={isSelf} title={isSelf ? 'You can’t suspend your own account' : undefined} onClick={() => { setUserStatus(u, 'SUSPENDED'); toast(`${u.name} suspended and signed out.`) }}>
              Suspend
            </Button>
          )}
        </>
      }
    >
      <Section title="Contact">
        <Dl rows={[['Email', u.email], ['Phone', u.phone]]} />
      </Section>
      <Section title="Account">
        <Dl rows={[['Role', roleLabel(u)], ['Organisation', u.org], ['Last active', u.lastActive ? timeAgo(u.lastActive) : 'Hasn’t signed in yet'], ['User ID', u.id]]} />
      </Section>
      {u.role === 'RMS_STAFF' && (
        <p className="text-[13px] text-ink-500">Feature access for staff is set by the restaurant owner within their plan. Defaults per staff type are under Roles and access.</p>
      )}
    </Drawer>
  )
}

function InviteModal({ open, onClose }) {
  const { inviteAdmin } = useAdminData()
  const toast = useToast()
  const empty = { name: '', email: '', phone: '', teamRole: 'Operations' }
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: null })) }

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Enter a name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email address.'
    if (Object.keys(errs).length) return setErrors(errs)
    inviteAdmin(form)
    toast(`Invite sent to ${form.email}.`)
    setForm(empty)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite admin user"
      description="They get an email to set a password. Their access comes from the team role you pick."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="invite-admin">Send invite</Button>
        </>
      }
    >
      <form id="invite-admin" onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Full name" required error={errors.name}>{({ id, invalid }) => <Input id={id} invalid={invalid} value={form.name} onChange={set('name')} />}</Field>
        <Field label="Work email" required error={errors.email}>{({ id, invalid }) => <Input id={id} type="email" invalid={invalid} value={form.email} onChange={set('email')} />}</Field>
        <Field label="Phone">{({ id }) => <Input id={id} type="tel" value={form.phone} onChange={set('phone')} placeholder="+91" />}</Field>
        <Field label="Team role" hint="Change what each team role can open under Roles and access.">
          {({ id }) => <Select id={id} value={form.teamRole} onChange={set('teamRole')} options={ADMIN_TEAM_ROLES} />}
        </Field>
      </form>
    </Modal>
  )
}
