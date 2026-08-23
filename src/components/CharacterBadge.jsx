import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CHARACTER_THEMES, CHARACTER_IMAGES } from '../data/leagueConfig';

// Generates an SVG data URI fallback with the character's signature colors
function generateFallbackSvg(character) {
  const theme = CHARACTER_THEMES[character] || { primary: '#666', secondary: '#444', accent: '#999', initial: '?' };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs>
      <radialGradient id="g" cx="40%" cy="35%" r="60%">
        <stop offset="0%" stop-color="${theme.primary}"/>
        <stop offset="100%" stop-color="${theme.secondary}"/>
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="50" fill="url(#g)"/>
    <circle cx="50" cy="50" r="46" fill="none" stroke="${theme.accent}" stroke-width="2" opacity="0.4"/>
    <text x="50" y="56" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="sans-serif" font-weight="bold" font-size="${theme.initial.length > 1 ? '26' : '34'}" opacity="0.95">${theme.initial}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function characterToSlug(character) {
  if (!character) return null;
  return character.toLowerCase().replace(/\s+/g, '-');
}

export default function CharacterBadge({ character, size = 'md', showName = false, className = '', noLink = false }) {
  const [imgError, setImgError] = useState(false);
  const theme = CHARACTER_THEMES[character] || {};
  const imageUrl = CHARACTER_IMAGES[character];
  const fallback = generateFallbackSvg(character);
  const slug = characterToSlug(character);

  const sizes = {
    xs: 'w-8 h-8',
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
    xl: 'w-32 h-32',
    '2xl': 'w-40 h-40',
  };

  const ringColors = {
    xs: 'ring-1',
    sm: 'ring-2',
    md: 'ring-2',
    lg: 'ring-[3px]',
    xl: 'ring-[3px]',
    '2xl': 'ring-4',
  };

  const badge = (
    <div className={`flex flex-col items-center justify-center gap-1 ${className}`}>
      <div
        className={`${sizes[size]} rounded-full overflow-hidden flex-shrink-0 ${ringColors[size]} ring-offset-1 ring-offset-mk-darker transition-transform hover:scale-110`}
        style={{
          ringColor: theme.primary || '#666',
          boxShadow: `0 0 12px ${theme.primary}44`,
          background: `radial-gradient(circle at 40% 35%, ${theme.primary}, ${theme.secondary || theme.primary})`,
        }}
      >
        <img
          src={!imgError && imageUrl ? imageUrl : fallback}
          alt={character}
          className="w-full h-full object-cover object-center"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
      {showName && (
        <span className="text-xs font-bold text-gray-300 text-center leading-tight">{character}</span>
      )}
    </div>
  );

  if (noLink || !slug) return badge;

  return (
    <Link to={`/racer/${slug}`} className="inline-flex" title={character}>
      {badge}
    </Link>
  );
}

// Inline variant for tables (just icon + name text)
export function CharacterInline({ character, ownerName, avatar, size = 'sm' }) {
  const slug = characterToSlug(character);
  return (
    <Link to={`/racer/${slug}`} className="flex items-center gap-2.5 group">
      <CharacterBadge character={character} size={size} noLink />
      <div className="min-w-0">
        <p className="font-body font-bold text-sm text-white truncate group-hover:text-mk-gold transition-colors">{character}</p>
        {ownerName && <p className="text-xs text-gray-400 truncate">{ownerName}</p>}
      </div>
    </Link>
  );
}
