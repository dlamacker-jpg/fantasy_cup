import { useState, useEffect, useMemo } from 'react';
import { useSeason } from '../hooks/SeasonContext';
import { useSound } from '../hooks/useSoundEffects';
import { usePlayerDB } from '../hooks/usePlayerDB';
import { LEAGUE_META, OWNERS, getLeaguesForSeason } from '../data/leagueConfig';
import CharacterBadge from '../components/CharacterBadge';
import LoadingSpinner from '../components/LoadingSpinner';

const API = 'https://api.sleeper.app/v1';
const fetchJSON = (url) => fetch(url).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); });

// ─── Position sort order & colors ───
const POS_ORDER = { QB: 0, RB: 1, WR: 2, TE: 3, K: 4, DEF: 5 };
const POS_COLORS = {
  QB:  'bg-red-500/20 text-red-400 border-red-500/30',
  RB:  'bg-green-500/20 text-green-400 border-green-500/30',
  WR:  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  TE:  'bg-purple-500/20 text-purple-400 border-purple-500/30',
  K:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  DEF: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

function PosBadge({ pos }) {
  const cls = POS_COLORS[pos] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cls} shrink-0`}>
      {pos}
    </span>
  );
}

function TrendArrow({ value }) {
  if (Math.abs(value) < 0.5) return null;
  const up = value > 0;
  return (
    <span className={`text-[10px] font-bold flex items-center gap-0.5 ${up ? 'text-green-400' : 'text-red-400'}`}>
      <svg className={`w-3 h-3 ${up ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" />
      </svg>
      {Math.abs(value).toFixed(1)}
    </span>
  );
}

