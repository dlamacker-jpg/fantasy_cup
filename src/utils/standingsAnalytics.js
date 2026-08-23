// ─── Advanced Standings Analytics Engine ───
// Computes Fantasy Genius-style analytics from existing Sleeper matchup data.
// All computations are frontend-only — no new API calls needed.

import { OWNERS } from '../data/leagueConfig';

// ────────────────────────────────────────────
// Extract weekly scores per owner from matchup data
// Returns { ownerId: [{ week, points, opponentId, opponentPoints, won }] }
// ────────────────────────────────────────────
function extractWeeklyScores(allMatchups, rosterToOwner, playoffWeekStart) {
  const ownerWeeks = {};
  for (let week = 1; week < playoffWeekStart; week++) {
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
      const ptsA = a.points || 0, ptsB = b.points || 0;
      if (!ownerWeeks[infoA.ownerId]) ownerWeeks[infoA.ownerId] = [];
      if (!ownerWeeks[infoB.ownerId]) ownerWeeks[infoB.ownerId] = [];
      ownerWeeks[infoA.ownerId].push({
        week, points: ptsA, opponentId: infoB.ownerId, opponentPoints: ptsB,
        won: ptsA > ptsB, lost: ptsA < ptsB, tied: ptsA === ptsB,
      });
      ownerWeeks[infoB.ownerId].push({
        week, points: ptsB, opponentId: infoA.ownerId, opponentPoints: ptsA,
        won: ptsB > ptsA, lost: ptsB < ptsA, tied: ptsA === ptsB,
      });
    });
  }
  return ownerWeeks;
}

// ────────────────────────────────────────────
// Power Record: How many teams you'd beat each week
// ────────────────────────────────────────────
function computePowerRecord(allMatchups, rosterToOwner, playoffWeekStart) {
  const powerRecords = {}; // ownerId → { wins, losses }
  for (let week = 1; week < playoffWeekStart; week++) {
    const weekData = allMatchups[week];
    if (!weekData || weekData.length === 0) continue;
    const scores = weekData
      .filter(m => rosterToOwner[m.roster_id])
      .map(m => ({ ownerId: rosterToOwner[m.roster_id].ownerId, points: m.points || 0 }));
    scores.forEach(({ ownerId, points }) => {
      if (!powerRecords[ownerId]) powerRecords[ownerId] = { wins: 0, losses: 0 };
      scores.forEach(other => {
        if (other.ownerId === ownerId) return;
        if (points > other.points) powerRecords[ownerId].wins++;
        else if (points < other.points) powerRecords[ownerId].losses++;
        else { powerRecords[ownerId].wins += 0.5; powerRecords[ownerId].losses += 0.5; }
      });
    });
  }
  return powerRecords;
}

// ────────────────────────────────────────────
// Vs. Median: Weekly W/L against the league median
// ────────────────────────────────────────────
function computeVsMedian(allMatchups, rosterToOwner, playoffWeekStart) {
  const medianRecords = {}; // ownerId → { wins, losses }
  for (let week = 1; week < playoffWeekStart; week++) {
    const weekData = allMatchups[week];
    if (!weekData || weekData.length === 0) continue;
    const scores = weekData
      .filter(m => rosterToOwner[m.roster_id])
      .map(m => ({ ownerId: rosterToOwner[m.roster_id].ownerId, points: m.points || 0 }))
      .sort((a, b) => a.points - b.points);
    const mid = Math.floor(scores.length / 2);
    const median = scores.length % 2 === 0
      ? (scores[mid - 1].points + scores[mid].points) / 2
      : scores[mid].points;
    scores.forEach(({ ownerId, points }) => {
      if (!medianRecords[ownerId]) medianRecords[ownerId] = { wins: 0, losses: 0 };
      if (points > median) medianRecords[ownerId].wins++;
      else if (points < median) medianRecords[ownerId].losses++;
      else { medianRecords[ownerId].wins += 0.5; medianRecords[ownerId].losses += 0.5; }
    });
  }
  return medianRecords;
}

