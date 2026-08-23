// POST /api/resolve — Resolve all pending deployments for a week
// Shuffles deployment order randomly, then processes each in sequence.
// Order matters: Star immunity only helps if it resolves before the shell targeting you.
//
// Admin-only endpoint (called after Thursday kickoff or manually by commish)
// Query: ?week=5  (required)

import { SLEEPER_API, OWNERS, ACTIVE_OWNERS, LEAGUES, POWER_UPS, getOwnerRole, json, handleCors } from './_shared.js';

export async function onRequestOptions() {
  return handleCors();
}

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Find opponent from Sleeper
async function findOpponent(leagueId, ownerId, week) {
  try {
    const rostersRes = await fetch(`${SLEEPER_API}/league/${leagueId}/rosters`);
    const rosters = await rostersRes.json();
    const myRoster = rosters.find(r => r.owner_id === ownerId || r.co_owners?.includes(ownerId));
    if (!myRoster) return null;

    const matchupsRes = await fetch(`${SLEEPER_API}/league/${leagueId}/matchups/${week}`);
    const matchups = await matchupsRes.json();
    if (!matchups?.length) return null;

    const myMatchup = matchups.find(m => m.roster_id === myRoster.roster_id);
    if (!myMatchup || myMatchup.matchup_id == null) return null;

    const oppMatchup = matchups.find(m => m.matchup_id === myMatchup.matchup_id && m.roster_id !== myRoster.roster_id);
    if (!oppMatchup) return null;

    const oppRoster = rosters.find(r => r.roster_id === oppMatchup.roster_id);
    return oppRoster?.owner_id || null;
  } catch {
    return null;
  }
}

