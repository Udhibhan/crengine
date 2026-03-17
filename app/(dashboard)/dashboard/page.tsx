'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, GitBranch, Lightbulb, TrendingUp, ArrowRight, Clock } from 'lucide-react'
import Link from 'next/link'
import type { Belief, Insight } from '@/lib/types'

const CATEGORY_COLORS: Record<string, string> = {
  philosophy: '#ab47bc', identity: '#29b6f6', habit: '#66bb6a',
  relationships: '#ef5350', career: '#ffa726', worldview: '#7e57c2',
  ethics: '#26c6da', emotion: '#ec407a', general: '#78909c',
}

function StatCard({ icon: Icon, label, value, color, href }: { icon: React.ElementType; label: string; value: number; color: string; href: string }) {
  return (
    <Link href={href}>
      <div className="rounded-xl p-5 group cursor-pointer transition-all duration-200"
        style={{ background: 'rgba(8,8,14,0.8)', border: '1px solid rgba(255,255,255,0.05)' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = `${color}25`}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)'}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
            <Icon size={16} style={{ color }} />
          </div>
          <ArrowRight size={12} style={{ color: 'rgba(107,107,138,0.3)' }} className="group-hover:opacity-100 opacity-0 transition-opacity mt-1" />
        </div>
        <div className="font-display text-4xl font-light" style={{ color: '#e8e8f0' }}>{value}</div>
        <div className="text-[10px] font-mono mt-1" style={{ color: 'rgba(107,107,138,0.55)' }}>{label}</div>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const [beliefs, setBeliefs] = useState<Belief[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/beliefs').then(r => r.json()),
      fetch('/api/insights').then(r => r.json()),
    ]).then(([b, i]) => {
      setBeliefs(b.beliefs || [])
      setInsights(i.insights || [])
      setLoading(false)
    })
  }, [])

  const contradictionCount = insights.filter(i => i.type === 'contradiction').length
  const unread = insights.filter(i => !i.is_read).length
  const topCategories = Object.entries(
    beliefs.reduce<Record<string, number>>((acc, b) => { acc[b.category] = (acc[b.category] || 0) + 1; return acc }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div style={{ paddingLeft: 'calc(56px + 3vw)', paddingRight: '3vw', paddingTop: '48px', paddingBottom: '48px', minHeight: '100vh' }}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <p className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'rgba(107,107,138,0.45)' }}>Overview</p>
        <h1 className="font-display font-light" style={{ fontSize: '3rem', color: '#e8e8f0' }}>Dashboard</h1>
        {unread > 0 && (
          <p className="text-xs font-mono mt-1" style={{ color: '#4fc3f7' }}>{unread} unread insight{unread !== 1 ? 's' : ''}</p>
        )}
      </motion.div>

      {loading ? (
        <div className="flex items-center gap-3 py-20">
          <div className="w-4 h-4 border border-electric/30 border-t-electric rounded-full animate-spin" />
          <span className="text-xs font-mono" style={{ color: 'rgba(107,107,138,0.5)' }}>Loading...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <StatCard icon={Brain} label="Total Beliefs" value={beliefs.length} color="#29b6f6" href="/dialogue" />
            <StatCard icon={GitBranch} label="Contradictions" value={contradictionCount} color="#ff4757" href="/contradictions" />
            <StatCard icon={Lightbulb} label="Insights" value={insights.length} color="#ab47bc" href="/insights" />
            <StatCard icon={TrendingUp} label="Unread" value={unread} color="#ffa726" href="/insights" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Recent beliefs */}
            <div className="lg:col-span-2 rounded-xl p-5" style={{ background: 'rgba(8,8,14,0.8)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-lg font-light" style={{ color: '#e8e8f0' }}>Recent Beliefs</h2>
                <Link href="/dialogue" className="text-[10px] font-mono transition-colors" style={{ color: 'rgba(79,195,247,0.6)' }}>
                  Mirror →
                </Link>
              </div>
              {beliefs.length === 0 ? (
                <p className="text-xs font-mono py-8 text-center" style={{ color: 'rgba(107,107,138,0.4)' }}>Nothing yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {beliefs.slice(0, 7).map(b => (
                    <div key={b.id} className="flex items-start gap-3 py-2.5 px-3 rounded-lg transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <div className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: CATEGORY_COLORS[b.category] }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed" style={{ color: 'rgba(180,180,210,0.8)' }}>{b.content}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-mono capitalize" style={{ color: CATEGORY_COLORS[b.category] }}>{b.category}</span>
                          <span className="text-[10px] font-mono flex items-center gap-1" style={{ color: 'rgba(107,107,138,0.45)' }}>
                            <Clock size={8} />{new Date(b.created_at).toLocaleDateString()}
                          </span>
                          <span className="text-[10px] font-mono ml-auto" style={{ color: 'rgba(107,107,138,0.4)' }}>
                            {Math.round(b.confidence_score * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Mind breakdown */}
              <div className="rounded-xl p-5" style={{ background: 'rgba(8,8,14,0.8)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h2 className="font-display text-lg font-light mb-4" style={{ color: '#e8e8f0' }}>Mind Map</h2>
                {topCategories.length === 0 ? (
                  <p className="text-xs font-mono" style={{ color: 'rgba(107,107,138,0.4)' }}>No data.</p>
                ) : topCategories.map(([cat, count]) => (
                  <div key={cat} className="mb-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] font-mono capitalize" style={{ color: CATEGORY_COLORS[cat] }}>{cat}</span>
                      <span className="text-[10px] font-mono" style={{ color: 'rgba(107,107,138,0.5)' }}>{count}</span>
                    </div>
                    <div className="h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(count / beliefs.length) * 100}%` }}
                        transition={{ duration: 0.8 }} className="h-full rounded-full"
                        style={{ background: CATEGORY_COLORS[cat] }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Latest insight */}
              <div className="rounded-xl p-5" style={{ background: 'rgba(8,8,14,0.8)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-light" style={{ color: '#e8e8f0' }}>Latest Insight</h2>
                  <Link href="/insights" className="text-[10px] font-mono" style={{ color: 'rgba(79,195,247,0.6)' }}>All →</Link>
                </div>
                {insights.length === 0 ? (
                  <div>
                    <p className="text-xs font-mono mb-3" style={{ color: 'rgba(107,107,138,0.4)' }}>No insights yet.</p>
                    <Link href="/insights" className="text-xs font-mono block text-center py-2 rounded-lg transition-all"
                      style={{ border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(107,107,138,0.6)' }}>
                      Run Analysis
                    </Link>
                  </div>
                ) : insights.slice(0, 2).map(ins => (
                  <div key={ins.id} className="mb-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded"
                        style={{ color: ins.type === 'contradiction' ? '#ff4757' : ins.type === 'bias' ? '#ffa726' : '#29b6f6',
                          background: ins.type === 'contradiction' ? 'rgba(255,71,87,0.08)' : ins.type === 'bias' ? 'rgba(255,167,38,0.08)' : 'rgba(41,182,246,0.08)' }}>
                        {ins.type}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'rgba(155,155,185,0.7)' }}>{ins.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
