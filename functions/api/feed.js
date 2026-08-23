// GET /api/feed — League-wide activity feed
// Returns all power-up activity (rolls, deployments) visible to everyone.
// Transparency replaces commissioner oversight.
//
// Query params:
//   ?week=5      — filter to specific week
//   ?limit=20    — limit results (default 50)
//   ?ownerId=xxx — filter to specific owner

import { json, handleCors } from './_shared.js';

export async function onRequestOptions() {
  return handleCors();
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const kv = env.POWERUPS_KV;
  if (!kv) return json({ error: 'KV store not bound' }, 500);

  const feedRaw = await kv.get('feed:global');
  let feed = feedRaw ? JSON.parse(feedRaw) : [];

  // Filters
  const week = url.searchParams.get('week');
  if (week) feed = feed.filter(e => e.week === parseInt(week));

  const ownerId = url.searchParams.get('ownerId');
  if (ownerId) feed = feed.filter(e => e.ownerId === ownerId);

  const limit = parseInt(url.searchParams.get('limit')) || 50;
  feed = feed.slice(0, limit);

  return json(feed);
}
