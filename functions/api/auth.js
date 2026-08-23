// POST /api/auth — Login or Register
// Body: { "sleeperName": "iamdemartian", "password": "xxx" }

import { findOwnerBySleeper, getOwnerRole, json, handleCors } from './_shared.js';

export async function onRequestOptions() {
  return handleCors();
}

const credKey = (ownerId) => `cred:${ownerId}`;

async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const data = enc.encode(salt + ':' + password);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return json({ error: 'Content-Type must be application/json' }, 400);
    }

    const bodyText = await request.text();
    if (!bodyText) {
      return json({ error: 'Empty request body' }, 400);
    }

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (parseErr) {
      return json({ error: 'Invalid JSON in request body' }, 400);
    }

    const { sleeperName, password } = body;

    if (!sleeperName) return json({ error: 'Sleeper username is required' }, 400);
    if (!password || password.length < 4) return json({ error: 'Password must be at least 4 characters' }, 400);

    // 1. Find owner
    const owner = findOwnerBySleeper(sleeperName);
    if (!owner) {
      return json({ error: 'Sleeper username not found in this league' }, 401);
    }

    // 2. Check KV
    const kv = env.POWERUPS_KV;
    if (!kv) {
      return json({ error: 'KV store not bound. Check wrangler.toml bindings.' }, 500);
    }

    const key = credKey(owner.id);
    const stored = await kv.get(key);

    if (!stored) {
      // First login → Register
      const salt = generateSalt();
      const hash = await hashPassword(password, salt);
      await kv.put(key, JSON.stringify({ salt, hash, createdAt: new Date().toISOString() }));

      return json({
        ownerId: owner.id,
        name: owner.name,
        character: owner.character,
        sleeperName: owner.sleeper,
        role: getOwnerRole(owner.id),
        firstLogin: true,
      });
    }

    // Returning login → Verify
    const cred = JSON.parse(stored);
    const attemptHash = await hashPassword(password, cred.salt);

    if (attemptHash !== cred.hash) {
      return json({ error: 'Incorrect password' }, 401);
    }

    return json({
      ownerId: owner.id,
      name: owner.name,
      character: owner.character,
      sleeperName: owner.sleeper,
      role: getOwnerRole(owner.id),
      firstLogin: false,
    });
  } catch (err) {
    return json({ error: `Auth error: ${err.message}` }, 500);
  }
}
