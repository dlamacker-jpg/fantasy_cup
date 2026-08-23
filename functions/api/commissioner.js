// Commissioner API — action log + week phase management
// GET  /api/commissioner?log=true         — get commissioner action log
// GET  /api/commissioner?phase=true&week=X — get current week phase
// POST /api/commissioner  { action: 'setPhase', week, phase } — set week phase

import { OWNERS, getOwnerRole, json, handleCors } from './_shared.js';

export async function onRequestOptions() {
  return handleCors();
}

const VALID_PHASES = ['preseason', 'lock', 'assignment', 'deployment', 'resolution', 'complete'];

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const kv = env.POWERUPS_KV;
  if (!kv) return json({ error: 'KV store not bound' }, 500);

  // Commissioner action log
  if (url.searchParams.get('log') === 'true') {
    const raw = await kv.get('commissioner-log');
    return json(raw ? JSON.parse(raw) : []);
  }

  // Week phase
  if (url.searchParams.get('phase') === 'true') {
    const week = url.searchParams.get('week');
    if (!week) return json({ error: 'week required' }, 400);
    const raw = await kv.get(`week-phase:${week}`);
    return json(raw ? JSON.parse(raw) : { phase: 'assignment', week: parseInt(week), auto: true });
  }

  return json({ error: 'Use ?log=true or ?phase=true&week=X' }, 400);
}

export async function onRequestPost({ request, env }) {
  const kv = env.POWERUPS_KV;
  if (!kv) return json({ error: 'KV store not bound' }, 500);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const commissionerId = request.headers.get('X-Owner-Id') || body.commissionerId;
  const role = getOwnerRole(commissionerId);
  if (role !== 'admin' && role !== 'super_admin') {
    return json({ error: 'Commissioner access required' }, 403);
  }

  if (body.action === 'setPhase') {
    const { week, phase } = body;
    if (!week || !phase) return json({ error: 'week and phase required' }, 400);
    if (!VALID_PHASES.includes(phase)) {
      return json({ error: `Invalid phase. Use: ${VALID_PHASES.join(', ')}` }, 400);
    }

    const phaseData = {
      phase,
      week: parseInt(week),
      updatedAt: new Date().toISOString(),
      updatedBy: commissionerId,
      updatedByCharacter: OWNERS[commissionerId]?.character || 'Unknown',
    };
    await kv.put(`week-phase:${week}`, JSON.stringify(phaseData));

    // Log it
    const logRaw = await kv.get('commissioner-log');
    const log = logRaw ? JSON.parse(logRaw) : [];
    log.unshift({
      action: 'setPhase',
      week: parseInt(week),
      phase,
      by: commissionerId,
      byCharacter: OWNERS[commissionerId]?.character || 'Unknown',
      at: phaseData.updatedAt,
    });
    if (log.length > 200) log.length = 200;
    await kv.put('commissioner-log', JSON.stringify(log));

    return json(phaseData);
  }

  return json({ error: 'Unknown action' }, 400);
}
