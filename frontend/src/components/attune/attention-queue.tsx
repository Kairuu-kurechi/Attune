import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, CircleCheck, Inbox, Layers } from 'lucide-react'
import { GlassPanel } from './glass-panel'
import { PriorityRing } from './priority-ring'
import { QuestionCard } from './question-card'
import type { QueueQuestion, ViewMode } from '@/lib/attune-types'
import { cn } from '@/lib/utils'

type QueueEntry =
  | { kind: 'question'; question: QueueQuestion; priority: number; active: boolean }
  | { kind: 'cluster'; concept: string; questions: QueueQuestion[]; priority: number; active: boolean }

function conceptKey(concept: string): string {
  return concept.trim().toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ')
}

function ClusterCard({
  concept, questions, priority, active, mode, onResolve, onResolveConcept, onSnooze,
}: {
  concept: string
  questions: QueueQuestion[]
  priority: number
  active: boolean
  mode: ViewMode
  onResolve: (questionId: string) => void
  onResolveConcept: (concept: string) => void
  onSnooze: (questionId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const resolved = !active

  return (
    <motion.li layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} className={cn('relative shrink-0', resolved && 'opacity-55')}>
      <div aria-hidden="true" className="absolute inset-x-2 -bottom-1 h-full rounded-xl border border-purple-400/15 bg-purple-500/[0.04]" />
      <div className={cn('relative rounded-xl border border-purple-400/35 bg-zinc-900/85 p-4 shadow-[0_0_24px_-12px_rgba(168,85,247,0.7)] backdrop-blur-md', resolved && 'border-emerald-500/45 bg-emerald-500/[0.06]')}>
        <div className="flex items-start gap-3">
          <PriorityRing score={priority} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-purple-400/35 bg-purple-400/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-purple-200"><Layers className="size-3" />CONCEPT CLUSTER</span>
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-zinc-300">{questions.length} Similar Questions</span>
              {resolved && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300"><CircleCheck className="size-3" />Resolved</span>}
            </div>
            <h3 className="mt-2 text-sm font-semibold capitalize text-zinc-50">{concept}</h3>
            <p className="mt-1 text-xs text-zinc-400">Priority {priority} · {active ? 'Shared confusion signal' : 'Cluster cleared'}</p>
          </div>
        </div>
        {mode === 'speaker' && active && <button type="button" onClick={() => onResolveConcept(concept)} className="mt-4 w-full rounded-md bg-red-500/90 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400">Address {questions.length} Questions Now</button>}
        <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-3 flex w-full items-center justify-between rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/[0.06]">{expanded ? 'Hide individual questions' : 'Review individual questions'}<ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} /></button>
        <AnimatePresence initial={false}>
          {expanded && <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 flex flex-col gap-2 overflow-hidden">{questions.map((question) => <QuestionCard key={question.id} question={question} mode={mode} onResolve={onResolve} onSnooze={onSnooze} />)}</motion.ul>}
        </AnimatePresence>
      </div>
    </motion.li>
  )
}

export function AttentionQueue({ mode, questions, onResolve, onResolveConcept, onSnooze, title, isAgentProcessing }: {
  mode: ViewMode
  questions: QueueQuestion[]
  onResolve: (questionId: string) => void
  onResolveConcept: (concept: string) => void
  onSnooze: (questionId: string) => void
  title: string
  isAgentProcessing: boolean
}) {
  const entries = useMemo<QueueEntry[]>(() => {
    const grouped = new Map<string, QueueQuestion[]>()
    for (const question of questions) {
      const key = conceptKey(question.concept)
      const groupKey = key === 'unknown' ? `question:${question.id}` : key
      grouped.set(groupKey, [...(grouped.get(groupKey) ?? []), question])
    }
    return [...grouped.values()].map<QueueEntry>((group) => {
      const priority = Math.max(...group.map((question) => question.priority))
      const active = group.some((question) => question.status === 'active')
      return group.length > 1
        ? { kind: 'cluster', concept: group[0].concept, questions: group, priority, active }
        : { kind: 'question', question: group[0], priority, active }
    }).sort((left, right) => Number(right.active) - Number(left.active) || right.priority - left.priority)
  }, [questions])
  const urgentCount = questions.filter((q) => q.routing === 'defer' && q.status === 'active').length

  return (
    <GlassPanel labelledBy="queue-title" title={title} icon={<Inbox className="size-3.5" aria-hidden="true" />} meta={<div className="flex items-center gap-2">{isAgentProcessing && <span className="animate-pulse rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">Agent is analyzing...</span>}{urgentCount > 0 && <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">{urgentCount} urgent</span>}<span className="font-mono text-[11px] text-zinc-500">{questions.length} queued</span></div>}>
      <ul className="scrollbar-thin flex h-full flex-col gap-3 overflow-y-auto overflow-x-hidden p-3" aria-live="polite" aria-label="Routed student questions, sorted by priority">
        <AnimatePresence initial={false} mode="popLayout">
          {entries.map((entry) => entry.kind === 'cluster' ? <ClusterCard key={`cluster:${conceptKey(entry.concept)}`} concept={entry.concept} questions={entry.questions} priority={entry.priority} active={entry.active} mode={mode} onResolve={onResolve} onResolveConcept={onResolveConcept} onSnooze={onSnooze} /> : <QuestionCard key={entry.question.id} question={entry.question} mode={mode} onResolve={onResolve} onSnooze={onSnooze} />)}
        </AnimatePresence>
        {questions.length === 0 && <li className="rounded-xl border border-dashed border-white/[0.1] p-4 text-center text-xs text-zinc-500">Waiting for routed student questions.</li>}
      </ul>
    </GlassPanel>
  )
}
