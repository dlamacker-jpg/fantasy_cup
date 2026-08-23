// POST /api/auto-roll?week=5
// Cron-triggered (or manual) endpoint that:
//   1. Detects eligibility for the given week
//   2. Auto-rolls power-ups for all eligible owners
//   3. Logs everything to a weekly auto-roll record in KV
//
// Can also be triggered manually by commissioner for a missed week.
// Idempotent: skips owners who already got their rolls for this week.

import { LEAGUES, OWNERS, POWER_UPS, SLEEPER_API, rollPowerUpWeighted, json, handleCors } from './_shared.js';

export async function onRequestOptions() {
  return handleCors();
}

const fetchJSON = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Sleeper API ${r.status}: ${url}`);
  return r.json();
};

// Uses rollPowerUpWeighted from _shared.js

// ─── Build roster map for a league ───
async function buildRosterMap(leagueId) {
  const [rosters, users] = await Promise.all([
    fetchJSON(`${SLEEPER_API}/league/${leagueId}/rosters`),
    fetchJSON(`${SLEEPER_API}/league/${leagueId}/users`),
  ]);
  const userMap = {};
  users.forEach(u => { userMap[u.user_id] = u; });
  const rosterMap = {};
  rosters.forEach(r => {
    const ownerInfo = OWNERS[r.owner_id];
    if (ownerInfo) {
      rosterMap[r.roster_id] = {
        rosterId: r.roster_id,
        ownerId: r.owner_id,
        ownerName: ownerInfo.name,
        character: ownerInfo.character,
      };
    }
  });
  return rosterMap;
}

// ─── Detect eligibility (same logic as eligibility.js) ───
async function detectEligibility(week) {
  const eligible = {};

  await Promise.all(Object.entries(LEAGUES).map(async ([cupKey, league]) => {
    const [matchups, rosterMap] = await Promise.all([
      fetchJSON(`${SLEEPER_API}/league/${league.id}/matchups/${week}`),
      buildRosterMap(league.id),
    ]);

    if (!matchups || matchups.length === 0) return;

    // Margin of victory
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

    // Top player scorer
    let topPlayer = { points: 0, roster: null };
    matchups.forEach(m => {
      const pp = m.players_points || {};
      Object.entries(pp).forEach(([, pts]) => {
        if (pts > topPlayer.points) {
          topPlayer = { points: pts, roster: rosterMap[m.roster_id] || null };
        }
      });
    });

    // Best roster accuracy
    let bestAccuracy = { accuracy: 0, roster: null };
    matchups.forEach(m => {
      const starterPts = (m.starters_points || []).reduce((s, p) => s + (p || 0), 0);
      const allPts = Object.values(m.players_points || {});
      const numStarters = (m.starters || []).length;
      const sorted = [...allPts].sort((a, b) => b - a);
      const optimalPts = sorted.slice(0, numStarters).reduce((s, p) => s + (p || 0), 0);
      if (optimalPts > 0) {
        const accuracy = starterPts / optimalPts;
        if (accuracy > bestAccuracy.accuracy) {
          bestAccuracy = { accuracy, roster: rosterMap[m.roster_id] || null };
        }
      }
    });

    // Worst optimized score
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

    // Collect winners
    const winners = [
      biggestMargin.winner,
      topPlayer.roster,
      bestAccuracy.roster,
      worstOptimal.roster,
    ].filter(Boolean);

    winners.forEach(w => {
      if (!eligible[w.ownerId]) {
        eligible[w.ownerId] = { ownerId: w.ownerId, character: w.character, ownerName: w.ownerName, rollsEarned: 0 };
      }
      eligible[w.ownerId].rollsEarned++;
    });
  }));

  // Cap at 3 per owner
  Object.values(eligible).forEach(e => {
    e.rollsEarned = Math.min(e.rollsEarned, 3);
  });

  return Object.values(eligible);
}

// ─── POST handler ───
export async function onRequestPost({ request, env }) {
  try {
    const url = new URL(request.url);
    const week = parseInt(url.searchParams.get('week'));
    if (!week || week < 1 || week > 17) {
      return json({ error: 'Valid week (1-17) required' }, 400);
    }

    const kv = env.POWERUPS_KV;
    if (!kv) return json({ error: 'KV store not bound' }, 500);

    // Check if auto-roll already ran for this week
    const autoRollKey = `autoRoll:${week}`;
    const existing = await kv.get(autoRollKey);
    if (existing) {
      return json({ alreadyRan: true, week, results: JSON.parse(existing) });
    }

    // Detect eligibility
    const eligible = await detectEligibility(week);

    // Roll for each eligible owner
    const results = [];
    for (const owner of eligible) {
      // Check current week rolls
      const weekRollsKey = `weekRolls:${week}`;
      const weekRollsRaw = await kv.get(weekRollsKey);
      const weekRolls = weekRollsRaw ? JSON.parse(weekRollsRaw) : {};
      const currentRolls = weekRolls[owner.ownerId] || 0;

      const rollsToGive = Math.min(owner.rollsEarned - currentRolls, 3 - currentRolls);

      const rolled = [];
      for (let i = 0; i < rollsToGive; i++) {
        // Check inventory cap
        const invKey = `inventory:${owner.ownerId}`;
        const invRaw = await kv.get(invKey);
        const inventory = invRaw ? JSON.parse(invRaw) : [];

        if (inventory.length >= 3) {
          rolled.push({ skipped: true, reason: 'Inventory full' });
          continue;
        }

        // Roll
        const powerUp = rollPowerUpWeighted();
        powerUp.week = week;
        powerUp.id = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        powerUp.autoRolled = true;

        inventory.push(powerUp);
        await kv.put(invKey, JSON.stringify(inventory));

        // Track week rolls
        weekRolls[owner.ownerId] = (weekRolls[owner.ownerId] || 0) + 1;
        await kv.put(weekRollsKey, JSON.stringify(weekRolls));

        // Add to history
        const histKey = `history:${owner.ownerId}`;
        const histRaw = await kv.get(histKey);
        const history = histRaw ? JSON.parse(histRaw) : [];
        history.unshift({
          type: 'roll',
          powerUp: powerUp.name,
          tier: powerUp.tier,
          week,
          autoRolled: true,
          at: powerUp.rolledAt,
        });
        if (history.length > 50) history.length = 50;
        await kv.put(histKey, JSON.stringify(history));

        rolled.push(powerUp);
      }

      results.push({
        ownerId: owner.ownerId,
        character: owner.character,
        ownerName: owner.ownerName,
        rollsEarned: owner.rollsEarned,
        rolled,
      });
    }

    // Record that auto-roll ran for this week
    const record = { ranAt: new Date().toISOString(), results };
    await kv.put(autoRollKey, JSON.stringify(record));

    // Add to feed: announce WHO earned rolls, but NOT what they got
    const feedKey = 'feed:global';
    const feedRaw = await kv.get(feedKey);
    const feed = feedRaw ? JSON.parse(feedRaw) : [];

    results.forEach(r => {
      const earned = r.rolled.filter(p => !p.skipped).length;
      if (earned > 0) {
        feed.unshift({
          type: 'earned',
          ownerId: r.ownerId,
          character: r.character,
          ownerName: r.ownerName,
          count: earned,
          week,
          at: new Date().toISOString(),
        });
      }
    });

    if (feed.length > 200) feed.length = 200;
    await kv.put(feedKey, JSON.stringify(feed));

    return json({ week, results });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
