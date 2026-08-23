import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../hooks/useApi';
import { usePlayerDB } from '../hooks/usePlayerDB';
import { OWNERS, LEAGUES, LEAGUE_META, POWER_UPS, TIER_CONFIG, CHARACTER_THEMES, REG_SEASON_POINTS } from '../data/leagueConfig';

// ─── Active owners (exclude departed) ───
const ACTIVE_OWNER_IDS = Object.keys(OWNERS).filter(id =>
  !['704557122054057984', '968217113603219456'].includes(id)
);

// ─── Compute standings as-of a specific week from raw matchup data ───
function computeStandingsAsOfWeek(allMatchups, rosterToOwner, throughWeek) {
  const records = {}; // rosterId → { wins, losses, fpts }
  for (let w = 1; w <= throughWeek; w++) {
    const weekData = allMatchups[w];
    if (!weekData?.length) continue;
    const groups = {};
    weekData.forEach(m => {
      if (m.matchup_id == null) return;
      if (!groups[m.matchup_id]) groups[m.matchup_id] = [];
      groups[m.matchup_id].push(m);
    });
    Object.values(groups).forEach(pair => {
      if (pair.length !== 2) return;
      const [a, b] = pair;
      const aPts = a.points || 0, bPts = b.points || 0;
      [a, b].forEach(t => {
        if (!records[t.roster_id]) records[t.roster_id] = { wins: 0, losses: 0, fpts: 0 };
        records[t.roster_id].fpts += t.points || 0;
      });
      if (aPts > bPts) { records[a.roster_id].wins++; records[b.roster_id].losses++; }
      else if (bPts > aPts) { records[b.roster_id].wins++; records[a.roster_id].losses++; }
      else { records[a.roster_id].wins += 0.5; records[b.roster_id].wins += 0.5; }
    });
  }
  return Object.entries(records)
    .map(([rosterId, rec]) => {
      const owner = rosterToOwner[rosterId] || {};
      return { rosterId: Number(rosterId), ...rec, ...owner };
    })
    .sort((a, b) => b.wins - a.wins || b.fpts - a.fpts)
    .map((team, idx) => ({
      ...team,
      regRank: idx + 1,
      regPoints: REG_SEASON_POINTS[idx + 1] || 0,
    }));
}

// ─── Helpers ───
function ownerName(id) { return OWNERS[id]?.character || 'Unknown'; }
function leagueName(key) { return LEAGUE_META[key]?.name || key; }
function leagueEmoji(key) { return LEAGUE_META[key]?.emoji || ''; }

function formatPts(n) {
  if (n == null) return '—';
  const v = typeof n === 'number' ? n : parseFloat(n);
  if (isNaN(v)) return '—';
  return v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1);
}

// ─── Dynamic script loader ───
const scriptCache = {};
function loadScript(url, globalName) {
  if (scriptCache[globalName]) return scriptCache[globalName];
  if (window[globalName]) return Promise.resolve(window[globalName]);
  scriptCache[globalName] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.onload = () => resolve(window[globalName]);
    s.onerror = () => reject(new Error(`Failed to load ${globalName}`));
    document.head.appendChild(s);
  });
  return scriptCache[globalName];
}

// ─── Section wrapper ───
function Section({ title, emoji, children }) {
  return (
    <section className="mb-8 print:mb-4 print:break-inside-avoid">
      <h2 className="font-display text-lg text-white mb-3 flex items-center gap-2 print:text-black print:text-base">
        <span>{emoji}</span> {title}
      </h2>
      {children}
    </section>
  );
}

