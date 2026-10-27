import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, MessageCircleReply } from 'lucide-react'
import { PriorityRing } from './priority-ring'
import { routingMeta, type QueueQuestion, type ViewMode } from '@/lib/attune-types'
import { cn } from '@/lib/utils'

interface QuestionCardProps {
  question: QueueQuestion
  mode: ViewMode
  onResolve: (questionId: string) => void
}

export const QuestionCard = forwardRef<HTMLLIElement, QuestionCardProps>(
  function QuestionCard({ question, mode, onResolve }, ref) {
    const meta = routingMeta[question.routing]
    const urgent = question.routing === 'defer'
    const actionable = question.priority >= 50

    return (
      <motion.li
        ref={ref}
        layout
        initial={{ opacity: 0, x: 80, scale: 0.96, boxShadow: '0 0 32px rgba(34,211,238,0.7)' }}
        animate={{ opacity: 1, x: 0, scale: 1, boxShadow: '0 0 0 rgba(34,211,238,0)' }}
        exit={{ opacity: 0, x: 80, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className={cn(
          'relative shrink-0 overflow-hidden rounded-xl border border-l-2 border-white/[0.08] bg-zinc-900/60 p-4 backdrop-blur-md',
          meta.accent,
          urgent && 'shadow-[0_0_32px_-12px_rgba(239,68,68,0.6)]',
        )}
      >
        <div className="flex items-start gap-3">
          <PriorityRing score={question.priority} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wider',
                  meta.badge,
                )}
              >
                {meta.label}
              </span>
              <span className="text-[11px] text-zinc-500">{question.concept}</span>
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-500">
              <span className="text-zinc-400">{question.student}</span>
              {' · '}
              {question.askedAgo}
            </p>
          </div>
        </div>

        <p className="mt-3 text-pretty text-sm leading-relaxed text-zinc-100">
          {question.question}
        </p>

        {mode === 'speaker' ? (
          <div className="mt-3 rounded-lg border border-purple-500/15 bg-purple-500/[0.06] p-3">
            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-purple-300">
              <Sparkles className="size-3" aria-hidden="true" />
              Agent Reasoning
            </p>
            <p className="text-pretty text-xs italic leading-relaxed text-zinc-400">
              {question.reasoning}
            </p>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-cyan-500/15 bg-cyan-500/[0.06] p-3">
            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-cyan-300">
              <MessageCircleReply className="size-3" aria-hidden="true" />
              Student View
            </p>
            <p className="text-pretty text-xs leading-relaxed text-zinc-300">
              {question.studentResponse}
            </p>
          </div>
        )}

        {actionable && mode === 'speaker' && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onResolve(question.id)}
              className="flex-1 rounded-md bg-red-500/90 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
            >
              Address now
            </button>
            <button
              type="button"
              onClick={() => onResolve(question.id)}
              className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-cyan-400"
            >
              Snooze
            </button>
          </div>
        )}
      </motion.li>
    )
  },
)
