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

export interface ThreadData {
  id: string
  label: string
  messageCount: number
  lastActivity: Date
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
  viewMode: ViewMode
  expandedThreadIds: string[]  // ← REMPLACE expandedThreadId
  
  // Actions
  setZoomLevel: (level: ZoomLevel) => void
  setDensityLevel: (level: DensityLevel) => void
  setViewRange: (range: TimelineRange) => void
  setViewMode: (mode: ViewMode) => void
  toggleThreadExpanded: (threadId: string) => void  // ← NOUVEAU
  expandThread: (threadId: string) => void         // ← NOUVEAU
  collapseThread: (threadId: string) => void       // ← NOUVEAU
  collapseAllThreads: () => void                   // ← NOUVEAU
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

  // Sélection d'events
selectedEventIds: string[]
toggleEventSelection: (eventId: string) => void
setSelectedEventIds: (ids: string[] | ((prev: string[]) => string[])) => void
clearSelection: () => void
selectEventsRange: (startId: string, endId: string) => void
addEvent: (event: TimelineEvent) => void
threads: ThreadData[]
  addThread: (thread: ThreadData) => void
  updateThread: (threadId: string, updates: Partial<ThreadData>) => void

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
  const [threads, setThreads] = useState<ThreadData[]>([])
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('month')
  const [densityLevel, setDensityLevel] = useState<DensityLevel>(0)
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
    const [expandedThreadIds, setExpandedThreadIds] = useState<string[]>([])
  const [viewRange, setViewRange] = useState<TimelineRange>(() => {
  const end = new Date()
  const start = new Date(2025, 0, 1)  // 1er janvier 2025
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

// Sélection d'events
const [selectedEventIds, setSelectedEventIdsState] = useState<string[]>([])

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


const addEvent = useCallback((event: TimelineEvent) => {
  // 1. Ajouter l'événement
  setEvents(prev => {
    if (prev.some(e => e.id === event.id)) return prev
    return [event, ...prev]
  })
  
  // 2. Mettre à jour le thread correspondant
  setThreads(prev => {
    const existingThread = prev.find(t => t.id === event.threadId)
    
    if (existingThread) {
      // Mettre à jour le thread existant
      return prev.map(thread => 
        thread.id === event.threadId
          ? { 
              ...thread, 
              messageCount: thread.messageCount + 1,
              lastActivity: event.createdAt
            }
          : thread
      )
    } else {
      // Créer un nouveau thread (premier message)
      const newThread: ThreadData = {
        id: event.threadId,
        label: event.threadLabel,
        messageCount: 1,
        lastActivity: event.createdAt
      }
      return [newThread, ...prev]
    }
  })
}, [])

const addThread = useCallback((thread: ThreadData) => {
  setThreads(prev => {
    // Éviter les doublons
    if (prev.some(t => t.id === thread.id)) {
      return prev
    }
    // Ajouter au début (plus récent en premier)
    return [thread, ...prev]
  })
}, [])

const updateThread = useCallback((threadId: string, updates: Partial<ThreadData>) => {
  setThreads(prev => 
    prev.map(thread => 
      thread.id === threadId 
        ? { ...thread, ...updates, lastActivity: new Date() }
        : thread
    )
  )
}, [])

    const toggleThreadExpanded = useCallback((threadId: string) => {
    setExpandedThreadIds(prev =>
      prev.includes(threadId)
        ? prev.filter(id => id !== threadId)
        : [...prev, threadId]
    )
  }, [])

  const expandThread = useCallback((threadId: string) => {
    setExpandedThreadIds(prev =>
      prev.includes(threadId) ? prev : [...prev, threadId]
    )
  }, [])

  const collapseThread = useCallback((threadId: string) => {
    setExpandedThreadIds(prev => prev.filter(id => id !== threadId))
  }, [])

  const collapseAllThreads = useCallback(() => {
    setExpandedThreadIds([])
  }, [])

// Sélection d'events
const toggleEventSelection = useCallback((eventId: string) => {
  setSelectedEventIdsState(prev =>
    prev.includes(eventId)
      ? prev.filter(id => id !== eventId)
      : [...prev, eventId]
  )
}, [])

const setSelectedEventIds = useCallback((ids: string[] | ((prev: string[]) => string[])) => {
  if (typeof ids === 'function') {
    setSelectedEventIdsState(ids)
  } else {
    setSelectedEventIdsState(ids)
  }
}, [])

const clearSelection = useCallback(() => {
  setSelectedEventIdsState([])
}, [])

const selectEventsRange = useCallback((startId: string, endId: string) => {
  setEvents(prevEvents => {
    // Trouver les index des events start et end
    const startIndex = prevEvents.findIndex(e => e.id === startId)
    const endIndex = prevEvents.findIndex(e => e.id === endId)
    
    if (startIndex === -1 || endIndex === -1) return prevEvents
    
    // Déterminer le début et la fin de la plage
    const rangeStart = Math.min(startIndex, endIndex)
    const rangeEnd = Math.max(startIndex, endIndex)
    
    // Récupérer les IDs de la plage
    const rangeIds = prevEvents
      .slice(rangeStart, rangeEnd + 1)
      .map(e => e.id)
    
    // Ajouter tous les IDs de la plage (sans doublons)
    setSelectedEventIdsState(prev => {
      const newSet = new Set(prev)
      rangeIds.forEach(id => newSet.add(id))
      return Array.from(newSet)
    })
    
    return prevEvents
  })
}, [])

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
// CHARGEMENT INITIAL DES THREADS AVEC LEURS ÉVÉNEMENTS
// -------------------------------------------------------------------
useEffect(() => {
  const loadInitialThreads = async () => {
    try {
      const response = await fetch('/api/threads/timeline')
      if (response.ok) {
        const data = await response.json()
        const threadData: ThreadData[] = data.threads.map((t: any) => ({
          id: t.id,
          label: t.label || 'Sans titre',
          messageCount: t.messageCount || 0,
          lastActivity: new Date(t.lastActivity || t.updatedAt)
        }))
        setThreads(threadData)
        
        // ⭐ AJOUTER : Extraire tous les événements des threads
        const allEvents: TimelineEvent[] = []
        data.threads.forEach((thread: any) => {
          if (thread.events && Array.isArray(thread.events)) {
            thread.events.forEach((e: any) => {
              allEvents.push({
                id: e.id,
                createdAt: new Date(e.createdAt),
                role: e.role as 'user' | 'assistant' | 'system',
                contentPreview: e.content?.substring(0, 100) || '',
                threadId: thread.id,
                threadLabel: thread.label || 'Sans titre',
                userId: e.userId || '',
                userName: e.user?.name
              })
            })
          }
        })
        
        // Ajouter ces événements au contexte (sans doublons)
        setEvents(prev => {
          const existingIds = new Set(prev.map(e => e.id))
          const newEvents = allEvents.filter(e => !existingIds.has(e.id))
          return [...newEvents, ...prev]
        })
      }
    } catch (error) {
      console.error('Error loading initial threads:', error)
    }
  }
  
  loadInitialThreads()
}, [])

  // -------------------------------------------------------------------
  // VALEUR DU CONTEXTE
  // -------------------------------------------------------------------
  const value: TimelineContextType = {
    // État
    events,
    zoomLevel,
    densityLevel,
    viewMode,
    expandedThreadIds,
    viewRange,
    isLoading,
    hasMore,
    
    // Actions
    setZoomLevel,
    setDensityLevel,
    setViewMode,
    toggleThreadExpanded,
    expandThread,
    collapseThread,
    collapseAllThreads,
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
    getItemHeight,

    // ← AJOUTE CES LIGNES ↓
    // Sélection d'events
    selectedEventIds,
    toggleEventSelection,
    setSelectedEventIds,
    clearSelection,
    selectEventsRange,
    addEvent,
    threads,
  addThread,
  updateThread,
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