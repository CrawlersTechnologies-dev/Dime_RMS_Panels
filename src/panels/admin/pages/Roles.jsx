import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { Lock } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Button from '../../../components/ui/Button'
import { Toggle } from '../../../components/ui/Form'
import { Modal } from '../../../components/ui/Overlay'
import { useToast } from '../../../components/ui/Toast'
import { FEATURE_GROUPS } from '../../../config/permissions'
import { useAdminData } from '../data/AdminDataContext'

const ROLE_SECTIONS = [
  {
    label: 'Restaurant roles',
    note: 'Defaults for every restaurant. Owners can give their staff more, but nobody gets a feature their plan doesn’t include.',
    roles: [
      { key: 'OWNER_ADMIN', label: 'Restaurant owner', groups: ['owner'] },
      { key: 'OWNER_PARTNER', label: 'Owner partner', groups: ['owner'] },
      { key: 'MANAGER', label: 'Manager', groups: ['pos'] },
      { key: 'BILLER', label: 'Biller', groups: ['pos'] },
      { key: 'CHEF', label: 'Chef', groups: ['chef'] },
    ],
  },
  {
    label: 'Admin team roles',
    note: 'What each Dime Quest team member can open in this panel.',
    roles: [
      { key: 'Super Admin', label: 'Super Admin', groups: ['admin'], locked: true },
      { key: 'Operations', label: 'Operations', groups: ['admin'] },
      { key: 'Support', label: 'Support', groups: ['admin'] },
      { key: 'Finance', label: 'Finance', groups: ['admin'] },
    ],
  },
]
const ALL_ROLES = ROLE_SECTIONS.flatMap((s) => s.roles.map((r) => ({ ...r, section: s })))

export default function Roles() {
  const { roleAccess, saveRoleAccess, users } = useAdminData()
  const toast = useToast()
  const [roleKey, setRoleKey] = useState('MANAGER')
  const role = ALL_ROLES.find((r) => r.key === roleKey)
  const [draft, setDraft] = useState(() => new Set(roleAccess[roleKey]))

  useEffect(() => setDraft(new Set(roleAccess[roleKey])), [roleKey, roleAccess])

  const saved = useMemo(() => new Set(roleAccess[roleKey]), [roleAccess, roleKey])
  const changed = [...new Set([...saved, ...draft])].filter((f) => saved.has(f) !== draft.has(f)).length
  const groups = FEATURE_GROUPS.filter((g) => role.groups.includes(g.id))
  const holders = users.filter((u) => u.teamRole === roleKey || u.role === roleKey || u.staffType === roleKey).length

  const flip = (f, on) => setDraft((d) => { const n = new Set(d); on ? n.add(f) : n.delete(f); return n })
  const [pendingRole, setPendingRole] = useState(null)
  const switchRole = (k) => (changed && k !== roleKey ? setPendingRole(k) : setRoleKey(k))

  return (
    <>
      <PageHeader title="Roles and access" description="Set which features each role gets by default." />
      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
        <nav aria-label="Roles" className="flex flex-col gap-5">
          {ROLE_SECTIONS.map((s) => (
            <div key={s.label}>
              <h2 className="text-[13px] font-bold text-ink-500 mb-2 px-1">{s.label}</h2>
              <ul className="flex flex-col gap-1">
                {s.roles.map((r) => {
                  const count = roleAccess[r.key].length
                  const total = FEATURE_GROUPS.filter((g) => r.groups.includes(g.id)).reduce((n, g) => n + Object.keys(g.features).length, 0)
                  return (
                    <li key={r.key}>
                      <button
                        onClick={() => switchRole(r.key)}
                        aria-current={r.key === roleKey ? 'true' : undefined}
                        className={clsx(
                          'w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm cursor-pointer border',
                          r.key === roleKey ? 'bg-surface border-brand-500 shadow-[0_0_0_3px_var(--color-brand-100)]' : 'border-transparent hover:bg-surface hover:border-line',
                        )}
                      >
                        <span className="font-semibold">{r.label}</span>
                        <span className="text-[12px] text-ink-500 tabular">{count} of {total}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <Panel
          title={role.label}
          description={role.section.note}
          actions={
            role.locked ? (
              <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-500"><Lock className="size-4" /> Always has full access</span>
            ) : (
              <>
                <Button variant="ghost" size="sm" disabled={!changed} onClick={() => setDraft(new Set(saved))}>Discard</Button>
                <Button
                  size="sm"
                  disabled={!changed}
                  onClick={() => { saveRoleAccess(roleKey, [...draft]); toast(`${role.label} defaults saved.`) }}
                >
                  {changed ? `Save ${changed} change${changed > 1 ? 's' : ''}` : 'Saved'}
                </Button>
              </>
            )
          }
        >
          <p className="text-[13px] text-ink-500 -mt-1 mb-4">{holders} {holders === 1 ? 'person has' : 'people have'} this role.</p>
          {groups.map((g) => (
            <div key={g.id} className="border-t border-line pt-4 first:border-0 first:pt-0">
              <h3 className="text-sm font-bold mb-1">{g.label}</h3>
              <ul className="grid sm:grid-cols-2 gap-x-8">
                {Object.entries(g.features).map(([key, label]) => (
                  <li key={key} className="py-2.5 border-b border-line/70">
                    <Toggle size="sm" label={label} checked={draft.has(key)} disabled={role.locked} onChange={(on) => flip(key, on)} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Panel>
      </div>
      <Modal
        open={!!pendingRole}
        onClose={() => setPendingRole(null)}
        title={`Discard ${changed} unsaved change${changed > 1 ? 's' : ''}?`}
        description={`Your changes to ${role.label} haven’t been saved.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingRole(null)}>Keep editing</Button>
            <Button variant="dark" onClick={() => { setRoleKey(pendingRole); setPendingRole(null) }}>Discard changes</Button>
          </>
        }
      />
    </>
  )
}
