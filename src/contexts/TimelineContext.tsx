// src/contexts/TimelineContext.tsx
'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react'

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
export type DensityLevel = 0 | 1 | 2 | 3 | 4  // 0 = détaillé, 4 = ultra-dense

interface TimelineRange {
  start: Date
  end: Date
}

// AJOUTE CETTE LIGNE AVANT l'interface
export type ViewMode = 'timeline' | 'threads'

interface TimelineContextType {
  // État
  events: TimelineEvent[]
  zoomLevel: ZoomLevel
  densityLevel: DensityLevel
  viewRange: TimelineRange
  isLoading: boolean
  hasMore: boolean
  viewMode: ViewMode  // ← AJOUTE CETTE LIGNE
  expandedThreadId: string | null
  
  // Actions
  setZoomLevel: (level: ZoomLevel) => void
  setDensityLevel: (level: DensityLevel) => void
  setViewRange: (range: TimelineRange) => void
  setViewMode: (mode: ViewMode) => void  // ← AJOUTE CETTE LIGNE
  setExpandedThreadId: (id: string | null) => void
  loadEvents: (range: TimelineRange, zoom: ZoomLevel, reset?: boolean) => Promise<void>
  loadMore: () => Promise<void>
  loadPrevious: () => Promise<void>
  clearEvents: () => void
  
  // UI
  isTimelineOpen: boolean
  toggleTimeline: () => void
  openTimeline: () => void
  closeTimeline: () => void
  
  // Utilitaires
  getItemHeight: (level?: DensityLevel) => number
}

const TimelineContext = createContext<TimelineContextType | undefined>(undefined)

// Cache
const CACHE_MAX_SIZE = 5
const cache = new Map<string, TimelineEvent[]>()

function generateCacheKey(range: TimelineRange, zoom: ZoomLevel): string {
  return `${zoom}:${range.start.toISOString()}:${range.end.toISOString()}`
}

// Hauteurs selon le niveau de densité
const DENSITY_HEIGHTS: Record<DensityLevel, number> = {
  0: 120, // Vue détaillée (actuelle)
  1: 60,  // Condensé
  2: 30,  // Très condensé
  3: 15,  // Bâtonnets fins
  4: 8    // Ultra-dense
}

