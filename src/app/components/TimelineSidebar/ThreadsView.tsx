'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useTimeline } from '@/contexts/TimelineContext'
import type { EventMetadata } from '@/types/timeline'

/* ============================================================
   CONSTANTS
============================================================ */

const THREAD_HEADER_HEIGHT_NORMAL = 48  // Header normal 2 lignes
const THREAD_HEADER_HEIGHT_COMPACT = 24 // Header réduit 1 ligne
const THREAD_HEADER_HEIGHT_STICK = 8    // Header bâtonnet

const EVENT_MIN_HEIGHT = 6    // Bâtonnet ultra-dense
const EVENT_MAX_HEIGHT = 120  // Preview 10 lignes

/* ============================================================
   TYPES
============================================================ */

interface ThreadGroup {
  id: string
  label: string
  messageCount: number
  lastActivity: Date
  events: EventMetadata[]
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function ThreadsView() {
  const {
    threads,
    eventsMetadata,
    msPerPixel,
    zoomIn,
    zoomOut,
    selectedEventIds,
    toggleEventSelection,
    getEventDetails,
    loadDetails
  } = useTimeline()

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(new Set())
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null)

  /* -------------------- Threads avec events -------------------- */

  const threadsWithEvents = useMemo(() => {
    const eventsByThread = new Map<string, EventMetadata[]>()

    eventsMetadata.forEach(event => {
      if (!eventsByThread.has(event.threadId)) {
        eventsByThread.set(event.threadId, [])
      }
      eventsByThread.get(event.threadId)!.push(event)
    })

    return threads
      .map(thread => ({
        id: thread.id,
        label: thread.label,
        messageCount: thread.messageCount,
        lastActivity: thread.lastActivity,
        events: (eventsByThread.get(thread.id) || [])
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()) // Plus ancien → Plus récent
      }))
      .sort((a, b) => a.lastActivity.getTime() - b.lastActivity.getTime()) // Plus ancien → Plus récent
  }, [threads, eventsMetadata])

  /* -------------------- Calcul hauteur event -------------------- */

  const eventHeight = useMemo(() => {
  // Mapping manuel des paliers pour avoir une vraie progression
  const mappings = [
    { msPerPixel: 100,           height: 120 }, // Max zoom = 10 lignes
    { msPerPixel: 500,           height: 110 }, // 8-9 lignes
    { msPerPixel: 1000,          height: 100 }, // 7-8 lignes
    { msPerPixel: 2000,          height: 90  }, // 5-6 lignes
    { msPerPixel: 5000,          height: 80  }, // 4-5 lignes
    { msPerPixel: 10000,         height: 72  }, // 3-4 lignes
    { msPerPixel: 15000,         height: 64  }, // 3 lignes
    { msPerPixel: 30000,         height: 56  }, // 2 lignes
    { msPerPixel: 60000,         height: 48  }, // 2 lignes
    { msPerPixel: 120000,        height: 40  }, // 1 ligne
    { msPerPixel: 300000,        height: 32  }, // 1 ligne compacte
    { msPerPixel: 600000,        height: 24  }, // Mini-container
    { msPerPixel: 3600000,       height: 16  }, // Bâtonnet
    { msPerPixel: 7200000,       height: 12  }, // Bâtonnet compact
    { msPerPixel: 86400000,      height: 8   }, // Ultra-dense
    { msPerPixel: 604800000,     height: 6   }, // Ultra-dense
  ]

  // Trouver les 2 points les plus proches
  let lower = mappings[0]
  let upper = mappings[mappings.length - 1]

  for (let i = 0; i < mappings.length - 1; i++) {
    if (msPerPixel >= mappings[i].msPerPixel && msPerPixel <= mappings[i + 1].msPerPixel) {
      lower = mappings[i]
      upper = mappings[i + 1]
      break
    }
  }

  // Interpolation linéaire entre les 2 points
  const ratio = (msPerPixel - lower.msPerPixel) / (upper.msPerPixel - lower.msPerPixel)
  const interpolated = lower.height + (upper.height - lower.height) * ratio

  return Math.round(interpolated)
}, [msPerPixel])

