// ─── Seasons ───
export const SEASONS = {
  2026: {
    label: '2026',
    current: true,
    leagues: {
      mushroom: { id: '1391995568863051776', draftId: '1391995568875671552' },
      flower:   { id: '1391926961898528768', draftId: '1391926961919500289' },
      star:     { id: '1391995745485225984', draftId: '1391995745497800704' },
    },
  },
  2025: {
    label: '2025',
    current: false,
    leagues: {
      mushroom: { id: '1262182708671430656', draftId: '1262182708688191488' },
      flower:   { id: '1262216262478483456', draftId: '1262216262482669568' },
      star:     { id: '1265777768050733056', draftId: '1265777768059113472' },
    },
  },
  2024: {
    label: '2024',
    current: false,
    leagues: {
      mushroom: { id: '1128124762573778944', draftId: '1128124763542536192' },
      flower:   { id: '1128125230616014848', draftId: '1128125231622754304' },
      star:     { id: '1128120931387338752', draftId: '1128120932398186496' },
    },
  },
};

export const DEFAULT_SEASON = '2026';

// ─── League metadata (shared across seasons) ───
export const LEAGUE_META = {
  mushroom: {
    name: 'Mushroom Cup',
    emoji: '🍄',
    type: 'Standard',
    color: '#E52521',
    gradient: 'from-red-600 to-red-800',
  },
  flower: {
    name: 'Flower Cup',
    emoji: '🌼',
    type: 'Best Ball',
    color: '#43B047',
    gradient: 'from-green-500 to-green-700',
  },
  star: {
    name: 'Star Cup',
    emoji: '⭐',
    type: 'Auction',
    color: '#FBBE00',
    gradient: 'from-yellow-400 to-yellow-600',
  },
};

// ─── League IDs & metadata (default season — backward compat) ───
export const LEAGUES = Object.fromEntries(
  Object.entries(LEAGUE_META).map(([key, meta]) => [
    key,
    { ...meta, ...SEASONS[DEFAULT_SEASON].leagues[key] },
  ])
);

// Helper: get league config for a specific season
export function getLeaguesForSeason(season) {
  const s = SEASONS[season];
  if (!s) return LEAGUES; // fallback
  return Object.fromEntries(
    Object.entries(LEAGUE_META).map(([key, meta]) => [
      key,
      { ...meta, ...s.leagues[key] },
    ])
  );
}

// ─── Departed owners (removed after 2025) ───
export const DEPARTED_OWNER_IDS = new Set([
  '704557122054057984',  // Eric Schwickerath (prev King Boo) → Shay Melby took over as King Boo
  '968217113603219456',  // Jon Dinsdale (Koopa Troopa) → replaced by Waluigi
]);

// ─── Owner registry (Sleeper user_id → info) ───
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

// ─── Scoring tables (from bylaws) ───
export const REG_SEASON_POINTS = {
  1: 200, 2: 190, 3: 180, 4: 170, 5: 160, 6: 150,
  7: 140, 8: 130, 9: 120, 10: 110, 11: 100, 12: 90,
};

export const PLAYOFF_POINTS = {
  1: 150, 2: 115, 3: 90, 4: 75, 5: 50, 6: 40,
};

export const CONSOLATION_POINTS = {
  7: 45, 8: 35, 9: 20, 10: 15, 11: 5, 12: 0,
};

// Bonus: Top Speed = +10/league for season-high weekly score
// Team Top Speed = +5 for highest across all leagues
// MVP = +50 for highest aggregate regular season W/L (splits on ties)
export const BONUS_CONFIG = {
  topSpeedPerLeague: 10,
  teamTopSpeed: 5,
  mvpBonus: 50,
};

