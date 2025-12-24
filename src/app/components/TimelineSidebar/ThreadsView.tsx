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

  /* -------------------- Calcul hauteur event (Lissage VØR) -------------------- */
const eventHeight = useMemo(() => {
  const mappings = [
    { msPerPixel: 20,          height: 400 }, // Zoom Ultra
    { msPerPixel: 50,          height: 250 }, 
    { msPerPixel: 100,         height: 150 }, 
    { msPerPixel: 500,         height: 110 },
    { msPerPixel: 1000,        height: 100 },
    { msPerPixel: 5000,        height: 85  }, // Amorti haut
    { msPerPixel: 10000,       height: 72  }, // Point de passage pour le texte 3 lignes
    { msPerPixel: 15000,       height: 64 }, 
    // ✨ MICRO-PALIERS (1 palier par pixel pour un contrôle total)
    { msPerPixel: 17500,       height: 63 }, 
    { msPerPixel: 20000,       height: 62 },
    { msPerPixel: 22500,       height: 61 },
    { msPerPixel: 25000,       height: 60 },
    { msPerPixel: 27500,       height: 59 },
    { msPerPixel: 30000,       height: 58 },
    { msPerPixel: 35000,       height: 56 },
    { msPerPixel: 45000,       height: 52  }, // Frein intermédiaire
    { msPerPixel: 60000,       height: 48  }, // 1 min / px
    
    // ✨ SAS DE DÉCOMPRESSION (Transition Bâtonnet <-> Bulle)
    { msPerPixel: 120000,      height: 42  }, 
    { msPerPixel: 240000,      height: 36  },
    { msPerPixel: 300000,      height: 32  }, // 5 min / px
    { msPerPixel: 600000,      height: 28  }, // Frein 10 min
    { msPerPixel: 900000,      height: 25  }, // 15 min / px
    { msPerPixel: 1125000,     height: 23.5}, // ~18 min / px
    { msPerPixel: 1350000,     height: 22  }, // 22.5 min / px
    { msPerPixel: 1575000,     height: 21  }, // ~26 min / px
    { msPerPixel: 1800000,     height: 20  }, // 30 min / px
    { msPerPixel: 3600000,     height: 16  }, // 1 heure / px
    
    { msPerPixel: 21600000,    height: 12  }, // 6 heures / px
    { msPerPixel: 86400000,    height: 8   }, // 1 jour / px
    { msPerPixel: 432000000,   height: 6.5 }, 
    { msPerPixel: 604800000,   height: 6   }, // 1 semaine / px
  ]

  // Sécurité bornes mini/maxi
  if (msPerPixel <= mappings[0].msPerPixel) return mappings[0].height
  if (msPerPixel >= mappings[mappings.length - 1].msPerPixel) return mappings[mappings.length - 1].height

  // Recherche des deux paliers pour l'interpolation
  let lower = mappings[0]
  let upper = mappings[mappings.length - 1]

  for (let i = 0; i < mappings.length - 1; i++) {
    if (msPerPixel >= mappings[i].msPerPixel && msPerPixel <= mappings[i + 1].msPerPixel) {
      lower = mappings[i]
      upper = mappings[i + 1]
      break
    }
  }

  // Calcul du ratio de progression entre les deux points
  const ratio = (msPerPixel - lower.msPerPixel) / (upper.msPerPixel - lower.msPerPixel)
  
  // Interpolation linéaire mathématique
  const interpolated = lower.height + (upper.height - lower.height) * ratio

  return Math.round(interpolated)
}, [msPerPixel])

/* -------------------- Calcul hauteur thread header adaptatif -------------------- */

const threadHeaderHeight = useMemo(() => {
  // 1. Zone Stick -> Compact (12px à 32px d'eventHeight)
  if (eventHeight <= 12) return 8; 
  
  if (eventHeight < 64) {
    // Transition fluide entre le bâtonnet (8px) et le mode Compact (24px)
    const ratio = (eventHeight - 12) / (64 - 12);
    return Math.round(8 + (24 - 8) * ratio);
  }

  // 2. Zone Compact -> Full (64px à 150px d'eventHeight)
  if (eventHeight < 150) {
    // Transition fluide entre le mode Compact (24px) et le mode Grand (48px)
    const ratio = (eventHeight - 64) / (150 - 64);
    return Math.round(24 + (48 - 24) * ratio);
  }

  // 3. Plafond final (au-delà de 150px d'eventHeight)
  return 48; 
}, [eventHeight]);

  /* -------------------- 1. Charger détails des events visibles -------------------- */
  useEffect(() => {
    const allExpandedEvents = threadsWithEvents
      .filter(t => expandedThreadIds.has(t.id))
      .flatMap(t => t.events)
      .map(e => e.id);

    if (allExpandedEvents.length > 0) {
      loadDetails(allExpandedEvents);
    }
  }, [expandedThreadIds, threadsWithEvents, loadDetails]);

  /* -------------------- 2. Zoom handling & Scroll Anchoring -------------------- */
