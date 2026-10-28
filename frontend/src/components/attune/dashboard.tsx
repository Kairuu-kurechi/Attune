import { useState } from 'react'
import { DashboardHeader } from './dashboard-header'
import { TranscriptPanel } from './transcript-panel'
import { CausalGraph } from './causal-graph'
import { AttentionQueue } from './attention-queue'
import type { ViewMode } from '@/lib/attune-types'
import type { Edge } from '@xyflow/react'
import type { ConceptNodeType } from './concept-node'
import type { QueueQuestion, TranscriptLine } from '@/lib/attune-types'
import type { PresenterType } from '@/lib/presenter'
import { getPersonaConfig } from '@/lib/persona-config'

export function Dashboard({
  connected,
  nodes,
  edges,
  questions,
  transcriptLines,
  onResolveQuestion,
  onTranscriptFinal,
  sessionId,
  presenterType,
}: {
  connected: boolean
  nodes: ConceptNodeType[]
  edges: Edge[]
  questions: QueueQuestion[]
  transcriptLines: TranscriptLine[]
  onResolveQuestion: (questionId: string) => void
  onTranscriptFinal: (text: string) => boolean
  sessionId?: string
  presenterType?: PresenterType
}) {
  const [mode, setMode] = useState<ViewMode>('speaker')
  const persona = getPersonaConfig(presenterType)

  return (
    <div className="relative flex min-h-dvh flex-col bg-zinc-950 lg:h-dvh">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_50%_at_20%_0%,rgba(34,211,238,0.08),transparent),radial-gradient(50%_50%_at_90%_10%,rgba(168,85,247,0.08),transparent)]"
      />
      <DashboardHeader connected={connected} mode={mode} onModeChange={setMode} presenterType={presenterType} persona={persona} sessionId={sessionId} />
      <main className="relative grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[3fr_4fr_3fr] lg:p-6 [&>section]:h-[560px] lg:[&>section]:h-auto">
        <h1 className="sr-only">Attune live session dashboard</h1>
        <TranscriptPanel lines={transcriptLines} title={persona.transcriptLabel} onTranscriptFinal={onTranscriptFinal} />
        <CausalGraph nodes={nodes} edges={edges} title={persona.graphLabel} />
        <AttentionQueue mode={mode} questions={questions} onResolve={onResolveQuestion} title={persona.queueLabel} />
      </main>
    </div>
  )
}
