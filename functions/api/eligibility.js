// GET /api/eligibility?week=5
// Auto-detects which owners earned power-up rolls for a given week
// across all 3 leagues using 4 criteria:
//   1. Largest margin of victory
//   2. Top player scorer (including bench) — nullified if NFL-wide top scorer is a FA
//   3. Best roster accuracy (actual vs optimal) — skipped for Best Ball leagues
//   4. Worst optimized score (reverse MPF — consolation roll) — skipped for Best Ball leagues

import { LEAGUES, OWNERS, SLEEPER_API, json, handleCors } from './_shared.js';

export async function onRequestOptions() {
  return handleCors();
}

const fetchJSON = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Sleeper API ${r.status}: ${url}`);
  return r.json();
};

// Compute fantasy points from raw NFL stats using a league's scoring settings
function computeFantasyPoints(playerStats, scoringSettings) {
  let total = 0;
  for (const [stat, value] of Object.entries(playerStats || {})) {
    if (scoringSettings[stat] != null && typeof value === 'number') {
      total += value * scoringSettings[stat];
    }
  }
  return total;
}

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

    // ── Fetch NFL-wide stats for FA check (shared across leagues) ──
    let nflStats = null;
    let nflSeason = null;
    try {
      // Get season from the first league
      const firstLeague = Object.values(LEAGUES)[0];
      const leagueForSeason = await fetchJSON(`${SLEEPER_API}/league/${firstLeague.id}`);
      nflSeason = leagueForSeason.season || '2026';
      nflStats = await fetchJSON(`${SLEEPER_API}/stats/nfl/regular/${nflSeason}/${week}`);
    } catch (err) {
      // If we can't get NFL stats, we'll skip the FA check and fall back to rostered-only
      console.error('Failed to fetch NFL stats for FA check:', err.message);
    }

    const results = {};

    // Process each league in parallel
    await Promise.all(Object.entries(LEAGUES).map(async ([cupKey, league]) => {
      const [matchups, rosterMap, leagueInfo] = await Promise.all([
        fetchJSON(`${SLEEPER_API}/league/${league.id}/matchups/${week}`),
        buildRosterMap(league.id),
        fetchJSON(`${SLEEPER_API}/league/${league.id}`),
      ]);

      if (!matchups || matchups.length === 0) {
        results[cupKey] = { noData: true };
        return;
      }

      const scoringSettings = leagueInfo.scoring_settings || {};
      const isBestBall = league.type === 'bestball';

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
      // Find the top scorer among rostered players
      let topPlayer = { points: 0, playerId: null, roster: null };
      matchups.forEach(m => {
        const pp = m.players_points || {};
        Object.entries(pp).forEach(([playerId, pts]) => {
          if (pts > topPlayer.points) {
            topPlayer = { points: pts, playerId, roster: rosterMap[m.roster_id] || null };
          }
        });
      });

      // FA check: if the NFL-wide top scorer (using this league's scoring) is NOT rostered,
      // no one gets the award — a Free Agent outscored everyone on rosters
      let topPlayerScorerResult = topPlayer.roster ? {
        ownerId: topPlayer.roster.ownerId,
        character: topPlayer.roster.character,
        ownerName: topPlayer.roster.ownerName,
        points: Math.round(topPlayer.points * 100) / 100,
        playerId: topPlayer.playerId,
      } : null;

      let faNote = null;
      if (nflStats && topPlayerScorerResult) {
        // Collect all rostered player IDs across this league's matchups
        const rosteredIds = new Set();
        matchups.forEach(m => {
          (m.players || []).forEach(pid => rosteredIds.add(String(pid)));
        });

        // Find the NFL-wide top scorer using this league's scoring settings
        let nflTopPlayerId = null;
        let nflTopPoints = 0;
        for (const [playerId, stats] of Object.entries(nflStats)) {
          const pts = computeFantasyPoints(stats, scoringSettings);
          if (pts > nflTopPoints) {
            nflTopPoints = pts;
            nflTopPlayerId = playerId;
          }
        }

        // If the NFL top scorer is NOT on any roster in this league, nullify the award
        if (nflTopPlayerId && !rosteredIds.has(String(nflTopPlayerId))) {
          faNote = `FA player ${nflTopPlayerId} scored ${Math.round(nflTopPoints * 100) / 100} pts (top rostered: ${topPlayerScorerResult.points} pts) — no award`;
          topPlayerScorerResult = null;
        }
      }

      // ── Criterion 3: Best Roster Accuracy (actual vs optimal) ──
      // SKIP for Best Ball leagues — lineups are auto-optimized so accuracy is meaningless
      let bestAccuracyResult = null;
      if (!isBestBall) {
        let bestAccuracy = { accuracy: 0, roster: null, actual: 0, optimal: 0 };
        matchups.forEach(m => {
          const starterPts = (m.starters_points || []).reduce((s, p) => s + (p || 0), 0);
          const allPts = Object.values(m.players_points || {});
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

        bestAccuracyResult = bestAccuracy.roster ? {
          ownerId: bestAccuracy.roster.ownerId,
          character: bestAccuracy.roster.character,
          ownerName: bestAccuracy.roster.ownerName,
          accuracy: Math.round(bestAccuracy.accuracy * 10000) / 100,
          actual: Math.round(bestAccuracy.actual * 100) / 100,
          optimal: Math.round(bestAccuracy.optimal * 100) / 100,
        } : null;
      }

      // ── Criterion 4: Worst Optimized Score (reverse MPF — consolation roll) ──
      // SKIP for Best Ball leagues — lineups are auto-optimized
      let worstOptimalResult = null;
      if (!isBestBall) {
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

        worstOptimalResult = worstOptimal.roster ? {
          ownerId: worstOptimal.roster.ownerId,
          character: worstOptimal.roster.character,
          ownerName: worstOptimal.roster.ownerName,
          optimal: Math.round(worstOptimal.optimal * 100) / 100,
        } : null;
      }

      results[cupKey] = {
        marginOfVictory: biggestMargin.winner ? {
          ownerId: biggestMargin.winner.ownerId,
          character: biggestMargin.winner.character,
          ownerName: biggestMargin.winner.ownerName,
          margin: Math.round(biggestMargin.margin * 100) / 100,
        } : null,
        topPlayerScorer: topPlayerScorerResult,
        bestRosterAccuracy: bestAccuracyResult,
        worstOptimalScore: worstOptimalResult,
        // Debug info
        ...(faNote ? { _faNote: faNote } : {}),
        ...(isBestBall ? { _bestBallSkipped: ['bestRosterAccuracy', 'worstOptimalScore'] } : {}),
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
