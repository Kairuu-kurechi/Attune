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

type ReportGeneratedMessage = {
  status: 'report_generated'
  report: string
}

type ErrorMessage = {
  status: 'error'
  message: string
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
  const questionsRef = useRef<QueueQuestion[]>([])
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([])
  const [connected, setConnected] = useState(false)
  const [report, setReport] = useState<string | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)

  useEffect(() => {
    questionsRef.current = questions
  }, [questions])

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

      // `127.0.0.1` resolves to the phone when an attendee opens the QR link.
      // Use the LAN address shared through VITE_NETWORK_IP so both the speaker
      // dashboard and audience devices connect to the laptop running FastAPI.
      const backendHost = import.meta.env.VITE_NETWORK_IP || window.location.hostname
      const socketProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const socketUrl = `${socketProtocol}://${backendHost}:8000/ws/workshop/${encodeURIComponent(sessionId)}?${new URLSearchParams({ presenter_type: presenterType ?? 'educator' })}`
      console.log('WS Connecting:', socketUrl)
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
        let message: GraphUpdatedMessage | QuestionRoutedMessage | ReportGeneratedMessage | ErrorMessage
        try {
          // WebSocketMessageEvent payloads are exposed as `data`, not `message`.
          message = JSON.parse(event.data) as GraphUpdatedMessage | QuestionRoutedMessage | ReportGeneratedMessage | ErrorMessage
          console.log('WS Message Received:', message)
        } catch {
          return
        }

        if (message.status === 'graph_updated') {
          setNodes((currentNodes) =>
            message.nodes.map((node, index) => {
              const existingNode = currentNodes.find(
                (currentNode) =>
                  normalizeConcept(currentNode.id) === normalizeConcept(node.id) ||
                  normalizeConcept(currentNode.data.label) === normalizeConcept(node.label ?? node.id),
              )
              return {
              id: node.id,
              type: 'concept',
              position: { x: (index % 3) * 230, y: Math.floor(index / 3) * 160 },
              data: {
                label: node.label ?? node.id,
                kind: index === message.nodes.length - 1 ? 'active' : 'foundation',
                // Keep an existing concept's score through later graph updates.
                comprehension: existingNode?.data.comprehension ?? 100,
                signals: existingNode?.data.signals ?? 0,
                pulseDelay: index * 0.15,
              },
              }
            }),
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
              data: {
                ...node.data,
                highlighted: matchesRootCause,
                // Each routed question signals 15% less comprehension of its
                // causal root. Scores never fall below zero.
                comprehension: matchesRootCause
                  ? Math.max(0, node.data.comprehension - 15)
                  : node.data.comprehension,
                signals: matchesRootCause ? node.data.signals + 1 : node.data.signals,
              },
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
              status: 'active',
            },
            ...current,
          ])
        }

        if (message.status === 'report_generated') {
          setReport(message.report)
          setReportError(null)
        }

        if (message.status === 'error') {
          setReportError(message.message)
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

  const resolveQuestion = useCallback((questionId: string) => {
    const resolvedQuestion = questionsRef.current.find((question) => question.id === questionId)
    if (!resolvedQuestion || resolvedQuestion.status === 'resolved') return

    const rootCause = normalizeConcept(resolvedQuestion.concept)
    const nextQuestions = questionsRef.current.map((question) =>
      question.id === questionId ? { ...question, status: 'resolved' as const } : question,
    )
    questionsRef.current = nextQuestions
    setQuestions(nextQuestions)

    const stillActiveForConcept = nextQuestions.some(
      (question) =>
        question.status === 'active' && normalizeConcept(question.concept) === rootCause,
    )
    if (rootCause !== 'unknown') {
      setNodes((current) =>
        current.map((node) => {
          const matchesRootCause =
            normalizeConcept(node.id) === rootCause ||
            normalizeConcept(node.data.label) === rootCause
          return matchesRootCause
            ? { ...node, data: { ...node.data, highlighted: stillActiveForConcept } }
            : node
        }),
      )
    }
  }, [])

  const snoozeQuestion = useCallback((questionId: string) => {
    const nextQuestions = questionsRef.current.filter((question) => question.id !== questionId)
    questionsRef.current = nextQuestions
    setQuestions(nextQuestions)
  }, [])

  const sendTranscript = useCallback((text: string): boolean => {
    const transcript = text.trim()
    const socket = socketRef.current
    if (!transcript || socket?.readyState !== WebSocket.OPEN) return false
    socket.send(JSON.stringify({ type: 'transcript', text: transcript }))
    return true
  }, [])

  const sendQuestion = useCallback((text: string): boolean => {
    const question = text.trim()
    const socket = socketRef.current
    if (!question || socket?.readyState !== WebSocket.OPEN) return false
    socket.send(JSON.stringify({ type: 'question', text: question }))
    return true
  }, [])

  const generateReport = useCallback((): boolean => {
    const socket = socketRef.current
    if (socket?.readyState !== WebSocket.OPEN) {
      setReportError('Connection is not ready. Please try again.')
      return false
    }
    setReport(null)
    setReportError(null)
    socket.send(JSON.stringify({ type: 'generate_report' }))
    return true
  }, [])

  return {
    connected,
    nodes,
    edges,
    questions,
    transcriptLines,
    resolveQuestion,
    snoozeQuestion,
    sendTranscript,
    sendQuestion,
    generateReport,
    report,
    reportError,
    presenterType,
  }
}
