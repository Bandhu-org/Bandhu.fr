// src/components/TimelineSidebar/TimelineSidebar.tsx
'use client'

import React from 'react'
import { useTimeline } from '@/contexts/TimelineContext'
import TimelineView from './TimelineView'

export default function TimelineSidebar() {
  const { 
    isTimelineOpen, 
    closeTimeline,
    densityLevel,
    setDensityLevel,
    zoomLevel,
    setZoomLevel 
  } = useTimeline()

  if (!isTimelineOpen) return null

  // ------------------------------------------------------------
  // GESTION DU ZOOM
  // ------------------------------------------------------------
  const handleZoomOut = () => {
    if (densityLevel < 4) {
      setDensityLevel((densityLevel + 1) as typeof densityLevel)
    }
  }

  const handleZoomIn = () => {
    if (densityLevel > 0) {
      setDensityLevel((densityLevel - 1) as typeof densityLevel)
    }
  }

  // ------------------------------------------------------------
  // LABELS DES NIVEAUX
  // ------------------------------------------------------------
  const densityLabels = [
    { level: 0, label: 'Détaillé', icon: '🔍' },
    { level: 1, label: 'Condensé', icon: '📄' },
    { level: 2, label: 'Dense', icon: '📋' },
    { level: 3, label: 'Bâtonnets', icon: '📊' },
    { level: 4, label: 'Ultra-dense', icon: '📈' }
  ]

  const currentDensity = densityLabels.find(d => d.level === densityLevel) || densityLabels[0]

  // ------------------------------------------------------------
  // RENDU
  // ------------------------------------------------------------
  return (
    <div className="fixed inset-y-0 right-0 z-40 flex">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
        onClick={closeTimeline}
      />
      
      {/* Sidebar panel */}
      <div className="relative flex-1 w-80 bg-gradient-to-b from-gray-900/95 to-gray-950/95 backdrop-blur-xl border-l border-gray-800 shadow-2xl overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-800/50">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-bandhu-primary to-bandhu-secondary bg-clip-text text-transparent">
                  Timeline
                </h2>
                <p className="text-xs text-gray-500">Chronologie des événements</p>
              </div>
              <button
                onClick={closeTimeline}
                className="p-1.5 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-white transition"
                title="Fermer"
              >
                ✕
              </button>
            </div>

            {/* Contrôles de densité */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleZoomIn}
                  disabled={densityLevel === 0}
                  className="p-1.5 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Zoom avant (plus détaillé)"
                >
                  <span className="text-sm">+</span>
                </button>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/30 rounded-lg min-w-[120px]">
                  <span className="text-sm">{currentDensity.icon}</span>
                  <span className="text-xs text-gray-300">{currentDensity.label}</span>
                </div>

                <button
                  onClick={handleZoomOut}
                  disabled={densityLevel === 4}
                  className="p-1.5 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Zoom arrière (plus dense)"
                >
                  <span className="text-sm">−</span>
                </button>
              </div>

              {/* Indicateur de niveau */}
              <div className="flex items-center gap-1">
                {densityLabels.map(({ level }) => (
                  <div
                    key={level}
                    className={`w-1.5 h-1.5 rounded-full ${
                      level === densityLevel
                        ? 'bg-bandhu-primary'
                        : level < densityLevel
                        ? 'bg-bandhu-primary/40'
                        : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Contenu */}
          <div className="flex-1 overflow-y-auto p-4">
            <TimelineView />
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-800/50 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span>Bandhu Timeline</span>
                <span className="px-2 py-0.5 bg-gray-800/50 rounded text-gray-400">
                  {densityLevel === 0 ? '120px' :
                   densityLevel === 1 ? '60px' :
                   densityLevel === 2 ? '30px' :
                   densityLevel === 3 ? '15px' :
                   '8px'} par événement
                </span>
              </div>
              <span className="text-bandhu-primary/60">beta</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}