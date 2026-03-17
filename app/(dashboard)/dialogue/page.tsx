'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Loader2, Trash2, X, AlertTriangle } from 'lucide-react'
import { useMirror } from '@/lib/mirror-context'
import type { ChatMessage, Belief, ContradictionResult } from '@/lib/types'

const CATEGORY_COLORS: Record<string, string> = {
  philosophy: '#ab47bc', identity: '#29b6f6', habit: '#66bb6a',
  relationships: '#ef5350', career: '#ffa726', worldview: '#7e57c2',
  ethics: '#26c6da', emotion: '#ec407a', general: '#78909c',
}

function formatAI(text: string) {
  return text.split(/(\*[^*]+\*)/).map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return <span key={i} style={{ color: 'rgba(79,195,247,0.9)', fontStyle: 'italic' }}>{part.slice(1, -1)}</span>
    }
    return <span key={i}>{part}</span>
  })
}

export default function MirrorPage() {
  const { feed, setFeed, chatHistory, setChatHistory, allBeliefs, setAllBeliefs, hasStarted, setHasStarted } = useMirror()
  const [input, setInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const [streamedText, setStreamedText] = useState('')
  const [showMemory, setShowMemory] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (allBeliefs.length === 0) {
      fetch('/api/beliefs').then(r => r.json()).then(d => setAllBeliefs(d.beliefs || []))
    }
  }, [])

  useEffect(() => {
    const pending = sessionStorage.getItem('pending_thought')
    if (pending) {
      sessionStorage.removeItem('pending_thought')
      setInput(pending)
      setTimeout(() => {
        const form = document.querySelector('form')
        if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      }, 300)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [feed, streamedText])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const thought = input.trim()
    if (!thought || processing) return

    setInput('')
    setProcessing(true)

    if (!hasStarted) {
      setHasStarted(true)
      window.dispatchEvent(new Event('mirror_started'))
    }

    const uid = Date.now().toString()
    setFeed(prev => [...prev, { type: 'user', id: uid, content: thought, timestamp: new Date().toISOString() }])

    // Extract beliefs silently
    try {
      const res = await fetch('/api/beliefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput: thought }),
      })
      const data = await res.json()
      const extracted: Belief[] = data.beliefs || []
      const contradictions: ContradictionResult[] = (data.contradictions || []).filter((c: ContradictionResult) => c.contradiction_score > 0.75)
      setAllBeliefs(prev => [...extracted, ...prev])

      if (contradictions.length > 0) {
        setFeed(prev => [...prev, {
          type: 'contradiction',
          id: uid + '_c',
          content: contradictions[0].belief_content,
          timestamp: new Date().toISOString(),
        }])
      }
    } catch {}

    // AI stream
    setStreamedText('')
    try {
      const res = await fetch('/api/dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: thought, history: chatHistory }),
      })
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let full = ''
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          full += decoder.decode(value, { stream: true })
          setStreamedText(full)
        }
      }
      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: thought, timestamp: new Date().toISOString() },
        { role: 'assistant', content: full, timestamp: new Date().toISOString() },
      ])
      setFeed(prev => [...prev, { type: 'ai', id: uid + '_ai', content: full, timestamp: new Date().toISOString() }])
    } catch {}

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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative"
      style={{ paddingLeft: hasStarted ? '80px' : '24px', transition: 'padding 0.5s ease' }}>

      {/* Memory button */}
      <AnimatePresence>
        {hasStarted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed top-5 right-6 z-30"
          >
            <button
              onClick={() => setShowMemory(!showMemory)}
              className="text-[10px] font-mono px-3 py-1.5 rounded-lg transition-all"
              style={{ color: 'rgba(107,107,138,0.5)', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(5,5,10,0.8)' }}
            >
              {allBeliefs.length} beliefs
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Memory panel */}
      <AnimatePresence>
        {showMemory && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            className="fixed top-14 right-6 w-72 rounded-2xl p-4 z-30 max-h-72 overflow-y-auto"
            style={{ background: 'rgba(6,6,12,0.98)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: 'rgba(107,107,138,0.5)' }}>Memory</span>
              <button onClick={() => setShowMemory(false)} style={{ color: 'rgba(107,107,138,0.4)' }}><X size={11} /></button>
            </div>
            {allBeliefs.length === 0 ? (
              <p className="text-[11px] font-mono" style={{ color: 'rgba(107,107,138,0.35)' }}>Empty.</p>
            ) : (
              <div className="space-y-2.5">
                {allBeliefs.map(b => (
                  <div key={b.id} className="flex items-start gap-2 group">
                    <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: CATEGORY_COLORS[b.category] }} />
                    <p className="flex-1 text-[11px] leading-relaxed" style={{ color: 'rgba(140,140,170,0.6)' }}>{b.content}</p>
                    <button onClick={() => deleteBelief(b.id)} disabled={deletingId === b.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: 'rgba(255,71,87,0.5)' }}>
                      {deletingId === b.id ? <Loader2 size={9} className="animate-spin" /> : <Trash2 size={9} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* TITLE — fades out on first message */}
      <AnimatePresence>
        {!hasStarted && (
          <motion.div
            key="title"
            initial={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30, transition: { duration: 0.6, ease: 'easeInOut' } }}
            className="text-center mb-16"
          >
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] mb-8" style={{ color: 'rgba(107,107,138,0.4)' }}>
              Reflective Cognition Engine
            </p>
            <h1 className="font-display font-light leading-none mb-5"
              style={{ fontSize: 'clamp(3.5rem,9vw,7rem)', color: '#e8e8f0' }}>
              What do you
              <br />
              <span style={{ color: '#29b6f6', textShadow: '0 0 60px rgba(41,182,246,0.35)' }}>believe?</span>
            </h1>
            <p style={{ color: 'rgba(107,107,138,0.45)', fontSize: '14px', fontFamily: 'monospace' }}>
              Write it. The mirror will answer.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FEED */}
      <AnimatePresence>
        {hasStarted && (
          <motion.div
            key="feed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            ref={feedRef}
            className="w-full max-w-2xl mb-8 space-y-8 overflow-y-auto"
            style={{
              maxHeight: 'calc(100vh - 180px)',
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 100%)',
            }}
          >
            {feed.map((item, idx) => {
              const isFarBack = idx < feed.length - 6
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: isFarBack ? 0.25 : 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  style={{ transition: 'opacity 0.8s ease' }}
                >
                  {/* User message — full width, above */}
                  {item.type === 'user' && (
                    <p
                      className="leading-relaxed"
                      style={{
                        color: 'rgba(155,155,190,0.65)',
                        fontSize: '15px',
                        fontFamily: 'var(--font-mono)',
                        paddingLeft: '2px',
                      }}
                    >
                      {item.content}
                    </p>
                  )}

                  {/* Contradiction — tiny, subtle */}
                  {item.type === 'contradiction' && (
                    <div className="flex items-start gap-2 mt-1">
                      <AlertTriangle size={9} style={{ color: 'rgba(255,71,87,0.4)', marginTop: '3px', flexShrink: 0 }} />
                      <p style={{ color: 'rgba(107,107,138,0.45)', fontSize: '11px', fontFamily: 'monospace', lineHeight: 1.6 }}>
                        You previously said: &ldquo;{item.content.length > 80 ? item.content.slice(0, 80) + '...' : item.content}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* AI message — full width, below, bigger, display font */}
                  {item.type === 'ai' && (
                    <p
                      className="leading-relaxed mt-2"
                      style={{
                        color: '#d8d8e8',
                        fontSize: '18px',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 300,
                        letterSpacing: '0.01em',
                        lineHeight: 1.8,
                      }}
                    >
                      {formatAI(item.content)}
                    </p>
                  )}
                </motion.div>
              )
            })}

            {/* Streaming AI */}
            {processing && streamedText && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  color: '#d8d8e8',
                  fontSize: '18px',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 300,
                  lineHeight: 1.8,
                  marginTop: '8px',
                }}
              >
                {formatAI(streamedText)}
              </motion.p>
            )}

            {processing && !streamedText && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1.5 items-center mt-2">
                <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: 'rgba(171,71,188,0.6)' }} />
                <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: 'rgba(171,71,188,0.6)', animationDelay: '0.15s' }} />
                <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: 'rgba(171,71,188,0.6)', animationDelay: '0.3s' }} />
              </motion.div>
            )}

            <div ref={bottomRef} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* INPUT — same as landing */}
      <div className="w-full max-w-2xl" style={{ marginTop: hasStarted ? 0 : 0 }}>
        <form onSubmit={handleSubmit}>
          <div className="relative group">
            <div className="absolute inset-0 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"
              style={{ background: 'radial-gradient(ellipse, rgba(41,182,246,0.07) 0%, transparent 70%)', filter: 'blur(30px)', zIndex: -1 }} />
            <div className="relative rounded-2xl transition-all duration-300 group-focus-within:border-white/10"
              style={{ background: 'rgba(8,8,14,0.97)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={processing}
                placeholder={hasStarted ? 'Continue...' : 'Write a thought, a conviction, a doubt...'}
                rows={hasStarted ? 2 : 3}
                className="w-full bg-transparent px-6 pt-5 pb-2 font-mono resize-none outline-none leading-relaxed"
                style={{
                  color: '#e8e8f0',
                  fontSize: '15px',
                  caretColor: '#4fc3f7',
                  minHeight: hasStarted ? '72px' : '100px',
                  maxHeight: '200px',
                }}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement
                  t.style.height = 'auto'
                  t.style.height = Math.min(t.scrollHeight, 200) + 'px'
                }}
              />
              <style>{`textarea::placeholder { color: rgba(107,107,138,0.45) !important; }`}</style>
              <div className="flex items-center justify-between px-5 pb-4">
                <span style={{ color: 'rgba(107,107,138,0.3)', fontSize: '10px', fontFamily: 'monospace' }}>
                  Enter to {hasStarted ? 'send' : 'begin'}
                </span>
                <button type="submit" disabled={!input.trim() || processing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all disabled:opacity-20"
                  style={{ background: 'rgba(41,182,246,0.08)', border: '1px solid rgba(41,182,246,0.18)', color: '#4fc3f7', fontFamily: 'monospace', fontSize: '12px' }}>
                  {processing ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
