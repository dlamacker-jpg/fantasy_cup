// /api/seed
// GET  — check seed status
// POST — seed everyone with 1 power-up, or clear all data
//
// POST body options:
//   {}                    → seed everyone with 1 random power-up
//   { "action": "clear" } → wipe all power-up data
//   { "force": true }     → re-seed even if already seeded

import { OWNERS, ACTIVE_OWNERS, rollPowerUpWeighted, json, handleCors } from './_shared.js';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return handleCors();
  }

  const kv = env.POWERUPS_KV;
  if (!kv) return json({ error: 'KV store not bound' }, 500);

  // ─── GET: check status ───
  if (request.method === 'GET') {
    const seedKey = 'seed:initial';
    const existing = await kv.get(seedKey);
    return json({ seeded: !!existing, data: existing ? JSON.parse(existing) : null });
  }

  // ─── POST: seed or clear ───
  if (request.method === 'POST') {
    try {
      let body = {};
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const text = await request.text();
        if (text) {
          try { body = JSON.parse(text); } catch {}
        }
      }

      // ── CLEAR all power-up data ──
      if (body.action === 'clear') {
        const keysToDelete = [];

        for (const ownerId of Object.keys(OWNERS)) {
          keysToDelete.push('inventory:' + ownerId);
          keysToDelete.push('history:' + ownerId);
          keysToDelete.push('held:' + ownerId);
        }

        for (let w = 0; w <= 17; w++) {
          keysToDelete.push('weekRolls:' + w);
          keysToDelete.push('autoRoll:' + w);
          keysToDelete.push('deployments:week:' + w);
          for (const ownerId of Object.keys(OWNERS)) {
            keysToDelete.push('weekDeploys:' + w + ':' + ownerId);
          }
        }

        keysToDelete.push('feed:global');
        keysToDelete.push('submissions:all');
        keysToDelete.push('seed:initial');

        await Promise.all(keysToDelete.map(function(k) { return kv.delete(k); }));

        return json({ cleared: true, keysDeleted: keysToDelete.length });
      }

      // ── SEED: give everyone 1 random power-up ──
      const seedKey = 'seed:initial';
      const existing = await kv.get(seedKey);
      if (existing && !body.force) {
        return json({ alreadySeeded: true, results: JSON.parse(existing), hint: 'Send force:true to re-seed' });
      }

      var results = [];
      var feedEntries = [];
      var now = new Date().toISOString();
      var ownerEntries = Object.entries(ACTIVE_OWNERS);

      for (var i = 0; i < ownerEntries.length; i++) {
        var ownerId = ownerEntries[i][0];
        var owner = ownerEntries[i][1];

        var powerUp = rollPowerUpWeighted();
        powerUp.week = 0;
        powerUp.id = 'seed-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
        powerUp.seeded = true;

        // Set inventory
        var invKey = 'inventory:' + ownerId;
        var invRaw = await kv.get(invKey);
        var inventory = invRaw ? JSON.parse(invRaw) : [];

        if (inventory.length < 3) {
          inventory.push(powerUp);
          await kv.put(invKey, JSON.stringify(inventory));
        }

        // Add to history
        var histKey = 'history:' + ownerId;
        var histRaw = await kv.get(histKey);
        var history = histRaw ? JSON.parse(histRaw) : [];
        history.unshift({
          type: 'roll',
          powerUp: powerUp.name,
          tier: powerUp.tier,
          week: 0,
          autoRolled: true,
          seeded: true,
          at: now,
        });
        if (history.length > 50) history.length = 50;
        await kv.put(histKey, JSON.stringify(history));

        // Public: announce the earn. Private: what they got.
        feedEntries.push({
          type: 'earned',
          ownerId: ownerId,
          character: owner.character,
          ownerName: owner.name,
          count: 1,
          week: 0,
          at: now,
        });

        results.push({
          ownerId: ownerId,
          character: owner.character,
          ownerName: owner.name,
          rolled: powerUp.name,
          tier: powerUp.tier,
        });
      }

      // Update global feed (earned announcements only, not what was rolled)
      var feedRaw = await kv.get('feed:global');
      var existingFeed = feedRaw ? JSON.parse(feedRaw) : [];
      var newFeed = feedEntries.concat(existingFeed);
      if (newFeed.length > 200) newFeed.length = 200;
      await kv.put('feed:global', JSON.stringify(newFeed));

      // Mark as seeded
      await kv.put(seedKey, JSON.stringify(results));

      return json({ seeded: true, results: results });
    } catch (err) {
      return json({ error: 'Seed error: ' + err.message }, 500);
    }
  }

  return json({ error: 'Method not allowed' }, 405);
}
