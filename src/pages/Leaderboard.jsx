import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import CharacterBadge, { CharacterInline } from '../components/CharacterBadge';
import PlaceBadge, { getOrdinal } from '../components/PlaceBadge';
import { LEAGUES, TIER_CONFIG } from '../data/leagueConfig';
import { CheckeredFlagSVG } from '../components/RacingDecorations';
import RaceTrack from '../components/RaceTrack';
import { api } from '../hooks/useApi';

function CupChip({ cupKey, cupInfo }) {
  const cup = LEAGUES[cupKey];
  if (!cup || !cupInfo) return <span className="text-gray-600 text-xs">—</span>;
  return (
    <div className="flex flex-col items-center gap-0.5 bg-mk-darker rounded-lg px-2 py-1.5 text-xs min-w-[60px]">
      <div className="flex items-center gap-1">
        <span className="text-gray-400">{getOrdinal(cupInfo.regRank)}</span>
        {cupInfo.playoffPlace && <span className="text-gray-500">→ {getOrdinal(cupInfo.playoffPlace)}</span>}
      </div>
      <div className="flex items-center gap-1">
        <span className="font-bold text-white">{cupInfo.cupPoints}</span>
        <span className="text-gray-500 text-[10px] hidden sm:inline">
          ({cupInfo.regPoints}+{cupInfo.playoffPoints})
        </span>
      </div>
    </div>
  );
}

