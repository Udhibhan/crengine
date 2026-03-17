'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Brain, User, AlertTriangle, Sparkles } from 'lucide-react'
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
  type: 'user_thought' | 'ai_response' | 'contradiction' | 'beliefs_extracted'
  id: string
  content?: string
  timestamp: string
  beliefs?: Belief[]
  contradictions?: ContradictionResult[]
  streaming?: boolean
}

function formatContent(text: string) {
  const parts = text.split(/(\*[^*]+\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="text-electric not-italic font-medium">{part.slice(1, -1)}</em>
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
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

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

    // Step 1: Extract beliefs + detect contradictions
    let extractedBeliefs: Belief[] = []
    let detectedContradictions: ContradictionResult[] = []

    try {
      const beliefsRes = await fetch('/api/beliefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput: thought }),
      })
      const beliefsData = await beliefsRes.json()
      extractedBeliefs = beliefsData.beliefs || []
      detectedContradictions = beliefsData.contradictions || []

      if (extractedBeliefs.length > 0) {
        const beliefsItem: FeedItem = {
          type: 'beliefs_extracted',
          id: Date.now().toString() + '_b',
          timestamp: new Date().toISOString(),
          beliefs: extractedBeliefs,
          contradictions: detectedContradictions,
        }
        setFeed((prev) => [...prev, beliefsItem])
      }
    } catch (e) {
      console.error('Belief extraction failed:', e)
    }

    // Step 2: Get AI mirror response
    const userMessage: ChatMessage = {
      role: 'user',
      content: thought,
      timestamp: new Date().toISOString(),
    }
    const updatedHistory = [...chatHistory, userMessage]

    setStreamedText('')

    try {
      const dialogueRes = await fetch('/api/dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: thought, history: chatHistory }),
      })

      const reader = dialogueRes.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          fullText += chunk
          setStreamedText(fullText)
        }
      }

      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: fullText,
        timestamp: new Date().toISOString(),
      }
      setChatHistory([...updatedHistory, aiMessage])

      const aiItem: FeedItem = {
        type: 'ai_response',
        id: Date.now().toString() + '_ai',
        content: fullText,
        timestamp: new Date().toISOString(),
      }
      setFeed((prev) => [...prev, aiItem])
    } catch (e) {
      console.error('Dialogue failed:', e)
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

  return (
    <div className="max-w-2xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-electric animate-pulse-slow" />
          <span className="text-electric text-xs font-mono uppercase tracking-widest">Mirror · Active</span>
        </div>
        <h1 className="font-display text-4xl text-bright font-light">The Mirror</h1>
        <p className="text-ghost text-xs font-mono mt-1">
          Write what you think. The engine maps it, checks it against you, and speaks back.
        </p>
      </motion.div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
        {feed.length === 0 && !processing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <div className="w-14 h-14 rounded-full animated-border p-[1.5px] mb-4">
              <div className="w-full h-full rounded-full bg-void flex items-center justify-center">
                <Brain size={22} className="text-electric" />
              </div>
            </div>
            <p className="font-display text-xl text-bright mb-2">Begin</p>
            <p className="text-ghost text-xs font-mono max-w-xs leading-relaxed">
              Write a thought. Any thought. The engine will extract your beliefs,
              detect contradictions, and respond.
            </p>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {feed.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* User thought */}
              {item.type === 'user_thought' && (
                <div className="flex gap-3 justify-end">
                  <div className="max-w-[80%] rounded-xl px-4 py-3 bg-electric/8 border border-electric/12">
                    <p className="text-pale text-sm leading-relaxed">{item.content}</p>
                    <span className="text-ghost text-[9px] font-mono mt-1 block">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-electric/10 border border-electric/20 flex items-center justify-center shrink-0 mt-1">
                    <User size={12} className="text-electric" />
                  </div>
                </div>
              )}

              {/* Beliefs extracted + contradictions */}
              {item.type === 'beliefs_extracted' && item.beliefs && item.beliefs.length > 0 && (
                <div className="ml-2 space-y-2">
                  {/* Extracted beliefs */}
                  <div className="flex items-start gap-2">
                    <div className="w-px h-full bg-border/40 self-stretch mx-3" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={10} className="text-electric/50" />
                        <span className="text-[9px] font-mono text-electric/50 uppercase tracking-widest">
                          {item.beliefs.length} belief{item.beliefs.length !== 1 ? 's' : ''} mapped
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.beliefs.map((b) => (
                          <span
                            key={b.id}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                            style={{
                              color: CATEGORY_COLORS[b.category],
                              borderColor: CATEGORY_COLORS[b.category] + '30',
                              background: CATEGORY_COLORS[b.category] + '10',
                            }}
                          >
                            {b.category}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Contradictions */}
                  {item.contradictions && item.contradictions.length > 0 && (
                    <div className="ml-2 p-3 rounded-lg border border-contradiction/20 bg-contradiction/5">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={11} className="text-contradiction" />
                        <span className="text-[9px] font-mono text-contradiction uppercase tracking-widest">
                          You contradict yourself
                        </span>
                      </div>
                      {item.contradictions.map((c) => (
                        <div key={c.belief_id} className="text-xs">
                          <p className="text-pale/70 mb-0.5">
                            You previously said: &ldquo;{c.belief_content}&rdquo;
                          </p>
                          <p className="text-dim italic text-[11px]">{c.explanation}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* AI response */}
              {item.type === 'ai_response' && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-void border border-violet-glow/30 flex items-center justify-center shrink-0 mt-1">
                    <Brain size={12} className="text-violet-bright" />
                  </div>
                  <div className="max-w-[85%] rounded-xl px-4 py-3 bg-surface/40 border border-border/30">
                    <p className="text-soft text-sm leading-relaxed">{formatContent(item.content || '')}</p>
                    <span className="text-ghost text-[9px] font-mono mt-1 block">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Streaming */}
        {processing && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-void border border-violet-glow/30 flex items-center justify-center shrink-0 mt-1">
              <Brain size={12} className="text-violet-bright" />
            </div>
            <div className="max-w-[85%] rounded-xl px-4 py-3 bg-surface/40 border border-border/30">
              {streamedText ? (
                <p className="text-soft text-sm leading-relaxed cursor-blink">{formatContent(streamedText)}</p>
              ) : (
                <div className="flex items-center gap-2">
                  <Loader2 size={12} className="text-violet-bright animate-spin" />
                  <span className="text-ghost text-xs font-mono">Mapping your belief...</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 pt-4 border-t border-border/30">
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What do you believe..."
            disabled={processing}
            rows={1}
            className="flex-1 rce-input rounded-xl px-4 py-3 text-sm resize-none font-mono"
            style={{ maxHeight: '120px' }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 120) + 'px'
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || processing}
            className="btn-primary w-10 h-10 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40"
          >
            {processing ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </form>
        <p className="text-ghost text-[10px] font-mono mt-2">Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  )
}
