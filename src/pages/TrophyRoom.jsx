import { useMemo, useEffect } from 'react';
import { SEASONS, LEAGUE_META, OWNERS } from '../data/leagueConfig';
import { useAllTimeStats } from '../hooks/useAllTimeStats';
import { useSound } from '../hooks/useSoundEffects';
import CharacterBadge from '../components/CharacterBadge';
import LoadingSpinner from '../components/LoadingSpinner';

// ─── Trophy display with gold/silver/bronze shimmer ───
function Trophy({ place, size = 'lg' }) {
  const trophies = { 1: '🏆', 2: '🥈', 3: '🥉' };
  const sizes = { lg: 'text-5xl', md: 'text-3xl', sm: 'text-xl' };
  return <span className={`${sizes[size]} block`}>{trophies[place] || `#${place}`}</span>;
}

function SeasonBanner({ season, children }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-mk-gold/10 via-transparent to-mk-gold/10 rounded-2xl" />
      <div className="relative bg-mk-dark/90 backdrop-blur rounded-2xl border border-mk-gold/20 overflow-hidden">
        <div className="bg-gradient-to-r from-mk-gold/20 to-yellow-600/20 px-5 py-3 border-b border-mk-gold/20">
          <h3 className="font-display text-lg text-mk-gold tracking-wide">{season} SEASON</h3>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ChampionCard({ title, icon, character, ownerName, stat, detail, accent = 'from-mk-gold/20 to-yellow-900/20' }) {
  return (
    <div className={`bg-gradient-to-br ${accent} rounded-xl border border-white/10 p-4 text-center`}>
      <span className="text-3xl block mb-2">{icon}</span>
      <p className="font-display text-[10px] text-gray-400 uppercase tracking-wider mb-2">{title}</p>
      <CharacterBadge character={character || '?'} size="md" className="mx-auto" />
      <p className="text-white font-bold text-sm mt-2">{character}</p>
      <p className="text-gray-500 text-[10px]">{ownerName}</p>
      {stat && <p className="text-mk-gold font-bold text-lg mt-1">{stat}</p>}
      {detail && <p className="text-gray-500 text-[10px]">{detail}</p>}
    </div>
  );
}

function AwardShelf({ awards }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {awards.map((a, i) => (
        <ChampionCard key={i} {...a} />
      ))}
    </div>
  );
}

