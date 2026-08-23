// POST /api/deploy
// Owner-initiated power-up deployment — queues the deployment for resolution.
// Body:
//   Single-shot: { ownerId, powerUpIndex, targetLeague, action: 'use' | 'hold', notes? }
//   Multi-shot (triple shells): { ownerId, powerUpIndex, targetLeagues: ['mushroom','flower'], action: 'use', notes? }
//
// Deployments are QUEUED, not immediately resolved. All deployments for the week
// are resolved together (in random order) via POST /api/resolve after Thursday kickoff.
// This means the order of resolution impacts outcomes — Star immunity, shell blocks, etc.
//
// HOLD actions are immediate (they don't need resolution).

import { SLEEPER_API, OWNERS, LEAGUES, POWER_UPS, LEAGUE_RULES, json, handleCors } from './_shared.js';

export async function onRequestOptions() {
  return handleCors();
}

// ─── Get current NFL week from Sleeper ───
async function getCurrentNFLWeek() {
  try {
    const res = await fetch(`${SLEEPER_API}/state/nfl`);
    const state = await res.json();
    return { week: state.week, season: state.season, phase: state.season_type };
  } catch {
    return null;
  }
}

// ─── Find opponent for an owner in a specific league + week ───
async function findOpponent(leagueId, ownerId, week) {
  try {
    const rostersRes = await fetch(`${SLEEPER_API}/league/${leagueId}/rosters`);
    const rosters = await rostersRes.json();
    const myRoster = rosters.find(r => r.owner_id === ownerId || r.co_owners?.includes(ownerId));
    if (!myRoster) return { error: 'You don\'t have a roster in this league' };

    const matchupsRes = await fetch(`${SLEEPER_API}/league/${leagueId}/matchups/${week}`);
    const matchups = await matchupsRes.json();
    if (!matchups?.length) return { error: `No matchup data for week ${week}` };

    const myMatchup = matchups.find(m => m.roster_id === myRoster.roster_id);
    if (!myMatchup || myMatchup.matchup_id == null) return { error: 'No matchup found for you this week' };

    const oppMatchup = matchups.find(m =>
      m.matchup_id === myMatchup.matchup_id && m.roster_id !== myRoster.roster_id
    );
    if (!oppMatchup) return { error: 'Could not find your opponent this week' };

    const oppRoster = rosters.find(r => r.roster_id === oppMatchup.roster_id);
    const oppOwnerId = oppRoster?.owner_id;
    return {
      opponentOwnerId: oppOwnerId,
      opponentCharacter: OWNERS[oppOwnerId]?.character || 'Unknown',
      opponentName: OWNERS[oppOwnerId]?.name || 'Unknown',
    };
  } catch (err) {
    return { error: `Failed to look up matchup: ${err.message}` };
  }
}

// ─── Thursday deadline check ───
function isPastThursdayKickoff(week) {
  // Week 1 TNF: Sept 10, 2026 at 8:15 PM ET
  const WEEK_1_THURSDAY = new Date('2026-09-10T20:15:00-04:00');
  const thursdayOfWeek = new Date(WEEK_1_THURSDAY.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  return new Date() >= thursdayOfWeek;
}

// GET /api/deploy
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const kv = env.POWERUPS_KV;
  if (!kv) return json({ error: 'KV store not bound' }, 500);

  // Current NFL week
  if (url.searchParams.get('currentWeek') === 'true') {
    const nflState = await getCurrentNFLWeek();
    if (!nflState) return json({ error: 'Could not fetch NFL state from Sleeper' }, 500);
    return json(nflState);
  }

  // Opponent lookup
  if (url.searchParams.get('opponent') === 'true') {
    const ownerId = url.searchParams.get('ownerId');
    const leagueKey = url.searchParams.get('league');
    const week = parseInt(url.searchParams.get('week'));
    if (!ownerId || !leagueKey || !week) return json({ error: 'ownerId, league, week required' }, 400);
    const league = LEAGUES[leagueKey];
    if (!league) return json({ error: 'Invalid league' }, 400);
    const result = await findOpponent(league.id, ownerId, week);
    if (result.error) return json({ error: result.error }, 404);
    return json(result);
  }

  // Pending deployments for a week
  if (url.searchParams.get('pending') === 'true') {
    const week = url.searchParams.get('week');
    if (!week) return json({ error: 'week required' }, 400);
    const pendingRaw = await kv.get(`pending-deploys:week:${week}`);
    return json(pendingRaw ? JSON.parse(pendingRaw) : []);
  }

  // Global feed
  const week = url.searchParams.get('week');
  const ownerId = url.searchParams.get('ownerId');
  const feedRaw = await kv.get('feed:global');
  let feed = feedRaw ? JSON.parse(feedRaw) : [];
  if (week) feed = feed.filter(e => e.week === parseInt(week));
  if (ownerId) feed = feed.filter(e => e.ownerId === ownerId);
  return json(feed.slice(0, 100));
}

