import { useState } from 'react'
import QRCode from 'react-qr-code'
import { Clock, Mic, GraduationCap, Share2, X } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ViewMode } from '@/lib/attune-types'
import { cn } from '@/lib/utils'
import { presenterLabels, type PresenterType } from '@/lib/presenter'
import type { PersonaConfig } from '@/lib/persona-config'

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
}: {
  connected: boolean
  mode: ViewMode
  onModeChange: (mode: ViewMode) => void
  presenterType?: PresenterType
  persona: PersonaConfig
  sessionId?: string
}) {
  const [shareOpen, setShareOpen] = useState(false)
  const shareUrl = sessionId ? `${window.location.origin}/attendee/${sessionId}` : ''

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-zinc-950/70 px-4 py-3 backdrop-blur-xl lg:px-6">
      <div className="flex items-center gap-4">
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
        <ModeToggle mode={mode} onChange={onModeChange} persona={persona} />
      </div>
      {shareOpen && (
        <div role="dialog" aria-modal="true" aria-label="Share session with audience" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-6 text-center shadow-2xl">
            <button type="button" onClick={() => setShareOpen(false)} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-100" aria-label="Close share dialog"><X className="size-5" /></button>
            <h2 className="text-lg font-semibold text-zinc-50">Join this live session</h2>
            <p className="mt-2 text-sm text-zinc-400">Scan to ask questions from your phone.</p>
            <div className="mx-auto mt-5 w-fit rounded-xl bg-white p-3"><QRCode value={shareUrl} size={188} /></div>
            <p className="mt-4 break-all rounded-lg bg-zinc-950 p-3 text-xs text-cyan-300">{shareUrl}</p>
          </div>
        </div>
      )}
    </header>
  )
}
