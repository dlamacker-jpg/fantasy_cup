// API client for Cloudflare Pages Functions backend
const API_BASE = '/api';

async function apiFetch(path, options = {}) {
  const { headers: customHeaders, ...restOptions } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    ...restOptions,
    headers: { 'Content-Type': 'application/json', ...customHeaders },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data;
}

export const api = {
  // Auth
  login: (sleeperName, password) => apiFetch('/auth', {
    method: 'POST',
    body: JSON.stringify({ sleeperName, password }),
  }),

  // Eligibility
  getEligibility: (week) => apiFetch(`/eligibility?week=${week}`),

  // Power-ups (inventory)
  getInventory: (ownerId) => apiFetch(`/powerups?ownerId=${ownerId}`),
  getAllInventories: () => apiFetch('/powerups?all=true'),
  rollPowerUp: (ownerId, week) => apiFetch('/powerups', {
    method: 'POST',
    body: JSON.stringify({ action: 'roll', ownerId, week }),
  }),
  removePowerUp: (ownerId, index) => apiFetch('/powerups', {
    method: 'POST',
    body: JSON.stringify({ action: 'remove', ownerId, index }),
  }),

  // Deploy (owner-initiated — week auto-detected, opponent auto-resolved)
  // targetLeague = single league key, targetLeagues = array for multi-shot shells
  deployPowerUp: (ownerId, powerUpIndex, { targetLeague, targetLeagues, action, notes } = {}) => apiFetch('/deploy', {
    method: 'POST',
    body: JSON.stringify({ ownerId, powerUpIndex, targetLeague, targetLeagues, action, notes }),
  }),

  // Current NFL week
  getCurrentWeek: () => apiFetch('/deploy?currentWeek=true'),

  // Opponent lookup for a league + week
  getOpponent: (ownerId, league, week) => apiFetch(`/deploy?opponent=true&ownerId=${ownerId}&league=${league}&week=${week}`),

  // Activity Feed
  getFeed: (week, ownerId) => {
    const params = new URLSearchParams();
    if (week) params.set('week', week);
    if (ownerId) params.set('ownerId', ownerId);
    return apiFetch(`/feed?${params}`);
  },
  getDeployments: (week) => apiFetch(`/deploy?week=${week || ''}`),

  // Auto-roll (admin trigger)
  triggerAutoRoll: (week) => apiFetch(`/auto-roll?week=${week}`, { method: 'POST' }),

  // Resolution
  getResolutionStatus: (week) => apiFetch(`/auto-resolve${week ? `?week=${week}` : ''}`),
  triggerResolve: (ownerId, week) => apiFetch(`/auto-resolve${week ? `?week=${week}` : ''}`, {
    method: 'POST',
    headers: { 'X-Owner-Id': ownerId },
  }),
  getPendingDeploys: (week) => apiFetch(`/deploy?pending=true&week=${week}`),

  // Legacy submissions (kept for backward compat)
  getSubmissions: (ownerId) => apiFetch(ownerId ? `/submissions?ownerId=${ownerId}` : '/submissions'),

  // Admin
  resetPassword: (commissionerId, targetOwnerId) => apiFetch('/reset-password', {
    method: 'POST',
    body: JSON.stringify({ commissionerId, targetOwnerId }),
  }),

  // Preseason seed
  getSeedStatus: () => apiFetch('/seed'),
  seedAll: (force = false) => apiFetch('/seed', {
    method: 'POST',
    body: JSON.stringify(force ? { force: true } : {}),
  }),
  clearAllPowerUps: () => apiFetch('/seed', {
    method: 'POST',
    body: JSON.stringify({ action: 'clear' }),
  }),

  // Draft Sharks (via Parse.bot proxy)
  getDraftSharkRankings: ({ scoring = 'half-ppr', position = '', isDynasty = false, leagueType = 'standard', depth = 'rankings' } = {}) =>
    apiFetch(`/draftsharks?endpoint=rankings&scoring=${scoring}&position=${position}&is_dynasty=${isDynasty}&league_type=${leagueType}&depth=${depth}`),

  getDraftSharkPlayer: (playerId) =>
    apiFetch(`/draftsharks?endpoint=player&player_id=${playerId}`),

  getDraftSharkSoS: (position = 'qb') =>
    apiFetch(`/draftsharks?endpoint=sos&position=${position}`),

  getDraftSharkDepthCharts: (teamSlug) =>
    apiFetch(`/draftsharks?endpoint=depth_charts&team_slug=${teamSlug}`),

  getDraftSharkNews: () =>
    apiFetch('/draftsharks?endpoint=news'),

  // Commissioner overrides
  grantPowerUp: (commissionerId, ownerId, powerUpName, { week, reason } = {}) => apiFetch('/powerups', {
    method: 'POST',
    headers: { 'X-Owner-Id': commissionerId },
    body: JSON.stringify({ action: 'grant', ownerId, powerUpName, week, reason }),
  }),
  revokePowerUp: (commissionerId, ownerId, index, reason) => apiFetch('/powerups', {
    method: 'POST',
    headers: { 'X-Owner-Id': commissionerId },
    body: JSON.stringify({ action: 'revoke', ownerId, index, reason }),
  }),
  getCommissionerLog: () => apiFetch('/commissioner?log=true'),
  getWeekPhase: (week) => apiFetch(`/commissioner?phase=true&week=${week}`),
  setWeekPhase: (commissionerId, week, phase) => apiFetch('/commissioner', {
    method: 'POST',
    headers: { 'X-Owner-Id': commissionerId },
    body: JSON.stringify({ action: 'setPhase', week, phase }),
  }),
};
