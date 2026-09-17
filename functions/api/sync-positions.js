// GET /api/sync-positions?week=5
// Commissioner-triggered: builds a player position map from historical matchup starters
// across all leagues, plus attempts the full Sleeper players DB for complete coverage.
// Caches in KV for 30 days. Run once at the start of the season or after roster moves.
//
// Usage: curl https://fantasy-cup.pages.dev/api/sync-positions?week=5

import { LEAGUES, SLEEPER_API, json, handleCors } from './_shared.js';

export async function onRequestOptions() {
  return handleCors();
}

const fetchJSON = async (url) => {
  const r = await fetch(url);
  if (!r.ok) return null;
  return r.json();
};

const EXACT_SLOTS = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB']);

export async function onRequestGet(context) {
  try {
    const { env, request } = context;
    const kv = env?.POWERUPS;
    if (!kv) return json({ error: 'KV namespace not configured' }, 500);

    const url = new URL(request.url);
    const maxWeek = parseInt(url.searchParams.get('week')) || 17;
    const posMap = {};

    // ── Method 1: Build from matchup starters across all leagues and weeks ──
    // This reliably identifies players from the non-FLEX slots they occupy.
    let starterCount = 0;

    for (const [cupKey, league] of Object.entries(LEAGUES)) {
      const leagueInfo = await fetchJSON(`${SLEEPER_API}/league/${league.id}`);
      if (!leagueInfo) continue;

      const rosterPositions = leagueInfo.roster_positions || [];
      const benchTypes = new Set(['BN', 'IR', 'TAXI']);
      const starterSlots = rosterPositions.filter(p => !benchTypes.has(p));

      // Fetch all weeks in parallel for this league
      const weekFetches = [];
      for (let w = 1; w <= maxWeek; w++) {
        weekFetches.push(fetchJSON(`${SLEEPER_API}/league/${league.id}/matchups/${w}`));
      }
      const weekMatchups = await Promise.all(weekFetches);

      for (const matchups of weekMatchups) {
        if (!matchups) continue;
        for (const m of matchups) {
          const starters = m.starters || [];
          starters.forEach((playerId, idx) => {
            if (!playerId || playerId === '0') return;
            const slot = starterSlots[idx];
            if (slot && EXACT_SLOTS.has(slot)) {
              const pid = String(playerId);
              if (!posMap[pid]) starterCount++;
              posMap[pid] = slot;
            }
          });
        }
      }
    }

    // ── Method 2: Try Sleeper full players DB for remaining players ──
    // ~14MB download — may timeout on some Cloudflare plans. Best-effort.
    let fullDbCount = 0;
    try {
      const res = await fetch(`${SLEEPER_API}/players/nfl`);
      if (res.ok) {
        const players = await res.json();
        for (const [id, player] of Object.entries(players)) {
          if (player.position && !posMap[id]) {
            posMap[id] = player.position;
            fullDbCount++;
          }
        }
      }
    } catch {
      // Expected to fail on free-tier Cloudflare; starters-based map is sufficient
    }

    // Cache in KV for 30 days
    await kv.put('player-positions', JSON.stringify(posMap), {
      expirationTtl: 2592000,
    });

    return json({
      success: true,
      totalPlayers: Object.keys(posMap).length,
      fromStarters: starterCount,
      fromFullDb: fullDbCount,
      sample: Object.entries(posMap).slice(0, 10).map(([id, pos]) => ({ id, pos })),
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
