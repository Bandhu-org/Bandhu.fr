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

interface TimelineRange {
  start: Date
  end: Date
}

interface TimelineContextType {
  events: TimelineEvent[]
  zoomLevel: ZoomLevel
  viewRange: TimelineRange
  isLoading: boolean
  hasMore: boolean
  setZoomLevel: (level: ZoomLevel) => void
  setViewRange: (range: TimelineRange) => void
  loadEvents: (range: TimelineRange, zoom: ZoomLevel, reset?: boolean) => Promise<void>
  loadMore: () => Promise<void>
  loadPrevious: () => Promise<void>
  clearEvents: () => void
  isTimelineOpen: boolean
  toggleTimeline: () => void
  openTimeline: () => void
  closeTimeline: () => void
}

const TimelineContext = createContext<TimelineContextType | undefined>(undefined)

const CACHE_MAX_SIZE = 5
const cache = new Map<string, TimelineEvent[]>()

function generateCacheKey(range: TimelineRange, zoom: ZoomLevel): string {
  return `${zoom}:${range.start.toISOString()}:${range.end.toISOString()}`
}

export function TimelineProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('month')
  const [viewRange, setViewRange] = useState<TimelineRange>(() => {
    const end = new Date()
    const start = new Date()
    start.setMonth(start.getMonth() - 1)
    return { start, end }
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isTimelineOpen, setIsTimelineOpen] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [currentOffset, setCurrentOffset] = useState(0)
  const [totalCount, setTotalCount] = useState(0) // ✅ ICI !

  const currentOffsetRef = useRef(0)

  const loadEvents = useCallback(async (
    range: TimelineRange, 
    zoom: ZoomLevel, 
    reset: boolean = true
  ) => {
    console.log('🚀 [TIMELINE] loadEvents', { 
      zoom,
      reset,
      currentOffset: currentOffsetRef.current
    })
    
    const cacheKey = generateCacheKey(range, zoom)
    
    if (reset) {
      setCurrentOffset(0)
      currentOffsetRef.current = 0
      cache.delete(cacheKey)
    }

    if (!reset && cache.has(cacheKey)) {
      console.log('📦 Using cache')
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

      console.log('📡 Fetching with offset:', currentOffsetRef.current)

      const response = await fetch(`/api/timeline/events?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load events: ${response.status}`)
      }
      
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

      console.log('✅ Received', timelineEvents.length, 'events')

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

      const newOffset = currentOffsetRef.current + timelineEvents.length
      setCurrentOffset(newOffset)
      currentOffsetRef.current = newOffset

      // ✅ Capture le total
      if (data.meta?.total) {
        setTotalCount(data.meta.total)
      }

      // ✅ Recalculer hasMore
      const stillHasMore = currentOffsetRef.current < (data.meta?.total || 0)
      setHasMore(stillHasMore)
      
      console.log('📊 New offset:', newOffset, 'hasMore:', stillHasMore, 'total:', data.meta?.total)

    } catch (error) {
      console.error('❌ Error loading timeline events:', error)
      if (reset) {
        setEvents([])
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearEvents = useCallback(() => {
    setEvents([])
    cache.clear()
    setCurrentOffset(0)
    currentOffsetRef.current = 0
  }, [])

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) {
      console.log('⏸️ LoadMore skipped:', { hasMore, isLoading })
      return
    }
    
    console.log('⬇️ Loading more (bottom) from offset:', currentOffsetRef.current)
    
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
      
      if (!response.ok) {
        throw new Error(`Failed to load more: ${response.status}`)
      }
      
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

      console.log('✅ LoadMore received', timelineEvents.length, 'more events')

      setEvents(prev => {
        const newEvents = [...prev, ...timelineEvents]
        if (newEvents.length > 250) {
          console.warn('⚠️ Déchargement du haut, gardant 250 derniers')
          return newEvents.slice(-250)
        }
        return newEvents
      })
      
      const newOffset = currentOffsetRef.current + timelineEvents.length
      setCurrentOffset(newOffset)
      currentOffsetRef.current = newOffset
      
      // ✅ Recalculer hasMore
      const stillHasMore = currentOffsetRef.current < totalCount
      setHasMore(stillHasMore)
      console.log('📊 LoadMore - offset:', newOffset, 'hasMore:', stillHasMore, 'total:', totalCount)

    } catch (error) {
      console.error('❌ Error in loadMore:', error)
    } finally {
      setIsLoading(false)
    }
  }, [hasMore, isLoading, viewRange, zoomLevel, totalCount]) // ✅ Ajouter totalCount dans les deps

  const loadPrevious = useCallback(async () => {
    if (isLoading || currentOffsetRef.current <= 0) {
      console.log('⏸️ LoadPrevious skipped:', { isLoading, offset: currentOffsetRef.current })
      return
    }
    
    const previousOffset = Math.max(0, currentOffsetRef.current - 50)
    console.log('⬆️ Loading previous (top) from offset:', previousOffset)
    
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
      
      if (!response.ok) {
        throw new Error(`Failed to load previous: ${response.status}`)
      }
      
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

      console.log('✅ LoadPrevious received', timelineEvents.length, 'events')

      setEvents(prev => {
        const existingIds = new Set(prev.map(e => e.id))
        const newEvents = timelineEvents.filter(e => !existingIds.has(e.id))
        
        console.log('🔍 Filtered', newEvents.length, 'new events')
        
        const combined = [...newEvents, ...prev]
        
        if (combined.length > 250) {
          console.warn('⚠️ Déchargement du bas, gardant 250 premiers')
          return combined.slice(0, 250)
        }
        return combined
      })
      
      currentOffsetRef.current = previousOffset
      
      // ✅ Recalculer hasMore
      const stillHasMore = currentOffsetRef.current < totalCount
      setHasMore(stillHasMore)
      console.log('📊 hasMore après loadPrevious:', stillHasMore)

    } catch (error) {
      console.error('❌ Error in loadPrevious:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, viewRange, zoomLevel, totalCount]) // ✅ Ajouter totalCount

  const toggleTimeline = useCallback(() => setIsTimelineOpen(prev => !prev), [])
  const openTimeline = useCallback(() => setIsTimelineOpen(true), [])
  const closeTimeline = useCallback(() => setIsTimelineOpen(false), [])

  const isInitialMount = useRef(true)
  
  useEffect(() => {
    if (isInitialMount.current) {
      console.log('⚡ Initial mount')
      isInitialMount.current = false
      loadEvents(viewRange, zoomLevel, true)
    } else {
      console.log('🔄 Range/zoom changed')
      loadEvents(viewRange, zoomLevel, true)
    }
  }, [viewRange, zoomLevel])

  const value: TimelineContextType = {
    events,
    zoomLevel,
    viewRange,
    isLoading,
    hasMore,
    setZoomLevel,
    setViewRange,
    loadEvents,
    loadMore,
    loadPrevious,
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