// ─── Custom hook: fetch rosters + compute player season stats ───
function useTeamRosters(season) {
  const { playerDB, loading: dbLoading } = usePlayerDB();
  const [rosterData, setRosterData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const leagues = getLeaguesForSeason(season);
        const cupKeys = Object.keys(leagues);

        // Fetch rosters + matchups for all cups in parallel
        const results = await Promise.all(
          cupKeys.map(async (cupKey) => {
            const league = leagues[cupKey];
            const [rostersRaw, leagueInfo] = await Promise.all([
              fetchJSON(`${API}/league/${league.id}/rosters`),
              fetchJSON(`${API}/league/${league.id}`),
            ]);

            // Determine last scored week
            const lastWeek = leagueInfo.settings?.last_scored_leg || 1;

            // Fetch users for display names
            const users = await fetchJSON(`${API}/league/${league.id}/users`);
            const userMap = {};
            users.forEach(u => { userMap[u.user_id] = u; });

            // Fetch all matchups to get season scoring per player
            const weekNums = [];
            for (let w = 1; w <= lastWeek; w++) weekNums.push(w);
            const matchupResponses = await Promise.all(
              weekNums.map(w => fetchJSON(`${API}/league/${league.id}/matchups/${w}`).catch(() => []))
            );

            // Build per-player season scoring from matchups
            // playerSeasonStats[playerId] = { totalPts, gamesPlayed, weeklyScores }
            const playerSeasonStats = {};
            weekNums.forEach((w, idx) => {
              const matchups = matchupResponses[idx] || [];
              matchups.forEach(m => {
                if (!m.players_points) return;
                Object.entries(m.players_points).forEach(([pid, pts]) => {
                  if (pts == null) return;
                  if (!playerSeasonStats[pid]) {
                    playerSeasonStats[pid] = { totalPts: 0, gamesPlayed: 0, weeklyScores: [] };
                  }
                  playerSeasonStats[pid].totalPts += pts;
                  playerSeasonStats[pid].gamesPlayed++;
                  playerSeasonStats[pid].weeklyScores.push({ week: w, points: pts });
                });
              });
            });

            // Build roster objects
            const rosters = rostersRaw.map(r => {
              const owner = OWNERS[r.owner_id] || {};
              const user = userMap[r.owner_id] || {};
              return {
                rosterId: r.roster_id,
                ownerId: r.owner_id,
                ownerName: owner.name || user.display_name || 'Unknown',
                character: owner.character || '?',
                starters: r.starters || [],
                players: r.players || [],
                reserve: r.reserve || [],
                wins: r.settings?.wins || 0,
                losses: r.settings?.losses || 0,
                fpts: (r.settings?.fpts || 0) + (r.settings?.fpts_decimal || 0) / 100,
              };
            });

            // Sort rosters by wins desc then fpts desc
            rosters.sort((a, b) => b.wins - a.wins || b.fpts - a.fpts);

            return { cupKey, rosters, playerSeasonStats, lastWeek };
          })
        );

        if (!cancelled) {
          const data = {};
          results.forEach(r => { data[r.cupKey] = r; });
          setRosterData(data);
        }
      } catch (err) {
        console.error('Roster fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [season]);

  return { rosterData, playerDB, loading: loading || dbLoading };
}

// ─── Player row ───
function PlayerRow({ pid, playerDB, stats, isStarter, isReserve }) {
  const p = playerDB?.[pid];
  if (!p) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
        <PosBadge pos="?" />
        <span className="text-gray-500 text-sm">Unknown ({pid})</span>
      </div>
    );
  }

  const name = p.pos === 'DEF' ? `${p.fn} ${p.ln}`.trim() : `${p.fn} ${p.ln}`.trim();
  const seasonPts = stats?.totalPts || 0;
  const gp = stats?.gamesPlayed || 0;
  const avg = gp > 0 ? seasonPts / gp : 0;

  // Compute trend (last 3 vs prior 3)
  let trend = 0;
  if (stats?.weeklyScores?.length >= 4) {
    const sorted = [...stats.weeklyScores].sort((a, b) => b.week - a.week);
    const recent = sorted.slice(0, 3);
    const prior = sorted.slice(3, 6);
    const recentAvg = recent.reduce((s, w) => s + w.points, 0) / recent.length;
    const priorAvg = prior.length ? prior.reduce((s, w) => s + w.points, 0) / prior.length : 0;
    trend = recentAvg - priorAvg;
  }

  return (
    <div className={`grid grid-cols-[2.5rem_1fr_3rem_3.5rem_3.5rem_3rem] gap-1.5 px-3 py-2 border-b border-white/5 items-center transition hover:bg-white/[0.03] ${
      isReserve ? 'opacity-40' : ''
    }`}>
      {/* Position */}
      <PosBadge pos={p.pos} />

      {/* Name + team */}
      <div className="min-w-0">
        <p className={`text-sm font-medium truncate ${isStarter ? 'text-white' : 'text-gray-400'}`}>
          {name}
        </p>
        <p className="text-[10px] text-gray-600">{p.team}{isReserve ? ' · IR' : !isStarter ? ' · Bench' : ''}</p>
      </div>

      {/* Season total */}
      <span className="text-xs text-white font-bold text-right">{seasonPts.toFixed(1)}</span>

      {/* Avg */}
      <span className="text-[10px] text-gray-400 text-right">{gp > 0 ? avg.toFixed(1) : '—'}</span>

      {/* GP */}
      <span className="text-[10px] text-gray-500 text-right">{gp}</span>

      {/* Trend */}
      <div className="flex justify-end">
        <TrendArrow value={trend} />
      </div>
    </div>
  );
}

