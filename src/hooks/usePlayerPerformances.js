import { useMemo } from 'react';
import { usePlayerDB } from './usePlayerDB';

/**
 * Extract top NFL player performances from Sleeper matchup data.
 *
 * @param {object} cupData - The cupData object from useSleeper (keyed by cup name)
 * @returns {{ loading, players, weeklyTop, seasonTop, weeks, positions }}
 */
export function usePlayerPerformances(cupData) {
  const { playerDB, loading } = usePlayerDB();

  const result = useMemo(() => {
    if (!playerDB || !cupData) {
      return { weeklyTop: {}, seasonTop: [], weeks: [], positions: [] };
    }

    const cups = Object.keys(cupData);
    // playerWeekScores[playerId][week] = { points, cupKey, ownerId, ownerName, character, isStarter }
    const playerWeekScores = {};
    // seasonAgg[playerId] = { totalPts, gamesPlayed, weeklyScores: [], bestWeek, bestPts, owners: Set }
    const seasonAgg = {};
    const weekSet = new Set();

    for (const cupKey of cups) {
      const cup = cupData[cupKey];
      if (!cup?.allMatchups) continue;

      // Use the rosterToOwner map already computed by useSleeper, or rebuild from standings
      let rosterToOwner = cup.rosterToOwner || {};
      if (!Object.keys(rosterToOwner).length && cup.standings) {
        rosterToOwner = {};
        cup.standings.forEach(s => {
          rosterToOwner[s.rosterId] = {
            ownerId: s.ownerId,
            ownerName: s.ownerName,
            character: s.character,
          };
        });
      }

      for (const [weekStr, matchups] of Object.entries(cup.allMatchups)) {
        const week = parseInt(weekStr, 10);
        weekSet.add(week);

        for (const m of matchups) {
          if (!m.players_points) continue;
          const owner = rosterToOwner[m.roster_id] || {};
          const starterSet = new Set(m.starters || []);

          for (const [pid, pts] of Object.entries(m.players_points)) {
            if (pts == null || pts <= 0) continue;
            const p = playerDB[pid];
            if (!p) continue;

            // Track best performance per player per week (across cups)
            if (!playerWeekScores[pid]) playerWeekScores[pid] = {};
            const existing = playerWeekScores[pid][week];
            if (!existing || pts > existing.points) {
              playerWeekScores[pid][week] = {
                points: pts,
                cupKey,
                ownerId: owner.ownerId,
                ownerName: owner.ownerName,
                character: owner.character,
                isStarter: starterSet.has(pid),
              };
            }

            // Season aggregation
            if (!seasonAgg[pid]) {
              seasonAgg[pid] = {
                totalPts: 0,
                gamesPlayed: 0,
                weeklyScores: [],
                bestWeek: 0,
                bestPts: 0,
                owners: new Set(),
              };
            }
            // Only count each player's best score per week (not duplicate across cups)
          }
        }
      }
    }

    // Now build season aggregations from the deduplicated playerWeekScores
    for (const [pid, weeks] of Object.entries(playerWeekScores)) {
      const agg = seasonAgg[pid] || {
        totalPts: 0, gamesPlayed: 0, weeklyScores: [], bestWeek: 0, bestPts: 0, owners: new Set(),
      };
      for (const [weekStr, data] of Object.entries(weeks)) {
        const week = parseInt(weekStr, 10);
        agg.totalPts += data.points;
        agg.gamesPlayed++;
        agg.weeklyScores.push({ week, points: data.points });
        if (data.points > agg.bestPts) {
          agg.bestPts = data.points;
          agg.bestWeek = week;
        }
        if (data.character) agg.owners.add(data.character);
      }
      seasonAgg[pid] = agg;
    }

    // Build sorted weekly top performers
    const weeks = Array.from(weekSet).sort((a, b) => a - b);
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

    const weeklyTop = {};
    for (const week of weeks) {
      const performers = [];
      for (const [pid, weekMap] of Object.entries(playerWeekScores)) {
        const entry = weekMap[week];
        if (!entry) continue;
        const p = playerDB[pid];
        if (!p) continue;
        performers.push({
          playerId: pid,
          name: p.pos === 'DEF' ? `${p.fn} ${p.ln}`.trim() : `${p.fn} ${p.ln}`.trim(),
          position: p.pos,
          team: p.team,
          points: entry.points,
          cupKey: entry.cupKey,
          ownerName: entry.ownerName,
          character: entry.character,
          isStarter: entry.isStarter,
        });
      }
      performers.sort((a, b) => b.points - a.points);
      weeklyTop[week] = performers.slice(0, 50); // keep top 50 per week
    }

    // Build season leaders
    const seasonTop = [];
    for (const [pid, agg] of Object.entries(seasonAgg)) {
      const p = playerDB[pid];
      if (!p || agg.gamesPlayed === 0) continue;
      // Compute trend (last 3 weeks vs prior 3)
      const sorted = agg.weeklyScores.sort((a, b) => b.week - a.week);
      const recent3 = sorted.slice(0, 3);
      const prior3 = sorted.slice(3, 6);
      const recentAvg = recent3.length ? recent3.reduce((s, w) => s + w.points, 0) / recent3.length : 0;
      const priorAvg = prior3.length ? prior3.reduce((s, w) => s + w.points, 0) / prior3.length : 0;
      const trend = prior3.length ? recentAvg - priorAvg : 0;

      seasonTop.push({
        playerId: pid,
        name: `${p.fn} ${p.ln}`.trim(),
        position: p.pos,
        team: p.team,
        totalPts: agg.totalPts,
        gamesPlayed: agg.gamesPlayed,
        avgPts: agg.totalPts / agg.gamesPlayed,
        bestWeek: agg.bestWeek,
        bestPts: agg.bestPts,
        trend,
        owners: Array.from(agg.owners),
      });
    }
    seasonTop.sort((a, b) => b.totalPts - a.totalPts);

    return { weeklyTop, seasonTop: seasonTop.slice(0, 100), weeks, positions };
  }, [playerDB, cupData]);

  return { loading, ...result };
}
