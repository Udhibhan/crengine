'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RefreshCw } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ForceGraph2D: any = null

const CAT_COLORS: Record<string, string> = {
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

const LINK_COLORS: Record<string, string> = {
  supports: '#2ecc71',
  contradicts: '#ff4757',
  evolves_from: '#f39c12',
}

interface Node {
  id: string
  content: string
  category: string
  confidence_score: number
  x?: number
  y?: number
}

interface Link {
  source: string | Node
  target: string | Node
  relation_type: string
  strength_score: number
}

interface Belief {
  id: string
  content: string
  category: string
  confidence_score: number
}

interface Relation {
  id: string
  belief_id_1: string
  belief_id_2: string
  relation_type: string
  strength_score: number
  explanation?: string
}

export default function GraphPage() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const [selected, setSelected] = useState<Node | null>(null)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [hovered, setHovered] = useState<Node | null>(null)
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 })
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef(null)

  // Load ForceGraph client-side only
  useEffect(() => {
    import('react-force-graph-2d').then(mod => {
      ForceGraph2D = mod.default
      setReady(true)
    })
  }, [])

  // Measure container
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setDimensions({
          w: containerRef.current.offsetWidth,
          h: containerRef.current.offsetHeight,
        })
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/beliefs').then(r => r.json()),
      fetch('/api/contradictions').then(r => r.json()),
    ]).then(([bd, rd]) => {
      const beliefs: Belief[] = bd.beliefs || []
      const relations: Relation[] = rd.relations || []

      const nodeMap = new Map(beliefs.map(b => [b.id, true]))

      const graphNodes: Node[] = beliefs.map(b => ({
        id: b.id,
        content: b.content,
        category: b.category,
        confidence_score: b.confidence_score,
      }))

      // Only include links where both nodes exist
      const graphLinks: Link[] = relations
        .filter(r => nodeMap.has(r.belief_id_1) && nodeMap.has(r.belief_id_2) && r.belief_id_1 !== r.belief_id_2)
        .map(r => ({
          source: r.belief_id_1,
          target: r.belief_id_2,
          relation_type: r.relation_type,
          strength_score: r.strength_score,
        }))

      setNodes(graphNodes)
      setLinks(graphLinks)
      setLoading(false)
    })
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const paintNode = useCallback((node: Node, ctx: CanvasRenderingContext2D) => {
    const color = CAT_COLORS[node.category] || '#78909c'
    const r = 4 + node.confidence_score * 8
    const isSelected = selected?.id === node.id
    const isHovered = hovered?.id === node.id

    // Glow
    if (isSelected || isHovered) {
      const g = ctx.createRadialGradient(node.x!, node.y!, 0, node.x!, node.y!, r * 4)
      g.addColorStop(0, color + '40')
      g.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(node.x!, node.y!, r * 4, 0, Math.PI * 2)
      ctx.fillStyle = g
      ctx.fill()
    }

    // Node
    ctx.beginPath()
    ctx.arc(node.x!, node.y!, r, 0, Math.PI * 2)
    ctx.fillStyle = isSelected ? color : color + 'cc'
    ctx.fill()
    ctx.strokeStyle = isSelected ? '#ffffff44' : color + '66'
    ctx.lineWidth = isSelected ? 1.5 : 0.5
    ctx.stroke()

    // Label on hover/select
    if (isHovered || isSelected) {
      const text = node.content.length > 40 ? node.content.slice(0, 40) + '…' : node.content
      ctx.font = '3.8px monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(220,220,235,0.9)'
      ctx.fillText(text, node.x!, node.y! + r + 7)
    }
  }, [selected, hovered])

  return (
    <div style={{ paddingLeft: 'calc(56px + 3vw)', paddingRight: '3vw', paddingTop: '48px', paddingBottom: '48px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'rgba(107,107,138,0.45)' }}>Belief Map</p>
          <h1 className="font-display font-light" style={{ fontSize: '2.8rem', color: '#e8e8f0' }}>Your Mind</h1>
          <p className="text-xs font-mono mt-1" style={{ color: 'rgba(107,107,138,0.45)' }}>
            {nodes.length} beliefs · {links.length} connections
          </p>
        </div>
        <button onClick={loadData} className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg transition-all"
          style={{ color: 'rgba(107,107,138,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <RefreshCw size={11} /> Refresh
        </button>
      </motion.div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        {Object.entries(LINK_COLORS).map(([rel, color]) => (
          <div key={rel} className="flex items-center gap-1.5">
            <div className="w-4 h-px" style={{ background: color }} />
            <span className="text-[10px] font-mono" style={{ color }}>{rel.replace('_', ' ')}</span>
          </div>
        ))}
        <span style={{ color: 'rgba(107,107,138,0.35)', fontSize: '10px', fontFamily: 'monospace' }}>· node size = confidence</span>
      </div>

      <div className="flex gap-4 flex-1">
        {/* Graph container */}
        <div
          ref={containerRef}
          className="flex-1 rounded-2xl overflow-hidden"
          style={{ background: 'rgba(4,4,9,0.9)', border: '1px solid rgba(255,255,255,0.05)', minHeight: '500px', height: 'calc(100vh - 300px)' }}
        >
          {loading || !ready ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-5 h-5 border border-electric/30 border-t-electric rounded-full animate-spin" />
              <span className="text-xs font-mono" style={{ color: 'rgba(107,107,138,0.4)' }}>
                {!ready ? 'Loading graph engine...' : 'Building your belief map...'}
              </span>
            </div>
          ) : nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <p className="text-sm font-mono mb-2" style={{ color: 'rgba(107,107,138,0.5)' }}>No beliefs mapped yet.</p>
              <p className="text-xs font-mono" style={{ color: 'rgba(107,107,138,0.3)' }}>Write some thoughts in the Mirror first.</p>
            </div>
          ) : (
            <ForceGraph2D
              ref={graphRef}
              graphData={{ nodes, links }}
              width={dimensions.w}
              height={dimensions.h}
              backgroundColor="transparent"
              nodeCanvasObject={paintNode}
              nodeCanvasObjectMode={() => 'replace'}
              onNodeClick={(node: Node) => setSelected(prev => prev?.id === node.id ? null : node)}
              onNodeHover={(node: Node | null) => {
                setHovered(node)
                document.body.style.cursor = node ? 'pointer' : 'default'
              }}
              onBackgroundClick={() => setSelected(null)}
              linkColor={(link: Link) => LINK_COLORS[link.relation_type] || '#4fc3f7'}
              linkWidth={(link: Link) => Math.max(0.3, link.strength_score * 1.5)}
              linkOpacity={0.5}
              linkDirectionalParticles={1}
              linkDirectionalParticleWidth={(link: Link) => link.relation_type === 'contradicts' ? 2 : 1}
              linkDirectionalParticleColor={(link: Link) => LINK_COLORS[link.relation_type] || '#4fc3f7'}
              nodeRelSize={1}
              d3AlphaDecay={0.025}
              d3VelocityDecay={0.35}
              cooldownTicks={120}
              warmupTicks={30}
            />
          )}
        </div>

        {/* Selected node detail */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
              className="w-56 rounded-2xl p-4 h-fit self-start shrink-0"
              style={{ background: 'rgba(5,5,11,0.98)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: CAT_COLORS[selected.category] }} />
                <button onClick={() => setSelected(null)} style={{ color: 'rgba(107,107,138,0.4)' }}><X size={11} /></button>
              </div>
              <p className="text-xs leading-relaxed mb-4" style={{ color: '#d0d0e0', fontFamily: 'var(--font-display)', fontSize: '13px', lineHeight: 1.7 }}>
                {selected.content}
              </p>
              <div className="space-y-1.5 text-[10px] font-mono">
                <div className="flex justify-between">
                  <span style={{ color: 'rgba(107,107,138,0.5)' }}>category</span>
                  <span style={{ color: CAT_COLORS[selected.category] }}>{selected.category}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'rgba(107,107,138,0.5)' }}>confidence</span>
                  <span style={{ color: '#e8e8f0' }}>{Math.round(selected.confidence_score * 100)}%</span>
                </div>
                <div className="mt-2 h-px rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full" style={{ width: `${selected.confidence_score * 100}%`, background: CAT_COLORS[selected.category] }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span style={{ color: 'rgba(107,107,138,0.5)' }}>connections</span>
                  <span style={{ color: '#e8e8f0' }}>
                    {links.filter(l => {
                      const s = typeof l.source === 'object' ? (l.source as Node).id : l.source
                      const t = typeof l.target === 'object' ? (l.target as Node).id : l.target
                      return s === selected.id || t === selected.id
                    }).length}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}