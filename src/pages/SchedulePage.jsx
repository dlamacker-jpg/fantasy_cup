import { useState, useMemo } from 'react';
import { LEAGUES, LEAGUE_META } from '../data/leagueConfig';
import { useSeason } from '../hooks/SeasonContext';
import CharacterBadge from '../components/CharacterBadge';
import LoadingSpinner from '../components/LoadingSpinner';

// ─── Parse a week's matchup array into pairs ───
function parseMatchups(weekData, rosterToOwner) {
  if (!weekData || weekData.length === 0) return [];
  const groups = {};
  weekData.forEach(m => {
    if (m.matchup_id == null) return;
    if (!groups[m.matchup_id]) groups[m.matchup_id] = [];
    groups[m.matchup_id].push(m);
  });
  return Object.values(groups)
    .filter(pair => pair.length === 2)
    .map(([a, b]) => {
      const infoA = rosterToOwner[a.roster_id] || {};
      const infoB = rosterToOwner[b.roster_id] || {};
      const ptsA = a.points || 0;
      const ptsB = b.points || 0;
      return {
        home: { ...infoA, rosterId: a.roster_id, points: ptsA },
        away: { ...infoB, rosterId: b.roster_id, points: ptsB },
        played: ptsA > 0 || ptsB > 0,
      };
    });
}

// ─── Single matchup card ───
function MatchupCard({ home, away, played }) {
  const homeWon = played && home.points > away.points;
  const awayWon = played && away.points > home.points;

  return (
    <div className="bg-mk-darker/60 rounded-xl border border-white/5 overflow-hidden hover:border-white/10 transition">
      <div className={`flex items-center gap-2 px-3 py-2 ${homeWon ? 'bg-green-500/5' : ''}`}>
        <CharacterBadge character={home.character || '?'} size="xs" />
        <span className={`flex-1 text-xs font-semibold truncate ${homeWon ? 'text-green-400' : 'text-white'}`}>
          {home.character || 'Unknown'}
        </span>
        {played ? (
          <span className={`text-xs font-bold tabular-nums ${homeWon ? 'text-green-400' : 'text-gray-400'}`}>
            {home.points.toFixed(2)}
          </span>
        ) : (
          <span className="text-gray-600 text-[10px]">—</span>
        )}
      </div>
      <div className="border-t border-white/5" />
      <div className={`flex items-center gap-2 px-3 py-2 ${awayWon ? 'bg-green-500/5' : ''}`}>
        <CharacterBadge character={away.character || '?'} size="xs" />
        <span className={`flex-1 text-xs font-semibold truncate ${awayWon ? 'text-green-400' : 'text-white'}`}>
          {away.character || 'Unknown'}
        </span>
        {played ? (
          <span className={`text-xs font-bold tabular-nums ${awayWon ? 'text-green-400' : 'text-gray-400'}`}>
            {away.points.toFixed(2)}
          </span>
        ) : (
          <span className="text-gray-600 text-[10px]">—</span>
        )}
      </div>
    </div>
  );
}

