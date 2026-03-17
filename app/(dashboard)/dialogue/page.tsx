'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Brain, User, AlertTriangle, Trash2, X } from 'lucide-react'
import type { ChatMessage, Belief, ContradictionResult } from '@/lib/types'

const CATEGORY_COLORS: Record<string, string> = {
  philosophy: '#ab47bc',
  identity: '#29b6f6',
  habit: '#66bb6a',
  relationships: '#ef5350',
  career: '#ffa726',
  worldview: '#7e57c2',
  ethics: '#26c6da',
  emotion: '#ec407a',
  general: '#78909c',
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
  const parts = text.split(/(\*[^*]+\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="text-electric not-italic">{part.slice(1, -1)}</em>
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
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/api/beliefs')
      .then((r) => r.json())
      .then((d) => setAllBeliefs(d.beliefs || []))
  }, [])

  // Pick up pending thought from landing page
  useEffect(() => {
    const pending = sessionStorage.getItem('pending_thought')
    if (pending) {
      sessionStorage.removeItem('pending_thought')
      setInput(pending)
      setTimeout(() => inputRef.current?.focus(), 100)
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

    const userItem: FeedItem = {
      type: 'user_thought',
      id: Date.now().toString(),
      content: thought,
      timestamp: new Date().toISOString(),
    }
    setFeed((prev) => [...prev, userItem])

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
      detectedContradictions = data.contradictions || []
      setAllBeliefs((prev) => [...extractedBeliefs, ...prev])

      // Only show note if there's a contradiction
      if (detectedContradictions.length > 0) {
        const noteItem: FeedItem = {
          type: 'belief_note',
          id: Date.now().toString() + '_n',
          timestamp: new Date().toISOString(),
          beliefs: extractedBeliefs,
          contradictions: detectedContradictions,
        }
        setFeed((prev) => [...prev, noteItem])
      }
    } catch (e) {
      console.error(e)
    }

    // AI response
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

      const aiMsg: ChatMessage = { role: 'assistant', content: fullText, timestamp: new Date().toISOString() }
      const userMsg: ChatMessage = { role: 'user', content: thought, timestamp: new Date().toISOString() }
      setChatHistory((prev) => [...prev, userMsg, aiMsg])

      setFeed((prev) => [...prev, {
        type: 'ai_response',
        id: Date.now().toString() + '_ai',
        content: fullText,
        timestamp: new Date().toISOString(),
      }])
    } catch (e) {
      console.error(e)
    }

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
    setAllBeliefs((prev) => prev.filter((b) => b.id !== id))
    setDeletingId(null)
  }, [])

  return (
    <div className="max-w-2xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-1 h-1 rounded-full bg-electric animate-pulse-slow" />
            <span className="text-electric text-[10px] font-mono uppercase tracking-widest">Mirror · Active</span>
          </div>
          <h1 className="font-display text-3xl text-bright font-light">The Mirror</h1>
        </div>
        <button
          onClick={() => setShowMemory(!showMemory)}
          className="text-ghost hover:text-pale text-xs font-mono transition-colors border border-border/30 hover:border-electric/20 px-3 py-1.5 rounded-lg"
        >
          {allBeliefs.length} beliefs
        </button>
      </motion.div>

      {/* Memory panel */}
      <AnimatePresence>
        {showMemory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="shrink-0 mb-4 overflow-hidden"
          >
            <div className="glass rounded-xl p-4 max-h-52 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <span className="text-pale text-xs font-mono uppercase tracking-widest">Mapped beliefs</span>
                <button onClick={() => setShowMemory(false)} className="text-ghost hover:text-pale">
                  <X size={12} />
                </button>
              </div>
              {allBeliefs.length === 0 ? (
                <p className="text-ghost text-xs font-mono">Nothing mapped yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {allBeliefs.map((b) => (
                    <div key={b.id} className="flex items-start gap-2 group">
                      <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: CATEGORY_COLORS[b.category] }} />
                      <p className="flex-1 text-dim text-xs leading-relaxed">{b.content}</p>
                      <button
                        onClick={() => deleteBelief(b.id)}
                        disabled={deletingId === b.id}
                        className="opacity-0 group-hover:opacity-100 text-ghost hover:text-contradiction transition-all shrink-0"
                      >
                        {deletingId === b.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto space-y-5 pb-4 pr-1">
        {feed.length === 0 && !processing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <div className="w-12 h-12 rounded-full animated-border p-[1.5px] mb-5">
              <div className="w-full h-full rounded-full bg-void flex items-center justify-center">
                <Brain size={18} className="text-electric" />
              </div>
            </div>
            <p className="font-display text-2xl text-bright mb-2">Speak.</p>
            <p className="text-ghost text-xs font-mono max-w-xs leading-relaxed opacity-70">
              Write what you think. The mirror has no mercy, no comfort — only clarity.
            </p>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {feed.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* User */}
              {item.type === 'user_thought' && (
                <div className="flex gap-2.5 justify-end">
                  <div className="max-w-[78%] rounded-xl px-4 py-3"
                    style={{ background: 'rgba(41,182,246,0.06)', border: '1px solid rgba(41,182,246,0.1)' }}>
                    <p className="text-pale text-sm leading-relaxed">{item.content}</p>
                  </div>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1"
                    style={{ background: 'rgba(41,182,246,0.08)', border: '1px solid rgba(41,182,246,0.15)' }}>
                    <User size={11} className="text-electric" />
                  </div>
                </div>
              )}

              {/* Contradiction note — minimal */}
              {item.type === 'belief_note' && item.contradictions && item.contradictions.length > 0 && (
                <div className="flex items-start gap-2 px-2">
                  <AlertTriangle size={11} className="text-contradiction/60 mt-0.5 shrink-0" />
                  <div>
                    {item.contradictions.slice(0, 1).map((c) => (
                      <p key={c.belief_id} className="text-[11px] text-ghost/70 font-mono leading-relaxed">
                        Contradicts: &ldquo;{c.belief_content.length > 80 ? c.belief_content.slice(0, 80) + '...' : c.belief_content}&rdquo;
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* AI */}
              {item.type === 'ai_response' && (
                <div className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1"
                    style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(171,71,188,0.25)' }}>
                    <Brain size={11} className="text-violet-bright" />
                  </div>
                  <div className="max-w-[85%] rounded-xl px-4 py-3"
                    style={{ background: 'rgba(13,13,20,0.7)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <p className="text-soft text-sm leading-relaxed">{formatContent(item.content || '')}</p>
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
              style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(171,71,188,0.25)' }}>
              <Brain size={11} className="text-violet-bright" />
            </div>
            <div className="max-w-[85%] rounded-xl px-4 py-3"
              style={{ background: 'rgba(13,13,20,0.7)', border: '1px solid rgba(255,255,255,0.04)' }}>
              {streamedText ? (
                <p className="text-soft text-sm leading-relaxed cursor-blink">{formatContent(streamedText)}</p>
              ) : (
                <Loader2 size={12} className="text-violet-bright/50 animate-spin" />
              )}
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 pt-3 border-t border-white/4">
        <form onSubmit={handleSubmit} className="flex gap-2.5 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What do you believe..."
            disabled={processing}
            rows={1}
            className="flex-1 rounded-xl px-4 py-3 text-sm resize-none font-mono outline-none text-pale placeholder-ghost/25 leading-relaxed"
            style={{
              maxHeight: '120px',
              background: 'rgba(8,8,14,0.9)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(41,182,246,0.2)' }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.05)' }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 120) + 'px'
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || processing}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 disabled:opacity-20"
            style={{ background: 'rgba(41,182,246,0.1)', border: '1px solid rgba(41,182,246,0.15)' }}
          >
            {processing ? <Loader2 size={13} className="animate-spin text-electric" /> : <Send size={13} className="text-electric" />}
          </button>
        </form>
      </div>
    </div>
  )
}