/* -------------------- Calcul hauteur thread header adaptatif -------------------- */

const threadHeaderHeight = useMemo(() => {
  if (eventHeight > 20) return THREAD_HEADER_HEIGHT_NORMAL  // Normal
  if (eventHeight > 12) return THREAD_HEADER_HEIGHT_COMPACT // Compact
  return THREAD_HEADER_HEIGHT_STICK                         // Bâtonnet
}, [eventHeight])

  /* -------------------- Charger détails des events visibles -------------------- */

useEffect(() => {
  const allExpandedEvents = threadsWithEvents
    .filter(t => expandedThreadIds.has(t.id))
    .flatMap(t => t.events)
    .map(e => e.id)

  if (allExpandedEvents.length > 0) {
    loadDetails(allExpandedEvents)
  }
}, [expandedThreadIds, threadsWithEvents, loadDetails])

  /* -------------------- Auto-collapse quand zoom out -------------------- */

  useEffect(() => {
    // Si eventHeight < 32px → Replier tout
    if (eventHeight < 32) {
      setExpandedThreadIds(new Set())
    }
  }, [eventHeight])

  useEffect(() => {
  const container = scrollContainerRef.current
  if (!container) return

  const onWheel = (e: WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return

    e.preventDefault()
    e.stopPropagation()

    if (e.deltaY < 0) {
      zoomIn()
    } else {
      zoomOut()
    }
  }

  container.addEventListener('wheel', onWheel, {
    passive: false,
    capture: true
  })

  return () => {
    container.removeEventListener('wheel', onWheel, { capture: true } as any)
  }
}, [zoomIn, zoomOut])

  /* -------------------- Zoom handling -------------------- */

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return

      e.preventDefault()
      e.stopPropagation()

      if (e.deltaY < 0) {
        zoomIn()
      } else {
        zoomOut()
      }
    }

    container.addEventListener('wheel', onWheel, {
      passive: false,
      capture: true
    })

    return () => {
      container.removeEventListener('wheel', onWheel, { capture: true } as any)
    }
  }, [zoomIn, zoomOut])

  /* -------------------- Toggle thread -------------------- */

  const toggleThread = useCallback((threadId: string) => {
    setExpandedThreadIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(threadId)) {
        newSet.delete(threadId)
      } else {
        newSet.add(threadId)
      }
      return newSet
    })
  }, [])

  /* -------------------- Handle event click -------------------- */

  const handleEventClick = useCallback(async (eventId: string, threadId: string) => {
    if (typeof window !== 'undefined' && (window as any).loadThread) {
      await (window as any).loadThread(threadId)
    }

    setTimeout(() => {
      const targetElement = document.querySelector(`[data-message-id="${eventId}"]`)
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        targetElement.classList.add('timeline-event-highlight')
        setTimeout(() => {
          targetElement.classList.remove('timeline-event-highlight')
        }, 1500)
      }
    }, 500)
  }, [])

  /* -------------------- Render -------------------- */

  if (threadsWithEvents.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-4xl mb-3 opacity-30">💬</div>
          <p className="text-gray-500">Aucune conversation</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="text-xs text-gray-500 mb-4">
        {threadsWithEvents.length} threads •{' '}
        <span className="text-bandhu-primary ml-1">
          {eventHeight.toFixed(0)}px/event
        </span>
      </div>

      {/* Scroll container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pl-2"
      >
        <div className="space-y-2">
          {threadsWithEvents.map(thread => {
            const isExpanded = expandedThreadIds.has(thread.id)

            return (
              <div
                key={thread.id}
                className="border border-gray-700/50 rounded-lg overflow-hidden"
              >
                {/* Thread header ADAPTATIF */}
<div
  onClick={() => toggleThread(thread.id)}
  className={`cursor-pointer transition ${
    threadHeaderHeight > 30 
      ? 'p-3 bg-gray-800/40 hover:bg-gray-800/60' 
      : threadHeaderHeight > 15
        ? 'px-2 py-1 bg-gray-800/40 hover:bg-gray-800/60'
        : 'px-1 bg-gray-800/50 hover:bg-gray-800/70'
  }`}
  style={{ height: threadHeaderHeight }}
>
  {/* Vue NORMALE (> 30px) */}
  {threadHeaderHeight > 30 && (
    <div className="flex items-center justify-between h-full">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-sm ${isExpanded ? 'text-bandhu-primary' : 'text-gray-400'}`}>
            {isExpanded ? '▼' : '▶'}
          </span>
          <h3 className="font-medium text-gray-200 truncate">{thread.label}</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 ml-6">
          <span>{thread.messageCount} messages</span>
          <span>•</span>
          <span>{thread.lastActivity.toLocaleDateString('fr-FR')}</span>
        </div>
      </div>
    </div>
  )}

  {/* Vue COMPACTE (15-30px) - 1 ligne */}
  {threadHeaderHeight > 15 && threadHeaderHeight <= 30 && (
    <div className="flex items-center justify-between h-full">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className={`text-xs flex-shrink-0 ${isExpanded ? 'text-bandhu-primary' : 'text-gray-400'}`}>
          {isExpanded ? '▼' : '▶'}
        </span>
        <span className="text-xs text-gray-200 truncate flex-1">{thread.label}</span>
        <span className="text-xs text-gray-500 flex-shrink-0">({thread.messageCount})</span>
      </div>
    </div>
  )}

  {/* Vue BÂTONNET (< 15px) */}
  {threadHeaderHeight <= 15 && (
    <div 
      className={`h-full w-full rounded-sm transition-all ${
        isExpanded 
          ? 'bg-gradient-to-r from-bandhu-primary/80 to-bandhu-secondary/60' 
          : 'bg-gray-600/80 hover:bg-gray-500/80'
      }`}
      title={`${thread.label} (${thread.messageCount} messages)`}
    />
  )}
</div>

                {/* Events */}
                {isExpanded && (
  <div className="bg-gray-900/20 relative px-4"> {/* ✨ AJOUTE px-4 */}
    {/* Ligne verticale */}
    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-bandhu-primary/30 to-bandhu-secondary/30" />

                    {/* Liste des events */}
                    {thread.events.map((event) => {
                      const isSelected = selectedEventIds.includes(event.id)
                      const isHovered = hoveredEventId === event.id
                      const details = getEventDetails(event.id)

                      return (
                        <div
  key={event.id}
  style={{ 
    height: `${eventHeight}px`, 
    minHeight: `${eventHeight}px`,
    maxHeight: `${eventHeight}px` // ✨ AJOUT : Empêche le contenu de pousser
  }}
  className="relative pl-8 cursor-pointer overflow-hidden group border-b border-white/5 last:border-0" // ✨ AJOUT : overflow-hidden
  onClick={() => handleEventClick(event.id, event.threadId)}
  onMouseEnter={() => setHoveredEventId(event.id)}
  onMouseLeave={() => setHoveredEventId(null)}
>
                          {/* Dot cliquable */}
                          <div
                            className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 group"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleEventSelection(event.id)
                            }}
                          >
                            {isSelected && (
                              <div className="absolute inset-0 -m-1 rounded-full bg-bandhu-primary/30 animate-ping" />
                            )}

                            <div
                              className={`
                                relative rounded-full border-2 transition-all duration-200
                                ${isSelected
                                  ? 'w-3 h-3 bg-bandhu-primary border-bandhu-primary scale-125'
                                  : event.role === 'user'
                                    ? 'w-2 h-2 bg-blue-500/20 border-blue-400 hover:scale-110'
                                    : 'w-2 h-2 bg-purple-500/20 border-purple-400 hover:scale-110'
                                }
                              `}
                            />
                          </div>

                          {/* Container event ADAPTATIF */}
<div className={`ml-4 h-full flex flex-col justify-start overflow-hidden transition-all duration-200 ${eventHeight > 20 ? 'rounded-lg border bg-gray-800/20 border-gray-700/30' : ''}`}>
  
  {/* NIVEAU 1-2 : Preview 10 ou 5 lignes (> 72px) */}
  {eventHeight > 72 && (
    <div
      className={`p-3 rounded-lg border h-full flex flex-col ${
        isSelected
          ? 'bg-gradient-to-r from-bandhu-primary/5 to-purple-500/5 border-bandhu-primary shadow-sm'
          : isHovered
            ? 'bg-gray-800/40 border-gray-600'
            : 'bg-gray-800/20 border-gray-700/30'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-400">
          {event.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${
          event.role === 'user' ? 'bg-blue-900/20 text-blue-300' : 'bg-purple-900/20 text-purple-300'
        }`}>
          {event.role === 'user' ? 'Vous' : 'Assistant'}
        </span>
      </div>
      {details && (
        <p className={`text-sm text-gray-200 flex-1 break-words [word-break:break-word] overflow-hidden ${
  eventHeight > 80 ? 'line-clamp-[10]' : 'line-clamp-5'
}`}>
  {details.contentPreview}
</p>
      )}
    </div>
  )}

  {/* NIVEAU 3-4 : Preview 3 ou 2 lignes (48-72px) */}
  {eventHeight > 48 && eventHeight <= 72 && (
    <div
      className={`p-3 rounded-lg border h-full flex flex-col ${
        isSelected
          ? 'bg-gradient-to-r from-bandhu-primary/5 to-purple-500/5 border-bandhu-primary shadow-sm'
          : isHovered
            ? 'bg-gray-800/40 border-gray-600'
            : 'bg-gray-800/20 border-gray-700/30'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-gray-400">
          {event.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${
          event.role === 'user' ? 'bg-blue-900/20 text-blue-300' : 'bg-purple-900/20 text-purple-300'
        }`}>
          {event.role === 'user' ? 'Vous' : 'Assistant'}
        </span>
      </div>
      {details && (
        <p className={`text-sm text-gray-200 flex-1 ${
          eventHeight > 64 ? 'line-clamp-3' : 'line-clamp-2'
        }`}>
          {details.contentPreview}
        </p>
      )}
    </div>
  )}

  {/* NIVEAU 5 : Preview 1 ligne (32-48px) */}
  {eventHeight > 32 && eventHeight <= 48 && (
    <div
      className={`p-2 rounded-lg border h-full flex flex-col ${
        isSelected
          ? 'bg-gradient-to-r from-bandhu-primary/5 to-purple-500/5 border-bandhu-primary shadow-sm'
          : isHovered
            ? 'bg-gray-800/40 border-gray-600'
            : 'bg-gray-800/20 border-gray-700/30'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 flex-shrink-0">
          {event.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        {details && (
          <span className="text-xs text-gray-300 truncate flex-1">
            {details.contentPreview}
          </span>
        )}
      </div>
    </div>
  )}

  {/* NIVEAU 6 : Juste heure - Mini-container (20-32px) */}
  {eventHeight > 20 && eventHeight <= 32 && (
    <div
      className={`p-1.5 rounded border h-full flex items-center ${
        isSelected
          ? 'bg-bandhu-primary/10 border-bandhu-primary'
          : isHovered
            ? 'bg-gray-800/40 border-gray-600'
            : 'bg-gray-800/20 border-gray-700/30'
      }`}
    >
      <span className="text-[10px] text-gray-400">
        {event.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )}

  {/* NIVEAU 7 : Bâtonnet avec dot (12-20px) */}
  {eventHeight > 12 && eventHeight <= 20 && (
    <div
      className={`h-full rounded-sm transition-all ${
        isSelected
          ? 'bg-bandhu-primary'
          : event.role === 'user'
            ? 'bg-blue-500/70'
            : 'bg-purple-500/70'
      }`}
      title={`${event.createdAt.toLocaleTimeString()}: ${details?.contentPreview || ''}`}
    />
  )}

  {/* NIVEAU 8 : Bâtonnet ultra-dense (< 12px) */}
  {eventHeight <= 12 && (
    <div
      className={`h-full rounded-sm transition-all ${
        isSelected
          ? 'bg-bandhu-primary/90'
          : event.role === 'user'
            ? 'bg-blue-500/60'
            : 'bg-purple-500/60'
      }`}
      title={details?.contentPreview || event.id}
    />
  )}
</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-600 text-center py-1 border-t border-gray-800/30">
        <span className="opacity-70">Ctrl+Molette pour zoomer</span>
      </div>
    </div>
  )
}