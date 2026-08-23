import { LEAGUES, CHARACTER_THEMES } from '../data/leagueConfig';
import CharacterBadge from '../components/CharacterBadge';
import LoadingSpinner from '../components/LoadingSpinner';

function BananaPeelIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bananaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor:'#FFE135'}}/>
          <stop offset="100%" style={{stopColor:'#F5C800'}}/>
        </linearGradient>
      </defs>
      <path d="M28 10 C20 14 12 26 14 40 C16 48 22 52 28 50 L26 44 C22 44 20 40 20 34 C20 24 26 18 30 16 Z" fill="url(#bananaGrad)" stroke="#C8A000" strokeWidth="1.5"/>
      <path d="M36 10 C44 14 52 26 50 40 C48 48 42 52 36 50 L38 44 C42 44 44 40 44 34 C44 24 38 18 34 16 Z" fill="url(#bananaGrad)" stroke="#C8A000" strokeWidth="1.5"/>
      <path d="M30 8 C30 4 34 4 34 8 L34 16 C34 18 30 18 30 16 Z" fill="url(#bananaGrad)" stroke="#C8A000" strokeWidth="1.5"/>
      <ellipse cx="32" cy="52" rx="10" ry="4" fill="#C8A000" opacity="0.3"/>
    </svg>
  );
}

function SackoTrophy({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="toiletGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{stopColor:'#8B7355'}}/>
          <stop offset="100%" style={{stopColor:'#6B4226'}}/>
        </linearGradient>
        <linearGradient id="seatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{stopColor:'#A0A0A0'}}/>
          <stop offset="100%" style={{stopColor:'#707070'}}/>
        </linearGradient>
      </defs>
      {/* Toilet bowl (sacko trophy) */}
      <ellipse cx="60" cy="100" rx="35" ry="8" fill="#555" opacity="0.3"/>
      <path d="M30 45 C25 45 22 55 24 70 C26 82 34 90 60 90 C86 90 94 82 96 70 C98 55 95 45 90 45 Z" fill="url(#toiletGrad)" stroke="#5A3A1A" strokeWidth="2"/>
      <ellipse cx="60" cy="45" rx="30" ry="12" fill="url(#seatGrad)" stroke="#5A3A1A" strokeWidth="2"/>
      <ellipse cx="60" cy="45" rx="22" ry="8" fill="#4A3520" stroke="#3A2510" strokeWidth="1"/>
      {/* Tank */}
      <rect x="42" y="20" width="36" height="28" rx="4" fill="url(#seatGrad)" stroke="#5A3A1A" strokeWidth="2"/>
      {/* Flush handle */}
      <rect x="80" y="28" width="10" height="4" rx="2" fill="#C0C0C0" stroke="#888" strokeWidth="1"/>
      {/* 12th place label */}
      <text x="60" y="78" textAnchor="middle" fontFamily="'Impact',sans-serif" fontSize="16" fontWeight="bold" fill="#FFD700">12th</text>
      {/* Stink lines */}
      <path d="M42 16 Q40 10 44 6" fill="none" stroke="#8B8B00" strokeWidth="1.5" opacity="0.5"/>
      <path d="M58 14 Q56 8 60 4" fill="none" stroke="#8B8B00" strokeWidth="1.5" opacity="0.5"/>
      <path d="M74 16 Q72 10 76 6" fill="none" stroke="#8B8B00" strokeWidth="1.5" opacity="0.5"/>
    </svg>
  );
}

