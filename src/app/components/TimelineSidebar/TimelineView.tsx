// src/components/TimelineSidebar/TimelineView.tsx
'use client'

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useTimeline, type TimelineEvent, type DensityLevel } from '@/contexts/TimelineContext'

const BUFFER = 5 // Nombre d'items à render avant/après la zone visible

export default function TimelineView() {
  const { 
  events, 
  isLoading, 
  zoomLevel, 
  densityLevel,
  hasMore, 
  loadMore, 
  loadPrevious,
  getItemHeight,
  selectedEventIds,          // ← AJOUTER
  toggleEventSelection      // ← AJOUTER
} = useTimeline()
  
  // Réfs
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastScrollTop = useRef(0)
  const isLoadingPrevious = useRef(false)
  const isLoadingMore = useRef(false)
  const isDraggingScrollbar = useRef(false)
  const scrollTimeout = useRef<NodeJS.Timeout | undefined>(undefined)
  const prevDensityLevel = useRef<DensityLevel>(densityLevel)
  
  // État local
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 })
  
  // Calculs
  const itemHeight = getItemHeight()
  const totalHeight = events.length * itemHeight

  // ------------------------------------------------------------
  // STYLE FOR HIGHLIGHT ANIMATION
  // ------------------------------------------------------------
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
  }, []) // Empty dependency array = run once on mount
  
  // ------------------------------------------------------------
  // GESTION DU SCROLL AVEC DENSITÉ VARIABLE
  // ------------------------------------------------------------
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return

    const container = scrollContainerRef.current
    const { scrollTop, clientHeight } = container
    const scrollBottom = scrollTop + clientHeight

    // Détection de la direction
    const isScrollingUp = scrollTop < lastScrollTop.current
    const scrollDelta = Math.abs(scrollTop - lastScrollTop.current)
    lastScrollTop.current = scrollTop

    // Détection du drag scrollbar (mouvement rapide)
    if (scrollDelta > 500) {
      isDraggingScrollbar.current = true
    }

    // Reset du flag drag après 300ms d'inactivité
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current)
    }
    scrollTimeout.current = setTimeout(() => {
      isDraggingScrollbar.current = false
    }, 300)

    // Calcul de la plage visible
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - BUFFER)
    const end = Math.min(events.length, Math.ceil(scrollBottom / itemHeight) + BUFFER)
    setVisibleRange({ start, end })

    // Chargement automatique (si pas en drag)
    if (!isDraggingScrollbar.current) {
      // Charger l'historique en remontant
      if (isScrollingUp && scrollTop < totalHeight * 0.2 && !isLoading && !isLoadingPrevious.current) {
        isLoadingPrevious.current = true
        loadPrevious().finally(() => {
          isLoadingPrevious.current = false
        })
      }

      // Charger plus en descendant
      if (!isScrollingUp && scrollBottom > totalHeight * 0.8 && hasMore && !isLoading && !isLoadingMore.current) {
        isLoadingMore.current = true
        loadMore().finally(() => {
          isLoadingMore.current = false
        })
      }
    }
  }, [events.length, itemHeight, totalHeight, isLoading, hasMore, loadPrevious, loadMore])

  // CLICK NAVIGATION (density level 0 only)
