import React from 'react'

interface ExportIconProps {
  size?: number
  className?: string
  color?: string
}

export const ExportIcon = ({ size = 16, className = "", color = "#60a5fa" }: ExportIconProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Flèche sortante classique */}
      <path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H9" />
      <path d="M15 3H21V9" />
      <path d="M21 3L12 12" />
    </svg>
  )
}