// ─── Week section ───
function WeekSection({ week, matchups, isPlayoff, isCurrent }) {
  return (
    <div className={`rounded-2xl border p-3 sm:p-4 ${
      isCurrent ? 'border-mk-blue/40 bg-mk-blue/5' :
      isPlayoff ? 'border-purple-500/20 bg-purple-500/5' :
      'border-white/5 bg-mk-dark/40'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <h4 className="font-display text-xs uppercase tracking-wide text-white">
          Week {week}
        </h4>
        {isCurrent && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-mk-blue/20 text-mk-blue border border-mk-blue/30">
            CURRENT
          </span>
        )}
        {isPlayoff && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
            PLAYOFFS
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {matchups.map((m, i) => (
          <MatchupCard key={i} {...m} />
        ))}
      </div>
    </div>
  );
}

export default function SchedulePage({ sleeper }) {
  const { season } = useSeason();
  const [activeCup, setActiveCup] = useState('mushroom');
  const [viewMode, setViewMode] = useState('all');
  const [selectedOwner, setSelectedOwner] = useState('');

  // Safely extract cup data (may be null during season transition)
  const cupInfo = sleeper.data?.cupData?.[activeCup];
  const allMatchups = cupInfo?.allMatchups || {};
  const rosterToOwner = cupInfo?.rosterToOwner || {};
  const playoffWeekStart = cupInfo?.playoffWeekStart || 15;
  const lastWeek = cupInfo?.lastWeek || 0;

  // ALL hooks run unconditionally (React rules-of-hooks)
  const owners = useMemo(() => {
    const ownerMap = {};
    Object.values(rosterToOwner).forEach(info => {
      if (info.ownerId && !ownerMap[info.ownerId]) {
        ownerMap[info.ownerId] = info;
      }
    });
    return Object.values(ownerMap).sort((a, b) => (a.character || '').localeCompare(b.character || ''));
  }, [rosterToOwner]);

  const weeks = useMemo(() => {
    const result = [];
    for (let w = 1; w <= lastWeek; w++) {
      const matchups = parseMatchups(allMatchups[w], rosterToOwner);
      const isPlayoff = w >= playoffWeekStart;
      result.push({ week: w, matchups, isPlayoff });
    }
    return result;
  }, [allMatchups, rosterToOwner, lastWeek, playoffWeekStart]);

  const currentWeek = useMemo(() => {
    for (const w of weeks) {
      const allPlayed = w.matchups.length > 0 && w.matchups.every(m => m.played);
      if (!allPlayed) return w.week;
    }
    return lastWeek;
  }, [weeks, lastWeek]);

  const filteredWeeks = useMemo(() => {
    let filtered = weeks;
    if (viewMode === 'current') {
      filtered = weeks.filter(w => w.week >= currentWeek - 1 && w.week <= currentWeek + 1);
    }
    if (selectedOwner) {
      filtered = filtered.map(w => ({
        ...w,
        matchups: w.matchups.filter(m =>
          m.home.ownerId === selectedOwner || m.away.ownerId === selectedOwner
        ),
      })).filter(w => w.matchups.length > 0);
    }
    return filtered;
  }, [weeks, viewMode, currentWeek, selectedOwner]);

  const ownerRecord = useMemo(() => {
    if (!selectedOwner) return null;
    let wins = 0, losses = 0, ties = 0, pf = 0, pa = 0;
    weeks.forEach(w => {
      w.matchups.forEach(m => {
        const isHome = m.home.ownerId === selectedOwner;
        const isAway = m.away.ownerId === selectedOwner;
        if (!isHome && !isAway) return;
        if (!m.played) return;
        const myPts = isHome ? m.home.points : m.away.points;
        const oppPts = isHome ? m.away.points : m.home.points;
        pf += myPts; pa += oppPts;
        if (myPts > oppPts) wins++;
        else if (oppPts > myPts) losses++;
        else ties++;
      });
    });
    return { wins, losses, ties, pf, pa };
  }, [selectedOwner, weeks]);

  // AFTER all hooks — safe to do early returns
  if (sleeper.loading || !sleeper.data) return <LoadingSpinner message="Loading schedule..." />;
  if (!cupInfo) return <div className="text-center py-20 text-gray-400">No schedule data available.</div>;

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <span className="text-5xl mb-3 block">📅</span>
        <h2 className="font-display text-xl md:text-2xl text-white mb-1">{season} SCHEDULE</h2>
        <p className="text-gray-400 text-sm font-body">Weekly matchups across all three cups</p>
      </div>

      {/* Cup Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 justify-start sm:justify-center">
        {Object.entries(LEAGUE_META).map(([key, c]) => (
          <button key={key} onClick={() => setActiveCup(key)}
            className={`px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap active:scale-95 shrink-0 ${
              activeCup === key
                ? 'bg-white/10 text-white border border-white/20 shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}>
            {c.emoji} <span className="hidden sm:inline">{c.name}</span><span className="sm:hidden">{c.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2 mb-4 bg-mk-dark/60 rounded-xl border border-white/5 p-3">
        <div className="inline-flex rounded-lg bg-mk-darker/60 border border-white/5 p-0.5">
          {[
            { key: 'all', label: 'All Weeks' },
            { key: 'current', label: 'This Week' },
          ].map(v => (
            <button key={v.key} onClick={() => setViewMode(v.key)}
              className={`px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold transition ${
                viewMode === v.key
                  ? 'bg-white/10 text-white'
                  : 'text-gray-500 hover:text-white'
              }`}>
              {v.label}
            </button>
          ))}
        </div>

        <select
          value={selectedOwner}
          onChange={(e) => setSelectedOwner(e.target.value)}
          className="bg-mk-darker border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-mk-blue min-w-[140px]"
        >
          <option value="">All Teams</option>
          {owners.map(o => (
            <option key={o.ownerId} value={o.ownerId}>{o.character} — {o.ownerName}</option>
          ))}
        </select>

        {ownerRecord && (
          <div className="flex items-center gap-2 ml-auto text-xs">
            <span className="text-green-400 font-bold">{ownerRecord.wins}W</span>
            <span className="text-gray-600">-</span>
            <span className="text-red-400 font-bold">{ownerRecord.losses}L</span>
            {ownerRecord.ties > 0 && <>
              <span className="text-gray-600">-</span>
              <span className="text-yellow-400 font-bold">{ownerRecord.ties}T</span>
            </>}
            <span className="text-gray-600 hidden sm:inline">|</span>
            <span className="text-gray-400 hidden sm:inline">{ownerRecord.pf.toFixed(1)} PF</span>
          </div>
        )}
      </div>

      {/* Week Grid */}
      <div className="space-y-4">
        {filteredWeeks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No matchups to display.</div>
        ) : (
          filteredWeeks.map(w => (
            <WeekSection
              key={w.week}
              week={w.week}
              matchups={w.matchups}
              isPlayoff={w.isPlayoff}
              isCurrent={w.week === currentWeek}
            />
          ))
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-4 text-[10px] text-gray-500 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-mk-blue/40 bg-mk-blue/10" />
          <span>Current Week</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-purple-500/30 bg-purple-500/10" />
          <span>Playoffs (Week {playoffWeekStart}+)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-green-400 font-bold">Green</span>
          <span>= Winner</span>
        </div>
      </div>
    </div>
  );
}
