import { useState, useMemo } from 'react';
import { useSeason } from '../hooks/SeasonContext';
import { useSound } from '../hooks/useSoundEffects';
import { usePlayerPerformances } from '../hooks/usePlayerPerformances';
import { LEAGUE_META } from '../data/leagueConfig';
import CharacterBadge from '../components/CharacterBadge';
import LoadingSpinner from '../components/LoadingSpinner';

// ─── Position badge colors ───
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
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cls}`}>
      {pos}
    </span>
  );
}

function TrendArrow({ value }) {
  if (Math.abs(value) < 0.5) return <span className="text-gray-500 text-[10px]">—</span>;
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

// ─── Weekly View ───
function WeeklyView({ weeklyTop, weeks, posFilter }) {
  const [selectedWeek, setSelectedWeek] = useState(() => weeks[weeks.length - 1] || 1);
  const { play } = useSound();

  const filtered = useMemo(() => {
    const list = weeklyTop[selectedWeek] || [];
    if (posFilter === 'ALL') return list.slice(0, 25);
    return list.filter(p => p.position === posFilter).slice(0, 25);
  }, [weeklyTop, selectedWeek, posFilter]);

  return (
    <div>
      {/* Week selector */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-thin">
        {weeks.map(w => (
          <button
            key={w}
            onClick={() => { setSelectedWeek(w); play('click'); }}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedWeek === w
                ? 'bg-mk-blue text-white shadow-lg shadow-mk-blue/20'
                : 'bg-mk-dark border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
            }`}
          >
            Wk {w}
          </button>
        ))}
      </div>

      {/* Player table */}
      <div className="bg-mk-dark rounded-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2rem_1fr_3rem_4rem_5rem_5rem] sm:grid-cols-[2rem_1fr_3.5rem_5rem_6rem_6rem] gap-2 px-4 py-2.5 border-b border-white/10 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
          <span>#</span>
          <span>Player</span>
          <span>Pos</span>
          <span>Team</span>
          <span>Points</span>
          <span>Rostered</span>
        </div>

        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">No data for this week</div>
        )}

        {filtered.map((p, i) => (
          <div
            key={`${p.playerId}-${selectedWeek}`}
            className={`grid grid-cols-[2rem_1fr_3rem_4rem_5rem_5rem] sm:grid-cols-[2rem_1fr_3.5rem_5rem_6rem_6rem] gap-2 px-4 py-2.5 border-b border-white/5 items-center transition hover:bg-white/[0.03] ${
              i < 3 ? 'bg-mk-gold/[0.04]' : ''
            }`}
          >
            {/* Rank */}
            <span className={`text-xs font-bold ${i < 3 ? 'text-mk-gold' : 'text-gray-500'}`}>
              {i + 1}
            </span>

            {/* Player name */}
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{p.name}</p>
              {p.cupKey && (
                <p className="text-[10px] text-gray-500">
                  {LEAGUE_META[p.cupKey]?.emoji} {LEAGUE_META[p.cupKey]?.name}
                </p>
              )}
            </div>

            {/* Position */}
            <PosBadge pos={p.position} />

            {/* NFL Team */}
            <span className="text-xs text-gray-400 font-medium">{p.team}</span>

            {/* Points */}
            <span className="text-sm text-white font-bold">{p.points.toFixed(2)}</span>

            {/* Rostered by */}
            <div className="flex items-center gap-1">
              {p.character ? (
                <>
                  <CharacterBadge character={p.character} size="xs" />
                  <span className="text-[10px] text-gray-400 truncate hidden sm:inline">{p.ownerName?.split(' ')[0]}</span>
                </>
              ) : (
                <span className="text-[10px] text-gray-500">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Season View ───
function SeasonView({ seasonTop, posFilter }) {
  const filtered = useMemo(() => {
    const list = posFilter === 'ALL' ? seasonTop : seasonTop.filter(p => p.position === posFilter);
    return list.slice(0, 30);
  }, [seasonTop, posFilter]);

  return (
    <div className="bg-mk-dark rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[2rem_1fr_3rem_4rem_4rem_4rem_4rem_4rem] sm:grid-cols-[2rem_1fr_3.5rem_5rem_5rem_5rem_5rem_5rem] gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 border-b border-white/10 text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-wider">
        <span>#</span>
        <span>Player</span>
        <span>Pos</span>
        <span>Total</span>
        <span>GP</span>
        <span>Avg</span>
        <span>Best</span>
        <span>Trend</span>
      </div>

      {filtered.length === 0 && (
        <div className="px-4 py-8 text-center text-gray-500 text-sm">No data available</div>
      )}

      {filtered.map((p, i) => (
        <div
          key={p.playerId}
          className={`grid grid-cols-[2rem_1fr_3rem_4rem_4rem_4rem_4rem_4rem] sm:grid-cols-[2rem_1fr_3.5rem_5rem_5rem_5rem_5rem_5rem] gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 border-b border-white/5 items-center transition hover:bg-white/[0.03] ${
            i < 3 ? 'bg-mk-gold/[0.04]' : ''
          }`}
        >
          {/* Rank */}
          <span className={`text-xs font-bold ${i < 3 ? 'text-mk-gold' : 'text-gray-500'}`}>
            {i + 1}
          </span>

          {/* Player name + owners */}
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{p.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] text-gray-500">{p.team}</span>
              {p.owners.length > 0 && (
                <span className="text-[10px] text-gray-600 mx-1">·</span>
              )}
              <div className="flex -space-x-1">
                {p.owners.slice(0, 3).map(char => (
                  <CharacterBadge key={char} character={char} size="xs" />
                ))}
              </div>
            </div>
          </div>

          {/* Position */}
          <PosBadge pos={p.position} />

          {/* Total points */}
          <span className="text-sm text-white font-bold">{p.totalPts.toFixed(1)}</span>

          {/* Games played */}
          <span className="text-xs text-gray-400">{p.gamesPlayed}</span>

          {/* Avg */}
          <span className="text-xs text-gray-300 font-medium">{p.avgPts.toFixed(1)}</span>

          {/* Best week */}
          <span className="text-xs text-gray-400">
            {p.bestPts.toFixed(1)}
            <span className="text-[9px] text-gray-600 ml-0.5">W{p.bestWeek}</span>
          </span>

          {/* Trend */}
          <TrendArrow value={p.trend} />
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ───
export default function TopPerformers({ sleeper }) {
  const { season } = useSeason();
  const { play } = useSound();
  const cupData = sleeper.data?.cupData;
  const { loading: playerLoading, weeklyTop, seasonTop, weeks, positions } = usePlayerPerformances(cupData);

  const [view, setView] = useState('weekly');
  const [posFilter, setPosFilter] = useState('ALL');

  if (sleeper.loading || !sleeper.data || playerLoading) return <LoadingSpinner />;

  const allPositions = ['ALL', ...positions];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-display text-2xl sm:text-3xl text-white mb-1">
          🏈 Top Performers
        </h1>
        <p className="text-gray-400 text-sm">
          Best NFL player performances across all three cups — {season} season
        </p>
      </div>

      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* View toggle */}
        <div className="flex gap-1 bg-mk-dark rounded-xl border border-white/10 p-1">
          {[
            { key: 'weekly', label: '📅 Weekly', },
            { key: 'season', label: '📊 Season', },
          ].map(v => (
            <button
              key={v.key}
              onClick={() => { setView(v.key); play('tab'); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                view === v.key
                  ? 'bg-mk-blue text-white shadow-lg shadow-mk-blue/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Position filter */}
        <div className="flex gap-1 flex-wrap justify-center">
          {allPositions.map(pos => (
            <button
              key={pos}
              onClick={() => { setPosFilter(pos); play('click'); }}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                posFilter === pos
                  ? 'bg-white/10 text-white border-white/20'
                  : 'bg-transparent text-gray-500 border-transparent hover:text-gray-300 hover:border-white/10'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {view === 'weekly' ? (
        <WeeklyView weeklyTop={weeklyTop} weeks={weeks} posFilter={posFilter} />
      ) : (
        <SeasonView seasonTop={seasonTop} posFilter={posFilter} />
      )}

      {/* Legend */}
      <div className="text-center text-[10px] text-gray-600 space-y-1">
        <p>Player scores pulled from Sleeper matchup data across Mushroom 🍄, Flower 🌼, and Star ⭐ cups</p>
        <p>Trend shows the change in average points over the last 3 weeks vs prior 3 weeks</p>
      </div>
    </div>
  );
}
