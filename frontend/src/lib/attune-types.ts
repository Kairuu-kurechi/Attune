export type ViewMode = 'speaker' | 'student'

export type RoutingMode = 'defer' | 'socratic' | 'auto'
export type QuestionStatus = 'active' | 'resolved'

export interface TranscriptLine {
  id: string
  speaker: string
  timestamp: string
  text: string
  concept?: string
}

export interface QueueQuestion {
  id: string
  student: string
  question: string
  routing: RoutingMode
  priority: number
  concept: string
  reasoning: string
  studentResponse: string
  askedAgo: string
  status: QuestionStatus
}

export type ConceptKind = 'foundation' | 'active' | 'misconception' | 'upcoming'

export const routingMeta: Record<
  RoutingMode,
  { label: string; badge: string; accent: string }
> = {
  defer: {
    label: 'DEFER TO SPEAKER',
    badge: 'border-red-500/40 bg-red-500/10 text-red-400',
    accent: 'border-l-red-500/70',
  },
  socratic: {
    label: 'SOCRATIC ROUTE',
    badge: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
    accent: 'border-l-purple-500/70',
  },
  auto: {
    label: 'DIRECT ANSWER',
    badge: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    accent: 'border-l-cyan-500/70',
  },
}
