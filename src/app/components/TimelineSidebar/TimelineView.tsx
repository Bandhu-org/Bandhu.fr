// src/components/TimelineSidebar/TimelineView.tsx
'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTimeline } from '@/contexts/TimelineContext'

const ITEM_HEIGHT = 120
const BUFFER = 5

export default function TimelineView() {
  const { events, isLoading, zoomLevel, hasMore, loadMore, loadPrevious: loadPreviousFromContext } = useTimeline()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastScrollTop = useRef(0)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 })

  // ✅ Fonction locale pour gérer le scroll lors du chargement vers le haut
  const loadPrevious = async () => {
    if (!scrollContainerRef.current) return
    
    // Sauvegarder où on est dans le scroll
    const oldScrollHeight = scrollContainerRef.current.scrollHeight
    const oldScrollTop = scrollContainerRef.current.scrollTop
    
    console.log('📍 Scroll avant chargement:', { oldScrollHeight, oldScrollTop })
    
    // Charger les events précédents
    await loadPreviousFromContext()
    
    // Attendre que le DOM se mette à jour, puis ajuster le scroll
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        const newScrollHeight = scrollContainerRef.current.scrollHeight
        const heightDiff = newScrollHeight - oldScrollHeight
        
        // Décaler le scroll vers le bas de la même hauteur qu'on a ajouté en haut
        scrollContainerRef.current.scrollTop = oldScrollTop + heightDiff
        
        console.log('📍 Scroll après ajustement:', { 
          newScrollHeight, 
          heightDiff, 
          newScrollTop: oldScrollTop + heightDiff 
        })
      }
    })
  }

  const handleScroll = () => {
    if (!scrollContainerRef.current) return

    const { scrollTop, clientHeight } = scrollContainerRef.current
    const scrollBottom = scrollTop + clientHeight

    // Détecter direction
    const isScrollingUp = scrollTop < lastScrollTop.current
    lastScrollTop.current = scrollTop

    // Calculer items visibles
    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER)
    const end = Math.min(events.length, Math.ceil(scrollBottom / ITEM_HEIGHT) + BUFFER)

    setVisibleRange({ start, end })

    // Scroll vers le HAUT - charger previous
    if (isScrollingUp && scrollTop < 200 && !isLoading) {
      console.log('⬆️ [TIMELINE] Triggering loadPrevious')
      loadPrevious()
    }

    // Scroll vers le BAS - charger more
    const totalHeight = events.length * ITEM_HEIGHT
    if (!isScrollingUp && scrollBottom > totalHeight * 0.8 && hasMore && !isLoading) {
      console.log('⬇️ [TIMELINE] Triggering loadMore')
      loadMore()
    }
  }

  useEffect(() => {
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [events.length, hasMore, isLoading])

  if (isLoading && events.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-bandhu-primary"></div>
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

  const totalHeight = events.length * ITEM_HEIGHT
  const visibleEvents = events.slice(visibleRange.start, visibleRange.end)

  return (
    <div className="h-full flex flex-col">
      <div className="text-xs text-gray-500 mb-4">
        {events.length} événements • Zoom {zoomLevel}
        {hasMore && <span className="ml-2 text-bandhu-primary">● Plus à charger</span>}
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto relative"
        style={{ height: 'calc(100% - 2rem)' }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-bandhu-primary/30 to-bandhu-secondary/30" />

          {visibleEvents.map((event, idx) => {
            const actualIndex = visibleRange.start + idx
            return (
              <div
                key={event.id}
                style={{
                  position: 'absolute',
                  top: actualIndex * ITEM_HEIGHT,
                  height: ITEM_HEIGHT,
                  width: '100%'
                }}
                className="px-4 py-2"
              >
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
              </div>
            )
          })}
        </div>
      </div>

      {isLoading && (
        <div className="p-2 flex items-center justify-center border-t border-gray-800/50">
          <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-bandhu-primary mr-2"></div>
          <span className="text-xs text-gray-500">Chargement...</span>
        </div>
      )}
    </div>
  )
}