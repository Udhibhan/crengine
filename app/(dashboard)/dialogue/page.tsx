'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Loader2, Brain, User, AlertTriangle, Trash2, X } from 'lucide-react'
import type { ChatMessage, Belief, ContradictionResult } from '@/lib/types'

const CATEGORY_COLORS: Record<string, string> = {
  philosophy: '#ab47bc', identity: '#29b6f6', habit: '#66bb6a',
  relationships: '#ef5350', career: '#ffa726', worldview: '#7e57c2',
  ethics: '#26c6da', emotion: '#ec407a', general: '#78909c',
}

interface FeedItem {
  type: 'user_thought' | 'ai_response' | 'belief_note'
  id: string
  content?: string
  timestamp: string
  beliefs?: Belief[]
  contradictions?: ContradictionResult[]
}

function formatContent(text: string) {
  return text.split(/(\*[^*]+\*)/).map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="not-italic" style={{ color: '#4fc3f7' }}>{part.slice(1, -1)}</em>
    }
    return <span key={i}>{part}</span>
  })
}

export default function MirrorPage() {
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [input, setInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const [streamedText, setStreamedText] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [allBeliefs, setAllBeliefs] = useState<Belief[]>([])
  const [showMemory, setShowMemory] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/api/beliefs').then(r => r.json()).then(d => setAllBeliefs(d.beliefs || []))
  }, [])

  useEffect(() => {
    const pending = sessionStorage.getItem('pending_thought')
    if (pending) {
      sessionStorage.removeItem('pending_thought')
      setInput(pending)
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [feed, streamedText])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || processing) return

    const thought = input.trim()
    setInput('')
    setProcessing(true)
    setStarted(true)

    setFeed(prev => [...prev, {
      type: 'user_thought',
      id: Date.now().toString(),
      content: thought,
      timestamp: new Date().toISOString(),
    }])

    // Extract beliefs silently
    let extractedBeliefs: Belief[] = []
    let detectedContradictions: ContradictionResult[] = []
    try {
      const res = await fetch('/api/beliefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput: thought }),
      })
      const data = await res.json()
      extractedBeliefs = data.beliefs || []
      detectedContradictions = (data.contradictions || []).filter((c: ContradictionResult) => c.contradiction_score > 0.75)
      setAllBeliefs(prev => [...extractedBeliefs, ...prev])

      if (detectedContradictions.length > 0) {
        setFeed(prev => [...prev, {
          type: 'belief_note',
          id: Date.now().toString() + '_n',
          timestamp: new Date().toISOString(),
          beliefs: extractedBeliefs,
          contradictions: detectedContradictions,
        }])
      }
    } catch (e) { console.error(e) }

    // AI response stream
    setStreamedText('')
    try {
      const res = await fetch('/api/dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: thought, history: chatHistory }),
      })
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullText += decoder.decode(value, { stream: true })
          setStreamedText(fullText)
        }
      }
      const userMsg: ChatMessage = { role: 'user', content: thought, timestamp: new Date().toISOString() }
      const aiMsg: ChatMessage = { role: 'assistant', content: fullText, timestamp: new Date().toISOString() }
      setChatHistory(prev => [...prev, userMsg, aiMsg])
      setFeed(prev => [...prev, {
        type: 'ai_response',
        id: Date.now().toString() + '_ai',
        content: fullText,
        timestamp: new Date().toISOString(),
      }])
    } catch (e) { console.error(e) }

    setStreamedText('')
    setProcessing(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const deleteBelief = useCallback(async (id: string) => {
    setDeletingId(id)
    await fetch('/api/beliefs/' + id, { method: 'DELETE' })
    setAllBeliefs(prev => prev.filter(b => b.id !== id))
    setDeletingId(null)
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-12 relative">

      {/* Memory button — top right */}
      <div className="fixed top-5 right-6 z-20">
        <button
          onClick={() => setShowMemory(!showMemory)}
          className="text-[11px] font-mono transition-all duration-200 px-3 py-1.5 rounded-lg"
          style={{
            color: 'rgba(107,107,138,0.7)',
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(5,5,10,0.8)'
          }}
        >
          {allBeliefs.length} beliefs mapped
        </button>
      </div>

      {/* Memory panel */}
      <AnimatePresence>
        {showMemory && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-14 right-6 w-80 rounded-2xl p-4 z-20 max-h-80 overflow-y-auto"
            style={{ background: 'rgba(8,8,14,0.98)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(107,107,138,0.7)' }}>
                Mapped Beliefs
              </span>
              <button onClick={() => setShowMemory(false)} style={{ color: 'rgba(107,107,138,0.5)' }}>
                <X size={12} />
              </button>
            </div>
            {allBeliefs.length === 0 ? (
              <p className="text-xs font-mono" style={{ color: 'rgba(107,107,138,0.4)' }}>Nothing mapped yet.</p>
            ) : (
              <div className="space-y-2">
                {allBeliefs.map(b => (
                  <div key={b.id} className="flex items-start gap-2 group">
                    <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: CATEGORY_COLORS[b.category] }} />
                    <p className="flex-1 text-xs leading-relaxed" style={{ color: 'rgba(155,155,185,0.7)' }}>{b.content}</p>
                    <button
                      onClick={() => deleteBelief(b.id)}
                      disabled={deletingId === b.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      style={{ color: 'rgba(255,71,87,0.6)' }}
                    >
                      {deletingId === b.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state — looks like landing */}
      {!started && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex flex-col items-center text-center mb-16 mt-8"
        >
          <p className="text-xs font-mono uppercase tracking-[0.3em] mb-8" style={{ color: 'rgba(107,107,138,0.4)' }}>
            Reflective Cognition Engine
          </p>
          <h1 className="font-display font-light leading-none mb-4" style={{ fontSize: 'clamp(3rem,8vw,6rem)', color: '#e8e8f0' }}>
            What do you
            <br />
            <span style={{ color: '#29b6f6', textShadow: '0 0 50px rgba(41,182,246,0.35)' }}>believe?</span>
          </h1>
          <p className="text-sm font-light" style={{ color: 'rgba(107,107,138,0.5)' }}>
            Write it. The mirror will answer.
          </p>
        </motion.div>
      )}

      {/* Feed */}
      {started && (
        <div className="w-full max-w-2xl space-y-5 mb-8">
          <AnimatePresence initial={false}>
            {feed.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* User */}
                {item.type === 'user_thought' && (
                  <div className="flex gap-2.5 justify-end">
                    <div className="max-w-[78%] rounded-2xl px-5 py-3.5"
                      style={{ background: 'rgba(41,182,246,0.06)', border: '1px solid rgba(41,182,246,0.1)' }}>
                      <p className="text-sm leading-relaxed" style={{ color: '#c4c4d8' }}>{item.content}</p>
                    </div>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1"
                      style={{ background: 'rgba(41,182,246,0.08)', border: '1px solid rgba(41,182,246,0.15)' }}>
                      <User size={11} style={{ color: '#4fc3f7' }} />
                    </div>
                  </div>
                )}

                {/* Contradiction note */}
                {item.type === 'belief_note' && item.contradictions && item.contradictions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-2 px-1"
                  >
                    <AlertTriangle size={10} className="mt-0.5 shrink-0" style={{ color: 'rgba(255,71,87,0.5)' }} />
                    <p className="text-[11px] font-mono leading-relaxed" style={{ color: 'rgba(107,107,138,0.6)' }}>
                      Contradicts what you said:{' '}
                      <span style={{ color: 'rgba(155,155,185,0.6)' }}>
                        &ldquo;{item.contradictions[0].belief_content.length > 70
                          ? item.contradictions[0].belief_content.slice(0, 70) + '...'
                          : item.contradictions[0].belief_content}&rdquo;
                      </span>
                    </p>
                  </motion.div>
                )}

                {/* AI */}
                {item.type === 'ai_response' && (
                  <div className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1"
                      style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(171,71,188,0.2)' }}>
                      <Brain size={11} style={{ color: '#ce93d8' }} />
                    </div>
                    <div className="max-w-[85%] rounded-2xl px-5 py-4"
                      style={{ background: 'rgba(10,10,16,0.8)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <p className="text-sm leading-relaxed" style={{ color: '#b0b0cc' }}>
                        {formatContent(item.content || '')}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Streaming */}
          {processing && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1"
                style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(171,71,188,0.2)' }}>
                <Brain size={11} style={{ color: '#ce93d8' }} />
              </div>
              <div className="max-w-[85%] rounded-2xl px-5 py-4"
                style={{ background: 'rgba(10,10,16,0.8)', border: '1px solid rgba(255,255,255,0.04)' }}>
                {streamedText ? (
                  <p className="text-sm leading-relaxed cursor-blink" style={{ color: '#b0b0cc' }}>
                    {formatContent(streamedText)}
                  </p>
                ) : (
                  <div className="flex gap-1.5 items-center">
                    <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: '#ce93d8' }} />
                    <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: '#ce93d8', animationDelay: '0.2s' }} />
                    <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: '#ce93d8', animationDelay: '0.4s' }} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input — same style as landing, sticky at bottom */}
      <div className={`w-full max-w-2xl ${started ? 'sticky bottom-6' : ''}`}>
        <form onSubmit={handleSubmit}>
          <div className="relative group">
            <div className="absolute inset-0 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"
              style={{ background: 'radial-gradient(ellipse, rgba(41,182,246,0.08) 0%, transparent 70%)', filter: 'blur(30px)' }} />
            <div
              className="relative rounded-2xl transition-all duration-300"
              style={{ background: 'rgba(8,8,14,0.97)', border: '1px solid rgba(255,255,255,0.08)' }}
              onFocus={() => {}}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={started ? 'Continue...' : 'Write a thought, a conviction, a doubt...'}
                disabled={processing}
                rows={started ? 2 : 3}
                className="w-full bg-transparent px-6 pt-5 pb-2 text-base font-mono resize-none outline-none leading-relaxed"
                style={{
                  color: '#e8e8f0',
                  caretColor: '#4fc3f7',
                  minHeight: started ? '70px' : '100px',
                  maxHeight: '200px',
                }}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement
                  t.style.height = 'auto'
                  t.style.height = Math.min(t.scrollHeight, 200) + 'px'
                }}
              />
              <style>{`textarea::placeholder { color: rgba(107,107,138,0.4); }`}</style>
              <div className="flex items-center justify-between px-5 pb-4">
                <span className="text-[10px] font-mono" style={{ color: 'rgba(107,107,138,0.35)' }}>
                  {started ? 'Enter to send' : 'Enter to begin'}
                </span>
                <button
                  type="submit"
                  disabled={!input.trim() || processing}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-20"
                  style={{ background: 'rgba(41,182,246,0.1)', border: '1px solid rgba(41,182,246,0.2)', color: '#4fc3f7' }}
                >
                  {processing ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
