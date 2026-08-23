/**
 * AI-driven Narrative Engine
 *
 * Generates Mario Kart-themed season storylines, rivalry narratives,
 * and weekly commentary from matchup data. All algorithmic — no external
 * API calls needed.
 */

// ─── Helpers ───
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pct = (n, d) => d > 0 ? ((n / d) * 100).toFixed(0) : '0';

// ─── Season Narrative Archetypes ───
// Each owner is assigned an archetype based on their data signature.
const ARCHETYPES = {
  dominant: {
    tag: 'The Final Boss',
    icon: '👑',
    color: 'text-mk-gold',
    border: 'border-mk-gold/30',
  },
  hotStreak: {
    tag: 'On Fire',
    icon: '🔥',
    color: 'text-orange-400',
    border: 'border-orange-500/30',
  },
  coldStreak: {
    tag: 'Spinning Out',
    icon: '🌀',
    color: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  overachiever: {
    tag: 'Star Power',
    icon: '⭐',
    color: 'text-yellow-300',
    border: 'border-yellow-400/30',
  },
  underachiever: {
    tag: 'Blue Shelled',
    icon: '🐚',
    color: 'text-cyan-400',
    border: 'border-cyan-500/30',
  },
  consistent: {
    tag: 'Cruise Control',
    icon: '🚗',
    color: 'text-green-400',
    border: 'border-green-500/30',
  },
  volatile: {
    tag: 'Wildcard',
    icon: '🎰',
    color: 'text-purple-400',
    border: 'border-purple-500/30',
  },
  rising: {
    tag: 'Turbo Boost',
    icon: '🚀',
    color: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  fading: {
    tag: 'Out of Gas',
    icon: '⛽',
    color: 'text-red-400',
    border: 'border-red-500/30',
  },
  middlePack: {
    tag: 'In the Pack',
    icon: '🏎️',
    color: 'text-gray-300',
    border: 'border-white/10',
  },
  cellarDweller: {
    tag: 'Banana Peel',
    icon: '🍌',
    color: 'text-red-400',
    border: 'border-red-500/30',
  },
  sleeper: {
    tag: 'Dark Horse',
    icon: '🐴',
    color: 'text-indigo-400',
    border: 'border-indigo-500/30',
  },
};

// ─── Determine archetype from stats ───
function getArchetype(team, rank, totalTeams) {
  const { winPct, luck, recentAvg, avgPF, stdDev, wins, losses } = team;
  const recentTrend = recentAvg - avgPF;
  const topThird = rank <= Math.ceil(totalTeams / 3);
  const bottomThird = rank > totalTeams - Math.ceil(totalTeams / 3);

  // Dominant: top rank, high win%, high scoring
  if (rank === 1 && winPct > 0.6) return 'dominant';

  // Hot streak: recent form significantly above average
  if (recentTrend > 12 && !bottomThird) return 'hotStreak';

  // Cold streak: recent form significantly below average
  if (recentTrend < -12 && !topThird) return 'coldStreak';

  // Overachiever: many more wins than expected (lucky)
  if (luck > 2.5) return 'overachiever';

  // Underachiever: many fewer wins than expected (unlucky)
  if (luck < -2.5) return 'underachiever';

  // Rising: in bottom half but trending up hard
  if (!topThird && recentTrend > 8) return 'rising';

  // Fading: in top half but trending down
  if (topThird && recentTrend < -8) return 'fading';

  // Volatile: high standard deviation
  if (stdDev > 25) return 'volatile';

  // Consistent: low standard deviation, decent record
  if (stdDev < 15 && winPct > 0.4) return 'consistent';

  // Cellar dweller: bottom rank, losing record
  if (rank >= totalTeams - 1 && winPct < 0.35) return 'cellarDweller';

  // Sleeper: middle of pack but high scoring (could break out)
  if (!topThird && !bottomThird && avgPF > 100) return 'sleeper';

  return 'middlePack';
}

// ─── Season storyline templates ───
const SEASON_TEMPLATES = {
  dominant: [
    '{name} is running away with it — {wins}-{losses} and the highest power score in the league. Everyone else is racing for second.',
    'Nobody has an answer for {name}. At {wins}-{losses} with a {avgPF} PPG average, they\'re lapping the field.',
    '{name} sits atop the leaderboard like a true final boss. {wins} wins, {avgPF} points per game, and no signs of slowing down.',
  ],
  hotStreak: [
    '{name} has hit the mushroom boost — their recent average of {recentAvg} is well above their {avgPF} season mark. Watch out.',
    'Something clicked for {name}. They\'re averaging {recentAvg} over recent weeks, up from {avgPF} on the season. Momentum is real.',
    '{name} is scorching the track right now. {recentAvg} PPG lately vs {avgPF} on the year — they\'re peaking at the right time.',
  ],
  coldStreak: [
    '{name} has hit a banana peel. Their recent {recentAvg} PPG is a steep drop from their {avgPF} season average.',
    'Red flags for {name} — scoring has cratered to {recentAvg} recently after averaging {avgPF} all season. Time to make some moves.',
    '{name} is spinning out. From {avgPF} PPG down to {recentAvg} in recent weeks. The roster needs a jolt.',
  ],
  overachiever: [
    '{name} has been living right at {wins}-{losses}, but the numbers say they should be closer to {expectedW} wins. Lucky star indeed.',
    'The schedule has been kind to {name}. {wins} wins vs {expectedW} expected — they\'re banking luck like coins on Rainbow Road.',
    '{name} keeps finding ways to win close games. {wins}-{losses} looks great, but {expectedW} expected wins suggests some regression is coming.',
  ],
  underachiever: [
    '{name} can\'t catch a break — {wins}-{losses} despite numbers that suggest {expectedW} wins. They\'re better than their record shows.',
    'If fantasy football were fair, {name} would have ~{expectedW} wins instead of {wins}. The matchup gods have not been kind.',
    '{name} is the most dangerous team with a losing record. At {avgPF} PPG, they should have {expectedW} wins — the luck will turn.',
  ],
  consistent: [
    '{name} is the definition of steady. Low variance ({stdDev} SD) and a solid {wins}-{losses} record. You know exactly what you\'re getting.',
    'No fireworks, no disasters — {name} shows up every week with a tight {stdDev} SD range. Boring? Maybe. Effective? {wins}-{losses} says yes.',
    '{name} has been Mr. Consistent all season. A {stdDev} standard deviation means they rarely boom or bust. Reliable at {avgPF} PPG.',
  ],
  volatile: [
    '{name} is must-watch TV. With a {stdDev} SD, any given week could be a league-high explosion or an embarrassing dud.',
    'Buckle up for {name} — a {stdDev} standard deviation means they\'re either dropping 150 or forgetting to set their lineup. No in-between.',
    '{name} is the league\'s wildcard. {avgPF} PPG sounds fine, but that {stdDev} SD means they\'re all over the map.',
  ],
  rising: [
    '{name} is making a late-season charge. Recent scoring at {recentAvg} PPG is a big jump from their {avgPF} average — don\'t sleep on this team.',
    'Turbo boost activated. {name} has been on a tear recently ({recentAvg} PPG) and could be the most dangerous team in the playoffs.',
    '{name}\'s roster is gelling at the perfect time. {recentAvg} recent PPG vs {avgPF} on the year — this team is trending up hard.',
  ],
  fading: [
    '{name} is losing steam. From {avgPF} PPG on the season down to {recentAvg} recently — the wheels may be coming off.',
    'Concerning trend for {name}: scoring has dipped to {recentAvg} lately despite a {avgPF} season average. Playoff run in jeopardy.',
    '{name} looked like a contender earlier, but {recentAvg} recent PPG tells a different story. Running on fumes.',
  ],
  middlePack: [
    '{name} is right in the thick of it at {wins}-{losses}. Nothing flashy, nothing disastrous — just another face in the pack.',
    'The story of {name}\'s season: average. {wins}-{losses} record, {avgPF} PPG, middle of the road. They need a spark.',
    '{name} is stuck in no-man\'s land at {wins}-{losses}. Not bad enough to rebuild, not good enough to feel confident. A crossroads.',
  ],
  cellarDweller: [
    'It\'s been rough for {name} at {wins}-{losses}. The Sacko race is on, and they\'re leading it the wrong way.',
    '{name} is in full crisis mode. {wins}-{losses} with {avgPF} PPG — they\'re staring down the Sacko punishment.',
    'Someone check on {name}. At {wins}-{losses} they\'re firmly in the Sacko conversation. Banana peel season.',
  ],
  sleeper: [
    'Don\'t overlook {name}. They\'re quietly putting up {avgPF} PPG from the middle of the pack. One hot week away from a breakout.',
    '{name} is the dark horse nobody\'s talking about. {avgPF} PPG says they have the firepower — they just need the matchup luck.',
    'Flying under the radar: {name} averages {avgPF} PPG but sits mid-pack at {wins}-{losses}. A playoff sleeper for sure.',
  ],
};

// ─── Rivalry detection ───
function detectRivalries(cupData) {
  // Build H2H records from matchup data
  const h2h = {}; // "ownerA|ownerB" → { a, b, aWins, bWins, totalMargin, games, results }

  Object.entries(cupData).forEach(([cupKey, cd]) => {
    const { allMatchups, rosterToOwner, playoffWeekStart } = cd;
    const maxWeek = playoffWeekStart || 18;

    for (let week = 1; week <= maxWeek; week++) {
      const weekData = allMatchups[week];
      if (!weekData || weekData.length === 0) continue;

      const groups = {};
      weekData.forEach(m => {
        if (m.matchup_id == null) return;
        if (!groups[m.matchup_id]) groups[m.matchup_id] = [];
        groups[m.matchup_id].push(m);
      });

      Object.values(groups).forEach(pair => {
        if (pair.length !== 2) return;
        const [a, b] = pair;
        const infoA = rosterToOwner[a.roster_id];
        const infoB = rosterToOwner[b.roster_id];
        if (!infoA || !infoB) return;

        const ids = [infoA.ownerId, infoB.ownerId].sort();
        const key = ids.join('|');
        if (!h2h[key]) {
          h2h[key] = { a: ids[0], b: ids[1], games: 0, results: [], charA: null, charB: null };
        }
        const rec = h2h[key];
        const ptsA = a.points || 0;
        const ptsB = b.points || 0;

        // Map to sorted order
        const isAFirst = infoA.ownerId === ids[0];
        const firstPts = isAFirst ? ptsA : ptsB;
        const secondPts = isAFirst ? ptsB : ptsA;
        const firstInfo = isAFirst ? infoA : infoB;
        const secondInfo = isAFirst ? infoB : infoA;

        rec.charA = firstInfo.character;
        rec.charB = secondInfo.character;
        rec.games++;
        rec.results.push({ week, cup: cupKey, firstPts, secondPts, margin: Math.abs(firstPts - secondPts) });
      });
    }
  });

  return Object.values(h2h).filter(r => r.games >= 2);
}

// ─── Rivalry narrative templates ───
const RIVALRY_TEMPLATES = {
  heated: [
    'The {charA} vs {charB} rivalry is heating up — {games} meetings this season, all decided by razor-thin margins ({avgMargin} avg).',
    '{charA} and {charB} can\'t stop trading blows. {games} matchups, always close, always personal.',
  ],
  lopsided: [
    '{winner} owns {loser} this season. {winCount}-{loseCount} in head-to-head — it\'s not even close.',
    '{loser} has no answer for {winner} ({winCount}-{loseCount} H2H). At some point it stops being bad luck and starts being a problem.',
  ],
  budding: [
    'Keep an eye on {charA} vs {charB}. Their {games} meetings have been increasingly competitive — a rivalry is brewing.',
    '{charA} and {charB} have faced off {games} times this season. The intensity is building each week.',
  ],
};

function generateRivalryNarratives(cupData) {
  const rivalries = detectRivalries(cupData);
  const narratives = [];

  rivalries.forEach(r => {
    const aWins = r.results.filter(res => res.firstPts > res.secondPts).length;
    const bWins = r.results.filter(res => res.secondPts > res.firstPts).length;
    const avgMargin = (r.results.reduce((s, res) => s + res.margin, 0) / r.results.length).toFixed(1);
    const closestGame = [...r.results].sort((a, b) => a.margin - b.margin)[0];

    let type = 'budding';
    let template;

    if (Math.abs(aWins - bWins) >= 2) {
      type = 'lopsided';
      const winner = aWins > bWins ? r.charA : r.charB;
      const loser = aWins > bWins ? r.charB : r.charA;
      template = rand(RIVALRY_TEMPLATES.lopsided)
        .replace(/{winner}/g, winner)
        .replace(/{loser}/g, loser)
        .replace(/{winCount}/g, Math.max(aWins, bWins))
        .replace(/{loseCount}/g, Math.min(aWins, bWins));
    } else if (parseFloat(avgMargin) < 15) {
      type = 'heated';
      template = rand(RIVALRY_TEMPLATES.heated)
        .replace(/{avgMargin}/g, avgMargin);
    } else {
      template = rand(RIVALRY_TEMPLATES.budding);
    }

    template = template
      .replace(/{charA}/g, r.charA)
      .replace(/{charB}/g, r.charB)
      .replace(/{games}/g, r.games);

    narratives.push({
      type,
      charA: r.charA,
      charB: r.charB,
      games: r.games,
      record: `${aWins}-${bWins}`,
      avgMargin,
      narrative: template,
      closestMargin: closestGame?.margin?.toFixed(2),
    });
  });

  // Sort: heated first, then lopsided, then budding; within each, most games first
  const typeOrder = { heated: 0, lopsided: 1, budding: 2 };
  return narratives.sort((a, b) => (typeOrder[a.type] - typeOrder[b.type]) || (b.games - a.games));
}

// ─── Generate season narratives for each owner ───
export function generateSeasonNarratives(rankings, cupData) {
  const totalTeams = rankings.length;

  const ownerNarratives = rankings.map((team, i) => {
    const rank = i + 1;
    const archetypeKey = getArchetype(team, rank, totalTeams);
    const archetype = ARCHETYPES[archetypeKey];
    const templates = SEASON_TEMPLATES[archetypeKey] || SEASON_TEMPLATES.middlePack;

    // Pick a template and fill in
    const template = rand(templates);
    const narrative = template
      .replace(/{name}/g, team.character)
      .replace(/{wins}/g, team.wins)
      .replace(/{losses}/g, team.losses)
      .replace(/{avgPF}/g, team.avgPF.toFixed(1))
      .replace(/{recentAvg}/g, team.recentAvg.toFixed(1))
      .replace(/{stdDev}/g, team.stdDev.toFixed(1))
      .replace(/{expectedW}/g, team.expectedWins)
      .replace(/{luck}/g, team.luck > 0 ? `+${team.luck.toFixed(1)}` : team.luck.toFixed(1));

    return {
      ownerId: team.ownerId,
      character: team.character,
      rank,
      archetype,
      archetypeKey,
      narrative,
    };
  });

  const rivalries = cupData ? generateRivalryNarratives(cupData) : [];

  return { ownerNarratives, rivalries };
}

// ─── Weekly storyline generator ───
const WEEKLY_HEADLINES = {
  blowout: [
    '{winner} ran a clinic on {loser} — a {margin}-point demolition in {cup}.',
    '{loser} got absolutely Blue Shelled by {winner}. {margin} points of pure domination.',
  ],
  upset: [
    'Upset alert! {winner} stunned higher-ranked {loser} with a {winPts}-{losePts} victory.',
    'Nobody saw this coming. {winner} toppled {loser} in a {margin}-point shocker.',
  ],
  nailbiter: [
    'Heart-stopper: {winner} edged out {loser} by just {margin} points — one roster decision away from a different outcome.',
    '{winner} and {loser} went down to the wire. {margin} points. That\'s a coin flip. That\'s chaos.',
  ],
  highScoring: [
    '{winner} and {loser} combined for {combined} points in a shootout. {winner} survived {winPts}-{losePts}.',
    'Fireworks in {cup}: {combined} combined points between {winner} and {loser}. An instant classic.',
  ],
  dominant_week: [
    '{name} put the league on notice with a {points}-point eruption across {cup}. Nobody came close.',
    'Statement week from {name}: {points} points. That\'s a message to the rest of the league.',
  ],
  collapse: [
    '{name} bottomed out with just {points} points in {cup}. Might want to check if the lineup was set.',
    'Yikes. {name} managed only {points} points this week. That\'s a forgettable performance.',
  ],
};

export function generateWeeklyStorylines(cupData, week) {
  const stories = [];
  const allMatchups = [];
  const allScores = [];

  Object.entries(cupData).forEach(([cupKey, cd]) => {
    const weekData = cd.allMatchups[week];
    if (!weekData || weekData.length === 0) return;
    const cupName = cupKey.charAt(0).toUpperCase() + cupKey.slice(1) + ' Cup';

    weekData.forEach(m => {
      const info = cd.rosterToOwner[m.roster_id];
      if (!info) return;
      allScores.push({ cup: cupKey, cupName, ...info, points: m.points || 0 });
    });

    const groups = {};
    weekData.forEach(m => {
      if (m.matchup_id == null) return;
      if (!groups[m.matchup_id]) groups[m.matchup_id] = [];
      groups[m.matchup_id].push(m);
    });

    Object.values(groups).forEach(pair => {
      if (pair.length !== 2) return;
      const [a, b] = pair;
      const infoA = cd.rosterToOwner[a.roster_id];
      const infoB = cd.rosterToOwner[b.roster_id];
      if (!infoA || !infoB) return;
      const ptsA = a.points || 0, ptsB = b.points || 0;
      const winner = ptsA > ptsB ? infoA : infoB;
      const loser = ptsA > ptsB ? infoB : infoA;
      const winPts = Math.max(ptsA, ptsB);
      const losePts = Math.min(ptsA, ptsB);
      allMatchups.push({ cup: cupKey, cupName, winner, loser, winPts, losePts, margin: winPts - losePts, combined: winPts + losePts });
    });
  });

  if (allMatchups.length === 0) return stories;

  // Find the most interesting matchups
  const sorted = [...allMatchups].sort((a, b) => b.margin - a.margin);
  const biggestBlowout = sorted[0];
  const closestGame = sorted[sorted.length - 1];
  const highestCombined = [...allMatchups].sort((a, b) => b.combined - a.combined)[0];

  // Blowout narrative
  if (biggestBlowout && biggestBlowout.margin > 30) {
    const t = rand(WEEKLY_HEADLINES.blowout);
    stories.push({
      type: 'blowout',
      icon: '💥',
      headline: t
        .replace(/{winner}/g, biggestBlowout.winner.character)
        .replace(/{loser}/g, biggestBlowout.loser.character)
        .replace(/{margin}/g, biggestBlowout.margin.toFixed(1))
        .replace(/{cup}/g, biggestBlowout.cupName),
    });
  }

  // Nail-biter narrative
  if (closestGame && closestGame.margin < 10 && closestGame.margin > 0) {
    const t = rand(WEEKLY_HEADLINES.nailbiter);
    stories.push({
      type: 'nailbiter',
      icon: '😰',
      headline: t
        .replace(/{winner}/g, closestGame.winner.character)
        .replace(/{loser}/g, closestGame.loser.character)
        .replace(/{margin}/g, closestGame.margin.toFixed(2))
        .replace(/{winPts}/g, closestGame.winPts.toFixed(2))
        .replace(/{losePts}/g, closestGame.losePts.toFixed(2)),
    });
  }

  // High-scoring game
  if (highestCombined && highestCombined.combined > 250) {
    const t = rand(WEEKLY_HEADLINES.highScoring);
    stories.push({
      type: 'highScoring',
      icon: '🎆',
      headline: t
        .replace(/{winner}/g, highestCombined.winner.character)
        .replace(/{loser}/g, highestCombined.loser.character)
        .replace(/{combined}/g, highestCombined.combined.toFixed(1))
        .replace(/{winPts}/g, highestCombined.winPts.toFixed(2))
        .replace(/{losePts}/g, highestCombined.losePts.toFixed(2))
        .replace(/{cup}/g, highestCombined.cupName),
    });
  }

  // Top scorer of the week — dominant performance
  if (allScores.length > 0) {
    const topScorer = [...allScores].sort((a, b) => b.points - a.points)[0];
    if (topScorer && topScorer.points > 130) {
      const t = rand(WEEKLY_HEADLINES.dominant_week);
      stories.push({
        type: 'dominant',
        icon: '⚡',
        headline: t
          .replace(/{name}/g, topScorer.character)
          .replace(/{points}/g, topScorer.points.toFixed(2))
          .replace(/{cup}/g, topScorer.cupName),
      });
    }

    // Worst performance
    const lowScorer = [...allScores].filter(s => s.points > 0).sort((a, b) => a.points - b.points)[0];
    if (lowScorer && lowScorer.points < 80) {
      const t = rand(WEEKLY_HEADLINES.collapse);
      stories.push({
        type: 'collapse',
        icon: '📉',
        headline: t
          .replace(/{name}/g, lowScorer.character)
          .replace(/{points}/g, lowScorer.points.toFixed(2))
          .replace(/{cup}/g, lowScorer.cupName),
      });
    }
  }

  return stories;
}
