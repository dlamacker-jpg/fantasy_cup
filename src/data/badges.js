// ─── Shared badge definitions and stat computation ───
// Used by both PlayerProfile (My Badges tab) and RacerPage (Achievements section)

export const BADGE_DEFS = [
  // Scoring
  { id: 'century', icon: '💯', name: 'Century Club', desc: 'Scored 100+ in a single week', check: (s) => s.weeklyScores.some(w => w.pts >= 100) },
  { id: 'buck50', icon: '🔥', name: 'Buck Fifty', desc: 'Scored 150+ in a single week', check: (s) => s.weeklyScores.some(w => w.pts >= 150), rare: true },
  { id: 'double_century', icon: '🤯', name: 'Double Century', desc: 'Scored 200+ in a single week', check: (s) => s.weeklyScores.some(w => w.pts >= 200), legendary: true },
  // Winning
  { id: 'first_w', icon: '✅', name: 'First Win', desc: 'Won your first matchup', check: (s) => s.wins >= 1 },
  { id: 'five_streak', icon: '🔥', name: 'Hot Hand', desc: 'Won 5+ games in a row', check: (s) => s.longestStreak >= 5, rare: true },
  { id: 'ten_wins', icon: '🏆', name: 'Double Digits', desc: 'Won 10+ games across all cups', check: (s) => s.wins >= 10 },
  { id: 'twenty_wins', icon: '👑', name: 'Road Warrior', desc: 'Won 20+ games across all cups', check: (s) => s.wins >= 20, rare: true },
  // Domination
  { id: 'blowout30', icon: '💥', name: 'Blue Sheller', desc: 'Won a game by 30+ points', check: (s) => s.biggestWinMargin >= 30 },
  { id: 'blowout50', icon: '🐚', name: 'Total Destruction', desc: 'Won a game by 50+ points', check: (s) => s.biggestWinMargin >= 50, rare: true },
  { id: 'top_scorer', icon: '⚡', name: 'Top Speed', desc: 'Posted the highest score in a week across all cups', check: (s) => s.weeklyTopScorer > 0 },
  // Resilience
  { id: 'comeback', icon: '🚀', name: 'Comeback Kid', desc: 'Won after trailing at some point in the season', check: (s) => s.wins >= 1 && s.losses >= 3 },
  { id: 'survivor', icon: '🛡️', name: 'Survivor', desc: 'Won a game by less than 5 points', check: (s) => s.closestWinMargin > 0 && s.closestWinMargin < 5 },
  { id: 'heartbreaker', icon: '💔', name: 'Heartbreaker', desc: 'Lost a game by less than 3 points', check: (s) => s.closestLossMargin > 0 && s.closestLossMargin < 3 },
  // Consistency
  { id: 'consistent', icon: '🎯', name: 'Steady Eddie', desc: 'Standard deviation under 15 pts', check: (s) => s.stdDev > 0 && s.stdDev < 15 },
  { id: 'volatile', icon: '🎰', name: 'Boom or Bust', desc: 'Standard deviation over 30 pts', check: (s) => s.stdDev > 30 },
  // Milestones
  { id: 'games10', icon: '🏁', name: 'Veteran', desc: 'Played 10+ games', check: (s) => s.gamesPlayed >= 10 },
  { id: 'games30', icon: '🎖️', name: 'Iron Man', desc: 'Played 30+ games across all cups', check: (s) => s.gamesPlayed >= 30, rare: true },
  { id: 'all_cups', icon: '🏅', name: 'Triple Threat', desc: 'Active in all 3 cups', check: (s) => s.cupsActive >= 3 },
  // Luck
  { id: 'lucky', icon: '🍀', name: 'Lucky Star', desc: '3+ more wins than expected', check: (s) => s.luck >= 3, rare: true },
  { id: 'unlucky', icon: '😤', name: 'Cursed', desc: '3+ fewer wins than expected', check: (s) => s.luck <= -3 },
];

// Role/meta badges that don't come from game stats
export const META_BADGES = {
  '463127531231375360': { icon: '👑', name: 'Commissioner', desc: 'League commissioner and rule-maker', legendary: true },
  '863922541440425984': { icon: '🛠', name: 'App Builder', desc: 'Built the Fantasy Cup app', rare: true },
};

