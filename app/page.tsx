'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase-client'
import { ArrowRight, Brain, GitBranch, Network, Lightbulb, Eye, Zap } from 'lucide-react'
import Link from 'next/link'

const features = [
  { icon: Brain, title: 'Belief Extraction', description: 'Write freely. Every conviction buried in your words is extracted, categorized, and scored.' },
  { icon: GitBranch, title: 'Self-Contradiction Engine', description: 'Every new thought is compared against your history. Where you contradict yourself — it shows.' },
  { icon: Network, title: 'Belief Map', description: 'Your mind becomes a living graph. Watch clusters form, conflict, and evolve over time.' },
  { icon: Eye, title: 'The Mirror', description: 'An intelligence that does not comfort. It reflects what you actually believe, not what you wish.' },
  { icon: Lightbulb, title: 'Pattern Recognition', description: 'Bias, blind spots, cognitive dissonance — detected from your own words, not a questionnaire.' },
  { icon: Zap, title: 'Action Engine', description: 'From your belief patterns, a precise behavioral prescription. Not advice. A diagnosis.' },
]

export default function LandingPage() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // Already logged in — go straight to mirror
        router.replace('/dialogue')
      } else {
        setAuthed(false)
        setChecking(false)
      }
    })
  }, [router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    sessionStorage.setItem('pending_thought', input.trim())
    router.push('/signup')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  if (checking) return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="w-1.5 h-1.5 rounded-full animate-pulse-slow" style={{ background: '#29b6f6', boxShadow: '0 0 10px rgba(41,182,246,0.8)' }} />
    </div>
  )

  return (
    <main className="min-h-screen bg-void relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[600px]"
          style={{ background: 'radial-gradient(ellipse, rgba(41,182,246,0.05) 0%, transparent 65%)' }} />
        <div className="absolute bottom-0 right-0 w-[600px] h-[500px]"
          style={{ background: 'radial-gradient(ellipse at bottom right, rgba(171,71,188,0.06) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 opacity-25"
          style={{ backgroundImage: 'linear-gradient(rgba(79,195,247,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(79,195,247,0.04) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <motion.div animate={{ y: [0, -28, 0], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full"
          style={{ background: '#29b6f6', boxShadow: '0 0 20px rgba(41,182,246,0.9)' }} />
        <motion.div animate={{ y: [0, 22, 0], opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 11, repeat: Infinity, delay: 2 }}
          className="absolute top-1/3 right-1/3 w-1.5 h-1.5 rounded-full"
          style={{ background: '#ab47bc', boxShadow: '0 0 15px rgba(171,71,188,0.9)' }} />
        <motion.div animate={{ y: [0, -18, 0], opacity: [0.15, 0.4, 0.15] }} transition={{ duration: 14, repeat: Infinity, delay: 4 }}
          className="absolute bottom-1/3 left-1/3 w-1 h-1 rounded-full"
          style={{ background: '#29b6f6', boxShadow: '0 0 10px rgba(41,182,246,0.8)' }} />
        <motion.div animate={{ y: ['0vh', '110vh'] }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          className="absolute left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(79,195,247,0.1) 40%, rgba(79,195,247,0.18) 50%, rgba(79,195,247,0.1) 60%, transparent)', zIndex: 0 }} />
      </div>

      {/* Nav */}
      <nav className="relative flex justify-between items-center px-8 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)', zIndex: 10 }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full p-[1px]" style={{ background: 'linear-gradient(135deg, #29b6f6, #ab47bc)' }}>
            <div className="w-full h-full rounded-full bg-void flex items-center justify-center">
              <Brain size={12} className="text-electric" />
            </div>
          </div>
          <span className="font-display text-base" style={{ color: '#e8e8f0' }}>RCE</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ color: '#c4c4d8', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}>
            Sign In
          </Link>
          <Link href="/signup"
            className="px-4 py-2 rounded-lg text-sm font-medium text-void transition-all"
            style={{ background: 'linear-gradient(135deg, #0288d1, #29b6f6)', boxShadow: '0 0 20px rgba(41,182,246,0.3)' }}>
            Begin
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center text-center px-6 pt-24 pb-16" style={{ zIndex: 10 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] mb-8" style={{ color: 'rgba(107,107,138,0.5)' }}>
            Reflective Cognition Engine
          </p>
          <h1 className="font-display font-light leading-none mb-6" style={{ fontSize: 'clamp(3.5rem,10vw,8rem)', color: '#e8e8f0' }}>
            What do you
            <br />
            <span style={{ color: '#29b6f6', textShadow: '0 0 60px rgba(41,182,246,0.4)' }}>believe?</span>
          </h1>
          <p className="font-light max-w-sm mx-auto leading-relaxed" style={{ color: 'rgba(107,107,138,0.6)', fontSize: '15px' }}>
            Not a journal. Not a therapist.
            <br />A mirror that speaks back.
          </p>
        </motion.div>

        {/* Search bar */}
        <motion.form onSubmit={handleSubmit} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }} className="w-full max-w-2xl mt-12">
          <div className="relative group">
            <div className="absolute inset-0 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"
              style={{ background: 'radial-gradient(ellipse, rgba(41,182,246,0.09) 0%, transparent 70%)', filter: 'blur(30px)', zIndex: -1 }} />
            <div className="relative rounded-2xl transition-all duration-300 group-focus-within:border-white/10"
              style={{ background: 'rgba(8,8,14,0.97)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a thought, a conviction, a doubt..."
                rows={3}
                autoFocus
                className="w-full bg-transparent px-6 pt-5 pb-2 font-mono resize-none outline-none leading-relaxed"
                style={{ color: '#e8e8f0', fontSize: '15px', caretColor: '#4fc3f7', minHeight: '110px', maxHeight: '240px' }}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement
                  t.style.height = 'auto'
                  t.style.height = Math.min(t.scrollHeight, 240) + 'px'
                }}
              />
              <style>{`textarea::placeholder { color: rgba(107,107,138,0.45) !important; }`}</style>
              <div className="flex items-center justify-between px-5 pb-4">
                <span style={{ color: 'rgba(107,107,138,0.35)', fontSize: '10px', fontFamily: 'monospace' }}>Enter to continue</span>
                <button type="submit" disabled={!input.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all disabled:opacity-20"
                  style={{ background: 'rgba(41,182,246,0.1)', border: '1px solid rgba(41,182,246,0.22)', color: '#4fc3f7', fontFamily: 'monospace', fontSize: '12px' }}>
                  Enter <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
          <p className="mt-4 text-center" style={{ color: 'rgba(107,107,138,0.5)', fontSize: '11px', fontFamily: 'monospace' }}>
            Already mapped your mind?{' '}
            <button type="button" onClick={() => router.push('/login')} style={{ color: 'rgba(79,195,247,0.7)' }} className="hover:underline">
              Sign in
            </button>
          </p>
        </motion.form>
      </section>

      {/* Features */}
      <section className="relative px-6 pb-20 pt-8" style={{ zIndex: 10 }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-display text-3xl font-light mb-2" style={{ color: '#e8e8f0' }}>What it does to your mind</p>
            <p className="text-xs font-mono" style={{ color: 'rgba(107,107,138,0.5)' }}>This is not for everyone.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {features.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.07 }} viewport={{ once: true }}
                className="rounded-xl p-5 cursor-default"
                style={{ background: 'rgba(8,8,14,0.7)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <f.icon size={15} className="mb-3" style={{ color: '#4fc3f7' }} />
                <h3 className="text-sm font-medium mb-1.5" style={{ color: '#e8e8f0' }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(107,107,138,0.75)' }}>{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-6 pb-24" style={{ zIndex: 10 }}>
        <div className="max-w-xl mx-auto">
          <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(8,8,14,0.8)', border: '1px solid rgba(171,71,188,0.1)' }}>
            <p className="font-display text-xl font-light mb-3" style={{ color: '#e8e8f0', fontStyle: 'italic' }}>
              &ldquo;The unexamined life is not worth living.&rdquo;
            </p>
            <p className="text-xs font-mono" style={{ color: 'rgba(107,107,138,0.45)' }}>— Socrates</p>
          </div>
        </div>
      </section>

      <footer className="relative border-t flex justify-between items-center px-8 py-5" style={{ borderColor: 'rgba(255,255,255,0.04)', zIndex: 10 }}>
        <span className="text-xs font-mono" style={{ color: 'rgba(107,107,138,0.4)' }}>Reflective Cognition Engine</span>
        <Link href="/signup" className="text-xs font-mono" style={{ color: 'rgba(79,195,247,0.55)' }}>Begin →</Link>
      </footer>
    </main>
  )
}
