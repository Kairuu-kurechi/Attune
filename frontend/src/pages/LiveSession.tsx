import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Dashboard as LiveDashboard } from '@/components/attune/dashboard'
import { useAttuneSocket } from '@/hooks/useAttuneSocket'
import type { PresenterType } from '@/lib/presenter'
import { supabase } from '@/lib/supabase'

export function LiveSession() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [presenterType, setPresenterType] = useState<PresenterType | undefined>()
  const { connected, nodes, edges, questions, transcriptLines, resolveQuestion, resolveConcept, snoozeQuestion, sendTranscript, generateReport, report, reportError } = useAttuneSocket(sessionId ?? 'demo_session_1', presenterType)

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
      <LiveDashboard connected={connected} nodes={nodes} edges={edges} questions={questions} transcriptLines={transcriptLines} onResolveQuestion={resolveQuestion} onResolveConcept={resolveConcept} onSnoozeQuestion={snoozeQuestion} onTranscriptFinal={sendTranscript} onGenerateReport={generateReport} report={report} reportError={reportError} presenterType={presenterType} sessionId={sessionId} onBack={() => navigate('/dashboard')} />
    </div>
  )
}
