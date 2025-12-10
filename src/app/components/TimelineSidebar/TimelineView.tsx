// src/components/TimelineSidebar/TimelineView.tsx
'use client'

import React from 'react'
import { useTimeline } from '@/contexts/TimelineContext'

export default function TimelineView() {
  
  const { events, isLoading, zoomLevel } = useTimeline()
  console.log('🎨 [TIMELINE] TimelineView RENDER', { 
    eventsCount: events.length, 
    isLoading 
  })

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-bandhu-primary"></div>
          <p className="mt-2 text-sm text-gray-500">Chargement...</p>
        </div>
      </div>
    )
  }

  if (events.length === 0) {
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

  return (
    <div className="space-y-1">
      <div className="text-xs text-gray-500 mb-4">
        {events.length} événements • Zoom {zoomLevel}
      </div>

      {/* Timeline visualization */}
      <div className="relative pl-6">
        {/* Ligne centrale */}
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-bandhu-primary/30 to-bandhu-secondary/30" />
        
        {/* Événements */}
        {events.map((event, index) => (
          <div key={event.id} className="relative mb-3">
            {/* Point sur la ligne */}
            <div className="absolute left-0 transform -translate-x-1/2 -translate-y-1/2 top-1/2">
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

            {/* Carte événement */}
            <div className="ml-6 p-3 rounded-lg bg-gray-800/30 border border-gray-700/50 hover:border-gray-600/70 transition">
              <div className="flex items-start justify-between">
                <div>
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
                  <p className="text-sm text-gray-200 line-clamp-2">
                    {event.contentPreview}
                  </p>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500 truncate">
                {event.threadLabel}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}