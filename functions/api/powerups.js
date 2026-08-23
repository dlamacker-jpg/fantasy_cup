// Power-Up Inventory & Randomizer API
// GET  /api/powerups?ownerId=xxx         — get owner's inventory
// GET  /api/powerups?all=true            — get all owners' inventories (admin)
// POST /api/powerups   { action: "roll", ownerId, week }  — roll a random power-up
// POST /api/powerups   { action: "remove", ownerId, index }  — remove from inventory
// POST /api/powerups   { action: "use", ownerId, index, week, details }  — mark as used

import { POWER_UPS, OWNERS, ACTIVE_OWNERS, rollPowerUpWeighted, getCustomPowerUps, getOwnerRole, json, handleCors } from './_shared.js';

export async function onRequestOptions() {
  return handleCors();
}

// KV key for an owner's power-up inventory
const inventoryKey = (ownerId) => `inventory:${ownerId}`;
const historyKey = (ownerId) => `history:${ownerId}`;
const weekRollsKey = (week) => `weekRolls:${week}`;

async function getInventory(kv, ownerId) {
  const raw = await kv.get(inventoryKey(ownerId));
  return raw ? JSON.parse(raw) : [];
}

async function setInventory(kv, ownerId, items) {
  await kv.put(inventoryKey(ownerId), JSON.stringify(items));
}

async function getHistory(kv, ownerId) {
  const raw = await kv.get(historyKey(ownerId));
  return raw ? JSON.parse(raw) : [];
}

async function addHistory(kv, ownerId, entry) {
  const history = await getHistory(kv, ownerId);
  history.unshift(entry); // newest first
  // Keep last 50 entries
  if (history.length > 50) history.length = 50;
  await kv.put(historyKey(ownerId), JSON.stringify(history));
}

async function getWeekRolls(kv, week) {
  const raw = await kv.get(weekRollsKey(week));
  return raw ? JSON.parse(raw) : {};
}

async function addWeekRoll(kv, week, ownerId) {
  const rolls = await getWeekRolls(kv, week);
  if (!rolls[ownerId]) rolls[ownerId] = 0;
  rolls[ownerId]++;
  await kv.put(weekRollsKey(week), JSON.stringify(rolls));
  return rolls[ownerId];
}

// ─── GET handler ───
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const kv = env.POWERUPS_KV;

  // Admin: get all inventories (active owners only)
  if (url.searchParams.get('all') === 'true') {
    const allData = {};
    await Promise.all(Object.entries(ACTIVE_OWNERS).map(async ([id, info]) => {
      allData[id] = {
        ...info,
        ownerId: id,
        inventory: await getInventory(kv, id),
        history: await getHistory(kv, id),
      };
    }));
    return json(allData);
  }

  // Single owner inventory
  const ownerId = url.searchParams.get('ownerId');
  if (!ownerId || !OWNERS[ownerId]) return json({ error: 'Invalid ownerId' }, 400);

  return json({
    ownerId,
    ...OWNERS[ownerId],
    inventory: await getInventory(kv, ownerId),
    history: await getHistory(kv, ownerId),
  });
}

