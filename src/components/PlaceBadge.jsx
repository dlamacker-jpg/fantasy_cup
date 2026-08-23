function getOrdinal(n) {
  const j = n % 10, k = n % 100;
  if (j === 1 && k !== 11) return n + 'st';
  if (j === 2 && k !== 12) return n + 'nd';
  if (j === 3 && k !== 13) return n + 'rd';
  return n + 'th';
}

export default function PlaceBadge({ place, size = 'md' }) {
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const colors = {
    1: 'bg-mk-gold/20 text-mk-gold border-mk-gold',
    2: 'bg-mk-silver/20 text-mk-silver border-mk-silver',
    3: 'bg-mk-bronze/20 text-mk-bronze border-mk-bronze',
  };
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const color = colors[place] || 'bg-mk-panel text-gray-300 border-gray-600';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-bold font-body ${color} ${sizes[size]}`}>
      {medals[place] && <span>{medals[place]}</span>}
      {getOrdinal(place)}
    </span>
  );
}

export { getOrdinal };
