'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { Belief, GraphNode, GraphLink } from '@/lib/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ForceGraph2D: any = null

const CATEGORY_COLORS: Record<string, string> = {
  philosophy: '#ab47bc', identity: '#29b6f6', habit: '#66bb6a',
  relationships: '#ef5350', career: '#ffa726', worldview: '#7e57c2',
  ethics: '#26c6da', emotion: '#ec407a', general: '#78909c',
}

const RELATION_COLORS: Record<string, string> = {
  supports: '#2ecc71',
  contradicts: '#ff4757',
  evolves_from: '#f39c12',
}

interface BeliefRelation {
  id: string
  belief_id_1: string
  belief_id_2: string
  relation_type: string
  strength_score: number
  explanation?: string
}

export default function GraphPage() {
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] })
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [graphLoaded, setGraphLoaded] = useState(false)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const graphRef = useRef(null)

  useEffect(() => {
    import('react-force-graph-2d').then(mod => {
      ForceGraph2D = mod.default
      setGraphLoaded(true)
    })
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/api/beliefs').then(r => r.json()),
      fetch('/api/contradictions').then(r => r.json()),
    ]).then(([beliefsData, relationsData]) => {
      const beliefs: Belief[] = beliefsData.beliefs || []
      const relations: BeliefRelation[] = relationsData.relations || []

      const nodes: GraphNode[] = beliefs.map(b => ({
        id: b.id,
        content: b.content,
        category: b.category as GraphNode['category'],
        confidence_score: b.confidence_score,
        val: 2 + b.confidence_score * 8,
        color: CATEGORY_COLORS[b.category] || '#78909c',
      }))

      // Build a set of valid node IDs
      const nodeIds = new Set(nodes.map(n => n.id))

      const links: GraphLink[] = relations
        .filter(r => nodeIds.has(r.belief_id_1) && nodeIds.has(r.belief_id_2))
        .map(r => ({
          source: r.belief_id_1,
          target: r.belief_id_2,
          relation_type: r.relation_type as GraphLink['relation_type'],
          strength_score: r.strength_score,
          color: RELATION_COLORS[r.relation_type] || '#4fc3f7',
        }))

      setGraphData({ nodes, links })
      setLoading(false)
    })
  }, [])

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node)
  }, [])

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredNode(node)
    if (typeof document !== 'undefined') {
      document.body.style.cursor = node ? 'pointer' : 'default'
    }
  }, [])

  const paintNode = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D) => {
    const color = CATEGORY_COLORS[node.category] || '#78909c'
    const r = 3 + (node.confidence_score || 0.5) * 7
    const isSelected = selectedNode?.id === node.id
    const isHovered = hoveredNode?.id === node.id

    if (isSelected || isHovered) {
      const g = ctx.createRadialGradient(node.x || 0, node.y || 0, 0, node.x || 0, node.y || 0, r * 3.5)
      g.addColorStop(0, color + '45')
      g.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(node.x || 0, node.y || 0, r * 3.5, 0, Math.PI * 2)
      ctx.fillStyle = g
      ctx.fill()
    }

    ctx.beginPath()
    ctx.arc(node.x || 0, node.y || 0, r, 0, Math.PI * 2)
    ctx.fillStyle = isSelected ? color : color + 'bb'
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = isSelected ? 2 : 0.8
    ctx.stroke()

    if (isHovered || isSelected) {
      const label = node.content.length > 35 ? node.content.slice(0, 35) + '...' : node.content
      ctx.font = '3.5px var(--font-mono, monospace)'
      ctx.fillStyle = 'rgba(232,232,240,0.9)'
      ctx.textAlign = 'center'
      ctx.fillText(label, node.x || 0, (node.y || 0) + r + 7)
    }
  }, [selectedNode, hoveredNode])

  const isReady = !loading && graphLoaded

  return (
    <div style={{ paddingLeft: 'calc(56px + 3vw)', paddingRight: '3vw', paddingTop: '48px', paddingBottom: '48px', minHeight: '100vh' }}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <p className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'rgba(107,107,138,0.45)' }}>Belief Map</p>
        <h1 className="font-display font-light" style={{ fontSize: '3rem', color: '#e8e8f0' }}>Your Mind, Mapped</h1>
        <p className="text-xs font-mono mt-1" style={{ color: 'rgba(107,107,138,0.5)' }}>
          Nodes = beliefs · size = confidence · red edges = contradictions
        </p>
      </motion.div>

      {/* Legend */}
      <div className="flex flex-wrap gap-5 mb-5">
        {Object.entries(RELATION_COLORS).map(([rel, color]) => (
          <div key={rel} className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 rounded" style={{ background: color }} />
            <span className="text-[10px] font-mono" style={{ color }}>{rel.replace('_', ' ')}</span>
          </div>
        ))}
        <div className="flex flex-wrap gap-3 ml-4">
          {Object.entries(CATEGORY_COLORS).slice(0, 4).map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-[10px] font-mono" style={{ color: 'rgba(107,107,138,0.6)' }}>{cat}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Graph */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="flex-1 rounded-2xl overflow-hidden"
          style={{ height: 'calc(100vh - 280px)', background: 'rgba(5,5,10,0.8)', border: '1px solid rgba(255,255,255,0.05)', minHeight: '400px' }}
        >
          {!isReady ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-6 h-6 border border-electric/30 border-t-electric rounded-full animate-spin" />
              <span className="text-xs font-mono" style={{ color: 'rgba(107,107,138,0.4)' }}>Building graph...</span>
            </div>
          ) : graphData.nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <p className="text-sm font-mono mb-2" style={{ color: 'rgba(107,107,138,0.5)' }}>No beliefs to visualize yet.</p>
              <p className="text-xs font-mono" style={{ color: 'rgba(107,107,138,0.35)' }}>Add beliefs in the Mirror first.</p>
            </div>
          ) : (
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              width={undefined}
              height={undefined}
              backgroundColor="transparent"
              nodeCanvasObject={paintNode}
              nodeCanvasObjectMode={() => 'replace'}
              onNodeClick={handleNodeClick}
              onNodeHover={handleNodeHover}
              linkColor={(link: GraphLink) => RELATION_COLORS[link.relation_type] || '#4fc3f7'}
              linkWidth={(link: GraphLink) => Math.max(0.5, (link.strength_score || 0.5) * 2)}
              linkOpacity={0.5}
              linkDirectionalParticles={1}
              linkDirectionalParticleWidth={1}
              linkDirectionalParticleColor={(link: GraphLink) => RELATION_COLORS[link.relation_type] || '#4fc3f7'}
              cooldownTicks={80}
              d3AlphaDecay={0.03}
              d3VelocityDecay={0.4}
              enableZoomInteraction={true}
              enablePanInteraction={true}
            />
          )}
        </motion.div>

        {/* Selected node panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
              className="w-64 rounded-2xl p-5 h-fit self-start"
              style={{ background: 'rgba(6,6,12,0.95)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-2 h-2 rounded-full mt-1" style={{ background: CATEGORY_COLORS[selectedNode.category] }} />
                <button onClick={() => setSelectedNode(null)} style={{ color: 'rgba(107,107,138,0.4)' }}><X size={12} /></button>
              </div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: '#d8d8e8' }}>{selectedNode.content}</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[10px] font-mono" style={{ color: 'rgba(107,107,138,0.5)' }}>category</span>
                  <span className="text-[10px] font-mono capitalize" style={{ color: CATEGORY_COLORS[selectedNode.category] }}>{selectedNode.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] font-mono" style={{ color: 'rgba(107,107,138,0.5)' }}>confidence</span>
                  <span className="text-[10px] font-mono" style={{ color: '#e8e8f0' }}>{Math.round(selectedNode.confidence_score * 100)}%</span>
                </div>
                <div className="mt-2 h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${selectedNode.confidence_score * 100}%`, background: CATEGORY_COLORS[selectedNode.category] }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}