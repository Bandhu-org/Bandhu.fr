import React from 'react'

interface DeleteIconProps {
  size?: number
  className?: string
}

export const DeleteIcon = ({ size, className }: DeleteIconProps) => {
  return (
    <svg
      width={size || 16}
      height={size || 16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Corbeille */}
      <path d="M3 6H21L19 20H5L3 6Z" />
      <line x1="9" y1="6" x2="9" y2="4" />
      <line x1="15" y1="6" x2="15" y2="4" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}