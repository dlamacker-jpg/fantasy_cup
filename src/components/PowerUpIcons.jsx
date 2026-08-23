// SVG Power-Up Icons — custom vector art for the Fantasy Cup
// Each icon is a React component that accepts size and className props

export function MushroomIcon({ size = 32, className = '' }) {
  return (
    <img
      src="/icons/mushroom.svg"
      alt="Mushroom"
      width={size}
      height={size}
      className={className}
      style={{ filter: 'invert(22%) sepia(95%) saturate(5000%) hue-rotate(355deg) brightness(95%)' }}
    />
  );
}

export function GreenShellIcon({ size = 32, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="24" fill="#43B047"/>
      <circle cx="32" cy="32" r="18" fill="#2D8A31"/>
      <path d="M32 14 L38 26 L32 22 L26 26 Z" fill="#43B047"/>
      <path d="M32 50 L38 38 L32 42 L26 38 Z" fill="#43B047"/>
      <path d="M14 32 L26 26 L22 32 L26 38 Z" fill="#43B047"/>
      <path d="M50 32 L38 26 L42 32 L38 38 Z" fill="#43B047"/>
      <circle cx="32" cy="32" r="8" fill="#FFF" opacity="0.9"/>
    </svg>
  );
}

export function RedShellIcon({ size = 32, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="24" fill="#E52521"/>
      <circle cx="32" cy="32" r="18" fill="#CC1111"/>
      <path d="M32 14 L38 26 L32 22 L26 26 Z" fill="#E52521"/>
      <path d="M32 50 L38 38 L32 42 L26 38 Z" fill="#E52521"/>
      <path d="M14 32 L26 26 L22 32 L26 38 Z" fill="#E52521"/>
      <path d="M50 32 L38 26 L42 32 L38 38 Z" fill="#E52521"/>
      <circle cx="32" cy="32" r="8" fill="#FFF" opacity="0.9"/>
    </svg>
  );
}

export function StarIcon({ size = 32, className = '' }) {
  return (
    <img
      src="/icons/star.svg"
      alt="Star"
      width={size}
      height={size}
      className={className}
    />
  );
}

export function FireFlowerIcon({ size = 32, className = '' }) {
  return (
    <img
      src="/icons/fire-flower.svg"
      alt="Fire Flower"
      width={size}
      height={size}
      className={className}
    />
  );
}

export function LightningIcon({ size = 32, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="boltGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{stopColor:'#FFE066'}}/>
          <stop offset="100%" style={{stopColor:'#FF8C00'}}/>
        </linearGradient>
      </defs>
      <polygon points="38,2 16,30 28,30 22,62 48,28 34,28"
        fill="url(#boltGrad)" stroke="#CC7000" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  );
}

