'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase-client'
import { ArrowRight } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthed(!!user)
      setChecking(false)
    })
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    if (authed) {
      // Store thought and go to mirror
      sessionStorage.setItem('pending_thought', input.trim())
      router.push('/dialogue')
    } else {
      sessionStorage.setItem('pending_thought', input.trim())
      router.push('/signup')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  if (checking) return null

  return (
    <main className="min-h-screen bg-void flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(41,182,246,0.04) 0%, transparent 70%)' }} />
        <div className="absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(rgba(79,195,247,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(79,195,247,0.02) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="text-center mb-16"
        >
          <p className="text-ghost text-xs font-mono uppercase tracking-[0.3em] mb-6">
            Reflective Cognition Engine
          </p>
          <h1 className="font-display text-6xl md:text-8xl text-bright font-light leading-none mb-4">
            What do you
            <br />
            <span style={{ color: '#29b6f6', textShadow: '0 0 40px rgba(41,182,246,0.3)' }}>
              believe?
            </span>
          </h1>
          <p className="text-ghost text-sm font-mono mt-6 opacity-60">
            Write it. The mirror will answer.
          </p>
        </motion.div>

        {/* The search bar */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
        >
          <div className="relative group">
            {/* Glow behind input */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"
              style={{ background: 'radial-gradient(ellipse at center, rgba(41,182,246,0.08) 0%, transparent 70%)', filter: 'blur(20px)' }} />

            <div className="relative flex items-end gap-0 rounded-2xl border border-white/5 group-focus-within:border-electric/20 transition-all duration-500"
              style={{ background: 'rgba(8,8,14,0.95)' }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="A thought. A conviction. A doubt."
                rows={3}
                autoFocus
                className="flex-1 bg-transparent px-6 py-5 text-bright text-base font-mono resize-none outline-none placeholder-ghost/25 leading-relaxed"
                style={{ minHeight: '100px', maxHeight: '240px' }}
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement
                  t.style.height = 'auto'
                  t.style.height = Math.min(t.scrollHeight, 240) + 'px'
                }}
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="m-3 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-20"
                style={{ background: input.trim() ? 'rgba(41,182,246,0.15)' : 'transparent', border: '1px solid rgba(41,182,246,0.2)' }}
              >
                <ArrowRight size={16} className="text-electric" />
              </button>
            </div>
          </div>

          <div className="flex justify-between mt-3 px-1">
            <span className="text-ghost/40 text-[10px] font-mono">Enter to continue</span>
            {!authed && (
              <span className="text-ghost/40 text-[10px] font-mono">
                Already mapped?{' '}
                <button type="button" onClick={() => router.push('/login')} className="text-electric/60 hover:text-electric transition-colors">
                  sign in
                </button>
              </span>
            )}
          </div>
        </motion.form>
      </div>
    </main>
  )
}
