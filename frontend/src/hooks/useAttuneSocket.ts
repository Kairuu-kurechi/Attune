import { useCallback, useEffect, useRef, useState } from 'react'
import type { Edge } from '@xyflow/react'
import type { ConceptNodeType } from '@/components/attune/concept-node'
import type { QueueQuestion, RoutingMode, TranscriptLine } from '@/lib/attune-types'

type BackendGraphNode = { id: string; label?: string }
type BackendGraphEdge = { id?: string; from: string; to: string; label?: string }

type GraphUpdatedMessage = {
  status: 'graph_updated'
  transcript?: string
  nodes: BackendGraphNode[]
  edges: BackendGraphEdge[]
}

type QuestionRoutedMessage = {
  status: 'question_routed'
  student_id: string
  question: string
  routing_mode: 'DIRECT_ANSWER' | 'HINT' | 'COUNTER_QUESTION' | 'DEFER_TO_SPEAKER'
  priority_score: number
  reasoning: string
  root_cause_concept: string
}

function normalizeConcept(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ')
}

function toRoutingMode(mode: QuestionRoutedMessage['routing_mode']): RoutingMode {
  if (mode === 'DEFER_TO_SPEAKER') return 'defer'
  if (mode === 'DIRECT_ANSWER') return 'auto'
  return 'socratic'
}

function toStudentResponse(mode: RoutingMode): string {
  if (mode === 'defer') return 'This has been flagged for the speaker to address live.'
  if (mode === 'auto') return 'Attune can answer this directly from the workshop context.'
  return 'Attune suggests reflecting on the concepts just discussed.'
}

export function useAttuneSocket(sessionId: string, presenterType?: string) {
  const socketRef = useRef<WebSocket | null>(null)
  const [nodes, setNodes] = useState<ConceptNodeType[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [questions, setQuestions] = useState<QueueQuestion[]>([])
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let connectTimer: number | undefined

    const connect = () => {
      const existingSocket = socketRef.current
      if (
        existingSocket &&
        (existingSocket.readyState === WebSocket.CONNECTING ||
          existingSocket.readyState === WebSocket.OPEN)
      ) {
        return
      }

      const socketUrl = `ws://127.0.0.1:8000/ws/workshop/${encodeURIComponent(sessionId)}?${new URLSearchParams({ presenter_type: presenterType ?? 'educator' })}`
      const socket = new WebSocket(socketUrl)
      socketRef.current = socket

      socket.onopen = () => {
        console.log('WS Connected')
        setConnected(true)
      }
      socket.onclose = () => setConnected(false)
      socket.onerror = (event) => {
        console.log('WS Error', event)
        setConnected(false)
      }
      socket.onmessage = (event: MessageEvent<string>) => {
        let message: GraphUpdatedMessage | QuestionRoutedMessage
        try {
          // WebSocketMessageEvent payloads are exposed as `data`, not `message`.
          message = JSON.parse(event.data) as GraphUpdatedMessage | QuestionRoutedMessage
          console.log('WS Message Received:', message)
        } catch {
          return
        }

        if (message.status === 'graph_updated') {
          setNodes(
            message.nodes.map((node, index) => ({
              id: node.id,
              type: 'concept',
              position: { x: (index % 3) * 230, y: Math.floor(index / 3) * 160 },
              data: {
                label: node.label ?? node.id,
                kind: index === message.nodes.length - 1 ? 'active' : 'foundation',
                mastery: 0,
                signals: 0,
                pulseDelay: index * 0.15,
              },
            })),
          )
          setEdges(
            message.edges.map((edge) => ({
              ...edge,
              id: edge.id ?? `${edge.from}-${edge.to}`,
              source: edge.from,
              target: edge.to,
              animated: true,
              type: 'smoothstep',
              style: { stroke: '#22d3ee', strokeWidth: 1.5, strokeDasharray: '6 4' },
            })),
          )
          const transcript = message.transcript
          if (transcript) {
            setTranscriptLines((current) => [
              ...current,
              {
                id: `transcript-${crypto.randomUUID()}`,
                speaker: 'Workshop speaker',
                timestamp: new Date().toLocaleTimeString(),
                text: transcript,
              },
            ].slice(-30))
          }
          return
        }

        if (message.status === 'question_routed') {
          const routing = toRoutingMode(message.routing_mode)
        const rootCause = message.root_cause_concept.toLowerCase().trim()
        setNodes((current) => {
          console.log('Root cause match:', rootCause, 'Node IDs:', current.map((node) => node.id))
          return current.map((node) => {
            const nodeId = node.id.toLowerCase().trim()
            const nodeLabel = node.data.label.toLowerCase().trim()
            const matchesRootCause =
              rootCause !== 'unknown' &&
              (nodeId === rootCause ||
                nodeLabel === rootCause ||
                normalizeConcept(node.id) === normalizeConcept(rootCause) ||
                normalizeConcept(node.data.label) === normalizeConcept(rootCause))
            return {
              ...node,
              data: { ...node.data, highlighted: matchesRootCause },
            }
          })
        })
          setQuestions((current) => [
            {
              id: `question-${crypto.randomUUID()}`,
              student: message.student_id,
              question: message.question,
              routing,
              priority: message.priority_score,
              concept: message.root_cause_concept,
              reasoning: message.reasoning,
              studentResponse: toStudentResponse(routing),
              askedAgo: 'just now',
            },
            ...current,
          ])
        }
      }
    }

    // React 18 Strict Mode immediately replays effects in development. Delaying
    // creation lets the first setup/cleanup pair cancel before a socket exists.
    connectTimer = window.setTimeout(connect, 0)

    return () => {
      if (connectTimer !== undefined) window.clearTimeout(connectTimer)
      const socket = socketRef.current
      if (
        socket &&
        (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)
      ) {
        socket.close()
      }
    }
  }, [sessionId, presenterType])

  const dismissQuestion = useCallback((questionId: string) => {
    setQuestions((current) => current.filter((question) => question.id !== questionId))
  }, [])

  const sendTranscript = useCallback((text: string): boolean => {
    const transcript = text.trim()
    const socket = socketRef.current
    if (!transcript || socket?.readyState !== WebSocket.OPEN) return false
    socket.send(JSON.stringify({ type: 'transcript', text: transcript }))
    return true
  }, [])

  return {
    connected,
    nodes,
    edges,
    questions,
    transcriptLines,
    dismissQuestion,
    sendTranscript,
    presenterType,
  }
}