export default function TrophyRoom() {
  const allTime = useAllTimeStats();
  const { play } = useSound();

  // Play trophy fanfare when data loads
  useEffect(() => {
    if (allTime.data && !allTime.loading) {
      const timer = setTimeout(() => play('trophy'), 300);
      return () => clearTimeout(timer);
    }
  }, [allTime.data, allTime.loading]);

  // Compute season-specific champions from the all-time data
  const seasonAwards = useMemo(() => {
    if (!allTime.data) return [];

    const { records, careerLeaders } = allTime.data;
    const seasons = Object.keys(SEASONS).sort((a, b) => b - a);

    // For now, build awards from the aggregate records
    // Each season gets: highest scorer, biggest blowout winner, etc.
    return seasons;
  }, [allTime.data]);

  if (allTime.loading) return <LoadingSpinner message="Polishing the trophies..." />;
  if (allTime.error) return (
    <div className="text-center py-20 text-red-400">
      Error loading trophy room: {allTime.error}
      <button onClick={allTime.refresh} className="ml-3 underline hover:text-white">Retry</button>
    </div>
  );

  const { records, careerLeaders } = allTime.data;

  // Build all-time award cards
  const allTimeAwards = [];

  // Most Career Wins
  if (careerLeaders[0]) {
    allTimeAwards.push({
      title: 'Winningest Owner', icon: '🏆',
      character: careerLeaders[0].character, ownerName: careerLeaders[0].ownerName,
      stat: `${careerLeaders[0].totalWins} Wins`,
      detail: `${(careerLeaders[0].winPct * 100).toFixed(1)}% win rate`,
      accent: 'from-mk-gold/20 to-yellow-900/20',
    });
  }

  // Best Win %
  const bestWinPct = [...careerLeaders].sort((a, b) => b.winPct - a.winPct)[0];
  if (bestWinPct) {
    allTimeAwards.push({
      title: 'Best Win Rate', icon: '🎯',
      character: bestWinPct.character, ownerName: bestWinPct.ownerName,
      stat: `${(bestWinPct.winPct * 100).toFixed(1)}%`,
      detail: `${bestWinPct.totalWins}-${bestWinPct.totalLosses} record`,
      accent: 'from-blue-500/20 to-blue-900/20',
    });
  }

  // Most Points
  const mostPts = [...careerLeaders].sort((a, b) => b.totalFpts - a.totalFpts)[0];
  if (mostPts) {
    allTimeAwards.push({
      title: 'Points Machine', icon: '💰',
      character: mostPts.character, ownerName: mostPts.ownerName,
      stat: `${mostPts.totalFpts.toFixed(0)} pts`,
      detail: `${mostPts.avgFpts.toFixed(1)} avg per game`,
      accent: 'from-green-500/20 to-green-900/20',
    });
  }

  // Highest Single Week
  if (records.highestScore) {
    allTimeAwards.push({
      title: 'Single Week Record', icon: '🚀',
      character: records.highestScore.character, ownerName: records.highestScore.ownerName,
      stat: `${records.highestScore.points.toFixed(2)}`,
      detail: `${records.highestScore.season} Week ${records.highestScore.week}`,
      accent: 'from-red-500/20 to-red-900/20',
    });
  }

  // Biggest Blowout Delivered
  if (records.biggestBlowout) {
    allTimeAwards.push({
      title: 'Biggest Blowout', icon: '💥',
      character: records.biggestBlowout.winner, ownerName: '',
      stat: `${records.biggestBlowout.margin.toFixed(2)} margin`,
      detail: `${records.biggestBlowout.winScore.toFixed(0)}-${records.biggestBlowout.loseScore.toFixed(0)} vs ${records.biggestBlowout.loser}`,
      accent: 'from-orange-500/20 to-orange-900/20',
    });
  }

  // Closest Win
  if (records.closestGame) {
    allTimeAwards.push({
      title: 'Closest Win Ever', icon: '🎯',
      character: records.closestGame.winner, ownerName: '',
      stat: `${records.closestGame.margin.toFixed(2)} margin`,
      detail: `${records.closestGame.winScore.toFixed(2)}-${records.closestGame.loseScore.toFixed(2)} vs ${records.closestGame.loser}`,
      accent: 'from-purple-500/20 to-purple-900/20',
    });
  }

  // Worst Single Week (Sacko of all time)
  if (records.lowestScore) {
    allTimeAwards.push({
      title: 'Worst Performance Ever', icon: '🍌',
      character: records.lowestScore.character, ownerName: records.lowestScore.ownerName,
      stat: `${records.lowestScore.points.toFixed(2)}`,
      detail: `${records.lowestScore.season} Week ${records.lowestScore.week}`,
      accent: 'from-gray-500/20 to-gray-900/20',
    });
  }

  // Most Career Losses
  const mostLosses = [...careerLeaders].sort((a, b) => b.totalLosses - a.totalLosses)[0];
  if (mostLosses) {
    allTimeAwards.push({
      title: 'Most Losses', icon: '😅',
      character: mostLosses.character, ownerName: mostLosses.ownerName,
      stat: `${mostLosses.totalLosses} L`,
      detail: `${mostLosses.totalWins}-${mostLosses.totalLosses} career`,
      accent: 'from-red-900/20 to-gray-900/20',
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-3">🏆</div>
        <h2 className="font-display text-xl md:text-2xl text-mk-gold mb-1">TROPHY ROOM</h2>
        <p className="text-gray-400 text-sm font-body">The legends, the records, and the eternal glory</p>
      </div>

      {/* Grand Trophy — All-Time Leader */}
      {careerLeaders[0] && (
        <div className="mb-8 bg-gradient-to-b from-mk-gold/10 via-mk-dark/80 to-mk-dark/80 rounded-3xl border border-mk-gold/30 p-6 sm:p-8 text-center">
          <Trophy place={1} size="lg" />
          <p className="font-display text-sm text-mk-gold uppercase tracking-widest mt-2 mb-4">All-Time Champion</p>
          <CharacterBadge character={careerLeaders[0].character} size="md" className="mx-auto" />
          <h3 className="font-display text-2xl text-white mt-3">{careerLeaders[0].character}</h3>
          <p className="text-gray-400 text-sm">{careerLeaders[0].ownerName}</p>
          <div className="flex justify-center gap-6 mt-4">
            <div>
              <p className="text-mk-gold font-bold text-2xl">{careerLeaders[0].totalWins}</p>
              <p className="text-gray-500 text-[10px] uppercase">Wins</p>
            </div>
            <div>
              <p className="text-white font-bold text-2xl">{(careerLeaders[0].winPct * 100).toFixed(1)}%</p>
              <p className="text-gray-500 text-[10px] uppercase">Win Rate</p>
            </div>
            <div>
              <p className="text-white font-bold text-2xl">{careerLeaders[0].totalFpts.toFixed(0)}</p>
              <p className="text-gray-500 text-[10px] uppercase">Career PF</p>
            </div>
          </div>
        </div>
      )}

      {/* Podium — Top 3 */}
      {careerLeaders.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[1, 0, 2].map(idx => {
            const l = careerLeaders[idx];
            const place = idx + 1;
            const heights = { 1: 'pt-0', 2: 'pt-6', 3: 'pt-10' };
            const borders = { 1: 'border-mk-gold/40', 2: 'border-mk-silver/40', 3: 'border-mk-bronze/40' };
            return (
              <div key={l.ownerId} className={`${heights[place]} text-center`}>
                <div className={`bg-mk-dark/80 rounded-2xl border ${borders[place]} p-3 sm:p-4 h-full`}>
                  <Trophy place={place} size="md" />
                  <CharacterBadge character={l.character} size="sm" className="mx-auto mt-1" />
                  <p className="text-white font-bold text-xs sm:text-sm mt-2 truncate">{l.character}</p>
                  <p className="text-gray-500 text-[9px] sm:text-[10px] truncate">{l.ownerName}</p>
                  <p className="text-mk-gold font-bold text-sm mt-1">{l.totalWins}W</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* All-Time Awards */}
      <div className="mb-8">
        <h3 className="font-display text-sm text-gray-400 uppercase tracking-wide mb-4 text-center">All-Time Records & Awards</h3>
        <AwardShelf awards={allTimeAwards} />
      </div>

      {/* Season Banners */}
      <div className="space-y-6">
        {Object.keys(SEASONS).sort((a, b) => b - a).map(season => (
          <SeasonBanner key={season} season={season}>
            <p className="text-gray-400 text-sm">
              {SEASONS[season].current ? 'Season in progress' : 'Season complete'} — {Object.keys(LEAGUE_META).map(k => `${LEAGUE_META[k].emoji} ${LEAGUE_META[k].name}`).join(', ')}
            </p>
          </SeasonBanner>
        ))}
      </div>
    </div>
  );
}
