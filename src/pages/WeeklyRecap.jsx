import { useState, useMemo } from 'react';
import { LEAGUE_META } from '../data/leagueConfig';
import { useSeason } from '../hooks/SeasonContext';
import { useSound } from '../hooks/useSoundEffects';
import CharacterBadge from '../components/CharacterBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { generateWeeklyStorylines } from '../utils/narrativeEngine';

const cupEmoji = (cup) => LEAGUE_META[cup]?.emoji || '';

// ─── Compute weekly awards from matchup data ───
function computeWeeklyAwards(cupData, week) {
  const awards = [];
  const allMatchups = []; // { cup, home, away, homePts, awayPts }
  const allScores = [];   // { cup, ownerId, character, ownerName, points }

  Object.entries(cupData).forEach(([cupKey, cd]) => {
    const weekData = cd.allMatchups[week];
    if (!weekData || weekData.length === 0) return;

    weekData.forEach(m => {
      const info = cd.rosterToOwner[m.roster_id];
      if (!info) return;
      allScores.push({ cup: cupKey, ownerId: info.ownerId, character: info.character, ownerName: info.ownerName, points: m.points || 0 });
    });

    const groups = {};
    weekData.forEach(m => {
      if (m.matchup_id == null) return;
      if (!groups[m.matchup_id]) groups[m.matchup_id] = [];
      groups[m.matchup_id].push(m);
    });
    Object.values(groups).forEach(pair => {
      if (pair.length !== 2) return;
      const [a, b] = pair;
      const infoA = cd.rosterToOwner[a.roster_id] || {};
      const infoB = cd.rosterToOwner[b.roster_id] || {};
      allMatchups.push({
        cup: cupKey,
        home: infoA, away: infoB,
        homePts: a.points || 0, awayPts: b.points || 0,
      });
    });
  });

  if (allScores.length === 0) return { awards: [], allScores: [], allMatchups: [] };

  // 🏆 Top Scorer of the Week
  const topScorer = [...allScores].sort((a, b) => b.points - a.points)[0];
  if (topScorer) awards.push({
    icon: '🏆', title: 'Top Speed',
    subtitle: 'Highest scorer of the week',
    character: topScorer.character, ownerName: topScorer.ownerName,
    value: `${topScorer.points.toFixed(2)} pts`,
    detail: `${cupEmoji(topScorer.cup)} ${LEAGUE_META[topScorer.cup]?.name}`,
    accent: 'border-mk-gold/40 bg-mk-gold/5',
  });

  // 💀 Lowest Scorer
  const lowScorer = [...allScores].filter(s => s.points > 0).sort((a, b) => a.points - b.points)[0];
  if (lowScorer) awards.push({
    icon: '💀', title: 'Flat Tire',
    subtitle: 'Lowest scorer of the week',
    character: lowScorer.character, ownerName: lowScorer.ownerName,
    value: `${lowScorer.points.toFixed(2)} pts`,
    detail: `${cupEmoji(lowScorer.cup)} ${LEAGUE_META[lowScorer.cup]?.name}`,
    accent: 'border-red-500/30 bg-red-500/5',
  });

  // 🎯 Closest Game (Highway Robbery)
  const closest = [...allMatchups].filter(m => m.homePts !== m.awayPts)
    .sort((a, b) => Math.abs(a.homePts - a.awayPts) - Math.abs(b.homePts - b.awayPts))[0];
  if (closest) {
    const winner = closest.homePts > closest.awayPts ? closest.home : closest.away;
    const loser = closest.homePts > closest.awayPts ? closest.away : closest.home;
    const margin = Math.abs(closest.homePts - closest.awayPts);
    awards.push({
      icon: '🏎️', title: 'Photo Finish',
      subtitle: `Won by just ${margin.toFixed(2)} pts`,
      character: winner.character, ownerName: winner.ownerName,
      value: `${Math.max(closest.homePts, closest.awayPts).toFixed(2)} - ${Math.min(closest.homePts, closest.awayPts).toFixed(2)}`,
      detail: `vs ${loser.character} ${cupEmoji(closest.cup)}`,
      accent: 'border-blue-500/30 bg-blue-500/5',
    });
  }

  // 💥 Biggest Blowout
  const blowout = [...allMatchups].sort((a, b) =>
    Math.abs(b.homePts - b.awayPts) - Math.abs(a.homePts - a.awayPts)
  )[0];
  if (blowout) {
    const winner = blowout.homePts > blowout.awayPts ? blowout.home : blowout.away;
    const loser = blowout.homePts > blowout.awayPts ? blowout.away : blowout.home;
    const margin = Math.abs(blowout.homePts - blowout.awayPts);
    awards.push({
      icon: '💥', title: 'Blue Shelled',
      subtitle: `Destroyed by ${margin.toFixed(2)} pts`,
      character: loser.character, ownerName: loser.ownerName,
      value: `${Math.min(blowout.homePts, blowout.awayPts).toFixed(2)} - ${Math.max(blowout.homePts, blowout.awayPts).toFixed(2)}`,
      detail: `Lost to ${winner.character} ${cupEmoji(blowout.cup)}`,
      accent: 'border-orange-500/30 bg-orange-500/5',
    });
  }

  // 🍀 Luckiest Win (won with lowest score among winners)
  const winners = allMatchups.map(m => {
    const winnerPts = Math.max(m.homePts, m.awayPts);
    const loserPts = Math.min(m.homePts, m.awayPts);
    const winner = m.homePts > m.awayPts ? m.home : m.away;
    const loser = m.homePts > m.awayPts ? m.away : m.home;
    return { winner, loser, winnerPts, loserPts, cup: m.cup };
  }).filter(m => m.winnerPts > m.loserPts);
  const luckiest = winners.sort((a, b) => a.winnerPts - b.winnerPts)[0];
  if (luckiest) awards.push({
    icon: '🍀', title: 'Lucky Star',
    subtitle: 'Won with lowest winning score',
    character: luckiest.winner.character, ownerName: luckiest.winner.ownerName,
    value: `${luckiest.winnerPts.toFixed(2)} pts (W)`,
    detail: `vs ${luckiest.loser.character} (${luckiest.loserPts.toFixed(2)}) ${cupEmoji(luckiest.cup)}`,
    accent: 'border-green-500/30 bg-green-500/5',
  });

  // 😤 Unluckiest Loss (lost with highest score among losers)
  const losers = allMatchups.map(m => {
    const winnerPts = Math.max(m.homePts, m.awayPts);
    const loserPts = Math.min(m.homePts, m.awayPts);
    const winner = m.homePts > m.awayPts ? m.home : m.away;
    const loser = m.homePts > m.awayPts ? m.away : m.home;
    return { winner, loser, winnerPts, loserPts, cup: m.cup };
  }).filter(m => m.winnerPts > m.loserPts);
  const unluckiest = losers.sort((a, b) => b.loserPts - a.loserPts)[0];
  if (unluckiest) awards.push({
    icon: '😤', title: 'Wrong Place Wrong Time',
    subtitle: 'Lost with highest losing score',
    character: unluckiest.loser.character, ownerName: unluckiest.loser.ownerName,
    value: `${unluckiest.loserPts.toFixed(2)} pts (L)`,
    detail: `vs ${unluckiest.winner.character} (${unluckiest.winnerPts.toFixed(2)}) ${cupEmoji(unluckiest.cup)}`,
    accent: 'border-purple-500/30 bg-purple-500/5',
  });

  return { awards, allScores, allMatchups };
}

