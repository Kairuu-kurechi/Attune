import { useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Inbox } from 'lucide-react'
import { GlassPanel } from './glass-panel'
import { QuestionCard } from './question-card'
import type { QueueQuestion, ViewMode } from '@/lib/attune-types'

export function AttentionQueue({
  mode,
  questions,
}: {
  mode: ViewMode
  questions: QueueQuestion[]
}) {

  const sorted = useMemo(
    () => [...questions].sort((a, b) => b.priority - a.priority),
    [questions],
  )
  const urgentCount = questions.filter((q) => q.routing === 'defer').length

  return (
    <GlassPanel
      labelledBy="queue-title"
      title="Priority Attention Queue"
      icon={<Inbox className="size-3.5" aria-hidden="true" />}
      meta={
        <div className="flex items-center gap-2">
          {urgentCount > 0 && (
            <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">
              {urgentCount} urgent
            </span>
          )}
          <span className="font-mono text-[11px] text-zinc-500">{questions.length} queued</span>
        </div>
      }
    >
      <ul
        className="scrollbar-thin flex h-full flex-col gap-3 overflow-y-auto overflow-x-hidden p-3"
        aria-live="polite"
        aria-label="Routed student questions, sorted by priority"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {sorted.map((q) => (
            <QuestionCard key={q.id} question={q} mode={mode} />
          ))}
        </AnimatePresence>
        {questions.length === 0 && (
          <li className="rounded-xl border border-dashed border-white/[0.1] p-4 text-center text-xs text-zinc-500">
            Waiting for routed student questions.
          </li>
        )}
      </ul>
    </GlassPanel>
  )
}
