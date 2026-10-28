import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Network } from 'lucide-react'
import { GlassPanel } from './glass-panel'
import { ConceptNode, type ConceptNodeType } from './concept-node'

const nodeTypes = { concept: ConceptNode }

export function CausalGraph({
  nodes,
  edges,
  title,
}: {
  nodes: ConceptNodeType[]
  edges: Edge[]
  title: string
}) {
  return (
    <GlassPanel
      labelledBy="graph-title"
      title={title}
      icon={<Network className="size-3.5" aria-hidden="true" />}
      meta={<span className="font-mono text-[11px] text-zinc-500">{edges.length} causal links</span>}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.08),transparent_65%)]" />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode="dark"
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.3}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'transparent' }}
        aria-label={title}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="rgba(255,255,255,0.07)" />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-white/[0.08] bg-zinc-950/70 px-3 py-2 backdrop-blur-md">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">Graph state</p>
        <p className="mt-0.5 font-mono text-xs text-zinc-300">{nodes.length} concepts · {edges.length} causal links</p>
      </div>
    </GlassPanel>
  )
}
