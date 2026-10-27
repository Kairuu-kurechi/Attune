import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AudioLines, Mic, MicOff, Pause, Play } from 'lucide-react'
import { GlassPanel } from './glass-panel'
import { AudioWaveform } from './audio-waveform'
import type { TranscriptLine } from '@/lib/attune-types'
import { cn } from '@/lib/utils'

export function TranscriptPanel({ lines }: { lines: TranscriptLine[] }) {
  const [listening, setListening] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = scrollRef.current
    if (element) element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' })
  }, [lines])

  const latestId = lines[lines.length - 1]?.id

  return (
    <GlassPanel labelledBy="transcript-title" title="Live Transcript" icon={<AudioLines className="size-3.5" aria-hidden="true" />} meta={<span className="font-mono text-[11px] text-zinc-500">{lines.length} segments</span>} bodyClassName="flex flex-col">
      <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-live="polite" aria-relevant="additions">
        {lines.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">Waiting for live transcript data.</p>
        ) : (
          <ol className="flex flex-col gap-4">
            <AnimatePresence initial={false}>
              {lines.map((line) => {
                const isLatest = line.id === latestId
                return (
                  <motion.li key={line.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="group relative pl-4">
                    <span aria-hidden="true" className={cn('absolute left-0 top-1.5 h-[calc(100%-6px)] w-px', isLatest ? 'bg-cyan-400/70' : 'bg-white/[0.08]')} />
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-mono text-[10px] tabular-nums text-zinc-500">{line.timestamp}</span>
                      <span className="text-[11px] font-medium text-zinc-400">{line.speaker}</span>
                      {line.concept && <span className="rounded border border-purple-500/30 bg-purple-500/10 px-1.5 py-px text-[10px] text-purple-300">{line.concept}</span>}
                    </div>
                    <p className={cn('text-pretty text-sm leading-relaxed', isLatest ? 'text-zinc-100' : 'text-zinc-400')}>{line.text}</p>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ol>
        )}
      </div>
      <div className="border-t border-white/[0.06] bg-zinc-950/40 px-4 py-3">
        <AudioWaveform active={listening} />
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            {listening ? <Mic className="size-3.5 text-cyan-400" aria-hidden="true" /> : <MicOff className="size-3.5 text-zinc-500" aria-hidden="true" />}
            <span>{listening ? 'Listening for live data' : 'Paused'}</span>
          </div>
          <button type="button" onClick={() => setListening((value) => !value)} aria-pressed={!listening} className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-cyan-400">
            {listening ? <Pause className="size-3" aria-hidden="true" /> : <Play className="size-3" aria-hidden="true" />}
            {listening ? 'Pause' : 'Resume'}
          </button>
        </div>
      </div>
    </GlassPanel>
  )
}
