import { useState, useEffect, useCallback } from 'react';
import { SEASONS, OWNERS, getLeaguesForSeason } from '../data/leagueConfig';

const API = 'https://api.sleeper.app/v1';
const fetchJSON = (url) => fetch(url).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); });

/**
 * Fetches and aggregates stats across ALL seasons for the Record Book and H2H pages.
 * Returns: { h2h, records, seasonRecords, loading, error }
 */
export function useAllTimeStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const allSeasons = Object.keys(SEASONS).sort();
      const h2h = {};          // ownerA → ownerB → { wins, losses, ties, pf, pa, matchups[] }
      const allScores = [];    // every weekly score across all seasons/cups
      const allMatchupPairs = []; // every matchup pair across all seasons/cups
      const ownerStreaks = {}; // track streaks chronologically
      const seasonSummaries = {}; // season → { leaderboard champion, cup winners, etc. }
      const ownerCareerStats = {}; // ownerId → { totalWins, totalLosses, totalFpts, seasons, championships, etc. }

      for (const season of allSeasons) {
        const leagues = getLeaguesForSeason(season);
        const cupEntries = Object.entries(leagues);

        const [leagueInfos, rostersAll, usersAll, winnerBrackets] = await Promise.all([
          Promise.all(cupEntries.map(([, l]) => fetchJSON(`${API}/league/${l.id}`))),
          Promise.all(cupEntries.map(([, l]) => fetchJSON(`${API}/league/${l.id}/rosters`))),
          Promise.all(cupEntries.map(([, l]) => fetchJSON(`${API}/league/${l.id}/users`))),
          Promise.all(cupEntries.map(([, l]) => fetchJSON(`${API}/league/${l.id}/winners_bracket`))),
        ]);

        for (let i = 0; i < cupEntries.length; i++) {
          const [cupKey] = cupEntries[i];
          const leagueInfo = leagueInfos[i];
          const rosters = rostersAll[i];
          const users = usersAll[i];
          const lastWeek = leagueInfo.settings?.last_scored_leg || 17;

          // Build roster→owner map
          const userMap = {};
          users.forEach(u => { userMap[u.user_id] = u; });
          const rosterToOwner = {};
          rosters.forEach(r => {
            const owner = OWNERS[r.owner_id] || {};
            const user = userMap[r.owner_id] || {};
            rosterToOwner[r.roster_id] = {
              ownerId: r.owner_id,
              ownerName: owner.name || user.display_name || 'Unknown',
              character: owner.character || '?',
            };
          });

          // Career stats from roster settings
          rosters.forEach(r => {
            const info = rosterToOwner[r.roster_id];
            if (!info) return;
            if (!ownerCareerStats[info.ownerId]) {
              ownerCareerStats[info.ownerId] = {
                character: info.character, ownerName: info.ownerName,
                totalWins: 0, totalLosses: 0, totalFpts: 0,
                cupWins: 0, cupAppearances: 0, seasons: [],
              };
            }
            const c = ownerCareerStats[info.ownerId];
            c.totalWins += r.settings?.wins || 0;
            c.totalLosses += r.settings?.losses || 0;
            c.totalFpts += (r.settings?.fpts || 0) + (r.settings?.fpts_decimal || 0) / 100;
            if (!c.seasons.includes(season)) c.seasons.push(season);
          });

          // Fetch matchups
          const weekNums = [];
          for (let w = 1; w <= lastWeek; w++) weekNums.push(w);
          const matchupResponses = await Promise.all(
            weekNums.map(w => fetchJSON(`${API}/league/${leagueInfo.league_id}/matchups/${w}`).catch(() => []))
          );

          for (let wIdx = 0; wIdx < weekNums.length; wIdx++) {
            const week = weekNums[wIdx];
            const weekData = matchupResponses[wIdx];
            if (!weekData || weekData.length === 0) continue;

            // Individual scores (skip unplayed weeks)
            weekData.forEach(m => {
              const info = rosterToOwner[m.roster_id];
              if (!info) return;
              const pts = m.points || 0;
              if (pts === 0) return; // skip future/unplayed games
              allScores.push({ ownerId: info.ownerId, character: info.character, ownerName: info.ownerName, week, points: pts, season, cup: cupKey });
            });

            // Matchup pairs
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
              // Skip future/unplayed games (both teams at 0)
              if (ptsA === 0 && ptsB === 0) return;
              const idA = infoA.ownerId, idB = infoB.ownerId;

              allMatchupPairs.push({ idA, idB, ptsA, ptsB, infoA, infoB, week, season, cup: cupKey });

              // H2H
              if (!h2h[idA]) h2h[idA] = {};
              if (!h2h[idA][idB]) h2h[idA][idB] = { wins: 0, losses: 0, ties: 0, pf: 0, pa: 0, matchups: [] };
              if (!h2h[idB]) h2h[idB] = {};
              if (!h2h[idB][idA]) h2h[idB][idA] = { wins: 0, losses: 0, ties: 0, pf: 0, pa: 0, matchups: [] };

              h2h[idA][idB].pf += ptsA; h2h[idA][idB].pa += ptsB;
              h2h[idB][idA].pf += ptsB; h2h[idB][idA].pa += ptsA;
              h2h[idA][idB].matchups.push({ week, season, cup: cupKey, scoreA: ptsA, scoreB: ptsB });
              h2h[idB][idA].matchups.push({ week, season, cup: cupKey, scoreA: ptsB, scoreB: ptsA });

              if (ptsA > ptsB) { h2h[idA][idB].wins++; h2h[idB][idA].losses++; }
              else if (ptsB > ptsA) { h2h[idB][idA].wins++; h2h[idA][idB].losses++; }
              else { h2h[idA][idB].ties++; h2h[idB][idA].ties++; }
            });
          }
        }
      }

      // ─── Compute record book from all matchup pairs ───
      let highestScore = null, lowestScore = null;
      let biggestBlowout = null, closestGame = null;
      let highestCombined = null, lowestCombined = null;

      allScores.forEach(s => {
        if (!highestScore || s.points > highestScore.points) highestScore = s;
        if (s.points > 0 && (!lowestScore || s.points < lowestScore.points)) lowestScore = s;
      });

      allMatchupPairs.forEach(m => {
        const margin = Math.abs(m.ptsA - m.ptsB);
        const combined = m.ptsA + m.ptsB;
        const winner = m.ptsA > m.ptsB ? m.infoA : m.infoB;
        const loser = m.ptsA > m.ptsB ? m.infoB : m.infoA;
        const winPts = Math.max(m.ptsA, m.ptsB), losePts = Math.min(m.ptsA, m.ptsB);

        if (!biggestBlowout || margin > biggestBlowout.margin)
          biggestBlowout = { winner: winner.character, loser: loser.character, winnerId: winner.ownerId, loserId: loser.ownerId, margin, week: m.week, season: m.season, cup: m.cup, winScore: winPts, loseScore: losePts };
        if (margin > 0 && (!closestGame || margin < closestGame.margin))
          closestGame = { winner: winner.character, loser: loser.character, winnerId: winner.ownerId, loserId: loser.ownerId, margin, week: m.week, season: m.season, cup: m.cup, winScore: winPts, loseScore: losePts };
        if (!highestCombined || combined > highestCombined.total)
          highestCombined = { teamA: m.infoA.character, teamB: m.infoB.character, total: combined, week: m.week, season: m.season, cup: m.cup, scoreA: m.ptsA, scoreB: m.ptsB };
        if (combined > 0 && (!lowestCombined || combined < lowestCombined.total))
          lowestCombined = { teamA: m.infoA.character, teamB: m.infoB.character, total: combined, week: m.week, season: m.season, cup: m.cup, scoreA: m.ptsA, scoreB: m.ptsB };
      });

      // Top 10 weekly scores
      const top10Scores = [...allScores].sort((a, b) => b.points - a.points).slice(0, 10);
      const bottom10Scores = [...allScores].filter(s => s.points > 0).sort((a, b) => a.points - b.points).slice(0, 10);

      // Career stats sorted
      const careerLeaders = Object.entries(ownerCareerStats)
        .map(([ownerId, stats]) => ({
          ownerId, ...stats,
          winPct: stats.totalWins / (stats.totalWins + stats.totalLosses) || 0,
          avgFpts: stats.totalFpts / (stats.totalWins + stats.totalLosses) || 0,
        }))
        .sort((a, b) => b.totalWins - a.totalWins);

      setData({
        h2h,
        records: {
          highestScore, lowestScore,
          biggestBlowout, closestGame,
          highestCombined, lowestCombined,
          top10Scores, bottom10Scores,
        },
        careerLeaders,
        ownerCareerStats,
      });
    } catch (err) {
      console.error('All-time stats error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { data, loading, error, refresh: fetchAll };
}
