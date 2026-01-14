'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect, useLayoutEffect, startTransition } from 'react'
import { useTimelineData, useTimelineRender, useZoom } from '@/contexts/TimelineContext'
import type { EventMetadata } from '@/types/timeline'
import { getPinColor } from '@/constants/pinColors'

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

interface ThreadsViewProps {
  activeThreadId?: string | null
  currentVisibleEventId?: string | null
}

export default function ThreadsView({ activeThreadId, currentVisibleEventId }: ThreadsViewProps) {
  // Data Context - Threads, events, sélection, pins
const {
  threads,
  eventsMetadata,
  selectedEventIds,
  toggleEventSelection,
  getEventDetails,
  loadDetails,
  pinnedEventIds,
  pinnedEventsColors
} = useTimelineData()

// Render Context - Calculs de position
const { msPerPixel, dateToY } = useTimelineRender()

// Zoom Context
const { zoomIn, zoomOut } = useZoom()



  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isZooming, setIsZooming] = useState(false)
  const isZoomingRef = useRef(false)
  const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(new Set())
  const [frozenHeaderHeight, setFrozenHeaderHeight] = useState<number | null>(null)
  const [isMouseOver, setIsMouseOver] = useState(false)
  const [currentScrollPosition, setCurrentScrollPosition] = useState(0)
  
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
  // --- ZOOM EXTRÊME (plafond réduit à 280px) ---
  { msPerPixel: 20,          height: 280 }, 
  { msPerPixel: 100,         height: 200 }, 
  { msPerPixel: 500,         height: 140 },
  { msPerPixel: 1000,        height: 100 },

  // --- TRANSITION DOUCE ---
  { msPerPixel: 2000,        height: 95 },
  { msPerPixel: 3500,        height: 90 },
  { msPerPixel: 5000,        height: 85 },
  { msPerPixel: 15000,       height: 64 },
  { msPerPixel: 60000,       height: 48 },
  { msPerPixel: 120000,      height: 42 },
  { msPerPixel: 300000,      height: 20 },
  { msPerPixel: 1000000,     height: 15 },
  { msPerPixel: 3600000,     height: 12 },
  { msPerPixel: 604800000,   height: 6 },
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

  /* -------------------- GESTION DU ZOOM (VERSION STABILISÉE) -------------------- */
useEffect(() => {
  const container = scrollContainerRef.current;
  if (!container) return;

  let lastWheelTime = 0;
  const WHEEL_THROTTLE_MS = 50;

  const handleWheel = (e: WheelEvent) => {
    // Bloquer le zoom navigateur
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    e.stopPropagation();

    // Throttle
    const now = Date.now();
    if (now - lastWheelTime < WHEEL_THROTTLE_MS) return;
    lastWheelTime = now;

    // ✨ CAPTURE L'ANCRE UNE SEULE FOIS au début du zoom
    if (!anchorElementRef.current) {
      const containerRect = container.getBoundingClientRect();
      const centerY = containerRect.top + containerRect.height / 2;
      
      const elements = Array.from(container.querySelectorAll('[data-message-id], .thread-header-item'));
      let closest: Element | null = null;
      let minDistance = Infinity;

      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        const dist = Math.abs((rect.top + rect.height / 2) - centerY);
        if (dist < minDistance) {
          minDistance = dist;
          closest = el;
        }
      }

      if (closest) {
        anchorElementRef.current = closest;
        // Position relative au haut du container
        anchorOffsetRef.current = closest.getBoundingClientRect().top - containerRect.top;
        isZoomingRef.current = true;
        setIsZooming(true);
      }
    }

    // Zoom
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };

  // Reset de l'ancre après inactivité
  let timer: NodeJS.Timeout;
  const onWheelEnd = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      anchorElementRef.current = null;
      isZoomingRef.current = false;
      setIsZooming(false);
    }, 300);
  };

  container.addEventListener('wheel', handleWheel, { passive: false });
  container.addEventListener('wheel', onWheelEnd);

  return () => {
    container.removeEventListener('wheel', handleWheel);
    container.removeEventListener('wheel', onWheelEnd);
  };
}, [zoomIn, zoomOut]);

