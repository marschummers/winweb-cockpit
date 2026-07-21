type NavIconName = 'cockpit' | 'finance' | 'sales' | 'projects' | 'settings'

const commonProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const GEAR_TEETH_ANGLES = [0, 60, 120, 180, 240, 300]

export default function NavIcon({ name }: { name: NavIconName }) {
  switch (name) {
    case 'cockpit':
      return (
        <svg {...commonProps} aria-hidden="true">
          <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.2" />
          <rect x="13" y="3.5" width="7.5" height="4.5" rx="1.2" />
          <rect x="13" y="10" width="7.5" height="10.5" rx="1.2" />
          <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.2" />
        </svg>
      )
    case 'finance':
      return (
        <svg {...commonProps} aria-hidden="true">
          <line x1="4" y1="20" x2="20" y2="20" />
          <rect x="6" y="13" width="3.4" height="7" rx="0.6" />
          <rect x="14.6" y="9" width="3.4" height="11" rx="0.6" />
        </svg>
      )
    case 'sales':
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M4 5 H20 L14 13 V19 L10 21 V13 Z" />
        </svg>
      )
    case 'projects':
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M4 6.5 C4 5.7 4.7 5 5.5 5 H10 L11.5 7 H18.5 C19.3 7 20 7.7 20 8.5 V17.5 C20 18.3 19.3 19 18.5 19 H5.5 C4.7 19 4 18.3 4 17.5 Z" />
          <path d="M8 13 L10.5 15.5 L16 10" />
        </svg>
      )
    case 'settings':
      return (
        <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth={2} />
          <circle cx="12" cy="12" r="2" fill="none" stroke="currentColor" strokeWidth={2} />
          {GEAR_TEETH_ANGLES.map((deg) => (
            <rect
              key={deg}
              x="10.5"
              y="1.5"
              width="3"
              height="3.5"
              rx="0.5"
              fill="currentColor"
              transform={`rotate(${deg} 12 12)`}
            />
          ))}
        </svg>
      )
  }
}
