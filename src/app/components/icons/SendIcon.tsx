import React from 'react'

interface SendIconProps {
  size?: number
  className?: string
  color?: string
}

export const SendIcon = ({ size, className, color = "#60a5fa" }: SendIconProps) => {
  return (
    <svg
      width={size || 20}
      height={size || 20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"  // ← Important : utilise currentColor
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}  // ← Passe la className ici
    >
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  )
}