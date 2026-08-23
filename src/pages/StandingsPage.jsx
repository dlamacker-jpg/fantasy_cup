import { useState, useMemo } from 'react';
import { computeCupAnalytics, computeAggregateAnalytics, TIER_META } from '../utils/standingsAnalytics';
import { LEAGUES, OWNERS } from '../data/leagueConfig';
import CharacterBadge from '../components/CharacterBadge';

// ─── Heatmap cell color ───
function heatColor(rank, total) {
  const pct = (rank - 1) / (total - 1);
  if (pct <= 0.25) return 'bg-green-500/70 text-white';
  if (pct <= 0.5) return 'bg-green-800/50 text-green-200';
  if (pct <= 0.75) return 'bg-red-900/40 text-red-300';
  return 'bg-red-600/60 text-white';
}

// ─── Stat cell with +/- coloring ───
function LuckCell({ value }) {
  const color = value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-gray-400';
  return <span className={`font-mono text-xs ${color}`}>{value > 0 ? '+' : ''}{value.toFixed(1)}</span>;
}

// ─── Team Tiers Section ───
function TeamTiers({ standings }) {
  const tiers = {};
  standings.forEach(t => {
    if (!tiers[t.tier]) tiers[t.tier] = [];
    tiers[t.tier].push(t);
  });
  const tierOrder = ['elite', 'contender', 'mid', 'struggling', 'dumpster'];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      {tierOrder.map(tk => {
        const meta = TIER_META[tk];
        const teams = tiers[tk] || [];
        if (teams.length === 0) return null;
        return (
          <div key={tk} className={`rounded-xl border p-4 ${meta.bg} ${meta.border}`}>
            <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${meta.color}`}>
              {meta.emoji} {meta.label} ({teams.length})
            </p>
            <div className="space-y-2">
              {teams.map(t => (
                <div key={t.ownerId} className="flex items-center gap-2">
                  <CharacterBadge character={t.character} size="xs" />
                  <span className="text-sm text-white font-bold">{t.character}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Weekly Heatmap ───
function WeeklyHeatmap({ weeklyRanks, standings }) {
  if (!weeklyRanks || standings.length === 0) return null;
  const weeks = [...new Set(Object.values(weeklyRanks).flat().map(r => r.week))].sort((a, b) => a - b);
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-[10px]">
        <thead>
          <tr>
            <th className="text-left text-gray-500 py-1 pr-2 sticky left-0 bg-mk-darker z-10">Team</th>
            {weeks.map(w => <th key={w} className="text-center text-gray-600 px-1 w-8">{w}</th>)}
          </tr>
        </thead>
        <tbody>
          {standings.map(team => {
            const ranks = weeklyRanks[team.ownerId] || [];
            const rankMap = {};
            ranks.forEach(r => { rankMap[r.week] = r; });
            return (
              <tr key={team.ownerId}>
                <td className="text-left text-white py-1 pr-2 font-bold sticky left-0 bg-mk-darker z-10 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <CharacterBadge character={team.character} size="xs" />
                    <span className="hidden sm:inline">{team.character}</span>
                  </div>
                </td>
                {weeks.map(w => {
                  const r = rankMap[w];
                  return (
                    <td key={w} className={`text-center py-1 px-1 rounded ${r ? heatColor(r.rank, r.totalTeams) : 'bg-gray-800/30'}`}>
                      {r ? r.rank : '—'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex gap-3 mt-2 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/70 inline-block" /> Top 25%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-800/50 inline-block" /> 50%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-900/40 inline-block" /> 75%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-600/60 inline-block" /> Bottom</span>
      </div>
    </div>
  );
}

// ─── Weekly High/Low Scorer Table ───
function HighLowTable({ weeklyHighLow }) {
  if (!weeklyHighLow || weeklyHighLow.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="text-gray-500 text-left">
            <th className="py-2 pr-3">High Scorer</th>
            <th className="py-2 px-2 text-center">Week</th>
            <th className="py-2 pl-3 text-right">Low Scorer</th>
          </tr>
        </thead>
        <tbody>
          {weeklyHighLow.map(({ week, high, low }) => (
            <tr key={week} className="border-t border-white/5">
              <td className="py-2 pr-3">
                <div className="flex items-center gap-2">
                  <CharacterBadge character={high.character} size="xs" />
                  <span className="text-white font-bold">{high.character}</span>
                  <span className="text-green-400 font-mono">{high.points.toFixed(1)}</span>
                </div>
              </td>
              <td className="py-2 px-2 text-center text-gray-500">{week}</td>
              <td className="py-2 pl-3 text-right">
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-red-400 font-mono">{low.points.toFixed(1)}</span>
                  <span className="text-white font-bold">{low.character}</span>
                  <CharacterBadge character={low.character} size="xs" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Lucky/Unlucky Table ───
function LuckTable({ standings }) {
  const sorted = [...standings].sort((a, b) => b.luckNet - a.luckNet);
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="text-gray-500 text-left">
            <th className="py-2">Team</th>
            <th className="py-2 text-center">Lucky W</th>
            <th className="py-2 text-center">Unlucky L</th>
            <th className="py-2 text-center">+/-</th>
            <th className="py-2 text-right">Label</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(t => (
            <tr key={t.ownerId} className="border-t border-white/5">
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <CharacterBadge character={t.character} size="xs" />
                  <span className="text-white font-bold">{t.character}</span>
                </div>
              </td>
              <td className="py-2 text-center text-green-400">{t.luckyWins}</td>
              <td className="py-2 text-center text-red-400">{t.unluckyLosses}</td>
              <td className="py-2 text-center"><LuckCell value={t.luckNet} /></td>
              <td className="py-2 text-right text-[10px]">
                {t.luckNet >= 3 && <span className="text-green-400">Lucky Duck 🍀</span>}
                {t.luckNet <= -3 && <span className="text-red-400">Unlucky Duck 😭</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-gray-600 mt-2">
        Lucky: Won matchup scoring in bottom half. Unlucky: Lost matchup scoring in top half.
      </p>
    </div>
  );
}

// ─── Notable Matchups ───
function NotableMatchups({ notableMatchups }) {
  const [activeTab, setActiveTab] = useState('topScores');
  const tabs = [
    { key: 'topScores', label: '🔥 Top', title: 'Top Individual Scores' },
    { key: 'worstScores', label: '💀 Bottom', title: 'Worst Scores in a Loss' },
    { key: 'blowouts', label: '💥 Blowouts', title: 'Biggest Blowouts' },
    { key: 'nailbiters', label: '😰 Nail-Biters', title: 'Closest Games' },
    { key: 'slugfests', label: '🥊 Slugfests', title: 'Highest Combined Scores' },
    { key: 'pillowfights', label: '🛏️ Pillow Fights', title: 'Lowest Combined Scores' },
  ];
  const games = notableMatchups[activeTab] || [];
  return (
    <div>
      <div className="flex gap-1.5 flex-wrap mb-4">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition ${activeTab === t.key ? 'bg-purple-600 text-white' : 'bg-mk-darker text-gray-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {games.map((g, i) => (
          <div key={i} className="bg-mk-darker/60 rounded-xl p-3 flex items-center gap-3">
            <span className="text-xs text-gray-600 w-5 text-right font-mono">{i + 1}</span>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <CharacterBadge character={g.winner.character} size="xs" />
              <span className="text-white font-bold text-xs">{g.winner.character}</span>
              <span className="text-green-400 font-mono text-xs">{g.winPts.toFixed(1)}</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-gray-500">W{g.week}</span>
              <span className="text-[10px] text-gray-600 block">Δ{g.margin.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
              <span className="text-red-400 font-mono text-xs">{g.losePts.toFixed(1)}</span>
              <span className="text-gray-400 text-xs">{g.loser.character}</span>
              <CharacterBadge character={g.loser.character} size="xs" />
            </div>
          </div>
        ))}
        {games.length === 0 && <p className="text-gray-600 text-xs text-center">No matchups in this category yet.</p>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════
export default function StandingsPage({ sleeper }) {
  const { data, loading } = sleeper;
  const [selectedCup, setSelectedCup] = useState('all');
  const [section, setSection] = useState('standings');

  const analytics = useMemo(() => {
    if (!data?.cupData) return null;
    return computeAggregateAnalytics(data.cupData);
  }, [data]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 animate-pulse">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-20">
        <span className="text-5xl block mb-4">📊</span>
        <h2 className="font-display text-lg text-white mb-2">STATS LOADING ZONE</h2>
        <p className="text-gray-400 text-sm font-body max-w-md mx-auto">Advanced stats will populate once the season begins. Heatmaps, luck analysis, and tier breakdowns are on the way!</p>
      </div>
    );
  }

  const cupKeys = Object.keys(LEAGUES);
  const currentCupAnalytics = selectedCup === 'all' ? null : analytics.perCup[selectedCup];
  const standings = selectedCup === 'all'
    ? analytics.aggregateStandings
    : currentCupAnalytics?.standings || [];

  const sections = [
    { key: 'standings', label: '📊 Standings' },
    { key: 'heatmap', label: '🗺️ Heatmap' },
    { key: 'highlow', label: '⬆️ High/Low' },
    { key: 'luck', label: '🍀 Luck' },
    { key: 'matchups', label: '🥊 Matchups' },
    { key: 'tiers', label: '🏷️ Tiers' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-display text-3xl sm:text-4xl text-white">ADVANCED STANDINGS</h1>
        <p className="text-gray-400 text-sm mt-1">Power records, luck analysis, and deep analytics</p>
      </div>

      {/* Cup selector */}
      <div className="flex gap-2 justify-center flex-wrap">
        <button onClick={() => setSelectedCup('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${selectedCup === 'all' ? 'bg-purple-600 text-white' : 'bg-mk-darker text-gray-400 hover:text-white'}`}>
          🏁 All Cups
        </button>
        {cupKeys.map(ck => (
          <button key={ck} onClick={() => setSelectedCup(ck)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${selectedCup === ck ? 'bg-purple-600 text-white' : 'bg-mk-darker text-gray-400 hover:text-white'}`}>
            {LEAGUES[ck].emoji} {LEAGUES[ck].name}
          </button>
        ))}
      </div>

      {/* Section tabs */}
      <div className="flex gap-1.5 justify-center flex-wrap">
        {sections.map(s => (
          <button key={s.key} onClick={() => setSection(s.key)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${section === s.key ? 'bg-mk-blue text-white' : 'bg-mk-darker text-gray-400 hover:text-white'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ─── Standings Table ─── */}
      {section === 'standings' && (
        <div className="bg-mk-dark/80 rounded-2xl border border-white/10 p-4 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-gray-500 text-left">
                <th className="py-2 pl-2">#</th>
                <th className="py-2">Team</th>
                {selectedCup !== 'all' ? (
                  <>
                    <th className="py-2 text-center">Record</th>
                    <th className="py-2 text-center">Power</th>
                    <th className="py-2 text-center">vs Median</th>
                    <th className="py-2 text-center">Combined</th>
                    <th className="py-2 text-right">PF</th>
                    <th className="py-2 text-right">PA</th>
                    <th className="py-2 text-right">PPG</th>
                    <th className="py-2 text-center">Luck</th>
                  </>
                ) : (
                  <>
                    <th className="py-2 text-center">Record</th>
                    <th className="py-2 text-center">Power</th>
                    <th className="py-2 text-center">vs Median</th>
                    <th className="py-2 text-right">PF</th>
                    <th className="py-2 text-right">PPG</th>
                    <th className="py-2 text-center">Luck</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {standings.map((t, i) => {
                const isCup = selectedCup !== 'all';
                const rank = isCup ? t.rank : i + 1;
                const tierMeta = isCup && t.tier ? TIER_META[t.tier] : null;
                const rowBg = rank === 1 ? 'bg-yellow-500/10' : rank === 2 ? 'bg-gray-400/10' : rank === 3 ? 'bg-orange-500/10' : '';
                return (
                  <tr key={t.ownerId} className={`border-t border-white/5 ${rowBg}`}>
                    <td className="py-2.5 pl-2 text-gray-400 font-mono">{rank}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <CharacterBadge character={t.character} size="sm" />
                        <div>
                          <span className="text-white font-bold">{t.character}</span>
                          {tierMeta && <span className={`text-[9px] ml-1.5 ${tierMeta.color}`}>{tierMeta.emoji}</span>}
                          <p className="text-[10px] text-gray-500">{t.ownerName}</p>
                        </div>
                      </div>
                    </td>
                    {isCup ? (
                      <>
                        <td className="py-2.5 text-center text-white font-mono">{t.actualRecord}</td>
                        <td className="py-2.5 text-center text-gray-300 font-mono">{t.powerRecord}</td>
                        <td className="py-2.5 text-center text-gray-300 font-mono">{t.medianRecord}</td>
                        <td className="py-2.5 text-center text-gray-300 font-mono">{t.combinedRecord}</td>
                        <td className="py-2.5 text-right text-gray-300 font-mono">{t.pf.toFixed(1)}</td>
                        <td className="py-2.5 text-right text-gray-400 font-mono">{t.pa.toFixed(1)}</td>
                        <td className="py-2.5 text-right text-gray-300 font-mono">{t.ppg.toFixed(1)}</td>
                        <td className="py-2.5 text-center"><LuckCell value={t.luckIndex} /></td>
                      </>
                    ) : (
                      <>
                        <td className="py-2.5 text-center text-white font-mono">{t.totalWins}-{t.totalLosses}</td>
                        <td className="py-2.5 text-center text-gray-300 font-mono">{t.totalPowerWins}-{t.totalPowerLosses}</td>
                        <td className="py-2.5 text-center text-gray-300 font-mono">{t.totalMedianWins}-{t.totalMedianLosses}</td>
                        <td className="py-2.5 text-right text-gray-300 font-mono">{t.totalPF.toFixed(1)}</td>
                        <td className="py-2.5 text-right text-gray-300 font-mono">{t.totalPPG.toFixed(1)}</td>
                        <td className="py-2.5 text-center"><LuckCell value={t.totalLuckIndex} /></td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Heatmap ─── */}
      {section === 'heatmap' && selectedCup !== 'all' && currentCupAnalytics && (
        <div className="bg-mk-dark/80 rounded-2xl border border-white/10 p-4">
          <h2 className="font-display text-lg text-white mb-4">Weekly Performance Heatmap</h2>
          <p className="text-[10px] text-gray-500 mb-3">Each cell shows weekly rank (1 = highest scorer)</p>
          <WeeklyHeatmap weeklyRanks={currentCupAnalytics.weeklyRanks} standings={currentCupAnalytics.standings} />
        </div>
      )}
      {section === 'heatmap' && selectedCup === 'all' && (
        <div className="space-y-4">
          {cupKeys.map(ck => {
            const ca = analytics.perCup[ck];
            if (!ca) return null;
            return (
              <div key={ck} className="bg-mk-dark/80 rounded-2xl border border-white/10 p-4">
                <h2 className="font-display text-lg text-white mb-3">{LEAGUES[ck].emoji} {LEAGUES[ck].name} Heatmap</h2>
                <WeeklyHeatmap weeklyRanks={ca.weeklyRanks} standings={ca.standings} />
              </div>
            );
          })}
        </div>
      )}

      {/* ─── High/Low Scorer ─── */}
      {section === 'highlow' && (
        <div className="bg-mk-dark/80 rounded-2xl border border-white/10 p-4">
          <h2 className="font-display text-lg text-white mb-4">Weekly High & Low Scorer</h2>
          {selectedCup !== 'all' && currentCupAnalytics ? (
            <HighLowTable weeklyHighLow={currentCupAnalytics.weeklyHighLow} />
          ) : (
            <div className="space-y-6">
              {cupKeys.map(ck => {
                const ca = analytics.perCup[ck];
                if (!ca) return null;
                return (
                  <div key={ck}>
                    <h3 className="text-sm font-bold text-white mb-2">{LEAGUES[ck].emoji} {LEAGUES[ck].name}</h3>
                    <HighLowTable weeklyHighLow={ca.weeklyHighLow} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Luck Analysis ─── */}
      {section === 'luck' && (
        <div className="bg-mk-dark/80 rounded-2xl border border-white/10 p-4">
          <h2 className="font-display text-lg text-white mb-4">Lucky Wins & Unlucky Losses</h2>
          <p className="text-[10px] text-gray-500 mb-3">Who has the right to complain?</p>
          {selectedCup !== 'all' && currentCupAnalytics ? (
            <LuckTable standings={currentCupAnalytics.standings} />
          ) : (
            <LuckTable standings={analytics.aggregateStandings.map(t => ({
              ...t, character: t.character, luckyWins: t.totalLuckyWins,
              unluckyLosses: t.totalUnluckyLosses, luckNet: t.totalLuckNet,
            }))} />
          )}
        </div>
      )}

      {/* ─── Notable Matchups ─── */}
      {section === 'matchups' && (
        <div className="bg-mk-dark/80 rounded-2xl border border-white/10 p-4">
          <h2 className="font-display text-lg text-white mb-4">Notable Matchup Stats</h2>
          <p className="text-[10px] text-gray-500 mb-3">The most interesting and extreme matchup outcomes</p>
          {selectedCup !== 'all' && currentCupAnalytics ? (
            <NotableMatchups notableMatchups={currentCupAnalytics.notableMatchups} />
          ) : (
            <div className="space-y-6">
              {cupKeys.map(ck => {
                const ca = analytics.perCup[ck];
                if (!ca) return null;
                return (
                  <div key={ck}>
                    <h3 className="text-sm font-bold text-white mb-2">{LEAGUES[ck].emoji} {LEAGUES[ck].name}</h3>
                    <NotableMatchups notableMatchups={ca.notableMatchups} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Team Tiers ─── */}
      {section === 'tiers' && (
        <div className="bg-mk-dark/80 rounded-2xl border border-white/10 p-4">
          <h2 className="font-display text-lg text-white mb-4">Team Tiers</h2>
          {selectedCup !== 'all' && currentCupAnalytics ? (
            <TeamTiers standings={currentCupAnalytics.standings} />
          ) : (
            <div className="space-y-6">
              {cupKeys.map(ck => {
                const ca = analytics.perCup[ck];
                if (!ca) return null;
                return (
                  <div key={ck}>
                    <h3 className="text-sm font-bold text-white mb-3">{LEAGUES[ck].emoji} {LEAGUES[ck].name}</h3>
                    <TeamTiers standings={ca.standings} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
