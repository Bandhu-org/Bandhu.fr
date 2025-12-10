// src/components/TimelineSidebar/TimelineToggleButton.tsx
'use client'

import React from 'react'
import { useTimeline } from '@/contexts/TimelineContext'

export default function TimelineToggleButton() {
  const { toggleTimeline, isTimelineOpen } = useTimeline()

  return (
    <button
      onClick={toggleTimeline}
      className="absolute top-4 right-4 z-50 p-2 rounded-full bg-gradient-to-br from-gray-900/90 via-purple-800/90 to-purple-800/90 border border-gray-700 text-bandhu-primary hover:text-white hover:bg-gradient-to-r hover:from-bandhu-primary hover:to-bandhu-secondary transition-all duration-300 hover:scale-110"
      title={isTimelineOpen ? "Fermer la timeline" : "Ouvrir la timeline"}
    >
      <span className="hover:scale-110 transition-transform">
        {isTimelineOpen ? '✕' : '📅'}
      </span>
    </button>
  )
}