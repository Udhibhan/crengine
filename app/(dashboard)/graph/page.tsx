'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Network, Info, X } from 'lucide-react'
import type { Belief, GraphData, GraphNode, GraphLink } from '@/lib/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ForceGraph2D: any = null

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
}

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [graphLoaded, setGraphLoaded] = useState(false)
  const graphRef = useRef(null)

  useEffect(() => {
    import('react-force-graph-2d').then((mod) => {
      ForceGraph2D = mod.default
      setGraphLoaded(true)
    })
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/api/beliefs').then((r) => r.json()),
      fetch('/api/contradictions').then((r) => r.json()),
    ]).then(([beliefsData, relationsData]) => {
      const beliefs: Belief[] = beliefsData.beliefs || []
      const relations: BeliefRelation[] = relationsData.relations || []

      const nodes: GraphNode[] = beliefs.map((b) => ({
        id: b.id,
        content: b.content,
        category: b.category as GraphNode['category'],
        confidence_score: b.confidence_score,
        val: 3 + b.confidence_score * 5,
        color: CATEGORY_COLORS[b.category] || '#78909c',
      }))

      const links: GraphLink[] = relations.map((r) => ({
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
    setSelectedNode(node)
  }, [])

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredNode(node)
    if (typeof document !== 'undefined') {
      document.body.style.cursor = node ? 'pointer' : 'default'
    }
  }, [])

  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D) => {
      const color = CATEGORY_COLORS[node.category] || '#78909c'
      const radius = 4 + (node.confidence_score || 0.5) * 6
      const isSelected = selectedNode?.id === node.id
      const isHovered = hoveredNode?.id === node.id

      if (isSelected || isHovered) {
        const gradient = ctx.createRadialGradient(
          node.x || 0, node.y || 0, 0,
          node.x || 0, node.y || 0, radius * 3
        )
        gradient.addColorStop(0, `${color}50`)
        gradient.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(node.x || 0, node.y || 0, radius * 3, 0, 2 * Math.PI)
        ctx.fillStyle = gradient
        ctx.fill()
      }

      ctx.beginPath()
      ctx.arc(node.x || 0, node.y || 0, radius, 0, 2 * Math.PI)
      ctx.fillStyle = isSelected ? color : `${color}99`
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = isSelected ? 2 : 1
      ctx.stroke()

      if (isHovered || isSelected) {
        const text = node.content.length > 40 ? node.content.slice(0, 40) + '...' : node.content
        ctx.font = '4px sans-serif'
        ctx.fillStyle = '#e8e8f0'
        ctx.textAlign = 'center'
        ctx.fillText(text, node.x || 0, (node.y || 0) + radius + 8)
      }
    },
    [selectedNode, hoveredNode]
  )

  const isReady = !loading && graphLoaded

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Network size={14} className="text-electric" />
          <span className="text-electric text-xs font-mono uppercase tracking-widest">Belief Graph</span>
        </div>
        <h1 className="font-display text-5xl text-bright font-light">Your Mind, Mapped</h1>
        <p className="text-dim text-sm mt-2">
          Each node is a belief. Each edge is a relationship. Red edges = contradictions.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-4 mb-4"
      >
        <div className="flex items-center gap-4">
          <span className="text-ghost text-xs font-mono">Edges:</span>
          {Object.entries(RELATION_COLORS).map(([rel, color]) => (
            <div key={rel} className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 rounded" style={{ background: color }} />
              <span className="text-xs font-mono" style={{ color }}>
                {rel.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="flex gap-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex-1 glass rounded-2xl overflow-hidden"
          style={{ height: '70vh' }}
        >
          {!isReady ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-electric/30 border-t-electric rounded-full animate-spin" />
                <span className="text-dim text-xs font-mono">Building belief graph...</span>
              </div>
            </div>
          ) : graphData.nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Network size={40} className="text-ghost opacity-20 mb-3" />
              <p className="text-ghost text-sm">No beliefs to visualize yet.</p>
              <p className="text-dim text-xs font-mono mt-1">Add at least 3 beliefs to see the graph.</p>
            </div>
          ) : (
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              backgroundColor="transparent"
              nodeCanvasObject={paintNode}
              nodeCanvasObjectMode={() => 'replace'}
              onNodeClick={handleNodeClick}
              onNodeHover={handleNodeHover}
              linkColor={(link: GraphLink) => RELATION_COLORS[link.relation_type] || '#4fc3f7'}
              linkWidth={(link: GraphLink) => (link.strength_score || 0.5) * 2}
              linkOpacity={0.6}
              linkDirectionalParticles={2}
              linkDirectionalParticleWidth={1.5}
              linkDirectionalParticleColor={(link: GraphLink) => RELATION_COLORS[link.relation_type] || '#4fc3f7'}
              cooldownTicks={100}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
            />
          )}
        </motion.div>

        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-72 glass rounded-2xl p-6 h-fit self-start sticky top-0"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Info size={14} className="text-electric" />
                  <span className="text-electric text-xs font-mono uppercase tracking-widest">Belief</span>
                </div>
                <button onClick={() => setSelectedNode(null)} className="text-ghost hover:text-pale transition-colors">
                  <X size={14} />
                </button>
              </div>
              <p className="text-bright text-sm leading-relaxed mb-4">{selectedNode.content}</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-ghost text-xs font-mono">Category</span>
                  <span className="text-xs font-mono capitalize" style={{ color: CATEGORY_COLORS[selectedNode.category] || '#78909c' }}>
                    {selectedNode.category}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ghost text-xs font-mono">Confidence</span>
                  <span className="text-pale text-xs font-mono">{Math.round(selectedNode.confidence_score * 100)}%</span>
                </div>
                <div className="mt-3">
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${selectedNode.confidence_score * 100}%`,
                        background: `linear-gradient(90deg, ${CATEGORY_COLORS[selectedNode.category]}80, ${CATEGORY_COLORS[selectedNode.category]})`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
