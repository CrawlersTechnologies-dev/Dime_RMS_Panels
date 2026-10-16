import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { Lock } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Button from '../../../components/ui/Button'
import Avatar from '../../../components/ui/Avatar'
import Badge from '../../../components/ui/Badge'
import { SearchInput, Toggle } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { useAuth } from '../../../context/AuthContext'
import { usePlatform } from '../../../context/PlatformContext'
import { FEATURE_GROUPS } from '../../../config/permissions'
import { PLAN_NAMES } from '../../../config/plans'
import { useOwnerData } from '../data/OwnerDataContext'
import { OutletTag, STAFF_TYPE_LABEL, useScopeLabel } from '../components/common'
import { APP_ACCESS } from './Staff'

const GROUP_FOR = { MANAGER: 'pos', BILLER: 'pos', CHEF: 'chef' }

/**
 * What a staff member can open = their plan's features ∩ (role defaults ∪ what you grant here).
 * Role defaults come from Dime Quest; the owner can only add on top, and only within the plan.
 */
export default function Access() {
  const d = useOwnerData()
  const toast = useToast()
  const scope = useScopeLabel()
  const { user } = useAuth()
  const { planFeatures, roleAccess } = usePlatform()
  const plan = useMemo(() => new Set(planFeatures[user.plan] ?? []), [planFeatures, user.plan])
  const [q, setQ] = useState('')

  const people = d.scoped(d.staff).filter((s) => APP_ACCESS[s.staffType] && s.status === 'ACTIVE' && (!q.trim() || s.name.toLowerCase().includes(q.trim().toLowerCase())))
  const [selectedId, setSelectedId] = useState(people[0]?.id)
  const selected = d.staff.find((s) => s.id === selectedId) ?? people[0]
  const [draft, setDraft] = useState(new Set(selected?.granted ?? []))
  useEffect(() => setDraft(new Set(selected?.granted ?? [])), [selected?.id, selected?.granted])

  if (!selected) {
    return (
      <>
        <PageHeader title="Access management" />
        <Panel><p className="text-sm text-ink-500 py-6 text-center">No managers, billers or chefs at {scope} yet. Add them under Staff.</p></Panel>
      </>
    )
  }

  const group = FEATURE_GROUPS.find((g) => g.id === GROUP_FOR[selected.staffType])
  const defaults = new Set(roleAccess[selected.staffType] ?? [])
  const saved = new Set(selected.granted)
  const changed = [...new Set([...saved, ...draft])].filter((f) => saved.has(f) !== draft.has(f)).length
  const effective = Object.keys(group.features).filter((f) => plan.has(f) && (defaults.has(f) || draft.has(f))).length

  return (
    <>
      <PageHeader title="Access management" description="Give managers, billers and chefs extra features on top of what their role includes." />

      <div className="rounded-[var(--radius-panel)] border border-line bg-surface px-5 py-4 mb-6 text-sm grid gap-3 sm:grid-cols-3">
        <p><span className="font-semibold">Role includes</span><br /><span className="text-ink-500">Set by Dime Quest for every restaurant. Always on.</span></p>
        <p><span className="font-semibold">You can add</span><br /><span className="text-ink-500">Anything else your {PLAN_NAMES[user.plan]} plan has. Applies at their next sign-in.</span></p>
        <p><span className="font-semibold">Not in your plan</span><br /><span className="text-ink-500">Locked for everyone until you upgrade.</span></p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-3">
          <SearchInput value={q} onChange={setQ} placeholder="Search staff" />
          <ul className="flex flex-col gap-1 max-h-[34rem] overflow-y-auto">
            {people.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setSelectedId(s.id)}
                  aria-current={s.id === selected.id ? 'true' : undefined}
                  className={clsx('w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left cursor-pointer border', s.id === selected.id ? 'bg-surface border-brand-500 shadow-[0_0_0_3px_var(--color-brand-100)]' : 'border-transparent hover:bg-surface hover:border-line')}
                >
                  <Avatar name={s.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{s.name}</span>
                    <span className="flex items-center gap-1.5 text-[12px] text-ink-500">{STAFF_TYPE_LABEL[s.staffType]} <OutletTag id={s.outletId} /></span>
                  </span>
                  {s.granted.length > 0 && <Badge tone="brand">+{s.granted.length}</Badge>}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <Panel
          title={selected.name}
          description={`${STAFF_TYPE_LABEL[selected.staffType]} at ${d.outletName(selected.outletId)}. Can open ${effective} of ${Object.keys(group.features).length} features in the ${group.label.toLowerCase()}.`}
          actions={
            <>
              <Button variant="ghost" size="sm" disabled={!changed} onClick={() => setDraft(new Set(saved))}>Discard</Button>
              <Button size="sm" disabled={!changed} onClick={() => { d.setStaffAccess(selected, [...draft]); toast(`${selected.name}’s access saved. It applies at their next sign-in.`) }}>
                {changed ? `Save ${changed} change${changed > 1 ? 's' : ''}` : 'Saved'}
              </Button>
            </>
          }
        >
          <ul className="divide-y divide-line">
            {Object.entries(group.features).map(([key, label]) => {
              const inPlan = plan.has(key)
              const byRole = defaults.has(key)
              const note = !inPlan ? 'Not in your plan' : byRole ? `Included with the ${STAFF_TYPE_LABEL[selected.staffType].toLowerCase()} role` : draft.has(key) ? 'Added by you' : null
              return (
                <li key={key} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className={clsx('text-sm font-semibold', !inPlan && 'text-ink-400')}>{label}</div>
                    {note && <div className={clsx('text-[12px] inline-flex items-center gap-1', !inPlan ? 'text-ink-400' : draft.has(key) && !byRole ? 'text-brand-700' : 'text-ink-500')}>{!inPlan && <Lock className="size-3" aria-hidden />}{note}</div>}
                  </div>
                  <Toggle
                    size="sm"
                    ariaLabel={label}
                    checked={inPlan && (byRole || draft.has(key))}
                    disabled={!inPlan || byRole}
                    onChange={(on) => setDraft((s) => { const n = new Set(s); on ? n.add(key) : n.delete(key); return n })}
                  />
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>
    </>
  )
}
