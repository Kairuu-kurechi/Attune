import { memo, type CSSProperties } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { ConceptKind } from '@/lib/attune-types'
import { cn } from '@/lib/utils'

export type ConceptNodeData = {
  label: string
  kind: ConceptKind
  comprehension: number
  signals: number
  pulseDelay: number
  highlighted?: boolean
}

export type ConceptNodeType = Node<ConceptNodeData, 'concept'>

const kindStyles: Record<
  ConceptKind,
  { label: string; glow: string; glowSoft: string; dot: string; bar: string; text: string }
> = {
  active: {
    label: 'Teaching now',
    glow: 'rgba(34,211,238,0.75)',
    glowSoft: 'rgba(34,211,238,0.25)',
    dot: 'bg-cyan-400',
    bar: 'bg-cyan-400',
    text: 'text-cyan-300',
  },
  foundation: {
    label: 'Foundation',
    glow: 'rgba(168,85,247,0.6)',
    glowSoft: 'rgba(168,85,247,0.2)',
    dot: 'bg-purple-400',
    bar: 'bg-purple-400',
    text: 'text-purple-300',
  },
  misconception: {
    label: 'Confusion spike',
    glow: 'rgba(239,68,68,0.7)',
    glowSoft: 'rgba(239,68,68,0.25)',
    dot: 'bg-red-400',
    bar: 'bg-red-400',
    text: 'text-red-300',
  },
  upcoming: {
    label: 'Upcoming',
    glow: 'rgba(161,161,170,0.35)',
    glowSoft: 'rgba(161,161,170,0.12)',
    dot: 'bg-zinc-500',
    bar: 'bg-zinc-500',
    text: 'text-zinc-400',
  },
}

function ConceptNodeComponent({ data, selected }: NodeProps<ConceptNodeType>) {
  const style = kindStyles[data.kind]

  return (
    <div
      className={cn(
        'animate-node-pulse w-48 rounded-xl border border-white/10 bg-zinc-900/80 px-3.5 py-3 backdrop-blur-md transition-transform',
        selected && 'scale-[1.03]',
        data.highlighted && 'border-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.8)]',
      )}
      style={
        {
          '--node-glow': style.glow,
          '--node-glow-soft': style.glowSoft,
          animationDelay: `${data.pulseDelay}s`,
        } as CSSProperties
      }
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2 !border-zinc-700 !bg-zinc-900"
      />
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={cn('flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider', style.text)}>
          <span className={cn('size-1.5 rounded-full', style.dot)} aria-hidden="true" />
          {style.label}
        </span>
        {data.signals > 0 && (
          <span className="rounded bg-white/[0.06] px-1.5 py-px font-mono text-[10px] text-zinc-400">
            {data.signals}q
          </span>
        )}
      </div>
      <p className="text-sm font-medium tracking-tight text-zinc-50">{data.label}</p>
      <div className="mt-2.5">
        <div className="mb-1 flex items-center justify-between text-[10px] text-zinc-500">
          <span>Comprehension</span>
          <span className="font-mono tabular-nums text-zinc-400">{data.comprehension}%</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div className={cn('h-full rounded-full', style.bar)} style={{ width: `${data.comprehension}%` }} />
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!size-2 !border-zinc-700 !bg-zinc-900"
      />
    </div>
  )
}

export const ConceptNode = memo(ConceptNodeComponent)
