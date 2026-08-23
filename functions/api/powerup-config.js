// CRUD API for Power-Up Configuration
// GET    /api/powerup-config                — get all power-up definitions + rules
// PUT    /api/powerup-config                — save full config (definitions + rules)
// Requires admin role (super_admin or admin)

import { POWER_UPS, LEAGUE_RULES, ROLES, getOwnerRole, json, handleCors } from './_shared.js';

export async function onRequestOptions() {
  return handleCors();
}

const CONFIG_KEY = 'powerup-config';

// Default config mirrors hardcoded values — used as fallback if KV is empty
function getDefaultConfig() {
  return {
    powerUps: POWER_UPS.map((pu, i) => ({ ...pu, id: `pu_${i}` })),
    rules: { ...LEAGUE_RULES },
    updatedAt: null,
    updatedBy: null,
  };
}

// ─── GET: Return current config (from KV or defaults) ───
export async function onRequestGet({ request, env }) {
  const kv = env.POWERUPS_KV;
  if (!kv) return json({ error: 'KV not bound' }, 500);

  const raw = await kv.get(CONFIG_KEY);
  if (raw) {
    try {
      return json(JSON.parse(raw));
    } catch {
      // Corrupted — return defaults
    }
  }

  return json(getDefaultConfig());
}

// ─── PUT: Save full config (admin only) ───
export async function onRequestPut({ request, env }) {
  const kv = env.POWERUPS_KV;
  if (!kv) return json({ error: 'KV not bound' }, 500);

  // Auth check — require admin role
  const ownerId = request.headers.get('X-Owner-Id');
  if (!ownerId) return json({ error: 'Missing X-Owner-Id header' }, 401);

  const role = getOwnerRole(ownerId);
  if (role !== 'super_admin' && role !== 'admin') {
    return json({ error: 'Admin access required' }, 403);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { powerUps, rules } = body;

  // Validate
  if (!Array.isArray(powerUps) || powerUps.length === 0) {
    return json({ error: 'powerUps must be a non-empty array' }, 400);
  }

  // Validate probabilities sum to 100
  const totalProb = powerUps.reduce((sum, pu) => sum + (pu.prob || 0), 0);
  if (totalProb !== 100) {
    return json({ error: `Probabilities must sum to 100 (currently ${totalProb})` }, 400);
  }

  // Validate each power-up has required fields
  for (const pu of powerUps) {
    if (!pu.name || !pu.tier || !pu.effect || !pu.type) {
      return json({ error: `Power-up "${pu.name || 'unnamed'}" missing required fields (name, tier, effect, type)` }, 400);
    }
    if (pu.tier < 1 || pu.tier > 5) {
      return json({ error: `Power-up "${pu.name}" has invalid tier (must be 1-5)` }, 400);
    }
    if (pu.prob < 0) {
      return json({ error: `Power-up "${pu.name}" has negative probability` }, 400);
    }
  }

  const config = {
    powerUps: powerUps.map((pu, i) => ({
      ...pu,
      id: pu.id || `pu_${Date.now()}_${i}`,
    })),
    rules: rules || LEAGUE_RULES,
    updatedAt: new Date().toISOString(),
    updatedBy: ownerId,
  };

  await kv.put(CONFIG_KEY, JSON.stringify(config));

  return json(config);
}
