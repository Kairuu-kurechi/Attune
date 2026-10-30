import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, LoaderCircle, LogOut, Plus, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { presenterLabels, presenterTypes, type PresenterType } from '@/lib/presenter'
import { supabase } from '@/lib/supabase'

type Session = { id: string; title: string; presenter_type: PresenterType; created_at: string; status: 'active' | 'completed'; report: string | null }
type SessionTab = 'active' | 'completed'

function SessionsSkeleton() {
  return <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading sessions">{[1, 2, 3].map((item) => <div key={item} className="h-52 animate-pulse rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-5"><div className="size-5 rounded bg-cyan-400/10" /><div className="mt-8 h-5 w-2/3 rounded bg-white/[0.08]" /><div className="mt-3 h-3 w-1/2 rounded bg-white/[0.06]" /><div className="mt-8 h-10 rounded-xl bg-white/[0.06]" /></div>)}</section>
}

function EmptySessions({ tab }: { tab: SessionTab }) {
  const active = tab === 'active'
  return <div className="mt-5 rounded-3xl border border-dashed border-cyan-400/25 bg-gradient-to-b from-cyan-400/[0.06] to-zinc-900/40 p-12 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-300"><Sparkles className="size-6" /></span><h2 className="mt-5 text-lg font-semibold">{active ? 'No active sessions.' : 'No past reports yet.'}</h2><p className="mt-2 text-sm text-zinc-400">{active ? 'Create one to get started!' : 'Completed session reports will appear here.'}</p></div>
}

export function Dashboard() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<Session[]>([])
  const [presenterType, setPresenterType] = useState<PresenterType | null>(null)
  const [selectedPresenterType, setSelectedPresenterType] = useState<PresenterType | null>(null)
  const [title, setTitle] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<SessionTab>('active')
  const visibleSessions = sessions.filter((session) => session.status === activeTab)

  useEffect(() => {
    let active = true
    async function loadDashboard() {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) { navigate('/login'); return }
      const [{ data: profile, error: profileError }, { data: sessionRows, error: sessionsError }] = await Promise.all([
        supabase.from('profiles').select('presenter_type').eq('id', user.id).maybeSingle(),
        supabase.from('sessions').select('id, title, presenter_type, created_at, status, report').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])
      if (!active) return
      if (profileError || sessionsError) setError(profileError?.message ?? sessionsError?.message ?? 'Unable to load your workspace.')
      const profileType = profile?.presenter_type as PresenterType | null
      setPresenterType(profileType)
      setSelectedPresenterType(profileType)
      setSessions((sessionRows ?? []) as Session[])
      setLoading(false)
      if (!profileType) navigate('/onboarding')
    }
    void loadDashboard()
    return () => { active = false }
  }, [navigate])

  async function createSession() {
    if (!selectedPresenterType || !title.trim()) return
    setCreating(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }
    const { data, error: createError } = await supabase.from('sessions').insert({ title: title.trim(), presenter_type: selectedPresenterType, user_id: user.id }).select('id, title, presenter_type, created_at, status, report').single()
    setCreating(false)
    if (createError || !data) { setError(createError?.message ?? 'Unable to create this session.'); return }
    toast.success('Session created successfully!')
    navigate(`/session/${data.id}`, { state: { presenterType: selectedPresenterType } })
  }

  async function signOut() { await supabase.auth.signOut(); navigate('/login') }

  return <main className="min-h-dvh bg-zinc-950 px-4 py-8 text-zinc-50 sm:px-8"><div className="mx-auto max-w-6xl">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-7"><div><p className="text-sm font-medium text-cyan-300">ATTUNE WORKSPACE</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Your live sessions</h1><p className="mt-2 text-sm text-zinc-400">{presenterType ? presenterLabels[presenterType] : 'Loading your presenter profile…'}</p></div><div className="flex gap-3"><button onClick={signOut} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"><LogOut className="size-4" />Sign out</button><button onClick={() => { setSelectedPresenterType(presenterType); setShowModal(true) }} disabled={!presenterType} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-40"><Plus className="size-4" />Create New Session</button></div></header>
    {error && <p className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
    {loading ? <SessionsSkeleton /> : <><div role="tablist" aria-label="Session status" className="mt-8 inline-flex rounded-xl border border-white/10 bg-zinc-900/70 p-1">{([{ id: 'active', label: 'Active Sessions' }, { id: 'completed', label: 'Completed Reports' }] as const).map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={activeTab === tab.id ? 'rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950' : 'rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100'}>{tab.label} <span className="ml-1 font-mono text-xs">{sessions.filter((session) => session.status === tab.id).length}</span></button>)}</div>{visibleSessions.length === 0 ? <EmptySessions tab={activeTab} /> : <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visibleSessions.map((session) => <article key={session.id} className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 transition hover:border-cyan-400/60 hover:bg-zinc-900"><Calendar className="size-5 text-cyan-300" /><div className="mt-5 flex items-start justify-between gap-3"><h2 className="font-semibold">{session.title}</h2><span className={session.status === 'completed' ? 'rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-medium text-emerald-300' : 'rounded-full bg-cyan-400/10 px-2 py-1 text-[10px] font-medium text-cyan-200'}>{session.status === 'completed' ? 'Completed' : 'Live'}</span></div><p className="mt-1 text-xs text-zinc-500">{new Date(session.created_at).toLocaleDateString()} · {presenterLabels[session.presenter_type]}</p><button type="button" onClick={() => session.status === 'completed' ? navigate(`/report/${session.id}`) : navigate(`/session/${session.id}`, { state: { presenterType: session.presenter_type } })} className="mt-5 w-full rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20">{session.status === 'completed' ? 'View Report' : 'Join Session'}</button></article>)}</section>}</>}
  </div>{showModal && <div role="dialog" aria-modal="true" className="fixed inset-0 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"><form onSubmit={(event) => { event.preventDefault(); void createSession() }} className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"><button type="button" onClick={() => setShowModal(false)} className="absolute right-4 top-4 text-zinc-400 hover:text-white"><X /></button><h2 className="text-xl font-semibold">Create a live session</h2><p className="mt-2 text-sm text-zinc-400">Choose the attention-routing persona for this session.</p><label className="mt-6 block text-sm text-zinc-300">Session title<input autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Q4 product launch" className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 outline-none focus:border-cyan-400" /></label><label className="mt-4 block text-sm text-zinc-300">Session persona<select value={selectedPresenterType ?? ''} onChange={(event) => setSelectedPresenterType(event.target.value as PresenterType)} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-zinc-100 outline-none focus:border-cyan-400">{presenterTypes.map((type) => <option key={type} value={type}>{presenterLabels[type]}</option>)}</select></label><button disabled={creating || !selectedPresenterType} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50">{creating ? <><LoaderCircle className="size-4 animate-spin" />Creating session…</> : 'Launch session'}</button></form></div>}</main>
}
