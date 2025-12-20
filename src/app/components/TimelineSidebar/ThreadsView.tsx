'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useTimeline } from '@/contexts/TimelineContext'
import type { EventMetadata } from '@/types/timeline'

/* ============================================================
   CONSTANTS
============================================================ */

const THREAD_HEADER_HEIGHT = 48 // Hauteur fixe du header de thread
const EVENT_MIN_HEIGHT = 8      // Hauteur minimale d'un event (ultra-zoomé)
const EVENT_MAX_HEIGHT = 96     // Hauteur maximale d'un event (zoomé max)

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
    // Plus msPerPixel est petit → Plus zoomé → Plus grand
    // msPerPixel: 100ms/px (max zoom) → 96px
    // msPerPixel: 1an/px (min zoom) → 8px

    const maxMs = 365 * 24 * 3600 * 1000 // 1 an
    const minMs = 100 // 100ms

    const ratio = Math.max(0, Math.min(1, 
      (maxMs - msPerPixel) / (maxMs - minMs)
    ))

    return EVENT_MIN_HEIGHT + (EVENT_MAX_HEIGHT - EVENT_MIN_HEIGHT) * ratio
  }, [msPerPixel])

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
                {/* Thread header */}
                <div
                  onClick={() => toggleThread(thread.id)}
                  className="cursor-pointer p-3 bg-gray-800/40 hover:bg-gray-800/60 transition"
                  style={{ height: THREAD_HEADER_HEIGHT }}
                >
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
                </div>

                {/* Events */}
                {isExpanded && (
                  <div className="bg-gray-900/20 relative">
                    {/* Ligne verticale */}
                    <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-bandhu-primary/30 to-bandhu-secondary/30" />

                    {/* Liste des events */}
                    {thread.events.map((event) => {
                      const isSelected = selectedEventIds.includes(event.id)
                      const isHovered = hoveredEventId === event.id
                      const details = getEventDetails(event.id)

                      return (
                        <div
  key={event.id}
  style={{ 
    height: eventHeight,
    minHeight: eventHeight // ✨ FORCE la hauteur min
  }}
  className="relative pl-8 cursor-pointer py-2" // ✨ pl-6 → pl-8
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

                          {/* Container event */}
                          <div
  className={`
    ml-8 min-h-full flex flex-col p-3 rounded-lg border transition-all duration-200
    ${isSelected
      ? 'bg-gradient-to-r from-bandhu-primary/5 to-purple-500/5 border-bandhu-primary shadow-sm'
      : isHovered
        ? 'bg-gray-800/40 border-gray-600'
        : 'bg-gray-800/20 border-gray-700/30'
    }
  `}
>
  {/* Heure + role */}
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

  {/* Preview */}
  {details && (
  <p className="text-sm text-gray-200 line-clamp-2 h-10">
    {details.contentPreview}
  </p>
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