'use client'

import React from 'react'
import TimelineSidebar from './TimelineSidebar'

interface TimelineWrapperProps {
  activeThreadId: string | null
  currentVisibleEventId: string | null
}

const TimelineWrapper = React.memo(
  ({ activeThreadId, currentVisibleEventId }: TimelineWrapperProps) => {
    return (
      <TimelineSidebar 
        activeThreadId={activeThreadId} 
        currentVisibleEventId={currentVisibleEventId} 
      />
    )
  },
  (prev, next) => {
    return (
      prev.activeThreadId === next.activeThreadId &&
      prev.currentVisibleEventId === next.currentVisibleEventId
    )
  }
)

TimelineWrapper.displayName = 'TimelineWrapper'

export default TimelineWrapper