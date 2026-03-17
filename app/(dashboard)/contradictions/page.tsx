'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { GitBranch, AlertTriangle, Loader2, ChevronRight } from 'lucide-react'

interface ContradictionPair {
  id: string
  belief_1: { id: string; content: string; category: string; created_at: string }
  belief_2: { id: string; content: string; category: string; created_at: string }
  strength_score: number
  explanation?: string
  created_at: string
}

export default function ContradictionsPage() {
  const [contradictions, setContradictions] = useState<ContradictionPair[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/contradictions?full=true')
      .then((r) => r.json())
      .then((d) => {
        setContradictions(d.contradictions || [])
        setLoading(false)
      })
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <GitBranch size={14} className="text-contradiction" />
          <span className="text-contradiction text-xs font-mono uppercase tracking-widest">
            Contradiction Analysis
          </span>
        </div>
        <h1 className="font-display text-5xl text-bright font-light">Where You Conflict</h1>
        <p className="text-dim text-sm mt-2">
          These are the fault lines in your belief system. Face them.
        </p>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={24} className="text-electric animate-spin" />
            <span className="text-dim text-xs font-mono">Scanning for contradictions...</span>
          </div>
        </div>
      ) : contradictions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-2xl p-16 text-center"
        >
          <GitBranch size={40} className="text-ghost mx-auto mb-4 opacity-20" />
          <p className="text-pale text-sm mb-2">No contradictions detected yet.</p>
          <p className="text-ghost text-xs font-mono">
            Either you think with perfect consistency, or you haven't written enough.
          </p>
          <p className="text-dim text-xs font-mono mt-1">
            Add more beliefs and the fissures will appear.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-contradiction" />
            <span className="text-contradiction text-xs font-mono">
              {contradictions.length} contradiction{contradictions.length !== 1 ? 's' : ''} found
            </span>
          </div>

          {contradictions.map((pair, i) => (
            <motion.div
              key={pair.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="glass rounded-2xl overflow-hidden border border-contradiction/15"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-contradiction/10 bg-contradiction/5">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={13} className="text-contradiction" />
                  <span className="text-contradiction text-xs font-mono uppercase tracking-wider">
                    Contradiction
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-ghost text-xs font-mono">Conflict score:</span>
                  <span className="text-contradiction text-sm font-mono font-bold">
                    {Math.round(pair.strength_score * 100)}%
                  </span>
                </div>
              </div>

              {/* Beliefs side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/20">
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-4 h-4 rounded-full bg-electric/20 border border-electric/30 flex items-center justify-center text-[9px] text-electric font-mono">
                      A
                    </span>
                    <span className="text-ghost text-[10px] font-mono uppercase tracking-wider">
                      Belief
                    </span>
                    <span className="text-ghost text-[10px] font-mono ml-auto">
                      {new Date(pair.belief_1.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-pale text-sm leading-relaxed">{pair.belief_1.content}</p>
                  <span className="text-[10px] font-mono text-electric/60 mt-2 inline-block capitalize">
                    {pair.belief_1.category}
                  </span>
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-4 h-4 rounded-full bg-contradiction/20 border border-contradiction/30 flex items-center justify-center text-[9px] text-contradiction font-mono">
                      B
                    </span>
                    <span className="text-ghost text-[10px] font-mono uppercase tracking-wider">
                      Belief
                    </span>
                    <span className="text-ghost text-[10px] font-mono ml-auto">
                      {new Date(pair.belief_2.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-pale text-sm leading-relaxed">{pair.belief_2.content}</p>
                  <span className="text-[10px] font-mono text-contradiction/60 mt-2 inline-block capitalize">
                    {pair.belief_2.category}
                  </span>
                </div>
              </div>

              {/* Explanation */}
              {pair.explanation && (
                <div className="px-5 py-4 bg-void/40 border-t border-border/20">
                  <div className="flex items-start gap-2">
                    <ChevronRight size={13} className="text-dim mt-0.5 shrink-0" />
                    <p className="text-dim text-xs italic leading-relaxed">{pair.explanation}</p>
                  </div>
                </div>
              )}

              {/* Strength bar */}
              <div className="px-5 py-3 border-t border-border/20">
                <div className="flex items-center gap-3">
                  <span className="text-ghost text-[10px] font-mono">Conflict intensity</span>
                  <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pair.strength_score * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.3 + i * 0.07 }}
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, #c0392b, #ff4757)`,
                      }}
                    />
                  </div>
                  <span className="text-contradiction text-[10px] font-mono">
                    {Math.round(pair.strength_score * 100)}%
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
