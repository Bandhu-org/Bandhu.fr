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
  const [isZooming, setIsZooming] = useState(false)
  const isZoomingRef = useRef(false)
  const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(new Set())
  const [frozenHeaderHeight, setFrozenHeaderHeight] = useState<number | null>(null)
  
  // ✨ NOUVEAU : Verrouillage de l'élément d'ancrage
  const anchorElementRef = useRef<Element | null>(null)
  const anchorOffsetRef = useRef<number>(0)

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
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      }))
      .sort((a, b) => a.lastActivity.getTime() - b.lastActivity.getTime())
  }, [threads, eventsMetadata])

  /* -------------------- Calcul hauteur event -------------------- */

  const eventHeight = useMemo(() => {
    const mappings = [
      { msPerPixel: 20,          height: 400 },
      { msPerPixel: 1000,        height: 100 },
      { msPerPixel: 5000,        height: 85  },
      { msPerPixel: 15000,       height: 64  }, 
      { msPerPixel: 60000,       height: 48  },
      { msPerPixel: 120000,      height: 42  },
      { msPerPixel: 300000,      height: 20  },
      { msPerPixel: 1000000,     height: 15  },
      { msPerPixel: 3600000,     height: 12  }, 
      { msPerPixel: 604800000,   height: 6   },
    ]

    if (msPerPixel <= mappings[0].msPerPixel) return mappings[0].height
    if (msPerPixel >= mappings[mappings.length - 1].msPerPixel) return mappings[mappings.length - 1].height

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

    return Math.round(interpolated * 10) / 10
  }, [msPerPixel])

  /* -------------------- Calcul hauteur thread header -------------------- */

  const threadHeaderHeight = useMemo(() => {
    if (eventHeight <= 12) return 8
    
    if (eventHeight < 64) {
      const ratio = (eventHeight - 12) / (64 - 12)
      return Math.round(8 + (24 - 8) * ratio)
    }

    if (eventHeight < 150) {
      const ratio = (eventHeight - 64) / (150 - 64)
      return Math.round(24 + (48 - 24) * ratio)
    }

    return 48
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

  /* -------------------- GESTION DU ZOOM (FUSION VØR-KHÔRA) -------------------- */
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    let pendingZoomTimeout: NodeJS.Timeout | null = null

    const handleWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) {
        if (isZooming) setIsZooming(false)
        return
      }

      e.preventDefault()
      e.stopPropagation()

      // 1. THROTTLE & UI
      if (isZoomingRef.current) {
        if (pendingZoomTimeout) clearTimeout(pendingZoomTimeout)
        pendingZoomTimeout = setTimeout(() => { isZoomingRef.current = false }, 200)
        return
      }

      isZoomingRef.current = true
      setIsZooming(true)
      setFrozenHeaderHeight(threadHeaderHeight)

      // 2. CAPTURE DE L'ANCRE (Logique Khôra : Chercher un event ou un header)
      if (!anchorElementRef.current) {
        const containerRect = container.getBoundingClientRect()
        const viewportCenterY = containerRect.top + containerRect.height / 2

        // Chercher d'abord un EVENT
        const eventElements = Array.from(container.querySelectorAll('[data-message-id]'))
        let closestElement: Element | null = null
        let closestDistance = Infinity

        for (const el of eventElements) {
          const rect = el.getBoundingClientRect()
          const elementTopY = rect.top
          const distance = Math.abs(elementTopY - viewportCenterY)
          if (distance < closestDistance) {
            closestDistance = distance
            closestElement = el
          }
        }

        // Backup sur un Header de Thread si pas d'event
        if (!closestElement) {
          closestElement = container.querySelector('.thread-header-item') || container.firstElementChild
        }

        if (closestElement) {
          anchorElementRef.current = closestElement
          const elementRect = closestElement.getBoundingClientRect()
          // On mémorise la distance exacte entre le haut de l'élément et le haut du container
          anchorOffsetRef.current = elementRect.top - containerRect.top
          console.log('🔒 ANCRE FIXÉE:', closestElement.getAttribute('data-message-id') || 'header')
        }
      }

      // 3. ACTION DE ZOOM
      if (e.deltaY < 0) zoomIn()
      else zoomOut()

      // 4. CORRECTION PHYSIQUE (Triple Frame pour garantir le Layout)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (anchorElementRef.current && container) {
              const containerRect = container.getBoundingClientRect()
              const elementRect = anchorElementRef.current.getBoundingClientRect()

              // Calcul de la dérive (où est l'élément - où il devrait être)
              const currentOffset = elementRect.top - containerRect.top
              const offsetDiff = currentOffset - anchorOffsetRef.current

              // Correction du scroll
              if (Math.abs(offsetDiff) > 0.5) {
                container.scrollTop += offsetDiff
                // ✨ Mise à jour de l'offset pour la frame suivante (Recalibrage Khôra)
                const updatedRect = anchorElementRef.current.getBoundingClientRect()
                anchorOffsetRef.current = updatedRect.top - containerRect.top
                console.log('🔧 Scroll corrigé, diff:', offsetDiff.toFixed(1), 'px')
              }
            }

            // Déverrouillage progressif
            setTimeout(() => {
              setFrozenHeaderHeight(null)
              isZoomingRef.current = false
              setIsZooming(false)
              
              // Libération de l'ancre après une pause (évite de recalculer l'ancre en plein zoom)
              setTimeout(() => {
                if (!isZoomingRef.current) {
                  anchorElementRef.current = null
                  console.log('🔓 ANCRE LIBÉRÉE')
                }
              }, 300)
            }, 50)
          })
        })
      })
    }

    // Listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) setIsZooming(true)
    }
    const handleKeyUp = () => setIsZooming(false)

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', () => setIsZooming(false))
    container.addEventListener('wheel', handleWheel, { passive: false, capture: true })

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', () => setIsZooming(false))
      container.removeEventListener('wheel', handleWheel, { capture: true } as any)
      if (pendingZoomTimeout) clearTimeout(pendingZoomTimeout)
    }
  }, [zoomIn, zoomOut, msPerPixel, threadHeaderHeight, isZooming])

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
      <div className="text-xs text-gray-500 mb-4 px-2">
        {threadsWithEvents.length} threads •{' '}
        <span className="text-bandhu-primary ml-1">
          {eventHeight.toFixed(0)}px/event
        </span>
        <span className="text-purple-400 ml-2">
          • header: {threadHeaderHeight}px
        </span>
      </div>

      {/* Scroll container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pl-2 overscroll-none relative"
        style={{ 
          overflowAnchor: 'none', 
          scrollBehavior: 'auto',
        }}
      >
        {/* Viseur de zoom */}
        <div 
          className={`sticky top-1/2 left-0 right-0 -translate-y-1/2 pointer-events-none z-50 flex items-center justify-between transition-all duration-500 ${
            isZooming ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          style={{ height: '0px' }} 
        >
          <div className="absolute left-0 right-0 h-[60px] bg-blue-600/10 blur-2xl -translate-y-1/2" />
          <div className="absolute left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
          <div className="absolute left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
          <div className="flex justify-between w-full px-2">
            <div className="text-[14px] text-blue-400 animate-pulse font-black drop-shadow-[0_0_5px_rgba(0,0,0,0.8)]">▶</div>
            <div className="text-[14px] text-blue-400 animate-pulse font-black drop-shadow-[0_0_5px_rgba(0,0,0,0.8)]">◀</div>
          </div>
        </div>

        {/* Threads list */}
        <div className="space-y-2 pb-10">
          {threadsWithEvents.map(thread => {
            const isExpanded = expandedThreadIds.has(thread.id)

            return (
              <div
                key={thread.id}
                className="border border-gray-700/50 rounded-lg overflow-hidden bg-gray-900/10"
              >
                {/* Thread header */}
                <div
                  onClick={() => toggleThread(thread.id)}
                  className="cursor-pointer transition-colors bg-gray-800/40 hover:bg-gray-800/60 overflow-hidden relative"
                  style={{ 
                    height: frozenHeaderHeight ?? threadHeaderHeight,
                    paddingLeft: threadHeaderHeight > 15 ? '0.75rem' : '0.25rem',
                    paddingRight: threadHeaderHeight > 15 ? '0.75rem' : '0.25rem'
                  }}
                >
                  <div className="flex items-center h-full gap-2">
                    <span 
                      className={`text-[10px] transition-all duration-300 flex-shrink-0 ${isExpanded ? 'text-bandhu-primary' : 'text-gray-400'}`}
                      style={{ 
                        opacity: threadHeaderHeight > 18 ? 1 : 0,
                        transform: `scale(${threadHeaderHeight > 18 ? 1 : 0.5})`
                      }}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    
                    <span 
                      className="text-gray-200 truncate flex-1 transition-all duration-300 font-bold"
                      style={{ 
                        fontSize: threadHeaderHeight > 32 ? '14px' : '11px',
                        opacity: threadHeaderHeight > 22 ? 1 : 0,
                        textShadow: threadHeaderHeight > 40 ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                      }}
                    >
                      {thread.label}
                    </span>

                    {threadHeaderHeight > 30 && (
                      <span className="text-[10px] text-gray-500 opacity-60">
                        ({thread.messageCount})
                      </span>
                    )}

                    <div 
                      className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
                        isExpanded ? 'bg-gradient-to-r from-bandhu-primary/40 to-bandhu-secondary/20' : 'bg-gray-700/40'
                      }`}
                      style={{ opacity: threadHeaderHeight <= 18 ? 1 : 0 }}
                    />
                  </div>
                </div>

                {/* Events */}
                {isExpanded && (
                  <div className="bg-gray-900/20 relative px-4 py-2 space-y-2">
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-bandhu-primary/30 to-bandhu-secondary/30" />

                    {thread.events.map((event) => {
                      const isSelected = selectedEventIds.includes(event.id)
                      const details = getEventDetails(event.id)

                      return (
                        <div
                          key={event.id}
                          data-message-id={event.id}
                          style={{ 
                            height: `${eventHeight}px`,
                            minHeight: `${eventHeight}px`,
                          }}
                          className={`relative cursor-pointer group transition-colors duration-300 ${
                            isSelected ? 'z-30' : 'z-10'
                          }`}
                          onClick={() => handleEventClick(event.id, event.threadId)}
                        >
                          {/* Dot */}
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
                                  ? 'w-2.5 h-2.5 bg-bandhu-primary border-bandhu-primary shadow-[0_0_8px_rgba(168,85,247,0.6)]'
                                  : event.role === 'user'
                                    ? 'w-1.5 h-1.5 bg-blue-500/40 border-blue-400'
                                    : 'w-1.5 h-1.5 bg-purple-500/40 border-purple-400'
                              }`}
                              style={{ 
                                minWidth: eventHeight < 15 ? '4px' : isSelected ? '10px' : '6px', 
                                minHeight: eventHeight < 15 ? '4px' : isSelected ? '10px' : '6px' 
                              }}
                            />
                          </div>

                          {/* Container event */}
                          <div 
                            className={`ml-10 mr-2 flex flex-col transition-colors duration-200 ${
                              eventHeight >= 32 
                                ? 'rounded-lg border bg-gray-800/20 border-gray-700/30 shadow-sm' 
                                : 'border-l-2 border-white/10'
                            }`}
                            style={{
                              height: `${eventHeight}px`,
                              padding: eventHeight > 48 ? '12px' : eventHeight > 32 ? '8px' : '4px',
                              opacity: eventHeight <= 10 ? 0 : eventHeight <= 20 ? (eventHeight - 10) / 10 : 1,
                              overflow: 'hidden'
                            }}
                          >
                            {/* Header (heure/role) */}
                            {eventHeight >= 58 && (
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] text-gray-500 font-medium">
                                  {event.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold ${
                                  event.role === 'user' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                                }`}>
                                  {event.role === 'user' ? 'Vous' : 'AI'}
                                </span>
                              </div>
                            )}

                            {/* Preview */}
                            {details && eventHeight >= 20 && (
                              <p 
                                className="text-gray-200 leading-tight break-words"
                                style={{
                                  fontSize: eventHeight >= 120 ? '15px' : eventHeight <= 40 ? '11px' : `${11 + (eventHeight - 40) * (4 / 80)}px`,
                                  display: '-webkit-box',
                                  WebkitBoxOrient: 'vertical',
                                  WebkitLineClamp: eventHeight >= 150 ? 10 : eventHeight >= 120 ? 6 : eventHeight >= 95 ? 5 : eventHeight >= 82 ? 4 : eventHeight >= 72 ? 2 : 1,
                                  overflow: 'hidden'
                                }}
                              >
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