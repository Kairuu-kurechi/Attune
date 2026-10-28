import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Dashboard as LiveDashboard } from '@/components/attune/dashboard'
import { useAttuneSocket } from '@/hooks/useAttuneSocket'
import type { PresenterType } from '@/lib/presenter'
import { supabase } from '@/lib/supabase'

type LocationState = { presenterType?: PresenterType }

export function LiveSession() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null
  const [presenterType, setPresenterType] = useState<PresenterType | undefined>(state?.presenterType)
  const { connected, nodes, edges, questions, transcriptLines, dismissQuestion, sendTranscript } = useAttuneSocket(sessionId ?? 'demo_session_1', presenterType)

  useEffect(() => {
    if (!sessionId) return
    async function loadPresenterType() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('presenter_type')
        .eq('id', user.id)
        .maybeSingle()
      if (!profileError && profile?.presenter_type) {
        setPresenterType(profile.presenter_type as PresenterType)
        return
      }
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('presenter_type')
        .eq('id', sessionId)
        .maybeSingle()
      if (!sessionError && session?.presenter_type) setPresenterType(session.presenter_type as PresenterType)
    }
    void loadPresenterType()
  }, [navigate, sessionId])

  return (
    <div className="min-h-dvh bg-zinc-950">
      <button onClick={() => navigate('/dashboard')} className="absolute left-4 top-3 z-20 inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-cyan-300"><ArrowLeft className="size-3.5" />Sessions</button>
      <LiveDashboard connected={connected} nodes={nodes} edges={edges} questions={questions} transcriptLines={transcriptLines} onResolveQuestion={dismissQuestion} onTranscriptFinal={sendTranscript} presenterType={presenterType} sessionId={sessionId} />
    </div>
  )
}
