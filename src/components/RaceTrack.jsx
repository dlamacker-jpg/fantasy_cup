import { useState, useEffect, useMemo } from 'react';
import { CHARACTER_THEMES } from '../data/leagueConfig';
import { useSound } from '../hooks/useSoundEffects';

/**
 * Mario Kart-style animated race track visualization.
 * Shows leaderboard positions as characters racing along a track.
 *
 * Props:
 *   leaderboard: [{ character, totalCupPoints, place, ownerName, ownerId }]
 */
export default function RaceTrack({ leaderboard }) {
  const [animated, setAnimated] = useState(false);
  const { play } = useSound();

  useEffect(() => {
    setAnimated(false);
    const timer = setTimeout(() => {
      setAnimated(true);
      play('boost');
    }, 100);
    return () => clearTimeout(timer);
  }, [leaderboard]);

  const maxPoints = useMemo(() => {
    if (!leaderboard || leaderboard.length === 0) return 1;
    return Math.max(...leaderboard.map(t => t.totalCupPoints || 0), 1);
  }, [leaderboard]);

  if (!leaderboard || leaderboard.length === 0) return null;

  return (
    <div className="bg-mk-dark rounded-2xl border border-white/10 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🏎️</span>
        <h3 className="font-display text-[10px] sm:text-xs text-white uppercase tracking-wide">Race Standings</h3>
      </div>

      <div className="space-y-1.5">
        {leaderboard.slice(0, 12).map((team, i) => {
          const theme = CHARACTER_THEMES[team.character] || { primary: '#666', initial: '?' };
          const pct = maxPoints > 0 ? ((team.totalCupPoints || 0) / maxPoints) * 100 : 0;
          const place = i + 1;

          return (
            <div key={team.ownerId || i} className="flex items-center gap-2">
              {/* Position number */}
              <span className={`text-[11px] font-bold w-4 text-right shrink-0 tabular-nums ${
                place === 1 ? 'text-mk-gold' : place === 2 ? 'text-gray-300' : place === 3 ? 'text-amber-600' : 'text-gray-600'
              }`}>
                {place}
              </span>

              {/* Character kart circle — sits outside the track bar */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                style={{
                  backgroundColor: theme.primary,
                  boxShadow: `0 0 6px ${theme.primary}55`,
                }}
              >
                {theme.initial}
              </div>

              {/* Track lane — progress bar only, no overlapping elements */}
              <div className="flex-1 h-5 bg-gray-800/60 rounded-full overflow-hidden relative">
                {/* Progress fill */}
                <div
                  className="absolute left-0 top-0 bottom-0 rounded-full transition-all ease-out"
                  style={{
                    width: animated ? `${Math.max(pct, 5)}%` : '2%',
                    transitionDuration: `${800 + i * 80}ms`,
                    background: `linear-gradient(90deg, ${theme.primary}44, ${theme.primary}88)`,
                  }}
                />
                {/* Points inside the bar, right-aligned */}
                <div className="absolute inset-0 flex items-center justify-end pr-2.5">
                  <span className="text-[9px] font-bold text-white/80 tabular-nums drop-shadow-sm">
                    {team.totalCupPoints || 0}
                  </span>
                </div>
              </div>

              {/* Name — visible on sm+ */}
              <span className="text-[10px] text-gray-500 font-medium w-16 truncate shrink-0 hidden sm:block">
                {team.character?.split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Finish line */}
      <div className="mt-2.5 flex items-center gap-2 pl-12">
        <div className="flex-1 h-px" style={{
          backgroundImage: 'repeating-linear-gradient(90deg, white 0px, white 4px, transparent 4px, transparent 8px)',
          opacity: 0.15,
        }} />
        <span className="text-[9px] text-gray-600 shrink-0">🏁 FINISH</span>
      </div>
    </div>
  );
}