function AwardCard({ award }) {
  return (
    <div className={`rounded-2xl border p-4 ${award.accent}`}>
      <div className="flex items-start gap-3">
        <span className="text-3xl">{award.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-display text-sm text-white">{award.title}</h4>
          </div>
          <p className="text-gray-400 text-[10px] mb-2">{award.subtitle}</p>
          <div className="flex items-center gap-2">
            <CharacterBadge character={award.character} size="xs" />
            <div className="min-w-0">
              <p className="text-white font-bold text-sm">{award.character}</p>
              <p className="text-gray-500 text-[10px]">{award.ownerName}</p>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-white font-bold text-sm">{award.value}</p>
          <p className="text-gray-500 text-[10px]">{award.detail}</p>
        </div>
      </div>
    </div>
  );
}

function MatchupResult({ m }) {
  const homeWon = m.homePts > m.awayPts;
  return (
    <div className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0">
      <span className="text-[10px] text-gray-600 w-5">{cupEmoji(m.cup)}</span>
      <CharacterBadge character={m.home.character || '?'} size="xs" />
      <span className={`text-xs font-semibold truncate flex-1 ${homeWon ? 'text-green-400' : 'text-gray-400'}`}>
        {m.home.character}
      </span>
      <span className="text-xs text-white font-bold tabular-nums">{m.homePts.toFixed(2)}</span>
      <span className="text-gray-600 text-[10px] px-1">vs</span>
      <span className="text-xs text-white font-bold tabular-nums">{m.awayPts.toFixed(2)}</span>
      <span className={`text-xs font-semibold truncate flex-1 text-right ${!homeWon ? 'text-green-400' : 'text-gray-400'}`}>
        {m.away.character}
      </span>
      <CharacterBadge character={m.away.character || '?'} size="xs" />
    </div>
  );
}

export default function WeeklyRecap({ sleeper }) {
  const { season } = useSeason();
  const { play } = useSound();

  // Determine max week
  const maxWeek = useMemo(() => {
    if (!sleeper.data?.cupData) return 1;
    let max = 1;
    Object.values(sleeper.data.cupData).forEach(cd => {
      Object.keys(cd.allMatchups).forEach(w => {
        const wn = Number(w);
        const weekData = cd.allMatchups[wn];
        if (weekData && weekData.length > 0 && weekData.some(m => (m.points || 0) > 0)) {
          max = Math.max(max, wn);
        }
      });
    });
    return max;
  }, [sleeper.data]);

  const [selectedWeek, setSelectedWeek] = useState(null);
  const week = selectedWeek ?? maxWeek;

  const recap = useMemo(() => {
    if (!sleeper.data?.cupData) return { awards: [], allScores: [], allMatchups: [] };
    return computeWeeklyAwards(sleeper.data.cupData, week);
  }, [sleeper.data, week]);

  const storylines = useMemo(() => {
    if (!sleeper.data?.cupData) return [];
    return generateWeeklyStorylines(sleeper.data.cupData, week);
  }, [sleeper.data, week]);

  if (sleeper.loading || !sleeper.data) return <LoadingSpinner message="Loading weekly recap..." />;

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <span className="text-5xl mb-3 block">📰</span>
        <h2 className="font-display text-xl md:text-2xl text-white mb-1">{season} WEEKLY RECAP</h2>
        <p className="text-gray-400 text-sm font-body">Awards and highlights from every week</p>
      </div>

      {/* Week selector */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <button
          onClick={() => { setSelectedWeek(Math.max(1, week - 1)); play('tab'); }}
          disabled={week <= 1}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
        </button>

        <div className="flex gap-1 overflow-x-auto max-w-[70vw] px-1 py-1">
          {Array.from({ length: maxWeek }, (_, i) => i + 1).map(w => (
            <button
              key={w}
              onClick={() => setSelectedWeek(w)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition shrink-0 min-w-[36px] ${
                w === week
                  ? 'bg-mk-blue text-white shadow-lg shadow-mk-blue/30'
                  : 'text-gray-500 hover:text-white hover:bg-white/10'
              }`}
            >
              {w}
            </button>
          ))}
        </div>

        <button
          onClick={() => { setSelectedWeek(Math.min(maxWeek, week + 1)); play('tab'); }}
          disabled={week >= maxWeek}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>

      {/* Weekly Storylines */}
      {storylines.length > 0 && (
        <div className="mb-6 bg-mk-dark rounded-2xl border border-white/10 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📝</span>
            <h4 className="font-display text-[10px] sm:text-xs text-mk-blue tracking-widest">WEEK {week} HEADLINES</h4>
          </div>
          <div className="space-y-2.5">
            {storylines.map((story, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-lg shrink-0 mt-0.5">{story.icon}</span>
                <p className="text-sm text-gray-300 leading-relaxed">{story.headline}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 className="font-display text-sm text-gray-400 text-center mb-4">WEEK {week} AWARDS</h3>

      {/* Awards grid */}
      {recap.awards.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No data for this week yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {recap.awards.map((award, i) => (
            <AwardCard key={i} award={award} />
          ))}
        </div>
      )}

      {/* All matchup results */}
      {recap.allMatchups.length > 0 && (
        <div className="bg-mk-dark/80 backdrop-blur rounded-2xl border border-white/10 p-4">
          <h4 className="font-display text-xs text-gray-400 uppercase tracking-wide mb-3">All Week {week} Results</h4>
          <div className="space-y-0">
            {recap.allMatchups.map((m, i) => (
              <MatchupResult key={i} m={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
