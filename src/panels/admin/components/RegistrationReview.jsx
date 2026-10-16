import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { Check, Download, Eye, FileText, FileX, X } from 'lucide-react'
import { Drawer, Modal } from '../../../components/ui/Overlay'
import Button from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/Badge'
import { Field, Select, Textarea } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { docProgress, useAdminData } from '../data/AdminDataContext'
import { timeAgo } from '../../../lib/format'

const REJECT_REASONS = [
  'GSTIN does not match the certificate',
  'FSSAI licence expired or unreadable',
  'Owner ID does not match the registered name',
  'Documents missing',
  'Other',
]

/** Review drawer for one owner registration: details, documents, referral, decision. */
export default function RegistrationReview({ reg, onClose }) {
  const { approve, reject, startReview, salesById } = useAdminData()
  const toast = useToast()
  const [preview, setPreview] = useState(null)
  const [rejecting, setRejecting] = useState(false)

  // Opening a pending registration moves it to "Under review" so other admins see it's taken.
  useEffect(() => {
    if (reg?.status === 'PENDING') startReview(reg)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reg?.id])

  if (!reg) return null
  const progress = docProgress(reg)
  const decided = reg.status === 'APPROVED' || reg.status === 'REJECTED'
  const sales = reg.referral ? salesById[reg.referral.salesPersonId] : null

  const onApprove = () => {
    approve(reg)
    toast(`${reg.restaurant} approved. Login details sent to ${reg.email}.`)
    onClose()
  }

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title={reg.restaurant}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            {reg.id} <StatusBadge status={reg.status} /> Submitted {timeAgo(reg.submittedAt)}
          </span>
        }
        footer={
          decided ? (
            <Button variant="secondary" onClick={onClose}>Close</Button>
          ) : (
            <>
              <Button variant="danger" icon={X} onClick={() => setRejecting(true)}>Reject</Button>
              <Button icon={Check} disabled={!progress.complete} onClick={onApprove}>
                Approve and send login
              </Button>
            </>
          )
        }
      >
        {!decided && !progress.complete && (
          <p className="mb-5 rounded-xl bg-danger-50 text-danger-600 text-[13px] px-4 py-3">
            {progress.required - progress.uploaded} required document{progress.required - progress.uploaded > 1 ? 's are' : ' is'} missing. Approve unlocks once every document is uploaded, or reject with “Documents missing” so the owner can re-upload.
          </p>
        )}
        {reg.status === 'REJECTED' && (
          <p className="mb-5 rounded-xl bg-danger-50 text-danger-600 text-[13px] px-4 py-3">
            Rejected by {reg.decidedBy} {timeAgo(reg.decidedAt)}: {reg.rejectionReason}
          </p>
        )}
        {reg.status === 'APPROVED' && (
          <p className="mb-5 rounded-xl bg-ok-50 text-ok-600 text-[13px] px-4 py-3">
            Approved by {reg.decidedBy} {timeAgo(reg.decidedAt)}. Login details were sent to {reg.email}.
          </p>
        )}

        <Section title="Restaurant">
          <Dl
            rows={[
              ['Type', reg.type === 'FRANCHISE' ? `Franchise, ${reg.outlets} outlets` : 'Single outlet'],
              ['Cuisine', reg.cuisine],
              ['Address', reg.address],
              ['Plan chosen', reg.plan],
              ['GSTIN', <span className="tabular" key="g">{reg.gstin}</span>],
              ['FSSAI licence', <span className="tabular" key="f">{reg.fssai}</span>],
            ]}
          />
        </Section>

        <Section title="Owner">
          <Dl rows={[['Name', reg.owner], ['Email', reg.email], ['Phone', reg.phone]]} />
        </Section>

        <Section title={`Documents (${progress.uploaded} of ${progress.required})`}>
          <ul className="divide-y divide-line border border-line rounded-xl">
            {reg.docs.map((d) => (
              <li key={d.key} className="flex items-center gap-3 px-4 py-3">
                <span className={clsx('grid place-items-center size-9 rounded-lg shrink-0', d.file ? 'bg-info-50 text-info-600' : 'bg-danger-50 text-danger-600')}>
                  {d.file ? <FileText className="size-4" /> : <FileX className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{d.name}</div>
                  <div className={clsx('text-[12px]', d.file ? 'text-ink-500' : 'text-danger-600')}>
                    {d.file ? `${d.file}, ${d.sizeKb} KB` : 'Not uploaded'}
                  </div>
                </div>
                {d.file && (
                  <Button variant="ghost" size="sm" icon={Eye} onClick={() => setPreview(d)}>View</Button>
                )}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Referral">
          {sales ? (
            <Dl rows={[['Sales person', sales.name], ['Referral code', reg.referral.code], ['Incentive', reg.status === 'APPROVED' ? 'Eligible now' : 'Becomes eligible when you approve']]} />
          ) : (
            <p className="text-sm text-ink-500">The owner registered without a referral code.</p>
          )}
        </Section>
      </Drawer>

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.name}
        description={preview && `${preview.file}, ${preview.sizeKb} KB`}
        width="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" icon={Download}>Download</Button>
            <Button variant="dark" onClick={() => setPreview(null)}>Done</Button>
          </>
        }
      >
        {/* Replace with <iframe src={signedUrl}> or <img> once documents are served from storage. */}
        <div className="aspect-[4/3] max-w-full rounded-xl border border-dashed border-line-strong bg-canvas grid place-items-center text-center text-ink-500 text-sm px-6">
          Document preview loads here from file storage.
        </div>
      </Modal>

      <RejectModal open={rejecting} reg={reg} onClose={() => setRejecting(false)} onConfirm={(reason) => {
        reject(reg, reason)
        toast(`${reg.restaurant} rejected. The owner was emailed the reason.`)
        setRejecting(false)
        onClose()
      }} />
    </>
  )
}

function RejectModal({ open, reg, onClose, onConfirm }) {
  const [reason, setReason] = useState(REJECT_REASONS[0])
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const submit = () => {
    if (reason === 'Other' && !note.trim()) return setError('Write the reason the owner will see.')
    onConfirm(note.trim() ? `${reason === 'Other' ? '' : reason + '. '}${note.trim()}` : reason)
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Reject ${reg.restaurant}?`}
      description="The owner gets this reason by email and can register again with corrected details."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="dark" onClick={submit}>Reject registration</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Reason">
          {({ id }) => <Select id={id} value={reason} onChange={(e) => setReason(e.target.value)} options={REJECT_REASONS} />}
        </Field>
        <Field label="Note to owner" hint={reason === 'Other' ? 'Required' : 'Optional'} error={error}>
          {({ id, invalid }) => (
            <Textarea id={id} invalid={invalid} value={note} onChange={(e) => { setNote(e.target.value); setError('') }} placeholder="For example: please upload a clear copy of the FSSAI licence" />
          )}
        </Field>
      </div>
    </Modal>
  )
}

export function Section({ title, children, className }) {
  return (
    <section className={clsx('mb-6 last:mb-0', className)}>
      <h3 className="text-[13px] font-bold text-ink-500 mb-2.5">{title}</h3>
      {children}
    </section>
  )
}

export function Dl({ rows }) {
  return (
    <dl className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-500">{k}</dt>
          <dd className="text-ink-900 min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
