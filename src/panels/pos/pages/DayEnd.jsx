import { useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { CircleAlert, CircleCheck, Lock } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Button from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Overlay'
import { Field, Input, Textarea } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { formatINR, timeAgo } from '../../../lib/format'
import { usePos } from '../data/PosDataContext'

const NOTES = [500, 200, 100, 50, 20, 10]

export default function DayEnd() {
  const pos = usePos()
  const toast = useToast()
  const [counts, setCounts] = useState(() => Object.fromEntries([...NOTES.map((d) => [d, '']), ['coins', '']]))
  const [note, setNote] = useState('')
  const [confirming, setConfirming] = useState(false)
  const isManager = pos.role === 'Manager'

  const counted = NOTES.reduce((s, d) => s + d * (Number(counts[d]) || 0), 0) + (Number(counts.coins) || 0)
  const anyCounted = Object.values(counts).some((v) => v !== '')
  const diff = counted - pos.cash.expected
  const open = pos.running
  const pendingOnline = pos.incoming.length

  if (pos.dayClosed) {
    const e = pos.drawer.dayEnd
    return (
      <>
        <PageHeader title="Day end" />
        <Panel>
          <div className="flex items-start gap-4">
            <span className="grid place-items-center size-12 rounded-full bg-ok-50 text-ok-600 shrink-0"><Lock className="size-5" aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-2xl font-semibold">Day closed</h2>
              <p className="text-ink-500">By {e.by} {timeAgo(e.at)}. The owner has the summary.</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-4 text-sm">
                {[['Cash expected', formatINR(e.expected)], ['Cash counted', formatINR(e.counted)], ['Difference', e.difference === 0 ? 'Matched' : `${e.difference > 0 ? '+' : '−'}${formatINR(Math.abs(e.difference))}`], ['UPI and card', formatINR(e.upi + e.card)]].map(([k, v]) => (
                  <div key={k}><dt className="text-[12px] text-ink-500">{k}</dt><dd className="font-semibold tabular">{v}</dd></div>
                ))}
              </dl>
              {isManager && <Button variant="secondary" className="mt-5" onClick={() => { pos.reopenDay(); toast('Day reopened. Billing is back on.') }}>Reopen day</Button>}
            </div>
          </div>
        </Panel>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Day end" description="Count the cash, check UPI and card totals, and close the day. Billing stops until tomorrow." />

      {(open.length > 0 || pendingOnline > 0) && (
        <div role="alert" className="mb-6 rounded-[var(--radius-panel)] border border-warn-600/30 bg-warn-50 px-5 py-4 text-sm">
          <p className="flex items-center gap-2 font-semibold"><CircleAlert className="size-5 text-warn-600" aria-hidden />Finish these before closing</p>
          <ul className="mt-2 ml-7 list-disc text-ink-700">
            {open.length > 0 && <li>{open.length} order{open.length > 1 ? 's are' : ' is'} still open: {open.slice(0, 6).map((o) => o.table ? `table ${o.table}` : o.id).join(', ')}{open.length > 6 ? '…' : ''}. <Link to="/pos/live-view" className="font-semibold text-brand-700">Open live view</Link></li>}
            {pendingOnline > 0 && <li>{pendingOnline} delivery order{pendingOnline > 1 ? 's' : ''} waiting to be accepted or rejected. <Link to="/pos/online-orders" className="font-semibold text-brand-700">Open online orders</Link></li>}
          </ul>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
        <Panel title="Count the cash drawer" description="Enter how many of each note you have.">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[12px] text-ink-500 border-b border-line"><th scope="col" className="font-medium py-2">Note</th><th scope="col" className="font-medium py-2 w-32">Count</th><th scope="col" className="font-medium py-2 text-right">Amount</th></tr></thead>
              <tbody className="divide-y divide-line">
                {NOTES.map((d) => (
                  <tr key={d}>
                    <th scope="row" className="text-left font-semibold py-2 tabular">₹{d}</th>
                    <td className="py-1.5"><Input aria-label={`Number of ₹${d} notes`} type="number" min="0" inputMode="numeric" value={counts[d]} onChange={(e) => setCounts((c) => ({ ...c, [d]: e.target.value }))} className="w-28 tabular" /></td>
                    <td className="py-2 text-right tabular">{formatINR(d * (Number(counts[d]) || 0))}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row" className="text-left font-semibold py-2">Coins (total ₹)</th>
                  <td className="py-1.5"><Input aria-label="Coins total in rupees" type="number" min="0" inputMode="numeric" value={counts.coins} onChange={(e) => setCounts((c) => ({ ...c, coins: e.target.value }))} className="w-28 tabular" /></td>
                  <td className="py-2 text-right tabular">{formatINR(Number(counts.coins) || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Today’s totals">
          <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 text-sm tabular">
            <dt className="text-ink-500">Cash expected</dt><dd className="text-right font-semibold">{formatINR(pos.cash.expected)}</dd>
            <dt className="text-ink-500">Cash counted</dt><dd className="text-right font-semibold">{anyCounted ? formatINR(counted) : '—'}</dd>
            <dt className="font-bold pt-1.5 border-t border-line">Difference</dt>
            <dd className={clsx('text-right font-display text-xl font-semibold pt-1.5 border-t border-line', !anyCounted ? 'text-ink-400' : diff === 0 ? 'text-ok-600' : 'text-danger-600')}>
              {!anyCounted ? '—' : diff === 0 ? 'Matched' : `${diff > 0 ? 'Over ' : 'Short '}${formatINR(Math.abs(diff))}`}
            </dd>
          </dl>
          <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 text-sm tabular mt-5 pt-4 border-t border-line">
            <dt className="text-ink-500">UPI</dt><dd className="text-right">{formatINR(pos.cash.upi)}</dd>
            <dt className="text-ink-500">Card</dt><dd className="text-right">{formatINR(pos.cash.card)}</dd>
            <dt className="text-ink-500">Swiggy and Zomato</dt><dd className="text-right">{formatINR(pos.cash.online)}</dd>
          </dl>
          <p className="text-[12px] text-ink-500 mt-2">Match UPI with the bank app and card with the machine’s settlement slip before closing.</p>
          <Field label="Note for the owner" hint={diff !== 0 && anyCounted ? 'Explain the difference' : 'Optional'} className="mt-4">
            {({ id }) => <Textarea id={id} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />}
          </Field>
          <Button className="w-full mt-4" disabled={!anyCounted || open.length > 0 || pendingOnline > 0 || (diff !== 0 && !note.trim())} onClick={() => setConfirming(true)}>Close day</Button>
          {anyCounted && diff !== 0 && !note.trim() && <p className="text-[12px] text-danger-600 mt-2">Add a note explaining the difference.</p>}
        </Panel>
      </div>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Close today?"
        description="Billing stops at this counter until tomorrow. The owner gets the summary right away."
        footer={<><Button variant="secondary" onClick={() => setConfirming(false)}>Not yet</Button><Button onClick={() => {
          pos.closeDay({ expected: pos.cash.expected, counted, difference: diff, upi: pos.cash.upi, card: pos.cash.card, online: pos.cash.online, note: note.trim(), denominations: counts })
          setConfirming(false)
          toast('Day closed. Summary sent to the owner.')
        }}>Close day</Button></>}
      >
        <p className="flex items-center gap-2 text-sm"><CircleCheck className={clsx('size-5', diff === 0 ? 'text-ok-600' : 'text-warn-600')} aria-hidden />Cash {diff === 0 ? 'matches' : `is ${diff > 0 ? 'over' : 'short'} by ${formatINR(Math.abs(diff))}`}.</p>
      </Modal>
    </>
  )
}
