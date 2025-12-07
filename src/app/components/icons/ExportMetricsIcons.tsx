import React from 'react'

interface MetricIconProps {
  type: 'messages' | 'conversations' | 'user' | 'ombrelien'
  size?: number
  color?: string
  className?: string
}

export const MetricIcon = ({ type, size = 20, color = "#7c3aed", className = "" }: MetricIconProps) => {
  const icons = {
    messages: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        {/* Icône message/speech bubble */}
        <path d="M21 11.5C21 16.75 16.75 21 11.5 21C10.3 21 9.1 20.8 8 20.4L3 21L3.6 16C3.2 14.9 3 13.7 3 12.5C3 7.25 7.25 3 12.5 3C17.75 3 22 7.25 22 12.5V13.5" />
        <circle cx="9" cy="12" r="1" fill={color} />
        <circle cx="12" cy="12" r="1" fill={color} />
        <circle cx="15" cy="12" r="1" fill={color} />
      </svg>
    ),
    conversations: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        {/* Icône thread/fil */}
        <path d="M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3" />
        <path d="M21 12H12C8.13 12 5 15.13 5 19V21" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="2" fill={color} />
      </svg>
    ),
    user: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        {/* Icône utilisateur */}
        <circle cx="12" cy="8" r="4" />
        <path d="M5 20C5 16.13 8.13 13 12 13C15.87 13 19 16.13 19 20" />
      </svg>
    ),
    ombrelien: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        {/* Icône lune/stylo (Ombrelien) */}
        <path d="M21 12.79C20 15 18 16.5 15.5 16.5C12.5 16.5 10 14 10 11C10 8.5 11.5 6.5 13.5 5.5C12.5 5 11.5 4.5 10.5 4.5C7.5 4.5 5 7 5 10C5 13 7.5 15.5 10.5 15.5C11.5 15.5 12.5 15 13.5 14.5" />
        <path d="M16 8L19 5L22 8" strokeWidth="1.5" />
        <path d="M19 5V11" strokeWidth="1.5" />
      </svg>
    )
  }

  return (
    <span className={`metric-icon ${className}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
      {icons[type]}
    </span>
  )
}