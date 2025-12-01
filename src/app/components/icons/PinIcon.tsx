// Dans PinIcon.tsx
interface PinIconProps {
  size?: number
  className?: string
  pinned?: boolean
  color?: string  // ← Doit être présent
}

export const PinIcon = ({ size, className, pinned, color = "#60a5fa" }: PinIconProps) => {
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
      {/* Rotation à 45° pour l'effet penché */}
      <g transform="translate(12 12) rotate(45) translate(-12 -12)">
        {pinned ? (
          <>
            {/* Tête carrée penchée */}
            <rect x="7" y="5" width="10" height="10" rx="1" fill={color} />
            {/* Corps */}
            <rect x="11" y="15" width="2" height="5" fill={color} />
            {/* Pointe */}
            <path d="M10 20L12 22L14 20Z" fill={color} />
            {/* Point blanc */}
            <circle cx="12" cy="10" r="1.5" fill="white" />
          </>
        ) : (
          <>
            <rect x="7" y="5" width="10" height="10" rx="1" />
            <line x1="12" y1="15" x2="12" y2="20" />
            <path d="M10 20L12 22L14 20" />
          </>
        )}
      </g>
    </svg>
  )
}