// POST /api/deploy — queue a deployment (or hold immediately)
export async function onRequestPost({ request, env }) {
  try {
    const kv = env.POWERUPS_KV;
    if (!kv) return json({ error: 'KV store not bound' }, 500);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const { ownerId, powerUpIndex, targetLeague, targetLeagues, action, notes } = body;
    const deployAction = action || 'use';

    // ─── Validations ───
    if (!ownerId || !OWNERS[ownerId]) return json({ error: 'Invalid ownerId' }, 400);
    if (powerUpIndex == null || powerUpIndex < 0) return json({ error: 'powerUpIndex required' }, 400);

    const nflState = await getCurrentNFLWeek();
    if (!nflState) return json({ error: 'Could not determine current NFL week from Sleeper' }, 500);
    const week = nflState.week;

    if (week >= LEAGUE_RULES.playoffWeeksStart) {
      return json({ error: 'Power-ups cannot be used during the playoffs (Weeks 15-17).' }, 403);
    }
    if (isPastThursdayKickoff(week)) {
      return json({ error: 'Too late! Power-ups must be deployed before Thursday Night Football kickoff (8:15 PM ET).', locked: true }, 403);
    }

    // 1-per-week limit
    const weekDeployKey = `weekDeploys:${week}:${ownerId}`;
    const existingDeploy = await kv.get(weekDeployKey);
    if (existingDeploy) {
      return json({ error: 'You already deployed a power-up this week. Limit: 1 per week.' }, 403);
    }

    // Inventory
    const invKey = `inventory:${ownerId}`;
    const invRaw = await kv.get(invKey);
    const inventory = invRaw ? JSON.parse(invRaw) : [];
    if (powerUpIndex >= inventory.length) return json({ error: 'Invalid power-up index' }, 400);
    const powerUp = inventory[powerUpIndex];

    // Held item check
    const heldKey = `held:${ownerId}`;
    const heldRaw = await kv.get(heldKey);
    const heldItem = heldRaw ? JSON.parse(heldRaw) : null;
    if (heldItem && deployAction !== 'use-held' && powerUp.name !== heldItem.name) {
      return json({ error: `You have a held ${heldItem.name}. You must deploy your held item first.`, heldItem }, 403);
    }

    const puDef = POWER_UPS.find(p => p.name === powerUp.name);
    const isOffensive = puDef?.type === 'offensive' || puDef?.type === 'offensive-aoe';
    const isAOE = puDef?.type === 'offensive-aoe';
    const isMultiShot = (puDef?.shots || 1) > 1;
    const owner = OWNERS[ownerId];
    const submittedAt = new Date().toISOString();

    // ═══════════════════════════════════════════
    // HOLD — immediate (defensive shells ready now)
    // ═══════════════════════════════════════════
    if (deployAction === 'hold') {
      if (!puDef?.holdable) return json({ error: `${powerUp.name} cannot be held.` }, 400);

      inventory.splice(powerUpIndex, 1);
      await kv.put(invKey, JSON.stringify(inventory));

      const heldData = {
        ...powerUp, heldAt: submittedAt, heldWeek: week,
        ...(puDef.shots > 1 ? { defensiveShotsLeft: puDef.shots } : {}),
      };
      await kv.put(heldKey, JSON.stringify(heldData));
      await kv.put(weekDeployKey, JSON.stringify({ action: 'hold', powerUp: powerUp.name, at: submittedAt }));

      // Log to feed
      const feedKey = 'feed:global';
      const feedRaw = await kv.get(feedKey);
      const feed = feedRaw ? JSON.parse(feedRaw) : [];
      feed.unshift({
        type: 'hold', ownerId, character: owner.character, ownerName: owner.name,
        powerUp: powerUp.name, tier: powerUp.tier, week, at: submittedAt,
        effect: puDef.shots > 1
          ? `Held with ${puDef.shots} defensive charges`
          : 'Held for future deployment',
      });
      if (feed.length > 200) feed.length = 200;
      await kv.put(feedKey, JSON.stringify(feed));

      return json({ queued: false, held: true, heldItem: heldData, inventory });
    }

    // ═══════════════════════════════════════════
    // USE — validate targets then QUEUE (don't resolve yet)
    // ═══════════════════════════════════════════
    let resolvedLeagues = [];

    if (isOffensive && !isAOE && isMultiShot) {
      // Triple shell: validate leagues array
      resolvedLeagues = targetLeagues || (targetLeague ? [targetLeague] : []);
      if (resolvedLeagues.length === 0) return json({ error: 'Select at least one league' }, 400);
      if (resolvedLeagues.length > (puDef.shots || 3)) return json({ error: `Too many leagues for ${puDef.shots} shots` }, 400);
      for (const lk of resolvedLeagues) {
        if (!LEAGUES[lk]) return json({ error: `Invalid league: ${lk}` }, 400);
      }
    } else if (isOffensive && !isAOE) {
      // Single-shot offensive
      if (!targetLeague || !LEAGUES[targetLeague]) return json({ error: 'Target league required' }, 400);
      resolvedLeagues = [targetLeague];
    } else if (!isAOE) {
      // Self-boost, special, etc.
      if (targetLeague && LEAGUES[targetLeague]) resolvedLeagues = [targetLeague];
    }

    // Remove from inventory now (so they can't re-deploy)
    if (deployAction === 'use-held' && heldItem) {
      await kv.delete(heldKey);
    } else {
      inventory.splice(powerUpIndex, 1);
      await kv.put(invKey, JSON.stringify(inventory));
    }

    // Mark week deploy used
    await kv.put(weekDeployKey, JSON.stringify({ action: 'use', powerUp: powerUp.name, at: submittedAt }));

    // Build pending deployment record
    const pendingDeploy = {
      id: `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      ownerId,
      ownerName: owner.name,
      character: owner.character,
      powerUp: powerUp.name,
      tier: powerUp.tier,
      type: puDef?.type || 'unknown',
      action: 'use',
      week,
      targetLeague: isMultiShot ? null : (targetLeague || null),
      targetLeagues: isMultiShot ? resolvedLeagues : null,
      notes: notes || '',
      submittedAt,
      status: 'pending', // will become 'resolved' after /api/resolve runs
    };

    // Add to pending queue
    const pendingKey = `pending-deploys:week:${week}`;
    const pendingRaw = await kv.get(pendingKey);
    const pending = pendingRaw ? JSON.parse(pendingRaw) : [];
    pending.push(pendingDeploy);
    await kv.put(pendingKey, JSON.stringify(pending));

    // Log submission to feed (without results — those come at resolution)
    const feedKey = 'feed:global';
    const fRaw = await kv.get(feedKey);
    const feed = fRaw ? JSON.parse(fRaw) : [];
    feed.unshift({
      type: 'queued', ownerId, character: owner.character, ownerName: owner.name,
      powerUp: powerUp.name, tier: powerUp.tier, week, at: submittedAt,
      effect: `${powerUp.name} locked in — will resolve after Thursday kickoff`,
    });
    if (feed.length > 200) feed.length = 200;
    await kv.put(feedKey, JSON.stringify(feed));

    // Add to owner history
    const histKey = `history:${ownerId}`;
    const histRaw = await kv.get(histKey);
    const history = histRaw ? JSON.parse(histRaw) : [];
    history.unshift({
      type: 'queued', powerUp: powerUp.name, tier: powerUp.tier, week,
      targetLeague: pendingDeploy.targetLeague, targetLeagues: pendingDeploy.targetLeagues,
      notes: notes || '', at: submittedAt,
    });
    if (history.length > 50) history.length = 50;
    await kv.put(histKey, JSON.stringify(history));

    return json({ queued: true, deployment: pendingDeploy, inventory });

  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
