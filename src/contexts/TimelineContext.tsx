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

/* ============================================================
   ZOOM DISCRET — 1 bucket temporel = 1px
============================================================ */

const ZOOM_STEPS_MS = [
  5_000,             // 5 secondes / px
  15_000,            // 15 secondes
  30_000,            // 30 secondes
  60_000,            // 1 minute
  2 * 60_000,        // 2 minutes
  5 * 60_000,        // 5 minutes
  10 * 60_000,       // 10 minutes
  30 * 60_000,       // 30 minutes
  1 * 3_600_000,     // 1 heure
  2 * 3_600_000,     // 2 heures
  4 * 3_600_000,     // 4 heures
  8 * 3_600_000,     // 8 heures
  16 * 3_600_000,    // 16 heures
  32 * 3_600_000,    // 32 heures
  64 * 3_600_000,    // ~5 jours
  128 * 3_600_000,   // ~10 jours
  256 * 3_600_000,   // ~20 jours
  512 * 3_600_000,   // ~40 jours
  8760 * 3_600_000,  // 1 an
] as const


const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v))

/* ============================================================
   TYPES
============================================================ */

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

export type ViewMode = 'timeline' | 'threads'

interface TimelineRange {
  start: Date
  end: Date
}

interface TimelineContextType {
  /* State */
  events: TimelineEvent[]
  threads: ThreadData[]
  viewRange: TimelineRange
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
  loadEvents: (range: TimelineRange, reset?: boolean) => Promise<void>

  /* Selection */
  selectedEventIds: string[]
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

  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [threads, setThreads] = useState<ThreadData[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [isLoading, setIsLoading] = useState(false)

  const [viewRange, setViewRange] = useState<TimelineRange>(() => {
    const end = new Date()
    const start = new Date(end.getTime() - 1000 * 60 * 60 * 24 * 30)
    return { start, end }
  })

  /* -------------------- Zoom discret -------------------- */

  const [zoomIndex, setZoomIndex] = useState(2) // 1h/px

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

  /* -------------------- Derived timeline bounds -------------------- */

  const timelineStart = useMemo(() => {
    if (events.length === 0) return viewRange.start
    return events.reduce(
      (min, e) => (e.createdAt < min ? e.createdAt : min),
      events[0].createdAt
    )
  }, [events, viewRange.start])

  const timelineEnd = useMemo(() => {
    if (events.length === 0) return viewRange.end
    return events.reduce(
      (max, e) => (e.createdAt > max ? e.createdAt : max),
      events[0].createdAt
    )
  }, [events, viewRange.end])

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

  /* -------------------- Loading -------------------- */

  const loadEvents = useCallback(async (range: TimelineRange, reset = true) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        start: range.start.toISOString(),
        end: range.end.toISOString(),
        limit: '5000',
      })

      const res = await fetch(`/api/timeline/events?${params}`)
      if (!res.ok) throw new Error('Failed to load timeline')

      const data = await res.json()
      const loaded: TimelineEvent[] = data.events.map((e: any) => ({
        id: e.id,
        createdAt: new Date(e.createdAt),
        role: e.role,
        contentPreview: e.contentPreview ?? '',
        threadId: e.threadId,
        threadLabel: e.threadLabel ?? '',
        userId: e.userId ?? '',
        userName: e.userName,
      }))

      setEvents(reset ? loaded : prev => [...prev, ...loaded])
    } finally {
      setIsLoading(false)
    }
  }, [])

  /* -------------------- Initial load -------------------- */

  useEffect(() => {
    loadEvents(viewRange, true)
  }, [viewRange, loadEvents])

  /* -------------------- Context value -------------------- */

  const value: TimelineContextType = {
    events,
    threads,
    viewRange,
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

    loadEvents,

    selectedEventIds,
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
