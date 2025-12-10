// src/components/TimelineSidebar/TimelineSidebar.tsx
'use client'

import React from 'react'
import { useTimeline } from '@/contexts/TimelineContext'
import TimelineView from './TimelineView'

export default function TimelineSidebar() {
  const { isTimelineOpen, closeTimeline } = useTimeline()

  if (!isTimelineOpen) return null

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
          <div className="p-4 border-b border-gray-800/50 flex items-center justify-between">
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

          {/* Contenu */}
          <div className="flex-1 overflow-y-auto p-4">
            <TimelineView />
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-800/50 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <span>Bandhu Timeline</span>
              <span className="text-bandhu-primary/60">beta</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}