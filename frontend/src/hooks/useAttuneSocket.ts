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

type SessionSyncMessage = {
  status: 'session_sync'
  transcript: string[]
  questions: Omit<QuestionRoutedMessage, 'status'>[]
  nodes: BackendGraphNode[]
  edges: BackendGraphEdge[]
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
  const isMounted = useRef(false)
  const reconnectTimeout = useRef<number | null>(null)
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
    let effectSocket: WebSocket | null = null
    let effectActive = true
    isMounted.current = true

    const scheduleReconnect = () => {
      if (!isMounted.current || !effectActive || reconnectTimeout.current !== null) return
      reconnectTimeout.current = window.setTimeout(() => {
        reconnectTimeout.current = null
        connect()
      }, 2_000)
    }

    const connect = () => {
      if (!isMounted.current || !effectActive) return
      const existingSocket = socketRef.current
      if (
        existingSocket &&
        (existingSocket.readyState === WebSocket.CONNECTING ||
          existingSocket.readyState === WebSocket.OPEN)
      ) {
        return
      }

      // The QR page is opened on a phone, so 127.0.0.1 would point to the
      // phone itself. Reuse the host that served the current frontend instead.
      const currentHost = window.location.hostname
      const wsUrl = `ws://${currentHost}:8000/ws/workshop/${sessionId}?presenter_type=${presenterType || 'educator'}`
      console.log('WS Connecting:', wsUrl)
      const socket = new WebSocket(wsUrl)
      effectSocket = socket
      socketRef.current = socket

      socket.onopen = () => {
        console.log('WS Connected')
        // A prior effect can finish closing after a new socket has connected.
        // Only the socket currently owned by this hook may change UI state.
        if (socketRef.current === socket) setConnected(true)
      }
      socket.onclose = () => {
        if (socketRef.current === socket && isMounted.current && effectActive) {
          socketRef.current = null
          setConnected(false)
          console.warn('WebSocket closed. Reconnecting in 2 seconds…')
          scheduleReconnect()
        }
      }
      socket.onerror = (event) => {
        console.log('WS Error', event)
        if (socketRef.current === socket) setConnected(false)
      }
      socket.onmessage = (event: MessageEvent<string>) => {
        let message: GraphUpdatedMessage | QuestionRoutedMessage | SessionSyncMessage | ReportGeneratedMessage | ErrorMessage
        try {
          // WebSocketMessageEvent payloads are exposed as `data`, not `message`.
          message = JSON.parse(event.data) as GraphUpdatedMessage | QuestionRoutedMessage | SessionSyncMessage | ReportGeneratedMessage | ErrorMessage
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

        if (message.status === 'session_sync') {
          const syncedQuestions: QueueQuestion[] = message.questions.map((question, index) => {
            const routing = toRoutingMode(question.routing_mode)
            return {
              id: `synced-question-${index}-${question.student_id}`,
              student: question.student_id,
              question: question.question,
              routing,
              priority: question.priority_score,
              concept: question.root_cause_concept,
              reasoning: question.reasoning,
              studentResponse: toStudentResponse(routing),
              askedAgo: 'earlier this session',
              status: 'active',
            }
          })
          questionsRef.current = syncedQuestions
          setQuestions(syncedQuestions)
          setTranscriptLines(
            message.transcript.map((text, index) => ({
              id: `synced-transcript-${index}`,
              speaker: 'Workshop speaker',
              timestamp: 'Earlier',
              text,
            })),
          )
          setNodes(
            message.nodes.map((node, index) => {
              const matchingQuestions = syncedQuestions.filter(
                (question) =>
                  normalizeConcept(question.concept) !== 'unknown' &&
                  (normalizeConcept(question.concept) === normalizeConcept(node.id) ||
                    normalizeConcept(question.concept) === normalizeConcept(node.label ?? node.id)),
              )
              return {
                id: node.id,
                type: 'concept',
                position: { x: (index % 3) * 230, y: Math.floor(index / 3) * 160 },
                data: {
                  label: node.label ?? node.id,
                  kind: index === message.nodes.length - 1 ? 'active' : 'foundation',
                  comprehension: Math.max(0, 100 - matchingQuestions.length * 15),
                  signals: matchingQuestions.length,
                  highlighted: matchingQuestions.length > 0,
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
      effectActive = false
      isMounted.current = false
      if (connectTimer !== undefined) window.clearTimeout(connectTimer)
      if (reconnectTimeout.current !== null) {
        window.clearTimeout(reconnectTimeout.current)
        reconnectTimeout.current = null
      }
      const socket = effectSocket
      if (socketRef.current === socket) socketRef.current = null
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

  const resolveConcept = useCallback((concept: string) => {
    const normalizedConcept = normalizeConcept(concept)
    if (normalizedConcept === 'unknown') return
    const nextQuestions = questionsRef.current.map((question) =>
      question.status === 'active' && normalizeConcept(question.concept) === normalizedConcept
        ? { ...question, status: 'resolved' as const }
        : question,
    )
    questionsRef.current = nextQuestions
    setQuestions(nextQuestions)
    // Every active question for this root cause has been cleared, so remove
    // the graph alert immediately.
    setNodes((current) =>
      current.map((node) =>
        normalizeConcept(node.id) === normalizedConcept ||
        normalizeConcept(node.data.label) === normalizedConcept
          ? { ...node, data: { ...node.data, highlighted: false } }
          : node,
      ),
    )
  }, [])

  const snoozeQuestion = useCallback((questionId: string) => {
    const nextQuestions = questionsRef.current.filter((question) => question.id !== questionId)
    questionsRef.current = nextQuestions
    setQuestions(nextQuestions)
  }, [])

  const sendTranscript = useCallback((text: string): boolean => {
    const transcript = text.trim()
    const socket = socketRef.current
    if (!transcript) return false
    if (socket?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not open; transcript was not sent.', socket?.readyState)
      return false
    }
    const message = JSON.stringify({ type: 'transcript', text: transcript })
    console.log('SENDING WS MESSAGE:', message)
    socket.send(message)
    return true
  }, [])

  const sendQuestion = useCallback((text: string): boolean => {
    const question = text.trim()
    const socket = socketRef.current
    if (!question) return false
    if (socket?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not open; question was not sent.', socket?.readyState)
      return false
    }
    const message = JSON.stringify({ type: 'question', text: question })
    console.log('SENDING WS MESSAGE:', message)
    socket.send(message)
    return true
  }, [])

  const generateReport = useCallback((): boolean => {
    const socket = socketRef.current
    if (socket?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not open; report request was not sent.', socket?.readyState)
      setReportError('Connection is not ready. Please try again.')
      return false
    }
    setReport(null)
    setReportError(null)
    const message = JSON.stringify({ type: 'generate_report' })
    console.log('SENDING WS MESSAGE:', message)
    socket.send(message)
    return true
  }, [])

  return {
    connected,
    nodes,
    edges,
    questions,
    transcriptLines,
    resolveQuestion,
    resolveConcept,
    snoozeQuestion,
    sendTranscript,
    sendQuestion,
    generateReport,
    report,
    reportError,
    presenterType,
  }
}