// ────────────────────────────────────────────
// Weekly rank per owner (1 = highest score that week)
// For heatmap visualization
// ────────────────────────────────────────────
function computeWeeklyRanks(allMatchups, rosterToOwner, playoffWeekStart) {
  const weeklyRanks = {}; // ownerId → [{ week, rank, points, totalTeams }]
  for (let week = 1; week < playoffWeekStart; week++) {
    const weekData = allMatchups[week];
    if (!weekData || weekData.length === 0) continue;
    const scores = weekData
      .filter(m => rosterToOwner[m.roster_id])
      .map(m => ({ ownerId: rosterToOwner[m.roster_id].ownerId, points: m.points || 0 }))
      .sort((a, b) => b.points - a.points);
    const totalTeams = scores.length;
    scores.forEach((entry, i) => {
      if (!weeklyRanks[entry.ownerId]) weeklyRanks[entry.ownerId] = [];
      weeklyRanks[entry.ownerId].push({ week, rank: i + 1, points: entry.points, totalTeams });
    });
  }
  return weeklyRanks;
}

// ────────────────────────────────────────────
// Weekly high and low scorers
// ────────────────────────────────────────────
function computeWeeklyHighLow(allMatchups, rosterToOwner, playoffWeekStart) {
  const results = []; // [{ week, high: { ownerId, character, points }, low: { ... } }]
  for (let week = 1; week < playoffWeekStart; week++) {
    const weekData = allMatchups[week];
    if (!weekData || weekData.length === 0) continue;
    let high = null, low = null;
    weekData.forEach(m => {
      const info = rosterToOwner[m.roster_id];
      if (!info) return;
      const pts = m.points || 0;
      if (!high || pts > high.points) high = { ownerId: info.ownerId, character: info.character, points: pts };
      if (!low || (pts < low.points && pts > 0)) low = { ownerId: info.ownerId, character: info.character, points: pts };
    });
    if (high && low) results.push({ week, high, low });
  }
  return results;
}

// ────────────────────────────────────────────
// Lucky wins & unlucky losses
// Lucky win = won matchup but scored in bottom half
// Unlucky loss = lost matchup but scored in top half
// ────────────────────────────────────────────
function computeLuckAnalysis(allMatchups, rosterToOwner, playoffWeekStart) {
  const luck = {}; // ownerId → { luckyWins, unluckyLosses }
  for (let week = 1; week < playoffWeekStart; week++) {
    const weekData = allMatchups[week];
    if (!weekData || weekData.length === 0) continue;
    const scores = weekData
      .filter(m => rosterToOwner[m.roster_id])
      .map(m => ({ ownerId: rosterToOwner[m.roster_id].ownerId, points: m.points || 0, rosterId: m.roster_id, matchupId: m.matchup_id }))
      .sort((a, b) => b.points - a.points);
    const topHalf = new Set(scores.slice(0, Math.floor(scores.length / 2)).map(s => s.ownerId));
    // Determine W/L from matchups
    const groups = {};
    weekData.forEach(m => {
      if (m.matchup_id == null) return;
      if (!groups[m.matchup_id]) groups[m.matchup_id] = [];
      groups[m.matchup_id].push(m);
    });
    Object.values(groups).forEach(pair => {
      if (pair.length !== 2) return;
      const [a, b] = pair;
      const infoA = rosterToOwner[a.roster_id], infoB = rosterToOwner[b.roster_id];
      if (!infoA || !infoB) return;
      const ptsA = a.points || 0, ptsB = b.points || 0;
      [{ info: infoA, pts: ptsA, won: ptsA > ptsB, lost: ptsA < ptsB },
       { info: infoB, pts: ptsB, won: ptsB > ptsA, lost: ptsB < ptsA }].forEach(({ info, pts, won, lost }) => {
        if (!luck[info.ownerId]) luck[info.ownerId] = { luckyWins: 0, unluckyLosses: 0 };
        if (won && !topHalf.has(info.ownerId)) luck[info.ownerId].luckyWins++;
        if (lost && topHalf.has(info.ownerId)) luck[info.ownerId].unluckyLosses++;
      });
    });
  }
  return luck;
}

