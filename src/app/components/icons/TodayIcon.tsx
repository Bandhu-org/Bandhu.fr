import React from 'react'

interface TodayIconProps {
  size?: number
  className?: string
  color?: string
}

export const TodayIcon = ({ size, className, color = "#60a5fa" }: TodayIconProps) => {
  return (
    <svg
      width={size || 16}
      height={size || 16}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Calendrier avec point du jour */}
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      {/* Point pour "aujourd'hui" */}
      <circle cx="12" cy="16" r="2" fill={color} />
    </svg>
  )
}