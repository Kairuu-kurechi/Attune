import { useEffect, useState } from 'react'
import { ArrowLeft, Clipboard, FileText } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

type SavedReportSession = {
  title: string
  report: string | null
  status: string
  created_at: string
}

export function ReportView() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<SavedReportSession | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    async function loadReport() {
      if (!sessionId) {
        setError('This report does not have a valid session ID.')
        setLoading(false)
        return
      }
      const { data, error: loadError } = await supabase
        .from('sessions')
        .select('title, report, status, created_at')
        .eq('id', sessionId)
        .maybeSingle()
      if (!active) return
      if (loadError || !data) {
        setError(loadError?.message ?? 'Report not found.')
      } else {
        setSession(data as SavedReportSession)
      }
      setLoading(false)
    }
    void loadReport()
    return () => { active = false }
  }, [sessionId])

  async function copyReport() {
    if (!session?.report) return
    await navigator.clipboard.writeText(session.report)
    setCopied(true)
  }

  return (
    <main className="min-h-dvh bg-zinc-950 px-4 py-8 text-zinc-50 sm:px-8">
      <section className="mx-auto max-w-3xl">
        <button type="button" onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-cyan-300">
          <ArrowLeft className="size-4" />Back to Dashboard
        </button>
        {loading ? (
          <div className="flex min-h-80 flex-col items-center justify-center gap-4"><span className="size-10 animate-spin rounded-full border-4 border-cyan-300/20 border-t-cyan-300" /><p className="text-sm text-zinc-400">Loading saved report…</p></div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-red-400/20 bg-red-400/10 p-6 text-red-200">{error}</div>
        ) : (
          <article className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-7 shadow-2xl sm:p-10">
            <div className="flex items-start gap-4"><span className="grid size-11 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><FileText className="size-5" /></span><div><p className="text-xs font-semibold tracking-[0.2em] text-cyan-300">ATTUNE POST-SESSION REPORT</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{session?.title}</h1><p className="mt-2 text-sm text-zinc-400">{session && new Date(session.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })} · Saved audience attention insights</p></div></div>
            <div className="mt-8 whitespace-pre-wrap rounded-2xl border border-white/10 bg-zinc-950/70 p-6 text-sm leading-7 text-zinc-200">{session?.report || 'No report content was saved for this session.'}</div>
            <button type="button" onClick={() => void copyReport()} disabled={!session?.report} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-40"><Clipboard className="size-4" />{copied ? 'Copied to Clipboard' : 'Copy Report'}</button>
          </article>
        )}
      </section>
    </main>
  )
}
