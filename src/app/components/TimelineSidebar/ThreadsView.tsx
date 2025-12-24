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
  const mappings = [
    { msPerPixel: 20,          height: 400 }, // ✨ NOUVEAU : Zoom Ultra (Full message)
    { msPerPixel: 50,          height: 250 }, // ✨ NOUVEAU : Zoom Très Large
    { msPerPixel: 100,         height: 150 }, // Max précédent
    { msPerPixel: 500,         height: 110 },
    { msPerPixel: 1000,        height: 100 },
    { msPerPixel: 5000,        height: 80  },
    { msPerPixel: 15000,       height: 64  },
    { msPerPixel: 60000,       height: 48  },
    { msPerPixel: 300000,      height: 32  },
    { msPerPixel: 3600000,     height: 16  },
    { msPerPixel: 86400000,    height: 8   },
    { msPerPixel: 604800000,   height: 6   },
  ]

  let lower = mappings[0]
  let upper = mappings[mappings.length - 1]

  for (let i = 0; i < mappings.length - 1; i++) {
    if (msPerPixel >= mappings[i].msPerPixel && msPerPixel <= mappings[i + 1].msPerPixel) {
      lower = mappings[i]
      upper = mappings[i + 1]
      break
    }
  }

  const ratio = (msPerPixel - lower.msPerPixel) / (upper.msPerPixel - lower.msPerPixel)
  const interpolated = lower.height + (upper.height - lower.height) * ratio

  return Math.round(interpolated)
}, [msPerPixel])

/* -------------------- Calcul hauteur thread header adaptatif -------------------- */

const threadHeaderHeight = useMemo(() => {
  if (eventHeight >= 21) return THREAD_HEADER_HEIGHT_NORMAL  // Normal (48px)
  if (eventHeight > 10) return THREAD_HEADER_HEIGHT_COMPACT  // Compact (24px)
  return THREAD_HEADER_HEIGHT_STICK                          // Bâtonnet (8px)
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
  const details = getEventDetails(event.id)

  return (
    <div
      key={event.id}
      style={{ 
        height: eventHeight >= 21 ? 'auto' : `${eventHeight}px`,
        minHeight: `${eventHeight}px`,
        maxHeight: eventHeight >= 21 ? 'none' : `${eventHeight}px`
      }}
      className="relative cursor-pointer group pb-4" // On enlève pl-8 ici pour mieux contrôler
      onClick={() => handleEventClick(event.id, event.threadId)}
    >
      {/* 1. LE DOT (Cercle) - Toujours centré sur le bâtonnet */}
<div
  className="absolute left-0 top-1/2 -translate-y-1/2 w-8 flex justify-center z-20" 
  onClick={(e) => {
    e.stopPropagation()
    toggleEventSelection(event.id)
  }}
>
  {isSelected && (
    <div className="absolute inset-0 rounded-full bg-bandhu-primary/30 animate-ping scale-75" />
  )}
  <div
    className={`rounded-full border transition-all duration-200 flex-shrink-0 ${
      isSelected
        ? 'w-2.5 h-2.5 bg-bandhu-primary border-bandhu-primary shadow-[0_0_8px_rgba(var(--bandhu-primary-rgb),0.6)]'
        : event.role === 'user'
          ? 'w-1.5 h-1.5 bg-blue-500/40 border-blue-400'
          : 'w-1.5 h-1.5 bg-purple-500/40 border-purple-400'
    }`}
    style={{ 
      // ✨ On adapte la taille du point pour qu'il ne dépasse pas du bâtonnet de 6px
      minWidth: eventHeight < 15 ? '4px' : isSelected ? '10px' : '6px', 
      minHeight: eventHeight < 15 ? '4px' : isSelected ? '10px' : '6px' 
    }}
  />
</div>

      {/* 2. LE CONTAINER DE TEXTE (Repoussé vers la droite) */}
      <div className={`ml-10 mr-2 transition-all duration-200 ${
        eventHeight >= 21 
          ? 'rounded-lg border p-3 bg-gray-800/20 border-gray-700/30 shadow-sm' 
          : 'border-l-2 border-white/10 px-2'
      } ${
        isSelected ? 'border-bandhu-primary/50 bg-bandhu-primary/5' : ''
      }`}>
        
        {/* Infos (Heure + Badge) */}
        {eventHeight > 48 && (
          <div className="flex items-center gap-2 mb-2 flex-shrink-0">
            <span className="text-[10px] text-gray-500 font-medium">
              {event.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase ${
              event.role === 'user' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
            }`}>
              {event.role === 'user' ? 'Vous' : 'AI'}
            </span>
          </div>
        )}

        {/* Le Texte (Full Rush intelligent) */}
        {details && (
          <p className={`text-gray-200 leading-tight break-words [word-break:break-word] ${
            eventHeight >= 150 ? 'text-base line-clamp-none' : // ✨ On libère tout à partir de 150px
  eventHeight >= 72  ? 'text-sm line-clamp-5' : 
  'text-[9px] line-clamp-1 opacity-70'
          }`}>
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