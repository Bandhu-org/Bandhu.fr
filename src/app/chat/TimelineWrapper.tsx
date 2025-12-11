// src/app/chat/TimelineWrapper.tsx
'use client'

import { TimelineProvider } from '@/contexts/TimelineContext'

export default function TimelineWrapper({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <TimelineProvider>
      {children}
    </TimelineProvider>
  )
}