// ------------------------------------------------------------
const handleEventClick = useCallback(async (eventId: string, threadId: string) => {
  // Navigation désactivée uniquement en mode ultra-dense (niveau 4)
  if (densityLevel === 4) {
    return
  }
  
  console.log('🎯 Navigation timeline:', { eventId, threadId, densityLevel })
  
  // 1. Charge le thread via la fonction globale
  if (typeof window !== 'undefined' && (window as any).loadThread) {
    try {
      await (window as any).loadThread(threadId)
      console.log('✅ Thread chargé')
    } catch (error) {
      console.error('❌ Erreur chargement thread:', error)
      return
    }
  } else {
    console.warn('⚠️ loadThread non disponible globalement')
    return
  }
  
  // 2. Scroll après un délai (le temps que les messages se chargent)
  setTimeout(() => {
    // Cherche l'élément dans le DOM
    let targetElement = document.querySelector(`[data-message-id="${eventId}"]`)
    if (!targetElement) {
      targetElement = document.getElementById(`event-${eventId}`)
    }
    
    if (targetElement) {
      console.log('🎯 Élément trouvé, scroll en cours...')
      // Scroll personnalisé avec offset
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      
      // Animation de highlight
      targetElement.classList.add('timeline-event-highlight')
      setTimeout(() => {
        targetElement.classList.remove('timeline-event-highlight')
      }, 1500)
    } else {
      console.warn('⚠️ Élément non trouvé:', eventId)
    }
  }, 800) // Délai pour laisser le thread charger
}, [densityLevel])

  // ------------------------------------------------------------
  // ADJUSTEMENT DU SCROLL QUAND LA DENSITÉ CHANGE
  // ------------------------------------------------------------
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || prevDensityLevel.current === densityLevel) {
      prevDensityLevel.current = densityLevel
      return
    }

    // On calcule l'index de l'item au centre de la vue
    const oldScrollTop = container.scrollTop
    const oldItemHeight = getItemHeight(prevDensityLevel.current)
    const centerIndex = Math.floor((oldScrollTop + container.clientHeight / 2) / oldItemHeight)
    
    // On repositionne pour garder le même item au centre
    const newScrollTop = (centerIndex * itemHeight) - (container.clientHeight / 2)
    container.scrollTop = Math.max(0, newScrollTop)
    
    prevDensityLevel.current = densityLevel
  }, [densityLevel, itemHeight])

  // ------------------------------------------------------------
  // EVENT LISTENER DU SCROLL
  // ------------------------------------------------------------
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // ------------------------------------------------------------
  // RENDU DES ÉVÉNEMENTS SELON LA DENSITÉ
  // ------------------------------------------------------------
  const renderEvent = useCallback((event: TimelineEvent) => {
    const isSelected = selectedEventIds.includes(event.id)
    switch (densityLevel) {
      // --------------------------------------------------------
      // NIVEAU 0 : DÉTAILLÉ (120px)
      // --------------------------------------------------------
      case 0:
  return (
    <div 
      className="relative pl-6 h-full cursor-pointer"
      onClick={() => handleEventClick(event.id, event.threadId)}
    >
      <div 
  className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 group"
  onClick={(e) => {
    e.stopPropagation()
    toggleEventSelection(event.id)
  }}
  title={isSelected ? "Désélectionner" : "Sélectionner"}
>
  {isSelected && (
    <div className="absolute inset-0 -m-1 rounded-full bg-bandhu-primary/30 animate-ping" />
  )}
  
  <div className={`
    relative w-3 h-3 rounded-full border-2 transition-all duration-300
    ${isSelected 
      ? 'bg-bandhu-primary border-bandhu-primary scale-125 shadow-lg shadow-bandhu-primary/30' 
      : event.role === 'user' 
        ? 'bg-blue-500/20 border-blue-400 hover:border-blue-300 hover:scale-110' 
        : event.role === 'assistant' 
          ? 'bg-purple-500/20 border-purple-400 hover:border-purple-300 hover:scale-110'
          : 'bg-gray-500/20 border-gray-400 hover:scale-110'
    }
  `} />
  
  <div className="absolute left-1/2 bottom-full transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900/95 backdrop-blur-sm text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-gray-700 shadow-xl z-20">
    {isSelected ? 'Désélectionner' : 'Sélectionner'}
    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900/95 rotate-45 border-b border-r border-gray-700"></div>
  </div>
</div>

            <div className={`
  ml-6 p-3 rounded-lg border-2 transition-all duration-300 h-full flex flex-col
  ${isSelected
    ? 'bg-gradient-to-r from-bandhu-primary/5 to-purple-500/5 border-bandhu-primary shadow-md shadow-bandhu-primary/20'
    : 'bg-gray-800/30 border-gray-700/50 hover:border-gray-600/70'
  }
`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  event.role === 'user'
                    ? 'bg-blue-900/30 text-blue-300'
                    : 'bg-purple-900/30 text-purple-300'
                }`}>
                  {event.role === 'user' ? '👤' : '🌑'}
                </span>
                <span className="text-xs text-gray-400">
                  {event.createdAt.toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <p className="text-sm text-gray-200 line-clamp-2 flex-1">
                {event.contentPreview}
              </p>
              <div className="text-xs text-gray-500 truncate">
                {event.threadLabel}
              </div>
            </div>
          </div>
        )

      // --------------------------------------------------------
      // NIVEAU 1 : CONDENSÉ (60px)
      // --------------------------------------------------------
      case 1:
  return (
    <div 
      className="relative pl-6 h-full cursor-pointer"
      onClick={() => handleEventClick(event.id, event.threadId)}
    >
            <div 
              className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation()
                toggleEventSelection(event.id)
              }}
              title={isSelected ? "Désélectionner" : "Sélectionner"}
            >
              {isSelected && (
                <div className="absolute inset-0 -m-1 rounded-full bg-bandhu-primary/30 animate-ping" />
              )}
              {isSelected && (
                <div className="absolute inset-0 -m-0.5 rounded-full bg-bandhu-primary/20" />
              )}
              <div className={`
                relative w-2 h-2 rounded-full border transition-all duration-300
                ${isSelected 
                  ? 'bg-bandhu-primary border-bandhu-primary scale-150 shadow-lg shadow-bandhu-primary/40' 
                  : event.role === 'user' 
                    ? 'bg-blue-500/40 border-blue-400/60 hover:border-blue-300 hover:scale-125' 
                    : event.role === 'assistant' 
                      ? 'bg-purple-500/40 border-purple-400/60 hover:border-purple-300 hover:scale-125'
                      : 'bg-gray-500/40 border-gray-400/60 hover:scale-125'
                }
              `} />
              <div className="absolute inset-0 -m-1 rounded-full bg-current opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
              <div className="absolute left-1/2 bottom-full transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900/95 backdrop-blur-sm text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-gray-700 shadow-xl z-20">
                {isSelected ? 'Désélectionner ✓' : 'Sélectionner'}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900/95 rotate-45 border-b border-r border-gray-700"></div>
              </div>
            </div>

            <div className={`
              ml-6 p-2 rounded-lg border transition-all duration-200 h-full flex flex-col
              ${isSelected
                ? 'bg-gradient-to-r from-bandhu-primary/5 to-purple-500/5 border-bandhu-primary shadow-sm shadow-bandhu-primary/20'
                : 'bg-gray-800/20 border-gray-700/30'
              }
            `}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400">
                  {event.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  event.role === 'user'
                    ? 'bg-blue-900/20 text-blue-300'
                    : 'bg-purple-900/20 text-purple-300'
                }`}>
                  {event.role === 'user' ? 'Vous' : 'Assistant'}
                </span>
              </div>
              <p className="text-xs text-gray-300 truncate flex-1">
                {event.contentPreview}
              </p>
            </div>
          </div>
        )

      // --------------------------------------------------------
      // NIVEAU 2 : TRÈS CONDENSÉ (30px)
      // --------------------------------------------------------
      case 2:
  return (
    <div 
      className="relative pl-4 h-full flex items-center cursor-pointer"
      onClick={() => handleEventClick(event.id, event.threadId)}
    >
            <div 
              className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation()
                toggleEventSelection(event.id)
              }}
              title={isSelected ? "Désélectionner" : "Sélectionner"}
            >
              {isSelected && (
                <>
                  <div className="absolute inset-0 -m-1 rounded-full bg-bandhu-primary/20 animate-pulse" />
                  <div className="absolute inset-0 -m-0.5 rounded-full bg-bandhu-primary/40" />
                </>
              )}
              <div className={`
                relative w-1.5 h-1.5 rounded-full border transition-all duration-200
                ${isSelected 
                  ? 'bg-bandhu-primary border-bandhu-primary scale-150 shadow-md shadow-bandhu-primary/30' 
                  : event.role === 'user' ? 'bg-blue-500/60 border-blue-400/50' 
                  : event.role === 'assistant' ? 'bg-purple-500/60 border-purple-400/50' 
                  : 'bg-gray-500/60 border-gray-400/50'
                }
              `} />
            </div>

            <div className={`
              ml-4 flex items-center justify-between w-full pr-2 transition-all duration-200
              ${isSelected
                ? 'px-2 py-1 rounded bg-bandhu-primary/5 border-l-2 border-bandhu-primary'
                : ''
              }
            `}>
              <span className="text-xs text-gray-400 truncate">
                {event.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-xs text-gray-300 truncate max-w-[60%]">
                {event.contentPreview}
              </span>
            </div>
          </div>
        )

      // --------------------------------------------------------
      // NIVEAU 3 : BÂTONNETS FINS (15px)
      // --------------------------------------------------------
      case 3:
  return (
    <div 
      className="relative pl-3 h-full flex items-center cursor-pointer"
      onClick={() => handleEventClick(event.id, event.threadId)}
    >
            <div 
              className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation()
                toggleEventSelection(event.id)
              }}
              title={isSelected ? "Désélectionner" : "Sélectionner"}
            >
              {isSelected && (
                <div className="absolute inset-0 -m-0.5 rounded-sm bg-bandhu-primary/30 animate-pulse" />
              )}
              <div className={`
                relative w-1 h-6 rounded-sm border transition-all duration-200
                ${isSelected 
                  ? 'bg-bandhu-primary border-bandhu-primary shadow-sm shadow-bandhu-primary/40' 
                  : event.role === 'user' ? 'bg-blue-500/70 border-blue-400/60' 
                  : event.role === 'assistant' ? 'bg-purple-500/70 border-purple-400/60' 
                  : 'bg-gray-500/70 border-gray-400/60'
                }
              `} />
            </div>

            <div className={`
              ml-3 text-[10px] truncate w-full pr-2 px-1 py-0.5 rounded transition-all duration-200
              ${isSelected
                ? 'text-bandhu-primary bg-bandhu-primary/10 font-medium'
                : 'text-gray-400'
              }
            `}>
              {event.contentPreview.substring(0, 40)}
              {event.contentPreview.length > 40 ? '...' : ''}
            </div>
          </div>
        )

      // --------------------------------------------------------
      // NIVEAU 4 : ULTRA-DENSE (8px)
      // --------------------------------------------------------
      case 4:
        return (
          <div 
            className={`absolute left-0 right-0 mx-2 rounded-sm cursor-pointer group transition-all duration-200 ${
              isSelected 
                ? 'bg-bandhu-primary shadow-md shadow-bandhu-primary/40 h-2 -my-0.5' 
                : event.role === 'user' ? 'bg-blue-500/80' 
                : event.role === 'assistant' ? 'bg-purple-500/80' 
                : 'bg-gray-500/80'
            }`}
            style={{ height: isSelected ? '8px' : '6px' }}
            title={isSelected ? "Désélectionner" : `${event.createdAt.toLocaleString()}: ${event.contentPreview}`}
            onClick={(e) => {
              e.stopPropagation()
              toggleEventSelection(event.id)
            }}
          >
            {isSelected && (
              <div className="absolute inset-0 rounded-sm bg-white/20 animate-pulse" />
            )}
          </div>
        )

  }  // ← Ferme le switch
  }, [densityLevel, selectedEventIds, toggleEventSelection, handleEventClick])  // ← AJOUTÉ

  // ------------------------------------------------------------
  // RENDU DES ÉVÉNEMENTS VISIBLES
  // ------------------------------------------------------------
  const visibleEvents = useMemo(
    () => events.slice(visibleRange.start, visibleRange.end),
    [events, visibleRange.start, visibleRange.end]
  )

  // ------------------------------------------------------------
  // ÉTATS DE CHARGEMENT
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
          <p className="text-gray-500">Aucun événement dans cette plage</p>
          <p className="text-xs text-gray-600 mt-1">Changez de période ou de zoom</p>
        </div>
      </div>
    )
  }

  // ------------------------------------------------------------
  // RENDU PRINCIPAL
  // ------------------------------------------------------------
  return (
    <div className="h-full flex flex-col">
      {/* En-tête informations */}
      <div className="text-xs text-gray-500 mb-4">
        {events.length} événements • Zoom {zoomLevel} • 
        <span className={`ml-2 ${
          densityLevel === 0 ? 'text-green-400' :
          densityLevel === 1 ? 'text-blue-400' :
          densityLevel === 2 ? 'text-yellow-400' :
          densityLevel === 3 ? 'text-orange-400' :
          'text-red-400'
        }`}>
          {densityLevel === 0 ? 'Détaillé' :
           densityLevel === 1 ? 'Condensé' :
           densityLevel === 2 ? 'Dense' :
           densityLevel === 3 ? 'Bâtonnets' :
           'Ultra-dense'}
        </span>
        {hasMore && <span className="ml-2 text-bandhu-primary">● Plus à charger</span>}
      </div>

      {/* Conteneur de scroll */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto relative"
        style={{ height: 'calc(100% - 2rem)' }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Ligne centrale de la timeline */}
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-bandhu-primary/30 to-bandhu-secondary/30" />

          {/* Événements visibles */}
          {visibleEvents.map((event, idx) => {
            const actualIndex = visibleRange.start + idx
            return (
              <div
  key={`${event.id}-${actualIndex}`}
  style={{
    position: 'absolute',
    top: actualIndex * itemHeight,
    height: itemHeight,
    width: '100%'
  }}
  className={`px-4 ${densityLevel >= 3 ? 'py-0' : 'py-2'} ${
    densityLevel === 0 ? 'cursor-pointer' : ''
  }`}
>
  {renderEvent(event)}
</div>
            )
          })}
        </div>
      </div>

      {/* Indicateur de chargement */}
      {isLoading && (
        <div className="p-2 flex items-center justify-center border-t border-gray-800/50">
          <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-bandhu-primary mr-2" />
          <span className="text-xs text-gray-500">Chargement...</span>
        </div>
      )}
    </div>
  )
}