// Decorative Mario Kart racing elements — checkered flags, finish lines, item boxes

export function CheckeredFlagSVG({ className = '', width = 48, height = 48 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="checks" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="#FFF"/>
          <rect x="4" y="0" width="4" height="4" fill="#333"/>
          <rect x="0" y="4" width="4" height="4" fill="#333"/>
          <rect x="4" y="4" width="4" height="4" fill="#FFF"/>
        </pattern>
      </defs>
      <rect x="12" y="4" width="24" height="32" rx="1" fill="url(#checks)" stroke="#888" strokeWidth="1"/>
      <rect x="18" y="32" width="3" height="14" fill="#8B4513"/>
      <rect x="27" y="32" width="3" height="14" fill="#8B4513"/>
      <line x1="18" y1="46" x2="30" y2="46" stroke="#8B4513" strokeWidth="2"/>
    </svg>
  );
}

export function ItemBoxSVG({ className = '', size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="boxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor:'#FF8C00'}}/>
          <stop offset="100%" style={{stopColor:'#E5700A'}}/>
        </linearGradient>
      </defs>
      {/* Rotating cube */}
      <rect x="8" y="8" width="32" height="32" rx="4" fill="url(#boxGrad)" stroke="#CC5500" strokeWidth="1.5"/>
      <text x="24" y="30" textAnchor="middle" fontFamily="Impact,sans-serif" fontSize="22" fontWeight="bold" fill="#FFF">?</text>
      {/* Sparkle hints */}
      <circle cx="8" cy="8" r="2" fill="#FFD700" opacity="0.6"/>
      <circle cx="40" cy="40" r="2" fill="#FFD700" opacity="0.6"/>
      <circle cx="40" cy="8" r="1.5" fill="#FFD700" opacity="0.4"/>
    </svg>
  );
}

export function RainbowRoadDivider({ className = '' }) {
  return (
    <svg width="100%" height="6" viewBox="0 0 800 6" preserveAspectRatio="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rainbowDiv" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{stopColor:'#E52521'}}/>
          <stop offset="20%" style={{stopColor:'#FBBE00'}}/>
          <stop offset="40%" style={{stopColor:'#43B047'}}/>
          <stop offset="60%" style={{stopColor:'#049CD8'}}/>
          <stop offset="80%" style={{stopColor:'#7B2D8E'}}/>
          <stop offset="100%" style={{stopColor:'#E52521'}}/>
        </linearGradient>
      </defs>
      <rect width="800" height="6" rx="3" fill="url(#rainbowDiv)"/>
    </svg>
  );
}

export function FinishLineBanner({ className = '' }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg width="100%" height="12" viewBox="0 0 800 12" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="finishChecks" width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#FFF" opacity="0.15"/>
            <rect x="6" y="0" width="6" height="6" fill="transparent"/>
            <rect x="0" y="6" width="6" height="6" fill="transparent"/>
            <rect x="6" y="6" width="6" height="6" fill="#FFF" opacity="0.15"/>
          </pattern>
        </defs>
        <rect width="800" height="12" fill="url(#finishChecks)"/>
      </svg>
    </div>
  );
}

// Floating kart silhouette for decorative backgrounds
export function KartSilhouette({ className = '', size = 80, color = 'rgba(255,255,255,0.03)' }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 120 72" className={className} xmlns="http://www.w3.org/2000/svg">
      <g fill={color}>
        {/* Kart body */}
        <path d="M20 38 C20 30 30 22 50 20 L70 20 C85 22 95 28 98 38 L100 42 L16 42 Z"/>
        {/* Driver helmet */}
        <ellipse cx="55" cy="18" rx="12" ry="14"/>
        {/* Wheels */}
        <circle cx="28" cy="48" r="10"/>
        <circle cx="88" cy="48" r="10"/>
        {/* Exhaust */}
        <circle cx="8" cy="36" r="4"/>
        <circle cx="2" cy="32" r="3"/>
      </g>
    </svg>
  );
}
