import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BadgeCheck, Copy } from 'lucide-react'
import Button from '../components/ui/Button'
import { Checkbox, Field, Input } from '../components/ui/Form'
import { useToast } from '../components/ui/Toast'
import { usePlatform } from '../context/PlatformContext'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../config/permissions'
import { formatINR, ordinal } from '../lib/format'
import logoFull from '../assets/logo-full.png'

const DEMO_OTP = '123456' // stand-in until MSG91 sends real codes

/**
 * Sales partner self-registration. No approval step: the account is active immediately and
 * a unique referral code is generated (POST /sales-people → { id, code }).
 */
export default function SalesSignup() {
  const { addSalesPerson, addAccount, salesPeople, accounts, incentiveRule } = usePlatform()
  const { login } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState({ name: '', phone: '', email: '', city: '', password: '', agree: false })
  const [otp, setOtp] = useState({ sent: false, code: '', verified: false, error: '', resendIn: 0 })
  const [errors, setErrors] = useState({})
  const [done, setDone] = useState(null) // { person, account }

  useEffect(() => {
    if (!otp.resendIn) return
    const t = setTimeout(() => setOtp((o) => ({ ...o, resendIn: o.resendIn - 1 })), 1000)
    return () => clearTimeout(t)
  }, [otp.resendIn])

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: null })) }
  const digits = form.phone.replace(/\D/g, '').slice(-10)

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Enter your full name.'
    if (!otp.verified) errs.phone = 'Verify your mobile number to continue.'
    const email = form.email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email.'
    else if (salesPeople.some((s) => s.email?.toLowerCase() === email) || accounts.some((a) => a.email.toLowerCase() === email)) errs.email = 'This email already has an account. Sign in instead.'
    if (!form.city.trim()) errs.city = 'Enter the city you work in.'
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) errs.password = 'Use at least 8 characters with letters and numbers.'
    if (!form.agree) errs.agree = 'Accept the partner terms to continue.'
    if (Object.keys(errs).length) return setErrors(errs)

    const person = addSalesPerson({ name: form.name.trim(), phone: `+91 ${digits.replace(/(\d{5})(\d{5})/, '$1 $2')}`, email, city: form.city.trim() })
    const account = { id: `U-${person.id}`, name: person.name, email, role: ROLES.SALES_PERSON, salesPersonId: person.id, home: '/sales', blurb: `Sales partner, code ${person.code}` }
    addAccount(account)
    setDone({ person, account })
    window.scrollTo({ top: 0 })
  }

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast(`${text} copied.`) } catch { toast('Copy isn’t available here. Select the code to copy it.', 'error') }
  }

  return (
    <div className="min-h-dvh grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="hidden lg:flex flex-col justify-between bg-ink-900 text-white p-12 sticky top-0 h-dvh self-start">
        <div className="bg-white rounded-2xl p-5 w-44"><img src={logoFull} alt="Dime Quest" className="w-full h-auto" /></div>
        <div>
          <p className="font-display text-[40px] leading-[1.1] font-semibold max-w-md text-balance">Earn for every restaurant you bring to Dime Quest.</p>
          <ul className="mt-6 flex flex-col gap-3 text-ink-300 max-w-md">
            <li><span className="text-white font-semibold">{formatINR(incentiveRule.perOutlet)} per outlet</span>, up to {formatINR(incentiveRule.maxPerReferral)} for one restaurant</li>
            <li>Earned once Dime Quest approves the restaurant you referred</li>
            <li>Paid to your UPI or bank account on the {ordinal(incentiveRule.payoutDay)} of every month</li>
          </ul>
        </div>
        <p className="text-[13px] text-ink-400">Partner questions? partners@dimequest.in</p>
      </aside>

      <main className="min-w-0 flex flex-col justify-center px-4 py-10 sm:px-10">
        <div className="w-full max-w-md mx-auto">
          <img src={logoFull} alt="Dime Quest" className="w-24 h-auto mb-6 lg:hidden" />
          {done ? (
            <div>
              <span className="grid place-items-center size-14 rounded-full bg-ok-50 text-ok-600 mb-5"><BadgeCheck className="size-7" aria-hidden /></span>
              <h1 className="font-display text-[32px] font-semibold leading-tight">You’re in, {done.person.name.split(' ')[0]}</h1>
              <p className="text-ink-500 mt-1">Your partner account is active. Share this code with restaurant owners when they register.</p>
              <div className="mt-6 rounded-2xl bg-ink-900 text-white p-6 text-center">
                <p className="text-[13px] text-ink-300">Your referral code</p>
                <p className="font-display text-[40px] font-semibold text-brand-400 tracking-wide select-all mt-1">{done.person.code}</p>
                <button onClick={() => copy(done.person.code)} className="mt-3 inline-flex items-center gap-2 h-9 px-4 rounded-full border border-white/25 hover:border-white/60 text-sm font-semibold cursor-pointer"><Copy className="size-4" aria-hidden />Copy code</button>
              </div>
              <p className="text-[13px] text-ink-500 mt-4">We’ve also sent it to {done.person.phone} by SMS.</p>
              <Button className="mt-6 w-full" onClick={() => { login(done.account.id); navigate('/sales', { replace: true }) }}>Go to my dashboard</Button>
            </div>
          ) : (
            <>
              <h1 className="font-display text-[32px] font-semibold leading-tight">Become a sales partner</h1>
              <p className="text-ink-500 mt-1">Sign up in a minute. You get your referral code straight away, no approval needed.</p>
              <form onSubmit={submit} noValidate className="flex flex-col gap-4 mt-6">
                <Field label="Full name" required error={errors.name}>{({ id, invalid }) => <Input id={id} invalid={invalid} autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} />}</Field>
                <div>
                  <Field label="Mobile number" required error={errors.phone}>
                    {({ id, invalid }) => (
                      <div className="flex gap-2">
                        <span className="h-10 px-3 grid place-items-center rounded-xl border border-line-strong bg-canvas text-sm text-ink-500">+91</span>
                        <Input id={id} invalid={invalid} type="tel" inputMode="numeric" autoComplete="tel-national" value={form.phone} disabled={otp.verified}
                          onChange={(e) => { set('phone', e.target.value); setOtp({ sent: false, code: '', verified: false, error: '', resendIn: 0 }) }} placeholder="98450 12345" className="flex-1 min-w-0" />
                        {otp.verified ? (
                          <span className="inline-flex items-center gap-1.5 px-2 text-sm font-semibold text-ok-600"><BadgeCheck className="size-4" />Verified</span>
                        ) : (
                          <Button type="button" variant="secondary" disabled={otp.resendIn > 0}
                            onClick={() => (/^[6-9]\d{9}$/.test(digits) ? setOtp({ sent: true, code: '', verified: false, error: '', resendIn: 30 }) : setErrors((x) => ({ ...x, phone: 'Enter a 10-digit Indian mobile number.' })))}>
                            {otp.sent ? (otp.resendIn ? `Resend in ${otp.resendIn}s` : 'Resend code') : 'Send code'}
                          </Button>
                        )}
                      </div>
                    )}
                  </Field>
                  {otp.sent && !otp.verified && (
                    <div className="mt-3 rounded-xl bg-canvas p-4">
                      <Field label={`Code sent to +91 ${form.phone}`} error={otp.error} hint={`Demo build: use ${DEMO_OTP}`}>
                        {({ id, invalid }) => (
                          <div className="flex gap-2">
                            <Input id={id} invalid={invalid} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp.code} onChange={(e) => setOtp((o) => ({ ...o, code: e.target.value.replace(/\D/g, ''), error: '' }))} className="w-40 tracking-[0.3em] tabular" />
                            <Button type="button" variant="dark" disabled={otp.code.length !== 6}
                              onClick={() => (otp.code === DEMO_OTP ? (setOtp((o) => ({ ...o, verified: true })), setErrors((x) => ({ ...x, phone: null }))) : setOtp((o) => ({ ...o, error: 'That code doesn’t match. Check the SMS and try again.' })))}>
                              Verify
                            </Button>
                          </div>
                        )}
                      </Field>
                    </div>
                  )}
                </div>
                <Field label="Email" required error={errors.email}>{({ id, invalid }) => <Input id={id} invalid={invalid} type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} />}</Field>
                <Field label="City you work in" required error={errors.city}>{({ id, invalid }) => <Input id={id} invalid={invalid} autoComplete="address-level2" value={form.city} onChange={(e) => set('city', e.target.value)} />}</Field>
                <Field label="Password" required error={errors.password} hint={errors.password ? undefined : 'At least 8 characters, with letters and numbers'}>{({ id, invalid }) => <Input id={id} invalid={invalid} type="password" autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} />}</Field>
                <div>
                  <Checkbox checked={form.agree} onChange={(v) => set('agree', v)} label={<span>I agree to the <a href="#partner-terms" className="font-semibold text-brand-700">partner terms</a>.</span>} />
                  {errors.agree && <p className="text-[12px] text-danger-600 mt-1.5">{errors.agree}</p>}
                </div>
                <Button type="submit" className="mt-2">Create account and get my code</Button>
              </form>
              <p className="text-sm text-ink-500 mt-6 pt-6 border-t border-line">Already a partner? <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-600">Sign in</Link></p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
