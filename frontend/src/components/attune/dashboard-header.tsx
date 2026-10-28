import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import QRCode from 'react-qr-code'
import { ArrowLeft, Clipboard, Clock, FileText, GraduationCap, Mic, Share2, X } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ViewMode } from '@/lib/attune-types'
import { cn } from '@/lib/utils'
import { presenterLabels, type PresenterType } from '@/lib/presenter'
import type { PersonaConfig } from '@/lib/persona-config'
import { supabase } from '@/lib/supabase'

function SessionStatus() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
      <Clock className="size-3.5 text-zinc-500" aria-hidden="true" />
      <span className="font-mono text-xs text-zinc-200">Live session</span>
    </div>
  )
}

function ModeToggle({
  mode,
  onChange,
  persona,
}: {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
  persona: PersonaConfig
}) {
  const modes: { value: ViewMode; label: string; icon: typeof Mic }[] = [
    { value: 'speaker', label: 'Speaker', icon: Mic },
    { value: 'student', label: persona.participantModeLabel, icon: GraduationCap },
  ]
  return (
    <div
      role="radiogroup"
      aria-label="View mode"
      className="relative flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5"
    >
      {modes.map(({ value, label, icon: Icon }) => {
        const active = mode === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(value)}
            className={cn(
              'relative z-10 flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400',
              active ? 'text-zinc-950' : 'text-zinc-400 hover:text-zinc-200',
            )}
          >
            {active && (
              <motion.span
                layoutId="mode-pill"
                className="absolute inset-0 -z-10 rounded-md bg-cyan-400 shadow-[0_0_16px_-2px_rgba(34,211,238,0.6)]"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <Icon className="size-3.5" aria-hidden="true" />
            <span>{label}</span>
            <span className="sr-only"> mode</span>
          </button>
        )
      })}
    </div>
  )
}