export function TimelineProvider({ children }: { children: ReactNode }) {
  // État principal
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('month')
  const [densityLevel, setDensityLevel] = useState<DensityLevel>(0)
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null)
  const [viewRange, setViewRange] = useState<TimelineRange>(() => {
    const end = new Date()
    const start = new Date()
    start.setMonth(start.getMonth() - 1)
    return { start, end }
  })
  
  // État de chargement
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  
  // UI
  const [isTimelineOpen, setIsTimelineOpen] = useState(false)
  
  // Références
  const currentOffsetRef = useRef(0)
  const prevDensityLevelRef = useRef<DensityLevel>(0)
  const isInitialMount = useRef(true)

  // -------------------------------------------------------------------
  // CHARGEMENT DES ÉVÉNEMENTS
  // -------------------------------------------------------------------
  const loadEvents = useCallback(async (
    range: TimelineRange, 
    zoom: ZoomLevel, 
    reset: boolean = true
  ) => {
    const cacheKey = generateCacheKey(range, zoom)
    
    if (reset) {
      currentOffsetRef.current = 0
      cache.delete(cacheKey)
    }

    if (!reset && cache.has(cacheKey)) {
      setEvents(cache.get(cacheKey)!)
      return
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        start: range.start.toISOString(),
        end: range.end.toISOString(),
        zoom: zoom,
        limit: '50',
        offset: currentOffsetRef.current.toString()
      })

      const response = await fetch(`/api/timeline/events?${params}`)
      
      if (!response.ok) throw new Error(`Failed to load events: ${response.status}`)
      
      const data = await response.json()
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

      if (reset) {
        setEvents(timelineEvents)
        if (cache.size >= CACHE_MAX_SIZE) {
          const firstKey = cache.keys().next().value
          if (firstKey) cache.delete(firstKey)
        }
        cache.set(cacheKey, timelineEvents)
      } else {
        setEvents(prev => [...prev, ...timelineEvents])
      }

      // Mettre à jour les métadonnées
      const newOffset = currentOffsetRef.current + timelineEvents.length
      currentOffsetRef.current = newOffset
      
      if (data.meta?.total) setTotalCount(data.meta.total)
      setHasMore(currentOffsetRef.current < (data.meta?.total || 0))

    } catch (error) {
      console.error('Error loading timeline events:', error)
      if (reset) setEvents([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // -------------------------------------------------------------------
  // CHARGEMENT BIDIRECTIONNEL
  // -------------------------------------------------------------------
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return
    
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        start: viewRange.start.toISOString(),
        end: viewRange.end.toISOString(),
        zoom: zoomLevel,
        limit: '50',
        offset: currentOffsetRef.current.toString()
      })

      const response = await fetch(`/api/timeline/events?${params}`)
      if (!response.ok) throw new Error(`Failed to load more: ${response.status}`)
      
      const data = await response.json()
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

      setEvents(prev => {
        const newEvents = [...prev, ...timelineEvents]
        // Limite mémoire à 500 événements maximum
        if (newEvents.length > 500) {
          return newEvents.slice(-500)
        }
        return newEvents
      })
      
      currentOffsetRef.current += timelineEvents.length
      setHasMore(currentOffsetRef.current < totalCount)

    } catch (error) {
      console.error('Error in loadMore:', error)
    } finally {
      setIsLoading(false)
    }
  }, [hasMore, isLoading, viewRange, zoomLevel, totalCount])

  const loadPrevious = useCallback(async () => {
    if (isLoading || currentOffsetRef.current <= 0) return
    
    const previousOffset = Math.max(0, currentOffsetRef.current - 50)
    
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        start: viewRange.start.toISOString(),
        end: viewRange.end.toISOString(),
        zoom: zoomLevel,
        limit: '50',
        offset: previousOffset.toString()
      })

      const response = await fetch(`/api/timeline/events?${params}`)
      if (!response.ok) throw new Error(`Failed to load previous: ${response.status}`)
      
      const data = await response.json()
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

      setEvents(prev => {
        const existingIds = new Set(prev.map(e => e.id))
        const newEvents = timelineEvents.filter(e => !existingIds.has(e.id))
        const combined = [...newEvents, ...prev]
        
        if (combined.length > 500) {
          return combined.slice(0, 500)
        }
        return combined
      })
      
      currentOffsetRef.current = previousOffset
      setHasMore(currentOffsetRef.current < totalCount)

    } catch (error) {
      console.error('Error in loadPrevious:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, viewRange, zoomLevel, totalCount])

  // -------------------------------------------------------------------
  // UTILITAIRES
  // -------------------------------------------------------------------
  const getItemHeight = useCallback((level?: DensityLevel): number => {
    return DENSITY_HEIGHTS[level ?? densityLevel]
  }, [densityLevel])

  const clearEvents = useCallback(() => {
    setEvents([])
    cache.clear()
    currentOffsetRef.current = 0
  }, [])

  // UI controls
  const toggleTimeline = useCallback(() => setIsTimelineOpen(prev => !prev), [])
  const openTimeline = useCallback(() => setIsTimelineOpen(true), [])
  const closeTimeline = useCallback(() => setIsTimelineOpen(false), [])

  // -------------------------------------------------------------------
  // EFFECTS
  // -------------------------------------------------------------------
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      loadEvents(viewRange, zoomLevel, true)
    } else {
      loadEvents(viewRange, zoomLevel, true)
    }
  }, [viewRange, zoomLevel, loadEvents])

  // Sauvegarder le précédent niveau de densité pour les transitions
  useEffect(() => {
    prevDensityLevelRef.current = densityLevel
  }, [densityLevel])

  // -------------------------------------------------------------------
  // VALEUR DU CONTEXTE
  // -------------------------------------------------------------------
  const value: TimelineContextType = {
    // État
    events,
    zoomLevel,
    densityLevel,
    viewMode,
    expandedThreadId,
    viewRange,
    isLoading,
    hasMore,
    
    // Actions
    setZoomLevel,
    setDensityLevel,
    setViewMode,
    setExpandedThreadId,
    setViewRange,
    loadEvents,
    loadMore,
    loadPrevious,
    clearEvents,
    
    // UI
    isTimelineOpen,
    toggleTimeline,
    openTimeline,
    closeTimeline,
    
    // Utilitaires
    getItemHeight
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