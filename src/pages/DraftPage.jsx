import { useState, useEffect, useMemo, Fragment } from 'react';
import { OWNERS, CHARACTER_THEMES, DEPARTED_OWNER_IDS, getLeaguesForSeason } from '../data/leagueConfig';
import { useSleeperDraft } from '../hooks/useSleeper';
import { useSeason } from '../hooks/SeasonContext';
import { api } from '../hooks/useApi';
import CharacterBadge from '../components/CharacterBadge';
import LoadingSpinner from '../components/LoadingSpinner';

// ─── Position color helper (shared) ───
const POS_COLORS = {
  QB: 'text-red-400 bg-red-400/10',
  RB: 'text-green-400 bg-green-400/10',
  WR: 'text-blue-400 bg-blue-400/10',
  TE: 'text-yellow-400 bg-yellow-400/10',
  K: 'text-purple-400 bg-purple-400/10',
  DEF: 'text-orange-400 bg-orange-400/10',
};

// ─── Tier color helper ───
function tierStyle(tier) {
  const t = parseInt(tier);
  if (t === 1) return 'text-yellow-300 bg-yellow-400/15 border-yellow-400/30';
  if (t === 2) return 'text-green-300 bg-green-400/15 border-green-400/30';
  if (t === 3) return 'text-blue-300 bg-blue-400/15 border-blue-400/30';
  if (t === 4) return 'text-purple-300 bg-purple-400/15 border-purple-400/30';
  if (t <= 6) return 'text-gray-300 bg-gray-400/15 border-gray-400/30';
  return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
}

// ─── Injury risk color ───
function riskColor(risk) {
  if (!risk) return 'text-gray-500';
  const pct = parseInt(risk);
  if (pct >= 50) return 'text-red-400';
  if (pct >= 30) return 'text-yellow-400';
  return 'text-green-400';
}

