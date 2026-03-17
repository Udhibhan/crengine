'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Loader2, Clock } from 'lucide-react'
import type { Belief, ContradictionResult } from '@/lib/types'

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

export default function ThoughtsPage() {
  const [rawInput, setRawInput] = useState('')
  const [beliefs, setBeliefs] = useState<Belief[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [contradictions, setContradictions] = useState<ContradictionResult[]>([])
  const [newBeliefs, setNewBeliefs] = useState<Belief[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/beliefs')
      .then((r) => r.json())
      .then((d) => {
        setBeliefs(d.beliefs || [])
        setFetching(false)
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rawInput.trim()) return
    setLoading(true)
    setContradictions([])
    setNewBeliefs([])

    const res = await fetch('/api/beliefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawInput }),
    })
    const data = await res.json()
    if (data.beliefs) {
      setNewBeliefs(data.beliefs)
      setBeliefs((prev) => [...data.beliefs, ...prev])
    }
    if (data.contradictions?.length > 0) {
      setContradictions(data.contradictions)
    }
    setRawInput('')
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    await fetch('/api/beliefs/' + id, { method: 'DELETE' })
    setBeliefs((prev) => prev.filter((b) => b.id !== id))
    setDeletingId(null)
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <h1 className="font-display text-5xl text-bright font-light mb-2">What do you believe?</h1>
        <p className="text-ghost text-sm font-mono">Write freely. The engine reads between the lines.</p>
      </motion.div>

      {/* Input */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <form onSubmit={handleSubmit}>
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="Write anything. A thought, a conviction, a doubt. Stream of consciousness is fine."
            className="w-full rce-input rounded-xl px-5 py-4 text-sm leading-relaxed resize-none h-36 font-mono"
            disabled={loading}
          />
          <div className="flex justify-end mt-3">
            <button
              type="submit"
              disabled={loading || !rawInput.trim()}
              className="btn-primary px-6 py-2.5 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Reading...
                </>
              ) : (
                'Submit'
              )}
            </button>
          </div>
        </form>
      </motion.div>

      {/* New beliefs */}
      <AnimatePresence>
        {newBeliefs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 p-4 rounded-xl border border-electric/20 bg-electric/5"
          >
            <p className="text-electric text-xs font-mono mb-3 uppercase tracking-widest">
              {newBeliefs.length} belief{newBeliefs.length !== 1 ? 's' : ''} extracted
            </p>
            <div className="space-y-2">
              {newBeliefs.map((b) => (
                <div key={b.id} className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: CATEGORY_COLORS[b.category] }} />
                  <p className="text-pale text-sm">{b.content}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contradictions */}
      <AnimatePresence>
        {contradictions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 p-4 rounded-xl border border-contradiction/25 bg-contradiction/5"
          >
            <p className="text-contradiction text-xs font-mono mb-3 uppercase tracking-widest">
              {contradictions.length} self-contradiction{contradictions.length !== 1 ? 's' : ''} detected
            </p>
            <div className="space-y-3">
              {contradictions.map((c) => (
                <div key={c.belief_id} className="text-xs">
                  <p className="text-pale mb-1">
                    <span className="text-ghost">You previously said: </span>
                    &ldquo;{c.belief_content}&rdquo;
                  </p>
                  <p className="text-dim italic">{c.explanation}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Divider */}
      <div className="mt-10 mb-6 border-t border-border/30" />

      {/* Beliefs list */}
      {fetching ? (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="text-electric animate-spin" />
        </div>
      ) : beliefs.length === 0 ? (
        <p className="text-ghost text-sm font-mono text-center py-16">
          Nothing recorded yet. Start writing.
        </p>
      ) : (
        <div className="space-y-2">
          {beliefs.map((belief, i) => (
            <motion.div
              key={belief.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="group flex items-start gap-3 py-3 px-4 rounded-xl hover:bg-surface/40 transition-colors"
            >
              <div
                className="w-1 h-1 rounded-full mt-2.5 shrink-0"
                style={{ background: CATEGORY_COLORS[belief.category] || '#78909c' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-pale text-sm leading-relaxed">{belief.content}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] font-mono capitalize" style={{ color: CATEGORY_COLORS[belief.category] }}>
                    {belief.category}
                  </span>
                  <span className="text-ghost text-[10px] font-mono flex items-center gap-1">
                    <Clock size={8} />
                    {new Date(belief.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-ghost text-[10px] font-mono ml-auto">
                    {Math.round(belief.confidence_score * 100)}%
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(belief.id)}
                disabled={deletingId === belief.id}
                className="opacity-0 group-hover:opacity-100 text-ghost hover:text-contradiction transition-all p-1 rounded shrink-0"
              >
                {deletingId === belief.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
