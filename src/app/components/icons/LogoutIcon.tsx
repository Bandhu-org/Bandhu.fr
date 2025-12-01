import React from 'react'

interface LogoutIconProps {
  size?: number
  className?: string
  color?: string
}

export const LogoutIcon = ({ size, className, color = "#60a5fa" }: LogoutIconProps) => {
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
      {/* Flèche de sortie */}
      <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" />
      <line x1="16" y1="17" x2="21" y2="12" />
      <line x1="21" y1="12" x2="16" y2="7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}