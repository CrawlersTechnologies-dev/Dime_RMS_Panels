import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { ArrowLeft, Bot, CheckCheck, Plus, Send } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Tabs from '../../../components/ui/Tabs'
import Button from '../../../components/ui/Button'
import Avatar from '../../../components/ui/Avatar'
import Badge, { StatusBadge } from '../../../components/ui/Badge'
import { Modal } from '../../../components/ui/Overlay'
import { Field, Input, Textarea, Toggle } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { useAuth } from '../../../context/AuthContext'
import { formatNumber, timeAgo } from '../../../lib/format'
import * as seed from '../data/records'
import { useAdminData } from '../data/AdminDataContext'

const FILTERS = [
  { value: 'NEEDS_AGENT', label: 'Needs agent' },
  { value: 'BOT', label: 'Bot handling' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'ALL', label: 'All' },
]

export default function SupportBot() {
  const [tab, setTab] = useState('INBOX')
  const [conversations, setConversations] = useState(seed.conversations)
  const waiting = conversations.filter((c) => c.status === 'NEEDS_AGENT').length
  return (
    <>
      <PageHeader title="Support chatbot" description="The bot answers common questions from customers, owners and sales people, and hands the rest to your support team." />
      <Tabs tabs={[{ value: 'INBOX', label: 'Inbox', count: waiting }, { value: 'ANSWERS', label: 'Bot answers' }]} value={tab} onChange={setTab} className="mb-4" label="Support sections" />
      {tab === 'INBOX' ? <Inbox conversations={conversations} setConversations={setConversations} /> : <BotAnswers />}
    </>
  )
}

function Inbox({ conversations, setConversations }) {
  const { user } = useAuth()
  const { log } = useAdminData()
  const toast = useToast()
  const [filter, setFilter] = useState('NEEDS_AGENT')
  const [activeId, setActiveId] = useState(conversations.find((c) => c.status === 'NEEDS_AGENT')?.id ?? null)
  const [reply, setReply] = useState('')
  const [mobileThread, setMobileThread] = useState(false)
  const end = useRef(null)

  const list = conversations.filter((c) => filter === 'ALL' || c.status === filter).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  const active = conversations.find((c) => c.id === activeId)

  useEffect(() => { if (end.current) end.current.scrollTop = end.current.scrollHeight }, [activeId, active?.messages.length, mobileThread])

  const update = (id, fn) => setConversations((cs) => cs.map((c) => (c.id === id ? fn(c) : c)))
  const send = (e) => {
    e.preventDefault()
    if (!reply.trim()) return
    const now = new Date().toISOString()
    update(active.id, (c) => ({ ...c, status: 'NEEDS_AGENT', updatedAt: now, messages: [...c.messages, { by: 'agent', agent: user.name, text: reply.trim(), at: now }] }))
    setReply('')
  }
  const resolve = () => {
    update(active.id, (c) => ({ ...c, status: 'RESOLVED', updatedAt: new Date().toISOString() }))
    log('Support', 'Resolved conversation', active.id, { status: [active.status, 'RESOLVED'] })
    toast(`Conversation with ${active.from} resolved.`)
  }

  return (
    <section className="min-w-0 bg-surface border border-line rounded-[var(--radius-panel)] overflow-hidden grid lg:grid-cols-[22rem_minmax(0,1fr)] h-[min(44rem,calc(100dvh-14rem))] min-h-[30rem]">
      <div className={clsx('flex flex-col border-r border-line min-h-0', mobileThread && 'max-lg:hidden')}>
        <div className="flex gap-1 p-3 border-b border-line overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={clsx('h-8 px-3 rounded-full text-[13px] font-semibold whitespace-nowrap cursor-pointer', filter === f.value ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-ink-900/5')}
            >
              {f.label}
            </button>
          ))}
        </div>
        <ul className="flex-1 overflow-y-auto divide-y divide-line">
          {list.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => { setActiveId(c.id); setMobileThread(true) }}
                aria-current={c.id === activeId ? 'true' : undefined}
                className={clsx('w-full text-left flex gap-3 px-4 py-3.5 cursor-pointer', c.id === activeId ? 'bg-brand-50' : 'hover:bg-canvas')}
              >
                <Avatar name={c.from} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-sm truncate">{c.from}</span>
                    <span className="text-[11px] text-ink-400 shrink-0">{timeAgo(c.updatedAt)}</span>
                  </div>
                  <div className="text-[13px] text-ink-700 truncate">{c.topic}</div>
                  <div className="text-[12px] text-ink-500 truncate">{c.kind}{c.restaurant ? `, ${c.restaurant}` : ''}</div>
                </div>
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="px-4 py-10 text-center text-sm text-ink-500">Nothing here. Conversations the bot can’t answer land in Needs agent.</li>}
        </ul>
      </div>

      <div className={clsx('flex flex-col min-h-0 min-w-0', !mobileThread && 'max-lg:hidden')}>
        {active ? (
          <>
            <header className="flex flex-wrap items-center gap-3 px-5 py-3.5 border-b border-line">
              <button className="lg:hidden p-1.5 -ml-1.5 rounded-full hover:bg-ink-900/5" onClick={() => setMobileThread(false)} aria-label="Back to conversations"><ArrowLeft className="size-5" /></button>
              <div className="min-w-0 flex-1">
                <div className="font-bold truncate">{active.topic}</div>
                <div className="text-[12px] text-ink-500">{active.from}, {active.kind.toLowerCase()}{active.restaurant ? ` at ${active.restaurant}` : ''}</div>
              </div>
              <StatusBadge status={active.status} />
              {active.status !== 'RESOLVED' && <Button size="sm" variant="secondary" icon={CheckCheck} onClick={resolve}>Resolve</Button>}
            </header>
            <ol ref={end} className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-3 bg-canvas/50">
              {active.messages.map((m, i) => (
                <li key={i} className={clsx('max-w-[85%] flex flex-col', m.by === 'user' ? 'self-start items-start' : 'self-end items-end')}>
                  <span className="text-[11px] text-ink-500 mb-1 inline-flex items-center gap-1">
                    {m.by === 'bot' && <Bot className="size-3" aria-hidden />}
                    {m.by === 'user' ? active.from : m.by === 'bot' ? 'Bot' : m.agent}, {timeAgo(m.at)}
                  </span>
                  <p className={clsx('rounded-2xl px-4 py-2.5 text-sm break-words', m.by === 'user' ? 'bg-surface border border-line rounded-tl-md' : m.by === 'bot' ? 'bg-info-50 text-ink-900 rounded-tr-md' : 'bg-ink-900 text-white rounded-tr-md')}>
                    {m.text}
                  </p>
                </li>
              ))}
            </ol>
            {active.status === 'RESOLVED' ? (
              <p className="px-5 py-4 border-t border-line text-[13px] text-ink-500">Resolved. A new message from {active.from} reopens it.</p>
            ) : (
              <form onSubmit={send} className="flex gap-2 p-3 border-t border-line">
                <label htmlFor="support-reply" className="sr-only">Reply</label>
                <input
                  id="support-reply"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={`Reply to ${active.from}`}
                  className="flex-1 min-w-0 h-10 rounded-full border border-line-strong px-4 text-sm outline-none focus:border-brand-500"
                />
                <Button type="submit" icon={Send} disabled={!reply.trim()}>Send</Button>
              </form>
            )}
          </>
        ) : (
          <div className="flex-1 grid place-items-center text-sm text-ink-500 px-6 text-center">Pick a conversation to read it.</div>
        )}
      </div>
    </section>
  )
}

