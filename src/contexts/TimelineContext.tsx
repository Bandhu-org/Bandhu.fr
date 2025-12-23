// src/contexts/TimelineContext.tsx
'use client'

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
  useMemo,
} from 'react'
import type {
  EventMetadata,
  EventDetails,
  TimelineEvent,
  ThreadData,
  ViewMode,
  TimelineRange,
  MetadataResponse,
  DetailsResponse
} from '@/types/timeline'

/* ============================================================
   ZOOM STEPS - Du plus zoomé au plus large
============================================================ */

const ZOOM_STEPS_MS = [
  100,             // 100ms/px (ZOOM MAX - discrete)
  200,             // 200ms/px ✨ NOUVEAU
  500,             // 500ms/px
  1_000,           // 1s/px
  2_000,           // 2s/px ✨ NOUVEAU
  5_000,           // 5s/px
  10_000,          // 10s/px ✨ NOUVEAU
  15_000,          // 15s/px
  30_000,          // 30s/px ✨ NOUVEAU
  60_000,          // 1min/px
  2 * 60_000,      // 2min/px ✨ NOUVEAU
  5 * 60_000,      // 5min/px
  10 * 60_000,     // 10min/px
  15 * 60_000,     // 15min/px ✨ NOUVEAU
  30 * 60_000,     // 30min/px
  1 * 3_600_000,   // 1h/px
  2 * 3_600_000,   // 2h/px
  4 * 3_600_000,   // 4h/px
  8 * 3_600_000,   // 8h/px
  16 * 3_600_000,  // 16h/px
  24 * 3_600_000,  // 1 jour/px
  7 * 24 * 3_600_000,    // 1 semaine/px
  30 * 24 * 3_600_000,   // 1 mois/px
  365 * 24 * 3_600_000,  // 1 an/px
] as const

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v))

/* ============================================================
   TYPES
============================================================ */

interface TimelineContextType {
  /* State */
  eventsMetadata: EventMetadata[]
  eventsDetailsCache: Map<string, EventDetails>
  threads: ThreadData[]
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  isLoading: boolean

  /* Zoom */
  zoomIndex: number
  msPerPixel: number
  zoomIn: () => void
  zoomOut: () => void
  setZoomIndex: (i: number) => void

  /* Derived */
  densityRatio: number
  timelineStart: Date
  timelineEnd: Date
  totalTimelineMs: number

  /* Time mapping */
  dateToY: (date: Date) => number
  yToDate: (y: number) => Date
  getTotalHeight: () => number

  /* UI */
  isTimelineOpen: boolean
  toggleTimeline: () => void
  openTimeline: () => void
  closeTimeline: () => void

  /* Loading */
  loadMetadata: () => Promise<void>
  loadDetails: (eventIds: string[]) => Promise<void>
  getEventDetails: (eventId: string) => EventDetails | undefined
  addEvent: (event: TimelineEvent) => void 

  /* Selection */
  selectedEventIds: string[]
  setSelectedEventIds: React.Dispatch<React.SetStateAction<string[]>>
  toggleEventSelection: (id: string) => void
  clearSelection: () => void
}

/* ============================================================
   CONTEXT
============================================================ */

const TimelineContext = createContext<TimelineContextType | undefined>(undefined)

/* ============================================================
   PROVIDER
============================================================ */