// ─── Character visual config ───
export const CHARACTER_THEMES = {
  'Mario':          { primary: '#E52521', secondary: '#049CD8', accent: '#FBBE00', initial: 'M',  icon: '🔴' },
  'Luigi':          { primary: '#43B047', secondary: '#049CD8', accent: '#FBBE00', initial: 'L',  icon: '💚' },
  'Princess Peach': { primary: '#F896D8', secondary: '#FFD700', accent: '#FFFFFF', initial: 'P',  icon: '👑' },
  'Bowser':         { primary: '#F28C28', secondary: '#43B047', accent: '#E52521', initial: 'B',  icon: '🐲' },
  'Yoshi':          { primary: '#43B047', secondary: '#FFFFFF', accent: '#E52521', initial: 'Y',  icon: '🦎' },
  'Toad':           { primary: '#E52521', secondary: '#FFFFFF', accent: '#049CD8', initial: 'T',  icon: '🍄' },
  'Donkey Kong':    { primary: '#8B4513', secondary: '#E52521', accent: '#FBBE00', initial: 'DK', icon: '🦍' },
  'Wario':          { primary: '#FBBE00', secondary: '#7B2D8E', accent: '#FFFFFF', initial: 'W',  icon: '💛' },
  'King Boo':       { primary: '#B19CD9', secondary: '#FFFFFF', accent: '#4B0082', initial: 'KB', icon: '👻' },
  'King Boo OG':    { primary: '#8B7BB8', secondary: '#C0C0C0', accent: '#2E0854', initial: 'KB', icon: '👻' },
  'Dry Bones':      { primary: '#D3D3D3', secondary: '#808080', accent: '#FFFFFF', initial: 'DB', icon: '💀' },
  'Koopa Troopa':   { primary: '#43B047', secondary: '#FBBE00', accent: '#8B4513', initial: 'KT', icon: '🐢' },
  'Funky Kong':     { primary: '#8B4513', secondary: '#E52521', accent: '#FFD700', initial: 'FK', icon: '🏄' },
  'Waluigi':        { primary: '#7B2D8E', secondary: '#FBBE00', accent: '#1a1a2e', initial: 'WL', icon: '💜' },
  'Shy Guy':        { primary: '#E52521', secondary: '#FFFFFF', accent: '#049CD8', initial: 'SG', icon: '🎭' },
};

// Character images — bundled locally from mariokart.fandom.com renders
export const CHARACTER_IMAGES = {
  'Mario':          '/characters/mario.webp',
  'Luigi':          '/characters/luigi.webp',
  'Princess Peach': '/characters/peach.webp',
  'Bowser':         '/characters/bowser.webp',
  'Yoshi':          '/characters/yoshi.webp',
  'Toad':           '/characters/toad.webp',
  'Donkey Kong':    '/characters/donkey-kong.webp',
  'Wario':          '/characters/wario.webp',
  'King Boo':       '/characters/king-boo.webp',
  'King Boo OG':    '/characters/king-boo.webp',
  'Dry Bones':      '/characters/dry-bones.webp',
  'Koopa Troopa':   '/characters/koopa-troopa.webp',
  'Funky Kong':     '/characters/funky-kong.webp',
  'Waluigi':        '/characters/waluigi.webp',
  'Shy Guy':        '/characters/shy-guy.webp',
};

// ─── Power-Ups — Drew's 5-tier system with probabilities ───
// Tier 1=Common(17%), 2=Uncommon(12%), 3=Rare(8%), 4=Epic(4%), 5=Legendary(2%)
export const POWER_UPS = [
  { name: 'Mushroom',           icon: '🍄',  tier: 1, prob: 17, holdable: false, type: 'self-boost',
    effect: 'Add +5 pts to your team score' },
  { name: 'Green Shell',        icon: '🟢',  tier: 1, prob: 17, holdable: true,  type: 'offensive',
    effect: 'Shot at opponent — 50% chance to subtract -5 pts', hitChance: 0.5 },
  { name: 'Triple Green Shell', icon: '🟢🟢🟢', tier: 2, prob: 12, holdable: true, type: 'offensive',
    effect: '3 shots across any leagues (50% hit each). Hold to block incoming shells.', hitChance: 0.5, shots: 3 },
  { name: 'Red Shell',          icon: '🔴',  tier: 2, prob: 12, holdable: true,  type: 'offensive',
    effect: 'Guaranteed -5 pts from this week\'s opponent', hitChance: 1.0 },
  { name: 'Triple Red Shell',   icon: '🔴🔴🔴', tier: 3, prob: 8, holdable: true, type: 'offensive',
    effect: '3 guaranteed shots across any leagues (-5 each). Hold to block incoming shells.', hitChance: 1.0, shots: 3 },
  { name: 'Bullet Bill',        icon: '🚀',  tier: 3, prob: 8,  holdable: false, type: 'self-boost',
    effect: 'Add +10 pts to your team score' },
  { name: 'Ghost',              icon: '👻',  tier: 3, prob: 8,  holdable: false, type: 'special',
    effect: 'Steal a random team\'s available power-up' },
  { name: 'Star',               icon: '⭐',  tier: 4, prob: 4,  holdable: false, type: 'defensive',
    effect: 'Immune to all power-ups this week + adds +5 pts' },
  { name: 'Lightning',          icon: '⚡',  tier: 4, prob: 4,  holdable: false, type: 'offensive-aoe',
    effect: 'Everyone loses -5 pts (except Star holders) + you lose a held item' },
  { name: 'Super Horn',         icon: '📯',  tier: 4, prob: 4,  holdable: false, type: 'self-boost',
    effect: 'All your players guaranteed to hit their projections' },
  { name: 'Kimek\'s Magic',     icon: '🪄',  tier: 5, prob: 2,  holdable: false, type: 'special',
    effect: 'Change this week\'s matchup to a team of your choosing (once per team)' },
  { name: 'Blue Spiked Shell',  icon: '💙',  tier: 5, prob: 2,  holdable: false, type: 'offensive',
    effect: 'Force bench an opponent\'s starter (must have a viable replacement)' },
  { name: 'Warp Pipe',          icon: '🟩',  tier: 5, prob: 2,  holdable: false, type: 'self-boost',
    effect: 'Swap a bench player for a starter on your own team (only retro power-up)', retro: true },
];