// ─── Single team roster card ───
function RosterCard({ roster, playerDB, playerSeasonStats }) {
  const [expanded, setExpanded] = useState(false);
  const { play } = useSound();

  const starterSet = new Set(roster.starters);
  const reserveSet = new Set(roster.reserve);

  // Sort all players: starters first (by position order), then bench (by position), then reserve
  const sortedPlayers = useMemo(() => {
    const starters = [];
    const bench = [];
    const reserve = [];

    roster.players.forEach(pid => {
      const p = playerDB?.[pid];
      const posOrder = p ? (POS_ORDER[p.pos] ?? 99) : 99;
      if (starterSet.has(pid)) {
        starters.push({ pid, posOrder, section: 'starter' });
      } else if (reserveSet.has(pid)) {
        reserve.push({ pid, posOrder, section: 'reserve' });
      } else {
        bench.push({ pid, posOrder, section: 'bench' });
      }
    });

    starters.sort((a, b) => a.posOrder - b.posOrder);
    bench.sort((a, b) => a.posOrder - b.posOrder);
    reserve.sort((a, b) => a.posOrder - b.posOrder);

    return [...starters, ...bench, ...reserve];
  }, [roster.players, playerDB, starterSet, reserveSet]);

  const displayPlayers = expanded ? sortedPlayers : sortedPlayers.slice(0, 9); // show starters by default
  const hasMore = sortedPlayers.length > 9;

  return (
    <div className="bg-mk-dark rounded-2xl border border-white/10 overflow-hidden">
      {/* Team header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
        <CharacterBadge character={roster.character} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">{roster.character}</p>
          <p className="text-gray-500 text-[10px]">{roster.ownerName}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-white font-bold text-sm">{roster.wins}-{roster.losses}</p>
          <p className="text-gray-500 text-[10px]">{roster.fpts.toFixed(1)} pts</p>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[2.5rem_1fr_3rem_3.5rem_3.5rem_3rem] gap-1.5 px-3 py-1.5 border-b border-white/10 text-[9px] text-gray-600 font-bold uppercase tracking-wider">
        <span>Pos</span>
        <span>Player</span>
        <span className="text-right">Pts</span>
        <span className="text-right">Avg</span>
        <span className="text-right">GP</span>
        <span className="text-right">Trnd</span>
      </div>

      {/* Player rows */}
      {displayPlayers.map(({ pid, section }) => (
        <PlayerRow
          key={pid}
          pid={pid}
          playerDB={playerDB}
          stats={playerSeasonStats[pid]}
          isStarter={section === 'starter'}
          isReserve={section === 'reserve'}
        />
      ))}

      {/* Expand/collapse */}
      {hasMore && (
        <button
          onClick={() => { setExpanded(!expanded); play('click'); }}
          className="w-full py-2 text-[10px] font-bold text-gray-500 hover:text-white transition bg-white/[0.02] hover:bg-white/[0.05]"
        >
          {expanded ? '▲ Show starters only' : `▼ Show full roster (${sortedPlayers.length} players)`}
        </button>
      )}
    </div>
  );
}

// ─── Main Page ───
export default function TeamRosters() {
  const { season } = useSeason();
  const { play } = useSound();
  const { rosterData, playerDB, loading } = useTeamRosters(season);

  const cupKeys = ['mushroom', 'flower', 'star'];
  const [activeCup, setActiveCup] = useState('mushroom');

  if (loading) return <LoadingSpinner />;

  const cupInfo = rosterData?.[activeCup];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-display text-2xl sm:text-3xl text-white mb-1">
          📋 Team Rosters
        </h1>
        <p className="text-gray-400 text-sm">
          Current rosters across all three cups — {season} season
        </p>
      </div>

      {/* Cup tabs */}
      <div className="flex justify-center gap-1 bg-mk-dark rounded-xl border border-white/10 p-1 max-w-md mx-auto">
        {cupKeys.map(key => {
          const meta = LEAGUE_META[key];
          return (
            <button
              key={key}
              onClick={() => { setActiveCup(key); play('tab'); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all flex-1 justify-center ${
                activeCup === key
                  ? 'text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              style={activeCup === key ? { backgroundColor: meta.color + '33', boxShadow: `0 4px 15px ${meta.color}22` } : {}}
            >
              <span>{meta.emoji}</span>
              <span className="hidden sm:inline">{meta.name}</span>
              <span className="sm:hidden">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
            </button>
          );
        })}
      </div>

      {/* Cup type badge */}
      {cupInfo && (
        <div className="text-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-white/5 px-3 py-1 rounded-full">
            {LEAGUE_META[activeCup]?.type} League · Week {cupInfo.lastWeek}
          </span>
        </div>
      )}

      {/* Roster grid */}
      {cupInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cupInfo.rosters.map(roster => (
            <RosterCard
              key={roster.rosterId}
              roster={roster}
              playerDB={playerDB}
              playerSeasonStats={cupInfo.playerSeasonStats}
            />
          ))}
        </div>
      )}

      {!cupInfo && (
        <div className="text-center py-12 text-gray-500">
          <p>No roster data available for this cup.</p>
        </div>
      )}

      {/* Legend */}
      <div className="text-center text-[10px] text-gray-600 space-y-0.5">
        <p>Starters shown by default · Click to expand full roster including bench & IR</p>
        <p>Pts = season total · Avg = per-game average · Trend = last 3 weeks vs prior 3</p>
      </div>
    </div>
  );
}
