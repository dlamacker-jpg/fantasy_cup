import { useState, useMemo } from 'react';
import { LEAGUE_META, OWNERS } from '../data/leagueConfig';
import { useSeason } from '../hooks/SeasonContext';
import CharacterBadge from '../components/CharacterBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { generateSeasonNarratives } from '../utils/narrativeEngine';

// ─── Compute power rankings from matchup data across all cups ───
function computePowerRankings(cupData) {
  const owners = {}; // ownerId → aggregated stats

  Object.entries(cupData).forEach(([cupKey, cd]) => {
    const { allMatchups, rosterToOwner, playoffWeekStart } = cd;

    // Collect weekly scores and results per owner
    for (let week = 1; week < playoffWeekStart; week++) {
      const weekData = allMatchups[week];
      if (!weekData || weekData.length === 0) continue;

      // All scores this week (for expected wins calc)
      const allScores = weekData.map(m => ({ rosterId: m.roster_id, points: m.points || 0 }));

      // Matchup pairs
      const groups = {};
      weekData.forEach(m => {
        if (m.matchup_id == null) return;
        if (!groups[m.matchup_id]) groups[m.matchup_id] = [];
        groups[m.matchup_id].push(m);
      });

      weekData.forEach(m => {
        const info = rosterToOwner[m.roster_id];
        if (!info) return;
        const pts = m.points || 0;

        if (!owners[info.ownerId]) {
          owners[info.ownerId] = {
            ownerId: info.ownerId, character: info.character, ownerName: info.ownerName,
            totalPF: 0, totalPA: 0, wins: 0, losses: 0,
            expectedWins: 0, weeklyScores: [], recentScores: [],
            gamesPlayed: 0, consistency: [],
          };
        }
        const o = owners[info.ownerId];
        o.totalPF += pts;
        o.weeklyScores.push({ week, points: pts, cup: cupKey });

        // Expected wins: how many teams this week would you beat?
        const beatable = allScores.filter(s => s.rosterId !== m.roster_id && pts > s.points).length;
        const ties = allScores.filter(s => s.rosterId !== m.roster_id && pts === s.points).length;
        o.expectedWins += (beatable + ties * 0.5) / (allScores.length - 1);
      });

      // Actual W/L from matchup pairs
      Object.values(groups).forEach(pair => {
        if (pair.length !== 2) return;
        const [a, b] = pair;
        const infoA = rosterToOwner[a.roster_id], infoB = rosterToOwner[b.roster_id];
        if (!infoA || !infoB) return;
        const ptsA = a.points || 0, ptsB = b.points || 0;

        if (owners[infoA.ownerId]) {
          owners[infoA.ownerId].totalPA += ptsB;
          owners[infoA.ownerId].gamesPlayed++;
          if (ptsA > ptsB) owners[infoA.ownerId].wins++;
          else if (ptsB > ptsA) owners[infoA.ownerId].losses++;
        }
        if (owners[infoB.ownerId]) {
          owners[infoB.ownerId].totalPA += ptsA;
          owners[infoB.ownerId].gamesPlayed++;
          if (ptsB > ptsA) owners[infoB.ownerId].wins++;
          else if (ptsA > ptsB) owners[infoB.ownerId].losses++;
        }
      });
    }
  });

  // Compute derived metrics
  return Object.values(owners).map(o => {
    const avgPF = o.gamesPlayed > 0 ? o.totalPF / o.gamesPlayed : 0;
    const scores = o.weeklyScores.map(s => s.points);
    const stdDev = scores.length > 1
      ? Math.sqrt(scores.reduce((sum, s) => sum + (s - avgPF) ** 2, 0) / scores.length)
      : 0;

    // Recent form: last 3 weeks of scores across all cups
    const recent = [...o.weeklyScores].sort((a, b) => b.week - a.week).slice(0, 9);
    const recentAvg = recent.length > 0 ? recent.reduce((s, r) => s + r.points, 0) / recent.length : 0;

    // Luck factor: actual wins - expected wins
    const luck = o.wins - o.expectedWins;

    // Power score: weighted composite
    // 35% win%, 25% avg PF, 20% recent form, 10% consistency (inverse stddev), 10% SOS (PA)
    const winPct = o.gamesPlayed > 0 ? o.wins / o.gamesPlayed : 0;
    const maxPossiblePF = 200; // normalize
    const powerScore = (
      winPct * 35 +
      (avgPF / maxPossiblePF) * 25 +
      (recentAvg / maxPossiblePF) * 20 +
      (1 - Math.min(stdDev / 50, 1)) * 10 +
      (o.totalPA / Math.max(o.totalPF, 1)) * 10
    );

    return {
      ...o, avgPF, stdDev, recentAvg, luck, winPct, powerScore,
      expectedWins: Math.round(o.expectedWins * 10) / 10,
    };
  }).sort((a, b) => b.powerScore - a.powerScore);
}