export async function onRequestPost({ request, env }) {
  const kv = env.POWERUPS_KV;
  if (!kv) return json({ error: 'KV not bound' }, 500);

  // Admin check
  const callerOwnerId = request.headers.get('X-Owner-Id');
  if (!callerOwnerId) return json({ error: 'Missing X-Owner-Id' }, 401);
  const role = getOwnerRole(callerOwnerId);
  if (role !== 'super_admin' && role !== 'admin') return json({ error: 'Admin only' }, 403);

  const url = new URL(request.url);
  const week = parseInt(url.searchParams.get('week'));
  if (!week) return json({ error: 'week query param required' }, 400);

  // Check if already resolved
  const resolvedKey = `resolved:week:${week}`;
  const alreadyResolved = await kv.get(resolvedKey);
  if (alreadyResolved) {
    return json({ alreadyResolved: true, results: JSON.parse(alreadyResolved) });
  }

  // Load pending deployments
  const pendingKey = `pending-deploys:week:${week}`;
  const pendingRaw = await kv.get(pendingKey);
  const pending = pendingRaw ? JSON.parse(pendingRaw) : [];

  if (pending.length === 0) {
    return json({ message: 'No pending deployments for this week', results: [] });
  }

  // ─── Shuffle into random resolution order ───
  const ordered = shuffle(pending);

  // State tracking during resolution
  const activeStars = new Set();   // ownerIds with Star active (immune this week)
  const activeHeldShells = {};     // ownerId → { name, defensiveShotsLeft }
  const results = [];
  const pointAdjustments = {};     // ownerId → { league → adjustment }

  // Pre-load held items for all owners to check defensive shells
  for (const dep of ordered) {
    const heldRaw = await kv.get(`held:${dep.ownerId}`);
    if (heldRaw) {
      const held = JSON.parse(heldRaw);
      const heldDef = POWER_UPS.find(p => p.name === held.name);
      if (heldDef?.shots > 1) {
        activeHeldShells[dep.ownerId] = {
          name: held.name,
          defensiveShotsLeft: held.defensiveShotsLeft ?? heldDef.shots,
        };
      }
    }
  }

  // ─── Process each deployment in shuffled order ───
  for (let i = 0; i < ordered.length; i++) {
    const dep = ordered[i];
    const puDef = POWER_UPS.find(p => p.name === dep.powerUp);
    const owner = OWNERS[dep.ownerId];
    const resolutionEntry = {
      order: i + 1,
      ownerId: dep.ownerId,
      character: owner?.character || 'Unknown',
      powerUp: dep.powerUp,
      tier: dep.tier,
      type: puDef?.type || 'unknown',
      action: dep.action,
      targetLeague: dep.targetLeague,
      targetLeagues: dep.targetLeagues,
      effects: [],
    };

    // ── HOLD: already processed at submit time, just note it ──
    if (dep.action === 'hold') {
      resolutionEntry.effects.push({ type: 'held', message: `${dep.powerUp} held for defense` });
      results.push(resolutionEntry);
      continue;
    }

    // ── STAR: grants immunity ──
    if (puDef?.type === 'defensive' && dep.powerUp === 'Star') {
      activeStars.add(dep.ownerId);
      const boost = 5;
      const league = dep.targetLeague;
      if (league) {
        if (!pointAdjustments[dep.ownerId]) pointAdjustments[dep.ownerId] = {};
        pointAdjustments[dep.ownerId][league] = (pointAdjustments[dep.ownerId][league] || 0) + boost;
      }
      resolutionEntry.effects.push({ type: 'star-active', message: `Immune to all power-ups this week + ${boost} pts` });
      results.push(resolutionEntry);
      continue;
    }

    // ── SELF-BOOST (Mushroom, Bullet Bill) ──
    if (puDef?.type === 'self-boost') {
      const boost = dep.powerUp === 'Bullet Bill' ? 10 : 5;
      const league = dep.targetLeague;
      if (league) {
        if (!pointAdjustments[dep.ownerId]) pointAdjustments[dep.ownerId] = {};
        pointAdjustments[dep.ownerId][league] = (pointAdjustments[dep.ownerId][league] || 0) + boost;
      }
      resolutionEntry.effects.push({ type: 'boost', points: boost, league, message: `+${boost} pts in ${LEAGUES[league]?.name || league}` });
      results.push(resolutionEntry);
      continue;
    }

    // ── LIGHTNING (AOE) — everyone loses 5 except Star holders ──
    if (puDef?.type === 'offensive-aoe') {
      const league = dep.targetLeague;
      const hits = [];
      for (const [oid, oinfo] of Object.entries(ACTIVE_OWNERS)) {
        if (oid === dep.ownerId) continue; // don't hit yourself
        if (activeStars.has(oid)) {
          hits.push({ ownerId: oid, character: oinfo.character, immune: true });
          continue;
        }
        if (league) {
          if (!pointAdjustments[oid]) pointAdjustments[oid] = {};
          pointAdjustments[oid][league] = (pointAdjustments[oid][league] || 0) - 5;
        }
        hits.push({ ownerId: oid, character: oinfo.character, impact: -5 });
      }
      resolutionEntry.effects.push({ type: 'lightning', hits });
      results.push(resolutionEntry);
      continue;
    }

    // ── OFFENSIVE (shells) — single or multi-shot ──
    if (puDef?.type === 'offensive') {
      const leagues = dep.targetLeagues || (dep.targetLeague ? [dep.targetLeague] : []);
      const shotResults = [];

      for (let s = 0; s < leagues.length; s++) {
        const lk = leagues[s];
        // Look up opponent
        const oppOwnerId = await findOpponent(LEAGUES[lk]?.id, dep.ownerId, week);
        if (!oppOwnerId) {
          shotResults.push({ shot: s + 1, league: lk, error: 'Could not find opponent', hit: false, impact: 0 });
          continue;
        }

        const oppChar = OWNERS[oppOwnerId]?.character || 'Unknown';

        // Star immunity check
        if (activeStars.has(oppOwnerId)) {
          shotResults.push({ shot: s + 1, league: lk, targetOwner: oppOwnerId, targetCharacter: oppChar, hit: true, impact: 0, immune: true });
          continue;
        }

        // Hit/miss roll
        const hit = Math.random() < (puDef.hitChance || 1);
        if (!hit) {
          shotResults.push({ shot: s + 1, league: lk, targetOwner: oppOwnerId, targetCharacter: oppChar, hit: false, impact: 0 });
          continue;
        }

        // Defensive block check (held triple shell)
        if (activeHeldShells[oppOwnerId] && activeHeldShells[oppOwnerId].defensiveShotsLeft > 0) {
          activeHeldShells[oppOwnerId].defensiveShotsLeft--;
          shotResults.push({
            shot: s + 1, league: lk, targetOwner: oppOwnerId, targetCharacter: oppChar,
            hit: true, impact: 0, blocked: true, blockedBy: activeHeldShells[oppOwnerId].name,
          });

          // If all charges used, remove held item from KV
          if (activeHeldShells[oppOwnerId].defensiveShotsLeft <= 0) {
            await kv.delete(`held:${oppOwnerId}`);
            delete activeHeldShells[oppOwnerId];
          } else {
            // Update remaining charges in KV
            const heldRaw = await kv.get(`held:${oppOwnerId}`);
            if (heldRaw) {
              const held = JSON.parse(heldRaw);
              held.defensiveShotsLeft = activeHeldShells[oppOwnerId].defensiveShotsLeft;
              await kv.put(`held:${oppOwnerId}`, JSON.stringify(held));
            }
          }
          continue;
        }

        // Hit lands
        if (!pointAdjustments[oppOwnerId]) pointAdjustments[oppOwnerId] = {};
        pointAdjustments[oppOwnerId][lk] = (pointAdjustments[oppOwnerId][lk] || 0) - 5;
        shotResults.push({ shot: s + 1, league: lk, targetOwner: oppOwnerId, targetCharacter: oppChar, hit: true, impact: -5 });
      }

      resolutionEntry.shotResults = shotResults;
      resolutionEntry.effects.push({ type: 'shots', shotResults });
      results.push(resolutionEntry);
      continue;
    }

    // ── SPECIAL types (Ghost, Kimek's Magic, etc.) — logged but manual resolution ──
    resolutionEntry.effects.push({ type: 'special', message: `${dep.powerUp} requires manual resolution by commish` });
    results.push(resolutionEntry);
  }

  // ─── Save resolution results ───
  const resolutionData = {
    week,
    resolvedAt: new Date().toISOString(),
    resolvedBy: callerOwnerId,
    order: results,
    pointAdjustments,
  };

  await kv.put(resolvedKey, JSON.stringify(resolutionData));

  // Add resolution to global feed
  const feedKey = 'feed:global';
  const feedRaw = await kv.get(feedKey);
  const feed = feedRaw ? JSON.parse(feedRaw) : [];
  feed.unshift({
    type: 'resolution',
    week,
    message: `Week ${week} power-ups resolved! ${results.length} deployments processed in random order.`,
    resultCount: results.length,
    at: resolutionData.resolvedAt,
  });
  // Also add individual resolution entries
  for (const r of results) {
    if (r.action === 'hold') continue;
    feed.unshift({
      type: 'resolved-deploy',
      ownerId: r.ownerId,
      character: r.character,
      powerUp: r.powerUp,
      tier: r.tier,
      week,
      order: r.order,
      effects: r.effects,
      shotResults: r.shotResults,
      at: resolutionData.resolvedAt,
    });
  }
  if (feed.length > 300) feed.length = 300;
  await kv.put(feedKey, JSON.stringify(feed));

  // Save point adjustments separately for leaderboard integration
  await kv.put(`powerup-adjustments:week:${week}`, JSON.stringify(pointAdjustments));

  // Clear pending
  await kv.delete(pendingKey);

  return json(resolutionData);
}

// GET /api/resolve?week=5 — get resolution results for a week
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const kv = env.POWERUPS_KV;
  if (!kv) return json({ error: 'KV not bound' }, 500);

  const week = parseInt(url.searchParams.get('week'));
  if (!week) return json({ error: 'week required' }, 400);

  const resolvedKey = `resolved:week:${week}`;
  const raw = await kv.get(resolvedKey);
  if (!raw) return json({ resolved: false, week });
  return json({ resolved: true, ...JSON.parse(raw) });
}
