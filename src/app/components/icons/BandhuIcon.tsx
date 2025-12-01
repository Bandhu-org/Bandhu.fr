'use client'

import React from 'react'

interface BandhuIconProps {
  children: React.ReactNode
  size?: number
  className?: string
  hoverEffect?: boolean
}

export const BandhuIcon = ({
  children,
  size = 20,
  className = '',
  hoverEffect = true
}: BandhuIconProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="url(#bandhu-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-all duration-200 ${hoverEffect ? 'group-hover:stroke-[url(#bandhu-gradient-hover)]' : ''} ${className}`}
    >
      <defs>
        <linearGradient id="bandhu-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--bandhu-primary)" />
          <stop offset="100%" stopColor="var(--bandhu-secondary)" />
        </linearGradient>
        <linearGradient id="bandhu-gradient-hover" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--bandhu-primary)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="var(--bandhu-secondary)" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      {children}
    </svg>
  )
}