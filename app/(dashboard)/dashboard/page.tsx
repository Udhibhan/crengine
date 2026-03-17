'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, GitBranch, Lightbulb, TrendingUp, ArrowRight, Clock } from 'lucide-react'
import Link from 'next/link'
import type { Belief, Insight } from '@/lib/types'

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

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  href,
  delay,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
  href: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Link href={href}>
        <div className="glass glass-hover rounded-xl p-6 group cursor-pointer">
          <div className="flex items-start justify-between mb-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: `${color}18`, border: `1px solid ${color}30` }}
            >
              <Icon size={18} style={{ color }} />
            </div>
            <ArrowRight
              size={14}
              className="text-ghost group-hover:text-pale transition-colors opacity-0 group-hover:opacity-100"
            />
          </div>
          <div className="font-display text-4xl text-bright font-light">{value}</div>
          <div className="text-ghost text-xs font-mono mt-1">{label}</div>
        </div>
      </Link>
    </motion.div>
  )
}

export default function DashboardPage() {
  const [beliefs, setBeliefs] = useState<Belief[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/beliefs').then((r) => r.json()),
      fetch('/api/insights').then((r) => r.json()),
    ]).then(([beliefsData, insightsData]) => {
      setBeliefs(beliefsData.beliefs || [])
      setInsights(insightsData.insights || [])
      setLoading(false)
    })
  }, [])

  const contradictionCount = insights.filter((i) => i.type === 'contradiction').length
  const unreadCount = insights.filter((i) => !i.is_read).length

  const categoryBreakdown = beliefs.reduce<Record<string, number>>((acc, b) => {
    acc[b.category] = (acc[b.category] || 0) + 1
    return acc
  }, {})

  const topCategories = Object.entries(categoryBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-electric animate-pulse-slow" />
          <span className="text-electric text-xs font-mono uppercase tracking-widest">
            Cognitive Map · Active
          </span>
        </div>
        <h1 className="font-display text-5xl text-bright font-light">Dashboard</h1>
        <p className="text-dim text-sm mt-2">
          Your mind, mapped.{' '}
          {unreadCount > 0 && (
            <span className="text-electric">
              {unreadCount} unread insight{unreadCount !== 1 ? 's' : ''} waiting.
            </span>
          )}
        </p>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-electric/30 border-t-electric rounded-full animate-spin" />
            <span className="text-dim text-xs font-mono">Scanning belief matrix...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Brain}
              label="Total Beliefs"
              value={beliefs.length}
              color="#29b6f6"
              href="/thoughts"
              delay={0.1}
            />
            <StatCard
              icon={GitBranch}
              label="Contradictions"
              value={contradictionCount}
              color="#ff4757"
              href="/contradictions"
              delay={0.15}
            />
            <StatCard
              icon={Lightbulb}
              label="Insights"
              value={insights.length}
              color="#ab47bc"
              href="/insights"
              delay={0.2}
            />
            <StatCard
              icon={TrendingUp}
              label="Unread Alerts"
              value={unreadCount}
              color="#ffa726"
              href="/insights"
              delay={0.25}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent beliefs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2 glass rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-xl text-bright">Recent Beliefs</h2>
                <Link
                  href="/thoughts"
                  className="text-electric text-xs font-mono hover:underline flex items-center gap-1"
                >
                  View all <ArrowRight size={12} />
                </Link>
              </div>

              {beliefs.length === 0 ? (
                <div className="text-center py-12">
                  <Brain size={32} className="text-ghost mx-auto mb-3 opacity-30" />
                  <p className="text-ghost text-sm">No beliefs recorded yet.</p>
                  <Link
                    href="/thoughts"
                    className="text-electric text-xs font-mono hover:underline mt-2 inline-block"
                  >
                    Add your first thought →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {beliefs.slice(0, 6).map((belief, i) => (
                    <motion.div
                      key={belief.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + i * 0.05 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-surface/40 border border-border/20 hover:border-electric/15 transition-colors"
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                        style={{ background: CATEGORY_COLORS[belief.category] || '#78909c' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-pale text-sm leading-relaxed line-clamp-2">
                          {belief.content}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span
                            className="text-[10px] font-mono"
                            style={{ color: CATEGORY_COLORS[belief.category] || '#78909c' }}
                          >
                            {belief.category}
                          </span>
                          <span className="text-ghost text-[10px] font-mono flex items-center gap-1">
                            <Clock size={9} />
                            {new Date(belief.created_at).toLocaleDateString()}
                          </span>
                          <div className="ml-auto">
                            <div className="flex items-center gap-1">
                              <div className="h-1 w-12 rounded-full bg-border overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${belief.confidence_score * 100}%`,
                                    background: `linear-gradient(90deg, #0288d1, #29b6f6)`,
                                  }}
                                />
                              </div>
                              <span className="text-ghost text-[9px] font-mono">
                                {Math.round(belief.confidence_score * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Category breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass rounded-xl p-6"
              >
                <h2 className="font-display text-xl text-bright mb-4">Mind Map</h2>
                {topCategories.length === 0 ? (
                  <p className="text-ghost text-xs font-mono">No data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {topCategories.map(([cat, count]) => (
                      <div key={cat}>
                        <div className="flex justify-between mb-1">
                          <span
                            className="text-xs font-mono capitalize"
                            style={{ color: CATEGORY_COLORS[cat] || '#78909c' }}
                          >
                            {cat}
                          </span>
                          <span className="text-ghost text-xs font-mono">{count}</span>
                        </div>
                        <div className="h-1 rounded-full bg-border overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(count / beliefs.length) * 100}%` }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                            className="h-full rounded-full"
                            style={{ background: CATEGORY_COLORS[cat] || '#78909c' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Latest insight */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="glass rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-xl text-bright">Latest Insight</h2>
                  <Link href="/insights" className="text-electric text-xs font-mono hover:underline">
                    All →
                  </Link>
                </div>
                {insights.length === 0 ? (
                  <div>
                    <p className="text-ghost text-xs mb-3">
                      No insights generated yet. Add beliefs first.
                    </p>
                    <Link
                      href="/insights"
                      className="btn-ghost w-full rounded-lg py-2 text-xs text-center block"
                    >
                      Generate Insights
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {insights.slice(0, 2).map((insight) => (
                      <div
                        key={insight.id}
                        className="p-3 rounded-lg bg-surface/40 border border-border/20"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                              insight.type === 'contradiction'
                                ? 'text-contradiction bg-contradiction/10'
                                : insight.type === 'bias'
                                ? 'text-evolve bg-evolve/10'
                                : 'text-electric bg-electric/10'
                            }`}
                          >
                            {insight.type}
                          </span>
                          <span
                            className={`text-[9px] font-mono ${
                              insight.severity === 'high'
                                ? 'text-contradiction'
                                : insight.severity === 'medium'
                                ? 'text-evolve'
                                : 'text-support'
                            }`}
                          >
                            {insight.severity}
                          </span>
                        </div>
                        <p className="text-pale text-xs leading-relaxed line-clamp-3">
                          {insight.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Quick actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="glass rounded-xl p-6"
              >
                <h2 className="font-display text-xl text-bright mb-4">Quick Actions</h2>
                <div className="space-y-2">
                  <Link
                    href="/thoughts"
                    className="btn-ghost w-full rounded-lg py-2.5 text-xs flex items-center justify-center gap-2"
                  >
                    <Brain size={13} /> Record a thought
                  </Link>
                  <Link
                    href="/dialogue"
                    className="btn-ghost w-full rounded-lg py-2.5 text-xs flex items-center justify-center gap-2"
                  >
                    <GitBranch size={13} /> Challenge the mirror
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
