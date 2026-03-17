'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { ChatMessage, Belief } from './types'

interface FeedItem {
  type: 'user' | 'ai' | 'contradiction'
  id: string
  content: string
  timestamp: string
}

interface MirrorContextType {
  feed: FeedItem[]
  setFeed: React.Dispatch<React.SetStateAction<FeedItem[]>>
  chatHistory: ChatMessage[]
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  allBeliefs: Belief[]
  setAllBeliefs: React.Dispatch<React.SetStateAction<Belief[]>>
  hasStarted: boolean
  setHasStarted: (v: boolean) => void
}

const MirrorContext = createContext<MirrorContextType | null>(null)

export function MirrorProvider({ children }: { children: ReactNode }) {
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [allBeliefs, setAllBeliefs] = useState<Belief[]>([])
  const [hasStarted, setHasStartedState] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('mirror_started')
    if (stored === 'true') setHasStartedState(true)

    const storedFeed = sessionStorage.getItem('mirror_feed')
    if (storedFeed) {
      try { setFeed(JSON.parse(storedFeed)) } catch {}
    }

    const storedHistory = sessionStorage.getItem('mirror_history')
    if (storedHistory) {
      try { setChatHistory(JSON.parse(storedHistory)) } catch {}
    }
  }, [])

  const setHasStarted = (v: boolean) => {
    setHasStartedState(v)
    sessionStorage.setItem('mirror_started', String(v))
  }

  useEffect(() => {
    if (feed.length > 0) sessionStorage.setItem('mirror_feed', JSON.stringify(feed))
  }, [feed])

  useEffect(() => {
    if (chatHistory.length > 0) sessionStorage.setItem('mirror_history', JSON.stringify(chatHistory))
  }, [chatHistory])

  return (
    <MirrorContext.Provider value={{
      feed, setFeed,
      chatHistory, setChatHistory,
      allBeliefs, setAllBeliefs,
      hasStarted, setHasStarted,
    }}>
      {children}
    </MirrorContext.Provider>
  )
}

export function useMirror() {
  const ctx = useContext(MirrorContext)
  if (!ctx) throw new Error('useMirror must be used within MirrorProvider')
  return ctx
}