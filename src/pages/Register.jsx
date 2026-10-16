import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { ArrowLeft, BadgeCheck, Check, CircleCheck, FileText, Hourglass, Mail, Upload, X } from 'lucide-react'
import Button from '../components/ui/Button'
import { Checkbox, Field, Input, Select, Textarea } from '../components/ui/Form'
import { usePlatform } from '../context/PlatformContext'
import { PLAN_OFFERS } from '../config/plans'
import { formatINR } from '../lib/format'
import { DOC_TYPES, REQUIRED_DOCS } from '../panels/admin/data/records'
import logoFull from '../assets/logo-full.png'

/**
 * Restaurant owner self-registration.
 *   Step 1  Owner details, mobile OTP, password, restaurant basics and plan   → POST /registrations (draft)
 *   Step 2  Documents, GSTIN, FSSAI and referral code                         → PUT  /registrations/:id, then submit
 *   Done    Pending Super Admin approval. Login details are emailed once approved.
 * The referral code is checked against sales person codes (GET /referral-codes/:code).
 */

const MAX_MB = 5
const DEMO_OTP = '123456' // stand-in until MSG91 sends real codes
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const CUISINES = ['South Indian', 'North Indian', 'North Karnataka meals', 'Coastal', 'Multi-cuisine', 'Cafe and bakery', 'Chinese', 'Sweets and snacks', 'Other']
const STEPS = ['Your details', 'Documents and referral']

/** Referral code from an invite link: /register?ref=DQ-SNEHA24 (also works with hash routing). */
const refFromUrl = () => {
  try {
    const q = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : window.location.search.slice(1)
    return (new URLSearchParams(q).get('ref') ?? '').toUpperCase()
  } catch { return '' }
}

const empty = {
  owner: '', phone: '', email: '', password: '', confirm: '',
  restaurant: '', type: 'SINGLE', outlets: 2, cuisine: CUISINES[0], city: '', address: '', plan: 'growth',
  gstin: '', fssai: '', docs: {}, referral: '', agree: false,
}

