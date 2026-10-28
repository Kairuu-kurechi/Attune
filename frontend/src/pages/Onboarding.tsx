import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Presentation } from 'lucide-react'
import { presenterLabels, presenterTypes, type PresenterType } from '@/lib/presenter'
import { supabase } from '@/lib/supabase'

export function Onboarding() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<PresenterType | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function savePresenterType() {
    if (!selected) return
    setSaving(true)
    setError('')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      setError('Please sign in before completing onboarding.')
      setSaving(false)
      return
    }
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, presenter_type: selected }, { onConflict: 'id' })
    setSaving(false)
    if (profileError) {
      setError(profileError.message)
      return
    }
    navigate('/dashboard')
  }

  return (
    <main className="min-h-dvh bg-zinc-950 px-4 py-12 text-zinc-50">
      <section className="mx-auto max-w-4xl">
        <div className="mb-10 text-center"><span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-purple-500/15 text-purple-300"><Presentation /></span><p className="text-sm font-medium text-cyan-300">PERSONALIZE ATTUNE</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">What kind of presenter are you?</h1><p className="mt-3 text-zinc-400">We’ll tune attention signals and routing language to your room.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {presenterTypes.map((presenterType) => {
            const active = selected === presenterType
            return <button key={presenterType} type="button" onClick={() => setSelected(presenterType)} className={`relative rounded-2xl border p-5 text-left transition ${active ? 'border-cyan-400 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,0.18)]' : 'border-white/10 bg-zinc-900/60 hover:border-white/25'}`}><span className="text-base font-semibold">{presenterLabels[presenterType]}</span><p className="mt-2 text-sm text-zinc-400">Adapt the live attention queue to this presentation style.</p>{active && <span className="absolute right-4 top-4 grid size-6 place-items-center rounded-full bg-cyan-400 text-zinc-950"><Check className="size-4" /></span>}</button>
          })}
        </div>
        {error && <p className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        <button disabled={!selected || saving} onClick={savePresenterType} className="mx-auto mt-8 block rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40">{saving ? 'Saving…' : 'Continue to dashboard'}</button>
      </section>
    </main>
  )
}
