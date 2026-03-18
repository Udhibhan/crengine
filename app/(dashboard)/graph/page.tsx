'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Loader2, RefreshCw, X } from 'lucide-react'

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

interface NodePos {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  r: number
  belief: Belief
}

// Simple force-directed layout computed in JS, rendered on canvas
function runLayout(beliefs: Belief[], W: number, H: number): NodePos[] {
  const nodes: NodePos[] = beliefs.map((b, i) => {
    const angle = (i / beliefs.length) * Math.PI * 2
    const spread = Math.min(W, H) * 0.3
    return {
      id: b.id,
      x: W / 2 + spread * Math.cos(angle) + (Math.random() - 0.5) * 40,
      y: H / 2 + spread * Math.sin(angle) + (Math.random() - 0.5) * 40,
      vx: 0, vy: 0,
      r: 6 + b.confidence_score * 10,
      belief: b,
    }
  })
  return nodes
}

export default function GraphPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<number>(0)
  const nodesRef = useRef<NodePos[]>([])
  const relationsRef = useRef<Relation[]>([])
  const dragRef = useRef<{ node: NodePos; ox: number; oy: number } | null>(null)
  const hoveredRef = useRef<NodePos | null>(null)

  const [beliefs, setBeliefs] = useState<Belief[]>([])
  const [relations, setRelations] = useState<Relation[]>([])
  const [selected, setSelected] = useState<Belief | null>(null)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dims, setDims] = useState({ w: 800, h: 600 })

  const loadData = useCallback(async () => {
    setLoading(true)
    const [bd, rd] = await Promise.all([
      fetch('/api/beliefs').then(r => r.json()),
      fetch('/api/contradictions').then(r => r.json()),
    ])
    const b: Belief[] = bd.beliefs || []
    const r: Relation[] = rd.relations || []
    setBeliefs(b)
    setRelations(r)
    relationsRef.current = r
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Measure container
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDims({ w: rect.width, h: rect.height })
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Init nodes when beliefs or dims change
  useEffect(() => {
    if (beliefs.length === 0) return
    nodesRef.current = runLayout(beliefs, dims.w, dims.h)
  }, [beliefs, dims])

  // Canvas draw + physics loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || beliefs.length === 0) return
    const ctx = canvas.getContext('2d')!
    let frame = 0

    const tick = () => {
      const nodes = nodesRef.current
      const rels = relationsRef.current
      const W = dims.w
      const H = dims.h

      // Physics — only run first 200 frames then settle
      if (frame < 200) {
        frame++
        const k = Math.sqrt((W * H) / Math.max(nodes.length, 1)) * 0.8
        const repulsion = k * k

        // Repulsion between all pairs
        for (let i = 0; i < nodes.length; i++) {
          nodes[i].vx = 0
          nodes[i].vy = 0
          for (let j = 0; j < nodes.length; j++) {
            if (i === j) continue
            const dx = nodes[i].x - nodes[j].x
            const dy = nodes[i].y - nodes[j].y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const force = repulsion / dist
            nodes[i].vx += (dx / dist) * force * 0.015
            nodes[i].vy += (dy / dist) * force * 0.015
          }
        }

        // Attraction along edges
        const nodeMap = new Map(nodes.map(n => [n.id, n]))
        for (const rel of rels) {
          const a = nodeMap.get(rel.belief_id_1)
          const b = nodeMap.get(rel.belief_id_2)
          if (!a || !b) continue
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const target = k * 1.5
          const force = (dist - target) * 0.03
          a.vx += (dx / dist) * force
          a.vy += (dy / dist) * force
          b.vx -= (dx / dist) * force
          b.vy -= (dy / dist) * force
        }

        // Center gravity
        for (const n of nodes) {
          n.vx += (W / 2 - n.x) * 0.004
          n.vy += (H / 2 - n.y) * 0.004
        }

        // Apply velocity with damping (skip dragged node)
        for (const n of nodes) {
          if (dragRef.current?.node.id === n.id) continue
          n.x += n.vx * 0.6
          n.y += n.vy * 0.6
          // Keep in bounds
          n.x = Math.max(n.r + 10, Math.min(W - n.r - 10, n.x))
          n.y = Math.max(n.r + 10, Math.min(H - n.r - 10, n.y))
        }
      }

      // Draw
      ctx.clearRect(0, 0, W, H)

      // Draw edges
      const nodeMap = new Map(nodes.map(n => [n.id, n]))
      for (const rel of rels) {
        const a = nodeMap.get(rel.belief_id_1)
        const b = nodeMap.get(rel.belief_id_2)
        if (!a || !b) continue
        const color = LINK_COLORS[rel.relation_type] || '#4fc3f7'
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = color + '55'
        ctx.lineWidth = Math.max(0.5, rel.strength_score * 2)
        ctx.stroke()

        // Arrow at midpoint
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        ctx.beginPath()
        ctx.arc(mx, my, 2, 0, Math.PI * 2)
        ctx.fillStyle = color + '88'
        ctx.fill()
      }

      // Draw nodes
      for (const n of nodes) {
        const color = CAT_COLORS[n.belief.category] || '#78909c'
        const isHovered = hoveredRef.current?.id === n.id
        const isSelected = selected?.id === n.id

        // Glow
        if (isHovered || isSelected) {
          const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 3)
          g.addColorStop(0, color + '35')
          g.addColorStop(1, 'transparent')
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2)
          ctx.fillStyle = g
          ctx.fill()
        }

        // Circle
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = isSelected ? color : color + 'bb'
        ctx.fill()
        ctx.strokeStyle = isSelected ? '#ffffffaa' : color + '44'
        ctx.lineWidth = isSelected ? 1.5 : 0.8
        ctx.stroke()

        // Label
        if (isHovered || isSelected || nodes.length <= 8) {
          const label = n.belief.content.length > 32 ? n.belief.content.slice(0, 32) + '…' : n.belief.content
          ctx.font = '10px monospace'
          ctx.textAlign = 'center'
          ctx.fillStyle = 'rgba(220,220,235,0.85)'
          ctx.fillText(label, n.x, n.y + n.r + 13)
        }
      }

      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [beliefs, relations, dims, selected])

  // Mouse events
  const getNodeAt = (cx: number, cy: number): NodePos | null => {
    for (const n of nodesRef.current) {
      const dx = cx - n.x
      const dy = cy - n.y
      if (Math.sqrt(dx * dx + dy * dy) <= n.r + 4) return n
    }
    return null
  }

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasPos(e)
    if (dragRef.current) {
      dragRef.current.node.x = x
      dragRef.current.node.y = y
      return
    }
    const node = getNodeAt(x, y)
    hoveredRef.current = node
    if (canvasRef.current) canvasRef.current.style.cursor = node ? 'pointer' : 'default'
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasPos(e)
    const node = getNodeAt(x, y)
    if (node) dragRef.current = { node, ox: x - node.x, oy: y - node.y }
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasPos(e)
    if (dragRef.current) {
      const dist = Math.sqrt((x - dragRef.current.node.x) ** 2 + (y - dragRef.current.node.y) ** 2)
      if (dist < 5) {
        // It was a click not a drag
        setSelected(prev => prev?.id === dragRef.current!.node.id ? null : dragRef.current!.node.belief)
      }
      dragRef.current = null
    } else {
      const node = getNodeAt(x, y)
      if (!node) setSelected(null)
    }
  }

  const deleteBelief = async (id: string) => {
    setDeletingId(id)
    const res = await fetch('/api/beliefs/' + id, { method: 'DELETE' })
    if (res.ok) {
      setBeliefs(prev => prev.filter(b => b.id !== id))
      nodesRef.current = nodesRef.current.filter(n => n.id !== id)
      relationsRef.current = relationsRef.current.filter(r => r.belief_id_1 !== id && r.belief_id_2 !== id)
      setRelations(prev => prev.filter(r => r.belief_id_1 !== id && r.belief_id_2 !== id))
      if (selected?.id === id) setSelected(null)
    }
    setDeletingId(null)
  }

  return (
    <div style={{ paddingLeft: 'calc(56px + 3vw)', paddingRight: '3vw', paddingTop: '48px', paddingBottom: '24px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-end justify-between shrink-0">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: 'rgba(107,107,138,0.45)' }}>Belief Map</p>
          <h1 className="font-display font-light" style={{ fontSize: '2.5rem', color: '#e8e8f0' }}>Your Mind</h1>
          <p className="text-[10px] font-mono mt-1" style={{ color: 'rgba(107,107,138,0.4)' }}>
            {beliefs.length} beliefs · {relations.length} connections · drag nodes · click to inspect
          </p>
        </div>
        <button onClick={loadData} className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg"
          style={{ color: 'rgba(107,107,138,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <RefreshCw size={11} /> Refresh
        </button>
      </motion.div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-3 shrink-0">
        {Object.entries(LINK_COLORS).map(([rel, color]) => (
          <div key={rel} className="flex items-center gap-1.5">
            <div className="w-4 h-px" style={{ background: color }} />
            <span className="text-[10px] font-mono" style={{ color }}>{rel.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Canvas */}
        <div ref={containerRef} className="flex-1 rounded-2xl overflow-hidden relative"
          style={{ background: 'rgba(4,4,9,0.92)', border: '1px solid rgba(255,255,255,0.05)' }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 size={20} className="text-electric animate-spin" />
              <span className="text-xs font-mono" style={{ color: 'rgba(107,107,138,0.4)' }}>Building graph...</span>
            </div>
          ) : beliefs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <p className="text-sm font-mono" style={{ color: 'rgba(107,107,138,0.4)' }}>No beliefs yet. Write in the Mirror first.</p>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              width={dims.w}
              height={dims.h}
              style={{ width: '100%', height: '100%', display: 'block' }}
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { dragRef.current = null; hoveredRef.current = null }}
            />
          )}
        </div>

        {/* Right panel — selected node OR belief list */}
        <div className="w-64 shrink-0 flex flex-col gap-3">
          {/* Selected node */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                className="rounded-2xl p-4"
                style={{ background: 'rgba(5,5,11,0.98)', border: `1px solid ${CAT_COLORS[selected.category]}25` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: CAT_COLORS[selected.category] }} />
                    <span className="text-[10px] font-mono capitalize" style={{ color: CAT_COLORS[selected.category] }}>{selected.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => deleteBelief(selected.id)}
                      disabled={deletingId === selected.id}
                      className="transition-colors"
                      style={{ color: 'rgba(255,71,87,0.5)' }}
                    >
                      {deletingId === selected.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                    <button onClick={() => setSelected(null)} style={{ color: 'rgba(107,107,138,0.4)' }}><X size={12} /></button>
                  </div>
                </div>
                <p style={{ color: '#d0d0e0', fontSize: '13px', lineHeight: 1.7, fontFamily: 'var(--font-display)' }}>
                  {selected.content}
                </p>
                <div className="mt-3 space-y-1.5 text-[10px] font-mono">
                  <div className="flex justify-between">
                    <span style={{ color: 'rgba(107,107,138,0.5)' }}>confidence</span>
                    <span style={{ color: '#e8e8f0' }}>{Math.round(selected.confidence_score * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'rgba(107,107,138,0.5)' }}>connections</span>
                    <span style={{ color: '#e8e8f0' }}>
                      {relations.filter(r => r.belief_id_1 === selected.id || r.belief_id_2 === selected.id).length}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* All beliefs list with delete */}
          <div className="flex-1 rounded-2xl overflow-hidden"
            style={{ background: 'rgba(5,5,11,0.9)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(107,107,138,0.45)' }}>
                All Beliefs ({beliefs.length})
              </span>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100% - 40px)' }}>
              {beliefs.map(b => (
                <div
                  key={b.id}
                  className="flex items-start gap-2 px-3 py-2.5 group cursor-pointer transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                  onClick={() => setSelected(prev => prev?.id === b.id ? null : b)}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: CAT_COLORS[b.category] }} />
                  <p className="flex-1 text-[11px] leading-relaxed" style={{ color: selected?.id === b.id ? '#e8e8f0' : 'rgba(155,155,185,0.65)' }}>
                    {b.content.length > 60 ? b.content.slice(0, 60) + '…' : b.content}
                  </p>
                  <button
                    onClick={e => { e.stopPropagation(); deleteBelief(b.id) }}
                    disabled={deletingId === b.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                    style={{ color: 'rgba(255,71,87,0.5)' }}
                  >
                    {deletingId === b.id ? <Loader2 size={9} className="animate-spin" /> : <Trash2 size={9} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}