/* -------------------- GESTION DU PINCH-TO-ZOOM MOBILE -------------------- */
useEffect(() => {
  const container = scrollContainerRef.current
  if (!container) return

  let initialDistance = 0
  let lastZoomTime = 0
  const ZOOM_THROTTLE = 100 // ms entre chaque zoom

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      // Capturer la distance initiale entre les 2 doigts
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      initialDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault() // Empêche le zoom du navigateur
      
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )

      // Throttle pour éviter trop de zooms
      const now = Date.now()
      if (now - lastZoomTime < ZOOM_THROTTLE) return
      lastZoomTime = now

      // Calculer la différence
      const diff = currentDistance - initialDistance

      if (Math.abs(diff) > 20) { // Seuil de sensibilité
        if (diff > 0) {
          zoomIn() // Écarter les doigts = zoom avant
        } else {
          zoomOut() // Rapprocher les doigts = zoom arrière
        }
        initialDistance = currentDistance // Reset la référence
      }
    }
  }

  const handleTouchEnd = () => {
    initialDistance = 0
  }

  container.addEventListener('touchstart', handleTouchStart, { passive: false })
  container.addEventListener('touchmove', handleTouchMove, { passive: false })
  container.addEventListener('touchend', handleTouchEnd)

  return () => {
    container.removeEventListener('touchstart', handleTouchStart)
    container.removeEventListener('touchmove', handleTouchMove)
    container.removeEventListener('touchend', handleTouchEnd)
  }
}, [zoomIn, zoomOut])

// ✨ COMPENSATION SYNCHRONE - S'exécute après le render mais avant l'affichage
useLayoutEffect(() => {
  if (!anchorElementRef.current || !scrollContainerRef.current || !isZoomingRef.current) return;

  const container = scrollContainerRef.current;
  const anchor = anchorElementRef.current;
  
  const containerRect = container.getBoundingClientRect();
  const currentAnchorRect = anchor.getBoundingClientRect();

  // Calculer de combien l'élément a bougé par rapport à notre offset cible
  const currentOffset = currentAnchorRect.top - containerRect.top;
  const diff = currentOffset - anchorOffsetRef.current;

  if (Math.abs(diff) > 0.5) {
    // Ajuster le scroll pour annuler le mouvement
    container.scrollTop += diff;
  }
}, [msPerPixel]); // ← Se déclenche automatiquement à chaque zoom

/* -------------------- 🔍 DIAGNOSTIC : Détecteur de conflit d'ancrage -------------------- */
useEffect(() => {
  const container = scrollContainerRef.current
  if (!container) return

  let lastScrollTop = container.scrollTop
  
  const detectScrollChange = () => {
    const currentScrollTop = container.scrollTop
    
    if (Math.abs(currentScrollTop - lastScrollTop) > 2 && isZoomingRef.current) {
      console.warn('🚨 SCROLL MODIFIÉ PENDANT LE ZOOM !')
      console.warn('   Delta:', currentScrollTop - lastScrollTop)
      console.warn('   Coupable: Probablement Scroll Anchoring natif')
    }
    
    lastScrollTop = currentScrollTop
    requestAnimationFrame(detectScrollChange)
  }
  
  const rafId = requestAnimationFrame(detectScrollChange)
  
  return () => cancelAnimationFrame(rafId)
}, [])

/* -------------------- GESTION UI CTRL/CMD -------------------- */
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setIsZooming(true);
    }
  };
  
  const handleKeyUp = (e: KeyboardEvent) => {
    if (!e.ctrlKey && !e.metaKey) {
      setIsZooming(false);
    }
  };
  
  const handleBlur = () => {
    setIsZooming(false);
  };
  
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('blur', handleBlur);
  
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('blur', handleBlur);
  };
}, []);

