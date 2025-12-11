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
    getItemHeight 
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
    switch (densityLevel) {
      // --------------------------------------------------------
      // NIVEAU 0 : DÉTAILLÉ (120px)
      // --------------------------------------------------------
      case 0:
        return (
          <div className="relative pl-6 h-full">
            <div className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className={`
                w-3 h-3 rounded-full border-2
                ${event.role === 'user' 
                  ? 'bg-blue-500/20 border-blue-400' 
                  : event.role === 'assistant'
                  ? 'bg-purple-500/20 border-purple-400'
                  : 'bg-gray-500/20 border-gray-400'
                }
              `} />
            </div>

            <div className="ml-6 p-3 rounded-lg bg-gray-800/30 border border-gray-700/50 hover:border-gray-600/70 transition h-full flex flex-col">
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
          <div className="relative pl-6 h-full">
            <div className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className={`
                w-2 h-2 rounded-full
                ${event.role === 'user' 
                  ? 'bg-blue-500/40' 
                  : event.role === 'assistant'
                  ? 'bg-purple-500/40'
                  : 'bg-gray-500/40'
                }
              `} />
            </div>

            <div className="ml-6 p-2 rounded-lg bg-gray-800/20 border border-gray-700/30 h-full flex flex-col">
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
          <div className="relative pl-4 h-full flex items-center">
            <div className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className={`
                w-1.5 h-1.5 rounded-full
                ${event.role === 'user' 
                  ? 'bg-blue-500/60' 
                  : event.role === 'assistant'
                  ? 'bg-purple-500/60'
                  : 'bg-gray-500/60'
                }
              `} />
            </div>

            <div className="ml-4 flex items-center justify-between w-full pr-2">
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
          <div className="relative pl-3 h-full flex items-center">
            <div className={`
              absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2
              w-1 h-6 rounded-sm
              ${event.role === 'user' 
                ? 'bg-blue-500/70' 
                : event.role === 'assistant'
                ? 'bg-purple-500/70'
                : 'bg-gray-500/70'
              }
            `} />
            <div className="ml-3 text-[10px] text-gray-400 truncate w-full pr-2">
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
            className={`
              absolute left-0 right-0 mx-2 rounded-sm
              ${event.role === 'user' 
                ? 'bg-blue-500/80' 
                : event.role === 'assistant'
                ? 'bg-purple-500/80'
                : 'bg-gray-500/80'
              }
            `}
            style={{ height: '6px' }}
            title={`${event.createdAt.toLocaleString()}: ${event.contentPreview}`}
          />
        )
    }
  }, [densityLevel])

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
                key={event.id}
                style={{
                  position: 'absolute',
                  top: actualIndex * itemHeight,
                  height: itemHeight,
                  width: '100%'
                }}
                className={`px-4 ${densityLevel >= 3 ? 'py-0' : 'py-2'}`}
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