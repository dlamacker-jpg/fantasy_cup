// ─── Shared constants & helpers for Cloudflare Pages Functions ───

export const SLEEPER_API = 'https://api.sleeper.app/v1';

// 2026 season league IDs (must match frontend leagueConfig.js SEASONS[2026])
export const LEAGUES = {
  mushroom: { id: '1391995568863051776', name: 'Mushroom Cup' },
  flower:   { id: '1391926961898528768', name: 'Flower Cup' },
  star:     { id: '1391995745485225984', name: 'Star Cup' },
};

// Owner ID → info (must match frontend leagueConfig.js exactly)
export const OWNERS = {
  '463127531231375360':  { name: 'Drew Kahler',        character: 'Wario',          sleeper: 'Scratchlinkz34' },
  '863922541440425984':  { name: 'Demar Amacker',      character: 'Donkey Kong',    sleeper: 'iamdemartian' },
  '703682735146901504':  { name: 'Nick Weinmeister',   character: 'Yoshi',          sleeper: 'ShadyMcCoys' },
  '706674136713359360':  { name: 'Jordan Thies',       character: 'Princess Peach', sleeper: 'Jricky0206' },
  '706215196338761728':  { name: 'Jamison Thies',      character: 'Bowser',         sleeper: 'iThies' },
  '1116491330982637568': { name: 'Connor Johnson',     character: 'Funky Kong',     sleeper: 'ConnJohn11' },
  '704557122054057984':  { name: 'Eric Schwickerath',  character: 'King Boo OG',    sleeper: 'musicfreakster' },
  '705859646421803008':  { name: 'Ben Nutsch',         character: 'Toad',           sleeper: 'GreenSpartan' },
  '1119389966993399808': { name: 'Dan Housekeeper',    character: 'Dry Bones',      sleeper: 'dhousekeeper' },
  '704399963739717632':  { name: 'Lance Sovde',        character: 'Mario',          sleeper: 'sovoddabod' },
  '968217113603219456':  { name: 'Jon Dinsdale',       character: 'Koopa Troopa',   sleeper: 'kittlemeup85' },
  '854901967166734336':  { name: 'Justin Harris',      character: 'Luigi',          sleeper: 'jharris49' },
  '862405907403968512':  { name: 'Josh Weinstein',     character: 'Waluigi',        sleeper: 'jmarshawn' },
  '706673856089223168':  { name: 'Shay Melby',         character: 'King Boo',       sleeper: 'shaybone' },
};

// Departed owners — still in OWNERS for historical lookups but excluded from active-season logic
export const DEPARTED_OWNER_IDS = new Set([
  '704557122054057984',  // Eric Schwickerath (prev King Boo)
  '968217113603219456',  // Jon Dinsdale (Koopa Troopa)
]);

// Active owners only (for power-up operations)
export const ACTIVE_OWNERS = Object.fromEntries(
  Object.entries(OWNERS).filter(([id]) => !DEPARTED_OWNER_IDS.has(id))
);

// Look up owner by Sleeper display name (case-insensitive)
export function findOwnerBySleeper(sleeperName) {
  const lower = sleeperName.trim().toLowerCase();
  for (const [id, info] of Object.entries(OWNERS)) {
    if (info.sleeper.toLowerCase() === lower) return { id, ...info };
  }
  return null;
}

