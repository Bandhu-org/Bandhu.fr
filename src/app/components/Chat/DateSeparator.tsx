'use client'

import React from 'react'

interface DateSeparatorProps {
  dateLabel: string
}

const DateSeparator = React.memo(({ dateLabel }: DateSeparatorProps) => {
  return (
    <div className="flex items-center gap-4 my-8">
      <div className="flex-1 h-px bg-bandhu-primary/30"></div>
      <span className="text-sm font-medium text-bandhu-primary px-3">
        {dateLabel}
      </span>
      <div className="flex-1 h-px bg-bandhu-primary/30"></div>
    </div>
  )
}, (prevProps, nextProps) => {
  return prevProps.dateLabel === nextProps.dateLabel
})

DateSeparator.displayName = 'DateSeparator'

export default DateSeparator