useEffect(() => {
  const container = scrollContainerRef.current;
  if (!container) return;

  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();

      // 1. CAPTURE : On fige le ratio du centre de l'écran avant le changement
      const scrollTopBefore = container.scrollTop;
      const clientHeight = container.clientHeight;
      const totalHeightBefore = container.scrollHeight;
      const centerYBefore = scrollTopBefore + clientHeight / 2;
      const centerRatioBefore = centerYBefore / totalHeightBefore;

      // 2. ACTION : Zoom via tes fonctions du context
      if (e.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }

      // 3. COMPENSATION : On utilise requestAnimationFrame pour attendre le rendu
      requestAnimationFrame(() => {
        // On attend un deuxième frame pour être sûr que le scrollHeight a été mis à jour par React
        requestAnimationFrame(() => {
          const totalHeightAfter = container.scrollHeight;
          
          // On repositionne pour que le centre visuel reste au même ratio (Ancrage magnétique)
          const newCenterY = centerRatioBefore * totalHeightAfter;
          const newScrollTop = newCenterY - clientHeight / 2;

          container.scrollTop = newScrollTop;
        });
      });
    }
  };

  container.addEventListener('wheel', onWheel, { passive: false });
  return () => container.removeEventListener('wheel', onWheel);
}, [zoomIn, zoomOut, msPerPixel, threadsWithEvents]);

  /* -------------------- 2. Zoom handling & Scroll Anchoring -------------------- */
  useEffect(() => {
  const container = scrollContainerRef.current;
  if (!container) return;

  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();

      // 1. CAPTURE : On fige le ratio du centre de l'écran
      const scrollTopBefore = container.scrollTop;
      const clientHeight = container.clientHeight;
      const totalHeightBefore = container.scrollHeight;
      const centerYBefore = scrollTopBefore + clientHeight / 2;
      const centerRatioBefore = centerYBefore / totalHeightBefore;

      // 2. ACTION : Zoom
      if (e.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }

      // 3. COMPENSATION : Double RAF pour attendre la mutation des Threads
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const totalHeightAfter = container.scrollHeight;
          
          // On repositionne pour que le centre visuel reste au même ratio
          const newCenterY = centerRatioBefore * totalHeightAfter;
          const newScrollTop = newCenterY - clientHeight / 2;

          container.scrollTop = Math.max(0, newScrollTop);
        });
      });
    }
  };

  container.addEventListener('wheel', onWheel, { passive: false, capture: true });
  return () => container.removeEventListener('wheel', onWheel, { capture: true } as any);
}, [zoomIn, zoomOut, msPerPixel, threadsWithEvents]); // ✨ On écoute les threads pour compenser leur réduction

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
      {/* Header Statistique */}
      <div className="text-xs text-gray-500 mb-4 px-2">
        {threadsWithEvents.length} threads •{' '}
        <span className="text-bandhu-primary ml-1">
          {eventHeight.toFixed(0)}px/event
        </span>
      </div>

      {/* Scroll container */}
      <div
  ref={scrollContainerRef}
  className="flex-1 overflow-y-auto pl-2 overscroll-none touch-none" // ✨ overscroll-none empêche de faire bouger le parent
  style={{ 
    overflowAnchor: 'none', 
    scrollBehavior: 'auto' 
  }}