// Power-up definitions (Drew's 5-tier system)
// Probabilities add to 100, tiers 1-5 (1=common, 5=legendary)
export const POWER_UPS = [
  // ─── Tier 1 (17% each = 34% total) ───
  { name: 'Mushroom',           tier: 1, prob: 17,
    effect: 'Add +5 pts to your team score',
    type: 'self-boost', holdable: false },
  { name: 'Green Shell',        tier: 1, prob: 17,
    effect: 'Shot at opponent — 50% chance to subtract -5 pts from opponent',
    type: 'offensive', holdable: true, hitChance: 0.5 },

  // ─── Tier 2 (12% each = 24% total) ───
  { name: 'Triple Green Shell', tier: 2, prob: 12,
    effect: '3 shots across any leagues (50% hit each). Hold to block incoming shells.',
    type: 'offensive', holdable: true, hitChance: 0.5, shots: 3 },
  { name: 'Red Shell',          tier: 2, prob: 12,
    effect: 'Guaranteed -5 pts from this week\'s opponent',
    type: 'offensive', holdable: true, hitChance: 1.0 },

  // ─── Tier 3 (8% each = 24% total) ───
  { name: 'Triple Red Shell',   tier: 3, prob: 8,
    effect: '3 guaranteed shots across any leagues (-5 each). Hold to block incoming shells.',
    type: 'offensive', holdable: true, hitChance: 1.0, shots: 3 },
  { name: 'Bullet Bill',        tier: 3, prob: 8,
    effect: 'Add +10 pts to your team score',
    type: 'self-boost', holdable: false },
  { name: 'Ghost',              tier: 3, prob: 8,
    effect: 'Steal a random team\'s available power-up',
    type: 'special', holdable: false },

  // ─── Tier 4 (4% each = 12% total) ───
  { name: 'Star',               tier: 4, prob: 4,
    effect: 'Immune to all power-ups this week + adds +5 pts',
    type: 'defensive', holdable: false },
  { name: 'Lightning',          tier: 4, prob: 4,
    effect: 'Everyone loses -5 pts (except Star holders) + you lose a held item',
    type: 'offensive-aoe', holdable: false },
  { name: 'Super Horn',         tier: 4, prob: 4,
    effect: 'All your players guaranteed to hit their projections',
    type: 'self-boost', holdable: false },

  // ─── Tier 5 (2% each = 6% total) ───
  { name: "Kimek's Magic",      tier: 5, prob: 2,
    effect: 'Change this week\'s matchup to a team of your choosing (can only pick each team once)',
    type: 'special', holdable: false },
  { name: 'Blue Spiked Shell',  tier: 5, prob: 2,
    effect: 'Force bench an opponent\'s starter (must have a viable replacement)',
    type: 'offensive', holdable: false },
  { name: 'Warp Pipe',          tier: 5, prob: 2,
    effect: 'Swap a bench player for a starter on your own team (only retro power-up)',
    type: 'self-boost', holdable: false, retro: true },
];

// Tier labels for display
export const TIER_LABELS = {
  1: { name: 'Common',    color: 'gray' },
  2: { name: 'Uncommon',  color: 'green' },
  3: { name: 'Rare',      color: 'blue' },
  4: { name: 'Epic',      color: 'purple' },
  5: { name: 'Legendary', color: 'yellow' },
};

// Build weighted probability pool from power-up prob values
// (used by both auto-roll and manual roll)
export function rollPowerUpWeighted(customPowerUps) {
  const source = customPowerUps || POWER_UPS;
  const pool = [];
  source.forEach(pu => {
    for (let i = 0; i < pu.prob; i++) pool.push(pu);
  });
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return {
    name: pick.name,
    tier: pick.tier,
    effect: pick.effect,
    type: pick.type,
    holdable: pick.holdable || false,
    rolledAt: new Date().toISOString(),
  };
}

// Load power-up config from KV (falls back to hardcoded POWER_UPS)
export async function getCustomPowerUps(kv) {
  try {
    const raw = await kv.get('powerup-config');
    if (raw) {
      const config = JSON.parse(raw);
      if (config.powerUps?.length > 0) return config.powerUps;
    }
  } catch {}
  return null; // use defaults
}

// League rules
export const LEAGUE_RULES = {
  maxInventorySlots: 3,
  maxRollsPerWeek: 3,
  maxDeploysPerWeek: 1,          // can only use one power-up per week
  playoffWeeksStart: 15,          // no power-ups in weeks 15-17
  deployDeadline: 'thursday',     // before Thursday Night Football kickoff
  everyoneStartsWithOne: true,    // week 1 everyone gets a free roll
  mustUseHeldFirst: true,         // held items must be used before other items
  oneTargetPerOwnerPerLeague: true, // only one power-up can target a single owner/league/week (except Lightning)
};

// ─── Role definitions ───
// super_admin = full access (Demar), admin = commissioner access (Wario), user = default
export const ROLES = {
  '863922541440425984': 'super_admin',  // Demar / Donkey Kong
  '463127531231375360': 'admin',        // Drew Kahler / Wario (commish)
};

export function getOwnerRole(ownerId) {
  return ROLES[ownerId] || 'user';
}

// JSON response helper
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

// CORS preflight handler
export function handleCors() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Owner-Id',
    },
  });
}
