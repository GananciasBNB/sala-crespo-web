// Íconos SVG centralizados — sin emojis en la UI pública

export const IconTrophy = ({ size = 20, color = '#C9A84C' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 21h8M12 17v4M7 4H17V13C17 15.761 14.761 18 12 18C9.239 18 7 15.761 7 13V4Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 6H3V9C3 11 4.5 12.5 7 13" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M17 6H21V9C21 11 19.5 12.5 17 13" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="9" y1="21" x2="15" y2="21" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

export const IconPin = ({ size = 20, color = '#C41E3A' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 21C12 21 5 14.5 5 9C5 5.686 8.134 3 12 3C15.866 3 19 5.686 19 9C19 14.5 12 21 12 21Z" stroke={color} strokeWidth="1.8" fill={color} fillOpacity="0.15"/>
    <circle cx="12" cy="9" r="2.5" fill={color}/>
  </svg>
)

export const IconSoccerBall = ({ size = 20, color = '#E8EAF0' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8"/>
    <path d="M12 3L10 7H14L12 3Z" fill={color} opacity="0.7"/>
    <path d="M12 21L10 17H14L12 21Z" fill={color} opacity="0.7"/>
    <path d="M3 12L7 10V14L3 12Z" fill={color} opacity="0.7"/>
    <path d="M21 12L17 10V14L21 12Z" fill={color} opacity="0.7"/>
    <polygon points="10,7 14,7 17,10 16,14 12,16 8,14 7,10" stroke={color} strokeWidth="1.2" fill="none"/>
  </svg>
)

export const IconStar = ({ size = 20, color = '#F6B40E' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2l2.9 6.26 6.1.98-4.5 4.87 1.08 6.89L12 17.77l-5.58 3.23 1.08-6.89L3 9.24l6.1-.98L12 2z"/>
  </svg>
)

export const IconMic = ({ size = 20, color = '#C9A84C' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="9" y="2" width="6" height="11" rx="3" stroke={color} strokeWidth="1.8"/>
    <path d="M5 10C5 14.418 8.134 18 12 18C15.866 18 19 14.418 19 10" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="12" y1="18" x2="12" y2="22" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="8" y1="22" x2="16" y2="22" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

export const IconCamera = ({ size = 20, color = '#C9A84C' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23 19C23 20.105 22.105 21 21 21H3C1.895 21 1 20.105 1 19V8C1 6.895 1.895 6 3 6H7L9 3H15L17 6H21C22.105 6 23 6.895 23 8V19Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
    <circle cx="12" cy="13" r="4" stroke={color} strokeWidth="1.8"/>
  </svg>
)

export const IconMusic = ({ size = 20, color = '#C9A84C' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 18V5L21 3V16" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="6" cy="18" r="3" stroke={color} strokeWidth="1.8"/>
    <circle cx="18" cy="16" r="3" stroke={color} strokeWidth="1.8"/>
  </svg>
)

export const IconTarget = ({ size = 20, color = '#C41E3A' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8"/>
    <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="1.8"/>
    <circle cx="12" cy="12" r="1.5" fill={color}/>
  </svg>
)

export const IconMedal = ({ size = 20, color = '#C9A84C' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="15" r="6" stroke={color} strokeWidth="1.8"/>
    <path d="M8.5 3L12 9L15.5 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 3H15" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M10 15L11.5 17L14 13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
