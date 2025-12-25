// src/components/TimelineSidebar/TimelineView.tsx
'use client'

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useTimeline } from '@/contexts/TimelineContext'
import type { EventMetadata, EventDetails } from '@/types/timeline'

/* ============================================================
   TYPES & CONSTANTS
============================================================ */

type VisualizationMode = 'bars' | 'mini' | 'discrete'

const MINI_ITEM_HEIGHT = 32
const DISCRETE_ITEM_HEIGHT = 96

// ✨ NOUVEAU : Compteur pour éviter les events en rafale
let pendingZoomTimeout: NodeJS.Timeout | null = null

/* ============================================================
   RULER TEMPOREL
============================================================ */

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

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function TimelineView() {
  const {
    eventsMetadata,
    isLoading,
    densityRatio,
    selectedEventIds,
    toggleEventSelection,
    dateToY,
    yToDate,
    getTotalHeight,
    msPerPixel,
    zoomIn,
    zoomOut,
    loadDetails,
    getEventDetails
  } = useTimeline()

  /* -------------------- Refs & State -------------------- */

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState({ scrollTop: 0, clientHeight: 0 })
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null)
  const isZoomingRef = useRef(false)
  const [isZooming, setIsZooming] = useState(false)
  const [isMouseOver, setIsMouseOver] = useState(false) // Souris dans la zone ?

  /* -------------------- Visualization Mode -------------------- */

  const visualizationMode: VisualizationMode = useMemo(() => {
    if (msPerPixel > 1000) return 'bars'      // > 1s/px
    if (msPerPixel > 100) return 'mini'       // 100ms-1s/px
    return 'discrete'                         // < 100ms/px
  }, [msPerPixel])

  /* -------------------- Item Positions (TEMPS RÉEL) -------------------- */

  const itemPositions = useMemo(() => {
  return eventsMetadata.map(event => ({
    id: event.id,
    y: dateToY(event.createdAt),
    metadata: event
  }))
}, [eventsMetadata, dateToY])

// ✨ NOUVEAU : Packing en mode discrete pour éviter overlap
// ✨ TEMPORAIRE : Désactiver le packing pour tester l'ancrage
// ✨ Packing en mode discrete pour éviter overlap
const packedPositions = useMemo(() => {
  if (visualizationMode !== 'discrete') {
    return itemPositions // Pas de packing en bars/mini
  }

  const sorted = [...itemPositions].sort((a, b) => a.y - b.y)
  const packed = []
  let lastY = -Infinity

  for (const item of sorted) {
    // Si overlap avec le précédent
    if (item.y < lastY + DISCRETE_ITEM_HEIGHT) {
      // Pousser vers le bas
      const newY = lastY + DISCRETE_ITEM_HEIGHT
      packed.push({ ...item, y: newY })
      lastY = newY
    } else {
      packed.push(item)
      lastY = item.y
    }
  }

  return packed
}, [itemPositions, visualizationMode])

  const itemPositionsMap = useMemo(() => {
  return new Map(packedPositions.map(p => [p.id, p]))
}, [packedPositions])

  /* -------------------- Virtual Scrolling -------------------- */

  const visibleEvents = useMemo(() => {
    const container = scrollContainerRef.current
    if (!container) return eventsMetadata

    const scrollTop = container.scrollTop
    const clientHeight = container.clientHeight
    const scrollBottom = scrollTop + clientHeight

    const buffer = 800

    return eventsMetadata.filter(event => {
      const pos = itemPositionsMap.get(event.id)
      if (!pos) return false

      return (
        pos.y >= scrollTop - buffer &&
        pos.y <= scrollBottom + buffer
      )
    })
  }, [eventsMetadata, itemPositionsMap, scrollState])

  /* -------------------- Load Details for Discrete Mode -------------------- */

  useEffect(() => {
    if (visualizationMode === 'discrete' && visibleEvents.length > 0) {
      const visibleIds = visibleEvents.map(e => e.id)
      loadDetails(visibleIds)
    }
  }, [visualizationMode, visibleEvents, loadDetails])

  /* -------------------- Scroll Handling -------------------- */

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

  /* -------------------- Scroll to Bottom on Mount -------------------- */

