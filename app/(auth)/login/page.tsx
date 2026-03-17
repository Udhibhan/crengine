'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Brain, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-void flex items-center justify-center px-4 relative overflow-hidden">
      {/* BG effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-glow-blue opacity-20 blur-3xl" />
        <div className="absolute inset-0 grid-overlay opacity-30" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full animated-border p-[1.5px] mb-4">
            <div className="w-full h-full rounded-full bg-void flex items-center justify-center">
              <Brain size={24} className="text-electric" />
            </div>
          </div>
          <h1 className="font-display text-3xl text-bright">Return</h1>
          <p className="text-dim text-sm font-mono mt-1">to your cognitive map</p>
        </div>

        {/* Form */}
        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-pale text-xs font-mono mb-2 uppercase tracking-widest">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rce-input rounded-xl px-4 py-3 text-sm font-mono"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-pale text-xs font-mono mb-2 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rce-input rounded-xl px-4 py-3 text-sm font-mono pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ghost hover:text-pale transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-contradiction text-xs p-3 rounded-lg bg-contradiction/10 border border-contradiction/20"
              >
                <AlertCircle size={14} />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary rounded-xl py-3.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connecting...
                </span>
              ) : (
                'Enter the Engine'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-ghost text-xs font-mono">
              New mind?{' '}
              <Link href="/signup" className="text-electric hover:underline">
                Begin your map
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-ghost text-xs font-mono hover:text-dim transition-colors">
            ← Back to surface
          </Link>
        </div>
      </motion.div>
    </main>
  )
}
