// GET /api/eligibility?week=5
// Auto-detects which owners earned power-up rolls for a given week
// across all 3 leagues using 4 criteria:
//   1. Largest margin of victory
//   2. Top player scorer (including bench)
//   3. Best roster accuracy (actual vs optimal)
//   4. Worst optimized score (reverse MPF — consolation roll)

import { LEAGUES, OWNERS, SLEEPER_API, json, handleCors } from './_shared.js';

export async function onRequestOptions() {
  return handleCors();
}

const fetchJSON = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Sleeper API ${r.status}: ${url}`);
  return r.json();
};

// Build roster_id → owner mapping for a league
async function buildRosterMap(leagueId) {
  const [rosters, users] = await Promise.all([
    fetchJSON(`${SLEEPER_API}/league/${leagueId}/rosters`),
    fetchJSON(`${SLEEPER_API}/league/${leagueId}/users`),
  ]);
  const userMap = {};
  users.forEach(u => { userMap[u.user_id] = u; });
  const rosterMap = {};
  rosters.forEach(r => {
    const user = userMap[r.owner_id];
    const ownerInfo = OWNERS[r.owner_id];
    if (ownerInfo) {
      rosterMap[r.roster_id] = {
        rosterId: r.roster_id,
        ownerId: r.owner_id,
        ownerName: ownerInfo.name,
        character: ownerInfo.character,
        sleeperName: user?.display_name || ownerInfo.sleeper,
      };
    }
  });
  return rosterMap;
}

export async function onRequestGet({ request }) {
  try {
    const url = new URL(request.url);
    const week = parseInt(url.searchParams.get('week'));
    if (!week || week < 1 || week > 17) {
      return json({ error: 'Valid week (1-17) required' }, 400);
    }

    const results = {};

    // Process each league in parallel
    await Promise.all(Object.entries(LEAGUES).map(async ([cupKey, league]) => {
      const [matchups, rosterMap] = await Promise.all([
        fetchJSON(`${SLEEPER_API}/league/${league.id}/matchups/${week}`),
        buildRosterMap(league.id),
      ]);

      if (!matchups || matchups.length === 0) {
        results[cupKey] = { noData: true };
        return;
      }

      // ── Criterion 1: Largest Margin of Victory ──
      const matchupGroups = {};
      matchups.forEach(m => {
        if (m.matchup_id == null) return;
        if (!matchupGroups[m.matchup_id]) matchupGroups[m.matchup_id] = [];
        matchupGroups[m.matchup_id].push(m);
      });

      let biggestMargin = { margin: 0, winner: null };
      Object.values(matchupGroups).forEach(pair => {
        if (pair.length !== 2) return;
        const [a, b] = pair;
        const margin = Math.abs((a.points || 0) - (b.points || 0));
        const winnerId = (a.points || 0) > (b.points || 0) ? a.roster_id : b.roster_id;
        if (margin > biggestMargin.margin) {
          biggestMargin = { margin, winner: rosterMap[winnerId] || null };
        }
      });

      // ── Criterion 2: Top Player Scorer (including bench) ──
      let topPlayer = { points: 0, playerId: null, roster: null };
      matchups.forEach(m => {
        const pp = m.players_points || {};
        Object.entries(pp).forEach(([playerId, pts]) => {
          if (pts > topPlayer.points) {
            topPlayer = { points: pts, playerId, roster: rosterMap[m.roster_id] || null };
          }
        });
      });

      // ── Criterion 3: Best Roster Accuracy (actual vs optimal) ──
      // Accuracy = actual starter points / optimal possible starter points
      // We need to figure out the number of starters from the matchup data
      let bestAccuracy = { accuracy: 0, roster: null, actual: 0, optimal: 0 };
      matchups.forEach(m => {
        const starterPts = (m.starters_points || []).reduce((s, p) => s + (p || 0), 0);
        const allPts = Object.values(m.players_points || {});
        // Optimal = top N scores from all players, where N = number of starters
        const numStarters = (m.starters || []).length;
        const sorted = [...allPts].sort((a, b) => b - a);
        const optimalPts = sorted.slice(0, numStarters).reduce((s, p) => s + (p || 0), 0);

        if (optimalPts > 0) {
          const accuracy = starterPts / optimalPts;
          if (accuracy > bestAccuracy.accuracy) {
            bestAccuracy = {
              accuracy,
              roster: rosterMap[m.roster_id] || null,
              actual: starterPts,
              optimal: optimalPts,
            };
          }
        }
      });

      // ── Criterion 4: Worst Optimized Score (reverse MPF — consolation roll) ──
      // The team whose best possible lineup was the lowest
      let worstOptimal = { optimal: Infinity, roster: null };
      matchups.forEach(m => {
        const allPts = Object.values(m.players_points || {});
        const numStarters = (m.starters || []).length;
        const sorted = [...allPts].sort((a, b) => b - a);
        const optimalPts = sorted.slice(0, numStarters).reduce((s, p) => s + (p || 0), 0);

        if (optimalPts < worstOptimal.optimal && optimalPts > 0) {
          worstOptimal = { optimal: optimalPts, roster: rosterMap[m.roster_id] || null };
        }
      });

      results[cupKey] = {
        marginOfVictory: biggestMargin.winner ? {
          ownerId: biggestMargin.winner.ownerId,
          character: biggestMargin.winner.character,
          ownerName: biggestMargin.winner.ownerName,
          margin: Math.round(biggestMargin.margin * 100) / 100,
        } : null,
        topPlayerScorer: topPlayer.roster ? {
          ownerId: topPlayer.roster.ownerId,
          character: topPlayer.roster.character,
          ownerName: topPlayer.roster.ownerName,
          points: Math.round(topPlayer.points * 100) / 100,
          playerId: topPlayer.playerId,
        } : null,
        bestRosterAccuracy: bestAccuracy.roster ? {
          ownerId: bestAccuracy.roster.ownerId,
          character: bestAccuracy.roster.character,
          ownerName: bestAccuracy.roster.ownerName,
          accuracy: Math.round(bestAccuracy.accuracy * 10000) / 100, // as %
          actual: Math.round(bestAccuracy.actual * 100) / 100,
          optimal: Math.round(bestAccuracy.optimal * 100) / 100,
        } : null,
        worstOptimalScore: worstOptimal.roster ? {
          ownerId: worstOptimal.roster.ownerId,
          character: worstOptimal.roster.character,
          ownerName: worstOptimal.roster.ownerName,
          optimal: Math.round(worstOptimal.optimal * 100) / 100,
        } : null,
      };
    }));

    // ── Aggregate: deduplicate owners across leagues ──
    const eligible = {};  // ownerId → Set of reasons
    Object.entries(results).forEach(([cupKey, cup]) => {
      if (cup.noData) return;
      const criteria = [
        { key: 'marginOfVictory', label: `${cupKey} — Largest Margin of Victory` },
        { key: 'topPlayerScorer', label: `${cupKey} — Top Player Scorer` },
        { key: 'bestRosterAccuracy', label: `${cupKey} — Best Roster Accuracy` },
        { key: 'worstOptimalScore', label: `${cupKey} — Worst Optimized Score (Consolation)` },
      ];
      criteria.forEach(({ key, label }) => {
        const winner = cup[key];
        if (winner?.ownerId) {
          if (!eligible[winner.ownerId]) {
            eligible[winner.ownerId] = {
              ownerId: winner.ownerId,
              character: winner.character,
              ownerName: winner.ownerName,
              reasons: [],
            };
          }
          eligible[winner.ownerId].reasons.push(label);
        }
      });
    });

    // Cap at 3 rolls per owner per rules
    Object.values(eligible).forEach(e => {
      e.rollsEarned = Math.min(e.reasons.length, 3);
    });

    return json({
      week,
      perCup: results,
      eligible: Object.values(eligible),
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
