// GET /api/eligibility?week=5
// Auto-detects which owners earned power-up rolls for a given week
// across all 3 leagues using 4 criteria:
//   1. Largest margin of victory
//   2. Top player scorer (including bench) — nullified if NFL-wide top scorer is a FA
//   3. Best roster accuracy (actual vs optimal) — skipped for Best Ball leagues
//   4. Worst optimized score (reverse MPF — consolation roll) — skipped for Best Ball leagues
//
// Optimal lineup calculation uses positional constraints (QB/RB/WR/TE/FLEX)
// by caching the Sleeper player position database in KV.

import { LEAGUES, OWNERS, SLEEPER_API, json, handleCors } from './_shared.js';

export async function onRequestOptions() {
  return handleCors();
}

const fetchJSON = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Sleeper API ${r.status}: ${url}`);
  return r.json();
};

// ── Player Position Cache ──
// Fetches the Sleeper players DB (~14MB), extracts player_id → position map (~131KB),
// and caches it in KV for 7 days. Positions rarely change mid-season.
async function getPlayerPositions(kv) {
  if (!kv) return null;

  const CACHE_KEY = 'player-positions';
  const CACHE_TTL = 604800; // 7 days

  // Check cache first
  try {
    const cached = await kv.get(CACHE_KEY, 'json');
    if (cached) return cached;
  } catch { /* cache miss */ }

  // Fetch from Sleeper and extract position map
  try {
    const res = await fetch(`${SLEEPER_API}/players/nfl`);
    if (!res.ok) return null;

    const players = await res.json();
    const posMap = {};
    for (const [id, player] of Object.entries(players)) {
      if (player.position) {
        posMap[id] = player.position;
      }
    }

    // Cache the small map (not the full 14MB response)
    await kv.put(CACHE_KEY, JSON.stringify(posMap), { expirationTtl: CACHE_TTL });
    return posMap;
  } catch (err) {
    console.error('Failed to fetch player positions:', err.message);
    return null;
  }
}

// ── Position-Aware Optimal Lineup ──
// Uses a greedy algorithm: process players highest-to-lowest, assign to their
// exact positional slot first, then try flex-type slots. This is optimal because
// higher-scoring players always get priority for the most constrained slot.
//
// FLEX eligibility: RB, WR, TE
// SUPER_FLEX eligibility: QB, RB, WR, TE
// REC_FLEX: WR, TE
// WRRB_FLEX: WR, RB

const FLEX_ELIGIBLE = {
  'FLEX':       new Set(['RB', 'WR', 'TE']),
  'SUPER_FLEX': new Set(['QB', 'RB', 'WR', 'TE']),
  'REC_FLEX':   new Set(['WR', 'TE']),
  'WRRB_FLEX':  new Set(['WR', 'RB']),
  'IDP_FLEX':   new Set(['DL', 'LB', 'DB']),
};

// Order: most restrictive flex slots first, so we save the flexible ones for later
const FLEX_ORDER = ['REC_FLEX', 'WRRB_FLEX', 'FLEX', 'SUPER_FLEX', 'IDP_FLEX'];

function computePositionalOptimal(playersPoints, positionMap, rosterPositions) {
  // Starter slots only (exclude bench, IR, taxi)
  const benchTypes = new Set(['BN', 'IR', 'TAXI']);
  const starterSlots = rosterPositions.filter(p => !benchTypes.has(p));

  // Build player list with positions and points, sorted highest-first
  const players = Object.entries(playersPoints)
    .map(([id, pts]) => ({ id, pts, pos: positionMap[id] || null }))
    .filter(p => p.pos && p.pts != null)
    .sort((a, b) => b.pts - a.pts);

  // Count available slots per position type
  const remaining = {};
  starterSlots.forEach(s => { remaining[s] = (remaining[s] || 0) + 1; });

  // Greedy assignment
  let total = 0;
  const assigned = new Set();

  for (const player of players) {
    if (assigned.has(player.id)) continue;

    // Try exact position slot first
    if (remaining[player.pos] && remaining[player.pos] > 0) {
      remaining[player.pos]--;
      total += player.pts;
      assigned.add(player.id);
      continue;
    }

    // Try flex-type slots (most restrictive first to preserve flexibility)
    for (const flexType of FLEX_ORDER) {
      if (remaining[flexType] && remaining[flexType] > 0 && FLEX_ELIGIBLE[flexType]?.has(player.pos)) {
        remaining[flexType]--;
        total += player.pts;
        assigned.add(player.id);
        break;
      }
    }
  }

  return Math.round(total * 100) / 100;
}

// Fallback: position-agnostic "top N" optimal (used when position data unavailable)
function computeSimpleOptimal(playersPoints, numStarters) {
  const sorted = Object.values(playersPoints).sort((a, b) => b - a);
  return Math.round(sorted.slice(0, numStarters).reduce((s, p) => s + (p || 0), 0) * 100) / 100;
}

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

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const kv = env?.POWERUPS || null;
    const url = new URL(request.url);
    const week = parseInt(url.searchParams.get('week'));
    if (!week || week < 1 || week > 17) {
      return json({ error: 'Valid week (1-17) required' }, 400);
    }

    // ── Pre-fetch shared data ──
    // 1. NFL-wide stats for FA check (shared across leagues)
    let nflStats = null;
    let nflSeason = null;
    try {
      const firstLeague = Object.values(LEAGUES)[0];
      const leagueForSeason = await fetchJSON(`${SLEEPER_API}/league/${firstLeague.id}`);
      nflSeason = leagueForSeason.season || '2026';
      nflStats = await fetchJSON(`${SLEEPER_API}/stats/nfl/regular/${nflSeason}/${week}`);
    } catch (err) {
      console.error('Failed to fetch NFL stats for FA check:', err.message);
    }

    // 2. Player position map for positional optimal (cached in KV)
    let positionMap = null;
    try {
      positionMap = await getPlayerPositions(kv);
    } catch (err) {
      console.error('Failed to get player positions:', err.message);
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
      const rosterPositions = leagueInfo.roster_positions || [];
      const isBestBall = league.type === 'bestball';

      // Starter count (for fallback calculation)
      const benchTypes = new Set(['BN', 'IR', 'TAXI']);
      const numStarters = rosterPositions.filter(p => !benchTypes.has(p)).length;

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

      // FA check: if NFL-wide top scorer is NOT rostered, no one gets the award
      let topPlayerScorerResult = topPlayer.roster ? {
        ownerId: topPlayer.roster.ownerId,
        character: topPlayer.roster.character,
        ownerName: topPlayer.roster.ownerName,
        points: Math.round(topPlayer.points * 100) / 100,
        playerId: topPlayer.playerId,
      } : null;

      let faNote = null;
      if (nflStats && topPlayerScorerResult) {
        const rosteredIds = new Set();
        matchups.forEach(m => {
          (m.players || []).forEach(pid => rosteredIds.add(String(pid)));
        });

        let nflTopPlayerId = null;
        let nflTopPoints = 0;
        for (const [playerId, stats] of Object.entries(nflStats)) {
          const pts = computeFantasyPoints(stats, scoringSettings);
          if (pts > nflTopPoints) {
            nflTopPoints = pts;
            nflTopPlayerId = playerId;
          }
        }

        if (nflTopPlayerId && !rosteredIds.has(String(nflTopPlayerId))) {
          faNote = `FA player ${nflTopPlayerId} scored ${Math.round(nflTopPoints * 100) / 100} pts (top rostered: ${topPlayerScorerResult.points} pts) — no award`;
          topPlayerScorerResult = null;
        }
      }

      // ── Criterion 3: Best Roster Accuracy (skip for Best Ball) ──
      let bestAccuracyResult = null;
      if (!isBestBall) {
        let bestAccuracy = { accuracy: 0, roster: null, actual: 0, optimal: 0 };
        matchups.forEach(m => {
          const starterPts = (m.starters_points || []).reduce((s, p) => s + (p || 0), 0);
          const pp = m.players_points || {};

          // Compute optimal: position-aware if possible, fallback to top-N
          const optimalPts = positionMap
            ? computePositionalOptimal(pp, positionMap, rosterPositions)
            : computeSimpleOptimal(pp, numStarters);

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

      // ── Criterion 4: Worst Optimized Score (skip for Best Ball) ──
      let worstOptimalResult = null;
      if (!isBestBall) {
        let worstOptimal = { optimal: Infinity, roster: null };
        matchups.forEach(m => {
          const pp = m.players_points || {};

          const optimalPts = positionMap
            ? computePositionalOptimal(pp, positionMap, rosterPositions)
            : computeSimpleOptimal(pp, numStarters);

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
        ...(faNote ? { _faNote: faNote } : {}),
        ...(isBestBall ? { _bestBallSkipped: ['bestRosterAccuracy', 'worstOptimalScore'] } : {}),
        _positionAware: !!positionMap,
      };
    }));

    // ── Aggregate: deduplicate owners across leagues ──
    const eligible = {};
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
