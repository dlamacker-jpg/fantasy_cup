import { useState, useEffect, useCallback } from 'react';
import {
  LEAGUES, OWNERS, REG_SEASON_POINTS, PLAYOFF_POINTS,
  CONSOLATION_POINTS, BONUS_CONFIG, DEFAULT_SEASON,
  getLeaguesForSeason,
} from '../data/leagueConfig';

const API = 'https://api.sleeper.app/v1';
const fetchJSON = (url) => fetch(url).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); });

// ────────────────────────────────────────────
// Bracket → playoff placement (1-12)
// ────────────────────────────────────────────
function parseBracket(bracket, startPlace) {
  const placements = {};
  // Placement matches have a `p` field (final place of winner)
  // Round 3 (or last round with `p`) determines final placement
  const placementMatches = bracket.filter(m => m.p !== undefined);
  placementMatches.forEach(m => {
    if (m.w != null) placements[m.w] = startPlace + m.p - 1;
    if (m.l != null) placements[m.l] = startPlace + m.p;
  });
  return placements;
}

// ────────────────────────────────────────────
// Compute regular-season W/L from matchup data
// ────────────────────────────────────────────
function computeRegSeasonRecord(allMatchups, playoffWeekStart) {
  const records = {}; // rosterId → { wins, losses, fpts }
  for (let week = 1; week < playoffWeekStart; week++) {
    const weekData = allMatchups[week];
    if (!weekData || weekData.length === 0) continue;
    // Group by matchup_id
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
  return records;
}

// ────────────────────────────────────────────
// Compute weekly top scorers (for bonus/top speed)
// ────────────────────────────────────────────
function computeWeeklyTopScorers(allMatchups, rosterToOwner) {
  const weeklyBest = []; // [{ week, rosterId, points, ownerId, character }]
  const weeks = Object.keys(allMatchups).map(Number).sort((a, b) => a - b);
  for (const week of weeks) {
    const weekData = allMatchups[week];
    if (!weekData || weekData.length === 0) continue;
    let best = null;
    weekData.forEach(m => {
      if ((m.points || 0) > (best?.points || 0)) {
        best = { week, rosterId: m.roster_id, points: m.points };
      }
    });
    if (best) {
      const info = rosterToOwner[best.rosterId] || {};
      weeklyBest.push({ ...best, ownerId: info.ownerId, character: info.character, ownerName: info.ownerName });
    }
  }
  return weeklyBest;
}

// ────────────────────────────────────────────
// Compute H2H records from matchup data
// ────────────────────────────────────────────
function computeH2H(allMatchups, rosterToOwner, lastWeek) {
  // Returns { ownerIdA: { ownerIdB: { wins, losses, ties, pf, pa, matchups: [...] } } }
  const h2h = {};
  for (let week = 1; week <= lastWeek; week++) {
    const weekData = allMatchups[week];
    if (!weekData || weekData.length === 0) continue;
    const groups = {};
    weekData.forEach(m => {
      if (m.matchup_id == null) return;
      if (!groups[m.matchup_id]) groups[m.matchup_id] = [];
      groups[m.matchup_id].push(m);
    });
    Object.values(groups).forEach(pair => {
      if (pair.length !== 2) return;
      const [a, b] = pair;
      const infoA = rosterToOwner[a.roster_id];
      const infoB = rosterToOwner[b.roster_id];
      if (!infoA || !infoB) return;
      const idA = infoA.ownerId, idB = infoB.ownerId;
      const ptsA = a.points || 0, ptsB = b.points || 0;
      // Initialize
      if (!h2h[idA]) h2h[idA] = {};
      if (!h2h[idA][idB]) h2h[idA][idB] = { wins: 0, losses: 0, ties: 0, pf: 0, pa: 0, matchups: [] };
      if (!h2h[idB]) h2h[idB] = {};
      if (!h2h[idB][idA]) h2h[idB][idA] = { wins: 0, losses: 0, ties: 0, pf: 0, pa: 0, matchups: [] };
      // Record matchup
      const matchup = { week, scoreA: ptsA, scoreB: ptsB };
      h2h[idA][idB].matchups.push(matchup);
      h2h[idB][idA].matchups.push({ week, scoreA: ptsB, scoreB: ptsA });
      h2h[idA][idB].pf += ptsA; h2h[idA][idB].pa += ptsB;
      h2h[idB][idA].pf += ptsB; h2h[idB][idA].pa += ptsA;
      if (ptsA > ptsB) { h2h[idA][idB].wins++; h2h[idB][idA].losses++; }
      else if (ptsB > ptsA) { h2h[idB][idA].wins++; h2h[idA][idB].losses++; }
      else { h2h[idA][idB].ties++; h2h[idB][idA].ties++; }
    });
  }
  return h2h;
}

// ────────────────────────────────────────────
// Compute record-book stats from matchup data
// ────────────────────────────────────────────
function computeRecordBook(allMatchups, rosterToOwner, lastWeek) {
  const records = {
    highestWeeklyScore: null,    // { ownerId, character, week, points, cupKey }
    lowestWeeklyScore: null,
    biggestBlowout: null,        // { winner, loser, margin, week, scores }
    closestGame: null,           // { teams, margin, week, scores }
    highestCombined: null,       // { teams, total, week }
    lowestCombined: null,
    longestWinStreak: {},        // ownerId → { streak, weeks }
    longestLoseStreak: {},
    weeklyScores: [],            // all individual scores for percentile calcs
  };

  const streaks = {}; // ownerId → { currentWin, currentLose, maxWin, maxLose, maxWinWeeks, maxLoseWeeks }

  for (let week = 1; week <= lastWeek; week++) {
    const weekData = allMatchups[week];
    if (!weekData || weekData.length === 0) continue;

    // Individual scores
    weekData.forEach(m => {
      const info = rosterToOwner[m.roster_id];
      if (!info) return;
      const pts = m.points || 0;
      records.weeklyScores.push({ ownerId: info.ownerId, character: info.character, ownerName: info.ownerName, week, points: pts });
      if (!records.highestWeeklyScore || pts > records.highestWeeklyScore.points) {
        records.highestWeeklyScore = { ownerId: info.ownerId, character: info.character, ownerName: info.ownerName, week, points: pts };
      }
      if (!records.lowestWeeklyScore || (pts < records.lowestWeeklyScore.points && pts > 0)) {
        records.lowestWeeklyScore = { ownerId: info.ownerId, character: info.character, ownerName: info.ownerName, week, points: pts };
      }
    });

    // Matchup-level records
    const groups = {};
    weekData.forEach(m => {
      if (m.matchup_id == null) return;
      if (!groups[m.matchup_id]) groups[m.matchup_id] = [];
      groups[m.matchup_id].push(m);
    });
    Object.values(groups).forEach(pair => {
      if (pair.length !== 2) return;
      const [a, b] = pair;
      const infoA = rosterToOwner[a.roster_id], infoB = rosterToOwner[b.roster_id];
      if (!infoA || !infoB) return;
      const ptsA = a.points || 0, ptsB = b.points || 0;
      const margin = Math.abs(ptsA - ptsB);
      const combined = ptsA + ptsB;
      const winner = ptsA > ptsB ? infoA : infoB;
      const loser = ptsA > ptsB ? infoB : infoA;
      const winPts = Math.max(ptsA, ptsB), losePts = Math.min(ptsA, ptsB);

      if (!records.biggestBlowout || margin > records.biggestBlowout.margin) {
        records.biggestBlowout = { winner: winner.character, loser: loser.character, winnerId: winner.ownerId, loserId: loser.ownerId, margin, week, winScore: winPts, loseScore: losePts };
      }
      if (margin > 0 && (!records.closestGame || margin < records.closestGame.margin)) {
        records.closestGame = { winner: winner.character, loser: loser.character, winnerId: winner.ownerId, loserId: loser.ownerId, margin, week, winScore: winPts, loseScore: losePts };
      }
      if (!records.highestCombined || combined > records.highestCombined.total) {
        records.highestCombined = { teamA: infoA.character, teamB: infoB.character, total: combined, week, scoreA: ptsA, scoreB: ptsB };
      }
      if (combined > 0 && (!records.lowestCombined || combined < records.lowestCombined.total)) {
        records.lowestCombined = { teamA: infoA.character, teamB: infoB.character, total: combined, week, scoreA: ptsA, scoreB: ptsB };
      }

      // Streak tracking
      [{ info: infoA, won: ptsA > ptsB }, { info: infoB, won: ptsB > ptsA }].forEach(({ info, won }) => {
        if (!streaks[info.ownerId]) streaks[info.ownerId] = { currentWin: 0, currentLose: 0, maxWin: 0, maxLose: 0, maxWinWeeks: '', maxLoseWeeks: '', character: info.character, ownerName: info.ownerName };
        const s = streaks[info.ownerId];
        if (won) {
          s.currentWin++; s.currentLose = 0;
          if (s.currentWin > s.maxWin) { s.maxWin = s.currentWin; s.maxWinWeeks = `W${week - s.currentWin + 1}-W${week}`; }
        } else {
          s.currentLose++; s.currentWin = 0;
          if (s.currentLose > s.maxLose) { s.maxLose = s.currentLose; s.maxLoseWeeks = `W${week - s.currentLose + 1}-W${week}`; }
        }
      });
    });
  }

  // Find best/worst streaks
  let bestWinStreak = null, worstLoseStreak = null;
  Object.entries(streaks).forEach(([ownerId, s]) => {
    records.longestWinStreak[ownerId] = { streak: s.maxWin, weeks: s.maxWinWeeks, character: s.character, ownerName: s.ownerName };
    records.longestLoseStreak[ownerId] = { streak: s.maxLose, weeks: s.maxLoseWeeks, character: s.character, ownerName: s.ownerName };
    if (!bestWinStreak || s.maxWin > bestWinStreak.streak) bestWinStreak = { ownerId, streak: s.maxWin, weeks: s.maxWinWeeks, character: s.character, ownerName: s.ownerName };
    if (!worstLoseStreak || s.maxLose > worstLoseStreak.streak) worstLoseStreak = { ownerId, streak: s.maxLose, weeks: s.maxLoseWeeks, character: s.character, ownerName: s.ownerName };
  });
  records.bestWinStreak = bestWinStreak;
  records.worstLoseStreak = worstLoseStreak;

  return records;
}

// ────────────────────────────────────────────
// Compute MVP (aggregate regular season wins across all leagues)
// ────────────────────────────────────────────
function computeMVP(allRegRecords) {
  // allRegRecords: { cupKey: { rosterId: { wins, losses, fpts } } }
  // Need to map rosterId → ownerId per cup (using rosterToOwner maps)
  // This is called with aggregated data; returns per-owner totals
  const ownerWins = {};
  Object.entries(allRegRecords).forEach(([cupKey, { records, rosterToOwner }]) => {
    Object.entries(records).forEach(([rosterId, rec]) => {
      const info = rosterToOwner[rosterId];
      if (!info) return;
      if (!ownerWins[info.ownerId]) {
        ownerWins[info.ownerId] = { wins: 0, losses: 0, perCup: {}, ownerName: info.ownerName, character: info.character };
      }
      ownerWins[info.ownerId].wins += rec.wins;
      ownerWins[info.ownerId].losses += rec.losses;
      ownerWins[info.ownerId].perCup[cupKey] = { wins: rec.wins, losses: rec.losses };
    });
  });
  return Object.entries(ownerWins)
    .map(([ownerId, data]) => ({ ownerId, ...data }))
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses);
}