export default function SackoPage({ sleeper }) {
  const { data, loading } = sleeper || {};

  if (loading || !data) return <LoadingSpinner message="Loading Sacko data..." />;

  const { leaderboard, cupData } = data;

  // The Sacko is the last-place finisher
  const sacko = leaderboard[leaderboard.length - 1];

  // Bottom 3 for the "podium of shame"
  const bottomThree = [...leaderboard].reverse().slice(0, 3);

  // Calculate "worst of" stats
  const worstStats = [];

  // Worst reg season across all cups
  Object.entries(LEAGUES).forEach(([key, cup]) => {
    const cupStandings = cupData[key]?.standings || [];
    if (cupStandings.length > 0) {
      const worst = cupStandings[cupStandings.length - 1];
      worstStats.push({
        label: `${cup.emoji} ${cup.name} Last Place`,
        character: worst.character,
        ownerName: worst.ownerName,
        detail: `${worst.wins}-${worst.losses} | ${worst.fpts?.toFixed(1)} PF | ${worst.cupPoints} pts`,
      });
    }
  });

  // Find lowest single-week scores across all cups
  const lowestWeeklyScores = [];
  Object.entries(cupData).forEach(([cupKey, cd]) => {
    const cup = LEAGUES[cupKey];
    Object.entries(cd.allMatchups || {}).forEach(([week, matchups]) => {
      (matchups || []).forEach(m => {
        if (m.points != null && m.points > 0) {
          const owner = cd.rosterToOwner?.[m.roster_id];
          if (owner) {
            lowestWeeklyScores.push({
              week: parseInt(week),
              points: m.points,
              character: owner.character,
              ownerName: owner.ownerName,
              cup: cupKey,
              cupEmoji: cup.emoji,
            });
          }
        }
      });
    });
  });
  lowestWeeklyScores.sort((a, b) => a.points - b.points);
  const bottomFiveWeeks = lowestWeeklyScores.slice(0, 5);

  const sackoTheme = CHARACTER_THEMES[sacko?.character] || {};

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <SackoTrophy size={100} />
        </div>
        <h2 className="font-display text-xl md:text-2xl text-white mb-1">THE SACKO</h2>
        <p className="text-gray-400 text-sm font-body">
          Last place in the overall cup — the ultimate walk of shame
        </p>
      </div>

      {/* Current Sacko Spotlight */}
      {sacko && (
        <div className="mb-8 relative overflow-hidden">
          <div className="bg-gradient-to-br from-amber-900/40 via-mk-dark/80 to-yellow-900/30 rounded-2xl border border-amber-700/40 p-8 text-center relative">
            {/* Floating banana peels */}
            <div className="absolute top-4 left-6 opacity-20 rotate-[-20deg]"><BananaPeelIcon size={36} /></div>
            <div className="absolute top-8 right-10 opacity-15 rotate-[15deg]"><BananaPeelIcon size={28} /></div>
            <div className="absolute bottom-6 left-12 opacity-10 rotate-[30deg]"><BananaPeelIcon size={32} /></div>
            <div className="absolute bottom-4 right-6 opacity-20 rotate-[-10deg]"><BananaPeelIcon size={24} /></div>

            <p className="text-xs font-bold text-amber-400/70 uppercase tracking-widest mb-4">Current Sacko Holder</p>
            <div className="flex justify-center mb-4">
              <div className="relative">
                <CharacterBadge character={sacko.character} size="xl" />
                <div className="absolute -bottom-2 -right-2 bg-amber-800 rounded-full w-8 h-8 flex items-center justify-center border-2 border-amber-600">
                  <span className="text-xs font-bold text-amber-200">12</span>
                </div>
              </div>
            </div>
            <h3 className="font-display text-lg text-white mb-1">{sacko.character}</h3>
            <p className="text-sm text-gray-400 mb-4">{sacko.ownerName}</p>
            <div className="inline-flex items-center gap-2 bg-mk-darker/60 rounded-xl px-5 py-3">
              <span className="text-sm text-gray-400">Total Points:</span>
              <span className="font-display text-2xl" style={{ color: sackoTheme.primary || '#E52521' }}>
                {sacko.totalCupPoints}
              </span>
            </div>

            {/* Per-cup breakdown */}
            <div className="flex justify-center gap-4 mt-4 flex-wrap">
              {Object.entries(LEAGUES).map(([key, cup]) => {
                const cupInfo = sacko.cups?.[key];
                return (
                  <div key={key} className="bg-mk-darker/40 rounded-lg px-3 py-2 text-xs text-center">
                    <p className="text-gray-500">{cup.emoji} {cup.name}</p>
                    <p className="font-bold text-white mt-0.5">{cupInfo?.cupPoints || 0} pts</p>
                    {cupInfo && (
                      <p className="text-gray-500 text-[10px]">
                        Reg #{cupInfo.regRank} → Playoff #{cupInfo.playoffPlace || '?'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom 3 — Podium of Shame */}
      <div className="mb-8">
        <h3 className="font-display text-xs text-amber-400 mb-4 text-center">PODIUM OF SHAME — BOTTOM 3</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bottomThree.map((team, i) => {
            const theme = CHARACTER_THEMES[team.character] || {};
            const labels = ['12th Place', '11th Place', '10th Place'];
            const borderColors = ['border-amber-600/50', 'border-amber-700/30', 'border-amber-800/20'];
            return (
              <div key={team.ownerId} className={`bg-mk-dark/80 rounded-xl border ${borderColors[i]} p-5 text-center card-glow`}>
                <div className="flex justify-center mb-3">
                  <CharacterBadge character={team.character} size="md" />
                </div>
                <p className="text-xs font-bold text-amber-500/80 mb-1">{labels[i]}</p>
                <p className="font-body font-bold text-white text-sm">{team.character}</p>
                <p className="text-xs text-gray-400">{team.ownerName}</p>
                <p className="font-display text-xl mt-2" style={{ color: theme.primary || '#999' }}>{team.totalCupPoints}</p>
                <p className="text-[10px] text-gray-500 mt-1">
                  Reg: {team.totalRegPoints} + Playoff: {team.totalPlayoffPoints}
                  {team.bonusPoints > 0 && ` + Bonus: ${team.bonusPoints}`}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-Cup Last Place */}
      <div className="mb-8">
        <h3 className="font-display text-xs text-amber-400 mb-4 text-center">LAST PLACE BY CUP</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {worstStats.map((stat, i) => (
            <div key={i} className="bg-mk-dark/80 rounded-xl border border-white/10 p-5">
              <p className="text-xs text-gray-400 mb-2">{stat.label}</p>
              <div className="flex items-center gap-3">
                <CharacterBadge character={stat.character} size="sm" />
                <div>
                  <p className="font-body font-bold text-white text-sm">{stat.character}</p>
                  <p className="text-xs text-gray-400">{stat.ownerName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lowest Weekly Scores — "Banana Peel Moments" */}
      <div className="bg-mk-dark/80 rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BananaPeelIcon size={28} />
          <h3 className="font-display text-xs text-amber-400">BANANA PEEL MOMENTS — LOWEST WEEKLY SCORES</h3>
        </div>
        <div className="space-y-3">
          {bottomFiveWeeks.map((entry, i) => {
            const theme = CHARACTER_THEMES[entry.character] || {};
            return (
              <div key={i} className="flex items-center gap-4 bg-mk-darker/40 rounded-xl p-3">
                <span className="text-lg font-bold text-amber-600/60 w-6 text-center">{i + 1}</span>
                <CharacterBadge character={entry.character} size="xs" />
                <div className="flex-1">
                  <p className="font-body font-bold text-white text-sm">{entry.character}</p>
                  <p className="text-xs text-gray-400">{entry.ownerName}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg" style={{ color: theme.primary || '#E52521' }}>
                    {entry.points.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-gray-500">{entry.cupEmoji} Week {entry.week}</p>
                </div>
              </div>
            );
          })}
          {bottomFiveWeeks.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No matchup data yet — season hasn't started</p>
          )}
        </div>
      </div>
    </div>
  );
}
