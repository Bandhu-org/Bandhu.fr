import React from 'react'

interface RenameIconProps {
  size?: number
  className?: string
  color?: string
}

export const RenameIcon = ({ size, className, color = "#60a5fa" }: RenameIconProps) => {
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
      color = "#60a5fa"
    >
      {/* Crayon style épuré */}
      <path d="M17 3L21 7L8 20H4V16L17 3Z" />
      <line x1="15" y1="5" x2="19" y2="9" />
    </svg>
  )
}