// ────────────────────────────────────────────
// Notable matchup categories
// ────────────────────────────────────────────
function computeNotableMatchups(allMatchups, rosterToOwner, playoffWeekStart) {
  const allGames = [];
  for (let week = 1; week < playoffWeekStart; week++) {
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
      const infoA = rosterToOwner[a.roster_id], infoB = rosterToOwner[b.roster_id];
      if (!infoA || !infoB) return;
      const ptsA = a.points || 0, ptsB = b.points || 0;
      const margin = Math.abs(ptsA - ptsB);
      const combined = ptsA + ptsB;
      const winner = ptsA >= ptsB ? infoA : infoB;
      const loser = ptsA >= ptsB ? infoB : infoA;
      const winPts = Math.max(ptsA, ptsB), losePts = Math.min(ptsA, ptsB);
      allGames.push({ week, winner, loser, winPts, losePts, margin, combined });
    });
  }
  const BLOWOUT_THRESHOLD = 30;
  const NAILBITER_THRESHOLD = 5;
  const SLUGFEST_THRESHOLD = 220;
  const PILLOWFIGHT_THRESHOLD = 160;
  return {
    blowouts: allGames.filter(g => g.margin >= BLOWOUT_THRESHOLD).sort((a, b) => b.margin - a.margin).slice(0, 5),
    nailbiters: allGames.filter(g => g.margin > 0 && g.margin <= NAILBITER_THRESHOLD).sort((a, b) => a.margin - b.margin).slice(0, 5),
    slugfests: allGames.filter(g => g.combined >= SLUGFEST_THRESHOLD).sort((a, b) => b.combined - a.combined).slice(0, 5),
    pillowfights: allGames.filter(g => g.combined <= PILLOWFIGHT_THRESHOLD && g.combined > 0).sort((a, b) => a.combined - b.combined).slice(0, 5),
    topScores: allGames.sort((a, b) => b.winPts - a.winPts).slice(0, 5),
    worstScores: allGames.sort((a, b) => a.losePts - b.losePts).slice(0, 5),
  };
}

// ────────────────────────────────────────────
// Team Tiers (auto-classified by standing)
// ────────────────────────────────────────────
function computeTeamTiers(sortedStandings) {
  const total = sortedStandings.length;
  return sortedStandings.map((team, i) => {
    const pct = i / total;
    let tier;
    if (pct < 0.15) tier = 'elite';
    else if (pct < 0.4) tier = 'contender';
    else if (pct < 0.65) tier = 'mid';
    else if (pct < 0.85) tier = 'struggling';
    else tier = 'dumpster';
    return { ...team, tier };
  });
}

