export type BeliefCategory =
  | 'philosophy'
  | 'identity'
  | 'habit'
  | 'relationships'
  | 'career'
  | 'worldview'
  | 'ethics'
  | 'emotion'
  | 'general'

export type RelationType = 'supports' | 'contradicts' | 'evolves_from'
export type InsightType = 'contradiction' | 'bias' | 'pattern'
export type SeverityLevel = 'low' | 'medium' | 'high'

export interface Belief {
  id: string
  user_id: string
  content: string
  category: BeliefCategory
  confidence_score: number
  raw_input?: string
  created_at: string
  updated_at: string
}

export interface BeliefRelation {
  id: string
  belief_id_1: string
  belief_id_2: string
  relation_type: RelationType
  strength_score: number
  explanation?: string
  created_at: string
}

export interface Insight {
  id: string
  user_id: string
  type: InsightType
  description: string
  severity: SeverityLevel
  related_belief_ids: string[]
  is_read: boolean
  created_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  messages: ChatMessage[]
  created_at: string
  updated_at: string
}

// Graph visualization types
export interface GraphNode {
  id: string
  content: string
  category: BeliefCategory
  confidence_score: number
  // react-force-graph fields
  val?: number
  color?: string
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

export interface GraphLink {
  source: string
  target: string
  relation_type: RelationType
  strength_score: number
  color?: string
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

// AI response types
export interface ExtractedBelief {
  content: string
  category: BeliefCategory
  confidence_score: number
}

export interface ContradictionResult {
  belief_id: string
  belief_content: string
  contradiction_score: number
  explanation: string
}

export interface ContradictionAnalysis {
  has_contradiction: boolean
  contradictions: ContradictionResult[]
}

export interface AIInsight {
  type: InsightType
  description: string
  severity: SeverityLevel
  related_belief_ids: string[]
}

// Dashboard stats
export interface DashboardStats {
  totalBeliefs: number
  totalInsights: number
  totalContradictions: number
  categoryBreakdown: Record<BeliefCategory, number>
  recentBeliefs: Belief[]
  unreadInsights: number
}
