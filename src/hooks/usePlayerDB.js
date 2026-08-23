import { useState, useEffect } from 'react';

const API = 'https://api.sleeper.app/v1';

// ─── Lightweight player metadata cache ───
// Sleeper's /players/nfl is ~30MB. We fetch it once per session and cache in memory.
let playerCachePromise = null;
let playerCache = null;

export function fetchPlayerDB() {
  if (playerCache) return Promise.resolve(playerCache);
  if (playerCachePromise) return playerCachePromise;
  playerCachePromise = fetch(`${API}/players/nfl`)
    .then(r => {
      if (!r.ok) throw new Error(`Players API ${r.status}`);
      return r.json();
    })
    .then(data => {
      const slim = {};
      for (const [pid, p] of Object.entries(data)) {
        if (!p || !p.position) continue;
        slim[pid] = {
          fn: p.first_name || '',
          ln: p.last_name || '',
          pos: p.position,
          team: p.team || 'FA',
        };
      }
      playerCache = slim;
      return slim;
    })
    .catch(() => {
      playerCachePromise = null;
      return null;
    });
  return playerCachePromise;
}

export function getPlayerCache() {
  return playerCache;
}

/**
 * React hook that returns the player DB (loads once, cached globally).
 * @returns {{ playerDB: object|null, loading: boolean }}
 */
export function usePlayerDB() {
  const [playerDB, setPlayerDB] = useState(playerCache);
  const [loading, setLoading] = useState(!playerCache);

  useEffect(() => {
    if (playerCache) { setPlayerDB(playerCache); setLoading(false); return; }
    let cancelled = false;
    fetchPlayerDB().then(db => {
      if (!cancelled) {
        if (db) setPlayerDB(db);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  return { playerDB, loading };
}
