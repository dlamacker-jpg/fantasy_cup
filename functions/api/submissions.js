// Power-Up Usage Submissions (owner → commissioner workflow)
// GET  /api/submissions                          — all pending (admin)
// GET  /api/submissions?ownerId=xxx              — owner's submissions
// POST /api/submissions  { ownerId, powerUpIndex, week, targetLeague, notes }  — submit usage
// PUT  /api/submissions  { submissionId, status, adminNotes }  — approve/deny (admin)

import { OWNERS, json, handleCors } from './_shared.js';

export async function onRequestOptions() {
  return handleCors();
}

const SUBS_KEY = 'submissions:all';

async function getSubmissions(kv) {
  const raw = await kv.get(SUBS_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function setSubmissions(kv, subs) {
  await kv.put(SUBS_KEY, JSON.stringify(subs));
}

// ─── GET ───
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const kv = env.POWERUPS_KV;
  const ownerId = url.searchParams.get('ownerId');

  const subs = await getSubmissions(kv);

  if (ownerId) {
    return json(subs.filter(s => s.ownerId === ownerId));
  }
  // Admin: return all
  return json(subs);
}

// ─── POST: Submit usage request ───
export async function onRequestPost({ request, env }) {
  const kv = env.POWERUPS_KV;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { ownerId, powerUpName, week, targetLeague, notes } = body;
  if (!ownerId || !OWNERS[ownerId]) return json({ error: 'Invalid ownerId' }, 400);
  if (!powerUpName) return json({ error: 'powerUpName required' }, 400);
  if (!week) return json({ error: 'week required' }, 400);

  const owner = OWNERS[ownerId];

  const submission = {
    id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    ownerId,
    ownerName: owner.name,
    character: owner.character,
    powerUpName,
    week,
    targetLeague: targetLeague || null,
    notes: notes || '',
    status: 'pending',   // pending | approved | denied
    adminNotes: '',
    submittedAt: new Date().toISOString(),
    resolvedAt: null,
  };

  const subs = await getSubmissions(kv);
  subs.unshift(submission); // newest first
  await setSubmissions(kv, subs);

  return json(submission, 201);
}

// ─── PUT: Admin approve/deny ───
export async function onRequestPut({ request, env }) {
  const kv = env.POWERUPS_KV;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { submissionId, status, adminNotes } = body;
  if (!submissionId) return json({ error: 'submissionId required' }, 400);
  if (!['approved', 'denied'].includes(status)) return json({ error: 'status must be approved or denied' }, 400);

  const subs = await getSubmissions(kv);
  const sub = subs.find(s => s.id === submissionId);
  if (!sub) return json({ error: 'Submission not found' }, 404);

  sub.status = status;
  sub.adminNotes = adminNotes || '';
  sub.resolvedAt = new Date().toISOString();

  // If approved, remove the power-up from the owner's inventory
  if (status === 'approved') {
    const invKey = `inventory:${sub.ownerId}`;
    const raw = await kv.get(invKey);
    const inventory = raw ? JSON.parse(raw) : [];
    const idx = inventory.findIndex(p => p.name === sub.powerUpName);
    if (idx !== -1) {
      inventory.splice(idx, 1);
      await kv.put(invKey, JSON.stringify(inventory));
    }

    // Add to history
    const histKey = `history:${sub.ownerId}`;
    const histRaw = await kv.get(histKey);
    const history = histRaw ? JSON.parse(histRaw) : [];
    history.unshift({
      type: 'used',
      powerUp: sub.powerUpName,
      week: sub.week,
      targetLeague: sub.targetLeague,
      notes: sub.notes,
      approvedAt: sub.resolvedAt,
      at: sub.resolvedAt,
    });
    await kv.put(histKey, JSON.stringify(history));
  }

  await setSubmissions(kv, subs);
  return json(sub);
}
