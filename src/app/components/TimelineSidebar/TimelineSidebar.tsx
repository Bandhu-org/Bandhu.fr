// src/components/TimelineSidebar/TimelineSidebar.tsx
'use client'

import React from 'react'
import { useTimelineUI } from '@/contexts/TimelineContext'
import ThreadsView from './ThreadsView'

interface TimelineSidebarProps {
  activeThreadId?: string | null
  currentVisibleEventId?: string | null
}

export default function TimelineSidebar({ activeThreadId, currentVisibleEventId }: TimelineSidebarProps) {
  const { closeTimeline } = useTimelineUI()

  return (
    <div className="w-80 h-full bg-gradient-to-b from-gray-900/95 to-gray-950/95 border-l border-gray-800 shadow-2xl overflow-hidden flex flex-col">
      
      {/* Header */}
      <div className="p-4 border-b border-gray-800/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* Bouton fermer À GAUCHE */}
          <button
            onClick={closeTimeline}
            className="group p-1.5 rounded-full bg-gradient-to-br from-gray-900/90 via-blue-800/90 to-blue-800/90 border border-gray-700 text-bandhu-primary hover:text-white hover:bg-gradient-to-r hover:from-bandhu-primary hover:to-bandhu-secondary transition-all duration-300 hover:scale-110"
            title="Masquer la timeline"
          >
            <span className="text-sm font-bold">&gt;&gt;</span>
          </button>
          
          {/* Titre AU MILIEU */}
          <div className="flex-1 text-center">
            <h2 className="text-lg font-bold bg-gradient-to-r from-bandhu-primary to-bandhu-secondary bg-clip-text text-transparent">
              Navigation
            </h2>
          </div>
          
          {/* Espace vide À DROITE (symétrie) */}
          <div className="w-8"></div>
        </div>
      </div>

      {/* Contenu - TOUJOURS ThreadsView */}
      <div className="flex-1 overflow-y-auto p-4">
        <ThreadsView 
          activeThreadId={activeThreadId} 
          currentVisibleEventId={currentVisibleEventId} 
        />
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-800/50 text-xs text-gray-500 flex-shrink-0 text-center">
        <span className="opacity-60">⌘ + scroll pour zoomer</span>
      </div>
      
    </div>
  )
}