import { Dashboard } from '@/components/attune/dashboard'
import { useAttuneSocket } from '@/hooks/useAttuneSocket'

function App() {
  const { connected, nodes, edges, questions, transcriptLines, dismissQuestion } = useAttuneSocket()

  return (
    <Dashboard
      connected={connected}
      nodes={nodes}
      edges={edges}
      questions={questions}
      transcriptLines={transcriptLines}
      onResolveQuestion={dismissQuestion}
    />
  )
}

export default App
