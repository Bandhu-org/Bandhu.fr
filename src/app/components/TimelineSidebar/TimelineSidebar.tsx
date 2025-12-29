// src/components/TimelineSidebar/TimelineSidebar.tsx
'use client'

import React, { useEffect } from 'react'
import { useTimelineUI, useTimelineRender, useZoom } from '@/contexts/TimelineContext'
import TimelineView from './TimelineView'
import ThreadsView from './ThreadsView'

interface TimelineSidebarProps {
  activeThreadId?: string | null
  currentVisibleEventId?: string | null
}

export default function TimelineSidebar({ activeThreadId, currentVisibleEventId }: TimelineSidebarProps) {
  const {
  isTimelineOpen, 
  closeTimeline,
  viewMode,
  setViewMode
} = useTimelineUI()

// densityRatio vient du Render Context
const { densityRatio } = useTimelineRender()

// ✨ Zoom séparé !
const { zoomIn, zoomOut, msPerPixel } = useZoom()

  // ✅ Si activeThreadId passé, forcer ThreadsView au mount
  useEffect(() => {
    if (activeThreadId) {
      setViewMode('threads')
    }
  }, [activeThreadId, setViewMode])

  // ✨ Zoom temporel (pas density)
  const handleZoomOut = () => {
    zoomOut()
  }

  const handleZoomIn = () => {
    zoomIn()
  }

  // ✨ Label de densité basé sur le ratio continu
const getDensityLabel = (ratio: number) => {
  if (ratio > 0.8) return { label: 'Détaillé', icon: '🔍' }
  if (ratio > 0.6) return { label: 'Condensé', icon: '📄' }
  if (ratio > 0.4) return { label: 'Dense', icon: '📋' }
  if (ratio > 0.2) return { label: 'Bâtonnets', icon: '📊' }
  return { label: 'Ultra-dense', icon: '📈' }
}

const currentDensity = getDensityLabel(densityRatio)

  return (
    <div className="w-80 h-full bg-gradient-to-b from-gray-900/95 to-gray-950/95 border-l border-gray-800 shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800/50 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
  {/* Bouton fermer À GAUCHE */}
  <button
  onClick={closeTimeline}
  className="group p-1.5 rounded-full bg-gradient-to-br from-gray-900/90 via-blue-800/90 to-blue-800/90 border border-gray-700 text-bandhu-primary hover:text-white hover:bg-gradient-to-r hover:from-bandhu-primary hover:to-bandhu-secondary transition-all duration-300 hover:scale-110"
  title="Masquer la timeline"
>
  <span className="text-sm font-bold">
    &gt;&gt;
  </span>
</button>
  
  {/* Titre AU MILIEU */}
  <div className="flex-1 text-center">
    <h2 className="text-lg font-bold bg-gradient-to-r from-bandhu-primary to-bandhu-secondary bg-clip-text text-transparent">
      Timeline
    </h2>
    <p className="text-xs text-gray-500">Chronologie des événements</p>
  </div>
  
  {/* Espace vide À DROITE (symétrie) */}
  <div className="w-8"></div>
</div>

        {/* Switch Vue */}
        <div className="flex border-b border-gray-800/50 mb-3">
          <button
            onClick={() => setViewMode('timeline')}
            className={`flex-1 py-2 text-sm transition ${
              viewMode === 'timeline'
                ? 'border-b-2 border-bandhu-primary text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Chronologie
          </button>
          <button
            onClick={() => setViewMode('threads')}
            className={`flex-1 py-2 text-sm transition ${
              viewMode === 'threads'
                ? 'border-b-2 border-bandhu-primary text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Conversations
          </button>
        </div>

        {/* Contrôles de densité */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomIn}
              disabled={false}
              className="p-1.5 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
              title="Zoom avant (plus détaillé)"
            >
              <span className="text-sm">+</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/30 rounded-lg min-w-[120px]">
              <span className="text-sm">🔍</span>
              <span className="text-xs text-gray-300">
                {msPerPixel < 3600000 * 24 ? `${Math.round(msPerPixel / 3600000)}h/px` :
                 msPerPixel < 3600000 * 24 * 30 ? `${Math.round(msPerPixel / (3600000 * 24))}j/px` :
                 `${Math.round(msPerPixel / (3600000 * 24 * 30))}m/px`}
              </span>
            </div>

            <button
              onClick={handleZoomOut}
              disabled={false}
              className="p-1.5 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
              title="Zoom arrière (plus dense)"
            >
              <span className="text-sm">−</span>
            </button>
          </div>

          {/* ✨ Indicateur auto */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-bandhu-primary/60">AUTO</span>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === 'timeline' ? <TimelineView /> : <ThreadsView activeThreadId={activeThreadId} currentVisibleEventId={currentVisibleEventId} />}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800/50 text-xs text-gray-500 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>Bandhu Timeline</span>
            <span className="px-2 py-0.5 bg-gray-800/50 rounded text-gray-400">
  Auto • {currentDensity.label} ({(densityRatio * 100).toFixed(0)}%)
</span>
          </div>
          <span className="text-bandhu-primary/60">beta</span>
        </div>
      </div>
    </div>
  )
}