/* -------------------- CURSEUR ZOOM CTRL/CMD -------------------- */
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) setIsZooming(true)
  }
  const handleKeyUp = (e: KeyboardEvent) => {
    if (!e.ctrlKey && !e.metaKey) setIsZooming(false)
  }
  const handleBlur = () => setIsZooming(false)

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('blur', handleBlur)

  return () => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
    window.removeEventListener('blur', handleBlur)
  }
}, [])

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

  /* -------------------- Auto-expand + zoom + scroll au mount (PREMIÈRE FOIS SEULEMENT) -------------------- */

const hasInitializedRef = useRef(false)

useEffect(() => {
  if (!activeThreadId || hasInitializedRef.current) return

  hasInitializedRef.current = true

  // 1. Forcer un zoom confortable
  const targetMsPerPixel = 15000 // 15s/px = events à ~64px
  
  // Zoomer progressivement
  if (msPerPixel > targetMsPerPixel * 2) {
    // Trop dézoomé, zoomer
    for (let i = 0; i < 5; i++) {
      setTimeout(() => zoomIn(), i * 100)
    }
  } else if (msPerPixel < targetMsPerPixel / 2) {
    // Trop zoomé, dézoomer
    for (let i = 0; i < 3; i++) {
      setTimeout(() => zoomOut(), i * 100)
    }
  }

  // 2. Expand le thread
  setTimeout(() => {
    setExpandedThreadIds(prev => {
      const newSet = new Set(prev)
      newSet.add(activeThreadId)
      return newSet
    })
  }, 500)

  // 3. Scroll vers currentVisibleEventId si dispo, sinon vers le thread
  setTimeout(() => {
    const container = scrollContainerRef.current
    if (!container) return

    let targetElement: Element | null = null

    if (currentVisibleEventId) {
      targetElement = container.querySelector(`[data-message-id="${currentVisibleEventId}"]`)
    }

    if (!targetElement) {
      targetElement = container.querySelector(`[data-thread-id="${activeThreadId}"]`)
    }

    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, 600)
}, [activeThreadId])

/* -------------------- Marqueur "Vous êtes ici" = LIGNE HORIZONTALE sur l'event visible dans ChatPage -------------------- */

useEffect(() => {
  if (!currentVisibleEventId) {
    const oldMarker = document.querySelector('.here-marker')
    if (oldMarker) oldMarker.remove()
    return
  }

  const updateMarker = () => {
  const oldMarker = document.querySelector('.here-marker')
  if (oldMarker) oldMarker.remove()

  const container = scrollContainerRef.current
  if (!container) return

  // ✅ CHERCHER SEULEMENT DANS LE CONTAINER DE THREADSVIEW
  const eventElement = container.querySelector(`[data-message-id="${currentVisibleEventId}"]`)
  if (!eventElement) return
    if (container) {
      const elementRect = eventElement.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      
      if (elementRect.bottom < containerRect.top || elementRect.top > containerRect.bottom) {
        return
      }
    }

    const marker = document.createElement('div')
marker.className = 'here-marker absolute left-2 right-2 top-1/2 -translate-y-1/2 z-50 pointer-events-none'
marker.innerHTML = `
  <div class="relative w-full h-16 bg-gradient-to-r from-transparent via-blue-500/40 to-transparent shadow-[0_0_12px_rgba(59,130,246,0.5)]"></div>
`

    if (window.getComputedStyle(eventElement).position === 'static') {
      eventElement.classList.add('relative')
    }
    eventElement.appendChild(marker)
  }

  updateMarker()

  let animationFrameId: number
  const continuousUpdate = () => {
    updateMarker()
    animationFrameId = requestAnimationFrame(continuousUpdate)
  }
  animationFrameId = requestAnimationFrame(continuousUpdate)

  return () => {
    cancelAnimationFrame(animationFrameId)
    const oldMarker = document.querySelector('.here-marker')
    if (oldMarker) oldMarker.remove()
  }
}, [currentVisibleEventId])

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
  <div 
    className="h-full flex flex-col"
    onMouseEnter={() => setIsMouseOver(true)}
    onMouseLeave={() => setIsMouseOver(false)}
  >
      {/* Header */}
      <div className="text-xs text-gray-500 mb-4 px-2 flex items-center justify-between">
  <span>{threadsWithEvents.length} threads</span>
  <span className="text-bandhu-primary">
    {Math.round((eventHeight / 280) * 100)}%
  </span>
</div>

      {/* Scroll container */}
      <div
  ref={scrollContainerRef}
  className="flex-1 overflow-y-auto pl-2 overscroll-none relative scrollbar-bandhu"
  style={{ 
    overflowAnchor: 'none', 
    scrollBehavior: 'auto',
  }}
>
        {/* Viseur de zoom */}
        <div 
          className={`sticky top-1/2 left-0 right-0 -translate-y-1/2 pointer-events-none z-50 flex items-center justify-between transition-all duration-500 ${
            isMouseOver && isZooming ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
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
  data-thread-id={thread.id}
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

    {thread.events.map((event, index) => {
  const isSelected = selectedEventIds.includes(event.id)
  const isPinned = pinnedEventIds.includes(event.id)
  const pinColor = getPinColor(pinnedEventsColors.get(event.id) || 'yellow')
  const details = getEventDetails(event.id)

      // Détecter si on change de jour
      const showDateSeparator = index === 0 || (() => {
        const currentDate = new Date(event.createdAt).toISOString().split('T')[0]
        const previousDate = new Date(thread.events[index - 1].createdAt).toISOString().split('T')[0]
        return currentDate !== previousDate
      })()

      // Formatter la date
const getDateLabel = (dateString: Date) => {
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today.getTime() - 86400000)
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  if (messageDate.getTime() === today.getTime()) return "Aujourd'hui"
  if (messageDate.getTime() === yesterday.getTime()) return "Hier"
  
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  
  return `${day}/${month}/${year}`
}

      return (
        <React.Fragment key={event.id}>
          {/* Séparateur de date */}
{showDateSeparator && (
  <div className="flex items-center gap-2 my-3 px-2">
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
      {getDateLabel(event.createdAt)}
    </span>
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
  </div>
)}

          {/* Event */}
          <div
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
    <div 
      className="absolute inset-0 rounded-full bg-bandhu-primary/30 animate-ping"
      style={{
        width: Math.max(14, eventHeight * 0.20),
        height: Math.max(14, eventHeight * 0.20)
      }}
    />
  )}
  <div
    className={`rounded-full border transition-all duration-200 flex-shrink-0 ${
      isSelected
        ? 'bg-bandhu-primary border-bandhu-primary shadow-[0_0_8px_rgba(168,85,247,0.6)]'
        : event.role === 'user'
          ? 'bg-blue-500/40 border-blue-400'
          : 'bg-purple-500/40 border-purple-400'
    }`}
    style={{ 
      width: isSelected 
        ? Math.max(12, eventHeight * 0.18) 
        : Math.max(6, eventHeight * 0.14),
      height: isSelected 
        ? Math.max(12, eventHeight * 0.18) 
        : Math.max(6, eventHeight * 0.14)
    }}
  />
</div>

                          {/* Bâtonnet PIN - À DROITE, COULEUR DYNAMIQUE */}
{isPinned && (
  <div 
    className="absolute -right-1 top-0 bottom-0 w-1 rounded-full"
    style={{
      background: `linear-gradient(to bottom, ${pinColor.glow.replace('rgba(', 'rgb(').replace(',0.6)', ')')}, ${pinColor.glow.replace('0.6)', '0.8)')}, ${pinColor.glow.replace('0.6)', '1)')})`,
      boxShadow: `0 0 8px ${pinColor.glow}`
    }}
  />
)}

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
  WebkitLineClamp: Math.floor(eventHeight / 20),
  overflow: 'hidden'
}}
                              >
                                {details.contentPreview}
                              </p>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}