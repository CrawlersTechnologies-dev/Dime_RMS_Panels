import { useState } from 'react'
import { Bell, Send } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Tabs from '../../../components/ui/Tabs'
import Button from '../../../components/ui/Button'
import DataTable from '../../../components/ui/DataTable'
import Badge, { StatusBadge } from '../../../components/ui/Badge'
import { Checkbox, Field, Input, Select, Textarea, Toggle } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { formatDateTime, formatNumber } from '../../../lib/format'
import * as seed from '../data/records'
import { useAdminData } from '../data/AdminDataContext'

const CHANNELS = ['In-app', 'Email', 'SMS', 'WhatsApp']
const SMS_LIMIT = 160

export default function Notifications() {
  const [tab, setTab] = useState('COMPOSE')
  const [broadcasts, setBroadcasts] = useState(seed.broadcasts)
  return (
    <>
      <PageHeader title="Notifications" description="Send updates to restaurants and sales people, and choose which alerts go out automatically." />
      <Tabs
        tabs={[
          { value: 'COMPOSE', label: 'Send an update' },
          { value: 'HISTORY', label: 'Sent and scheduled', count: broadcasts.length },
          { value: 'AUTO', label: 'Automatic alerts' },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-4"
        label="Notification sections"
      />
      {tab === 'COMPOSE' && <Compose onSent={(b) => { setBroadcasts((bs) => [b, ...bs]); setTab('HISTORY') }} />}
      {tab === 'HISTORY' && <History broadcasts={broadcasts} />}
      {tab === 'AUTO' && <AutoAlerts />}
    </>
  )
}

function Compose({ onSent }) {
  const { plans, restaurants, salesPeople, log } = useAdminData()
  const toast = useToast()
  const cities = [...new Set(restaurants.map((r) => r.city))].sort()
  const [form, setForm] = useState({ audience: 'ALL', plan: plans[0].name, city: cities[0], channels: ['In-app'], title: '', message: '', when: 'NOW', at: '' })
  const [errors, setErrors] = useState({})
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: null })) }

  const reach = {
    ALL: restaurants.filter((r) => r.status === 'ACTIVE').length,
    PLAN: restaurants.filter((r) => r.status === 'ACTIVE' && r.plan === form.plan).length,
    CITY: restaurants.filter((r) => r.status === 'ACTIVE' && r.city === form.city).length,
    SALES: salesPeople.length,
  }[form.audience]
  const audienceLabel = { ALL: 'All restaurants', PLAN: `${form.plan} plan owners`, CITY: `Restaurants in ${form.city}`, SALES: 'Sales people' }[form.audience]
  const smsOver = form.channels.includes('SMS') && form.message.length > SMS_LIMIT

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.title.trim()) errs.title = 'Add a title.'
    if (!form.message.trim()) errs.message = 'Write the message.'
    if (!form.channels.length) errs.channels = 'Pick at least one channel.'
    if (form.when === 'LATER' && !form.at) errs.at = 'Pick a date and time.'
    if (Object.keys(errs).length) return setErrors(errs)
    const b = { id: `N-${Date.now() % 1000}`, title: form.title.trim(), audience: audienceLabel, channels: form.channels, sentAt: form.when === 'NOW' ? new Date().toISOString() : new Date(form.at).toISOString(), reach, status: form.when === 'NOW' ? 'SENT' : 'SCHEDULED' }
    log('Notifications', form.when === 'NOW' ? 'Sent broadcast' : 'Scheduled broadcast', `${b.title} (${b.id})`, { reach: [null, reach] })
    toast(form.when === 'NOW' ? `Sent to ${formatNumber(reach)} recipients.` : `Scheduled for ${formatDateTime(b.sentAt)}.`)
    onSent(b)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <Panel>
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Send to">
              {({ id }) => (
                <Select id={id} value={form.audience} onChange={(e) => set('audience', e.target.value)} options={[{ value: 'ALL', label: 'All restaurants' }, { value: 'PLAN', label: 'Owners on a plan' }, { value: 'CITY', label: 'Restaurants in a city' }, { value: 'SALES', label: 'Sales people' }]} />
              )}
            </Field>
            {form.audience === 'PLAN' && <Field label="Plan">{({ id }) => <Select id={id} value={form.plan} onChange={(e) => set('plan', e.target.value)} options={plans.map((p) => p.name)} />}</Field>}
            {form.audience === 'CITY' && <Field label="City">{({ id }) => <Select id={id} value={form.city} onChange={(e) => set('city', e.target.value)} options={cities} />}</Field>}
          </div>

          <fieldset>
            <legend className="text-[13px] font-semibold text-ink-800 mb-2">Channels</legend>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {CHANNELS.map((c) => (
                <Checkbox key={c} label={c} checked={form.channels.includes(c)} onChange={(v) => set('channels', v ? [...form.channels, c] : form.channels.filter((x) => x !== c))} />
              ))}
            </div>
            {errors.channels && <p className="text-[12px] text-danger-600 mt-1.5">{errors.channels}</p>}
          </fieldset>

          <Field label="Title" error={errors.title}>{({ id, invalid }) => <Input id={id} invalid={invalid} value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={80} />}</Field>
          <Field
            label="Message"
            error={errors.message}
            hint={
              <span className={smsOver ? 'text-danger-600' : undefined}>
                {form.message.length} characters{form.channels.includes('SMS') ? `, SMS sends the first ${SMS_LIMIT}` : ''}
              </span>
            }
          >
            {({ id, invalid }) => <Textarea id={id} invalid={invalid} rows={5} value={form.message} onChange={(e) => set('message', e.target.value)} />}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2 items-end">
            <Field label="When">{({ id }) => <Select id={id} value={form.when} onChange={(e) => set('when', e.target.value)} options={[{ value: 'NOW', label: 'Send now' }, { value: 'LATER', label: 'Schedule' }]} />}</Field>
            {form.when === 'LATER' && <Field label="Date and time" error={errors.at}>{({ id, invalid }) => <Input id={id} invalid={invalid} type="datetime-local" value={form.at} onChange={(e) => set('at', e.target.value)} />}</Field>}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <span className="text-[13px] text-ink-500">Reaches <span className="font-semibold text-ink-800 tabular">{formatNumber(reach)}</span> {form.audience === 'SALES' ? 'sales people' : 'restaurants'}</span>
            <Button type="submit" icon={Send}>{form.when === 'NOW' ? 'Send update' : 'Schedule update'}</Button>
          </div>
        </form>
      </Panel>

      <div className="lg:sticky lg:top-24">
        <h2 className="text-[13px] font-bold text-ink-500 mb-2">In-app preview</h2>
        <div className="rounded-2xl bg-ink-900 p-4">
          <div className="rounded-xl bg-surface p-4 flex gap-3">
            <span className="grid place-items-center size-9 shrink-0 rounded-full bg-brand-500 text-white"><Bell className="size-4" /></span>
            <div className="min-w-0">
              <div className="text-[12px] text-ink-500">Dime Quest, now</div>
              <div className="font-semibold text-sm break-words">{form.title || 'Your title appears here'}</div>
              <p className="text-[13px] text-ink-700 mt-0.5 break-words line-clamp-4">{form.message || 'The message shows here, up to four lines in the notification list.'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function History({ broadcasts }) {
  const columns = [
    { key: 'title', header: 'Update', render: (b) => <div className="min-w-56"><div className="font-semibold">{b.title}</div><div className="text-[12px] text-ink-500">{b.audience}</div></div> },
    { key: 'channels', header: 'Channels', render: (b) => <div className="flex flex-wrap gap-1">{b.channels.map((c) => <Badge key={c}>{c}</Badge>)}</div> },
    { key: 'reach', header: 'Recipients', align: 'right', render: (b) => formatNumber(b.reach) },
    { key: 'sentAt', header: 'When', render: (b) => <span className="whitespace-nowrap text-ink-700">{formatDateTime(b.sentAt)}</span> },
    { key: 'status', header: 'Status', render: (b) => <StatusBadge status={b.status} /> },
  ]
  return <Panel flush><div className="pt-1" /><DataTable columns={columns} rows={broadcasts} /></Panel>
}

function AutoAlerts() {
  const { log } = useAdminData()
  const toast = useToast()
  const [alerts, setAlerts] = useState(seed.automatedAlerts)
  return (
    <Panel title="Automatic alerts" description="Sent by the system when these events happen.">
      <ul className="divide-y divide-line">
        {alerts.map((a) => (
          <li key={a.id} className="py-3.5 first:pt-0 last:pb-0">
            <Toggle
              label={a.event}
              description={`To ${a.to.toLowerCase()} by ${a.channels.toLowerCase()}`}
              checked={a.enabled}
              onChange={(v) => {
                setAlerts((xs) => xs.map((x) => (x.id === a.id ? { ...x, enabled: v } : x)))
                log('Notifications', v ? 'Turned on alert' : 'Turned off alert', a.event)
                toast(`${a.event}: ${v ? 'on' : 'off'}.`)
              }}
            />
          </li>
        ))}
      </ul>
    </Panel>
  )
}