useEffect(() => {
  const container = scrollContainerRef.current
  if (container && eventsMetadata.length > 0) {
    setTimeout(() => {
      container.scrollTop = container.scrollHeight
      setIsZooming(false)
      console.log('📍 [TIMELINE] Scrolled to bottom')
    }, 100)
  }
}, [eventsMetadata.length])

/* -------------------- DÉTECTION CTRL/CMD -------------------- */
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

  useEffect(() => {
  const container = scrollContainerRef.current
  if (!container) return

  const onWheel = (e: WheelEvent) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    e.stopPropagation()
    // UI du viseur
setIsZooming(true)
    
    // ✨ Throttle - Ignorer si déjà en train de zoomer
    if (isZoomingRef.current) {
      console.log('⏭️ Zoom ignoré (trop rapide)')
      
      // ✨ NOUVEAU : Annuler le timeout précédent et créer un nouveau
      if (pendingZoomTimeout) {
        clearTimeout(pendingZoomTimeout)
      }
      
      // ✨ Débloquer après inactivité
      pendingZoomTimeout = setTimeout(() => {
        isZoomingRef.current = false
        console.log('🔓 Throttle débloqué après inactivité')
      }, 300) // 300ms d'inactivité = reset
      
      return
    }

    isZoomingRef.current = true
    
    // ✨ Clear le timeout si on traite un event
    if (pendingZoomTimeout) {
      clearTimeout(pendingZoomTimeout)
      pendingZoomTimeout = null
    }
      
      // ✨ Capturer le CENTRE de la fenêtre visible AVANT le zoom
const scrollTopBefore = container.scrollTop
const clientHeight = container.clientHeight
const totalHeightBefore = container.scrollHeight
const centerYBefore = scrollTopBefore + clientHeight / 2
const centerRatioBefore = centerYBefore / totalHeightBefore

console.log('🎯 AVANT ZOOM:', {
  scrollTopBefore,
  centerYBefore,
  scrollHeight: totalHeightBefore,
  centerRatioBefore,
  msPerPixel
})

      if (e.deltaY < 0) {
        zoomIn()
      } else {
        zoomOut()
      }

      // ✨ Double RAF pour attendre le re-render de React
      requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const totalHeightAfter = container.scrollHeight
    
    // ✨ Recalculer la position pour garder le CENTRE au même ratio
    const newCenterY = centerRatioBefore * totalHeightAfter
    const newScrollTop = newCenterY - clientHeight / 2

    console.log('🔄 APRÈS ZOOM:', {
      scrollHeight: totalHeightAfter,
      heightDelta: totalHeightAfter - totalHeightBefore,
      centerRatioBefore,
      newCenterY,
      oldScrollTop: container.scrollTop,
      newScrollTop,
      msPerPixel
    })
    
    container.scrollTop = Math.max(0, newScrollTop)
          
          // Débloquer après un délai
          setTimeout(() => {
            isZoomingRef.current = false
          }, 200)
        })
      })
    }
  }

  container.addEventListener('wheel', onWheel, {
    passive: false,
    capture: true
  })

  return () => {
    container.removeEventListener('wheel', onWheel, { capture: true } as any)
  }
}, [zoomIn, zoomOut, yToDate, dateToY, msPerPixel])

  /* -------------------- Bars Data -------------------- */

  const barsData = useMemo(() => {
    if (visualizationMode !== 'bars') return []

    const buckets = new Map<number, number>()

    for (const p of packedPositions) {
      const bucketY = Math.floor(p.y)
      buckets.set(bucketY, (buckets.get(bucketY) ?? 0) + 1)
    }

    return Array.from(buckets.entries())
      .map(([y, count]) => ({ y, count }))
      .sort((a, b) => a.y - b.y)
  }, [visualizationMode, itemPositions])

  /* -------------------- Render Bars -------------------- */

  const renderBars = useCallback(() => {
    const maxCount = Math.max(...barsData.map(b => b.count), 1)

    return (
      <>
        {barsData.map((b) => {
          const widthPct = 8 + (b.count / maxCount) * 20

          return (
            <div
              key={b.y}
              style={{
                position: 'absolute',
                top: b.y,
                left: '50%',
                transform: 'translateX(-50%)',
                width: `${widthPct}%`,
                height: 6,
                background: 'rgba(96,165,250,0.8)',
                borderRadius: 3,
                cursor: 'pointer',
              }}
              className="group"
              title={`${b.count} événements`}
              onClick={() => {
                const container = scrollContainerRef.current
                if (!container) return

                container.scrollTop = b.y - container.clientHeight / 2
                setTimeout(() => zoomIn(), 80)
              }}
            />
          )
        })}
      </>
    )
  }, [barsData, zoomIn])

  /* -------------------- Render Mini -------------------- */

  const renderMini = useCallback(() => {
    return (
      <>
        {visibleEvents.map((event) => {
          const pos = itemPositionsMap.get(event.id)
          if (!pos) return null

          const isSelected = selectedEventIds.includes(event.id)

          return (
            <div
              key={event.id}
              style={{
                position: 'absolute',
                top: pos.y,
                left: 0,
                right: 0,
                height: MINI_ITEM_HEIGHT,
                paddingLeft: 12,
                paddingRight: 12,
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
                  h-full px-3 py-1 rounded-md border transition-all duration-200
                  flex items-center gap-2
                  ${isSelected
                    ? 'bg-bandhu-primary/10 border-bandhu-primary'
                    : event.role === 'user'
                      ? 'bg-blue-500/5 border-blue-500/30 hover:border-blue-500/50'
                      : 'bg-purple-500/5 border-purple-500/30 hover:border-purple-500/50'
                  }
                `}
              >
                <div className={`w-2 h-2 rounded-full ${
                  event.role === 'user' ? 'bg-blue-400' : 'bg-purple-400'
                }`} />
                
                <span className="text-xs text-gray-400">
                  {event.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )
        })}
      </>
    )
  }, [visibleEvents, itemPositionsMap, selectedEventIds])

  /* -------------------- Render Discrete -------------------- */

  const renderDiscrete = useCallback(() => {
  return (
    <>
      {visibleEvents.map((event, index) => {
        const pos = itemPositionsMap.get(event.id)
        if (!pos) return null

        // ✨ Calculer opacity pour overlap
        let opacity = 1
        if (index > 0) {
          const prevEvent = visibleEvents[index - 1]
          const prevPos = itemPositionsMap.get(prevEvent.id)
          
          if (prevPos) {
            const gap = pos.y - prevPos.y
            
            if (gap < DISCRETE_ITEM_HEIGHT) {
              // Overlap → Réduire opacité
              const overlapRatio = gap / DISCRETE_ITEM_HEIGHT
              opacity = 0.3 + (overlapRatio * 0.7) // 0.3 à 1.0
            }
          }
        }

          const details = getEventDetails(event.id)
          const isSelected = selectedEventIds.includes(event.id)
          const isHovered = hoveredEventId === event.id

          const colorConfig = {
            user: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(96,165,250,0.5)', dot: 'rgb(96,165,250)' },
            assistant: { bg: 'rgba(168,85,247,0.1)', border: 'rgba(192,132,252,0.5)', dot: 'rgb(192,132,252)' },
            system: { bg: 'rgba(75,85,99,0.1)', border: 'rgba(107,114,128,0.5)', dot: 'rgb(107,114,128)' }
          } as const

          const colors = colorConfig[event.role]

          return (
            <div
  key={event.id}
  style={{
    position: 'absolute',
    top: pos.y,
    left: 0,
    right: 0,
    height: DISCRETE_ITEM_HEIGHT,
    paddingLeft: 16,
    paddingRight: 16,
    opacity,
    transition: 'opacity 0.2s ease-out'
  }}
  className="cursor-pointer"
  onClick={async () => {
  // ✨ Navigation vers le thread + scroll vers le message
  if (typeof window !== 'undefined' && (window as any).loadThread) {
    await (window as any).loadThread(event.threadId) // ✨ Corrigé
  }
    
    // ✨ Scroll vers le message + highlight
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
  onMouseEnter={() => setHoveredEventId(event.id)}
  onMouseLeave={() => setHoveredEventId(null)}
>
              <div className="relative pl-6 h-full">
                {/* Dot */}
                <div
                  className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleEventSelection(event.id)
                  }}
                >
                  <div
                    className="relative rounded-full border-2 transition-all duration-200"
                    style={{
                      width: '8px',
                      height: '8px',
                      borderColor: isSelected ? 'rgb(168,85,247)' : colors.dot,
                      backgroundColor: isSelected ? 'rgb(168,85,247)' : colors.dot
                    }}
                  />
                </div>

                {/* Container */}
                <div
                  className="ml-6 h-full flex flex-col transition-all duration-200 p-3 rounded-lg"
                  style={{
                    border: isSelected
                      ? '2px solid rgb(168,85,247)'
                      : isHovered
                      ? '2px solid rgba(168,85,247,0.6)'
                      : `1px solid ${colors.border}`,
                    backgroundColor: colors.bg
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400">
                      {event.createdAt.toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'short', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>

                  {details && (
                    <>
                      <p className="text-sm text-gray-200 line-clamp-2 flex-1">
                        {details.contentPreview}
                      </p>
                      <div className="text-xs text-gray-500 truncate">{details.threadLabel}</div>
                    </>
                  )}

                  {!details && (
                    <div className="flex items-center justify-center flex-1">
                      <div className="text-xs text-gray-500">Chargement...</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </>
    )
  }, [visibleEvents, itemPositionsMap, selectedEventIds, hoveredEventId, getEventDetails, toggleEventSelection])

  /* -------------------- UI States -------------------- */

  if (isLoading && eventsMetadata.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-bandhu-primary" />
          <p className="mt-2 text-sm text-gray-500">Chargement de la timeline...</p>
        </div>
      </div>
    )
  }

  if (eventsMetadata.length === 0 && !isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-4xl mb-3 opacity-30">📅</div>
          <p className="text-gray-500">Aucun événement</p>
        </div>
      </div>
    )
  }

  const totalHeight = getTotalHeight()

  /* -------------------- Render -------------------- */

  return (
  <div 
    className="h-full flex flex-col"
    onMouseEnter={() => setIsMouseOver(true)}
    onMouseLeave={() => setIsMouseOver(false)}
  >
      {/* Header */}
      <div className="text-xs text-gray-500 mb-4">
        {eventsMetadata.length} événements •{' '}
        <span className="text-bandhu-primary ml-1">
          {msPerPixel < 1000 ? `${Math.round(msPerPixel)}ms/px` :
            msPerPixel < 60000 ? `${Math.round(msPerPixel / 1000)}s/px` :
            msPerPixel < 3600000 ? `${Math.round(msPerPixel / 60000)}min/px` :
            msPerPixel < 86400000 ? `${Math.round(msPerPixel / 3600000)}h/px` :
              `${Math.round(msPerPixel / 86400000)}j/px`}
        </span>{' '}
        • <span className="ml-2 px-2 py-0.5 rounded bg-gray-800/50 text-xs">
          {visualizationMode === 'bars' ? '🪵 Bars' :
            visualizationMode === 'mini' ? '📦 Mini' :
              '📋 Détaillé'}
        </span>
      </div>

      {/* Timeline Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto relative timeline-scroll-container"
        style={{ height: '100%', maxHeight: 'calc(100% - 2rem)' }}
      >

{/* Viseur de zoom */}
<div 
  className={`sticky top-1/2 left-0 right-0 -translate-y-1/2 pointer-events-none z-50 flex items-center justify-between transition-all duration-500 ${
    (isMouseOver && isZooming) ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
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

        <div style={{ 
          height: totalHeight, 
          minHeight: '100%', 
          position: 'relative'
        }}>
          {/* Ruler */}
          <TemporalRuler
            scrollTop={scrollState.scrollTop}
            clientHeight={scrollState.clientHeight}
            totalHeight={totalHeight}
            yToDate={yToDate}
            dateToY={dateToY}
            msPerPixel={msPerPixel}
          />

          {/* Center Line */}
          <div
            className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-bandhu-primary/30 to-bandhu-secondary/30"
            style={{ opacity: 0.35 }}
          />

          {/* Render according to mode */}
          {visualizationMode === 'bars' && renderBars()}
          {visualizationMode === 'mini' && renderMini()}
          {visualizationMode === 'discrete' && renderDiscrete()}
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-600 text-center py-1 border-t border-gray-800/30">
        <span className="opacity-70">Ctrl+Molette pour zoomer</span>
      </div>
    </div>
  )
}