// ────────────────────────────────────────────
// Main hook
// ────────────────────────────────────────────
export function useSleeper(season = DEFAULT_SEASON) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Reset data when season changes so pages don't render stale cross-season data
  useEffect(() => {
    setData(null);
  }, [season]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch league settings, rosters, users, brackets for all cups in parallel
      const seasonLeagues = getLeaguesForSeason(season);
      const cupEntries = Object.entries(seasonLeagues);
      const [leagueInfos, rostersAll, usersAll, winnerBrackets, loserBrackets] = await Promise.all([
        Promise.all(cupEntries.map(([, l]) => fetchJSON(`${API}/league/${l.id}`))),
        Promise.all(cupEntries.map(([, l]) => fetchJSON(`${API}/league/${l.id}/rosters`))),
        Promise.all(cupEntries.map(([, l]) => fetchJSON(`${API}/league/${l.id}/users`))),
        Promise.all(cupEntries.map(([, l]) => fetchJSON(`${API}/league/${l.id}/winners_bracket`))),
        Promise.all(cupEntries.map(([, l]) => fetchJSON(`${API}/league/${l.id}/losers_bracket`))),
      ]);

      // 2. Build roster→owner maps for each league
      const cupData = {};
      const allRegRecords = {};

      for (let i = 0; i < cupEntries.length; i++) {
        const [cupKey] = cupEntries[i];
        const leagueInfo = leagueInfos[i];
        const rosters = rostersAll[i];
        const users = usersAll[i];
        const playoffWeekStart = leagueInfo.settings?.playoff_week_start || 15;
        const lastWeek = leagueInfo.settings?.last_scored_leg || 17;

        // user map
        const userMap = {};
        users.forEach(u => { userMap[u.user_id] = u; });

        // roster→owner map
        const rosterToOwner = {};
        rosters.forEach(r => {
          const owner = OWNERS[r.owner_id] || {};
          const user = userMap[r.owner_id] || {};
          rosterToOwner[r.roster_id] = {
            ownerId: r.owner_id,
            ownerName: owner.name || user.display_name || 'Unknown',
            character: owner.character || '?',
            sleeperName: owner.sleeper || user.display_name,
            avatar: user.avatar,
          };
        });

        // 3. Fetch ALL weekly matchups for this league
        const weekNums = [];
        for (let w = 1; w <= lastWeek; w++) weekNums.push(w);
        const matchupResponses = await Promise.all(
          weekNums.map(w => fetchJSON(`${API}/league/${leagueInfo.league_id}/matchups/${w}`).catch(() => []))
        );
        const allMatchups = {};
        weekNums.forEach((w, idx) => { allMatchups[w] = matchupResponses[idx]; });

        // 4. Use Sleeper's official regular season records from roster settings
        // (more accurate than recalculating from matchup points, which can miss stat corrections)
        const regRecords = {};
        rosters.forEach(r => {
          regRecords[r.roster_id] = {
            wins: r.settings?.wins || 0,
            losses: r.settings?.losses || 0,
            fpts: (r.settings?.fpts || 0) + (r.settings?.fpts_decimal || 0) / 100,
          };
        });

        // 5. Compute reg season standings (rank by wins desc, fpts tiebreaker)
        const regStandings = Object.entries(regRecords)
          .map(([rosterId, rec]) => ({ rosterId: Number(rosterId), ...rec, ...rosterToOwner[rosterId] }))
          .sort((a, b) => b.wins - a.wins || b.fpts - a.fpts)
          .map((team, idx) => ({ ...team, regRank: idx + 1, regPoints: REG_SEASON_POINTS[idx + 1] || 0 }));

        // 6. Parse playoff placement from brackets
        const winnerPlacements = parseBracket(winnerBrackets[i], 1);  // 1st-6th
        const loserPlacements = parseBracket(loserBrackets[i], 7);    // 7th-12th
        const allPlacements = { ...winnerPlacements, ...loserPlacements };

        // 7. Build full standings with reg + playoff points
        const fullStandings = regStandings.map(team => {
          const playoffPlace = allPlacements[team.rosterId];
          let playoffPoints = 0;
          if (playoffPlace && playoffPlace <= 6) playoffPoints = PLAYOFF_POINTS[playoffPlace] || 0;
          else if (playoffPlace) playoffPoints = CONSOLATION_POINTS[playoffPlace] || 0;
          return {
            ...team,
            playoffPlace: playoffPlace || null,
            playoffPoints,
            cupPoints: team.regPoints + playoffPoints,
          };
        });

        // 8. Compute weekly top scorers
        const weeklyTopScorers = computeWeeklyTopScorers(allMatchups, rosterToOwner);

        // 9. Find Top Speed winner (season-high single-week score)
        const topSpeed = weeklyTopScorers.reduce((best, w) => (w.points > (best?.points || 0) ? w : best), null);

        // 10. Compute total fpts + fpts against from all weeks
        const totalStats = {};
        Object.values(allMatchups).flat().forEach(m => {
          if (!totalStats[m.roster_id]) totalStats[m.roster_id] = { totalFpts: 0, weeks: 0 };
          totalStats[m.roster_id].totalFpts += m.points || 0;
          totalStats[m.roster_id].weeks++;
        });

        // 11. Compute H2H records for this cup
        const h2hRecords = computeH2H(allMatchups, rosterToOwner, lastWeek);

        // 12. Compute record book for this cup
        const recordBook = computeRecordBook(allMatchups, rosterToOwner, lastWeek);

        cupData[cupKey] = {
          standings: fullStandings,
          allMatchups,
          weeklyTopScorers,
          topSpeed,
          rosterToOwner,
          playoffWeekStart,
          lastWeek,
          totalStats,
          h2hRecords,
          recordBook,
        };

        // Also compute W/L from matchups for weekly top scorers (matchup points still needed there)
        const matchupRecords = computeRegSeasonRecord(allMatchups, playoffWeekStart);
        allRegRecords[cupKey] = { records: regRecords, rosterToOwner };
      }

      // ─── Cross-league computations ───

      // MVP: aggregate regular season wins
      const mvpStandings = computeMVP(allRegRecords);
      const topMvpWins = mvpStandings[0]?.wins || 0;
      const mvpWinners = mvpStandings.filter(m => m.wins === topMvpWins);

      // Top Speed per league + Team Top Speed (highest across all)
      const topSpeeds = {};
      let teamTopSpeed = null;
      Object.entries(cupData).forEach(([cupKey, cd]) => {
        topSpeeds[cupKey] = cd.topSpeed;
        if (!teamTopSpeed || (cd.topSpeed?.points || 0) > teamTopSpeed.points) {
          teamTopSpeed = { ...cd.topSpeed, cup: cupKey };
        }
      });

      // ─── Build overall leaderboard ───
      const ownerTotals = {};
      Object.entries(cupData).forEach(([cupKey, cd]) => {
        cd.standings.forEach(team => {
          if (!ownerTotals[team.ownerId]) {
            ownerTotals[team.ownerId] = {
              ownerId: team.ownerId,
              ownerName: team.ownerName,
              character: team.character,
              sleeperName: team.sleeperName,
              avatar: team.avatar,
              totalRegPoints: 0,
              totalPlayoffPoints: 0,
              totalCupPoints: 0,
              bonusPoints: 0,
              bonusBreakdown: {},
              cups: {},
            };
          }
          const o = ownerTotals[team.ownerId];
          o.cups[cupKey] = {
            regRank: team.regRank,
            regPoints: team.regPoints,
            playoffPlace: team.playoffPlace,
            playoffPoints: team.playoffPoints,
            cupPoints: team.cupPoints,
            wins: team.wins,
            losses: team.losses,
            fpts: team.fpts,
          };
          o.totalRegPoints += team.regPoints;
          o.totalPlayoffPoints += team.playoffPoints;
          o.totalCupPoints += team.cupPoints;
        });
      });

      // Apply bonus: Top Speed per league (+10 each)
      Object.entries(topSpeeds).forEach(([cupKey, ts]) => {
        if (ts?.ownerId && ownerTotals[ts.ownerId]) {
          ownerTotals[ts.ownerId].bonusPoints += BONUS_CONFIG.topSpeedPerLeague;
          ownerTotals[ts.ownerId].totalCupPoints += BONUS_CONFIG.topSpeedPerLeague;
          ownerTotals[ts.ownerId].bonusBreakdown[`${cupKey}TopSpeed`] = BONUS_CONFIG.topSpeedPerLeague;
        }
      });

      // Apply bonus: Team Top Speed (+5)
      if (teamTopSpeed?.ownerId && ownerTotals[teamTopSpeed.ownerId]) {
        ownerTotals[teamTopSpeed.ownerId].bonusPoints += BONUS_CONFIG.teamTopSpeed;
        ownerTotals[teamTopSpeed.ownerId].totalCupPoints += BONUS_CONFIG.teamTopSpeed;
        ownerTotals[teamTopSpeed.ownerId].bonusBreakdown.teamTopSpeed = BONUS_CONFIG.teamTopSpeed;
      }

      // Apply bonus: MVP (+50, split on ties)
      const mvpBonusPer = Math.floor(BONUS_CONFIG.mvpBonus / mvpWinners.length);
      mvpWinners.forEach(m => {
        if (ownerTotals[m.ownerId]) {
          ownerTotals[m.ownerId].bonusPoints += mvpBonusPer;
          ownerTotals[m.ownerId].totalCupPoints += mvpBonusPer;
          ownerTotals[m.ownerId].bonusBreakdown.mvp = mvpBonusPer;
        }
      });

      // Sort leaderboard
      const leaderboard = Object.values(ownerTotals)
        .sort((a, b) => b.totalCupPoints - a.totalCupPoints || b.totalRegPoints - a.totalRegPoints)
        .map((team, idx) => ({ ...team, place: idx + 1 }));

      // ─── Aggregate H2H across all cups ───
      const aggregateH2H = {};
      Object.entries(cupData).forEach(([cupKey, cd]) => {
        Object.entries(cd.h2hRecords).forEach(([idA, opponents]) => {
          if (!aggregateH2H[idA]) aggregateH2H[idA] = {};
          Object.entries(opponents).forEach(([idB, rec]) => {
            if (!aggregateH2H[idA][idB]) aggregateH2H[idA][idB] = { wins: 0, losses: 0, ties: 0, pf: 0, pa: 0, matchups: [] };
            const agg = aggregateH2H[idA][idB];
            agg.wins += rec.wins; agg.losses += rec.losses; agg.ties += rec.ties;
            agg.pf += rec.pf; agg.pa += rec.pa;
            rec.matchups.forEach(m => agg.matchups.push({ ...m, cup: cupKey }));
          });
        });
      });

      // ─── Aggregate record book across all cups ───
      const aggregateRecordBook = {
        highestWeeklyScore: null, lowestWeeklyScore: null,
        biggestBlowout: null, closestGame: null,
        highestCombined: null, lowestCombined: null,
        bestWinStreak: null, worstLoseStreak: null,
      };
      Object.entries(cupData).forEach(([cupKey, cd]) => {
        const rb = cd.recordBook;
        if (rb.highestWeeklyScore && (!aggregateRecordBook.highestWeeklyScore || rb.highestWeeklyScore.points > aggregateRecordBook.highestWeeklyScore.points))
          aggregateRecordBook.highestWeeklyScore = { ...rb.highestWeeklyScore, cup: cupKey };
        if (rb.lowestWeeklyScore && (!aggregateRecordBook.lowestWeeklyScore || rb.lowestWeeklyScore.points < aggregateRecordBook.lowestWeeklyScore.points))
          aggregateRecordBook.lowestWeeklyScore = { ...rb.lowestWeeklyScore, cup: cupKey };
        if (rb.biggestBlowout && (!aggregateRecordBook.biggestBlowout || rb.biggestBlowout.margin > aggregateRecordBook.biggestBlowout.margin))
          aggregateRecordBook.biggestBlowout = { ...rb.biggestBlowout, cup: cupKey };
        if (rb.closestGame && (!aggregateRecordBook.closestGame || rb.closestGame.margin < aggregateRecordBook.closestGame.margin))
          aggregateRecordBook.closestGame = { ...rb.closestGame, cup: cupKey };
        if (rb.highestCombined && (!aggregateRecordBook.highestCombined || rb.highestCombined.total > aggregateRecordBook.highestCombined.total))
          aggregateRecordBook.highestCombined = { ...rb.highestCombined, cup: cupKey };
        if (rb.lowestCombined && (!aggregateRecordBook.lowestCombined || rb.lowestCombined.total < aggregateRecordBook.lowestCombined.total))
          aggregateRecordBook.lowestCombined = { ...rb.lowestCombined, cup: cupKey };
        if (rb.bestWinStreak && (!aggregateRecordBook.bestWinStreak || rb.bestWinStreak.streak > aggregateRecordBook.bestWinStreak.streak))
          aggregateRecordBook.bestWinStreak = { ...rb.bestWinStreak, cup: cupKey };
        if (rb.worstLoseStreak && (!aggregateRecordBook.worstLoseStreak || rb.worstLoseStreak.streak > aggregateRecordBook.worstLoseStreak.streak))
          aggregateRecordBook.worstLoseStreak = { ...rb.worstLoseStreak, cup: cupKey };
      });

      setData({
        cupData,
        leaderboard,
        mvpStandings,
        mvpWinners,
        topSpeeds,
        teamTopSpeed,
        aggregateH2H,
        aggregateRecordBook,
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Sleeper fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [season]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { data, loading, error, lastUpdated, refresh: fetchAll };
}

// Draft data hook (separate to keep initial load fast)
export function useSleeperDraft(cupKey, season = DEFAULT_SEASON) {
  const [draftPicks, setDraftPicks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const seasonLeagues = getLeaguesForSeason(season);
    const league = seasonLeagues[cupKey];
    if (!league?.draftId) { setLoading(false); return; }
    Promise.all([
      fetchJSON(`${API}/draft/${league.draftId}/picks`),
      fetchJSON(`${API}/league/${league.id}/users`),
    ]).then(([picks, users]) => {
      const userMap = {};
      users.forEach(u => { userMap[u.user_id] = u; });
      setDraftPicks(picks.map(p => {
        const owner = OWNERS[p.picked_by] || {};
        const user = userMap[p.picked_by] || {};
        return {
          round: p.round,
          pickNo: p.pick_no,
          rosterId: p.roster_id,
          playerId: p.player_id,
          playerName: `${p.metadata?.first_name || ''} ${p.metadata?.last_name || ''}`.trim(),
          position: p.metadata?.position || '',
          team: p.metadata?.team || '',
          amount: p.metadata?.amount || null,
          pickedBy: p.picked_by,
          ownerName: owner.name || user.display_name || 'Unknown',
          character: owner.character || '?',
        };
      }));
    }).catch(console.error).finally(() => setLoading(false));
  }, [cupKey, season]);

  return { draftPicks, loading };
}

export function useSleeperAvatarUrl(avatarId) {
  if (!avatarId) return null;
  return `https://sleepercdn.com/avatars/thumbs/${avatarId}`;
}