// ─── Rank change indicator ───
function RankChange({ change }) {
  if (change === 0 || change == null) return <span className="text-gray-600 text-[10px]">—</span>;
  if (change > 0) return <span className="text-green-400 text-[10px] font-bold">▲ {change}</span>;
  return <span className="text-red-400 text-[10px] font-bold">▼ {Math.abs(change)}</span>;
}

// ─── Stat bar (visual percentage bar) ───
function StatBar({ value, max, color = 'bg-mk-blue', label }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-[10px] text-gray-500 w-8 text-right shrink-0">{label}</span>}
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Power ranking card (mobile) ───
function RankingCard({ rank, team, maxPF }) {
  const tierColors = rank <= 3 ? 'border-mk-gold/30' : rank <= 6 ? 'border-blue-500/20' : rank <= 9 ? 'border-white/10' : 'border-red-500/20';
  const tierLabel = rank <= 3 ? 'ELITE' : rank <= 6 ? 'CONTENDER' : rank <= 9 ? 'MIDDLE PACK' : 'REBUILD';
  const tierLabelColor = rank <= 3 ? 'text-mk-gold' : rank <= 6 ? 'text-blue-400' : rank <= 9 ? 'text-gray-400' : 'text-red-400';

  return (
    <div className={`bg-mk-dark/80 rounded-2xl border ${tierColors} p-4`}>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xl font-display text-white font-bold w-8 text-center">{rank}</span>
        <CharacterBadge character={team.character} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">{team.character}</p>
          <p className="text-gray-500 text-[10px]">{team.ownerName}</p>
        </div>
        <div className="text-right">
          <p className={`text-[9px] font-bold uppercase ${tierLabelColor}`}>{tierLabel}</p>
          <p className="text-white font-bold text-sm">{team.powerScore.toFixed(1)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Record</span>
          <span className="text-white font-bold">{team.wins}-{team.losses}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Avg PF</span>
          <span className="text-white font-bold">{team.avgPF.toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Recent Avg</span>
          <span className={`font-bold ${team.recentAvg > team.avgPF ? 'text-green-400' : 'text-red-400'}`}>
            {team.recentAvg.toFixed(1)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Luck</span>
          <span className={`font-bold ${team.luck > 0 ? 'text-green-400' : team.luck < -1 ? 'text-red-400' : 'text-gray-300'}`}>
            {team.luck > 0 ? '+' : ''}{team.luck.toFixed(1)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Expected W</span>
          <span className="text-gray-300">{team.expectedWins}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Consistency</span>
          <span className="text-gray-300">{team.stdDev.toFixed(1)} SD</span>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <StatBar value={team.avgPF} max={maxPF} color="bg-mk-blue" label="PF" />
        <StatBar value={team.recentAvg} max={maxPF} color={team.recentAvg > team.avgPF ? 'bg-green-500' : 'bg-red-500'} label="REC" />
      </div>
    </div>
  );
}

export default function PowerRankings({ sleeper }) {
  const { season } = useSeason();

  const rankings = useMemo(() => {
    if (!sleeper.data?.cupData) return [];
    return computePowerRankings(sleeper.data.cupData);
  }, [sleeper.data]);

  const narratives = useMemo(() => {
    if (rankings.length === 0 || !sleeper.data?.cupData) return { ownerNarratives: [], rivalries: [] };
    return generateSeasonNarratives(rankings, sleeper.data.cupData);
  }, [rankings, sleeper.data]);

  const [showNarratives, setShowNarratives] = useState(true);

  if (sleeper.loading || !sleeper.data) return <LoadingSpinner message="Computing power rankings..." />;
  if (rankings.length === 0) return (
    <div className="text-center py-20">
      <span className="text-5xl block mb-4">🏎️</span>
      <h2 className="font-display text-lg text-white mb-2">ENGINES ARE WARMING UP</h2>
      <p className="text-gray-400 text-sm font-body max-w-md mx-auto">Power Rankings will appear once the season kicks off and matchup data starts rolling in. Check back after Week 1!</p>
    </div>
  );

  const maxPF = Math.max(...rankings.map(r => r.avgPF));

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <span className="text-5xl mb-3 block">⚡</span>
        <h2 className="font-display text-xl md:text-2xl text-white mb-1">{season} POWER RANKINGS</h2>
        <p className="text-gray-400 text-sm font-body">
          Algorithmic rankings based on record, scoring, recent form, consistency & luck
        </p>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-mk-dark/80 backdrop-blur rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-3 px-3 text-gray-400 text-xs font-bold text-center">#</th>
                <th className="py-3 px-3 text-gray-400 text-xs font-bold text-left">Team</th>
                <th className="py-3 px-3 text-gray-400 text-xs font-bold text-center">Power</th>
                <th className="py-3 px-3 text-gray-400 text-xs font-bold text-center">Record</th>
                <th className="py-3 px-3 text-gray-400 text-xs font-bold text-center">Avg PF</th>
                <th className="py-3 px-3 text-gray-400 text-xs font-bold text-center">Recent</th>
                <th className="py-3 px-3 text-gray-400 text-xs font-bold text-center">Exp W</th>
                <th className="py-3 px-3 text-gray-400 text-xs font-bold text-center">Luck</th>
                <th className="py-3 px-3 text-gray-400 text-xs font-bold text-center">SD</th>
                <th className="py-3 px-3 text-gray-400 text-xs font-bold text-left min-w-[120px]">Trend</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((team, i) => {
                const rank = i + 1;
                const tierBg = rank <= 3 ? 'bg-mk-gold/[0.03]' : rank >= 10 ? 'bg-red-500/[0.03]' : '';
                return (
                  <tr key={team.ownerId} className={`border-b border-white/5 hover:bg-white/5 transition ${tierBg}`}>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-bold ${rank <= 3 ? 'text-mk-gold' : 'text-gray-500'}`}>{rank}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <CharacterBadge character={team.character} size="xs" />
                        <div>
                          <span className="text-white font-semibold">{team.character}</span>
                          <span className="text-gray-600 text-[10px] ml-1.5 hidden lg:inline">{team.ownerName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-white font-bold text-base">{team.powerScore.toFixed(1)}</span>
                    </td>
                    <td className="py-3 px-3 text-center text-white font-bold">{team.wins}-{team.losses}</td>
                    <td className="py-3 px-3 text-center text-gray-300">{team.avgPF.toFixed(1)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-bold ${team.recentAvg > team.avgPF ? 'text-green-400' : 'text-red-400'}`}>
                        {team.recentAvg.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-gray-400">{team.expectedWins}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-bold ${team.luck > 0 ? 'text-green-400' : team.luck < -1 ? 'text-red-400' : 'text-gray-400'}`}>
                        {team.luck > 0 ? '+' : ''}{team.luck.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-gray-400">{team.stdDev.toFixed(1)}</td>
                    <td className="py-3 px-3">
                      <StatBar value={team.avgPF} max={maxPF} color={rank <= 3 ? 'bg-mk-gold' : rank <= 6 ? 'bg-mk-blue' : 'bg-gray-600'} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {rankings.map((team, i) => (
          <RankingCard key={team.ownerId} rank={i + 1} team={team} maxPF={maxPF} />
        ))}
      </div>

      {/* Season Narratives */}
      {narratives.ownerNarratives.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">📖</span>
              <h3 className="font-display text-sm text-white uppercase tracking-wide">Season Storylines</h3>
            </div>
            <button
              onClick={() => setShowNarratives(!showNarratives)}
              className="text-xs text-gray-500 hover:text-white transition px-3 py-1 rounded-lg hover:bg-white/5"
            >
              {showNarratives ? 'Hide' : 'Show'}
            </button>
          </div>

          {showNarratives && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {narratives.ownerNarratives.map(n => (
                <div key={n.ownerId} className={`bg-mk-dark rounded-xl border ${n.archetype.border} p-4`}>
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <CharacterBadge character={n.character} size="xs" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm">{n.character}</span>
                        <span className="text-[10px] text-gray-600">#{n.rank}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${n.archetype.border} ${n.archetype.color}`}>
                      {n.archetype.icon} {n.archetype.tag}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">{n.narrative}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rivalries */}
      {showNarratives && narratives.rivalries.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🔥</span>
            <h3 className="font-display text-sm text-white uppercase tracking-wide">Rivalry Watch</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {narratives.rivalries.slice(0, 6).map((r, i) => (
              <div key={i} className={`bg-mk-dark rounded-xl border p-4 ${
                r.type === 'heated' ? 'border-orange-500/30' : r.type === 'lopsided' ? 'border-red-500/20' : 'border-white/10'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CharacterBadge character={r.charA} size="xs" />
                    <span className="text-gray-600 text-xs font-bold">vs</span>
                    <CharacterBadge character={r.charB} size="xs" />
                  </div>
                  <div className="text-right">
                    <span className="text-white font-bold text-xs">{r.record}</span>
                    <span className="text-gray-600 text-[10px] ml-1">({r.games}G)</span>
                  </div>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{r.narrative}</p>
                {r.closestMargin && (
                  <p className="text-[10px] text-gray-600 mt-2">Closest game: {r.closestMargin} pts</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 bg-mk-dark/60 rounded-xl border border-white/5 p-4">
        <h4 className="font-display text-[10px] text-gray-400 uppercase tracking-wide mb-2">How Power Score Works</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-[10px] text-gray-500">
          <div><span className="text-white font-bold">35%</span> Win Rate</div>
          <div><span className="text-white font-bold">25%</span> Avg Points For</div>
          <div><span className="text-white font-bold">20%</span> Recent Form</div>
          <div><span className="text-white font-bold">10%</span> Consistency</div>
          <div><span className="text-white font-bold">10%</span> Strength of Schedule</div>
        </div>
        <p className="text-gray-600 text-[10px] mt-2">
          Luck = Actual Wins − Expected Wins. Expected wins based on how many teams you'd beat each week.
        </p>
      </div>
    </div>
  );
}