export function computeBadgeStats(cupData, ownerId) {
  const stats = {
    weeklyScores: [], wins: 0, losses: 0, gamesPlayed: 0,
    biggestWinMargin: 0, closestWinMargin: Infinity, closestLossMargin: Infinity,
    longestStreak: 0, weeklyTopScorer: 0, stdDev: 0, cupsActive: 0, luck: 0,
  };

  const weekResults = [];
  const cupsWithData = new Set();
  let expectedWins = 0;

  Object.entries(cupData).forEach(([cupKey, cd]) => {
    const { allMatchups, rosterToOwner, playoffWeekStart } = cd;
    const myRosterId = Object.keys(rosterToOwner).find(rid => rosterToOwner[rid]?.ownerId === ownerId);
    if (!myRosterId) return;
    cupsWithData.add(cupKey);

    for (let week = 1; week < (playoffWeekStart || 18); week++) {
      const weekData = allMatchups[week];
      if (!weekData || weekData.length === 0) continue;

      const myEntry = weekData.find(m => String(m.roster_id) === String(myRosterId));
      if (!myEntry) continue;
      const myPts = myEntry.points || 0;
      if (myPts === 0) continue;

      stats.weeklyScores.push({ week, cup: cupKey, pts: myPts });

      const weekScores = weekData.map(m => ({ rosterId: m.roster_id, pts: m.points || 0 })).filter(s => s.pts > 0);
      const beatable = weekScores.filter(s => String(s.rosterId) !== String(myRosterId) && myPts > s.pts).length;
      const ties = weekScores.filter(s => String(s.rosterId) !== String(myRosterId) && myPts === s.pts).length;
      const others = weekScores.filter(s => String(s.rosterId) !== String(myRosterId)).length;
      if (others > 0) expectedWins += (beatable + ties * 0.5) / others;

      const isTopThisWeek = weekScores.every(s => myPts >= s.pts);
      if (isTopThisWeek) stats.weeklyTopScorer++;

      if (myEntry.matchup_id != null) {
        const opp = weekData.find(m => m.matchup_id === myEntry.matchup_id && String(m.roster_id) !== String(myRosterId));
        if (opp) {
          const oppPts = opp.points || 0;
          stats.gamesPlayed++;
          const margin = myPts - oppPts;
          if (margin > 0) {
            stats.wins++;
            weekResults.push('W');
            stats.biggestWinMargin = Math.max(stats.biggestWinMargin, margin);
            if (margin < stats.closestWinMargin) stats.closestWinMargin = margin;
          } else if (margin < 0) {
            stats.losses++;
            weekResults.push('L');
            const lossMargin = Math.abs(margin);
            if (lossMargin < stats.closestLossMargin) stats.closestLossMargin = lossMargin;
          }
        }
      }
    }
  });

  let streak = 0;
  weekResults.forEach(r => {
    if (r === 'W') { streak++; stats.longestStreak = Math.max(stats.longestStreak, streak); }
    else streak = 0;
  });

  if (stats.weeklyScores.length > 1) {
    const avg = stats.weeklyScores.reduce((s, w) => s + w.pts, 0) / stats.weeklyScores.length;
    stats.stdDev = Math.sqrt(stats.weeklyScores.reduce((s, w) => s + (w.pts - avg) ** 2, 0) / stats.weeklyScores.length);
  }

  stats.cupsActive = cupsWithData.size;
  stats.luck = stats.wins - expectedWins;
  if (stats.closestWinMargin === Infinity) stats.closestWinMargin = 0;
  if (stats.closestLossMargin === Infinity) stats.closestLossMargin = 0;

  return stats;
}

// Evaluate which badges are earned/locked for an owner
export function evaluateBadges(cupData, ownerId) {
  if (!cupData) return { earned: [], locked: BADGE_DEFS, stats: null };
  const stats = computeBadgeStats(cupData, ownerId);
  const earned = BADGE_DEFS.filter(b => b.check(stats));
  const locked = BADGE_DEFS.filter(b => !b.check(stats));

  // Prepend meta badge if applicable
  const meta = META_BADGES[ownerId];
  if (meta) earned.unshift({ id: 'meta', ...meta });

  return { earned, locked, stats };
}