const TIER_META = {
  elite: { label: 'Legends', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', emoji: '🏆' },
  contender: { label: 'Contenders', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', emoji: '⚔️' },
  mid: { label: 'Mid-Tier', color: 'text-gray-300', bg: 'bg-gray-500/10', border: 'border-gray-500/30', emoji: '😐' },
  struggling: { label: 'Get On The Stick', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', emoji: '😬' },
  dumpster: { label: 'Dumpster Fire', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', emoji: '🔥' },
};

// ────────────────────────────────────────────
// Main analytics computation
// Takes a single cup's data and returns all analytics
// ────────────────────────────────────────────
export function computeCupAnalytics(cupData) {
  const { allMatchups, rosterToOwner, playoffWeekStart, standings } = cupData;
  if (!allMatchups || !rosterToOwner) return null;

  const ownerWeeks = extractWeeklyScores(allMatchups, rosterToOwner, playoffWeekStart);
  const powerRecords = computePowerRecord(allMatchups, rosterToOwner, playoffWeekStart);
  const medianRecords = computeVsMedian(allMatchups, rosterToOwner, playoffWeekStart);
  const weeklyRanks = computeWeeklyRanks(allMatchups, rosterToOwner, playoffWeekStart);
  const weeklyHighLow = computeWeeklyHighLow(allMatchups, rosterToOwner, playoffWeekStart);
  const luckAnalysis = computeLuckAnalysis(allMatchups, rosterToOwner, playoffWeekStart);
  const notableMatchups = computeNotableMatchups(allMatchups, rosterToOwner, playoffWeekStart);

  // Build full standings with analytics
  const enrichedStandings = Object.keys(ownerWeeks).map(ownerId => {
    const weeks = ownerWeeks[ownerId] || [];
    const owner = OWNERS[ownerId];
    const power = powerRecords[ownerId] || { wins: 0, losses: 0 };
    const median = medianRecords[ownerId] || { wins: 0, losses: 0 };
    const luck = luckAnalysis[ownerId] || { luckyWins: 0, unluckyLosses: 0 };

    const wins = weeks.filter(w => w.won).length;
    const losses = weeks.filter(w => w.lost).length;
    const totalPF = weeks.reduce((s, w) => s + w.points, 0);
    const totalPA = weeks.reduce((s, w) => s + w.opponentPoints, 0);
    const gamesPlayed = weeks.length;

    // Median weekly points
    const sortedPts = weeks.map(w => w.points).sort((a, b) => a - b);
    const medianPts = sortedPts.length > 0
      ? sortedPts.length % 2 === 0
        ? (sortedPts[sortedPts.length / 2 - 1] + sortedPts[sortedPts.length / 2]) / 2
        : sortedPts[Math.floor(sortedPts.length / 2)]
      : 0;

    // Std deviation
    const avgPts = gamesPlayed > 0 ? totalPF / gamesPlayed : 0;
    const variance = gamesPlayed > 0 ? weeks.reduce((s, w) => s + Math.pow(w.points - avgPts, 2), 0) / gamesPlayed : 0;
    const stdDev = Math.sqrt(variance);

    // High/low week
    const maxPts = Math.max(...weeks.map(w => w.points), 0);
    const minPts = weeks.length > 0 ? Math.min(...weeks.map(w => w.points)) : 0;
    const spread = maxPts - minPts;

    // Power win %
    const powerWinPct = (power.wins + power.losses) > 0 ? power.wins / (power.wins + power.losses) : 0;
    const actualWinPct = gamesPlayed > 0 ? wins / gamesPlayed : 0;

    // Luck index: difference between actual wins and expected wins (from power record)
    const expectedWins = powerWinPct * gamesPlayed;
    const luckIndex = wins - expectedWins;

    // Combined record (actual + median)
    const combinedWins = wins + median.wins;
    const combinedLosses = losses + median.losses;

    // Times as high/low scorer
    const timesHighScorer = weeklyHighLow.filter(w => w.high.ownerId === ownerId).length;
    const timesLowScorer = weeklyHighLow.filter(w => w.low.ownerId === ownerId).length;

    // Slugfest/blowout/nailbiter wins & losses
    const blowoutWins = weeks.filter(w => w.won && (w.points - w.opponentPoints) >= 30).length;
    const blowoutLosses = weeks.filter(w => w.lost && (w.opponentPoints - w.points) >= 30).length;
    const nailbiterWins = weeks.filter(w => w.won && Math.abs(w.points - w.opponentPoints) <= 5).length;
    const nailbiterLosses = weeks.filter(w => w.lost && Math.abs(w.points - w.opponentPoints) <= 5).length;
    const slugfestWins = weeks.filter(w => w.won && (w.points + w.opponentPoints) >= 220).length;
    const slugfestLosses = weeks.filter(w => w.lost && (w.points + w.opponentPoints) >= 220).length;

    return {
      ownerId,
      character: owner?.character || 'Unknown',
      ownerName: owner?.name || 'Unknown',
      wins, losses, gamesPlayed,
      actualRecord: `${wins}-${losses}`,
      powerRecord: `${power.wins}-${power.losses}`,
      powerWins: power.wins, powerLosses: power.losses,
      medianRecord: `${median.wins}-${median.losses}`,
      medianWins: median.wins, medianLosses: median.losses,
      combinedRecord: `${combinedWins}-${combinedLosses}`,
      combinedWins, combinedLosses,
      pf: totalPF, pa: totalPA,
      ppg: gamesPlayed > 0 ? totalPF / gamesPlayed : 0,
      medianPts, stdDev, maxPts, minPts, spread,
      powerWinPct, actualWinPct,
      luckIndex,
      luckyWins: luck.luckyWins,
      unluckyLosses: luck.unluckyLosses,
      luckNet: luck.luckyWins - luck.unluckyLosses,
      timesHighScorer, timesLowScorer,
      blowoutWins, blowoutLosses,
      nailbiterWins, nailbiterLosses,
      slugfestWins, slugfestLosses,
    };
  });

  // Sort by wins desc, PF desc
  enrichedStandings.sort((a, b) => b.wins - a.wins || b.pf - a.pf);

  // Add rank and tier
  const tieredStandings = computeTeamTiers(enrichedStandings.map((s, i) => ({ ...s, rank: i + 1 })));

  return {
    standings: tieredStandings,
    weeklyRanks,
    weeklyHighLow,
    luckAnalysis,
    notableMatchups,
    powerRecords,
    medianRecords,
  };
}

// ────────────────────────────────────────────
// Aggregate analytics across all cups
// ────────────────────────────────────────────
export function computeAggregateAnalytics(cupDataMap) {
  const perCup = {};
  for (const [cupKey, cupData] of Object.entries(cupDataMap)) {
    const analytics = computeCupAnalytics(cupData);
    if (analytics) perCup[cupKey] = analytics;
  }

  // Merge standings across cups
  const ownerTotals = {};
  for (const [cupKey, analytics] of Object.entries(perCup)) {
    for (const team of analytics.standings) {
      if (!ownerTotals[team.ownerId]) {
        ownerTotals[team.ownerId] = {
          ownerId: team.ownerId, character: team.character, ownerName: team.ownerName,
          totalWins: 0, totalLosses: 0, totalPF: 0, totalPA: 0,
          totalPowerWins: 0, totalPowerLosses: 0,
          totalMedianWins: 0, totalMedianLosses: 0,
          totalLuckyWins: 0, totalUnluckyLosses: 0,
          totalGames: 0,
          cups: {},
        };
      }
      const t = ownerTotals[team.ownerId];
      t.totalWins += team.wins;
      t.totalLosses += team.losses;
      t.totalPF += team.pf;
      t.totalPA += team.pa;
      t.totalPowerWins += team.powerWins;
      t.totalPowerLosses += team.powerLosses;
      t.totalMedianWins += team.medianWins;
      t.totalMedianLosses += team.medianLosses;
      t.totalLuckyWins += team.luckyWins;
      t.totalUnluckyLosses += team.unluckyLosses;
      t.totalGames += team.gamesPlayed;
      t.cups[cupKey] = team;
    }
  }

  const aggregateStandings = Object.values(ownerTotals)
    .map(t => ({
      ...t,
      totalPowerWinPct: (t.totalPowerWins + t.totalPowerLosses) > 0
        ? t.totalPowerWins / (t.totalPowerWins + t.totalPowerLosses) : 0,
      totalActualWinPct: t.totalGames > 0 ? t.totalWins / t.totalGames : 0,
      totalLuckIndex: t.totalWins - ((t.totalPowerWins + t.totalPowerLosses) > 0
        ? (t.totalPowerWins / (t.totalPowerWins + t.totalPowerLosses)) * t.totalGames : 0),
      totalPPG: t.totalGames > 0 ? t.totalPF / t.totalGames : 0,
      totalLuckNet: t.totalLuckyWins - t.totalUnluckyLosses,
    }))
    .sort((a, b) => b.totalWins - a.totalWins || b.totalPF - a.totalPF);

  return { perCup, aggregateStandings };
}

export { TIER_META };