export function TimelineProvider({ children }: { children: ReactNode }) {
  /* -------------------- Core state -------------------- */

  const [eventsMetadata, setEventsMetadata] = useState<EventMetadata[]>([])
  const [eventsDetailsCache, setEventsDetailsCache] = useState<Map<string, EventDetails>>(new Map())
  const [threads, setThreads] = useState<ThreadData[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [isLoading, setIsLoading] = useState(false)

  /* -------------------- Zoom discret -------------------- */

  const [zoomIndex, setZoomIndex] = useState(12) // Par défaut : 1h/px

  const msPerPixel = useMemo(
    () => ZOOM_STEPS_MS[clamp(zoomIndex, 0, ZOOM_STEPS_MS.length - 1)],
    [zoomIndex]
  )

  const zoomIn = useCallback(
    () => setZoomIndex(i => clamp(i - 1, 0, ZOOM_STEPS_MS.length - 1)),
    []
  )

  const zoomOut = useCallback(
    () => setZoomIndex(i => clamp(i + 1, 0, ZOOM_STEPS_MS.length - 1)),
    []
  )

  /* -------------------- Timeline bounds (basés sur les EVENTS) -------------------- */

  const timelineStart = useMemo(() => {
    if (eventsMetadata.length === 0) return new Date()
    return eventsMetadata[0].createdAt // ✨ Premier event
  }, [eventsMetadata])

  const timelineEnd = useMemo(() => {
    if (eventsMetadata.length === 0) return new Date()
    return eventsMetadata[eventsMetadata.length - 1].createdAt // ✨ Dernier event
  }, [eventsMetadata])

  const totalTimelineMs = useMemo(
    () => timelineEnd.getTime() - timelineStart.getTime(),
    [timelineStart, timelineEnd]
  )

  /* -------------------- Density (simple, lisible) -------------------- */

  const densityRatio = useMemo(() => {
    const windowMs = msPerPixel * 800
    if (windowMs > 1000 * 60 * 60) return 0.15   // > 1h
    if (windowMs > 1000 * 60 * 15) return 0.3
    if (windowMs > 1000 * 60 * 5) return 0.6
    return 1
  }, [msPerPixel])

  /* -------------------- Time mapping -------------------- */

  const dateToY = useCallback(
    (date: Date) => (date.getTime() - timelineStart.getTime()) / msPerPixel,
    [timelineStart, msPerPixel]
  )

  const yToDate = useCallback(
    (y: number) => new Date(timelineStart.getTime() + y * msPerPixel),
    [timelineStart, msPerPixel]
  )

  const getTotalHeight = useCallback(
    () => totalTimelineMs / msPerPixel,
    [totalTimelineMs, msPerPixel]
  )

  /* -------------------- UI -------------------- */

  const [isTimelineOpen, setIsTimelineOpen] = useState(false)
  const toggleTimeline = () => setIsTimelineOpen(v => !v)
  const openTimeline = () => setIsTimelineOpen(true)
  const closeTimeline = () => setIsTimelineOpen(false)

  /* -------------------- Selection -------------------- */

  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])

  const toggleEventSelection = useCallback((id: string) => {
    setSelectedEventIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedEventIds([])
  }, [])

  /* -------------------- Loading Metadata -------------------- */

  const loadMetadata = useCallback(async () => {
  setIsLoading(true)
  console.log('📊 [TIMELINE] Loading metadata...')
  
  try {
    const res = await fetch('/api/timeline/metadata')
    if (!res.ok) throw new Error('Failed to load metadata')

    const data: MetadataResponse = await res.json()
    
    const metadata: EventMetadata[] = data.events.map(e => ({
      id: e.id,
      createdAt: new Date(e.createdAt),
      role: e.role,
      threadId: e.threadId
    }))

    setEventsMetadata(metadata)
    console.log(`✅ [TIMELINE] Loaded ${metadata.length} metadata`)

    // ✨ NOUVEAU : Charger threads APRÈS (sans bloquer metadata)
    fetch('/api/threads')
      .then(r => r.json())
      .then(data => {
        const loadedThreads: ThreadData[] = data.threads.map((t: any) => ({
          id: t.id,
          label: t.label,
          messageCount: t.messageCount,
          lastActivity: new Date(t.lastActivity),
          activeDates: t.activeDates || []
        }))
        setThreads(loadedThreads)
        console.log(`✅ [TIMELINE] Loaded ${loadedThreads.length} threads`)
      })
      .catch(err => console.error('❌ Error loading threads:', err))

  } catch (error) {
    console.error('❌ [TIMELINE] Error loading metadata:', error)
  } finally {
    setIsLoading(false)
  }
}, [])

  /* -------------------- Loading Details -------------------- */

  const loadDetails = useCallback(async (eventIds: string[]) => {
    if (eventIds.length === 0) return

    // Filtrer les IDs déjà en cache
    const missingIds = eventIds.filter(id => !eventsDetailsCache.has(id))
    
    if (missingIds.length === 0) {
      console.log('✅ [TIMELINE] All details in cache')
      return
    }

    console.log(`📝 [TIMELINE] Loading ${missingIds.length} details...`)

    try {
      // Batch par 500 max
      const batches: string[][] = []
      for (let i = 0; i < missingIds.length; i += 500) {
        batches.push(missingIds.slice(i, i + 500))
      }

      for (const batch of batches) {
  // On utilise POST pour envoyer les IDs dans le body (pas de limite de taille)
  const res = await fetch('/api/timeline/details', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: batch })
  })
  
  if (!res.ok) throw new Error('Failed to load details')

  const data: DetailsResponse = await res.json()

  // Ajouter au cache (inchangé)
  setEventsDetailsCache(prev => {
    const newCache = new Map(prev)
    Object.entries(data.details).forEach(([id, details]) => {
      newCache.set(id, { id, ...details })
    })
    return newCache
  })

  console.log(`✅ [TIMELINE] Loaded ${Object.keys(data.details).length} details`)
}

    } catch (error) {
      console.error('❌ [TIMELINE] Error loading details:', error)
    }
  }, [eventsDetailsCache])

  /* -------------------- Add Event -------------------- */