// ─── Score Adjustments Table (the key deliverable) ───
function ScoreAdjustments({ pointAdjustments }) {
  if (!pointAdjustments || Object.keys(pointAdjustments).length === 0) {
    return (
      <div className="p-4 bg-gray-800/50 border border-white/10 rounded-xl text-gray-400 text-sm print:bg-white print:border-gray-300 print:text-gray-600">
        No score adjustments this week.
      </div>
    );
  }

  const leagueKeys = Object.keys(LEAGUE_META);
  const rows = Object.entries(pointAdjustments)
    .map(([ownerId, leagues]) => ({
      ownerId,
      character: ownerName(ownerId),
      theme: CHARACTER_THEMES[ownerName(ownerId)],
      adjustments: leagues,
    }))
    .sort((a, b) => a.character.localeCompare(b.character));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse print:text-xs">
        <thead>
          <tr className="border-b border-white/20 print:border-gray-400">
            <th className="text-left py-2 px-3 font-display text-xs text-gray-400 tracking-wider print:text-gray-700">RACER</th>
            {leagueKeys.map(lk => (
              <th key={lk} className="text-center py-2 px-3 font-display text-xs text-gray-400 tracking-wider print:text-gray-700">
                {leagueEmoji(lk)} {leagueName(lk).replace(' Cup', '')}
              </th>
            ))}
            <th className="text-center py-2 px-3 font-display text-xs text-gray-400 tracking-wider print:text-gray-700">NET</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ ownerId, character, theme, adjustments }) => {
            const net = Object.values(adjustments).reduce((s, v) => s + v, 0);
            return (
              <tr key={ownerId} className="border-b border-white/5 hover:bg-white/5 print:border-gray-200 print:hover:bg-transparent">
                <td className="py-2 px-3 font-semibold text-white print:text-black">
                  <span className="inline-block w-2 h-2 rounded-full mr-2 print:hidden" style={{ backgroundColor: theme?.primary || '#666' }} />
                  {character}
                </td>
                {leagueKeys.map(lk => {
                  const val = adjustments[lk];
                  return (
                    <td key={lk} className={`text-center py-2 px-3 font-mono font-bold ${
                      val > 0 ? 'text-green-400 print:text-green-700' : val < 0 ? 'text-red-400 print:text-red-700' : 'text-gray-500'
                    }`}>
                      {val != null ? formatPts(val) : '—'}
                    </td>
                  );
                })}
                <td className={`text-center py-2 px-3 font-mono font-bold ${
                  net > 0 ? 'text-green-400 print:text-green-700' : net < 0 ? 'text-red-400 print:text-red-700' : 'text-gray-500'
                }`}>
                  {formatPts(net)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Matchup Results for a league ───
function LeagueMatchups({ leagueKey, matchups, rosterToOwner }) {
  if (!matchups?.length) return null;

  // Group by matchup_id
  const pairs = {};
  matchups.forEach(m => {
    if (m.matchup_id == null) return;
    if (!pairs[m.matchup_id]) pairs[m.matchup_id] = [];
    pairs[m.matchup_id].push(m);
  });

  return (
    <div className="mb-4 print:mb-2">
      <h3 className="font-display text-sm text-gray-300 mb-2 flex items-center gap-1.5 print:text-gray-700">
        {leagueEmoji(leagueKey)} {leagueName(leagueKey)}
      </h3>
      <div className="grid gap-2">
        {Object.values(pairs).map((pair, idx) => {
          if (pair.length < 2) return null;
          const [a, b] = pair.sort((x, y) => (y.points || 0) - (x.points || 0));
          const ownerA = rosterToOwner?.[a.roster_id];
          const ownerB = rosterToOwner?.[b.roster_id];
          const charA = ownerA?.character || `Roster ${a.roster_id}`;
          const charB = ownerB?.character || `Roster ${b.roster_id}`;
          const themeA = CHARACTER_THEMES[charA];
          const themeB = CHARACTER_THEMES[charB];
          return (
            <div key={idx} className="flex items-center justify-between bg-gray-800/40 border border-white/5 rounded-lg px-3 py-2 text-sm print:bg-white print:border-gray-200">
              <div className="flex items-center gap-2 flex-1">
                <span className="inline-block w-2 h-2 rounded-full print:hidden" style={{ backgroundColor: themeA?.primary || '#666' }} />
                <span className="font-semibold text-white print:text-black">{charA}</span>
                <span className="font-mono text-green-400 print:text-green-700">{a.points?.toFixed(2) ?? '—'}</span>
              </div>
              <span className="text-gray-500 mx-2 text-xs">vs</span>
              <div className="flex items-center gap-2 flex-1 justify-end">
                <span className="font-mono text-red-400 print:text-red-700">{b.points?.toFixed(2) ?? '—'}</span>
                <span className="font-semibold text-gray-400 print:text-gray-600">{charB}</span>
                <span className="inline-block w-2 h-2 rounded-full print:hidden" style={{ backgroundColor: themeB?.primary || '#666' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Resolution Order ───
function ResolutionOrder({ order }) {
  if (!order?.length) {
    return <p className="text-gray-500 text-sm">No deployments resolved this week.</p>;
  }

  return (
    <div className="space-y-2">
      {order.map((entry, idx) => {
        const puDef = POWER_UPS.find(p => p.name === entry.powerUp);
        const tierCfg = TIER_CONFIG[entry.tier];
        const effectSummary = entry.effects?.map(e => {
          if (e.type === 'held') return 'Held for defense';
          if (e.type === 'star-active') return e.message;
          if (e.type === 'boost') return e.message;
          if (e.type === 'lightning') {
            const hitCount = e.hits?.filter(h => !h.immune).length || 0;
            const immuneCount = e.hits?.filter(h => h.immune).length || 0;
            return `Hit ${hitCount} racers${immuneCount ? `, ${immuneCount} immune` : ''}`;
          }
          if (e.type === 'shots') {
            const hits = e.shotResults?.filter(s => s.hit && !s.blocked && !s.immune).length || 0;
            const misses = e.shotResults?.filter(s => !s.hit).length || 0;
            const blocked = e.shotResults?.filter(s => s.blocked).length || 0;
            const parts = [];
            if (hits) parts.push(`${hits} hit`);
            if (misses) parts.push(`${misses} miss`);
            if (blocked) parts.push(`${blocked} blocked`);
            return parts.join(', ') || 'No shots';
          }
          if (e.type === 'special') return e.message;
          return '';
        }).filter(Boolean).join('; ');

        return (
          <div key={idx} className="flex items-start gap-3 bg-gray-800/40 border border-white/5 rounded-lg px-3 py-2 print:bg-white print:border-gray-200">
            <span className="font-mono text-xs text-gray-500 mt-0.5 w-5 shrink-0">#{entry.order}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-white text-sm print:text-black">{entry.character}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${tierCfg?.borderClass || ''}`}>
                  {puDef?.icon || ''} {entry.powerUp}
                </span>
                {entry.action === 'hold' && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-300">HELD</span>
                )}
              </div>
              {effectSummary && (
                <p className="text-xs text-gray-400 mt-1 print:text-gray-600">{effectSummary}</p>
              )}
              {entry.shotResults && (
                <div className="mt-1 space-y-0.5">
                  {entry.shotResults.map((shot, si) => (
                    <div key={si} className="text-xs text-gray-500 print:text-gray-500">
                      Shot {shot.shot} → {leagueEmoji(shot.league)} {shot.targetCharacter || '?'}:
                      {shot.immune ? ' immune (Star)' : shot.blocked ? ` blocked by ${shot.blockedBy}` : shot.hit ? ` HIT ${shot.impact} pts` : ' MISS'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Power-Up Activity Feed ───
function PowerUpActivity({ feed, eligibility }) {
  const rolls = feed?.filter(e => e.type === 'auto_roll' || e.type === 'roll') || [];
  const deploys = feed?.filter(e => e.type === 'deploy' || e.type === 'used') || [];

  return (
    <div className="space-y-4">
      {/* Eligibility */}
      {eligibility && Object.keys(eligibility).length > 0 && (
        <div>
          <h3 className="font-display text-xs text-gray-400 tracking-wider mb-2 print:text-gray-600">ELIGIBILITY</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(eligibility).map(([criteria, winners]) => (
              <div key={criteria} className="bg-gray-800/30 border border-white/5 rounded-lg px-3 py-2 text-sm print:bg-white print:border-gray-200">
                <span className="text-gray-400 text-xs print:text-gray-600">{criteria}</span>
                <div className="text-white mt-0.5 print:text-black">
                  {Array.isArray(winners) ? winners.map(w => ownerName(w.ownerId || w)).join(', ') : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rolls */}
      {rolls.length > 0 && (
        <div>
          <h3 className="font-display text-xs text-gray-400 tracking-wider mb-2 print:text-gray-600">ROLLS ({rolls.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {rolls.map((r, i) => {
              const puDef = POWER_UPS.find(p => p.name === r.powerUp);
              const tierCfg = TIER_CONFIG[puDef?.tier];
              return (
                <div key={i} className="flex items-center gap-2 bg-gray-800/30 border border-white/5 rounded px-2.5 py-1.5 text-sm print:bg-white print:border-gray-200">
                  <span className="font-semibold text-white text-xs print:text-black">{ownerName(r.ownerId)}</span>
                  <span className="text-gray-500">→</span>
                  <span className={`text-xs ${tierCfg?.textClass || 'text-gray-400'}`}>{puDef?.icon} {r.powerUp}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Deployments */}
      {deploys.length > 0 && (
        <div>
          <h3 className="font-display text-xs text-gray-400 tracking-wider mb-2 print:text-gray-600">DEPLOYMENTS ({deploys.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {deploys.map((d, i) => {
              const puDef = POWER_UPS.find(p => p.name === d.powerUp);
              return (
                <div key={i} className="flex items-center gap-2 bg-gray-800/30 border border-white/5 rounded px-2.5 py-1.5 text-sm print:bg-white print:border-gray-200">
                  <span className="font-semibold text-white text-xs print:text-black">{ownerName(d.ownerId)}</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-xs text-gray-300">{puDef?.icon} {d.powerUp}</span>
                  {d.action === 'hold' && <span className="text-[10px] text-blue-400">(held)</span>}
                  {d.targetLeague && <span className="text-[10px] text-gray-500">{leagueEmoji(d.targetLeague)}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rolls.length === 0 && deploys.length === 0 && (
        <p className="text-gray-500 text-sm">No power-up activity this week.</p>
      )}
    </div>
  );
}

// ─── Cup Standings ───
function CupStandings({ cupKey, standings }) {
  if (!standings?.length) return null;
  return (
    <div className="mb-4 print:mb-2">
      <h3 className="font-display text-sm text-gray-300 mb-2 flex items-center gap-1.5 print:text-gray-700">
        {leagueEmoji(cupKey)} {leagueName(cupKey)}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse print:text-xs">
          <thead>
            <tr className="border-b border-white/20 print:border-gray-400">
              <th className="text-center py-1.5 px-2 font-display text-xs text-gray-500 tracking-wider w-8 print:text-gray-600">#</th>
              <th className="text-left py-1.5 px-2 font-display text-xs text-gray-500 tracking-wider print:text-gray-600">RACER</th>
              <th className="text-center py-1.5 px-2 font-display text-xs text-gray-500 tracking-wider print:text-gray-600">W-L</th>
              <th className="text-right py-1.5 px-2 font-display text-xs text-gray-500 tracking-wider print:text-gray-600">PF</th>
              <th className="text-center py-1.5 px-2 font-display text-xs text-gray-500 tracking-wider print:text-gray-600">CUP PTS</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team, idx) => {
              const theme = CHARACTER_THEMES[team.character];
              return (
                <tr key={team.ownerId || idx} className="border-b border-white/5 print:border-gray-200">
                  <td className="text-center py-1.5 px-2 font-mono text-xs text-gray-500">{team.regRank}</td>
                  <td className="py-1.5 px-2 text-white text-xs font-semibold print:text-black">
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5 print:hidden" style={{ backgroundColor: theme?.primary || '#666' }} />
                    {team.character}
                  </td>
                  <td className="text-center py-1.5 px-2 font-mono text-xs text-gray-300 print:text-gray-700">{team.wins}-{team.losses}</td>
                  <td className="text-right py-1.5 px-2 font-mono text-xs text-gray-400 print:text-gray-600">{team.fpts?.toFixed(1)}</td>
                  <td className="text-center py-1.5 px-2 font-mono text-xs font-bold text-white print:text-black">{team.cupPoints}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Overall Leaderboard ───
function OverallLeaderboard({ leaderboard }) {
  if (!leaderboard?.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse print:text-xs">
        <thead>
          <tr className="border-b border-white/20 print:border-gray-400">
            <th className="text-center py-1.5 px-2 font-display text-xs text-gray-500 tracking-wider w-8 print:text-gray-600">#</th>
            <th className="text-left py-1.5 px-2 font-display text-xs text-gray-500 tracking-wider print:text-gray-600">RACER</th>
            <th className="text-center py-1.5 px-2 font-display text-xs text-gray-500 tracking-wider print:text-gray-600">{leagueEmoji('mushroom')} PTS</th>
            <th className="text-center py-1.5 px-2 font-display text-xs text-gray-500 tracking-wider print:text-gray-600">{leagueEmoji('flower')} PTS</th>
            <th className="text-center py-1.5 px-2 font-display text-xs text-gray-500 tracking-wider print:text-gray-600">{leagueEmoji('star')} PTS</th>
            <th className="text-center py-1.5 px-2 font-display text-xs text-gray-500 tracking-wider print:text-gray-600">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((team) => {
            const theme = CHARACTER_THEMES[team.character];
            return (
              <tr key={team.ownerId} className="border-b border-white/5 print:border-gray-200">
                <td className="text-center py-1.5 px-2 font-mono text-xs text-gray-500">{team.place}</td>
                <td className="py-1.5 px-2 text-white text-xs font-semibold print:text-black">
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5 print:hidden" style={{ backgroundColor: theme?.primary || '#666' }} />
                  {team.character}
                </td>
                <td className="text-center py-1.5 px-2 font-mono text-xs text-gray-300 print:text-gray-700">{team.cups?.mushroom?.regPoints ?? '—'}</td>
                <td className="text-center py-1.5 px-2 font-mono text-xs text-gray-300 print:text-gray-700">{team.cups?.flower?.regPoints ?? '—'}</td>
                <td className="text-center py-1.5 px-2 font-mono text-xs text-gray-300 print:text-gray-700">{team.cups?.star?.regPoints ?? '—'}</td>
                <td className="text-center py-1.5 px-2 font-mono text-xs font-bold text-white print:text-black">{team.totalCupPoints}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Super Horn Calculator ───
// "All your players guaranteed to hit their projections"
// For each starter: if actual < projected, adjustment = projected - actual
function SuperHornCalculator({ superHornEntries, matchupsByLeague, playerDB }) {
  // State: { `${ownerId}-${league}`: { playerId: projectedPts } }
  const [projections, setProjections] = useState({});

  if (!superHornEntries?.length) return null;

  const updateProjection = (key, playerId, value) => {
    setProjections(prev => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [playerId]: value },
    }));
  };

  return (
    <div className="space-y-6">
      {superHornEntries.map((entry, idx) => {
        const league = entry.targetLeague;
        const leagueData = matchupsByLeague[league];
        if (!leagueData) {
          return (
            <div key={idx} className="p-3 bg-gray-800/40 border border-white/10 rounded-lg text-sm text-gray-400">
              {entry.character} deployed Super Horn in {leagueEmoji(league)} {leagueName(league)} but no matchup data is available.
            </div>
          );
        }

        // Find this owner's matchup in the target league
        const rosterToOwner = leagueData.rosterToOwner || {};
        const ownerRosterId = Object.entries(rosterToOwner).find(
          ([, info]) => info.ownerId === entry.ownerId
        )?.[0];
        const matchup = leagueData.matchups?.find(m => String(m.roster_id) === String(ownerRosterId));

        if (!matchup || !matchup.starters || !matchup.players_points) {
          return (
            <div key={idx} className="p-3 bg-gray-800/40 border border-white/10 rounded-lg text-sm text-gray-400">
              {entry.character} deployed Super Horn in {leagueEmoji(league)} {leagueName(league)} but starter/score data is unavailable for this week.
            </div>
          );
        }

        const calcKey = `${entry.ownerId}-${league}`;
        const projMap = projections[calcKey] || {};

        // Build starter rows
        const starters = matchup.starters
          .filter(pid => pid && pid !== '0') // filter empty slots
          .map(pid => {
            const actual = matchup.players_points[pid] ?? 0;
            const p = playerDB?.[pid];
            const name = p ? `${p.fn} ${p.ln}` : `Player ${pid}`;
            const pos = p?.pos || '?';
            const team = p?.team || '';
            const projected = projMap[pid] != null ? parseFloat(projMap[pid]) : null;
            const adjustment = (projected != null && !isNaN(projected) && projected > actual)
              ? projected - actual
              : 0;
            return { pid, name, pos, team, actual, projected, adjustment };
          });

        const totalAdjustment = starters.reduce((sum, s) => sum + s.adjustment, 0);
        const allFilled = starters.every(s => s.projected != null && !isNaN(s.projected));

        return (
          <div key={idx} className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 print:bg-purple-50 print:border-purple-300">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">📯</span>
              <h3 className="font-display text-sm text-purple-300 print:text-purple-700">
                SUPER HORN — {entry.character}
              </h3>
              <span className="text-xs text-gray-500 print:text-gray-600">
                {leagueEmoji(league)} {leagueName(league)}
              </span>
            </div>

            <p className="text-xs text-gray-400 mb-3 print:text-gray-600">
              Enter each starter's projected points. Players who scored below projection get boosted to projection.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-purple-500/20 print:border-purple-300">
                    <th className="text-left py-1.5 px-2 font-display text-xs text-gray-400 tracking-wider print:text-gray-600">PLAYER</th>
                    <th className="text-center py-1.5 px-2 font-display text-xs text-gray-400 tracking-wider print:text-gray-600">POS</th>
                    <th className="text-center py-1.5 px-2 font-display text-xs text-gray-400 tracking-wider print:text-gray-600">ACTUAL</th>
                    <th className="text-center py-1.5 px-2 font-display text-xs text-gray-400 tracking-wider no-print print:text-gray-600">PROJECTED</th>
                    <th className="text-center py-1.5 px-2 font-display text-xs text-gray-400 tracking-wider print:text-gray-600">ADJ</th>
                  </tr>
                </thead>
                <tbody>
                  {starters.map(({ pid, name, pos, team, actual, projected, adjustment }) => (
                    <tr key={pid} className="border-b border-white/5 print:border-gray-200">
                      <td className="py-1.5 px-2 text-white text-xs print:text-black">
                        {name}
                        {team && <span className="text-gray-500 ml-1 text-[10px]">{team}</span>}
                      </td>
                      <td className="text-center py-1.5 px-2 text-gray-400 text-xs">{pos}</td>
                      <td className="text-center py-1.5 px-2 font-mono text-white text-xs print:text-black">{actual.toFixed(1)}</td>
                      <td className="text-center py-1.5 px-2 no-print">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="—"
                          value={projMap[pid] ?? ''}
                          onChange={e => updateProjection(calcKey, pid, e.target.value)}
                          className="w-16 bg-gray-800 border border-white/10 rounded px-1.5 py-0.5 text-xs text-center text-white focus:outline-none focus:border-purple-500"
                        />
                      </td>
                      <td className={`text-center py-1.5 px-2 font-mono text-xs font-bold ${
                        adjustment > 0 ? 'text-green-400 print:text-green-700' : 'text-gray-600'
                      }`}>
                        {projected != null && !isNaN(projected) ? (adjustment > 0 ? `+${adjustment.toFixed(1)}` : '0.0') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-purple-500/30 print:border-purple-400">
                    <td colSpan={3} className="py-2 px-2 font-display text-xs text-gray-400 text-right print:text-gray-700">
                      TOTAL SUPER HORN ADJUSTMENT
                    </td>
                    <td className="py-2 px-2 no-print" />
                    <td className={`text-center py-2 px-2 font-mono font-bold ${
                      totalAdjustment > 0 ? 'text-green-400 text-base print:text-green-700' : 'text-gray-500'
                    }`}>
                      {allFilled ? `+${totalAdjustment.toFixed(1)}` : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {allFilled && totalAdjustment > 0 && (
              <div className="mt-3 p-2.5 bg-green-900/30 border border-green-500/30 rounded-lg print:bg-green-50 print:border-green-400">
                <p className="text-sm text-green-300 font-semibold print:text-green-700">
                  Add <span className="font-mono">+{totalAdjustment.toFixed(1)}</span> pts to {entry.character} in {leagueEmoji(league)} {leagueName(league)} on Sleeper
                </p>
              </div>
            )}

            {allFilled && totalAdjustment === 0 && (
              <div className="mt-3 p-2.5 bg-gray-800/40 border border-white/5 rounded-lg">
                <p className="text-sm text-gray-400">All starters met or exceeded projections. No adjustment needed.</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════════════
export default function PostWeekSummary({ sleeper }) {
  const [week, setWeek] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resolution, setResolution] = useState(null);
  const [feed, setFeed] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [error, setError] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const { playerDB } = usePlayerDB();

  // Auto-detect current week on mount
  useEffect(() => {
    api.getCurrentWeek().then(data => {
      setWeek(data.week || 1);
    }).catch(() => setWeek(1));
  }, []);

  // Fetch power-up data when week changes
  const fetchData = useCallback(async (w) => {
    if (!w) return;
    setLoading(true);
    setError(null);
    try {
      const [resData, feedData, eligData] = await Promise.all([
        api.getResolutionStatus(w).catch(() => null),
        api.getFeed(w).catch(() => []),
        api.getEligibility(w).catch(() => null),
      ]);
      setResolution(resData);
      setFeed(Array.isArray(feedData) ? feedData : feedData?.feed || []);
      setEligibility(eligData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (week) fetchData(week);
  }, [week, fetchData]);

  // Extract matchup data from sleeper for this week
  const matchupsByLeague = useMemo(() => {
    if (!sleeper?.data?.cupData || !week) return {};
    const result = {};
    for (const [cupKey, cup] of Object.entries(sleeper.data.cupData)) {
      if (cup.allMatchups?.[week]) {
        result[cupKey] = {
          matchups: cup.allMatchups[week],
          rosterToOwner: cup.rosterToOwner,
        };
      }
    }
    return result;
  }, [sleeper, week]);

  // Build week options (1–14 regular season)
  const weekOptions = Array.from({ length: 14 }, (_, i) => i + 1);

  const pointAdjustments = resolution?.pointAdjustments || {};
  const resolutionOrder = resolution?.order || [];
  const isResolved = resolution?.resolved === true;
  const resolvedAt = resolution?.resolvedAt;

  // Detect Super Horn deployments in resolution results
  const superHornEntries = useMemo(() => {
    if (!isResolved || !resolutionOrder.length) return [];
    return resolutionOrder.filter(e => e.powerUp === 'Super Horn' && e.action !== 'hold');
  }, [isResolved, resolutionOrder]);

  // Compute standings as-of the selected week (not final season standings)
  const weekStandings = useMemo(() => {
    if (!sleeper?.data?.cupData || !week) return {};
    const result = {};
    for (const [cupKey, cup] of Object.entries(sleeper.data.cupData)) {
      if (!cup.allMatchups) continue;
      result[cupKey] = computeStandingsAsOfWeek(cup.allMatchups, cup.rosterToOwner, week);
    }
    return result;
  }, [sleeper, week]);

  // Compute overall leaderboard as-of the selected week
  const weekLeaderboard = useMemo(() => {
    if (!Object.keys(weekStandings).length) return [];
    const ownerTotals = {};
    for (const [cupKey, standings] of Object.entries(weekStandings)) {
      for (const team of standings) {
        if (!team.ownerId) continue;
        if (!ownerTotals[team.ownerId]) {
          ownerTotals[team.ownerId] = {
            ownerId: team.ownerId,
            character: team.character || '?',
            ownerName: team.ownerName || '',
            totalCupPoints: 0,
            cups: {},
          };
        }
        ownerTotals[team.ownerId].cups[cupKey] = {
          regRank: team.regRank,
          regPoints: team.regPoints,
          wins: team.wins,
          losses: team.losses,
          fpts: team.fpts,
        };
        ownerTotals[team.ownerId].totalCupPoints += team.regPoints;
      }
    }
    return Object.values(ownerTotals)
      .sort((a, b) => b.totalCupPoints - a.totalCupPoints)
      .map((t, i) => ({ ...t, place: i + 1 }));
  }, [weekStandings]);

  // ─── PDF Download ───
  // Strategy: clone content off-screen, apply light theme via inline styles,
  // capture each section separately to avoid canvas height limits, then paginate.
  const handleDownloadPDF = useCallback(async () => {
    setPdfLoading(true);
    try {
      await Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'html2canvas'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf'),
      ]);

      const target = document.getElementById('week-summary-content');
      if (!target) throw new Error('Content element not found');

      // Clone into an off-screen container with fixed width and light theme
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;width:850px;background:#fff;color:#111;padding:32px;font-family:system-ui,sans-serif;z-index:-1;';
      const clone = target.cloneNode(true);

      // Remove no-print elements from clone
      clone.querySelectorAll('.no-print').forEach(el => el.remove());
      // Remove interactive inputs (super horn projection inputs)
      clone.querySelectorAll('input').forEach(el => {
        const val = el.value || el.placeholder || '—';
        const span = document.createElement('span');
        span.textContent = val;
        span.style.cssText = 'font-family:monospace;font-size:12px;color:#374151;';
        el.replaceWith(span);
      });

      // Apply light theme inline to all elements
      const applyLightTheme = (root) => {
        // Container backgrounds
        root.style.background = '#ffffff';
        root.style.color = '#111827';

        root.querySelectorAll('*').forEach(el => {
          const cls = el.className || '';
          if (typeof cls !== 'string') return;

          // Backgrounds
          if (cls.match(/bg-gray-800|bg-mk-dark|bg-mk-darker/)) {
            el.style.background = '#f9fafb';
          }
          if (cls.match(/bg-purple-900/)) el.style.background = '#faf5ff';
          if (cls.match(/bg-yellow-900/)) el.style.background = '#fefce8';
          if (cls.match(/bg-green-900/)) el.style.background = '#f0fdf4';
          if (cls.match(/bg-red-900/)) el.style.background = '#fef2f2';
          if (cls.match(/bg-blue-500/)) el.style.background = '#dbeafe';

          // Text colors
          if (cls.match(/text-white/)) el.style.color = '#111827';
          if (cls.match(/text-gray-[345]/)) el.style.color = '#6b7280';
          if (cls.match(/text-green-[34]/)) el.style.color = '#15803d';
          if (cls.match(/text-red-[34]/)) el.style.color = '#b91c1c';
          if (cls.match(/text-purple-[23]/)) el.style.color = '#7e22ce';
          if (cls.match(/text-yellow-[23]/)) el.style.color = '#a16207';
          if (cls.match(/text-blue-[234]/)) el.style.color = '#1d4ed8';
          if (cls.match(/text-mk-blue/)) el.style.color = '#2563eb';

          // Borders
          if (cls.match(/border-white/)) el.style.borderColor = '#d1d5db';
          if (cls.match(/border-purple/)) el.style.borderColor = '#c084fc';
          if (cls.match(/border-yellow/)) el.style.borderColor = '#facc15';
          if (cls.match(/border-green/)) el.style.borderColor = '#86efac';
          if (cls.match(/border-red/)) el.style.borderColor = '#fca5a5';

          // Color dots (inline style backgrounds) — keep as-is for character colors
        });
      };

      applyLightTheme(clone);
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      // Wait for layout
      await new Promise(r => setTimeout(r, 100));

      // Capture the entire clone as one canvas
      const canvas = await window.html2canvas(clone, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 850,
        scrollX: 0,
        scrollY: 0,
      });

      // Clean up
      document.body.removeChild(wrapper);

      // Generate PDF — letter size
      const pdf = new window.jspdf.jsPDF('p', 'mm', 'letter');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2;
      const scaledH = (canvas.height * usableW) / canvas.width;

      if (scaledH <= usableH) {
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, usableW, scaledH);
      } else {
        // Multi-page slicing
        const pxPerPage = Math.floor((usableH / scaledH) * canvas.height);
        let srcY = 0;
        let page = 0;
        while (srcY < canvas.height) {
          if (page > 0) pdf.addPage();
          const sliceH = Math.min(pxPerPage, canvas.height - srcY);
          const destH = (sliceH / canvas.height) * scaledH;
          const slice = document.createElement('canvas');
          slice.width = canvas.width;
          slice.height = sliceH;
          const ctx = slice.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, slice.width, slice.height);
          ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          pdf.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, usableW, destH);
          srcY += pxPerPage;
          page++;
        }
      }

      pdf.save(`Week-${week}-Summary.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('PDF generation failed: ' + err.message);
    } finally {
      setPdfLoading(false);
    }
  }, [week]);

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .checkered-flag, header, footer, .no-print { display: none !important; }
          main { max-width: 100% !important; padding: 0 !important; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:border-gray-200 { border-color: #e5e7eb !important; }
          .print\\:border-gray-300 { border-color: #d1d5db !important; }
          .print\\:border-gray-400 { border-color: #9ca3af !important; }
          .print\\:text-black { color: black !important; }
          .print\\:text-gray-500 { color: #6b7280 !important; }
          .print\\:text-gray-600 { color: #4b5563 !important; }
          .print\\:text-gray-700 { color: #374151 !important; }
          .print\\:text-base { font-size: 1rem !important; }
          .print\\:text-xs { font-size: 0.75rem !important; }
          .print\\:mb-2 { margin-bottom: 0.5rem !important; }
          .print\\:mb-4 { margin-bottom: 1rem !important; }
          .print\\:break-inside-avoid { break-inside: avoid !important; }
          .print\\:text-green-700 { color: #15803d !important; }
          .print\\:text-red-700 { color: #b91c1c !important; }
          .print\\:hover\\:bg-transparent:hover { background: transparent !important; }
          @page { margin: 0.5in; size: letter; }
        }
      `}</style>

      <div id="week-summary-content" className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-white print:text-black">
              POST-WEEK SUMMARY
            </h1>
            <p className="text-sm text-gray-400 mt-1 print:text-gray-600">
              Week {week || '—'} {isResolved ? '• Resolved' : '• Pending'}
              {resolvedAt && ` • ${new Date(resolvedAt).toLocaleDateString()}`}
            </p>
          </div>

          <div className="flex items-center gap-3 no-print">
            {/* Week selector */}
            <select
              value={week || ''}
              onChange={e => setWeek(parseInt(e.target.value))}
              className="bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-mk-blue"
            >
              {weekOptions.map(w => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>

            {/* PDF Download */}
            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className={`flex items-center gap-2 px-4 py-2 text-white font-display text-xs rounded-lg transition ${
                pdfLoading ? 'bg-gray-600 cursor-wait' : 'bg-mk-blue hover:bg-mk-blue/80'
              }`}
            >
              {pdfLoading ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              {pdfLoading ? 'GENERATING...' : 'DOWNLOAD PDF'}
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-mk-blue border-t-transparent rounded-full" />
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-900/50 border border-red-500 rounded-xl text-red-200 text-sm">
            {error}
          </div>
        )}

        {!loading && week && (
          <>
            {/* ─── 1. SCORE ADJUSTMENTS (the key deliverable) ─── */}
            <Section title="Score Adjustments" emoji="🎯">
              <p className="text-xs text-gray-500 mb-3 print:text-gray-500">
                Apply these adjustments to Sleeper scores after power-up resolution.
              </p>
              <div className="bg-gray-800/60 border border-white/10 rounded-xl p-4 print:bg-white print:border-gray-300">
                <ScoreAdjustments pointAdjustments={pointAdjustments} />
              </div>
            </Section>

            {/* ─── SUPER HORN CALCULATOR ─── */}
            {superHornEntries.length > 0 && (
              <Section title="Super Horn Calculator" emoji="📯">
                <p className="text-xs text-gray-500 mb-3 print:text-gray-500">
                  Enter projected points for each starter. The calculator computes how many bonus points to award.
                </p>
                <SuperHornCalculator
                  superHornEntries={superHornEntries}
                  matchupsByLeague={matchupsByLeague}
                  playerDB={playerDB}
                />
              </Section>
            )}

            {/* ─── 2. MATCHUP RESULTS ─── */}
            <Section title="Matchup Results" emoji="🏁">
              {Object.keys(matchupsByLeague).length > 0 ? (
                Object.entries(matchupsByLeague).map(([lk, data]) => (
                  <LeagueMatchups
                    key={lk}
                    leagueKey={lk}
                    matchups={data.matchups}
                    rosterToOwner={data.rosterToOwner}
                  />
                ))
              ) : (
                <p className="text-gray-500 text-sm">No matchup data available for Week {week}.</p>
              )}
            </Section>

            {/* ─── 3. RESOLUTION ORDER ─── */}
            <Section title="Resolution Order" emoji="🎲">
              {isResolved ? (
                <ResolutionOrder order={resolutionOrder} />
              ) : (
                <p className="text-gray-500 text-sm">Resolution has not run yet for Week {week}.</p>
              )}
            </Section>

            {/* ─── 4. POWER-UP ACTIVITY ─── */}
            <Section title="Power-Up Activity" emoji="🎮">
              <PowerUpActivity feed={feed} eligibility={eligibility} />
            </Section>

            {/* ─── 5. CUP STANDINGS (as-of selected week) ─── */}
            {Object.keys(weekStandings).length > 0 && (
              <Section title={`Cup Standings (Through Week ${week})`} emoji="🏅">
                {Object.entries(weekStandings).map(([cupKey, standings]) => (
                  <CupStandings key={cupKey} cupKey={cupKey} standings={standings} />
                ))}
              </Section>
            )}

            {/* ─── 6. OVERALL LEADERBOARD (as-of selected week) ─── */}
            {weekLeaderboard.length > 0 && (
              <Section title={`Overall Leaderboard (Through Week ${week})`} emoji="🏆">
                <OverallLeaderboard leaderboard={weekLeaderboard} />
              </Section>
            )}

            {/* ─── 7. QUICK REFERENCE ─── */}
            {isResolved && Object.keys(pointAdjustments).length > 0 && (
              <Section title="Commissioner Action Items" emoji="📋">
                <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-xl p-4 print:bg-yellow-50 print:border-yellow-400">
                  <h3 className="font-display text-sm text-yellow-300 mb-2 print:text-yellow-700">STEPS TO COMPLETE</h3>
                  <ol className="space-y-1.5 text-sm text-gray-300 print:text-gray-700 list-decimal list-inside">
                    <li>Open each league on Sleeper</li>
                    <li>Navigate to the matchup for the affected teams</li>
                    <li>Apply the point adjustments from the table above using the commissioner score adjustment tool</li>
                    <li>Verify the updated scores match expected totals</li>
                    <li>Screenshot adjustments for league records (optional)</li>
                  </ol>
                </div>
              </Section>
            )}
          </>
        )}
      </div>
    </>
  );
}