export function DashboardHeader({
  connected,
  mode,
  onModeChange,
  presenterType,
  persona,
  sessionId,
  onGenerateReport,
  report,
  reportError,
  onBack,
}: {
  connected: boolean
  mode: ViewMode
  onModeChange: (mode: ViewMode) => void
  presenterType?: PresenterType
  persona: PersonaConfig
  sessionId?: string
  onGenerateReport: () => boolean
  report: string | null
  reportError: string | null
  onBack?: () => void
}) {
  const [shareOpen, setShareOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [savingReport, setSavingReport] = useState(false)
  const [saveError, setSaveError] = useState('')
  const navigate = useNavigate()
  const networkHost = import.meta.env.VITE_NETWORK_IP || 'localhost'
  const shareUrl = sessionId ? `http://${networkHost}:5173/attendee/${sessionId}` : ''

  function openReport() {
    setCopied(false)
    setReportOpen(true)
    onGenerateReport()
  }

  async function copyReport() {
    if (!report) return
    await navigator.clipboard.writeText(report)
    setCopied(true)
  }

  async function closeReport() {
    if (!report || !sessionId) {
      setReportOpen(false)
      return
    }
    setSavingReport(true)
    setSaveError('')
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'completed', report })
      .eq('id', sessionId)
    setSavingReport(false)
    if (error) {
      setSaveError(`Unable to save your report: ${error.message}`)
      return
    }
    setReportOpen(false)
    navigate('/dashboard')
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-zinc-950/70 px-4 py-3 backdrop-blur-xl lg:px-6">
      <div className="flex items-center gap-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-1 py-1 text-xs text-zinc-400 transition hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Sessions
          </button>
        )}
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="relative flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500 shadow-[0_0_24px_-4px_rgba(34,211,238,0.6)]"
          >
            <span className="size-3 rounded-full border-2 border-zinc-950" />
          </span>
          <div className="leading-tight">
            <p className="text-base font-semibold tracking-tight text-zinc-50">Attune</p>
            <p className="hidden text-[11px] text-zinc-500 sm:block">
              {presenterType ? presenterLabels[presenterType] : 'Agentic Attention Router'}
            </p>
          </div>
        </div>

        <span className="hidden whitespace-nowrap border-l border-white/[0.08] pl-4 text-sm font-medium text-zinc-300 sm:inline">
          Live Session
        </span>

        <div
          className={cn(
            'flex items-center gap-2 rounded-full border px-2.5 py-1',
            connected
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-amber-500/30 bg-amber-500/10',
          )}
          role="status"
        >
          <span className="relative flex size-2">
            {connected && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
            <span className={cn('relative inline-flex size-2 rounded-full', connected ? 'bg-emerald-400' : 'bg-amber-400')} />
          </span>
          <span className={cn('text-xs font-medium', connected ? 'text-emerald-300' : 'text-amber-300')}>
            {connected ? 'Live Connected' : 'Connecting'}
          </span>
        </div>
        <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-2.5 py-1 text-xs font-medium text-purple-200">
          {persona.modeLabel}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <p className="hidden text-xs text-zinc-500 md:block">
          {'ML Foundations Workshop · 148 attendees'}
        </p>
        <SessionStatus />
        {sessionId && <button type="button" onClick={() => setShareOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-purple-400/30 bg-purple-400/10 px-2.5 py-1.5 text-xs font-medium text-purple-200 transition hover:bg-purple-400/20"><Share2 className="size-3.5" />Share with Audience</button>}
        <button type="button" onClick={openReport} className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-400 px-2.5 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-cyan-300"><FileText className="size-3.5" />End Session</button>
        <ModeToggle mode={mode} onChange={onModeChange} persona={persona} />
      </div>
      {shareOpen && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Share session with audience" className="fixed inset-0 z-[9999] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-6 text-center shadow-2xl">
            <button type="button" onClick={() => setShareOpen(false)} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-100" aria-label="Close share dialog"><X className="size-5" /></button>
            <h2 className="text-lg font-semibold text-zinc-50">Join this live session</h2>
            <p className="mt-2 text-sm text-zinc-400">Scan to ask questions from your phone.</p>
            <div className="mx-auto mt-5 w-fit rounded-xl bg-white p-3"><QRCode value={shareUrl} size={188} /></div>
            <p className="mt-4 break-all rounded-lg bg-zinc-950 p-3 text-xs text-cyan-300">{shareUrl}</p>
          </div>
        </div>
      , document.body)}
      {reportOpen && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Post-session report" className="fixed inset-0 z-[9999] grid place-items-center bg-zinc-950/95 p-4 backdrop-blur-xl">
          <section className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-zinc-900 p-7 shadow-2xl sm:p-10">
            <button type="button" onClick={() => void closeReport()} disabled={savingReport} className="absolute right-5 top-5 text-zinc-400 hover:text-zinc-100 disabled:opacity-50" aria-label="Close report"><X className="size-5" /></button>
            <p className="text-xs font-semibold tracking-[0.2em] text-cyan-300">ATTUNE POST-SESSION REPORT</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">Audience attention insights</h2>
            {!report && !reportError && <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-center"><span className="size-10 animate-spin rounded-full border-4 border-cyan-300/20 border-t-cyan-300" /><div><p className="font-medium text-zinc-100">Generating Report...</p><p className="mt-1 text-sm text-zinc-500">Reviewing transcript signals and routed questions.</p></div></div>}
            {reportError && <div className="mt-8 rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-sm text-red-200"><p>{reportError}</p><button type="button" onClick={openReport} className="mt-4 rounded-lg border border-red-300/30 px-3 py-2 text-xs font-semibold">Try again</button></div>}
            {report && <><article className="mt-8 whitespace-pre-wrap rounded-2xl border border-white/10 bg-zinc-950/70 p-6 text-sm leading-7 text-zinc-200">{report}</article>{saveError && <p className="mt-4 text-sm text-red-300">{saveError}</p>}<div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => void copyReport()} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-zinc-950"><Clipboard className="size-4" />{copied ? 'Copied to Clipboard' : 'Copy to Clipboard'}</button><button type="button" onClick={() => void closeReport()} disabled={savingReport} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-zinc-200 disabled:opacity-50">{savingReport ? 'Saving Report…' : 'Save & Return to Dashboard'}</button></div></>}
          </section>
        </div>
      , document.body)}
    </header>
  )
}