const addEvent = useCallback((event: TimelineEvent) => {
  // Ajouter aux métadonnées
  setEventsMetadata(prev => {
    // Vérifier si déjà existant
    if (prev.some(e => e.id === event.id)) return prev
    
    // Ajouter et trier par date
    return [...prev, {
      id: event.id,
      createdAt: event.createdAt,
      role: event.role,
      threadId: event.threadId
    }].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  })

  // Ajouter aux détails du cache aussi
  setEventsDetailsCache(prev => {
    const newCache = new Map(prev)
    newCache.set(event.id, {
      id: event.id,
      contentPreview: event.contentPreview,
      threadLabel: event.threadLabel,
      userName: event.userName
    })
    return newCache
  })
}, [])

  /* -------------------- Get Event Details -------------------- */

  const getEventDetails = useCallback((eventId: string): EventDetails | undefined => {
    return eventsDetailsCache.get(eventId)
  }, [eventsDetailsCache])

  /* -------------------- Initial load -------------------- */

  useEffect(() => {
    loadMetadata()
  }, [loadMetadata])

  /* -------------------- Context value -------------------- */

  const value: TimelineContextType = {
    eventsMetadata,
    eventsDetailsCache,
    threads,
    viewMode,
    setViewMode,
    isLoading,

    zoomIndex,
    msPerPixel,
    zoomIn,
    zoomOut,
    setZoomIndex,

    densityRatio,
    timelineStart,
    timelineEnd,
    totalTimelineMs,

    dateToY,
    yToDate,
    getTotalHeight,

    isTimelineOpen,
    toggleTimeline,
    openTimeline,
    closeTimeline,

    loadMetadata,
    loadDetails,
    getEventDetails,
    addEvent,

    selectedEventIds,
    setSelectedEventIds,
    toggleEventSelection,
    clearSelection,
  }

  return (
    <TimelineContext.Provider value={value}>
      {children}
    </TimelineContext.Provider>
  )
}

/* ============================================================
   HOOK
============================================================ */

export function useTimeline() {
  const ctx = useContext(TimelineContext)
  if (!ctx) {
    throw new Error('useTimeline must be used inside TimelineProvider')
  }
  return ctx
}