import React from 'react'

interface ArchiveIconProps {
  size?: number
  className?: string
  color?: string
}

export const ArchiveIcon = ({ size, className, color = "#60a5fa" }: ArchiveIconProps) => {
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
      {/* Boîte d'archive */}
      <rect x="3" y="4" width="18" height="5" rx="1" />
      <path d="M5 9V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V9" />
      <line x1="10" y1="13" x2="14" y2="13" />
    </svg>
  )
}