// ─── POST handler ───
export async function onRequestPost({ request, env }) {
  const kv = env.POWERUPS_KV;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { action, ownerId, week, index, details } = body;
  if (!ownerId || !OWNERS[ownerId]) return json({ error: 'Invalid ownerId' }, 400);

  if (action === 'roll') {
    // Roll a new power-up
    if (!week) return json({ error: 'week required for roll' }, 400);

    // Check weekly roll cap (max 3)
    const weekRolls = await getWeekRolls(kv, week);
    const currentRolls = weekRolls[ownerId] || 0;
    if (currentRolls >= 3) {
      return json({ error: 'Max 3 power-ups earned per week' }, 400);
    }

    // Check inventory cap (max 3 slots)
    const inventory = await getInventory(kv, ownerId);
    if (inventory.length >= 3) {
      return json({ error: 'Inventory full (3 slots). Must use or discard a power-up first.' }, 400);
    }

    // Roll! (use custom config from KV if available)
    const customPUs = await getCustomPowerUps(kv);
    const powerUp = rollPowerUpWeighted(customPUs);
    powerUp.week = week;
    powerUp.id = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    inventory.push(powerUp);
    await setInventory(kv, ownerId, inventory);
    await addWeekRoll(kv, week, ownerId);
    await addHistory(kv, ownerId, {
      type: 'roll',
      powerUp: powerUp.name,
      tier: powerUp.tier,
      week,
      at: powerUp.rolledAt,
    });

    return json({
      rolled: powerUp,
      inventory,
      weekRollCount: currentRolls + 1,
    });
  }

  if (action === 'remove') {
    // Remove (discard) a power-up from inventory
    if (index == null) return json({ error: 'index required' }, 400);
    const inventory = await getInventory(kv, ownerId);
    if (index < 0 || index >= inventory.length) return json({ error: 'Invalid index' }, 400);

    const removed = inventory.splice(index, 1)[0];
    await setInventory(kv, ownerId, inventory);
    await addHistory(kv, ownerId, {
      type: 'discard',
      powerUp: removed.name,
      tier: removed.tier,
      at: new Date().toISOString(),
    });

    return json({ removed, inventory });
  }

  if (action === 'use') {
    // Mark a power-up as used (moves to history)
    if (index == null) return json({ error: 'index required' }, 400);
    const inventory = await getInventory(kv, ownerId);
    if (index < 0 || index >= inventory.length) return json({ error: 'Invalid index' }, 400);

    const used = inventory.splice(index, 1)[0];
    await setInventory(kv, ownerId, inventory);
    await addHistory(kv, ownerId, {
      type: 'used',
      powerUp: used.name,
      tier: used.tier,
      week: week || null,
      details: details || '',
      at: new Date().toISOString(),
    });

    return json({ used, inventory });
  }

  // ─── Commissioner: Grant a specific power-up to a racer ───
  if (action === 'grant') {
    const commissionerId = request.headers.get('X-Owner-Id') || body.commissionerId;
    const role = getOwnerRole(commissionerId);
    if (role !== 'admin' && role !== 'super_admin') {
      return json({ error: 'Only the commissioner can grant power-ups' }, 403);
    }

    const { powerUpName, week: grantWeek, reason } = body;
    if (!powerUpName) return json({ error: 'powerUpName required' }, 400);

    // Find the power-up definition (check custom config first)
    const customPUs = await getCustomPowerUps(kv);
    const source = customPUs || POWER_UPS;
    const puDef = source.find(p => p.name === powerUpName);
    if (!puDef) return json({ error: `Unknown power-up: ${powerUpName}` }, 400);

    const inventory = await getInventory(kv, ownerId);
    if (inventory.length >= 3) {
      return json({ error: `${OWNERS[ownerId].character} has a full inventory (3/3). Revoke one first.` }, 400);
    }

    const granted = {
      name: puDef.name,
      tier: puDef.tier,
      effect: puDef.effect,
      type: puDef.type,
      holdable: puDef.holdable || false,
      rolledAt: new Date().toISOString(),
      grantedBy: commissionerId,
      week: grantWeek || null,
      id: `grant-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    };

    inventory.push(granted);
    await setInventory(kv, ownerId, inventory);
    await addHistory(kv, ownerId, {
      type: 'commissioner_grant',
      powerUp: granted.name,
      tier: granted.tier,
      week: grantWeek || null,
      reason: reason || '',
      grantedBy: OWNERS[commissionerId]?.character || commissionerId,
      at: granted.rolledAt,
    });

    // Log to commissioner action log
    await addCommissionerLog(kv, {
      action: 'grant',
      targetOwnerId: ownerId,
      targetCharacter: OWNERS[ownerId].character,
      powerUp: granted.name,
      tier: granted.tier,
      reason: reason || '',
      by: commissionerId,
      byCharacter: OWNERS[commissionerId]?.character || 'Unknown',
      at: granted.rolledAt,
    });

    // Add to global feed
    const feedRaw = await kv.get('feed:global');
    const feed = feedRaw ? JSON.parse(feedRaw) : [];
    feed.unshift({
      type: 'commissioner_grant',
      character: OWNERS[ownerId].character,
      ownerId,
      powerUp: granted.name,
      tier: granted.tier,
      week: grantWeek || null,
      at: granted.rolledAt,
    });
    if (feed.length > 300) feed.length = 300;
    await kv.put('feed:global', JSON.stringify(feed));

    return json({ granted, inventory });
  }

  // ─── Commissioner: Revoke a power-up from a racer ───
  if (action === 'revoke') {
    const commissionerId = request.headers.get('X-Owner-Id') || body.commissionerId;
    const role = getOwnerRole(commissionerId);
    if (role !== 'admin' && role !== 'super_admin') {
      return json({ error: 'Only the commissioner can revoke power-ups' }, 403);
    }

    if (index == null) return json({ error: 'index required' }, 400);
    const inventory = await getInventory(kv, ownerId);
    if (index < 0 || index >= inventory.length) return json({ error: 'Invalid index' }, 400);

    const revoked = inventory.splice(index, 1)[0];
    await setInventory(kv, ownerId, inventory);

    const reason = body.reason || '';
    await addHistory(kv, ownerId, {
      type: 'commissioner_revoke',
      powerUp: revoked.name,
      tier: revoked.tier,
      reason,
      revokedBy: OWNERS[commissionerId]?.character || commissionerId,
      at: new Date().toISOString(),
    });

    await addCommissionerLog(kv, {
      action: 'revoke',
      targetOwnerId: ownerId,
      targetCharacter: OWNERS[ownerId].character,
      powerUp: revoked.name,
      tier: revoked.tier,
      reason,
      by: commissionerId,
      byCharacter: OWNERS[commissionerId]?.character || 'Unknown',
      at: new Date().toISOString(),
    });

    return json({ revoked, inventory });
  }

  return json({ error: 'Unknown action. Use: roll, remove, use, grant, revoke' }, 400);
}

// ─── Commissioner action log helper ───
async function addCommissionerLog(kv, entry) {
  const raw = await kv.get('commissioner-log');
  const log = raw ? JSON.parse(raw) : [];
  log.unshift(entry);
  if (log.length > 200) log.length = 200;
  await kv.put('commissioner-log', JSON.stringify(log));
}
