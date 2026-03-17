'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Send, Loader2, Brain, User, Trash2 } from 'lucide-react'
import type { ChatMessage } from '@/lib/types'

function formatContent(text: string) {
  // Render *italic* for probing questions
  const parts = text.split(/(\*[^*]+\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} className="text-electric not-italic font-medium">
          {part.slice(1, -1)}
        </em>
      )
    }
    return <span key={i}>{part}</span>
  })
}

const PROMPTS = [
  'What do I actually believe about discipline?',
  'Am I being consistent across my beliefs?',
  'What patterns do you see in my thinking?',
  'Challenge my most confident belief.',
  'What am I avoiding thinking about?',
]

export default function DialoguePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamedText])

  const sendMessage = async (content: string) => {
    if (!content.trim() || streaming) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setStreaming(true)
    setStreamedText('')

    try {
      const res = await fetch('/api/dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content.trim(),
          history: messages,
        }),
      })

      if (!res.ok) throw new Error('Failed to get response')

      const reader = res.body?.getReader()
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

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: fullText,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: 'The mirror is offline. Check your API key and try again.',
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMsg])
    }

    setStreamedText('')
    setStreaming(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const clearConversation = () => {
    setMessages([])
    setStreamedText('')
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 6rem)' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-end justify-between"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={14} className="text-electric" />
            <span className="text-electric text-xs font-mono uppercase tracking-widest">
              Cognitive Mirror
            </span>
          </div>
          <h1 className="font-display text-4xl text-bright font-light">The Mirror</h1>
          <p className="text-dim text-sm mt-1">
            It has read all your beliefs. It will not flatter you.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearConversation}
            className="flex items-center gap-2 text-ghost hover:text-contradiction text-xs font-mono transition-colors px-3 py-2 rounded-lg border border-border/30 hover:border-contradiction/30"
          >
            <Trash2 size={12} />
            Clear
          </button>
        )}
      </motion.div>

      {/* Chat container */}
      <div className="flex-1 glass rounded-2xl flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && !streaming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center"
            >
              <div className="w-16 h-16 rounded-full animated-border p-[1.5px] mb-5">
                <div className="w-full h-full rounded-full bg-void flex items-center justify-center">
                  <Brain size={28} className="text-electric" />
                </div>
              </div>
              <p className="font-display text-2xl text-bright mb-2">The Mirror Awaits</p>
              <p className="text-dim text-sm max-w-sm leading-relaxed">
                Ask anything. It will answer from the depths of your recorded belief system,
                pointing to what you said, not what you wish you believed.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    className="btn-ghost px-3 py-1.5 rounded-lg text-xs font-mono text-left"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user'
                      ? 'bg-electric/15 border border-electric/25'
                      : 'bg-void border border-violet-glow/30'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User size={14} className="text-electric" />
                  ) : (
                    <Brain size={14} className="text-violet-bright" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-electric/10 border border-electric/15 text-pale'
                      : 'bg-surface/60 border border-border/30 text-soft'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{formatContent(msg.content)}</p>
                  <span className="text-ghost text-[9px] font-mono mt-1 block">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Streaming response */}
          {streaming && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-void border border-violet-glow/30 flex items-center justify-center shrink-0">
                <Brain size={14} className="text-violet-bright" />
              </div>
              <div className="max-w-[80%] rounded-xl px-4 py-3 bg-surface/60 border border-border/30 text-soft">
                {streamedText ? (
                  <p className="text-sm leading-relaxed cursor-blink">
                    {formatContent(streamedText)}
                  </p>
                ) : (
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="text-violet-bright animate-spin" />
                    <span className="text-dim text-xs font-mono">Searching your beliefs...</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-border/30 p-4">
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Speak to the mirror..."
              disabled={streaming}
              className="flex-1 rce-input rounded-xl px-4 py-3 text-sm resize-none font-mono"
              rows={1}
              style={{ maxHeight: '120px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || streaming}
              className="btn-primary w-10 h-10 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {streaming ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
          <p className="text-ghost text-[10px] font-mono mt-2">
            Enter to send · Shift+Enter for newline
          </p>
        </div>
      </div>
    </div>
  )
}
