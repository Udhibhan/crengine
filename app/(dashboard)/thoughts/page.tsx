'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PenLine, Trash2, AlertTriangle, Loader2, Clock, ChevronDown } from 'lucide-react'
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

const CATEGORIES = [
  'all','philosophy','identity','habit','relationships','career','worldview','ethics','emotion','general',
]

export default function ThoughtsPage() {
  const [rawInput, setRawInput] = useState('')
  const [beliefs, setBeliefs] = useState<Belief[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [contradictions, setContradictions] = useState<ContradictionResult[]>([])
  const [newBeliefs, setNewBeliefs] = useState<Belief[]>([])
  const [filterCategory, setFilterCategory] = useState('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showContradictions, setShowContradictions] = useState(false)

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
      setShowContradictions(true)
    }

    setRawInput('')
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    await fetch(`/api/beliefs/${id}`, { method: 'DELETE' })
    setBeliefs((prev) => prev.filter((b) => b.id !== id))
    setDeletingId(null)
  }

  const filtered =
    filterCategory === 'all' ? beliefs : beliefs.filter((b) => b.category === filterCategory)

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <PenLine size={14} className="text-electric" />
          <span className="text-electric text-xs font-mono uppercase tracking-widest">
            Thought Input
          </span>
        </div>
        <h1 className="font-display text-5xl text-bright font-light">Record Your Mind</h1>
        <p className="text-dim text-sm mt-2">
          Write freely. The engine extracts, categorizes, and maps your beliefs automatically.
        </p>
      </motion.div>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-6 mb-6"
      >
        <form onSubmit={handleSubmit}>
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="Write anything. Stream of consciousness, a realization, a conviction, a doubt. The engine reads between the lines...

Example: 'I've been thinking that discipline matters more than motivation. But I keep procrastinating. Maybe I don't actually believe that.'"
            className="w-full rce-input rounded-xl px-4 py-4 text-sm leading-relaxed resize-none h-40 font-mono"
            disabled={loading}
          />
          <div className="flex items-center justify-between mt-4">
            <span className="text-ghost text-xs font-mono">
              {rawInput.length > 0 ? `${rawInput.length} chars` : 'Start writing...'}
            </span>
            <button
              type="submit"
              disabled={loading || !rawInput.trim()}
              className="btn-primary px-6 py-2.5 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Extracting beliefs...
                </>
              ) : (
                'Extract & Map'
              )}
            </button>
          </div>
        </form>
      </motion.div>

      {/* New beliefs extracted */}
      <AnimatePresence>
        {newBeliefs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 glass rounded-xl p-5 border border-electric/20"
          >
            <h3 className="text-electric text-xs font-mono uppercase tracking-widest mb-3">
              {newBeliefs.length} Belief{newBeliefs.length !== 1 ? 's' : ''} Extracted
            </h3>
            <div className="space-y-2">
              {newBeliefs.map((b) => (
                <div key={b.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-electric/5">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                    style={{ background: CATEGORY_COLORS[b.category] }}
                  />
                  <div>
                    <p className="text-pale text-sm">{b.content}</p>
                    <div className="flex gap-2 mt-1">
                      <span
                        className="text-[10px] font-mono"
                        style={{ color: CATEGORY_COLORS[b.category] }}
                      >
                        {b.category}
                      </span>
                      <span className="text-ghost text-[10px] font-mono">
                        {Math.round(b.confidence_score * 100)}% confidence
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contradictions alert */}
      <AnimatePresence>
        {showContradictions && contradictions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 glass rounded-xl p-5 border border-contradiction/30 bg-contradiction/5"
          >
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowContradictions((s) => !s)}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-contradiction" />
                <h3 className="text-contradiction text-sm font-mono uppercase tracking-widest">
                  {contradictions.length} Contradiction{contradictions.length !== 1 ? 's' : ''} Detected
                </h3>
              </div>
              <ChevronDown
                size={16}
                className={`text-contradiction transition-transform ${showContradictions ? 'rotate-180' : ''}`}
              />
            </div>

            <AnimatePresence>
              {showContradictions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-3">
                    {contradictions.map((c) => (
                      <div key={c.belief_id} className="p-3 rounded-lg bg-void/60 border border-contradiction/15">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-contradiction text-xs font-mono">
                            {Math.round(c.contradiction_score * 100)}% contradiction
                          </span>
                        </div>
                        <p className="text-pale text-xs mb-1">
                          <span className="text-ghost">Conflicts with: </span>
                          &ldquo;{c.belief_content}&rdquo;
                        </p>
                        <p className="text-dim text-xs italic">{c.explanation}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              filterCategory === cat
                ? 'text-bright border border-electric/40 bg-electric/10'
                : 'text-ghost border border-border/30 hover:border-border/60'
            }`}
            style={
              filterCategory === cat && cat !== 'all'
                ? { color: CATEGORY_COLORS[cat], borderColor: `${CATEGORY_COLORS[cat]}40`, background: `${CATEGORY_COLORS[cat]}10` }
                : {}
            }
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Beliefs list */}
      {fetching ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="text-electric animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 glass rounded-xl">
          <PenLine size={32} className="text-ghost mx-auto mb-3 opacity-30" />
          <p className="text-ghost text-sm">No beliefs in this category yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((belief, i) => (
            <motion.div
              key={belief.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass glass-hover rounded-xl p-4 flex items-start gap-4 group"
            >
              <div
                className="w-2 h-2 rounded-full mt-2 shrink-0"
                style={{ background: CATEGORY_COLORS[belief.category] || '#78909c' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-pale text-sm leading-relaxed">{belief.content}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span
                    className="text-[10px] font-mono capitalize"
                    style={{ color: CATEGORY_COLORS[belief.category] }}
                  >
                    {belief.category}
                  </span>
                  <span className="text-ghost text-[10px] font-mono flex items-center gap-1">
                    <Clock size={9} />
                    {new Date(belief.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <div className="flex items-center gap-1 ml-auto">
                    <div className="h-1 w-16 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${belief.confidence_score * 100}%`,
                          background: 'linear-gradient(90deg, #0288d1, #29b6f6)',
                        }}
                      />
                    </div>
                    <span className="text-ghost text-[10px] font-mono">
                      {Math.round(belief.confidence_score * 100)}%
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(belief.id)}
                disabled={deletingId === belief.id}
                className="opacity-0 group-hover:opacity-100 text-ghost hover:text-contradiction transition-all p-1 rounded"
              >
                {deletingId === belief.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
