// src/contexts/TimelineContext.tsx
'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'

export interface TimelineEvent {
  id: string
  createdAt: Date
  role: 'user' | 'assistant' | 'system'
  contentPreview: string
  threadId: string
  threadLabel: string
  userId: string
  userName?: string
}

export type ZoomLevel = 'year' | 'month' | 'week' | 'day'

interface TimelineRange {
  start: Date
  end: Date
}

interface TimelineContextType {
  // État
  events: TimelineEvent[]
  zoomLevel: ZoomLevel
  viewRange: TimelineRange
  isLoading: boolean
  
  // Actions
  setZoomLevel: (level: ZoomLevel) => void
  setViewRange: (range: TimelineRange) => void
  loadEvents: (range: TimelineRange, zoom: ZoomLevel) => Promise<void>
  clearEvents: () => void
  
  // UI sidebar
  isTimelineOpen: boolean
  toggleTimeline: () => void
  openTimeline: () => void
  closeTimeline: () => void
}

const TimelineContext = createContext<TimelineContextType | undefined>(undefined)

// Cache LRU simple (max 5 plages)
const CACHE_MAX_SIZE = 5
const cache = new Map<string, TimelineEvent[]>()

function generateCacheKey(range: TimelineRange, zoom: ZoomLevel): string {
  return `${zoom}:${range.start.toISOString()}:${range.end.toISOString()}`
}

export function TimelineProvider({ children }: { children: ReactNode }) {
  // État
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('month')
  const [viewRange, setViewRange] = useState<TimelineRange>(() => {
    const end = new Date()
    const start = new Date()
    start.setMonth(start.getMonth() - 1) // Dernier mois par défaut
    return { start, end }
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isTimelineOpen, setIsTimelineOpen] = useState(false)

  // Chargement avec cache
  const loadEvents = useCallback(async (range: TimelineRange, zoom: ZoomLevel) => {
  console.log('🚀 [TIMELINE] loadEvents CALLED', { 
    range: {
      start: range.start.toISOString(), 
      end: range.end.toISOString() 
    }, 
    zoom 
  })
  
  const cacheKey = generateCacheKey(range, zoom)
  
  // Check cache
  if (cache.has(cacheKey)) {
    console.log('📦 [TIMELINE] Using cache')
    setEvents(cache.get(cacheKey)!)
    return
  }

  setIsLoading(true)
  try {
    // API call avec paramètres encodés
    const params = new URLSearchParams({
      start: range.start.toISOString(),
      end: range.end.toISOString(),
      zoom: zoom,
      limit: '100' // Limite par défaut
    })

    const response = await fetch(`/api/timeline/events?${params}`)
    
    if (!response.ok) {
      throw new Error(`Failed to load events: ${response.status}`)
    }
    
    const data = await response.json()
    
    // S'assurer que data.events existe
    if (!data.events || !Array.isArray(data.events)) {
      throw new Error('Invalid response format')
    }
    
    const timelineEvents: TimelineEvent[] = data.events.map((e: any) => ({
      id: e.id || '',
      createdAt: new Date(e.createdAt || Date.now()),
      role: (e.role === 'user' || e.role === 'assistant' || e.role === 'system') 
        ? e.role 
        : 'system',
      contentPreview: e.contentPreview || '',
      threadId: e.threadId || '',
      threadLabel: e.threadLabel || 'Unknown',
      userId: e.userId || '',
      userName: e.userName || undefined
    }))

    // Mettre en cache
    if (cache.size >= CACHE_MAX_SIZE) {
      const firstKey = cache.keys().next().value
      if (firstKey) cache.delete(firstKey)
    }
    cache.set(cacheKey, timelineEvents)
    
    setEvents(timelineEvents)
  } catch (error) {
    console.error('Error loading timeline events:', error)
    setEvents([])
  } finally {
    setIsLoading(false)
  }
}, [])

  const clearEvents = useCallback(() => {
    setEvents([])
    cache.clear()
  }, [])

  // UI controls
  const toggleTimeline = useCallback(() => setIsTimelineOpen(prev => !prev), [])
  const openTimeline = useCallback(() => setIsTimelineOpen(true), [])
  const closeTimeline = useCallback(() => setIsTimelineOpen(false), [])


useEffect(() => {
    console.log('⚡ [TIMELINE] Provider mounted - Loading initial data')
    loadEvents(viewRange, zoomLevel)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps


  const value: TimelineContextType = {
    events,
    zoomLevel,
    viewRange,
    isLoading,
    setZoomLevel,
    setViewRange,
    loadEvents,
    clearEvents,
    isTimelineOpen,
    toggleTimeline,
    openTimeline,
    closeTimeline
  }

  return (
    <TimelineContext.Provider value={value}>
      {children}
    </TimelineContext.Provider>
  )
}

export function useTimeline() {
  const context = useContext(TimelineContext)
  if (context === undefined) {
    throw new Error('useTimeline must be used within a TimelineProvider')
  }
  return context
}