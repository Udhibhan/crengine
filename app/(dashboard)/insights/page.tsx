'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Lightbulb, RefreshCw, Loader2, AlertTriangle, TrendingUp, Eye, Zap } from 'lucide-react'
import type { Insight } from '@/lib/types'

const INSIGHT_ICONS: Record<string, React.ElementType> = {
  contradiction: AlertTriangle,
  bias: Eye,
  pattern: TrendingUp,
}

const INSIGHT_COLORS: Record<string, string> = {
  contradiction: '#ff4757',
  bias: '#ffa726',
  pattern: '#29b6f6',
}

const SEVERITY_COLORS: Record<string, string> = {
  high: '#ff4757',
  medium: '#ffa726',
  low: '#2ecc71',
}

function renderMarkdown(text: string) {
  // Simple markdown renderer for the action plan
  const lines = text.split('\n')
  return lines.map((line, i) => {
    if (line.startsWith('## ')) {
      return (
        <h2 key={i} className="font-display text-2xl text-bright mt-6 mb-3 font-light">
          {line.slice(3)}
        </h2>
      )
    }
    if (line.startsWith('### ')) {
      return (
        <h3 key={i} className="font-display text-lg text-pale mt-4 mb-2 font-light">
          {line.slice(4)}
        </h3>
      )
    }
    if (line.startsWith('- ')) {
      return (
        <div key={i} className="flex gap-2 my-1.5 pl-2">
          <span className="text-electric mt-0.5 shrink-0">›</span>
          <p className="text-soft text-sm leading-relaxed">{line.slice(2)}</p>
        </div>
      )
    }
    if (line.trim() === '') return <div key={i} className="h-2" />
    return (
      <p key={i} className="text-dim text-sm leading-relaxed my-1">
        {line}
      </p>
    )
  })
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [actionPlan, setActionPlan] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatingPlan, setGeneratingPlan] = useState(false)

  useEffect(() => {
    fetch('/api/insights')
      .then((r) => r.json())
      .then((d) => {
        setInsights(d.insights || [])
        setLoading(false)
      })
  }, [])

  const generateInsights = async () => {
    setGenerating(true)
    const res = await fetch('/api/insights', { method: 'POST' })
    const data = await res.json()
    if (data.insights) setInsights(data.insights)
    setGenerating(false)
  }

  const generatePlan = async () => {
    setGeneratingPlan(true)
    const res = await fetch('/api/insights/action-plan', { method: 'POST' })
    const data = await res.json()
    if (data.plan) setActionPlan(data.plan)
    setGeneratingPlan(false)
  }

  const markRead = async (id: string) => {
    await fetch(`/api/insights?id=${id}`, { method: 'PATCH' })
    setInsights((prev) => prev.map((ins) => (ins.id === id ? { ...ins, is_read: true } : ins)))
  }

  const groupedInsights = {
    contradiction: insights.filter((i) => i.type === 'contradiction'),
    bias: insights.filter((i) => i.type === 'bias'),
    pattern: insights.filter((i) => i.type === 'pattern'),
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-end justify-between"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={14} className="text-electric" />
            <span className="text-electric text-xs font-mono uppercase tracking-widest">
              Cognitive Insights
            </span>
          </div>
          <h1 className="font-display text-5xl text-bright font-light">Patterns & Blind Spots</h1>
          <p className="text-dim text-sm mt-2">
            The engine has analyzed your belief system. These are its findings.
          </p>
        </div>
        <button
          onClick={generateInsights}
          disabled={generating}
          className="btn-primary px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50"
        >
          {generating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          {generating ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={24} className="text-electric animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Insights by type */}
          {(Object.entries(groupedInsights) as [string, Insight[]][]).map(([type, typeInsights]) => {
            const Icon = INSIGHT_ICONS[type] || Lightbulb
            const color = INSIGHT_COLORS[type] || '#29b6f6'

            return (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Icon size={14} style={{ color }} />
                  <span className="text-xs font-mono uppercase tracking-widest capitalize" style={{ color }}>
                    {type}
                  </span>
                  <span className="text-ghost text-xs font-mono">
                    ({typeInsights.length})
                  </span>
                </div>

                {typeInsights.length === 0 ? (
                  <div className="glass rounded-xl p-5 text-center">
                    <p className="text-ghost text-xs font-mono">
                      No {type} insights detected yet. Run analysis to update.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {typeInsights.map((insight, i) => (
                      <motion.div
                        key={insight.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`glass rounded-xl p-5 border transition-all cursor-pointer ${
                          insight.is_read ? 'border-border/20' : 'border-electric/20'
                        }`}
                        onClick={() => !insight.is_read && markRead(insight.id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{
                                  background: SEVERITY_COLORS[insight.severity] || '#78909c',
                                  boxShadow: `0 0 6px ${SEVERITY_COLORS[insight.severity] || '#78909c'}`,
                                }}
                              />
                              <span
                                className="text-[10px] font-mono uppercase"
                                style={{ color: SEVERITY_COLORS[insight.severity] }}
                              >
                                {insight.severity} severity
                              </span>
                              {!insight.is_read && (
                                <span className="text-[9px] font-mono text-electric bg-electric/10 px-1.5 py-0.5 rounded">
                                  NEW
                                </span>
                              )}
                            </div>
                            <p className="text-pale text-sm leading-relaxed">{insight.description}</p>
                            <span className="text-ghost text-[10px] font-mono mt-2 block">
                              {new Date(insight.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )
          })}

          {insights.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass rounded-2xl p-16 text-center"
            >
              <Lightbulb size={40} className="text-ghost mx-auto mb-4 opacity-20" />
              <p className="text-pale text-sm mb-2">No insights yet.</p>
              <p className="text-ghost text-xs font-mono mb-6">
                Add at least 3 beliefs, then run analysis.
              </p>
              <button
                onClick={generateInsights}
                disabled={generating}
                className="btn-primary px-6 py-2.5 rounded-xl text-sm mx-auto flex items-center gap-2"
              >
                <Zap size={14} />
                Run First Analysis
              </button>
            </motion.div>
          )}

          {/* Action Plan */}
          {insights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass rounded-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-border/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-violet-bright" />
                  <h2 className="font-display text-xl text-bright">Action Plan</h2>
                </div>
                <button
                  onClick={generatePlan}
                  disabled={generatingPlan}
                  className="btn-ghost px-4 py-2 rounded-lg text-xs flex items-center gap-2"
                >
                  {generatingPlan ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  {generatingPlan ? 'Generating...' : 'Generate'}
                </button>
              </div>
              <div className="p-6">
                {generatingPlan ? (
                  <div className="flex items-center gap-3">
                    <Loader2 size={16} className="text-electric animate-spin" />
                    <span className="text-dim text-sm font-mono">Analyzing patterns and generating recommendations...</span>
                  </div>
                ) : actionPlan ? (
                  <div className="prose-dark">{renderMarkdown(actionPlan)}</div>
                ) : (
                  <p className="text-ghost text-sm font-mono text-center py-8">
                    Click &ldquo;Generate&rdquo; to create a personalized action plan based on your belief patterns.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}
