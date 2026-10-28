import { useState, type FormEvent } from 'react'
import { Send, Wifi, WifiOff } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useAttuneSocket } from '@/hooks/useAttuneSocket'

export function AttendeeView() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { connected, questions, sendQuestion } = useAttuneSocket(sessionId ?? 'demo_session_1')
  const [question, setQuestion] = useState('')
  const [message, setMessage] = useState('')

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!sendQuestion(question)) {
      setMessage('Connection is not ready. Please try again in a moment.')
      return
    }
    setQuestion('')
    setMessage('Question submitted to Attune.')
  }

  return (
    <main className="min-h-dvh bg-zinc-950 text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/90 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between"><div><p className="text-lg font-semibold">Attune</p><p className="text-xs text-zinc-500">Live audience view</p></div><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${connected ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>{connected ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}{connected ? 'Connected' : 'Connecting'}</span></div>
      </header>
      <section className="mx-auto flex min-h-[calc(100dvh-73px)] max-w-lg flex-col px-5 py-6">
        <div><p className="text-xs font-medium tracking-widest text-cyan-300">LIVE SESSION</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Questions from the room</h1><p className="mt-2 text-sm leading-relaxed text-zinc-400">Ask what is on your mind. Attune routes high-priority questions to the presenter.</p></div>
        <ul className="mt-6 flex flex-1 flex-col gap-3 pb-28">
          {questions.length === 0 ? <li className="rounded-2xl border border-dashed border-white/15 p-5 text-center text-sm text-zinc-500">No routed questions yet. Be the first to ask.</li> : questions.map((item) => <li key={item.id} className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs text-zinc-500">{item.student}</span><span className="rounded-full bg-cyan-400/10 px-2 py-1 text-xs font-medium text-cyan-200">Priority {item.priority}</span></div><p className="mt-3 text-sm leading-relaxed text-zinc-100">{item.question}</p><p className="mt-3 rounded-xl bg-cyan-400/5 p-3 text-sm text-zinc-300">{item.studentResponse}</p></li>)}
        </ul>
        <form onSubmit={submitQuestion} className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-zinc-950/95 p-4 backdrop-blur-xl"><div className="mx-auto max-w-lg"><label className="sr-only" htmlFor="attendee-question">Ask a question</label><div className="flex gap-2"><input id="attendee-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask the presenter a question…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm outline-none placeholder:text-zinc-600 focus:border-cyan-400" /><button disabled={!question.trim() || !connected} className="grid size-11 place-items-center rounded-xl bg-cyan-400 text-zinc-950 disabled:opacity-40" aria-label="Submit question"><Send className="size-4" /></button></div>{message && <p className="mt-2 text-xs text-cyan-300">{message}</p>}</div></form>
      </section>
    </main>
  )
}
