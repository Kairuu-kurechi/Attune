import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, LogOut, Plus, Radio, X } from 'lucide-react'
import { presenterLabels, type PresenterType } from '@/lib/presenter'
import { supabase } from '@/lib/supabase'

type Session = {
  id: string
  title: string
  presenter_type: PresenterType
  created_at: string
}

export function Dashboard() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<Session[]>([])
  const [presenterType, setPresenterType] = useState<PresenterType | null>(null)
  const [title, setTitle] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function loadDashboard() {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        navigate('/login')
        return
      }
      const [{ data: profile, error: profileError }, { data: sessionRows, error: sessionsError }] = await Promise.all([
        supabase.from('profiles').select('presenter_type').eq('id', user.id).maybeSingle(),
        supabase.from('sessions').select('id, title, presenter_type, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])
      if (!active) return
      if (profileError || sessionsError) {
        setError(profileError?.message ?? sessionsError?.message ?? 'Unable to load your workspace.')
      }
      const profileType = profile?.presenter_type as PresenterType | null
      setPresenterType(profileType)
      setSessions((sessionRows ?? []) as Session[])
      setLoading(false)
      if (!profileType) navigate('/onboarding')
    }
    void loadDashboard()
    return () => { active = false }
  }, [navigate])

  async function createSession() {
    if (!presenterType || !title.trim()) return
    setCreating(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      navigate('/login')
      return
    }
    const { data, error: createError } = await supabase
      .from('sessions')
      .insert({ title: title.trim(), presenter_type: presenterType, user_id: user.id })
      .select('id, title, presenter_type, created_at')
      .single()
    setCreating(false)
    if (createError || !data) {
      setError(createError?.message ?? 'Unable to create this session.')
      return
    }
    navigate(`/session/${data.id}`, { state: { presenterType } })
  }

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <main className="min-h-dvh bg-zinc-950 px-4 py-8 text-zinc-50 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-7">
          <div><p className="text-sm font-medium text-cyan-300">ATTUNE WORKSPACE</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Your live sessions</h1><p className="mt-2 text-sm text-zinc-400">{presenterType ? presenterLabels[presenterType] : 'Loading your presenter profile…'}</p></div>
          <div className="flex gap-3"><button onClick={signOut} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"><LogOut className="size-4" />Sign out</button><button onClick={() => setShowModal(true)} disabled={!presenterType} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-40"><Plus className="size-4" />Create New Session</button></div>
        </header>
        {error && <p className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        {loading ? <p className="py-16 text-center text-zinc-500">Loading sessions…</p> : sessions.length === 0 ? <div className="mt-10 rounded-3xl border border-dashed border-white/15 bg-zinc-900/40 p-12 text-center"><Radio className="mx-auto size-8 text-cyan-300" /><h2 className="mt-4 text-lg font-semibold">Your room is ready.</h2><p className="mt-2 text-sm text-zinc-400">Create your first session to start routing attention live.</p></div> : <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{sessions.map((session) => <button key={session.id} onClick={() => navigate(`/session/${session.id}`, { state: { presenterType: session.presenter_type } })} className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 text-left transition hover:border-cyan-400/60 hover:bg-zinc-900"><Calendar className="size-5 text-cyan-300" /><h2 className="mt-5 font-semibold">{session.title}</h2><p className="mt-1 text-xs text-zinc-500">{new Date(session.created_at).toLocaleDateString()} · {presenterLabels[session.presenter_type]}</p></button>)}</section>}
      </div>
      {showModal && <div role="dialog" aria-modal="true" className="fixed inset-0 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"><form onSubmit={(event) => { event.preventDefault(); void createSession() }} className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"><button type="button" onClick={() => setShowModal(false)} className="absolute right-4 top-4 text-zinc-400 hover:text-white"><X /></button><h2 className="text-xl font-semibold">Create a live session</h2><p className="mt-2 text-sm text-zinc-400">This will use your {presenterType && presenterLabels[presenterType]} routing profile.</p><label className="mt-6 block text-sm text-zinc-300">Session title<input autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Q4 product launch" className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 outline-none focus:border-cyan-400" /></label><button disabled={creating} className="mt-6 w-full rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50">{creating ? 'Creating…' : 'Launch session'}</button></form></div>}
    </main>
  )
}