// ═══════════════════════════════════════
// Draft Board (existing Sleeper data)
// ═══════════════════════════════════════
function DraftBoard({ cupKey, season }) {
  const { draftPicks, loading } = useSleeperDraft(cupKey, season);
  const leagues = getLeaguesForSeason(season);
  const cup = leagues[cupKey];

  if (loading) return <LoadingSpinner message={`Loading ${cup.name} draft...`} />;
  if (!draftPicks.length) return <p className="text-gray-500 text-center py-8">No draft data available.</p>;

  const rosterPicks = {};
  draftPicks.forEach(p => {
    if (!rosterPicks[p.rosterId]) rosterPicks[p.rosterId] = [];
    rosterPicks[p.rosterId].push(p);
  });

  const isAuction = cup.type === 'Auction';
  const maxRoundsToShow = isAuction ? 20 : 16;

  return (
    <div className="bg-mk-dark/80 backdrop-blur rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="font-body font-bold text-white text-sm">{cup.emoji} {cup.name} Draft — {cup.type}</h3>
        <span className="text-xs text-gray-400">{draftPicks.length} total picks</span>
      </div>
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-mk-dark z-10">
            <tr className="border-b border-white/10">
              <th className="py-2 px-3 text-xs font-bold text-gray-400 uppercase text-center">Pick</th>
              <th className="py-2 px-3 text-xs font-bold text-gray-400 uppercase text-left">Player</th>
              <th className="py-2 px-3 text-xs font-bold text-gray-400 uppercase text-center">Pos</th>
              <th className="py-2 px-3 text-xs font-bold text-gray-400 uppercase text-center">NFL</th>
              {isAuction && <th className="py-2 px-3 text-xs font-bold text-gray-400 uppercase text-center">$</th>}
              <th className="py-2 px-3 text-xs font-bold text-gray-400 uppercase text-left">Drafted By</th>
              <th className="py-2 px-3 text-xs font-bold text-gray-400 uppercase text-center">Rd</th>
            </tr>
          </thead>
          <tbody>
            {draftPicks.slice(0, 12 * maxRoundsToShow).map((pick, i) => {
              const posStyle = POS_COLORS[pick.position] || 'text-gray-400 bg-gray-400/10';
              return (
                <tr key={i} className={`border-b border-white/5 hover:bg-white/5 transition ${pick.round === 1 ? 'bg-white/[0.03]' : ''}`}>
                  <td className="py-2 px-3 text-center text-xs text-gray-500 font-bold">{pick.pickNo}</td>
                  <td className="py-2 px-3 text-left">
                    <span className="text-sm font-semibold text-white">{pick.playerName || 'Unknown'}</span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${posStyle}`}>{pick.position}</span>
                  </td>
                  <td className="py-2 px-3 text-center text-xs text-gray-400">{pick.team}</td>
                  {isAuction && (
                    <td className="py-2 px-3 text-center text-xs font-bold text-mk-gold">
                      {pick.amount ? `$${pick.amount}` : '—'}
                    </td>
                  )}
                  <td className="py-2 px-3 text-left">
                    <div className="flex items-center gap-1.5">
                      <CharacterBadge character={pick.character} size="xs" />
                      <span className="text-xs text-gray-300 truncate hidden sm:inline">{pick.character}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center text-xs text-gray-500">{pick.round}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// Draft Sharks Rankings Panel
// ═══════════════════════════════════════
function DraftSharksPanel() {
  const [scoring, setScoring] = useState('half-ppr');
  const [position, setPosition] = useState('');
  const [rankings, setRankings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [playerDetail, setPlayerDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch rankings when filters change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.getDraftSharkRankings({ scoring, position, isDynasty: false, leagueType: 'standard' })
      .then(data => {
        if (cancelled) return;
        setRankings(data?.data?.players || []);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message);
        setRankings(null);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [scoring, position]);

  // Fetch player detail on expand
  const handlePlayerClick = async (player) => {
    if (expandedPlayer === player.id) {
      setExpandedPlayer(null);
      setPlayerDetail(null);
      return;
    }
    setExpandedPlayer(player.id);
    setDetailLoading(true);
    try {
      const data = await api.getDraftSharkPlayer(player.id);
      setPlayerDetail(data?.data || null);
    } catch {
      setPlayerDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const scoringOptions = [
    { value: 'ppr', label: 'PPR' },
    { value: 'half-ppr', label: 'Half PPR' },
    { value: 'non-ppr', label: 'Standard' },
  ];

  const positionOptions = [
    { value: '', label: 'All' },
    { value: 'QB', label: 'QB' },
    { value: 'RB', label: 'RB' },
    { value: 'WR', label: 'WR' },
    { value: 'TE', label: 'TE' },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-display">SCORING</span>
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            {scoringOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setScoring(opt.value)}
                className={`px-3 py-1.5 text-xs font-bold transition ${
                  scoring === opt.value
                    ? 'bg-mk-blue text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-display">POSITION</span>
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            {positionOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPosition(opt.value)}
                className={`px-3 py-1.5 text-xs font-bold transition ${
                  position === opt.value
                    ? 'bg-mk-blue text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <span className="text-[10px] text-gray-600 ml-auto">
          Powered by Draft Sharks via Parse.bot
        </span>
      </div>

      {error && (
        <div className="p-3 bg-red-900/40 border border-red-500/30 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading && <LoadingSpinner message="Loading Draft Sharks rankings..." />}

      {!loading && rankings && (
        <div className="bg-mk-dark/80 backdrop-blur rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-body font-bold text-white text-sm">
              🦈 Draft Sharks Rankings — {scoringOptions.find(o => o.value === scoring)?.label}
              {position ? ` (${position})` : ''}
            </h3>
            <span className="text-xs text-gray-400">{rankings.length} players</span>
          </div>
          <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-mk-dark z-10">
                <tr className="border-b border-white/10">
                  <th className="py-2 px-2 text-xs font-bold text-gray-400 uppercase text-center w-10">#</th>
                  <th className="py-2 px-2 text-xs font-bold text-gray-400 uppercase text-center w-12">Tier</th>
                  <th className="py-2 px-3 text-xs font-bold text-gray-400 uppercase text-left">Player</th>
                  <th className="py-2 px-2 text-xs font-bold text-gray-400 uppercase text-center">Pos</th>
                  <th className="py-2 px-2 text-xs font-bold text-gray-400 uppercase text-center">ADP</th>
                  <th className="py-2 px-2 text-xs font-bold text-gray-400 uppercase text-center hidden sm:table-cell">Proj</th>
                  <th className="py-2 px-2 text-xs font-bold text-gray-400 uppercase text-center hidden md:table-cell">Floor</th>
                  <th className="py-2 px-2 text-xs font-bold text-gray-400 uppercase text-center hidden md:table-cell">Ceil</th>
                  <th className="py-2 px-2 text-xs font-bold text-gray-400 uppercase text-center hidden sm:table-cell">Risk</th>
                  <th className="py-2 px-2 text-xs font-bold text-gray-400 uppercase text-center hidden lg:table-cell">SoS</th>
                  <th className="py-2 px-2 text-xs font-bold text-gray-400 uppercase text-center hidden lg:table-cell">Bye</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((p, i) => {
                  const posStyle = POS_COLORS[p.position] || 'text-gray-400 bg-gray-400/10';
                  const isExpanded = expandedPlayer === p.id;
                  const colCount = 11; // total columns for colSpan on detail row
                  return (
                    <Fragment key={p.id || i}>
                      <tr
                        onClick={() => handlePlayerClick(p)}
                        className={`border-b border-white/5 hover:bg-white/5 transition cursor-pointer ${
                          isExpanded ? 'bg-white/[0.07]' : ''
                        } ${p.is_rookie ? 'border-l-2 border-l-cyan-400/60' : ''}`}
                      >
                        <td className="py-2 px-2 text-center text-xs text-gray-500 font-bold">{p.rank}</td>
                        <td className="py-2 px-2 text-center">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${tierStyle(p.tier_overall)}`}>
                            T{p.tier_overall}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-left">
                          <span className="text-sm font-semibold text-white">{p.name}</span>
                          {p.is_rookie && <span className="text-[9px] font-bold text-cyan-400 bg-cyan-400/10 px-1 rounded ml-1.5">R</span>}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${posStyle}`}>{p.position}</span>
                        </td>
                        <td className="py-2 px-2 text-center text-xs text-gray-300 font-mono">{p.adp || '—'}</td>
                        <td className="py-2 px-2 text-center text-xs text-white font-bold font-mono hidden sm:table-cell">{p.ds_projection || '—'}</td>
                        <td className="py-2 px-2 text-center text-xs text-gray-400 font-mono hidden md:table-cell">{p.floor || '—'}</td>
                        <td className="py-2 px-2 text-center text-xs text-gray-400 font-mono hidden md:table-cell">{p.ceiling || '—'}</td>
                        <td className={`py-2 px-2 text-center text-xs font-mono hidden sm:table-cell ${riskColor(p.injury_risk)}`}>{p.injury_risk || '—'}</td>
                        <td className="py-2 px-2 text-center text-xs text-gray-400 font-mono hidden lg:table-cell">{p.sos || '—'}</td>
                        <td className="py-2 px-2 text-center text-xs text-gray-500 hidden lg:table-cell">{p.bye || '—'}</td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b border-white/10">
                          <td colSpan={colCount} className="px-4 py-3 bg-white/[0.03]">
                            {detailLoading ? (
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <div className="animate-spin w-3 h-3 border border-mk-blue border-t-transparent rounded-full" />
                                Loading player detail...
                              </div>
                            ) : playerDetail ? (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                {playerDetail.season_projections && (
                                  <>
                                    <div>
                                      <span className="text-gray-500 block">Season Projection</span>
                                      <span className="text-white font-bold font-mono text-sm">
                                        {playerDetail.season_projections?.total || p.ds_projection || '—'} pts
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 block">Consensus</span>
                                      <span className="text-gray-300 font-mono">{p.consensus || '—'} pts</span>
                                    </div>
                                  </>
                                )}
                                <div>
                                  <span className="text-gray-500 block">DS Value</span>
                                  <span className="text-gray-300 font-mono">{p.ds_value || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block">Games</span>
                                  <span className="text-gray-300 font-mono">{p.games || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block">Range</span>
                                  <span className="text-gray-300 font-mono">{p.floor || '—'} – {p.ceiling || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block">Positional Tier</span>
                                  <span className={`font-bold ${tierStyle(p.tier_positional).split(' ')[0]}`}>
                                    Tier {p.tier_positional}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block">Injury Risk</span>
                                  <span className={`font-bold ${riskColor(p.injury_risk)}`}>{p.injury_risk || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block">Strength of Sched</span>
                                  <span className="text-gray-300 font-mono">{p.sos || '—'}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500">Detail not available</span>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !rankings && !error && (
        <p className="text-gray-500 text-center py-8">No ranking data available.</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// Team Draft Grades
// ═══════════════════════════════════════
function gradeFromScore(score) {
  if (score >= 90) return { letter: 'A+', color: 'text-green-300 bg-green-400/20 border-green-400/40' };
  if (score >= 80) return { letter: 'A', color: 'text-green-300 bg-green-400/20 border-green-400/40' };
  if (score >= 70) return { letter: 'B+', color: 'text-emerald-300 bg-emerald-400/20 border-emerald-400/40' };
  if (score >= 60) return { letter: 'B', color: 'text-emerald-300 bg-emerald-400/20 border-emerald-400/40' };
  if (score >= 50) return { letter: 'C+', color: 'text-yellow-300 bg-yellow-400/20 border-yellow-400/40' };
  if (score >= 40) return { letter: 'C', color: 'text-yellow-300 bg-yellow-400/20 border-yellow-400/40' };
  if (score >= 30) return { letter: 'D+', color: 'text-orange-300 bg-orange-400/20 border-orange-400/40' };
  if (score >= 20) return { letter: 'D', color: 'text-orange-300 bg-orange-400/20 border-orange-400/40' };
  return { letter: 'F', color: 'text-red-300 bg-red-400/20 border-red-400/40' };
}

function DraftGrades({ cupKey, season, rankings, rankingsLoading }) {
  const { draftPicks, loading: picksLoading } = useSleeperDraft(cupKey, season);
  const [expandedTeam, setExpandedTeam] = useState(null);

  const grades = useMemo(() => {
    if (!draftPicks?.length || !rankings?.length) return [];

    // Determine league size from draft picks (unique drafters)
    const uniqueTeams = new Set(draftPicks.map(p => p.pickedBy || p.rosterId).filter(Boolean));
    const leagueSize = uniqueTeams.size || 12;

    // Convert DS ADP "round.pick" format (e.g. "2.08") to overall pick number
    const adpToOverall = (adpStr) => {
      if (!adpStr || adpStr === '0') return null;
      const str = String(adpStr);
      const dotIdx = str.indexOf('.');
      if (dotIdx === -1) return parseFloat(str) || null;
      const round = parseInt(str.substring(0, dotIdx));
      const pick = parseInt(str.substring(dotIdx + 1));
      if (!round || !pick) return null;
      return (round - 1) * leagueSize + pick;
    };

    // Build lookup: normalize name → DS ranking data
    const normalize = (name) => (name || '').toLowerCase().replace(/[^a-z ]/g, '').trim();
    const dsLookup = {};
    rankings.forEach(p => {
      dsLookup[normalize(p.name)] = p;
    });

    // Group picks by character (team)
    const teamPicks = {};
    draftPicks.forEach(pick => {
      if (!pick.character || pick.character === '?') return;
      if (!teamPicks[pick.character]) teamPicks[pick.character] = [];
      const dsMatch = dsLookup[normalize(pick.playerName)];
      teamPicks[pick.character].push({
        ...pick,
        dsRank: dsMatch ? parseInt(dsMatch.rank) : null,
        dsTier: dsMatch ? parseInt(dsMatch.tier_overall) : null,
        dsProjection: dsMatch ? parseFloat(dsMatch.ds_projection) : null,
        dsADP: dsMatch ? adpToOverall(dsMatch.adp) : null,
        dsValue: dsMatch ? parseFloat(dsMatch.ds_value) : null,
        matched: !!dsMatch,
      });
    });

    // Compute raw stats per team
    const rawTeams = Object.entries(teamPicks).map(([character, picks]) => {
      const matchedPicks = picks.filter(p => p.matched);
      const totalPicks = picks.length;

      let totalDsValue = 0;
      let totalValue = 0;
      let valuePicks = 0;
      let reachPicks = 0;
      let bestValue = null;
      let worstReach = null;
      let totalProjection = 0;
      let elitePicks = 0;
      const tierCounts = {};
      const posCounts = {};

      matchedPicks.forEach(p => {
        if (p.dsValue) totalDsValue += p.dsValue;
        if (p.dsProjection) totalProjection += p.dsProjection;

        const adpDiff = p.dsADP ? (p.dsADP - p.pickNo) : 0;
        totalValue += adpDiff;

        if (adpDiff >= 5) {
          valuePicks++;
          if (!bestValue || adpDiff > bestValue.diff) bestValue = { name: p.playerName, diff: adpDiff, pick: p.pickNo };
        }
        if (adpDiff <= -10) {
          reachPicks++;
          if (!worstReach || adpDiff < worstReach.diff) worstReach = { name: p.playerName, diff: adpDiff, pick: p.pickNo };
        }

        const tier = p.dsTier || 99;
        tierCounts[tier] = (tierCounts[tier] || 0) + 1;
        if (tier <= 2) elitePicks++;
        posCounts[p.position] = (posCounts[p.position] || 0) + 1;
      });

      const theme = CHARACTER_THEMES[character];

      return {
        character, theme,
        ownerId: picks[0]?.pickedBy,
        totalPicks, matchedPicks: matchedPicks.length,
        totalDsValue, totalValue, valuePicks, reachPicks,
        bestValue, worstReach, elitePicks,
        totalProjection: Math.round(totalProjection),
        tierCounts, posCounts, picks,
      };
    });

    if (!rawTeams.length) return [];

    // Normalize each metric 0-100 across the league, then composite
    const normMetric = (arr, key) => {
      const vals = arr.map(t => t[key]);
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const range = max - min || 1;
      return arr.map(t => ({ ...t, [`_n_${key}`]: ((t[key] - min) / range) * 100 }));
    };

    let scored = normMetric(rawTeams, 'totalDsValue');
    scored = normMetric(scored, 'totalProjection');
    scored = normMetric(scored, 'totalValue');

    // Composite: 50% DS Value + 30% Projections + 20% ADP Value
    scored = scored.map(t => ({
      ...t,
      _composite: t._n_totalDsValue * 0.5 + t._n_totalProjection * 0.3 + t._n_totalValue * 0.2,
    }));

    // Rank and assign grades on a curve: 1st → 95, last → 30
    scored.sort((a, b) => b._composite - a._composite);
    const n = scored.length;
    return scored.map((t, i) => {
      const curved = n > 1 ? Math.round(95 - (i / (n - 1)) * 65) : 75;
      return { ...t, score: curved, grade: gradeFromScore(curved) };
    });
  }, [draftPicks, rankings]);

  if (picksLoading || rankingsLoading) return <LoadingSpinner message="Computing draft grades..." />;
  if (!grades.length) return <p className="text-gray-500 text-center py-8">No draft data available for grading.</p>;

  const leagues = getLeaguesForSeason(season);
  const cup = leagues[cupKey];

  return (
    <div className="bg-mk-dark/80 backdrop-blur rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="font-body font-bold text-white text-sm">
          📊 Draft Grades — {cup?.emoji} {cup?.name}
        </h3>
        <span className="text-xs text-gray-500">Based on Draft Sharks half-PPR rankings</span>
      </div>

      <div className="divide-y divide-white/5">
        {grades.map((team) => {
          const isExpanded = expandedTeam === team.character;
          return (
            <Fragment key={team.character}>
              <div
                onClick={() => setExpandedTeam(isExpanded ? null : team.character)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition cursor-pointer"
              >
                {/* Grade badge */}
                <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center font-display text-lg shrink-0 ${team.grade.color}`}>
                  {team.grade.letter}
                </div>

                {/* Character + stats */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: team.theme?.primary || '#666' }} />
                    <span className="text-white font-semibold text-sm truncate">{team.character}</span>
                    <span className="text-gray-600 text-xs font-mono">{team.score}/100</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    <span>{team.totalPicks} picks</span>
                    {team.valuePicks > 0 && <span className="text-green-400">{team.valuePicks} steals</span>}
                    {team.reachPicks > 0 && <span className="text-red-400">{team.reachPicks} reaches</span>}
                    {team.elitePicks > 0 && <span className="text-yellow-400">{team.elitePicks} T1/T2</span>}
                    <span className="hidden sm:inline">Proj: {team.totalProjection} pts</span>
                  </div>
                  {/* Score breakdown bar */}
                  <div className="flex items-center gap-1 mt-1 h-1.5 w-full max-w-[200px]">
                    <div className="bg-blue-500/60 h-full rounded-l" style={{ width: `${(team._n_totalDsValue || 0) * 0.5}%` }} title={`DS Value: ${Math.round(team._n_totalDsValue || 0)}`} />
                    <div className="bg-purple-500/60 h-full" style={{ width: `${(team._n_totalProjection || 0) * 0.3}%` }} title={`Projection: ${Math.round(team._n_totalProjection || 0)}`} />
                    <div className="bg-green-500/60 h-full rounded-r" style={{ width: `${(team._n_totalValue || 0) * 0.2}%` }} title={`ADP Value: ${Math.round(team._n_totalValue || 0)}`} />
                  </div>
                </div>

                {/* Position breakdown pills */}
                <div className="hidden sm:flex items-center gap-1">
                  {Object.entries(team.posCounts).sort((a, b) => b[1] - a[1]).map(([pos, count]) => (
                    <span key={pos} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${POS_COLORS[pos] || 'text-gray-400 bg-gray-400/10'}`}>
                      {count}{pos}
                    </span>
                  ))}
                </div>

                {/* Expand arrow */}
                <svg className={`w-4 h-4 text-gray-500 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Expanded: pick-by-pick breakdown */}
              {isExpanded && (
                <div className="px-4 pb-3 bg-white/[0.02]">
                  {/* Highlights */}
                  <div className="flex flex-wrap gap-3 mb-3 text-xs">
                    {team.bestValue && (
                      <div className="bg-green-900/30 border border-green-500/20 rounded-lg px-3 py-1.5">
                        <span className="text-green-400 font-bold">Best Value:</span>{' '}
                        <span className="text-green-300">{team.bestValue.name}</span>{' '}
                        <span className="text-gray-500">(Pick {team.bestValue.pick}, ADP {Math.round(team.bestValue.pick + team.bestValue.diff)})</span>
                      </div>
                    )}
                    {team.worstReach && (
                      <div className="bg-red-900/30 border border-red-500/20 rounded-lg px-3 py-1.5">
                        <span className="text-red-400 font-bold">Biggest Reach:</span>{' '}
                        <span className="text-red-300">{team.worstReach.name}</span>{' '}
                        <span className="text-gray-500">(Pick {team.worstReach.pick}, ADP {Math.round(team.worstReach.pick + team.worstReach.diff)})</span>
                      </div>
                    )}
                  </div>

                  {/* Pick table */}
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="py-1.5 px-2 text-left text-gray-500 font-display uppercase">Rd</th>
                        <th className="py-1.5 px-2 text-left text-gray-500 font-display uppercase">Pick</th>
                        <th className="py-1.5 px-2 text-left text-gray-500 font-display uppercase">Player</th>
                        <th className="py-1.5 px-2 text-center text-gray-500 font-display uppercase">Pos</th>
                        <th className="py-1.5 px-2 text-center text-gray-500 font-display uppercase hidden sm:table-cell">DS Rank</th>
                        <th className="py-1.5 px-2 text-center text-gray-500 font-display uppercase hidden sm:table-cell">ADP</th>
                        <th className="py-1.5 px-2 text-center text-gray-500 font-display uppercase">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.picks.map((pick, i) => {
                        const valueDiff = pick.dsADP ? Math.round((pick.dsADP - pick.pickNo) * 10) / 10 : null;
                        const valueClass = valueDiff > 5 ? 'text-green-400' : valueDiff < -10 ? 'text-red-400' : 'text-gray-500';
                        return (
                          <tr key={i} className="border-b border-white/5">
                            <td className="py-1.5 px-2 text-gray-500">{pick.round}</td>
                            <td className="py-1.5 px-2 text-gray-400 font-mono">{pick.pickNo}</td>
                            <td className="py-1.5 px-2 text-white font-semibold">{pick.playerName}</td>
                            <td className="py-1.5 px-2 text-center">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${POS_COLORS[pick.position] || ''}`}>{pick.position}</span>
                            </td>
                            <td className="py-1.5 px-2 text-center text-gray-400 font-mono hidden sm:table-cell">{pick.dsRank || '—'}</td>
                            <td className="py-1.5 px-2 text-center text-gray-400 font-mono hidden sm:table-cell">{pick.dsADP?.toFixed(1) || '—'}</td>
                            <td className={`py-1.5 px-2 text-center font-mono font-bold ${valueClass}`}>
                              {valueDiff != null ? (valueDiff > 0 ? `+${valueDiff}` : valueDiff) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// Draft Sharks News Sidebar
// ═══════════════════════════════════════
function DraftSharksNews() {
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDraftSharkNews()
      .then(data => setNews(data?.data?.articles || []))
      .catch(() => setNews(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!news?.length) return null;

  return (
    <div className="bg-mk-dark/80 backdrop-blur rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-4 border-b border-white/10">
        <h3 className="font-body font-bold text-white text-sm">📰 Draft Sharks News</h3>
      </div>
      <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
        {news.slice(0, 10).map((article, i) => (
          <a
            key={i}
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-3 hover:bg-white/5 transition"
          >
            <p className="text-sm text-white font-semibold leading-snug">{article.title}</p>
            {article.summary && (
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{article.summary}</p>
            )}
            {article.date && (
              <span className="text-[10px] text-gray-600 mt-1 block">{article.date}</span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// Main Draft Page
// ═══════════════════════════════════════
export default function DraftPage() {
  const { season } = useSeason();
  const [activeCup, setActiveCup] = useState('mushroom');
  const [activeView, setActiveView] = useState('board'); // 'board' | 'sharks'
  const leagues = getLeaguesForSeason(season);

  // Fetch DS rankings once, share across all cup grade tabs
  const [dsRankings, setDsRankings] = useState(null);
  const [dsRankingsLoading, setDsRankingsLoading] = useState(true);
  useEffect(() => {
    api.getDraftSharkRankings({ scoring: 'half-ppr', position: '', isDynasty: false })
      .then(data => setDsRankings(data?.data?.players || []))
      .catch(() => setDsRankings(null))
      .finally(() => setDsRankingsLoading(false));
  }, []);

  return (
    <div>
      <div className="text-center mb-8">
        <span className="text-5xl mb-3 block">📋</span>
        <h2 className="font-display text-xl md:text-2xl text-white mb-1">{season} DRAFT CENTER</h2>
        <p className="text-gray-400 text-sm font-body">Draft picks from Sleeper + rankings & analysis from Draft Sharks</p>
      </div>

      {/* View Toggle: Board vs Draft Sharks */}
      <div className="flex justify-center mb-4 sm:mb-6">
        <div className="flex rounded-xl overflow-hidden border border-white/10">
          <button
            onClick={() => setActiveView('board')}
            className={`px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-bold transition ${
              activeView === 'board'
                ? 'bg-mk-blue text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            📋 Draft Board
          </button>
          <button
            onClick={() => setActiveView('sharks')}
            className={`px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-bold transition ${
              activeView === 'sharks'
                ? 'bg-mk-blue text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            🦈 Draft Sharks
          </button>
        </div>
      </div>

      {activeView === 'board' && (
        <>
          {/* Team Grid */}
          <div className="mb-4 sm:mb-6 bg-mk-dark/80 rounded-2xl border border-white/10 p-3 sm:p-5">
            <h3 className="font-display text-[10px] sm:text-xs text-mk-blue mb-2 sm:mb-3">🏁 TEAM ROSTER</h3>
            <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
              {Object.entries(OWNERS).filter(([id]) => Number(season) >= 2026 ? !DEPARTED_OWNER_IDS.has(id) : true).map(([id, owner]) => (
                <div key={id} className="bg-mk-darker/60 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
                  <CharacterBadge character={owner.character} size="sm" />
                  <p className="font-body font-bold text-[10px] sm:text-xs text-white mt-1 sm:mt-2 truncate">{owner.character}</p>
                  <p className="text-[9px] sm:text-[10px] text-gray-400 truncate hidden sm:block">{owner.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cup Tabs */}
          <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1 justify-start sm:justify-center">
            {Object.entries(leagues).map(([key, c]) => (
              <button key={key} onClick={() => setActiveCup(key)}
                className={`px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap active:scale-95 shrink-0 ${activeCup === key ? 'bg-white/10 text-white border border-white/20 shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                {c.emoji} <span className="hidden sm:inline">{c.name}</span> ({c.type})
              </button>
            ))}
          </div>

          <DraftBoard cupKey={activeCup} season={season} />
        </>
      )}

      {activeView === 'sharks' && (
        <div className="space-y-6">
          <DraftSharksPanel />

          {/* Draft Grades per Cup */}
          <div>
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1 justify-start sm:justify-center">
              {Object.entries(leagues).map(([key, c]) => (
                <button key={key} onClick={() => setActiveCup(key)}
                  className={`px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap active:scale-95 shrink-0 ${activeCup === key ? 'bg-white/10 text-white border border-white/20 shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  {c.emoji} <span className="hidden sm:inline">{c.name}</span> Grades
                </button>
              ))}
            </div>
            <DraftGrades cupKey={activeCup} season={season} rankings={dsRankings} rankingsLoading={dsRankingsLoading} />
          </div>

          <DraftSharksNews />
        </div>
      )}
    </div>
  );
}
