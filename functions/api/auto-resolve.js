// GET /api/auto-resolve?week=5 — Check if resolution should auto-trigger
// POST /api/auto-resolve?week=5 — Force resolve (admin) or auto-resolve (cron)
//
// Auto-resolution fires when:
//   1. It's past Thursday Night Football kickoff for the given week
//   2. There are pending deployments that haven't been resolved yet
//
// This endpoint can be called by:
//   - A Cloudflare Cron Trigger worker (every Thursday at 8:20 PM ET)
//   - The frontend on page load (lazy auto-resolve)
//   - An admin manually from the admin panel
//
// Resolution logic is delegated to the same code as /api/resolve.

import { SLEEPER_API, OWNERS, ACTIVE_OWNERS, LEAGUES, POWER_UPS, LEAGUE_RULES, getOwnerRole, json, handleCors } from './_shared.js';

export async function onRequestOptions() {
  return handleCors();
}

// ─── Thursday kickoff check (same as deploy.js) ───
function getThursdayKickoff(week) {
  // Week 1 TNF: Sept 10, 2026 at 8:15 PM ET
  const WEEK_1_THURSDAY = new Date('2026-09-10T20:15:00-04:00');
  return new Date(WEEK_1_THURSDAY.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
}

function isPastThursdayKickoff(week) {
  return new Date() >= getThursdayKickoff(week);
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

// ─── Core resolution logic (shared with resolve.js) ───
async function resolveWeek(kv, week, resolvedBy) {
  const resolvedKey = `resolved:week:${week}`;
  const alreadyResolved = await kv.get(resolvedKey);
  if (alreadyResolved) {
    return { alreadyResolved: true, results: JSON.parse(alreadyResolved) };
  }

  const pendingKey = `pending-deploys:week:${week}`;
  const pendingRaw = await kv.get(pendingKey);
  const pending = pendingRaw ? JSON.parse(pendingRaw) : [];

  if (pending.length === 0) {
    return { noPending: true, message: 'No pending deployments for this week', results: [] };
  }

  // Shuffle into random resolution order
  const ordered = shuffle(pending);

  // State tracking
  const activeStars = new Set();
  const activeHeldShells = {};
  const results = [];
  const pointAdjustments = {};

  // Pre-load held items
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

  // Process each deployment
  for (let i = 0; i < ordered.length; i++) {
    const dep = ordered[i];
    const puDef = POWER_UPS.find(p => p.name === dep.powerUp);
    const owner = OWNERS[dep.ownerId];
    const entry = {
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

    if (dep.action === 'hold') {
      entry.effects.push({ type: 'held', message: `${dep.powerUp} held for defense` });
      results.push(entry);
      continue;
    }

    // Star: immunity + boost
    if (puDef?.type === 'defensive' && dep.powerUp === 'Star') {
      activeStars.add(dep.ownerId);
      const boost = 5;
      const league = dep.targetLeague;
      if (league) {
        if (!pointAdjustments[dep.ownerId]) pointAdjustments[dep.ownerId] = {};
        pointAdjustments[dep.ownerId][league] = (pointAdjustments[dep.ownerId][league] || 0) + boost;
      }
      entry.effects.push({ type: 'star-active', message: `Immune to all power-ups this week + ${boost} pts` });
      results.push(entry);
      continue;
    }

    // Self-boost
    if (puDef?.type === 'self-boost') {
      const boost = dep.powerUp === 'Bullet Bill' ? 10 : 5;
      const league = dep.targetLeague;
      if (league) {
        if (!pointAdjustments[dep.ownerId]) pointAdjustments[dep.ownerId] = {};
        pointAdjustments[dep.ownerId][league] = (pointAdjustments[dep.ownerId][league] || 0) + boost;
      }
      entry.effects.push({ type: 'boost', points: boost, league, message: `+${boost} pts in ${LEAGUES[league]?.name || league}` });
      results.push(entry);
      continue;
    }

    // Lightning (AOE)
    if (puDef?.type === 'offensive-aoe') {
      const league = dep.targetLeague;
      const hits = [];
      for (const [oid, oinfo] of Object.entries(ACTIVE_OWNERS)) {
        if (oid === dep.ownerId) continue;
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
      entry.effects.push({ type: 'lightning', hits });
      results.push(entry);
      continue;
    }

    // Offensive (shells)
    if (puDef?.type === 'offensive') {
      const leagues = dep.targetLeagues || (dep.targetLeague ? [dep.targetLeague] : []);
      const shotResults = [];
      for (let s = 0; s < leagues.length; s++) {
        const lk = leagues[s];
        const oppOwnerId = await findOpponent(LEAGUES[lk]?.id, dep.ownerId, week);
        if (!oppOwnerId) {
          shotResults.push({ shot: s + 1, league: lk, error: 'Could not find opponent', hit: false, impact: 0 });
          continue;
        }
        const oppChar = OWNERS[oppOwnerId]?.character || 'Unknown';
        if (activeStars.has(oppOwnerId)) {
          shotResults.push({ shot: s + 1, league: lk, targetOwner: oppOwnerId, targetCharacter: oppChar, hit: true, impact: 0, immune: true });
          continue;
        }
        const hit = Math.random() < (puDef.hitChance || 1);
        if (!hit) {
          shotResults.push({ shot: s + 1, league: lk, targetOwner: oppOwnerId, targetCharacter: oppChar, hit: false, impact: 0 });
          continue;
        }
        if (activeHeldShells[oppOwnerId] && activeHeldShells[oppOwnerId].defensiveShotsLeft > 0) {
          activeHeldShells[oppOwnerId].defensiveShotsLeft--;
          shotResults.push({
            shot: s + 1, league: lk, targetOwner: oppOwnerId, targetCharacter: oppChar,
            hit: true, impact: 0, blocked: true, blockedBy: activeHeldShells[oppOwnerId].name,
          });
          if (activeHeldShells[oppOwnerId].defensiveShotsLeft <= 0) {
            await kv.delete(`held:${oppOwnerId}`);
            delete activeHeldShells[oppOwnerId];
          } else {
            const heldRaw = await kv.get(`held:${oppOwnerId}`);
            if (heldRaw) {
              const held = JSON.parse(heldRaw);
              held.defensiveShotsLeft = activeHeldShells[oppOwnerId].defensiveShotsLeft;
              await kv.put(`held:${oppOwnerId}`, JSON.stringify(held));
            }
          }
          continue;
        }
        if (!pointAdjustments[oppOwnerId]) pointAdjustments[oppOwnerId] = {};
        pointAdjustments[oppOwnerId][lk] = (pointAdjustments[oppOwnerId][lk] || 0) - 5;
        shotResults.push({ shot: s + 1, league: lk, targetOwner: oppOwnerId, targetCharacter: oppChar, hit: true, impact: -5 });
      }
      entry.shotResults = shotResults;
      entry.effects.push({ type: 'shots', shotResults });
      results.push(entry);
      continue;
    }

    // Special (manual)
    entry.effects.push({ type: 'special', message: `${dep.powerUp} requires manual resolution by commish` });
    results.push(entry);
  }

  // Save resolution
  const resolutionData = {
    week,
    resolvedAt: new Date().toISOString(),
    resolvedBy,
    order: results,
    pointAdjustments,
  };

  await kv.put(resolvedKey, JSON.stringify(resolutionData));

  // Update feed
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

  // Save point adjustments for leaderboard
  await kv.put(`powerup-adjustments:week:${week}`, JSON.stringify(pointAdjustments));

  // Clear pending
  await kv.delete(pendingKey);

  return resolutionData;
}

// ─── GET: Check auto-resolve status / trigger lazy resolve ───
export async function onRequestGet({ request, env }) {
  const kv = env.POWERUPS_KV;
  if (!kv) return json({ error: 'KV not bound' }, 500);
  const url = new URL(request.url);

  // If week specified, check that week; otherwise auto-detect
  let week = parseInt(url.searchParams.get('week'));
  if (!week) {
    const nflState = await getCurrentNFLWeek();
    if (!nflState) return json({ error: 'Could not determine NFL week' }, 500);
    week = nflState.week;
  }

  // Check if already resolved
  const resolvedKey = `resolved:week:${week}`;
  const alreadyResolved = await kv.get(resolvedKey);
  if (alreadyResolved) {
    return json({ resolved: true, week, ...JSON.parse(alreadyResolved) });
  }

  // Check if past kickoff and has pending
  const pastKickoff = isPastThursdayKickoff(week);
  const pendingRaw = await kv.get(`pending-deploys:week:${week}`);
  const pendingCount = pendingRaw ? JSON.parse(pendingRaw).length : 0;

  // Auto-resolve if past kickoff and has pending deployments
  if (pastKickoff && pendingCount > 0) {
    const result = await resolveWeek(kv, week, 'auto-trigger');
    if (result.alreadyResolved) return json({ resolved: true, week, ...result.results });
    return json({ resolved: true, autoTriggered: true, week, ...result });
  }

  return json({
    resolved: false,
    week,
    pastKickoff,
    pendingCount,
    kickoffTime: getThursdayKickoff(week).toISOString(),
  });
}

// ─── POST: Admin manual resolve or cron trigger ───
export async function onRequestPost({ request, env }) {
  const kv = env.POWERUPS_KV;
  if (!kv) return json({ error: 'KV not bound' }, 500);

  const url = new URL(request.url);
  let week = parseInt(url.searchParams.get('week'));

  // Allow cron triggers without auth (they use a secret header)
  const cronSecret = request.headers.get('X-Cron-Secret');
  const callerOwnerId = request.headers.get('X-Owner-Id');
  const isCron = cronSecret === env.CRON_SECRET;

  if (!isCron) {
    // Admin check
    if (!callerOwnerId) return json({ error: 'Missing X-Owner-Id' }, 401);
    const role = getOwnerRole(callerOwnerId);
    if (role !== 'super_admin' && role !== 'admin') return json({ error: 'Admin only' }, 403);
  }

  if (!week) {
    const nflState = await getCurrentNFLWeek();
    if (!nflState) return json({ error: 'Could not determine NFL week' }, 500);
    week = nflState.week;
  }

  const resolvedBy = isCron ? 'cron-trigger' : callerOwnerId;
  const result = await resolveWeek(kv, week, resolvedBy);

  if (result.alreadyResolved) {
    return json({ alreadyResolved: true, week, ...result.results });
  }
  if (result.noPending) {
    return json({ noPending: true, week, message: result.message });
  }

  return json({ resolved: true, week, ...result });
}