// Tier display config
export const TIER_CONFIG = {
  1: { name: 'Common',    color: 'gray',   textClass: 'text-gray-400',   borderClass: 'border-gray-500/40 bg-gray-500/10' },
  2: { name: 'Uncommon',  color: 'green',  textClass: 'text-green-400',  borderClass: 'border-green-500/40 bg-green-500/10' },
  3: { name: 'Rare',      color: 'blue',   textClass: 'text-blue-400',   borderClass: 'border-blue-500/40 bg-blue-500/10' },
  4: { name: 'Epic',      color: 'purple', textClass: 'text-purple-400', borderClass: 'border-purple-500/40 bg-purple-500/10' },
  5: { name: 'Legendary', color: 'yellow', textClass: 'text-yellow-400', borderClass: 'border-yellow-500/40 bg-yellow-500/10 shadow-lg shadow-yellow-500/10' },
};

export const POWER_UP_RULES = [
  'Each team has three available powerup slots. Shells can be "held" to free up a slot.',
  'Teams must inform the commissioner of power-up use by EOD Wednesday. All power-ups are assumed "don\'t use" unless otherwise notified.',
  'Power-ups can only be used in the current week.',
  'Offensive power-ups (except Lightning) automatically target your current opponent.',
  'Triple shells can spread shots across multiple leagues — one shot per league.',
  'Holding a triple shell gives defensive charges — blocks incoming shells automatically.',
  'Weekly deployment order is randomized — order impacts effectiveness (e.g. Star blocks shells that resolve after it).',
  'Can only earn up to 3 power-ups each week.',
  'Must use a held power-up before deploying a new one.',
  'Can only use one power-up per week.',
  'Power-ups cannot be used in the playoffs.',
  'Each team\'s power-up list is private — communicated by the commissioner directly.',
  'Only one power-up can target a single owner per league per week (except Lightning).',
  'Power-ups accrue at the Fantasy Cup level and can be deployed in any league.',
  'Tiebreakers will be taken to a wheel.',
  'Everybody starts with one power-up.',
];

// How teams earn power-up rolls each week (per league)
export const POWER_UP_ACQUISITION = [
  'Best starting roster accuracy',
  'Largest margin of victory for the week',
  'Worst team optimized score for the week (reverse MPF)',
  'Top player scorer of the week (including benches)',
];

// Weekly mechanics flow
export const POWER_UP_MECHANICS = [
  'Commissioner calculates who gets power-ups, and for what, that week.',
  'Commissioner runs power-up selection wheel — as needed — for each league by EOD Tuesday.',
  'Commissioner lets individuals know what power-ups they obtained.',
  'Teams have until EOD Wednesday to notify commissioner of use of power-up. All power-ups being used, and on whom, will be randomized and run accordingly.',
  'Commissioner notifies the league of who is using what power-ups that week via the power-ups Discord channel.',
];