export default function Register() {
  const { submitRegistration, salesPeople } = usePlatform()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(() => ({ ...empty, referral: refFromUrl() }))
  const invitedBy = salesPeople.find((s) => s.code === refFromUrl())
  const [otp, setOtp] = useState({ sent: false, code: '', verified: false, error: '', resendIn: 0 })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(null)

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: null })) }

  // Countdown before the OTP can be resent.
  useEffect(() => {
    if (!otp.resendIn) return
    const t = setTimeout(() => setOtp((o) => ({ ...o, resendIn: o.resendIn - 1 })), 1000)
    return () => clearTimeout(t)
  }, [otp.resendIn])

  const goTo = (n) => { setStep(n); window.scrollTo({ top: 0 }) }

  /* ---------- Step 1 ---------- */

  const sendOtp = () => {
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, '').slice(-10))) return setErrors((e) => ({ ...e, phone: 'Enter a 10-digit Indian mobile number.' }))
    setOtp({ sent: true, code: '', verified: false, error: '', resendIn: 30 })
  }
  const verifyOtp = () => {
    if (otp.code === DEMO_OTP) setOtp((o) => ({ ...o, verified: true, error: '' }))
    else setOtp((o) => ({ ...o, error: 'That code doesn’t match. Check the SMS and try again.' }))
  }

  const plan = PLAN_OFFERS.find((p) => p.id === form.plan)
  const outletCount = form.type === 'FRANCHISE' ? Number(form.outlets) : 1
  const planFits = (p) => p.outletLimit === null || p.outletLimit >= outletCount

  const validateStep1 = () => {
    const e = {}
    if (!form.owner.trim()) e.owner = 'Enter your full name.'
    if (!otp.verified) e.phone = otp.sent ? 'Verify your mobile number with the code we sent.' : 'Verify your mobile number to continue.'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter a valid email. Your login details are sent here.'
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) e.password = 'Use at least 8 characters with letters and numbers.'
    if (form.confirm !== form.password) e.confirm = 'Passwords don’t match.'
    if (!form.restaurant.trim()) e.restaurant = 'Enter the restaurant’s name.'
    if (form.type === 'FRANCHISE' && !(outletCount >= 2)) e.outlets = 'A franchise has 2 or more outlets.'
    if (!form.city.trim()) e.city = 'Enter the city.'
    if (!form.address.trim()) e.address = 'Enter the address of the main outlet.'
    if (!planFits(plan)) e.plan = `${plan.name} covers up to ${plan.outletLimit} outlet${plan.outletLimit > 1 ? 's' : ''}. Pick a bigger plan.`
    setErrors(e)
    return Object.keys(e).length === 0
  }

  /* ---------- Step 2 ---------- */

  const required = REQUIRED_DOCS[form.type]
  const referralMatch = form.referral.trim() ? salesPeople.find((s) => s.code.toLowerCase() === form.referral.trim().toLowerCase()) : null

  const attach = (key, file) => {
    if (!file) return
    if (!/^(application\/pdf|image\/(jpeg|png))$/.test(file.type)) return setErrors((e) => ({ ...e, [`doc-${key}`]: 'Use a PDF, JPG or PNG file.' }))
    if (file.size > MAX_MB * 1024 * 1024) return setErrors((e) => ({ ...e, [`doc-${key}`]: `This file is over ${MAX_MB} MB. Upload a smaller scan.` }))
    set('docs', { ...form.docs, [key]: { name: file.name, sizeKb: Math.max(1, Math.round(file.size / 1024)) } })
    setErrors((e) => ({ ...e, [`doc-${key}`]: null, docs: null }))
  }

  const validateStep2 = () => {
    const e = {}
    if (!GSTIN_RE.test(form.gstin.trim().toUpperCase())) e.gstin = 'Enter the 15-character GSTIN, like 29ABCDE1234F1Z5.'
    if (!/^\d{14}$/.test(form.fssai.trim())) e.fssai = 'The FSSAI licence number has 14 digits.'
    const missing = required.filter((k) => !form.docs[k])
    if (missing.length) e.docs = `Upload ${missing.length} more document${missing.length > 1 ? 's' : ''} to submit.`
    missing.forEach((k) => { e[`doc-${k}`] = 'Required' })
    if (form.referral.trim() && !referralMatch) e.referral = 'We couldn’t find this code. Check it with your sales contact, or leave it empty.'
    if (!form.agree) e.agree = 'Accept the terms to submit.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = () => {
    if (!validateStep2()) return
    const id = `REG-${1053 + Math.floor(Math.random() * 900)}`
    const reg = {
      id, restaurant: form.restaurant.trim(), owner: form.owner.trim(), email: form.email.trim(), phone: `+91 ${form.phone.replace(/\D/g, '').slice(-10).replace(/(\d{5})(\d{5})/, '$1 $2')}`,
      city: form.city.trim(), address: form.address.trim(), type: form.type, outlets: outletCount, plan: plan.name, cuisine: form.cuisine,
      gstin: form.gstin.trim().toUpperCase(), fssai: form.fssai.trim(),
      docs: required.map((k) => ({ key: k, name: DOC_TYPES[k], file: form.docs[k].name, sizeKb: form.docs[k].sizeKb })),
      referral: referralMatch ? { code: referralMatch.code, salesPersonId: referralMatch.id } : null,
      submittedAt: new Date().toISOString(), status: 'PENDING',
    }
    submitRegistration(reg)
    setSubmitted(reg)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="min-h-dvh grid grid-cols-1 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <aside className="hidden lg:flex flex-col justify-between bg-ink-900 text-white p-10 sticky top-0 h-dvh self-start">
        <div className="bg-white rounded-2xl p-4 w-40"><img src={logoFull} alt="Dime Quest" className="w-full h-auto" /></div>
        <ol className="flex flex-col gap-6">
          {[...STEPS, 'Dime Quest approves'].map((label, i) => {
            const done = submitted ? i < 2 : i < step
            const current = submitted ? i === 2 : i === step
            return (
              <li key={label} className="flex items-start gap-3">
                <span className={clsx('grid place-items-center size-8 rounded-full text-sm font-bold shrink-0 tabular', done ? 'bg-ok-600 text-white' : current ? 'bg-brand-500 text-white' : 'bg-white/10 text-ink-300')}>
                  {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                </span>
                <span className="pt-1">
                  <span className={clsx('block font-semibold', !current && !done && 'text-ink-300')}>{label}</span>
                  <span className="block text-[13px] text-ink-300">
                    {['About 3 minutes', 'Keep your GST and FSSAI documents ready', 'Usually within 48 hours'][i]}
                  </span>
                </span>
              </li>
            )
          })}
        </ol>
        <p className="text-[13px] text-ink-400">Questions? support@dimequest.in</p>
      </aside>

      <main className="min-w-0 px-4 py-8 sm:px-10 lg:py-12">
        <div className="w-full max-w-2xl mx-auto">
          <img src={logoFull} alt="Dime Quest" className="w-24 h-auto mb-6 lg:hidden" />
          {submitted ? <Submitted reg={submitted} /> : (
            <>
              <p className="text-[13px] font-semibold text-brand-700">Step {step + 1} of 2</p>
              <h1 className="font-display text-[32px] font-semibold leading-tight mt-1">{step === 0 ? 'Register your restaurant' : 'Documents and referral'}</h1>
              <p className="text-ink-500 mt-1">
                {step === 0 ? 'Tell us about you and your restaurant. You’ll upload documents on the next step.' : 'Dime Quest checks these before your account goes live.'}
              </p>
              {invitedBy && step === 0 && (
                <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-ok-50 text-ok-600 text-sm font-semibold px-3.5 py-1.5">
                  <BadgeCheck className="size-4" aria-hidden />Invited by {invitedBy.name}. Their code is already added.
                </p>
              )}
              <div className="h-1.5 rounded-full bg-line mt-5 lg:hidden" aria-hidden><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: step === 0 ? '50%' : '100%' }} /></div>

              {step === 0 ? (
                <form
                  noValidate
                  className="flex flex-col gap-8 mt-8"
                  onSubmit={(e) => { e.preventDefault(); if (validateStep1()) goTo(1) }}
                >
                  <Group title="About you">
                    <Field label="Full name" required error={errors.owner} className="sm:col-span-2">{({ id, invalid }) => <Input id={id} invalid={invalid} autoComplete="name" value={form.owner} onChange={(e) => set('owner', e.target.value)} />}</Field>
                    <div className="sm:col-span-2">
                      <Field label="Mobile number" required error={errors.phone} hint={otp.verified ? undefined : 'We’ll send a 6-digit code by SMS'}>
                        {({ id, invalid }) => (
                          <div className="flex gap-2">
                            <span className="h-10 px-3 grid place-items-center rounded-xl border border-line-strong bg-canvas text-sm text-ink-500">+91</span>
                            <Input id={id} invalid={invalid} type="tel" inputMode="numeric" autoComplete="tel-national" value={form.phone} disabled={otp.verified}
                              onChange={(e) => { set('phone', e.target.value); setOtp({ sent: false, code: '', verified: false, error: '', resendIn: 0 }) }} placeholder="98450 12345" className="flex-1 min-w-0" />
                            {otp.verified ? (
                              <span className="inline-flex items-center gap-1.5 px-3 text-sm font-semibold text-ok-600"><BadgeCheck className="size-4" />Verified</span>
                            ) : (
                              <Button type="button" variant="secondary" onClick={sendOtp} disabled={otp.resendIn > 0}>{otp.sent ? (otp.resendIn ? `Resend in ${otp.resendIn}s` : 'Resend code') : 'Send code'}</Button>
                            )}
                          </div>
                        )}
                      </Field>
                      {otp.sent && !otp.verified && (
                        <div className="mt-3 rounded-xl bg-canvas p-4">
                          <Field label={`Code sent to +91 ${form.phone}`} error={otp.error} hint={`Demo build: use ${DEMO_OTP}`}>
                            {({ id, invalid }) => (
                              <div className="flex gap-2">
                                <Input id={id} invalid={invalid} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp.code}
                                  onChange={(e) => setOtp((o) => ({ ...o, code: e.target.value.replace(/\D/g, ''), error: '' }))} className="w-40 tracking-[0.3em] tabular" />
                                <Button type="button" variant="dark" disabled={otp.code.length !== 6} onClick={verifyOtp}>Verify</Button>
                              </div>
                            )}
                          </Field>
                        </div>
                      )}
                    </div>
                    <Field label="Email" required error={errors.email} hint="Your login details are sent here after approval" className="sm:col-span-2">{({ id, invalid }) => <Input id={id} invalid={invalid} type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} />}</Field>
                    <Field label="Password" required error={errors.password} hint={errors.password ? undefined : 'At least 8 characters, with letters and numbers'}>{({ id, invalid }) => <Input id={id} invalid={invalid} type="password" autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} />}</Field>
                    <Field label="Confirm password" required error={errors.confirm}>{({ id, invalid }) => <Input id={id} invalid={invalid} type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} />}</Field>
                  </Group>

                  <Group title="Your restaurant">
                    <Field label="Restaurant name" required error={errors.restaurant} className="sm:col-span-2">{({ id, invalid }) => <Input id={id} invalid={invalid} value={form.restaurant} onChange={(e) => set('restaurant', e.target.value)} placeholder="As it appears on your FSSAI licence" />}</Field>
                    <fieldset className="sm:col-span-2">
                      <legend className="text-[13px] font-semibold text-ink-800 mb-1.5">Type</legend>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[['SINGLE', 'Single outlet', 'One restaurant location'], ['FRANCHISE', 'Franchise', 'Two or more outlets under one brand']].map(([v, label, desc]) => (
                          <label key={v} className={clsx('flex gap-3 rounded-xl border p-3.5 cursor-pointer', form.type === v ? 'border-brand-500 bg-brand-50/50' : 'border-line-strong hover:border-ink-400')}>
                            <input type="radio" name="type" value={v} checked={form.type === v} onChange={() => { set('type', v); if (v === 'FRANCHISE' && form.plan === 'starter') set('plan', 'growth') }} className="mt-0.5 accent-brand-500" />
                            <span><span className="block text-sm font-semibold">{label}</span><span className="block text-[12px] text-ink-500">{desc}</span></span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    {form.type === 'FRANCHISE' && <Field label="Number of outlets" required error={errors.outlets}>{({ id, invalid }) => <Input id={id} invalid={invalid} type="number" min="2" value={form.outlets} onChange={(e) => set('outlets', e.target.value)} />}</Field>}
                    <Field label="Cuisine">{({ id }) => <Select id={id} value={form.cuisine} onChange={(e) => set('cuisine', e.target.value)} options={CUISINES} />}</Field>
                    <Field label="City" required error={errors.city}>{({ id, invalid }) => <Input id={id} invalid={invalid} autoComplete="address-level2" value={form.city} onChange={(e) => set('city', e.target.value)} />}</Field>
                    <Field label={form.type === 'FRANCHISE' ? 'Address of the main outlet' : 'Address'} required error={errors.address} className="sm:col-span-2">{({ id, invalid }) => <Textarea id={id} invalid={invalid} rows={2} autoComplete="street-address" value={form.address} onChange={(e) => set('address', e.target.value)} />}</Field>
                  </Group>

                  <fieldset>
                    <legend className="font-bold mb-1">Plan</legend>
                    <p className="text-[13px] text-ink-500 mb-3">Billed per outlet each month after approval. You can change plans later.</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {PLAN_OFFERS.map((p) => {
                        const fits = planFits(p)
                        return (
                          <label key={p.id} className={clsx('relative flex flex-col rounded-xl border p-4', !fits ? 'opacity-50 cursor-not-allowed border-line' : form.plan === p.id ? 'border-brand-500 bg-brand-50/50 cursor-pointer' : 'border-line-strong hover:border-ink-400 cursor-pointer')}>
                            <input type="radio" name="plan" value={p.id} checked={form.plan === p.id} disabled={!fits} onChange={() => set('plan', p.id)} className="sr-only peer" />
                            <span className="font-semibold">{p.name}</span>
                            <span className="font-display text-2xl font-semibold tabular mt-1">{formatINR(p.monthly)}</span>
                            <span className="text-[12px] text-ink-500">per outlet per month</span>
                            <span className="text-[13px] text-ink-700 mt-2">{p.pitch}</span>
                            <span className="text-[12px] text-ink-500 mt-2">{p.outletLimit ? `Up to ${p.outletLimit} outlet${p.outletLimit > 1 ? 's' : ''}` : 'Any number of outlets'}</span>
                            {form.plan === p.id && <Check className="absolute top-3 right-3 size-5 text-brand-600" aria-hidden />}
                            <span className="absolute inset-0 rounded-xl peer-focus-visible:outline-2 peer-focus-visible:outline-brand-500" aria-hidden />
                          </label>
                        )
                      })}
                    </div>
                    {errors.plan && <p className="text-[12px] text-danger-600 mt-2">{errors.plan}</p>}
                  </fieldset>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
                    <Link to="/login" className="text-sm font-semibold text-brand-700 hover:text-brand-600">Already registered? Sign in</Link>
                    <Button type="submit">Continue to documents</Button>
                  </div>
                </form>
              ) : (
                <form noValidate className="flex flex-col gap-8 mt-8" onSubmit={(e) => { e.preventDefault(); submit() }}>
                  <Group title="Registration numbers">
                    <Field label="GSTIN" required error={errors.gstin}>{({ id, invalid }) => <Input id={id} invalid={invalid} value={form.gstin} maxLength={15} onChange={(e) => set('gstin', e.target.value.toUpperCase())} placeholder="29ABCDE1234F1Z5" className="uppercase tabular" />}</Field>
                    <Field label="FSSAI licence number" required error={errors.fssai}>{({ id, invalid }) => <Input id={id} invalid={invalid} inputMode="numeric" maxLength={14} value={form.fssai} onChange={(e) => set('fssai', e.target.value.replace(/\D/g, ''))} placeholder="14 digits" className="tabular" />}</Field>
                  </Group>

                  <section>
                    <h2 className="font-bold">Documents</h2>
                    <p className="text-[13px] text-ink-500 mb-3">
                      Clear scans or photos, PDF, JPG or PNG, up to {MAX_MB} MB each.{form.type === 'FRANCHISE' ? ' Franchises also need the agreement and the list of outlet addresses.' : ''}
                    </p>
                    <ul className="flex flex-col gap-2">
                      {required.map((k) => {
                        const file = form.docs[k]
                        const err = errors[`doc-${k}`]
                        return (
                          <li key={k} className={clsx('flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3', err ? 'border-danger-600/50 bg-danger-50/40' : file ? 'border-ok-600/40 bg-ok-50/40' : 'border-line-strong')}>
                            <span className={clsx('grid place-items-center size-9 shrink-0 rounded-lg', file ? 'bg-ok-50 text-ok-600' : 'bg-canvas text-ink-500')}>{file ? <CircleCheck className="size-4" /> : <FileText className="size-4" />}</span>
                            <div className="min-w-0 flex-1 basis-40">
                              <div className="text-sm font-semibold">{DOC_TYPES[k]}</div>
                              <div className={clsx('text-[12px] truncate', err && !file ? 'text-danger-600' : 'text-ink-500')}>{file ? `${file.name}, ${file.sizeKb} KB` : err && err !== 'Required' ? err : err ? 'Required' : 'Not uploaded'}</div>
                            </div>
                            {file && <button type="button" onClick={() => { const next = { ...form.docs }; delete next[k]; set('docs', next) }} className="p-2 rounded-full hover:bg-ink-900/5 text-ink-500" aria-label={`Remove ${DOC_TYPES[k]}`}><X className="size-4" /></button>}
                            <label className="inline-flex">
                              <input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only peer" onChange={(e) => { attach(k, e.target.files?.[0]); e.target.value = '' }} aria-label={`Upload ${DOC_TYPES[k]}`} />
                              <span className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border border-line-strong bg-surface text-[13px] font-semibold cursor-pointer hover:border-ink-400 peer-focus-visible:outline-2 peer-focus-visible:outline-brand-500">
                                <Upload className="size-3.5" aria-hidden />{file ? 'Replace' : 'Upload'}
                              </span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                    {errors.docs && <p className="text-[12px] text-danger-600 mt-2">{errors.docs}</p>}
                  </section>

                  <section>
                    <h2 className="font-bold">Referral code</h2>
                    <p className="text-[13px] text-ink-500 mb-3">If a Dime Quest sales person helped you sign up, enter their code. Optional.</p>
                    <Field label="Code" error={errors.referral} className="max-w-sm">
                      {({ id, invalid }) => <Input id={id} invalid={invalid} value={form.referral} onChange={(e) => set('referral', e.target.value.toUpperCase())} placeholder="DQ-SNEHA24" className="uppercase" />}
                    </Field>
                    {referralMatch && <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-ok-600 font-semibold"><BadgeCheck className="size-4" aria-hidden />Referred by {referralMatch.name}, {referralMatch.city}</p>}
                  </section>

                  <section className="rounded-xl bg-canvas p-4 text-sm">
                    <h2 className="font-bold mb-2">You’re registering</h2>
                    <p className="text-ink-700">
                      <span className="font-semibold">{form.restaurant}</span>, {form.type === 'FRANCHISE' ? `a franchise with ${outletCount} outlets` : 'a single outlet'} in {form.city}, on the {plan.name} plan ({formatINR(plan.monthly * outletCount)} a month).
                      Owner {form.owner}, {form.email}.
                    </p>
                    <button type="button" onClick={() => goTo(0)} className="mt-2 text-sm font-semibold text-brand-700 hover:text-brand-600 cursor-pointer">Change these details</button>
                  </section>

                  <div>
                    <Checkbox checked={form.agree} onChange={(v) => set('agree', v)} label={<span>I confirm these documents are genuine and agree to the Dime Quest <a href="#terms" className="font-semibold text-brand-700">terms of service</a>.</span>} />
                    {errors.agree && <p className="text-[12px] text-danger-600 mt-1.5">{errors.agree}</p>}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
                    <Button type="button" variant="ghost" icon={ArrowLeft} onClick={() => goTo(0)}>Back</Button>
                    <Button type="submit">Submit for approval</Button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function Group({ title, children }) {
  return (
    <fieldset>
      <legend className="font-bold mb-3">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

function Submitted({ reg }) {
  const steps = [
    ['Submitted', 'Just now', 'done'],
    ['Document check by Dime Quest', 'Usually within 48 hours', 'current'],
    ['Login details emailed', reg.email, 'next'],
  ]
  return (
    <div>
      <span className="grid place-items-center size-14 rounded-full bg-ok-50 text-ok-600 mb-5"><CircleCheck className="size-7" aria-hidden /></span>
      <h1 className="font-display text-[32px] font-semibold leading-tight">Registration submitted</h1>
      <p className="text-ink-500 mt-1 max-w-lg">
        Thanks, {reg.owner.split(' ')[0]}. {reg.restaurant} is now waiting for approval. We’ll email your login details to {reg.email} once your documents are checked.
      </p>
      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-line bg-surface p-4 text-sm max-w-lg">
        <div><dt className="text-ink-500 text-[12px]">Application number</dt><dd className="font-semibold tabular select-all">{reg.id}</dd></div>
        <div><dt className="text-ink-500 text-[12px]">Plan</dt><dd className="font-semibold">{reg.plan}</dd></div>
        <div><dt className="text-ink-500 text-[12px]">Documents</dt><dd className="font-semibold">{reg.docs.length} uploaded</dd></div>
        <div><dt className="text-ink-500 text-[12px]">Referral</dt><dd className="font-semibold">{reg.referral ? reg.referral.code : 'None'}</dd></div>
      </dl>
      <ol className="mt-8 flex flex-col gap-4 max-w-lg">
        {steps.map(([label, sub, state]) => (
          <li key={label} className="flex items-start gap-3">
            <span className={clsx('grid place-items-center size-8 rounded-full shrink-0', state === 'done' ? 'bg-ok-600 text-white' : state === 'current' ? 'bg-brand-50 text-brand-700' : 'bg-canvas text-ink-400')}>
              {state === 'done' ? <Check className="size-4" strokeWidth={3} /> : state === 'current' ? <Hourglass className="size-4" /> : <Mail className="size-4" />}
            </span>
            <span className="pt-1"><span className={clsx('block text-sm font-semibold', state === 'next' && 'text-ink-500')}>{label}</span><span className="block text-[12px] text-ink-500">{sub}</span></span>
          </li>
        ))}
      </ol>
      <p className="text-[13px] text-ink-500 mt-6 max-w-lg">If a document needs fixing, we’ll email you the reason and you can register again with the corrected file.</p>
      <Link to="/login" className="mt-6 inline-flex items-center h-10 px-5 rounded-full bg-ink-900 text-white text-sm font-semibold hover:bg-ink-800">Back to sign in</Link>
    </div>
  )
}
