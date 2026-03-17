'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Brain, GitBranch, Zap, Eye, ArrowRight, Network } from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'Belief Extraction',
    description:
      'Write freely. The engine extracts, categorizes, and scores every conviction buried in your words.',
  },
  {
    icon: GitBranch,
    title: 'Contradiction Engine',
    description:
      'Every new thought is compared against your entire cognitive history. Inconsistencies surface immediately.',
  },
  {
    icon: Network,
    title: 'Belief Graph',
    description:
      'Your mind becomes a living map. Watch belief clusters form, contradict, and evolve in real time.',
  },
  {
    icon: Eye,
    title: 'The Mirror',
    description:
      'An AI that does not comfort you. It challenges your logic, questions your certainties, and forces clarity.',
  },
  {
    icon: Zap,
    title: 'Pattern Recognition',
    description:
      'Bias detection, cognitive dissonance alerts, and blind spot identification from your own data.',
  },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-void relative overflow-hidden flex flex-col">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-glow-blue opacity-30 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-glow-violet opacity-20 blur-3xl" />
        <div className="absolute inset-0 grid-overlay opacity-50" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex justify-between items-center px-8 py-6 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full animated-border p-[1px]">
            <div className="w-full h-full rounded-full bg-void flex items-center justify-center">
              <Brain size={14} className="text-electric" />
            </div>
          </div>
          <span className="font-display text-lg text-bright tracking-wide">RCE</span>
          <span className="text-dim text-xs font-mono ml-1">v1.0</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="btn-ghost px-4 py-2 rounded-lg text-sm">
            Sign In
          </Link>
          <Link href="/signup" className="btn-primary px-4 py-2 rounded-lg text-sm">
            Begin
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-electric/20 bg-electric/5 text-electric text-xs font-mono mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-electric animate-pulse-slow" />
            Cognitive Mirror · AI-Powered · Private
          </div>

          <h1 className="font-display text-6xl md:text-8xl font-light text-bright mb-4 leading-none tracking-tight">
            Reflective{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric to-violet-bright">
              Cognition
            </span>
            <br />
            Engine
          </h1>

          <p className="text-dim text-lg md:text-xl max-w-2xl mx-auto mb-6 font-light leading-relaxed">
            Not a journal. Not a notes app.
            <br />A long-term mirror for your mind.
          </p>

          <p className="text-ghost text-sm md:text-base max-w-xl mx-auto mb-12 font-mono">
            It maps what you believe. It finds what you contradict.
            <br />
            It speaks back without mercy.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
            <Link
              href="/signup"
              className="btn-primary px-8 py-3.5 rounded-xl text-sm flex items-center gap-2 group"
            >
              Enter the Engine
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="btn-ghost px-8 py-3.5 rounded-xl text-sm"
            >
              Return to your mind
            </Link>
          </div>
        </motion.div>

        {/* Animated belief nodes preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
          className="mt-20 relative w-full max-w-2xl h-64 mx-auto"
        >
          {/* SVG network preview */}
          <svg className="w-full h-full" viewBox="0 0 600 250">
            {/* Connecting lines */}
            <line x1="100" y1="125" x2="230" y2="80" stroke="rgba(79,195,247,0.2)" strokeWidth="1" />
            <line x1="100" y1="125" x2="230" y2="170" stroke="rgba(79,195,247,0.15)" strokeWidth="1" />
            <line x1="230" y1="80" x2="380" y2="60" stroke="rgba(79,195,247,0.2)" strokeWidth="1" />
            <line x1="230" y1="80" x2="380" y2="125" stroke="rgba(156,39,176,0.3)" strokeDasharray="4,4" strokeWidth="1.5" />
            <line x1="230" y1="170" x2="380" y2="190" stroke="rgba(79,195,247,0.2)" strokeWidth="1" />
            <line x1="380" y1="125" x2="500" y2="100" stroke="rgba(79,195,247,0.15)" strokeWidth="1" />
            <line x1="380" y1="125" x2="500" y2="160" stroke="rgba(156,39,176,0.25)" strokeDasharray="4,4" strokeWidth="1.5" />
            <line x1="380" y1="60" x2="500" y2="100" stroke="rgba(79,195,247,0.15)" strokeWidth="1" />

            {/* Contradiction pulse */}
            <circle cx="305" cy="100" r="30" fill="none" stroke="rgba(255,71,87,0.2)" strokeWidth="1">
              <animate attributeName="r" values="25;35;25" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite" />
            </circle>

            {/* Nodes */}
            <circle cx="100" cy="125" r="16" fill="rgba(41,182,246,0.2)" stroke="rgba(41,182,246,0.5)" strokeWidth="1.5" />
            <circle cx="230" cy="80" r="12" fill="rgba(171,71,188,0.2)" stroke="rgba(171,71,188,0.5)" strokeWidth="1.5" />
            <circle cx="230" cy="170" r="10" fill="rgba(41,182,246,0.15)" stroke="rgba(41,182,246,0.3)" strokeWidth="1" />
            <circle cx="380" cy="60" r="11" fill="rgba(41,182,246,0.15)" stroke="rgba(41,182,246,0.35)" strokeWidth="1" />
            <circle cx="380" cy="125" r="18" fill="rgba(255,71,87,0.15)" stroke="rgba(255,71,87,0.5)" strokeWidth="1.5" />
            <circle cx="380" cy="190" r="9" fill="rgba(171,71,188,0.15)" stroke="rgba(171,71,188,0.3)" strokeWidth="1" />
            <circle cx="500" cy="100" r="13" fill="rgba(41,182,246,0.2)" stroke="rgba(41,182,246,0.4)" strokeWidth="1" />
            <circle cx="500" cy="160" r="10" fill="rgba(171,71,188,0.15)" stroke="rgba(171,71,188,0.35)" strokeWidth="1" />

            {/* Contradiction label */}
            <text x="290" y="97" textAnchor="middle" fill="rgba(255,71,87,0.6)" fontSize="8" fontFamily="monospace">
              CONTRADICTION
            </text>

            {/* Subtle category labels */}
            <text x="100" y="147" textAnchor="middle" fill="rgba(79,195,247,0.4)" fontSize="7" fontFamily="monospace">identity</text>
            <text x="380" y="147" textAnchor="middle" fill="rgba(255,71,87,0.4)" fontSize="7" fontFamily="monospace">ethics</text>
          </svg>

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-transparent" />
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl text-bright mb-3">What it does to your mind</h2>
            <p className="text-dim text-sm font-mono">This is not for everyone. It is for thinkers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * i }}
                className="glass glass-hover rounded-xl p-6"
              >
                <feature.icon size={20} className="text-electric mb-4" />
                <h3 className="text-bright font-medium mb-2 text-sm">{feature.title}</h3>
                <p className="text-dim text-xs leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Warning section */}
      <section className="relative z-10 px-6 pb-16">
        <div className="max-w-2xl mx-auto">
          <div className="glass rounded-xl p-8 border border-violet-glow/20 text-center">
            <p className="font-display text-xl text-bright mb-3">
              &ldquo;The unexamined life is not worth living.&rdquo;
            </p>
            <p className="text-dim text-xs font-mono">— Socrates (and this engine agrees)</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30 py-6 px-8 flex justify-between items-center">
        <span className="text-ghost text-xs font-mono">RCE · Cognitive Mirror System</span>
        <Link href="/signup" className="text-electric text-xs font-mono hover:underline">
          Begin your cognitive map →
        </Link>
      </footer>
    </main>
  )
}

