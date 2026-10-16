import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { DEMO_ACCOUNTS, useAuth } from '../context/AuthContext'
import { usePlatform } from '../context/PlatformContext'
import { userRoleLabel } from '../config/permissions'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import { Field, Input } from '../components/ui/Form'
import logoFull from '../assets/logo-full.png'

/**
 * Sign-in for every web panel. Each role lands on its own panel after login.
 * The demo list below the form stands in for real accounts until the auth API exists.
 */
export default function Login() {
  const { user, login } = useAuth()
  const { accounts } = usePlatform()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (user) return <Navigate to={user.home} replace />

  const signIn = (account) => {
    login(account.id)
    navigate(account.home, { replace: true })
  }

  const submit = (e) => {
    e.preventDefault()
    if (!email.trim() || !password) return setError('Enter your email and password.')
    const account = [...DEMO_ACCOUNTS, ...accounts].find((a) => a.email.toLowerCase() === email.trim().toLowerCase())
    if (!account) return setError('No account with that email. Pick a demo account below.')
    signIn(account)
  }

  return (
    <div className="min-h-dvh grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="hidden lg:flex flex-col justify-between bg-ink-900 text-white p-12">
        <div className="bg-white rounded-2xl p-5 w-48">
          <img src={logoFull} alt="Dime Quest" className="w-full h-auto" />
        </div>
        <div>
          <p className="font-display text-[40px] leading-[1.1] font-semibold max-w-md text-balance">
            Billing, kitchen, stock and outlets in one place.
          </p>
          <p className="text-ink-300 mt-4 max-w-md">Restaurant Management System for single outlets and franchises across India.</p>
        </div>
        <p className="text-[13px] text-ink-400">Need help signing in? support@dimequest.in</p>
      </aside>

      <main className="min-w-0 flex flex-col justify-center px-4 py-10 sm:px-10">
        <div className="w-full max-w-md mx-auto">
          <img src={logoFull} alt="Dime Quest" className="w-28 h-auto mb-8 lg:hidden" />
          <h1 className="font-display text-[32px] font-semibold leading-tight">Sign in</h1>
          <p className="text-ink-500 mt-1">Use the email your restaurant registered with.</p>

          <form onSubmit={submit} noValidate className="flex flex-col gap-4 mt-6">
            <Field label="Email">{({ id }) => <Input id={id} type="email" autoComplete="username" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} />}</Field>
            <Field label="Password">{({ id }) => <Input id={id} type="password" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} />}</Field>
            {error && <p role="alert" className="text-[13px] text-danger-600 -mt-1">{error}</p>}
            <div className="flex items-center justify-between gap-3">
              <a href="#forgot" className="text-sm font-semibold text-brand-700 hover:text-brand-600">Forgot password?</a>
              <Button type="submit">Sign in</Button>
            </div>
          </form>

          <p className="text-sm text-ink-500 mt-6 pt-6 border-t border-line">
            New restaurant? <Link to="/register" className="font-semibold text-brand-700 hover:text-brand-600">Register your restaurant</Link>. Your account goes live once Dime Quest approves your documents.
            <br />
            Sales partner? <Link to="/join" className="font-semibold text-brand-700 hover:text-brand-600">Sign up and get your referral code</Link>.
          </p>

          <section className="mt-8" aria-labelledby="demo-accounts">
            <h2 id="demo-accounts" className="text-[13px] font-bold text-ink-500 mb-2">Demo accounts</h2>
            <ul className="flex flex-col gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => signIn(a)}
                    className="w-full flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left hover:border-brand-500 cursor-pointer"
                  >
                    <Avatar name={a.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{a.name}<span className="font-normal text-ink-500">, {userRoleLabel(a)}</span></span>
                      <span className="block text-[13px] text-ink-500 truncate">{a.blurb}</span>
                    </span>
                    <ChevronRight className="size-4 text-ink-400 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}