function BotAnswers() {
  const { log } = useAdminData()
  const toast = useToast()
  const [answers, setAnswers] = useState(seed.botAnswers)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ intent: '', example: '', answer: '' })
  const [error, setError] = useState('')

  const add = () => {
    if (!form.intent.trim() || !form.answer.trim()) return setError('Add a topic and the answer.')
    setAnswers((a) => [...a, { id: `f${Date.now()}`, ...form, enabled: true, hits: 0 }])
    log('Support', 'Added bot answer', form.intent)
    toast('Answer added. The bot uses it right away.')
    setForm({ intent: '', example: '', answer: '' })
    setAdding(false)
  }

  return (
    <>
      <Panel title="What the bot can answer" description="Questions that don’t match any of these go to Needs agent." actions={<Button size="sm" icon={Plus} onClick={() => setAdding(true)}>Add answer</Button>}>
        <ul className="divide-y divide-line">
          {answers.map((a) => (
            <li key={a.id} className="py-4 first:pt-0 last:pb-0 flex gap-4 items-start">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{a.intent}</h3>
                  <Badge>{formatNumber(a.hits)} answered this month</Badge>
                </div>
                <p className="text-[13px] text-ink-500 mt-0.5">For questions like “{a.example}”</p>
                <p className="text-sm mt-1.5">{a.answer}</p>
              </div>
              <Toggle
                ariaLabel={`Use answer for ${a.intent}`}
                checked={a.enabled}
                onChange={(v) => { setAnswers((xs) => xs.map((x) => (x.id === a.id ? { ...x, enabled: v } : x))); toast(`${a.intent}: ${v ? 'on' : 'off'}.`) }}
              />
            </li>
          ))}
        </ul>
      </Panel>
      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add bot answer"
        footer={<><Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button><Button onClick={add}>Add answer</Button></>}
      >
        <div className="flex flex-col gap-4">
          <Field label="Topic" error={error}>{({ id, invalid }) => <Input id={id} invalid={invalid} value={form.intent} onChange={(e) => { setForm({ ...form, intent: e.target.value }); setError('') }} placeholder="Delivery charges" />}</Field>
          <Field label="Example question" hint="Helps the bot recognise similar questions.">{({ id }) => <Input id={id} value={form.example} onChange={(e) => setForm({ ...form, example: e.target.value })} placeholder="Why was I charged for delivery?" />}</Field>
          <Field label="Answer">{({ id }) => <Textarea id={id} value={form.answer} onChange={(e) => { setForm({ ...form, answer: e.target.value }); setError('') }} />}</Field>
        </div>
      </Modal>
    </>
  )
}