>
        <div className="space-y-2 pb-10">
          {threadsWithEvents.map(thread => {
            const isExpanded = expandedThreadIds.has(thread.id)

            return (
              <div
                key={thread.id}
                className="border border-gray-700/50 rounded-lg overflow-hidden bg-gray-900/10"
              >
                {/* Thread header ADAPTATIF */}
                <div
                  onClick={() => toggleThread(thread.id)}
                  className="thread-header-item cursor-pointer transition-colors bg-gray-800/40 hover:bg-gray-800/60 overflow-hidden relative"
                  style={{ 
                    height: threadHeaderHeight,
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

                    {/* Badge de compte */}
                    {threadHeaderHeight > 30 && (
                      <span className="text-[10px] text-gray-500 opacity-60">
                        ({thread.messageCount})
                      </span>
                    )}

                    {/* MODE BÂTONNET : Couleur pleine */}
                    <div 
                      className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
                        isExpanded ? 'bg-gradient-to-r from-bandhu-primary/40 to-bandhu-secondary/20' : 'bg-gray-700/40'
                      }`}
                      style={{ opacity: threadHeaderHeight <= 18 ? 1 : 0 }}
                    />
                  </div>
                </div>

                {/* Events list (si ouvert) */}
                {isExpanded && (
                  <div className="bg-gray-900/20 relative px-4 py-2">
                    {/* Ligne verticale de connexion */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-bandhu-primary/30 to-bandhu-secondary/30" />

                    {thread.events.map((event) => {
  const isSelected = selectedEventIds.includes(event.id)
  const details = getEventDetails(event.id)

  return (
    <div
      key={event.id}
      data-message-id={event.id} // ✨ IMPORTANT pour le scrollIntoView
      style={{ 
        height: eventHeight >= 21 ? 'auto' : `${eventHeight}px`,
        minHeight: `${eventHeight}px`,
      }}
      className={`relative cursor-pointer group pb-4 transition-colors duration-300 ${
        isSelected ? 'z-30' : 'z-10'
      }`}
      onClick={() => handleEventClick(event.id, event.threadId)}
    >
      {/* 1. LE DOT (Cercle) AVEC SÉLECTION SYNCHRO */}
      <div 
        className="absolute left-0 top-1/2 -translate-y-1/2 w-8 flex justify-center z-20"
        onClick={(e) => {
          e.stopPropagation() // Empêche de charger le thread quand on clique juste sur le point
          toggleEventSelection(event.id) // ✨ LA SYNCHRO CHAT
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
            minWidth: eventHeight < 15 ? '4px' : isSelected ? '10px' : '6px', 
            minHeight: eventHeight < 15 ? '4px' : isSelected ? '10px' : '6px' 
          }}
        />
      </div>

      {/* 2. LA BULLE (CONTAINER) */}
<div 
  className={`ml-10 mr-2 transition-all duration-300 flex flex-col justify-center ${
    eventHeight >= 32 ? 'rounded-lg border bg-gray-800/20 border-gray-700/30' : 'border-l-2 border-white/5'
  }`}
  style={{
    // ✨ ON STABILISE LE PADDING : Il ne bouge plus pendant l'ouverture du header
    paddingTop: eventHeight >= 58 ? '12px' : 
                eventHeight <= 25 ? '2px' : 
                `${2 + (eventHeight - 25) * (10 / 33)}px`,
    paddingBottom: eventHeight >= 58 ? '12px' : 
                   eventHeight <= 25 ? '2px' : 
                   `${2 + (eventHeight - 25) * (10 / 33)}px`,
    
    opacity: eventHeight <= 18 ? 0.3 : 
             eventHeight <= 25 ? (eventHeight - 18) / 7 : 1,
    minHeight: `${eventHeight}px`
  }}
>
  {/* Header (Heure/Rôle) : Ouverture au millimètre près */}
  <div 
    className="overflow-hidden transition-all duration-500"
    style={{ 
      // ✨ SYNC PARFAITE : On utilise une rampe de 58 à 64px
      height: eventHeight >= 64 ? '18px' : 
              eventHeight <= 58 ? '0px' : 
              `${(eventHeight - 58) * (18 / 6)}px`, 
              
      opacity: eventHeight >= 64 ? 1 : 
               eventHeight <= 58 ? 0 : (eventHeight - 58) / 6,
               
      marginBottom: eventHeight >= 64 ? '6px' : 
                    eventHeight <= 58 ? '0px' : 
                    `${(eventHeight - 58) * (6 / 6)}px`
    }}
  >
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="text-[10px] text-gray-500 font-medium">
        {event.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </span>
      <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold ${
        event.role === 'user' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
      }`}>
        {event.role === 'user' ? 'Vous' : 'AI'}
      </span>
    </div>
  </div>

  {/* 3. LE TEXTE DU MESSAGE */}
{details && (
  <p 
    className="text-gray-200 leading-tight break-words transition-all duration-300"
    style={{
      fontSize: eventHeight >= 120 ? '15px' : 
                eventHeight <= 40  ? '11px' : 
                `${11 + (eventHeight - 40) * (4 / 80)}px`,
      
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical',
      
      // ✨ LE DÉCALAGE MAGIQUE :
      // 1 ligne jusqu'à 72px (laisse la date s'afficher seule)
      // 2 lignes entre 72px et 82px
      // 3 lignes à partir de 82px
      WebkitLineClamp: eventHeight >= 150 ? 10 : 
                       eventHeight >= 120 ? 6 : 
                       eventHeight >= 95  ? 5 :
                       eventHeight >= 82  ? 4 :
                       eventHeight >= 72  ? 2 : 1, 
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