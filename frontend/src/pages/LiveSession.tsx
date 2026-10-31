import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Dashboard as LiveDashboard } from '@/components/attune/dashboard'
import { useAttuneSocket } from '@/hooks/useAttuneSocket'
import type { PresenterType } from '@/lib/presenter'
import { supabase } from '@/lib/supabase'

type LocationState = { presenterType?: PresenterType; slideText?: string }

export function LiveSession() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const navigationState = location.state as LocationState | null
  const slideText = navigationState?.slideText?.trim() ?? ''
  const [presenterType, setPresenterType] = useState<PresenterType | undefined>()
  const [seedReady, setSeedReady] = useState(!slideText)
  const seededRef = useRef(false)
  const { connected, isAgentProcessing, nodes, edges, questions, transcriptLines, resolveQuestion, resolveConcept, snoozeQuestion, sendTranscript, generateReport, report, reportError } = useAttuneSocket(sessionId ?? 'demo_session_1', presenterType, seedReady)

  useEffect(() => {
    if (!sessionId || !slideText || seededRef.current) return
    const seedSessionId = sessionId
    seededRef.current = true
    async function seedSession() {
      try {
        const response = await fetch(
          `http://${window.location.hostname}:8000/api/session/${encodeURIComponent(seedSessionId)}/seed`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: slideText }),
          },
        )
        if (!response.ok) throw new Error(`Seed request failed (${response.status})`)
      } catch (error) {
        console.error('Unable to seed session graph:', error)
      } finally {
        setSeedReady(true)
      }
    }
    void seedSession()
  }, [sessionId, slideText])

  useEffect(() => {
    if (!sessionId) return
    async function loadPresenterType() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }
      const [{ data: session, error: sessionError }, { data: profile, error: profileError }] = await Promise.all([
        supabase.from('sessions').select('presenter_type').eq('id', sessionId).maybeSingle(),
        supabase.from('profiles').select('presenter_type').eq('id', user.id).maybeSingle(),
      ])
      // A session persona always wins. The profile remains the safety fallback
      // for sessions created before presenter_type was introduced.
      if (!sessionError && session?.presenter_type) {
        setPresenterType(session.presenter_type as PresenterType)
      } else if (!profileError && profile?.presenter_type) {
        setPresenterType(profile.presenter_type as PresenterType)
      }
    }
    void loadPresenterType()
  }, [navigate, sessionId])

  return (
    <div className="min-h-dvh bg-zinc-950">
      <LiveDashboard connected={connected} isAgentProcessing={isAgentProcessing} nodes={nodes} edges={edges} questions={questions} transcriptLines={transcriptLines} onResolveQuestion={resolveQuestion} onResolveConcept={resolveConcept} onSnoozeQuestion={snoozeQuestion} onTranscriptFinal={sendTranscript} onGenerateReport={generateReport} report={report} reportError={reportError} presenterType={presenterType} sessionId={sessionId} onBack={() => navigate('/dashboard')} />
    </div>
  )
}
