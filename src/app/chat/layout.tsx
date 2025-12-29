// src/app/chat/layout.tsx
'use client'

import { TimelineProvider } from '@/contexts/TimelineContext'
import React from 'react'

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ✨ MEMO pour éviter re-render inutiles
  const memoizedChildren = React.useMemo(() => children, [])
  
  return (
    <TimelineProvider>
      {memoizedChildren}
    </TimelineProvider>
  )
}