export function BulletBillIcon({ size = 32, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="36" cy="32" rx="24" ry="18" fill="#333"/>
      <ellipse cx="20" cy="32" rx="10" ry="18" fill="#555"/>
      <ellipse cx="20" cy="32" rx="10" ry="14" fill="#444" stroke="#666" strokeWidth="1"/>
      <circle cx="44" cy="26" r="5" fill="#FFF"/>
      <circle cx="44" cy="26" r="3" fill="#333"/>
      <path d="M10 22 L6 18 M10 42 L6 46" stroke="#888" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

export function GhostIcon({ size = 32, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M16 32 C16 18 24 8 32 8 C40 8 48 18 48 32 L48 52 L42 46 L36 52 L32 48 L28 52 L22 46 L16 52 Z"
        fill="#FFF" stroke="#DDD" strokeWidth="1.5" opacity="0.9"/>
      <ellipse cx="26" cy="28" rx="4" ry="5" fill="#333"/>
      <ellipse cx="38" cy="28" rx="4" ry="5" fill="#333"/>
      <ellipse cx="27" cy="27" rx="1.5" ry="2" fill="#FFF"/>
      <ellipse cx="39" cy="27" rx="1.5" ry="2" fill="#FFF"/>
      <path d="M28 38 Q32 42 36 38" fill="none" stroke="#E52521" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function SuperHornIcon({ size = 32, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hornGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{stopColor:'#FFD700'}}/>
          <stop offset="100%" style={{stopColor:'#FFA500'}}/>
        </linearGradient>
      </defs>
      <rect x="8" y="20" width="16" height="24" rx="3" fill="url(#hornGrad)" stroke="#CC8800" strokeWidth="1.5"/>
      <path d="M24 16 L52 6 L52 58 L24 48 Z" fill="url(#hornGrad)" stroke="#CC8800" strokeWidth="1.5"/>
      <path d="M54 20 Q60 22 60 26" fill="none" stroke="#FF6600" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M54 30 Q62 32 62 38" fill="none" stroke="#FF6600" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M54 16 Q58 12 56 8" fill="none" stroke="#FF6600" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

export function BlueShellIcon({ size = 32, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="24" fill="#1E90FF"/>
      <circle cx="32" cy="32" r="18" fill="#0066CC"/>
      <path d="M32 14 L38 26 L32 22 L26 26 Z" fill="#1E90FF"/>
      <path d="M32 50 L38 38 L32 42 L26 38 Z" fill="#1E90FF"/>
      <path d="M14 32 L26 26 L22 32 L26 38 Z" fill="#1E90FF"/>
      <path d="M50 32 L38 26 L42 32 L38 38 Z" fill="#1E90FF"/>
      <circle cx="32" cy="32" r="8" fill="#FFF" opacity="0.9"/>
      {/* Spikes */}
      <polygon points="32,4 34,12 30,12" fill="#E52521"/>
      <polygon points="52,10 48,16 46,12" fill="#E52521"/>
      <polygon points="58,28 52,30 52,26" fill="#E52521"/>
    </svg>
  );
}

export function WarpPipeIcon({ size = 32, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="18" width="36" height="40" rx="2" fill="#43B047"/>
      <rect x="14" y="18" width="36" height="40" rx="2" fill="none" stroke="#2D8A31" strokeWidth="2"/>
      <rect x="10" y="10" width="44" height="14" rx="3" fill="#43B047" stroke="#2D8A31" strokeWidth="2"/>
      <ellipse cx="32" cy="10" rx="22" ry="6" fill="#5ACD5E" stroke="#2D8A31" strokeWidth="1.5"/>
      <rect x="22" y="30" width="4" height="22" fill="#2D8A31" opacity="0.4"/>
      <rect x="38" y="30" width="4" height="22" fill="#2D8A31" opacity="0.4"/>
    </svg>
  );
}

export function MagicWandIcon({ size = 32, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor:'#7B2D8E'}}/>
          <stop offset="100%" style={{stopColor:'#4B0082'}}/>
        </linearGradient>
      </defs>
      <line x1="14" y1="56" x2="44" y2="20" stroke="url(#wandGrad)" strokeWidth="5" strokeLinecap="round"/>
      <line x1="14" y1="56" x2="44" y2="20" stroke="#9B59B6" strokeWidth="3" strokeLinecap="round"/>
      <polygon points="44,20 50,8 56,20 50,16" fill="#FFD700" stroke="#E5A000" strokeWidth="1"/>
      {/* Sparkles */}
      <circle cx="24" cy="30" r="2" fill="#FFD700" opacity="0.8"/>
      <circle cx="36" cy="14" r="1.5" fill="#FFD700" opacity="0.6"/>
      <circle cx="52" cy="24" r="1.5" fill="#FFD700" opacity="0.7"/>
      <path d="M30 20 L32 16 L34 20 L30 20" fill="#FFD700" opacity="0.5"/>
    </svg>
  );
}

// Mapping from power-up names to icon components
export const POWER_UP_ICON_MAP = {
  'Mushroom': MushroomIcon,
  'Green Shell': GreenShellIcon,
  'Triple Green Shell': GreenShellIcon,
  'Red Shell': RedShellIcon,
  'Triple Red Shell': RedShellIcon,
  'Bullet Bill': BulletBillIcon,
  'Ghost': GhostIcon,
  'Star': StarIcon,
  'Lightning': LightningIcon,
  'Super Horn': SuperHornIcon,
  "Kimek's Magic": MagicWandIcon,
  'Blue Spiked Shell': BlueShellIcon,
  'Warp Pipe': WarpPipeIcon,
  'Fire Flower': FireFlowerIcon,
};
