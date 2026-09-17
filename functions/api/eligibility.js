// GET /api/eligibility?week=5
// Auto-detects which owners earned power-up rolls for a given week
// across all 3 leagues using 4 criteria:
//   1. Largest margin of victory
//   2. Top player scorer (including bench) — nullified if a Free Agent outscored all rostered players
//   3. Best roster accuracy (actual vs optimal) — skipped for Best Ball leagues
//   4. Worst optimized score (lowest optimal lineup — consolation roll) — skipped for Best Ball leagues
//
// Optimal lineup uses positional constraints (QB/RB/WR/TE/FLEX).
// Position data: KV cache → inferred from starters + NFL stats (QBs detected via passing stats).

import { LEAGUES, OWNERS, SLEEPER_API, json, handleCors } from './_shared.js';

export async function onRequestOptions() {
  return handleCors();
}

const fetchJSON = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Sleeper API ${r.status}: ${url}`);
  return r.json();
};

// ── Player Position Cache (from sync-positions endpoint) ──
async function getPlayerPositions(kv) {
  if (!kv) return null;
  try {
    const cached = await kv.get('player-positions', 'json');
    if (cached && Object.keys(cached).length > 100) return cached;
  } catch {}
  return null;
}

// ── Build Position Map from Starter Slots ──
// Scans starters across ALL leagues to infer positions from non-FLEX slots.
// A player in a QB slot is a QB, in an RB slot is an RB, etc.
const EXACT_SLOTS = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB']);

function buildPositionMapFromStarters(leagueMatchups) {
  const posMap = {};
  for (const { matchups, starterSlots } of leagueMatchups) {
    for (const m of matchups) {
      const starters = m.starters || [];
      starters.forEach((playerId, idx) => {
        if (!playerId || playerId === '0') return;
        const slot = starterSlots[idx];
        if (slot && EXACT_SLOTS.has(slot)) {
          posMap[String(playerId)] = slot;
        }
      });
    }
  }
  return posMap;
}

// ── Position-Aware Optimal Lineup ──
// Greedy algorithm: process players highest-to-lowest.
// Exact position slot first, then flex-type slots (most restrictive first).
// Unknown-position players can only fill FLEX slots (safe default for RB/WR/TE).
const FLEX_ELIGIBLE = {
  'FLEX':       new Set(['RB', 'WR', 'TE']),
  'SUPER_FLEX': new Set(['QB', 'RB', 'WR', 'TE']),
  'REC_FLEX':   new Set(['WR', 'TE']),
  'WRRB_FLEX':  new Set(['WR', 'RB']),
  'IDP_FLEX':   new Set(['DL', 'LB', 'DB']),
};
const FLEX_ORDER = ['REC_FLEX', 'WRRB_FLEX', 'FLEX', 'SUPER_FLEX', 'IDP_FLEX'];

function computePositionalOptimal(playersPoints, positionMap, rosterPositions, nflStats) {
  const benchTypes = new Set(['BN', 'IR', 'TAXI']);
  const starterSlots = rosterPositions.filter(p => !benchTypes.has(p));

  // Build player list with positions, sorted highest-first
  const players = Object.entries(playersPoints)
    .map(([id, pts]) => {
      let pos = positionMap[id] || null;
      // For unknown positions, use NFL stats to detect QBs (pass_att >= 5)
      if (!pos && nflStats) {
        const stats = nflStats[id];
        if (stats && (stats.pass_att || 0) >= 5) {
          pos = 'QB';
        }
      }
      return { id, pts: pts || 0, pos };
    })
    .filter(p => p.pts > 0)
    .sort((a, b) => b.pts - a.pts);

  // Count available slots
  const remaining = {};
  starterSlots.forEach(s => { remaining[s] = (remaining[s] || 0) + 1; });

  let total = 0;
  const assigned = new Set();

  for (const player of players) {
    if (assigned.has(player.id)) continue;

    if (player.pos) {
      // Known position — try exact slot first
      if ((remaining[player.pos] || 0) > 0) {
        remaining[player.pos]--;
        total += player.pts;
        assigned.add(player.id);
        continue;
      }
      // Try flex slots (most restrictive first to preserve flexibility)
      for (const flexType of FLEX_ORDER) {
        if ((remaining[flexType] || 0) > 0 && FLEX_ELIGIBLE[flexType]?.has(player.pos)) {
          remaining[flexType]--;
          total += player.pts;
          assigned.add(player.id);
          break;
        }
      }
    } else {
      // Unknown position (likely RB/WR/TE) — only try FLEX slots
      for (const flexType of FLEX_ORDER) {
        if ((remaining[flexType] || 0) > 0) {
          remaining[flexType]--;
          total += player.pts;
          assigned.add(player.id);
          break;
        }
      }
    }
  }

  return Math.round(total * 100) / 100;
}

// Compute fantasy points from raw NFL stats using scoring settings.
// Only used for the FA check (non-rostered players).
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

    // ── Step 1: Fetch season info, then NFL stats + all league data in parallel ──
    const firstLeagueId = Object.values(LEAGUES)[0].id;
    const leagueForSeason = await fetchJSON(`${SLEEPER_API}/league/${firstLeagueId}`);
    const nflSeason = leagueForSeason.season || '2026';

    const leagueData = {};
    const [nflStats, ...leagueResults] = await Promise.all([
      fetchJSON(`${SLEEPER_API}/stats/nfl/regular/${nflSeason}/${week}`).catch(() => null),
      ...Object.entries(LEAGUES).map(async ([cupKey, league]) => {
        const [matchups, rosterMap, leagueInfo] = await Promise.all([
          fetchJSON(`${SLEEPER_API}/league/${league.id}/matchups/${week}`),
          buildRosterMap(league.id),
          fetchJSON(`${SLEEPER_API}/league/${league.id}`),
        ]);
        return { cupKey, league, matchups, rosterMap, leagueInfo };
      }),
    ]);
    for (const ld of leagueResults) leagueData[ld.cupKey] = ld;

    // ── Step 2: Build position map ──
    let positionMap = await getPlayerPositions(kv);
    let posSource = positionMap ? 'kv-cache' : null;

    if (!positionMap) {
      // Build from all leagues' current-week starters (non-FLEX slots)
      const leagueMatchups = Object.values(leagueData).map(ld => {
        const rp = ld.leagueInfo.roster_positions || [];
        const benchTypes = new Set(['BN', 'IR', 'TAXI']);
        return { matchups: ld.matchups, starterSlots: rp.filter(p => !benchTypes.has(p)) };
      });

      // Also fetch up to 3 previous weeks for better coverage (players on bench now may have started before)
      const histWeeks = Math.min(3, week - 1);
      if (histWeeks > 0) {
        const histFetches = [];
        for (const ld of Object.values(leagueData)) {
          const rp = ld.leagueInfo.roster_positions || [];
          const benchTypes = new Set(['BN', 'IR', 'TAXI']);
          const slots = rp.filter(p => !benchTypes.has(p));
          for (let w = week - histWeeks; w < week; w++) {
            histFetches.push(
              fetchJSON(`${SLEEPER_API}/league/${ld.league.id}/matchups/${w}`)
                .then(m => ({ matchups: m, starterSlots: slots }))
                .catch(() => null)
            );
          }
        }
        const histResults = (await Promise.all(histFetches)).filter(Boolean);
        leagueMatchups.push(...histResults);
      }

      positionMap = buildPositionMapFromStarters(leagueMatchups);
      posSource = `starters-${Object.keys(positionMap).length}`;
    }

    // ── Step 3: Process each league ──
    const results = {};

    for (const [cupKey, data] of Object.entries(leagueData)) {
      const { league, matchups, rosterMap, leagueInfo } = data;

      if (!matchups || matchups.length === 0) {
        results[cupKey] = { noData: true };
        continue;
      }

      const scoringSettings = leagueInfo.scoring_settings || {};
      const rosterPositions = leagueInfo.roster_positions || [];
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
      // Uses Sleeper's actual scoring from players_points (accurate, no recomputation)
      let topPlayer = { points: 0, playerId: null, roster: null };
      matchups.forEach(m => {
        const pp = m.players_points || {};
        Object.entries(pp).forEach(([playerId, pts]) => {
          if (pts > topPlayer.points) {
            topPlayer = { points: pts, playerId, roster: rosterMap[m.roster_id] || null };
          }
        });
      });

      let topPlayerScorerResult = topPlayer.roster ? {
        ownerId: topPlayer.roster.ownerId,
        character: topPlayer.roster.character,
        ownerName: topPlayer.roster.ownerName,
        points: Math.round(topPlayer.points * 100) / 100,
        playerId: topPlayer.playerId,
      } : null;

      // FA check: find the highest-scoring FREE AGENT and only nullify
      // if they clearly outscored the top rostered player.
      // We compare FA computed points against the rostered player's actual Sleeper score.
      let faNote = null;
      if (nflStats && topPlayerScorerResult) {
        // Collect all rostered player IDs in this league
        const rosteredIds = new Set();
        matchups.forEach(m => {
          (m.players || []).forEach(pid => rosteredIds.add(String(pid)));
        });

        // Find the highest-scoring non-rostered INDIVIDUAL player
        // Skip team defenses (TEAM_CHI, TEAM_DAL, etc.) — these leagues have no DEF slot
        let faTopPoints = 0;
        let faTopPlayerId = null;
        for (const [playerId, stats] of Object.entries(nflStats)) {
          if (!/^\d+$/.test(playerId)) continue; // skip non-player entities (team DEF, etc.)
          if (rosteredIds.has(String(playerId))) continue; // skip rostered
          const pts = computeFantasyPoints(stats, scoringSettings);
          if (pts > faTopPoints) {
            faTopPoints = pts;
            faTopPlayerId = playerId;
          }
        }

        // Only nullify with a confidence margin (accounts for scoring computation differences)
        const margin = Math.max(3, topPlayerScorerResult.points * 0.05);
        if (faTopPlayerId && faTopPoints > topPlayerScorerResult.points + margin) {
          faNote = `FA ${faTopPlayerId} scored ~${Math.round(faTopPoints * 100) / 100} pts vs rostered top ${topPlayerScorerResult.points} pts — no award`;
          topPlayerScorerResult = null;
        } else if (faTopPlayerId && faTopPoints > topPlayerScorerResult.points) {
          faNote = `FA ${faTopPlayerId} ~${Math.round(faTopPoints * 100) / 100} pts (within margin of ${topPlayerScorerResult.points}) — award preserved`;
        }
      }

      // ── Criterion 3: Best Roster Accuracy (skip for Best Ball) ──
      let bestAccuracyResult = null;
      if (!isBestBall) {
        let bestAccuracy = { accuracy: 0, roster: null, actual: 0, optimal: 0 };
        matchups.forEach(m => {
          const starterPts = (m.starters_points || []).reduce((s, p) => s + (p || 0), 0);
          const pp = m.players_points || {};
          const optimalPts = computePositionalOptimal(pp, positionMap, rosterPositions, nflStats);

          if (optimalPts > 0) {
            const accuracy = starterPts / optimalPts;
            if (accuracy > bestAccuracy.accuracy) {
              bestAccuracy = { accuracy, roster: rosterMap[m.roster_id] || null, actual: starterPts, optimal: optimalPts };
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

      // ── Criterion 4: Worst Optimal Score (skip for Best Ball) ──
      // The team with the LOWEST optimal lineup — worst possible MPF.
      let worstOptimalResult = null;
      if (!isBestBall) {
        let worstOptimal = { optimal: Infinity, roster: null };
        matchups.forEach(m => {
          const pp = m.players_points || {};
          const optimalPts = computePositionalOptimal(pp, positionMap, rosterPositions, nflStats);

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
        _positionSource: posSource,
      };
    }

    // ── Step 4: Aggregate eligible owners ──
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

    Object.values(eligible).forEach(e => {
      e.rollsEarned = Math.min(e.reasons.length, 3);
    });

    return json({ week, perCup: results, eligible: Object.values(eligible) });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
