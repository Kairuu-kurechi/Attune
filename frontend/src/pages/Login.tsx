import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function Login() {
  const navigate = useNavigate()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const result = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)
    if (result.error) {
      setMessage(result.error.message)
      return
    }

    if (isSignUp) {
      setMessage('Account created. Check your email if confirmation is enabled, then continue onboarding.')
      navigate('/onboarding')
      return
    }
    navigate('/dashboard')
  }

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-zinc-950 px-4 text-zinc-50">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(34,211,238,0.16),transparent_25%),radial-gradient(circle_at_85%_85%,rgba(168,85,247,0.15),transparent_30%)]" />
      <section className="relative w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/70 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 text-zinc-950"><Sparkles className="size-5" /></span>
          <div><p className="text-xl font-semibold">Attune</p><p className="text-xs text-zinc-500">Read the room. Route attention.</p></div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{isSignUp ? 'Start your workspace' : 'Welcome back'}</h1>
        <p className="mt-2 text-sm text-zinc-400">{isSignUp ? 'Create your presenter account.' : 'Sign in to your live sessions.'}</p>
        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm text-zinc-300">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 outline-none transition focus:border-cyan-400" placeholder="you@example.com" /></label>
          <label className="block text-sm text-zinc-300">Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 outline-none transition focus:border-cyan-400" placeholder="At least 6 characters" /></label>
          {message && <p className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-3 text-xs text-cyan-200">{message}</p>}
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-300 disabled:opacity-60">
            {loading ? 'Working…' : isSignUp ? 'Create account' : 'Sign in'}<ArrowRight className="size-4" />
          </button>
        </form>
        <button type="button" onClick={() => { setIsSignUp((value) => !value); setMessage('') }} className="mt-6 w-full text-center text-sm text-zinc-400 hover:text-cyan-300">
          {isSignUp ? 'Already have an account? Sign in' : 'New to Attune? Create an account'}
        </button>
      </section>
    </main>
  )
}
