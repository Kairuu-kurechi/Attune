import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AudioLines, Mic, MicOff, Pause, Play } from 'lucide-react'
import { GlassPanel } from './glass-panel'
import { AudioWaveform } from './audio-waveform'
import type { TranscriptLine } from '@/lib/attune-types'
import { cn } from '@/lib/utils'

type TranscriptPanelProps = {
  lines: TranscriptLine[]
  title: string
  onTranscriptFinal: (text: string) => boolean
  isAgentProcessing: boolean
}

type MicrophoneState = 'idle' | 'listening' | 'stopped' | 'error'

const speechErrorMessages: Record<string, string> = {
  'not-allowed': 'Microphone permission was denied. Allow microphone access in your browser settings.',
  'service-not-allowed': 'Speech recognition is blocked by your browser or device policy.',
  'audio-capture': 'No microphone was detected. Check your microphone connection.',
  network: 'Speech recognition needs a network connection. Check your internet and try again.',
  'no-speech': 'No speech detected yet. Still listening…',
  aborted: 'Speech recognition was interrupted. Please start listening again.',
}

export function TranscriptPanel({ lines, title, onTranscriptFinal, isAgentProcessing }: TranscriptPanelProps) {
  const [microphoneState, setMicrophoneState] = useState<MicrophoneState>('idle')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [speechError, setSpeechError] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const listeningRef = useRef(false)
  const restartTimerRef = useRef<number | null>(null)
  const lastFinalTranscriptRef = useRef<{ text: string; sentAt: number }>({ text: '', sentAt: 0 })
  const onTranscriptFinalRef = useRef(onTranscriptFinal)
  const scrollRef = useRef<HTMLDivElement>(null)
  const listening = microphoneState === 'listening'

  useEffect(() => {
    onTranscriptFinalRef.current = onTranscriptFinal
  }, [onTranscriptFinal])

  useEffect(() => {
    const element = scrollRef.current
    if (element) element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' })
  }, [lines, interimTranscript])

  useEffect(() => () => {
    listeningRef.current = false
    if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current)
    const recognition = recognitionRef.current
    if (recognition) {
      recognition.onend = null
      recognition.onresult = null
      recognition.onerror = null
      // Abort on unmount so React Strict Mode cannot leave a prior recognition
      // instance alive long enough to restart and double-listen.
      recognition.abort()
    }
  }, [])

  const stopListening = useCallback(() => {
    listeningRef.current = false
    setMicrophoneState('stopped')
    setInterimTranscript('')
    if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current)
    recognitionRef.current?.stop()
  }, [])

  const startListening = useCallback(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Recognition) {
      setSpeechError('Speech recognition is not supported in this browser. Try Chrome or Edge.')
      return
    }

    const configureRecognition = (): SpeechRecognition => {
      const existingRecognition = recognitionRef.current
      if (existingRecognition) return existingRecognition

      const recognition = new Recognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = navigator.language || 'en-US'
      recognition.onresult = (event) => {
        if (event.results.length > 0 && event.results[0][0]) {
          console.log('Speech Result:', event.results[0][0].transcript)
        }
        setSpeechError('')
        const interimParts: string[] = []
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index]
          const text = result[0]?.transcript.trim()
          if (!text) continue
          if (result.isFinal) {
            const normalizedText = text.toLowerCase().replace(/\s+/g, ' ')
            const now = Date.now()
            const isDuplicate =
              lastFinalTranscriptRef.current.text === normalizedText &&
              now - lastFinalTranscriptRef.current.sentAt < 2_000
            if (isDuplicate) {
              console.log('Skipping duplicate final transcript:', text)
              continue
            }
            lastFinalTranscriptRef.current = { text: normalizedText, sentAt: now }
            console.log('Sending final transcript:', text)
            const sent = onTranscriptFinalRef.current(text)
            if (!sent) console.error('Transcript was not sent because the WebSocket is not open.')
          } else {
            interimParts.push(text)
          }
        }
        setInterimTranscript(interimParts.join(' '))
      }
      recognition.onerror = (event) => {
        console.error('Speech Error:', event.error)
        const message = speechErrorMessages[event.error] ?? `Speech recognition failed: ${event.error}.`
        setSpeechError(message)
        if (event.error === 'no-speech') return
        if (event.error === 'aborted' && !listeningRef.current) return
        listeningRef.current = false
        setMicrophoneState('error')
      }
      recognition.onend = () => {
        if (!listeningRef.current) return
        restartTimerRef.current = window.setTimeout(() => {
          if (!listeningRef.current) return
          try {
            recognition.start()
          } catch (error) {
            console.error('Speech restart error:', error)
            listeningRef.current = false
            setSpeechError('Speech recognition could not restart. Please start listening again.')
            setMicrophoneState('error')
          }
        }, 150)
      }
      recognitionRef.current = recognition
      return recognition
    }

    setSpeechError('')
    listeningRef.current = true
    setMicrophoneState('listening')
    const recognition = configureRecognition()
    try {
      recognition.start()
    } catch (error) {
      console.error('Speech start error:', error)
      setSpeechError('Speech recognition could not start. Please try again.')
      listeningRef.current = false
      setMicrophoneState('error')
    }
  }, [])

  const latestId = lines[lines.length - 1]?.id

  return (
    <GlassPanel
      labelledBy="transcript-title"
      title={title}
      icon={<AudioLines className="size-3.5" aria-hidden="true" />}
      meta={<span className="font-mono text-[11px] text-zinc-500">{lines.length} segments</span>}
      bodyClassName="flex flex-col"
    >
      <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-live="polite" aria-relevant="additions">
        {lines.length === 0 && !interimTranscript ? (
          <p className="py-6 text-center text-sm text-zinc-500">Press Start Listening to capture the live transcript.</p>
        ) : (
          <ol className="flex flex-col gap-4">
            <AnimatePresence initial={false}>
              {lines.map((line) => {
                const isLatest = line.id === latestId
                return (
                  <motion.li key={line.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="group relative pl-4">
                    <span aria-hidden="true" className={cn('absolute left-0 top-1.5 h-[calc(100%-6px)] w-px', isLatest ? 'bg-cyan-400/70' : 'bg-white/[0.08]')} />
                    <div className="mb-1 flex items-center gap-2"><span className="font-mono text-[10px] tabular-nums text-zinc-500">{line.timestamp}</span><span className="text-[11px] font-medium text-zinc-400">{line.speaker}</span>{line.concept && <span className="rounded border border-purple-500/30 bg-purple-500/10 px-1.5 py-px text-[10px] text-purple-300">{line.concept}</span>}</div>
                    <p className={cn('text-pretty text-sm leading-relaxed', isLatest ? 'text-zinc-100' : 'text-zinc-400')}>{line.text}</p>
                  </motion.li>
                )
              })}
            </AnimatePresence>
            {interimTranscript && <li className="border-l border-zinc-600 pl-4 text-sm italic text-zinc-500">{interimTranscript}</li>}
          </ol>
        )}
      </div>
      <div className="border-t border-white/[0.06] bg-zinc-950/40 px-4 py-3">
        <AudioWaveform active={listening} />
        {speechError && <p className="mt-2 text-xs text-red-300">{speechError}</p>}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            {listening ? <Mic className="size-3.5 animate-pulse text-red-400" aria-hidden="true" /> : <MicOff className="size-3.5 text-zinc-500" aria-hidden="true" />}
            <span>{listening ? 'Recording and transcribing' : microphoneState === 'stopped' ? 'Microphone paused' : microphoneState === 'error' ? 'Microphone error' : 'Ready to listen'}</span>
            {isAgentProcessing && <span className="animate-pulse rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">Agent is analyzing...</span>}
          </div>
          <button type="button" onClick={listening ? stopListening : startListening} aria-pressed={listening} className={cn('flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-cyan-400', listening ? 'border-red-400/50 bg-red-500/15 text-red-200' : 'border-cyan-400/50 bg-cyan-400/15 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.35)] hover:bg-cyan-400/25')}>
            {listening ? <Pause className="size-3" aria-hidden="true" /> : <Play className="size-3" aria-hidden="true" />}
            {listening ? 'Stop Listening' : 'Start Listening'}
          </button>
        </div>
      </div>
    </GlassPanel>
  )
}
