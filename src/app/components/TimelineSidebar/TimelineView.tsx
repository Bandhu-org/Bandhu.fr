// src/components/TimelineSidebar/TimelineView.tsx
'use client'

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useTimeline, type TimelineEvent } from '@/contexts/TimelineContext'

const PERIOD_MS = 7 * 24 * 3600000 // 7 jours
const DISCRETE_ITEM_HEIGHT = 96

interface MinuteGroup {
  minuteTs: number
  events: TimelineEvent[]
}

function MinuteContainer({
  minute,
  events,
  itemHeight,
  renderEvent,
}: {
  minute: number
  events: TimelineEvent[]
  itemHeight: number
  renderEvent: (e: TimelineEvent) => React.ReactNode
}) {
  const [expanded, setExpanded] = useState(true)

  const height = expanded ? events.length * itemHeight : 0

  return (
    <div className="border border-gray-700/50 rounded overflow-hidden bg-gray-900/20 transition-all">
      {/* HEADER (copié de ThreadsView) */}
      <div
        onClick={() => setExpanded(v => !v)}
        className="cursor-pointer p-2 bg-gray-800/40 hover:bg-gray-800/60 flex items-center justify-between"
        style={{ height: itemHeight }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {expanded ? '▼' : '▶'}
          </span>
          <span className="text-sm text-gray-200">
            {new Date(minute).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <span className="text-xs text-gray-500">
            ({events.length})
          </span>
        </div>
      </div>

      {/* EVENTS */}
      {expanded && (
        <div style={{ height }} className="relative">
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-bandhu-primary/30 to-bandhu-secondary/30" />
          {events.map((event, idx) => (
            <div
              key={event.id}
              style={{
                position: 'absolute',
                top: idx * itemHeight,
                height: itemHeight,
                width: '100%',
              }}
              className="px-4"
            >
              {renderEvent(event)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}



type Tier = 'heatmap' | 'clusters' | 'bars' | 'bars-count' | 'mini-containers' | 'discrete'
type VisualizationMode = 'heatmap' | 'clusters' | 'bars' | 'mini-containers' | 'discrete'

function getTimelineTier(msPerPixel: number): Tier {
  if (msPerPixel >= 24 * 3600000) return 'heatmap'        // >= 1j/px
  if (msPerPixel >= 6 * 3600000) return 'clusters'        // >= 6h/px
  if (msPerPixel >= 30 * 60000) return 'bars'             // >= 30min/px
  if (msPerPixel >= 5 * 60000) return 'bars-count'        // >= 5min/px
  if (msPerPixel >= 10 * 1000) return 'mini-containers'
  return 'discrete'                                       // < 1min/px (zoom max)
}

// ------------------------------------------------------------
// RULER TEMPOREL
// ------------------------------------------------------------
interface RulerProps {
  scrollTop: number
  clientHeight: number
  totalHeight: number
  yToDate: (y: number) => Date
  dateToY: (date: Date) => number
  msPerPixel: number
}

function TemporalRuler({ scrollTop, clientHeight, totalHeight, yToDate, dateToY, msPerPixel }: RulerProps) {
  const markers = useMemo(() => {
    const result: { y: number; label: string }[] = []

    const pixelsPerScreen = 800
    const targetMarkersPerScreen = 8
    const pixelInterval = pixelsPerScreen / targetMarkersPerScreen
    const intervalMs = pixelInterval * msPerPixel

    let cleanIntervalMs: number
    let formatOptions: Intl.DateTimeFormatOptions

    if (intervalMs < 3600000) {
      if (intervalMs < 900000) {
        cleanIntervalMs = 900000
        formatOptions = { hour: '2-digit', minute: '2-digit' }
      } else if (intervalMs < 1800000) {
        cleanIntervalMs = 1800000
        formatOptions = { hour: '2-digit', minute: '2-digit' }
      } else {
        cleanIntervalMs = 3600000
        formatOptions = { hour: '2-digit', minute: '2-digit' }
      }
    } else if (intervalMs < 86400000) {
      if (intervalMs < 10800000) {
        cleanIntervalMs = 10800000
        formatOptions = { hour: '2-digit', minute: '2-digit' }
      } else if (intervalMs < 21600000) {
        cleanIntervalMs = 21600000
        formatOptions = { hour: '2-digit', minute: '2-digit' }
      } else if (intervalMs < 43200000) {
        cleanIntervalMs = 43200000
        formatOptions = { hour: '2-digit', minute: '2-digit' }
      } else {
        cleanIntervalMs = 86400000
        formatOptions = { day: 'numeric', month: 'short' }
      }
    } else if (intervalMs < 604800000) {
      const days = Math.ceil(intervalMs / 86400000)
      cleanIntervalMs = days * 86400000
      formatOptions = { day: 'numeric', month: 'short' }
    } else {
      if (intervalMs < 2592000000) {
        cleanIntervalMs = 604800000
        formatOptions = { day: 'numeric', month: 'short' }
      } else {
        cleanIntervalMs = 2592000000
        formatOptions = { month: 'short', year: 'numeric' }
      }
    }

    const startDate = yToDate(Math.max(0, scrollTop - clientHeight))
    const endDate = yToDate(Math.min(totalHeight, scrollTop + clientHeight * 2))

    const startTime = Math.ceil(startDate.getTime() / cleanIntervalMs) * cleanIntervalMs

    for (let time = startTime; time <= endDate.getTime(); time += cleanIntervalMs) {
      const date = new Date(time)
      const y = dateToY(date)
      const label = date.toLocaleDateString('fr-FR', formatOptions)

      if (y >= scrollTop - clientHeight && y <= scrollTop + clientHeight * 2) {
        result.push({ y, label })
      }
    }

    return result
  }, [scrollTop, clientHeight, totalHeight, yToDate, dateToY, msPerPixel])

  return (
    <>
      {markers.map((m, idx) => (
        <div
          key={`${m.y}-${idx}`}
          style={{ position: 'absolute', top: m.y, left: 0, right: 0, height: 1, pointerEvents: 'none' }}
          className="border-t border-bandhu-primary/20"
        >
          <span className="absolute left-2 -top-3 text-xs text-bandhu-primary/60 bg-gray-900/80 px-2 py-0.5 rounded whitespace-nowrap">
            {m.label}
          </span>
        </div>
      ))}
    </>
  )
}

// ------------------------------------------------------------
// COMPONENT
// ------------------------------------------------------------
export default function TimelineView() {
  const {
    events,
    isLoading,
    densityRatio,
    selectedEventIds,
    toggleEventSelection,
    dateToY,
    yToDate,
    getTotalHeight,
    msPerPixel,
    zoomIn,
    zoomOut
  } = useTimeline()

  const isMinuteZoom = msPerPixel <= 60_000
  const tier = getTimelineTier(msPerPixel)

    // ============================================
  // NIVEAUX DE DISCRET (continuum visuel)
  // ============================================
  type DiscreteLevel = 'bars' | 'minute' | 'expanded-minute' | 'event'

  const discreteLevel = useMemo<DiscreteLevel>(() => {
    if (msPerPixel > 2 * 60_000) return 'bars'            // > 2 min / px
    if (msPerPixel > 60_000) return 'minute'              // 1–2 min / px
    if (msPerPixel > 15_000) return 'expanded-minute'     // 15s–1min / px
    return 'event'                                        // < 15s / px
  }, [msPerPixel])

  const visualizationMode: VisualizationMode = useMemo(() => {
  if (tier === 'heatmap') return 'heatmap'
  if (tier === 'clusters') return 'clusters'
  if (tier === 'bars' || tier === 'bars-count') return 'bars'
  if (tier === 'mini-containers') return 'mini-containers' // ✨ NOUVEAU
  return 'discrete'
}, [tier])

const isElasticTime = visualizationMode === 'discrete' && isMinuteZoom

  // ------------------------------------------------------------
  // LOCAL itemHeight (simple et stable)
  // ------------------------------------------------------------
  const getItemHeight = useCallback((ratio?: number) => {
    const r = ratio ?? densityRatio
    return 8 + (120 - 8) * r
  }, [densityRatio])

  const baseItemHeight = getItemHeight()

  const totalHeightNatural = getTotalHeight()

// ------------------------------------------------------------
// SCROLL REF & STATE (DOIT ÊTRE AVANT visibleEvents)
// ------------------------------------------------------------
const scrollContainerRef = useRef<HTMLDivElement>(null)
const [scrollState, setScrollState] = useState({ scrollTop: 0, clientHeight: 0 })
const [hoveredEventId, setHoveredEventId] = useState<string | null>(null)



// ============================================
// Grouper les events par minute (CORRIGÉ)
// ============================================
const eventsByMinute = useMemo(() => {
  if (!isMinuteZoom) return []

  const map = new Map<number, TimelineEvent[]>()

  for (const e of events) {
    const minuteKey = Math.floor(e.createdAt.getTime() / 60_000) * 60_000
    if (!map.has(minuteKey)) map.set(minuteKey, [])
    map.get(minuteKey)!.push(e)
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
}, [events, isMinuteZoom])

// ============================================
// Calculer la position Y de chaque minute (NOUVEAU)
// ============================================
const minuteBlocks = useMemo(() => {
  if (!isMinuteZoom) return []

  let currentY = 0
  const blocks: {
    minuteTs: number
    y: number
    events: TimelineEvent[]
    height: number
  }[] = []

  for (const [minuteTs, evts] of eventsByMinute) {
    const height = evts.length * baseItemHeight
    blocks.push({
      minuteTs,
      y: currentY,
      events: evts,
      height,
    })
    currentY += height
  }

  return blocks
}, [eventsByMinute, isMinuteZoom, baseItemHeight])



// ------------------------------------------------------------
  // RENDER: container event (détaillé)
  // ------------------------------------------------------------
  const renderEvent = useCallback((event: TimelineEvent, forceDetail = false) => {
  const isSelected = selectedEventIds.includes(event.id)
  const isHovered = hoveredEventId === event.id

  // ✨ Forcer densityRatio = 1.0 en mode discret
  const effectiveRatio = forceDetail ? 1.0 : densityRatio

  const dotSize = 2 + 6 * effectiveRatio
  const dotBorder = 1 + 1 * effectiveRatio
  const padding = 2 + 10 * effectiveRatio
  const borderRadius = 2 + 6 * effectiveRatio
  const showPreview = effectiveRatio > 0.3  // Toujours true si forceDetail
  const showTime = effectiveRatio > 0.5      // Toujours true si forceDetail
  const showThreadLabel = effectiveRatio > 0.7 // Toujours true si forceDetail

    const colorConfig = {
      user: { bg: `rgba(59,130,246,${0.1 + 0.2 * densityRatio})`, border: `rgba(96,165,250,${0.3 + 0.5 * densityRatio})`, dot: 'rgb(96,165,250)' },
      assistant: { bg: `rgba(168,85,247,${0.1 + 0.2 * densityRatio})`, border: `rgba(192,132,252,${0.3 + 0.5 * densityRatio})`, dot: 'rgb(192,132,252)' },
      system: { bg: `rgba(75,85,99,${0.1 + 0.2 * densityRatio})`, border: `rgba(107,114,128,${0.3 + 0.5 * densityRatio})`, dot: 'rgb(107,114,128)' }
    } as const

    const colors = colorConfig[event.role]

    return (
      <div className="relative pl-6 h-full">
        {/* Select dot */}
        <div
          className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
          onClick={(e) => {
  e.stopPropagation()
  toggleEventSelection(event.id)

  if (typeof window !== 'undefined' && (window as any).loadThread) {
    ;(window as any).loadThread(event.threadId)
  }
}}

          title={isSelected ? 'Désélectionner' : 'Sélectionner'}
        >
          <div
            className="relative rounded-full border-2 transition-all duration-200"
            style={{
              width: `${dotSize}px`,
              height: `${dotSize}px`,
              borderWidth: `${dotBorder}px`,
              borderColor: isSelected ? 'rgb(168,85,247)' : colors.dot,
              backgroundColor: isSelected ? 'rgb(168,85,247)' : colors.dot
            }}
          />
        </div>

        <div
          className={`ml-6 h-full flex flex-col transition-all duration-200 ${isSelected ? 'border-2 border-bandhu-primary shadow-md shadow-bandhu-primary/20' : ''}`}
          style={{
            padding: `${padding}px`,
            borderRadius: `${borderRadius}px`,
            border: isSelected
  ? '2px solid rgb(168,85,247)'
  : isHovered
  ? '2px solid rgba(168,85,247,0.6)'
  : `1px solid ${colors.border}`,

            backgroundColor: colors.bg
          }}
        >
          {showTime && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-400">
                {event.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}

          {showPreview && (
            <p className="text-sm text-gray-200 line-clamp-2 flex-1" style={{ fontSize: `${12 + 2 * densityRatio}px` }}>
              {event.contentPreview}
            </p>
          )}

          {showThreadLabel && (
            <div className="text-xs text-gray-500 truncate">{event.threadLabel}</div>
          )}
        </div>
      </div>
    )
  }, [densityRatio, selectedEventIds, toggleEventSelection, hoveredEventId])

  // ------------------------------------------------------------
  // Positions “réelles” (temps->y)
  // ------------------------------------------------------------
  const itemPositions = useMemo(() => {
    return events.map(event => {
      const y = dateToY(event.createdAt)
      return { id: event.id, y, event }
    })
  }, [events, dateToY])

// ------------------------------------------------------------
  // MODE: DISCRETE (zoom max)
  // - packing vertical pour éviter overlap (time becomes elastic)
  // ------------------------------------------------------------
  const packedDiscrete = useMemo(() => {
  if (visualizationMode !== 'discrete') {
    return { rows: [], totalHeight: totalHeightNatural }
  }

  const sorted = [...itemPositions].sort((a, b) => a.y - b.y)

  let currentY = 0
  const rows: Array<{ y: number; event: TimelineEvent }> = []

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]
    
    if (i > 0) {
      const prev = sorted[i - 1]
      const timeDiffMs = current.event.createdAt.getTime() - prev.event.createdAt.getTime()
      
      // ✨ Espacement TRÈS LARGE pour séparer visuellement
// ✨ Espacement MASSIF pour séparer visuellement
let extraSpace = 0

if (timeDiffMs > 86400000) {
  extraSpace = 1500  // ÷ 2
} else if (timeDiffMs > 3600000) {
  extraSpace = 1000  // ÷ 2
} else if (timeDiffMs > 600000) {
  extraSpace = 600   // ÷ 2
} else if (timeDiffMs > 60000) {
  extraSpace = 300   // ÷ 2
} else if (timeDiffMs > 10000) {
  extraSpace = 100   // ÷ 2
}
// < 10 secondes → Collés (0px)
// < 10 secondes → Collés (0px)

      // Sinon (< 1 minute) → Pas d'espace extra
      
      currentY += extraSpace
    }

    rows.push({ y: currentY, event: current.event })
    currentY += DISCRETE_ITEM_HEIGHT
  }

  const totalHeight = currentY + 40

  return { rows, totalHeight }
}, [visualizationMode, itemPositions])


const renderDiscrete = useCallback(() => {
  return (
    <>
      {packedDiscrete.rows.map(({ y, event }) => {
        const isSelected = selectedEventIds.includes(event.id)

        return (
          <div
            key={event.id}
            style={{
  position: 'absolute',
  top: y,
  left: 0,
  right: 0,
  paddingLeft: 16,
  paddingRight: 16,
}}

          >
            {renderEvent(event)}
          </div>
        )
      })}
    </>
  )
}, [packedDiscrete, selectedEventIds, renderEvent])


// ------------------------------------------------------------
// MODE: MINI-CONTAINERS (même dynamique que bars)
// ------------------------------------------------------------
const renderMiniContainers = useCallback(() => {
  return (
    <>
      {itemPositions.map(({ y, event }) => {
        const isSelected = selectedEventIds.includes(event.id)

        return (
          <div
            key={event.id}
            style={{
              position: 'absolute',
              top: y,              // ✅ MÊME Y QUE BARS
              left: 0,
              right: 0,
              height: Math.max(28, 32 * densityRatio),
              paddingLeft: 12,
              paddingRight: 12,
              pointerEvents: 'auto',
            }}
            className="cursor-pointer"
            onClick={async () => {
              if (typeof window !== 'undefined' && (window as any).loadThread) {
                await (window as any).loadThread(event.threadId)
              }
            }}
          >
            <div
              className={`
                ml-6 h-full flex items-center gap-2
                rounded-md border px-3
                transition-colors duration-150
                ${isSelected
                  ? 'bg-bandhu-primary/15 border-bandhu-primary'
                  : event.role === 'user'
                    ? 'bg-blue-500/5 border-blue-500/30'
                    : 'bg-purple-500/5 border-purple-500/30'
                }
              `}
            >
              {/* dot */}
              <div
                className={`w-2 h-2 rounded-full ${
                  event.role === 'user' ? 'bg-blue-400' : 'bg-purple-400'
                }`}
              />

              {/* time */}
              <span className="text-[10px] text-gray-400">
                {event.createdAt.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>

              {/* preview */}
              <span className="text-xs text-gray-300 truncate flex-1">
                {event.contentPreview}
              </span>
            </div>
          </div>
        )
      })}
    </>
  )
}, [itemPositions, selectedEventIds])


// ============================================
// RENDER — Discrete par minute (empilement réel)
// ============================================


  const itemPositionsMap = useMemo(() => {
  return new Map(itemPositions.map(p => [p.id, p]))
}, [itemPositions])

const handleEventClick = useCallback((eventId: string, threadId: string) => {
  // Protection en ultra-dense
  if (densityRatio < 0.25) return

  if (typeof window !== 'undefined' && (window as any).loadThread) {
    ;(window as any).loadThread(threadId)
  }
}, [densityRatio])


  // ------------------------------------------------------------
// ÉVÉNEMENTS VISIBLES À L'ÉCRAN (filtrage par position Y)
// ------------------------------------------------------------
const visibleEvents = useMemo(() => {
  const container = scrollContainerRef.current
  if (!container) return events

  const scrollTop = container.scrollTop
  const clientHeight = container.clientHeight
  const scrollBottom = scrollTop + clientHeight

  const buffer = 800 // px de marge avant / après l'écran

  return events.filter(event => {
    const pos = itemPositionsMap.get(event.id)
    if (!pos) return false

    return (
      pos.y >= scrollTop - buffer &&
      pos.y <= scrollBottom + buffer
    )
  })
}, [events, itemPositionsMap])

  // ------------------------------------------------------------
  // Visible window (scroll)
  // ------------------------------------------------------------
  

  const handleScroll = useCallback(() => {
    const c = scrollContainerRef.current
    if (!c) return
    setScrollState({ scrollTop: c.scrollTop, clientHeight: c.clientHeight })
  }, [])

  useEffect(() => {
    const c = scrollContainerRef.current
    if (!c) return
    c.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => c.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // ------------------------------------------------------------
  // Ctrl+Wheel zoom keep date under cursor
  // ------------------------------------------------------------
  // ------------------------------------------------------------
// Ctrl + Wheel ZOOM (SOURCE DE VÉRITÉ)
// ------------------------------------------------------------
const handleWheel = useCallback(
  (e: WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return

    e.preventDefault()
    e.stopPropagation()

    const container = scrollContainerRef.current
    if (!container) return

    // ✨ En mode discret, pas d'ancrage (positions artificielles)
    if (visualizationMode === 'discrete') {
      if (e.deltaY < 0) zoomIn()
      else zoomOut()
      return
    }

    // ✨ Ancrage normal pour les autres modes
    const rect = container.getBoundingClientRect()
    const cursorY = e.clientY - rect.top
    const scrollY = container.scrollTop + cursorY

    const dateAtCursor = yToDate(scrollY)

    if (e.deltaY < 0) zoomIn()
    else zoomOut()

    requestAnimationFrame(() => {
      const newY = dateToY(dateAtCursor)
      container.scrollTop = newY - cursorY
    })
  },
  [zoomIn, zoomOut, yToDate, dateToY, visualizationMode]
)


useEffect(() => {
  const container = scrollContainerRef.current
  if (!container) return

  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      handleWheel(e)
    }
  }

  container.addEventListener('wheel', onWheel, {
    passive: false,
    capture: true
  })

  return () => {
    container.removeEventListener('wheel', onWheel, {
      capture: true
    } as any)
  }
}, [handleWheel])

useEffect(() => {
  const style = document.createElement('style')
  style.textContent = `
    .timeline-event-highlight {
      animation: timeline-pulse 1.5s ease-in-out;
      border-color: rgba(168, 85, 247, 0.5) !important;
    }
    @keyframes timeline-pulse {
      0%, 100% { 
        background-color: transparent; 
        border-color: rgba(55, 65, 81, 0.5);
      }
      50% { 
        background-color: rgba(168, 85, 247, 0.1); 
        border-color: rgba(168, 85, 247, 0.8);
      }
    }
  `
  document.head.appendChild(style)
  return () => {
    document.head.removeChild(style)
  }
}, [])


const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
  if (visualizationMode !== 'discrete') return
  if (isMinuteZoom) return

  const container = scrollContainerRef.current
  if (!container) return

  const rect = container.getBoundingClientRect()
  const cursorY = e.clientY - rect.top + container.scrollTop

  let closestId: string | null = null
  let minDist = Infinity

  for (const { y, event } of packedDiscrete.rows) {
    const d = Math.abs(y - cursorY)
    if (d < minDist) {
      minDist = d
      closestId = event.id
    }
  }

  setHoveredEventId(closestId)
}


  // ------------------------------------------------------------
  // MODE: HEATMAP
  // ------------------------------------------------------------
  const heatmapData = useMemo(() => {
    if (visualizationMode !== 'heatmap') return []
    const periods: Array<{ startY: number; count: number; intensity: number }> = []

    const stepY = PERIOD_MS / msPerPixel

    for (let y = 0; y < totalHeightNatural; y += stepY) {
      const endY = y + stepY
      let count = 0
      for (const p of itemPositions) {
        if (p.y >= y && p.y < endY) count++
      }
      if (count > 0) {
        const intensity = Math.min(count / 50, 1)
        periods.push({ startY: y, count, intensity })
      }
    }
    return periods
  }, [visualizationMode, itemPositions, msPerPixel, totalHeightNatural])

  const renderHeatmap = useCallback(() => (
    <>
      {heatmapData.map((period, idx) => (
        <div
          key={idx}
          style={{
            position: 'absolute',
            top: period.startY,
            left: '10%',
            width: '80%',
            height: Math.max(20, PERIOD_MS / msPerPixel),
            borderRadius: 4,
            backgroundColor: `rgba(168, 85, 247, ${0.2 + period.intensity * 0.6})`,
            border: `1px solid rgba(168, 85, 247, ${0.3 + period.intensity * 0.5})`,
            cursor: 'pointer'
          }}
          title={`${period.count} événements`}
          onClick={() => zoomIn()}
        >
          <div className="absolute bottom-1 left-2 text-xs text-white/80 font-medium">{period.count}</div>
        </div>
      ))}
    </>
  ), [heatmapData, msPerPixel, zoomIn])

  // ------------------------------------------------------------
  // MODE: CLUSTERS
  // ------------------------------------------------------------
  const clusters = useMemo(() => {
    if (visualizationMode !== 'clusters') return []
    const sorted = [...itemPositions].sort((a, b) => a.y - b.y)

    const CLUSTER_THRESHOLD = baseItemHeight * 2
    const out: Array<{ centerY: number; count: number }> = []

    let bucket: typeof sorted = []
    let lastY = -Infinity

    for (const p of sorted) {
      if (bucket.length === 0 || p.y - lastY > CLUSTER_THRESHOLD) {
        if (bucket.length > 0) {
          const centerY = bucket.reduce((s, x) => s + x.y, 0) / bucket.length
          out.push({ centerY, count: bucket.length })
        }
        bucket = [p]
      } else {
        bucket.push(p)
      }
      lastY = p.y
    }

    if (bucket.length > 0) {
      const centerY = bucket.reduce((s, x) => s + x.y, 0) / bucket.length
      out.push({ centerY, count: bucket.length })
    }

    return out
  }, [visualizationMode, itemPositions, baseItemHeight])

  const renderClusters = useCallback(() => (
    <>
      {clusters.map((c, idx) => (
        <div
          key={idx}
          style={{
            position: 'absolute',
            top: c.centerY - baseItemHeight / 2,
            left: '20%',
            width: '60%',
            height: baseItemHeight,
            cursor: 'pointer'
          }}
          className="group"
          title={`${c.count} événements groupés`}
          onClick={() => zoomIn()}
        >
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bandhu-primary/50 bg-bandhu-primary/20 transition-transform duration-200 group-hover:scale-110"
            style={{ width: Math.min(44, 18 + c.count * 2), height: Math.min(44, 18 + c.count * 2) }}
          >
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-white">
              {c.count}
            </div>
          </div>
        </div>
      ))}
    </>
  ), [clusters, baseItemHeight, zoomIn])

  // ------------------------------------------------------------
  // MODE: BARS  (bâtonnets)
  // - bars: 1 bucket / px
  // - bars-count: identique mais plus “épais”
  // ------------------------------------------------------------
  const barsData = useMemo(() => {
  if (visualizationMode !== 'bars') return []

  const bucketSizePx = 1 // 1 bucket = 1px vertical
  const buckets = new Map<number, number>()

  for (const p of itemPositions) {
    const bucketY = Math.floor(p.y / bucketSizePx) * bucketSizePx
    buckets.set(bucketY, (buckets.get(bucketY) ?? 0) + 1)
  }

  return Array.from(buckets.entries())
    .map(([y, count]) => ({ y, count }))
    .sort((a, b) => a.y - b.y)
}, [visualizationMode, itemPositions])


  const renderBars = useCallback(() => {
  const thick = tier === 'bars-count'
  const maxCount = Math.max(...barsData.map(b => b.count), 1)

  return (
    <>
      {barsData.map((b) => {
        // Calcul de la hauteur en fonction du niveau
        let height = thick ? 10 : 6
        if (discreteLevel === 'minute') {
          height = 18 + b.count * 2  // Container visible
        } else if (discreteLevel === 'expanded-minute') {
          height = Math.max(20, 25 + b.count * 3)  // Container plus grand
        }

        const widthPct = thick
          ? 8 + (b.count / maxCount) * 20
          : discreteLevel === 'bars' ? 6 : 80  // Pleine largeur pour containers

        return (
          <div
            key={b.y}
            style={{
              position: 'absolute',
              top: b.y,
              left: '50%',
              transform: 'translateX(-50%)',
              width: `${widthPct}%`,
              height: height,
              background: discreteLevel === 'bars' 
                ? 'rgba(96,165,250,0.8)' 
                : 'rgba(168,85,247,0.25)',
              border: discreteLevel === 'bars'
                ? 'none'
                : '1px solid rgba(168,85,247,0.4)',
              borderRadius: discreteLevel === 'bars' ? 3 : 8,
              cursor: 'pointer',
              transition: 'all 200ms ease',
            }}
            className="group"
            title={`${b.count} événements`}
            onClick={() => {
              const container = scrollContainerRef.current
              if (!container) return

              // centrer le bucket
              container.scrollTop = b.y - container.clientHeight / 2

              // zoom in progressif
              setTimeout(() => zoomIn(), 80)
            }}
          >
            {(thick || discreteLevel !== 'bars') && (
              <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-white/90 font-medium">
                {b.count}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}, [barsData, tier, zoomIn, discreteLevel])

  // ------------------------------------------------------------
  // UI states
  // ------------------------------------------------------------
  if (isLoading && events.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-bandhu-primary" />
          <p className="mt-2 text-sm text-gray-500">Chargement...</p>
        </div>
      </div>
    )
  }

  if (events.length === 0 && !isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-4xl mb-3 opacity-30">📅</div>
          <p className="text-gray-500">Aucun événement</p>
        </div>
      </div>
    )
  }

const totalHeight =
  visualizationMode === 'discrete'
    ? packedDiscrete.totalHeight
    : totalHeightNatural


  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------
  return (
    <div className="h-full flex flex-col">
      <div className="text-xs text-gray-500 mb-4">
        {events.length} événements •{' '}
        <span className="text-bandhu-primary ml-1">
          {msPerPixel < 3600000 * 24 ? `${Math.round(msPerPixel / 3600000)}h/px` :
            msPerPixel < 3600000 * 24 * 30 ? `${Math.round(msPerPixel / (3600000 * 24))}j/px` :
              `${Math.round(msPerPixel / (3600000 * 24 * 30))}m/px`}
        </span>{' '}
        • <span className="ml-2 px-2 py-0.5 rounded bg-gray-800/50 text-xs">
          {visualizationMode === 'heatmap' ? '🌡️ Heatmap' :
  visualizationMode === 'clusters' ? '🗂️ Clusters' :
    visualizationMode === 'bars' ? '🪵 Bars' :
      visualizationMode === 'mini-containers' ? '📦 Mini' :
        '📋 Détaillé'}
        </span>
      </div>

      <div
  ref={scrollContainerRef}
  className="flex-1 overflow-y-auto relative timeline-scroll-container"
  style={{ height: '100%', maxHeight: 'calc(100% - 2rem)' }}
  onMouseMove={handleMouseMove}
  onMouseLeave={() => setHoveredEventId(null)}
>

        <div style={{ 
  height: totalHeight, 
  minHeight: '100%', 
  position: 'relative',
  transition: 'all 200ms ease'  // ← AJOUTE CETTE LIGNE
}}>
          {/* Ruler (on le garde; en discrete il sera “un peu” non-linéaire à cause du packing) */}
          {visualizationMode !== 'discrete' && (
  <TemporalRuler
    scrollTop={scrollState.scrollTop}
    clientHeight={scrollState.clientHeight}
    totalHeight={totalHeightNatural}
    yToDate={yToDate}
    dateToY={dateToY}
    msPerPixel={msPerPixel}
  />
)}


          {/* Ligne centrale */}
          {visualizationMode !== 'discrete' && (
  <div
    className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-bandhu-primary/30 to-bandhu-secondary/30"
    style={{ opacity: 0.35 }}
  />
)}


          {/* Rendu selon mode */}
          {visualizationMode === 'heatmap' && renderHeatmap()}
          {visualizationMode === 'clusters' && renderClusters()}
          {visualizationMode === 'bars' && renderBars()}
          {visualizationMode === 'mini-containers' && renderMiniContainers()}
          {visualizationMode === 'discrete' && !isMinuteZoom && renderDiscrete()}

          {/* Mode discret : afficher les belles cards */}
{visualizationMode === 'discrete' && (
  <>
    {packedDiscrete.rows.map(({ y, event }) => (
      <div
        key={event.id}
        style={{
          position: 'absolute',
          top: y,
          left: 0,
          right: 0,
          height: DISCRETE_ITEM_HEIGHT,
          paddingLeft: 16,
          paddingRight: 16,
        }}
        className="cursor-pointer" // ✨ Curseur pointer
        onClick={async () => {
          // ✨ Navigation comme dans ThreadsView
          if (typeof window !== 'undefined' && (window as any).loadThread) {
            await (window as any).loadThread(event.threadId)
          }
          
          setTimeout(() => {
            const targetElement = document.querySelector(`[data-message-id="${event.id}"]`)
            if (targetElement) {
              targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
              targetElement.classList.add('timeline-event-highlight')
              setTimeout(() => {
                targetElement.classList.remove('timeline-event-highlight')
              }, 1500)
            }
          }, 500)
        }}
        onMouseEnter={() => setHoveredEventId(event.id)} // ✨ Hover effect
        onMouseLeave={() => setHoveredEventId(null)}
      >
        {renderEvent(event, true)}
      </div>
    ))}
  </>
)}


        </div>
      </div>

      <div className="text-xs text-gray-600 text-center py-1 border-t border-gray-800/30">
        <span className="opacity-70">Ctrl+Molette pour zoomer</span>
      </div>

      {isLoading && (
        <div className="p-2 flex items-center justify-center border-t border-gray-800/50">
          <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-bandhu-primary mr-2" />
          <span className="text-xs text-gray-500">Chargement...</span>
        </div>
      )}
    </div>
  )
}
