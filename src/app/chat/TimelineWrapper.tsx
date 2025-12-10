// src/app/chat/TimelineWrapper.tsx
'use client'

import { TimelineProvider } from '@/contexts/TimelineContext'
import TimelineSidebar from '@/app/components/TimelineSidebar/TimelineSidebar'

export default function TimelineWrapper({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <TimelineProvider>
      {children}
      <TimelineSidebar />
    </TimelineProvider>
  )
}