// ─── Mobile-friendly leaderboard card (replaces table on small screens) ───
function LeaderboardCard({ team, place }) {
  const rowBorder = place === 1 ? 'border-mk-gold/50' : place === 2 ? 'border-mk-silver/50' : place === 3 ? 'border-mk-bronze/50' : 'border-white/5';
  const rowBg = place === 1 ? 'bg-gradient-to-r from-mk-gold/10 to-transparent' : place === 2 ? 'bg-gradient-to-r from-mk-silver/10 to-transparent' : place === 3 ? 'bg-gradient-to-r from-mk-bronze/10 to-transparent' : '';
  return (
    <div className={`rounded-xl border ${rowBorder} ${rowBg} p-3 flex items-center gap-3`}>
      <PlaceBadge place={place} size="sm" />
      <CharacterBadge character={team.character} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-white text-sm truncate">{team.character}</p>
        <p className="text-[11px] text-gray-500 truncate">{team.ownerName}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-display text-lg text-white">{team.totalCupPoints}</p>
        <div className="flex gap-1.5 justify-end mt-0.5">
          {['mushroom', 'flower', 'star'].map(k => {
            const c = team.cups[k];
            return c ? <span key={k} className="text-[10px] text-gray-500">{LEAGUES[k].emoji}{c.cupPoints}</span> : null;
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Activity Feed Sidebar ───
function ActivitySidebar() {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getFeed()
      .then(data => setFeed(Array.isArray(data) ? data : []))
      .catch(() => setFeed([]))
      .finally(() => setLoading(false));
  }, []);

  // Show earned, deploy, and hold events — filter out departed characters
  const DEPARTED_CHARACTERS = new Set(['Koopa Troopa', 'King Boo OG']);
  const visibleFeed = feed
    .filter(e => (e.type === 'earned' || e.type === 'deploy' || e.type === 'hold') && !DEPARTED_CHARACTERS.has(e.character))
    .slice(0, 20);

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="bg-mk-dark rounded-2xl border border-white/10 p-3 sm:p-4 h-fit lg:sticky lg:top-20">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <span className="text-sm">📡</span>
        <h3 className="font-display text-[10px] sm:text-xs text-mk-blue tracking-widest">RACE ACTIVITY</h3>
      </div>

      {loading ? (
        <p className="text-gray-500 text-xs text-center py-6">Loading...</p>
      ) : visibleFeed.length === 0 ? (
        <p className="text-gray-600 text-xs text-center py-6">No activity yet — season hasn't started!</p>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
          {visibleFeed.map((entry, i) => (
            <div key={i} className="flex items-start gap-2.5 py-2 border-b border-white/5 last:border-0">
              <div className="flex-shrink-0 mt-0.5">
                <CharacterBadge character={entry.character} size="xs" />
              </div>
              <div className="flex-1 min-w-0">
                {entry.type === 'earned' && (
                  <p className="text-xs text-gray-300">
                    <span className="font-bold text-white">{entry.character}</span>
                    {' '}earned{' '}
                    <span className="text-mk-gold font-semibold">{entry.count} power-up{entry.count > 1 ? 's' : ''}</span>
                    {' '}<span className="text-gray-600">🔒</span>
                  </p>
                )}
                {entry.type === 'deploy' && (() => {
                  const tierCfg = TIER_CONFIG[entry.tier] || TIER_CONFIG[1];
                  return (
                    <p className="text-xs text-gray-300">
                      <span className="font-bold text-white">{entry.character}</span>
                      {' '}deployed{' '}
                      <span className={tierCfg.textClass}>{entry.powerUp}</span>
                      {entry.targetCharacter && (
                        <span> on <span className="text-red-400">{entry.targetCharacter}</span></span>
                      )}
                      {entry.shotResults && (
                        <span className="text-gray-500"> ({entry.shotResults.totalImpact > 0 ? '💥' : '💨'} {entry.shotResults.totalImpact} pts)</span>
                      )}
                    </p>
                  );
                })()}
                {entry.type === 'hold' && (() => {
                  const tierCfg = TIER_CONFIG[entry.tier] || TIER_CONFIG[1];
                  return (
                    <p className="text-xs text-gray-300">
                      <span className="font-bold text-white">{entry.character}</span>
                      {' '}is holding{' '}
                      <span className={tierCfg.textClass}>{entry.powerUp}</span> 🛡️
                    </p>
                  );
                })()}
                <p className="text-[10px] text-gray-600 mt-0.5">
                  Week {entry.week} • {timeAgo(entry.at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Week 1 Kickoff Countdown ───
function KickoffCountdown() {
  // Week 1 TNF: Sept 10, 2026 at 8:15 PM ET
  const KICKOFF = new Date('2026-09-10T20:15:00-04:00').getTime();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = KICKOFF - now;
  if (diff <= 0) return null; // season started, hide countdown

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const units = [
    { label: 'DAYS', value: days },
    { label: 'HRS', value: hours },
    { label: 'MIN', value: minutes },
    { label: 'SEC', value: seconds },
  ];

  return (
    <div className="mb-6 md:mb-8">
      <div className="relative overflow-hidden rounded-2xl border border-mk-gold/30 bg-gradient-to-r from-mk-gold/5 via-mk-darker to-mk-gold/5 p-4 sm:p-6">
        {/* Animated background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-mk-gold/5 to-transparent animate-pulse pointer-events-none" />

        <div className="relative text-center">
          <p className="text-[10px] sm:text-xs text-mk-gold/80 uppercase tracking-[0.25em] font-bold mb-2 sm:mb-3">
            Week 1 Kickoff
          </p>

          <div className="flex justify-center gap-2 sm:gap-4">
            {units.map(u => (
              <div key={u.label} className="flex flex-col items-center">
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl bg-mk-darker/80 border border-mk-gold/20 flex items-center justify-center shadow-lg shadow-mk-gold/5">
                  <span className="font-display text-xl sm:text-3xl text-white tabular-nums">
                    {String(u.value).padStart(2, '0')}
                  </span>
                </div>
                <span className="text-[9px] sm:text-[10px] text-gray-500 mt-1 font-bold tracking-wider">{u.label}</span>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-gray-600 mt-3">
            Sept 10, 2026 - 8:15 PM ET
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Leaderboard({ sleeper }) {
  const { data, loading, lastUpdated, refresh } = sleeper;

  if (loading || !data) return <LoadingSpinner message="Loading leaderboard from Sleeper..." />;

  const { leaderboard, mvpWinners, teamTopSpeed } = data;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main leaderboard column */}
      <div className="flex-1 min-w-0">

      {/* Preseason countdown */}
      <KickoffCountdown />

      {/* Header */}
      <div className="text-center mb-6 md:mb-8">
        <div className="flex justify-center mb-2 md:mb-3">
          <CheckeredFlagSVG width={40} height={40} className="animate-float md:w-[52px] md:h-[52px]" />
        </div>
        <h2 className="font-display text-base sm:text-xl md:text-2xl rainbow-text mb-1 md:mb-2">OVERALL CUP LEADERBOARD</h2>
        <p className="text-gray-400 text-xs sm:text-sm font-body px-4">
          Regular season + playoff points across all three cups
        </p>
        <div className="flex items-center justify-center gap-3 mt-3">
          <button onClick={refresh} className="px-4 py-2 text-xs bg-mk-blue/20 text-mk-blue border border-mk-blue/40 rounded-full hover:bg-mk-blue/30 transition-all font-semibold active:scale-95">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Podium */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-6 mb-6 md:mb-8 max-w-3xl mx-auto">
        {[1, 0, 2].map((displayIdx) => {
          const team = leaderboard[displayIdx];
          if (!team) return null;
          const isPrimary = displayIdx === 0;
          const borderColors = ['border-mk-gold animate-pulse-gold', 'border-mk-silver', 'border-mk-bronze'];
          const bgColors = ['bg-gradient-to-b from-mk-gold/10 to-transparent', 'bg-gradient-to-b from-mk-silver/10 to-transparent', 'bg-gradient-to-b from-mk-bronze/10 to-transparent'];
          return (
            <div key={team.ownerId} className={`relative rounded-xl sm:rounded-2xl border-2 ${borderColors[team.place - 1]} ${bgColors[team.place - 1]} p-2 sm:p-4 md:p-6 text-center ${isPrimary ? 'md:-mt-4' : 'mt-2 sm:mt-4'}`}>
              <PlaceBadge place={team.place} size="lg" />
              <div className="mt-2 sm:mt-3 flex justify-center">
                <CharacterBadge character={team.character} size={isPrimary ? 'lg' : 'md'} />
              </div>
              <h3 className="font-body font-bold text-[11px] sm:text-sm md:text-base mt-2 sm:mt-3 text-white leading-tight">{team.character}</h3>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate">{team.ownerName}</p>
              <div className="mt-2 sm:mt-3">
                <span className="font-display text-base sm:text-lg md:text-2xl text-white">{team.totalCupPoints}</span>
                <div className="text-[9px] sm:text-[10px] text-gray-500 mt-1 space-y-0.5">
                  <div className="hidden sm:block">Reg: {team.totalRegPoints} | Playoff: {team.totalPlayoffPoints}</div>
                  {team.bonusPoints > 0 && <div className="text-mk-gold">+{team.bonusPoints} bonus</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Race Track Animation */}
      <div className="mb-6 md:mb-8 max-w-3xl mx-auto">
        <RaceTrack leaderboard={leaderboard} />
      </div>

      {/* Bonus callouts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 max-w-2xl mx-auto">
        {mvpWinners?.length > 0 && (
          <div className="bg-mk-dark rounded-xl border border-purple-500/30 p-4 flex items-center gap-3">
            <span className="text-2xl">🏅</span>
            <div>
              <p className="text-xs text-purple-400 font-bold uppercase">Regular Season MVP (+50)</p>
              <p className="text-sm text-white font-bold">
                {mvpWinners.map(m => m.character).join(' & ')}
                <span className="text-gray-400 font-normal ml-1">({mvpWinners[0].wins}W aggregate)</span>
              </p>
            </div>
          </div>
        )}
        {teamTopSpeed && (
          <div className="bg-mk-dark rounded-xl border border-mk-gold/30 p-4 flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="text-xs text-mk-gold font-bold uppercase">Team Top Speed (+5)</p>
              <p className="text-sm text-white font-bold">
                {teamTopSpeed.character}
                <span className="text-gray-400 font-normal ml-1">({teamTopSpeed.points?.toFixed(2)} pts, {LEAGUES[teamTopSpeed.cup]?.emoji})</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick-link tiles */}
      <div className="grid grid-cols-2 gap-3 mb-6 max-w-2xl mx-auto">
        <Link
          to="/rankings"
          className="group bg-mk-dark rounded-xl border border-mk-blue/30 hover:border-mk-blue/60 p-4 flex items-center gap-3 transition-all hover:shadow-lg hover:shadow-mk-blue/10"
        >
          <span className="text-2xl group-hover:scale-110 transition-transform">⚡</span>
          <div>
            <p className="text-sm font-bold text-white group-hover:text-mk-blue transition-colors">Power Rankings</p>
            <p className="text-[11px] text-gray-500">Who's really the best?</p>
          </div>
        </Link>
        <Link
          to="/sacko"
          className="group bg-mk-dark rounded-xl border border-mk-red/30 hover:border-mk-red/60 p-4 flex items-center gap-3 transition-all hover:shadow-lg hover:shadow-mk-red/10"
        >
          <span className="text-2xl group-hover:scale-110 transition-transform">🍌</span>
          <div>
            <p className="text-sm font-bold text-white group-hover:text-mk-red transition-colors">Sacko Watch</p>
            <p className="text-[11px] text-gray-500">Who's in danger?</p>
          </div>
        </Link>
      </div>

      {/* Mobile card list (shown below md) */}
      <div className="md:hidden space-y-2">
        {leaderboard.map((team) => (
          <LeaderboardCard key={team.ownerId} team={team} place={team.place} />
        ))}
      </div>

      {/* Desktop table (hidden on mobile) */}
      <div className="hidden md:block bg-mk-dark rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-3 text-xs font-bold text-gray-400 uppercase">#</th>
                <th className="text-left py-3 px-3 text-xs font-bold text-gray-400 uppercase">Team</th>
                <th className="text-center py-3 px-2 text-xs font-bold text-gray-400 uppercase">🍄 Cup</th>
                <th className="text-center py-3 px-2 text-xs font-bold text-gray-400 uppercase">🌼 Cup</th>
                <th className="text-center py-3 px-2 text-xs font-bold text-gray-400 uppercase">⭐ Cup</th>
                <th className="text-center py-3 px-2 text-xs font-bold text-gray-400 uppercase">Bonus</th>
                <th className="text-right py-3 px-3 text-xs font-bold text-gray-400 uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((team, i) => {
                const rowClass = i === 0 ? 'gold-row' : i === 1 ? 'silver-row' : i === 2 ? 'bronze-row' : '';
                return (
                  <tr key={team.ownerId} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${rowClass}`}>
                    <td className="py-3 px-3"><PlaceBadge place={team.place} size="sm" /></td>
                    <td className="py-3 px-3">
                      <CharacterInline character={team.character} ownerName={team.ownerName} />
                    </td>
                    <td className="py-3 px-2"><CupChip cupKey="mushroom" cupInfo={team.cups.mushroom} /></td>
                    <td className="py-3 px-2"><CupChip cupKey="flower" cupInfo={team.cups.flower} /></td>
                    <td className="py-3 px-2"><CupChip cupKey="star" cupInfo={team.cups.star} /></td>
                    <td className="py-3 px-2 text-center">
                      {team.bonusPoints > 0 ? (
                        <span className="text-mk-gold font-bold text-sm">+{team.bonusPoints}</span>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="font-display text-base md:text-lg text-white">{team.totalCupPoints}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-center text-xs text-gray-500 mt-4">
          Live from Sleeper API • {lastUpdated.toLocaleString()}
        </p>
      )}
      </div>

      {/* Activity sidebar */}
      <div className="w-full lg:w-72 xl:w-80 flex-shrink-0">
        <ActivitySidebar />
      </div>
    </div>
  );
}
