import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useSeason } from '../hooks/SeasonContext';
import { useSound } from '../hooks/useSoundEffects';
import { usePlayerDB } from '../hooks/usePlayerDB';
import { OWNERS, LEAGUE_META, CHARACTER_THEMES, getLeaguesForSeason, DEPARTED_OWNER_IDS } from '../data/leagueConfig';
import { BADGE_DEFS, evaluateBadges } from '../data/badges';
import CharacterBadge from '../components/CharacterBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import MyPowerUpsPage from './MyPowerUps';

const API = 'https://api.sleeper.app/v1';
const fetchJSON = (url) => fetch(url).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); });

// ─── Login prompt (shared with MyPowerUps) ───
const ownerList = Object.entries(OWNERS)
  .filter(([id]) => !DEPARTED_OWNER_IDS.has(id))
  .map(([id, info]) => ({ id, ...info }))
  .sort((a, b) => a.name.localeCompare(b.name));

function LoginGate({ children }) {
  const { user, login } = useAuth();
  const [step, setStep] = useState('pick');
  const [selected, setSelected] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return children;

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password || password.length < 4) { setError('Password must be at least 4 characters'); return; }
    setError(''); setLoading(true);
    try { await login(selected.sleeper, password); }
    catch (err) { setError(err.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  if (step === 'password' && selected) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-mk-dark rounded-2xl border border-white/10 p-5 sm:p-8 text-center">
          <div className="flex justify-center mb-4"><CharacterBadge character={selected.character} size="lg" noLink /></div>
          <h2 className="font-display text-lg text-white mb-1">{selected.character}</h2>
          <p className="text-sm text-gray-400 mb-6">{selected.name}</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full bg-mk-darker border border-white/10 rounded-xl px-4 py-3 text-white text-center focus:border-mk-blue focus:outline-none"
              autoFocus />
            <p className="text-[10px] text-gray-500">First time? This creates your password. Returning? Enter the one you set.</p>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading || password.length < 4}
              className="w-full py-3 bg-mk-blue text-white rounded-xl font-bold hover:bg-mk-blue/80 transition disabled:opacity-50">
              {loading ? 'Checking...' : 'Enter the Race'}
            </button>
          </form>
          <button onClick={() => { setStep('pick'); setSelected(null); }} className="mt-4 text-xs text-gray-500 hover:text-white transition">
            ← Pick a different character
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-8">
      <div className="bg-mk-dark rounded-2xl border border-white/10 p-5 sm:p-8 text-center">
        <span className="text-4xl block mb-4">🏎️</span>
        <h2 className="font-display text-base sm:text-lg text-white mb-2">OWNER LOGIN</h2>
        <p className="text-xs sm:text-sm text-gray-400 mb-4">Select your character below, then set a password.</p>
        <div className="bg-mk-darker/80 rounded-xl border border-white/5 p-3 mb-6 text-left space-y-1.5">
          <p className="text-[10px] font-display text-mk-blue uppercase tracking-wider mb-1">How to log in</p>
          <p className="text-xs text-gray-400 font-body">1. Tap your character below</p>
          <p className="text-xs text-gray-400 font-body">2. First time? Create any password (4+ characters)</p>
          <p className="text-xs text-gray-400 font-body">3. Returning? Enter the password you set before</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
          {ownerList.map(owner => (
            <button key={owner.id} onClick={() => { setSelected(owner); setStep('password'); setPassword(''); setError(''); }}
              className="flex flex-col items-center gap-1.5 p-2.5 sm:p-3 rounded-xl bg-mk-darker border border-white/5 hover:border-mk-blue/40 hover:bg-mk-darker transition-all active:scale-95 min-h-[72px]">
              <CharacterBadge character={owner.character} size="sm" noLink />
              <span className="text-[10px] sm:text-xs text-gray-400 truncate w-full">{owner.character}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MY SCHEDULE — player's matchups across all 3 cups
// ═══════════════════════════════════════════════════
function MyScheduleTab({ sleeper, ownerId }) {
  const { data } = sleeper;

  const schedule = useMemo(() => {
    if (!data?.cupData) return [];
    const weeks = {};
    Object.entries(data.cupData).forEach(([cupKey, cd]) => {
      const { allMatchups, rosterToOwner, playoffWeekStart } = cd;
      // Find this owner's roster ID in this cup
      const myRosterId = Object.keys(rosterToOwner).find(rid => rosterToOwner[rid]?.ownerId === ownerId);
      if (!myRosterId) return;

      const maxWeek = Math.max(...Object.keys(allMatchups).map(Number).filter(w => allMatchups[w]?.length > 0), 0);
      for (let week = 1; week <= maxWeek; week++) {
        const weekData = allMatchups[week];
        if (!weekData) continue;
        const myEntry = weekData.find(m => String(m.roster_id) === String(myRosterId));
        if (!myEntry || myEntry.matchup_id == null) continue;

        const opponent = weekData.find(m => m.matchup_id === myEntry.matchup_id && String(m.roster_id) !== String(myRosterId));
        if (!opponent) continue;
        const oppInfo = rosterToOwner[opponent.roster_id] || {};
        const myPts = myEntry.points || 0;
        const oppPts = opponent.points || 0;
        const played = myPts > 0 || oppPts > 0;
        const isPlayoff = week >= playoffWeekStart;

        if (!weeks[week]) weeks[week] = { week, matchups: [], isPlayoff };
        weeks[week].matchups.push({
          cup: cupKey,
          opponent: oppInfo.character || '?',
          oppOwner: oppInfo.ownerName || '?',
          myPts, oppPts, played,
          won: played && myPts > oppPts,
          lost: played && oppPts > myPts,
        });
      }
    });
    return Object.values(weeks).sort((a, b) => a.week - b.week);
  }, [data, ownerId]);

  const record = useMemo(() => {
    let w = 0, l = 0;
    schedule.forEach(wk => wk.matchups.forEach(m => { if (m.won) w++; if (m.lost) l++; }));
    return { wins: w, losses: l };
  }, [schedule]);

  if (!data?.cupData) return <p className="text-gray-500 text-center py-8">No schedule data available.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-xs text-mk-blue tracking-widest">MY SCHEDULE</h3>
        <span className="text-sm text-white font-bold">{record.wins}-{record.losses} overall</span>
      </div>
      <div className="space-y-2">
        {schedule.map(wk => (
          <div key={wk.week} className={`bg-mk-dark rounded-xl border ${wk.isPlayoff ? 'border-mk-gold/20' : 'border-white/5'} p-3`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase w-16 shrink-0">
                {wk.isPlayoff ? '🏆 ' : ''}Wk {wk.week}
              </span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {wk.matchups.map((m, i) => {
                const cupMeta = LEAGUE_META[m.cup];
                return (
                  <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                    m.won ? 'bg-green-500/10 border border-green-500/20' :
                    m.lost ? 'bg-red-500/10 border border-red-500/20' :
                    'bg-white/5 border border-white/5'
                  }`}>
                    <span className="text-[10px]">{cupMeta?.emoji || '🏅'}</span>
                    <span className="text-gray-400">vs</span>
                    <CharacterBadge character={m.opponent} size="xs" />
                    <span className="text-white font-semibold truncate flex-1">{m.opponent}</span>
                    {m.played ? (
                      <span className={`font-bold tabular-nums ${m.won ? 'text-green-400' : 'text-red-400'}`}>
                        {m.myPts.toFixed(1)}-{m.oppPts.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-gray-600 text-[10px]">Upcoming</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {schedule.length === 0 && <p className="text-gray-500 text-center py-8">No matchups found.</p>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MY BADGES — auto-computed achievements
// ═══════════════════════════════════════════════════

function MyBadgesTab({ sleeper, ownerId }) {
  const { data } = sleeper;
  const { play } = useSound();

  const { earned, locked, stats } = useMemo(() => {
    return evaluateBadges(data?.cupData, ownerId);
  }, [data, ownerId]);

  useEffect(() => {
    if (earned.length > 0) play('levelUp');
  }, [earned.length]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-xs text-mk-blue tracking-widest">MY BADGES</h3>
        <span className="text-sm text-gray-400">{earned.length}/{BADGE_DEFS.length} unlocked</span>
      </div>

      {/* Progress bar */}
      <div className="mb-6 bg-white/5 rounded-full h-2.5 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-mk-blue to-mk-gold rounded-full transition-all duration-700"
          style={{ width: `${(earned.length / BADGE_DEFS.length) * 100}%` }} />
      </div>

      {/* Earned badges */}
      {earned.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] text-gray-500 uppercase font-bold mb-3">Unlocked</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {earned.map(b => (
              <div key={b.id} className={`bg-mk-dark rounded-xl border p-3 text-center ${
                b.legendary ? 'border-mk-gold/40 bg-gradient-to-b from-mk-gold/10 to-transparent' :
                b.rare ? 'border-purple-500/30 bg-gradient-to-b from-purple-500/5 to-transparent' :
                'border-white/10'
              }`}>
                <span className="text-2xl block mb-1">{b.icon}</span>
                <p className="text-xs font-bold text-white">{b.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{b.desc}</p>
                {b.legendary && <span className="text-[9px] text-mk-gold font-bold uppercase mt-1 block">Legendary</span>}
                {b.rare && !b.legendary && <span className="text-[9px] text-purple-400 font-bold uppercase mt-1 block">Rare</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked badges */}
      {locked.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-500 uppercase font-bold mb-3">Locked</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {locked.map(b => (
              <div key={b.id} className="bg-mk-dark rounded-xl border border-white/5 p-3 text-center opacity-40">
                <span className="text-2xl block mb-1 grayscale">🔒</span>
                <p className="text-xs font-bold text-gray-500">{b.name}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick stats */}
      {stats && (
        <div className="mt-6 bg-mk-dark rounded-xl border border-white/5 p-4">
          <p className="text-[10px] text-gray-500 uppercase font-bold mb-3">Season Stats</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-white">{stats.wins}-{stats.losses}</p>
              <p className="text-[10px] text-gray-500">Record</p>
            </div>
            <div>
              <p className="text-lg font-bold text-white">{stats.gamesPlayed}</p>
              <p className="text-[10px] text-gray-500">Games Played</p>
            </div>
            <div>
              <p className="text-lg font-bold text-white">{stats.weeklyScores.length > 0 ? (stats.weeklyScores.reduce((s, w) => s + w.pts, 0) / stats.weeklyScores.length).toFixed(1) : '—'}</p>
              <p className="text-[10px] text-gray-500">Avg PPG</p>
            </div>
            <div>
              <p className="text-lg font-bold text-white">{stats.longestStreak}</p>
              <p className="text-[10px] text-gray-500">Win Streak</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MY POWER-UPS — redirect to existing page content
// ═══════════════════════════════════════════════════
// We render the existing MyPowerUps page inline.
// Since it has its own login gate, we skip it here (parent already gates).

function MyPowerUpsTab() {
  // The existing MyPowerUps page handles everything including its own auth check.
  // We render it directly.
  return <MyPowerUpsPage />;
}

// ═══════════════════════════════════════════════════
// MY ROSTERS — player's NFL rosters across all 3 cups
// ═══════════════════════════════════════════════════

const POS_ORDER = { QB: 0, RB: 1, WR: 2, TE: 3, K: 4, DEF: 5 };
const POS_COLORS = {
  QB:  'bg-red-500/20 text-red-400 border-red-500/30',
  RB:  'bg-green-500/20 text-green-400 border-green-500/30',
  WR:  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  TE:  'bg-purple-500/20 text-purple-400 border-purple-500/30',
  K:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  DEF: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

function RosterPosBadge({ pos }) {
  const cls = POS_COLORS[pos] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cls} shrink-0`}>
      {pos}
    </span>
  );
}

function RosterPlayerRow({ pid, playerDB, stats, isStarter }) {
  const p = playerDB?.[pid];
  const name = p ? `${p.fn} ${p.ln}`.trim() : `Player ${pid}`;
  const pos = p?.pos || '?';
  const team = p?.team || '';
  const seasonPts = stats?.totalPts || 0;
  const gp = stats?.gamesPlayed || 0;
  const avg = gp > 0 ? seasonPts / gp : 0;

  let trend = 0;
  if (stats?.weeklyScores?.length >= 4) {
    const sorted = [...stats.weeklyScores].sort((a, b) => b.week - a.week);
    const recent = sorted.slice(0, 3);
    const prior = sorted.slice(3, 6);
    const recentAvg = recent.reduce((s, w) => s + w.points, 0) / recent.length;
    const priorAvg = prior.length ? prior.reduce((s, w) => s + w.points, 0) / prior.length : 0;
    trend = recentAvg - priorAvg;
  }

  return (
    <div className="grid grid-cols-[2.5rem_1fr_3rem_3.5rem_3.5rem_3rem] gap-1.5 px-3 py-2 border-b border-white/5 items-center transition hover:bg-white/[0.03]">
      <RosterPosBadge pos={pos} />
      <div className="min-w-0">
        <p className={`text-sm font-medium truncate ${isStarter ? 'text-white' : 'text-gray-400'}`}>{name}</p>
        <p className="text-[10px] text-gray-600">{team}{!isStarter ? ' · Bench' : ''}</p>
      </div>
      <span className="text-xs text-white font-bold text-right">{seasonPts.toFixed(1)}</span>
      <span className="text-[10px] text-gray-400 text-right">{gp > 0 ? avg.toFixed(1) : '—'}</span>
      <span className="text-[10px] text-gray-500 text-right">{gp}</span>
      <div className="flex justify-end">
        {Math.abs(trend) >= 0.5 ? (
          <span className={`text-[10px] font-bold flex items-center gap-0.5 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            <svg className={`w-3 h-3 ${trend > 0 ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" />
            </svg>
            {Math.abs(trend).toFixed(1)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function MyRostersTab({ sleeper, ownerId }) {
  const { season } = useSeason();
  const { play } = useSound();
  const { playerDB, loading: dbLoading } = usePlayerDB();
  const [rosterData, setRosterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCup, setActiveCup] = useState('mushroom');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const leagues = getLeaguesForSeason(season);
        const cupKeys = Object.keys(leagues);
        const results = await Promise.all(
          cupKeys.map(async (cupKey) => {
            const league = leagues[cupKey];
            const [rostersRaw, leagueInfo] = await Promise.all([
              fetchJSON(`${API}/league/${league.id}/rosters`),
              fetchJSON(`${API}/league/${league.id}`),
            ]);
            const lastWeek = leagueInfo.settings?.last_scored_leg || 1;

            // Find this owner's roster
            const myRoster = rostersRaw.find(r => r.owner_id === ownerId);
            if (!myRoster) return { cupKey, roster: null, playerSeasonStats: {}, lastWeek };

            // Fetch matchups for season scoring
            const weekNums = [];
            for (let w = 1; w <= lastWeek; w++) weekNums.push(w);
            const matchupResponses = await Promise.all(
              weekNums.map(w => fetchJSON(`${API}/league/${league.id}/matchups/${w}`).catch(() => []))
            );

            // Build player season stats from this owner's matchup entries
            const playerSeasonStats = {};
            weekNums.forEach((w, idx) => {
              const matchups = matchupResponses[idx] || [];
              const myMatch = matchups.find(m => m.roster_id === myRoster.roster_id);
              if (!myMatch?.players_points) return;
              Object.entries(myMatch.players_points).forEach(([pid, pts]) => {
                if (pts == null) return;
                if (!playerSeasonStats[pid]) {
                  playerSeasonStats[pid] = { totalPts: 0, gamesPlayed: 0, weeklyScores: [] };
                }
                playerSeasonStats[pid].totalPts += pts;
                playerSeasonStats[pid].gamesPlayed++;
                playerSeasonStats[pid].weeklyScores.push({ week: w, points: pts });
              });
            });

            return {
              cupKey,
              roster: {
                starters: myRoster.starters || [],
                players: myRoster.players || [],
                reserve: myRoster.reserve || [],
                wins: myRoster.settings?.wins || 0,
                losses: myRoster.settings?.losses || 0,
                fpts: (myRoster.settings?.fpts || 0) + (myRoster.settings?.fpts_decimal || 0) / 100,
              },
              playerSeasonStats,
              lastWeek,
            };
          })
        );

        if (!cancelled) {
          const data = {};
          results.forEach(r => { data[r.cupKey] = r; });
          setRosterData(data);
        }
      } catch (err) {
        console.error('Roster fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [season, ownerId]);

  const cupKeys = ['mushroom', 'flower', 'star'];
  const cupInfo = rosterData?.[activeCup];
  const roster = cupInfo?.roster;

  // Sort players: starters first by position, then bench by position
  // IMPORTANT: hooks must be called before any early returns
  const sortedPlayers = useMemo(() => {
    if (!roster) return [];
    const starterSet = new Set(roster.starters);
    const reserveSet = new Set(roster.reserve || []);
    const starters = [];
    const bench = [];
    const reserve = [];

    roster.players.forEach(pid => {
      const p = playerDB?.[pid];
      const posOrder = p ? (POS_ORDER[p.pos] ?? 99) : 99;
      if (starterSet.has(pid)) {
        starters.push({ pid, posOrder });
      } else if (reserveSet.has(pid)) {
        reserve.push({ pid, posOrder });
      } else {
        bench.push({ pid, posOrder });
      }
    });

    starters.sort((a, b) => a.posOrder - b.posOrder);
    bench.sort((a, b) => a.posOrder - b.posOrder);
    reserve.sort((a, b) => a.posOrder - b.posOrder);

    return [
      ...starters.map(s => ({ ...s, section: 'starter' })),
      ...bench.map(s => ({ ...s, section: 'bench' })),
      ...reserve.map(s => ({ ...s, section: 'reserve' })),
    ];
  }, [roster, playerDB]);

  const starterCount = roster ? new Set(roster.starters).size : 0;

  if (loading) return <LoadingSpinner />;
  if (!rosterData) return <p className="text-gray-500 text-center py-8">No roster data available.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-xs text-mk-blue tracking-widest">MY ROSTERS</h3>
      </div>

      {/* Cup tabs */}
      <div className="flex justify-center gap-1 bg-mk-dark rounded-xl border border-white/10 p-1 mb-5 max-w-sm mx-auto">
        {cupKeys.map(key => {
          const meta = LEAGUE_META[key];
          const cd = rosterData[key];
          const hasRoster = !!cd?.roster;
          return (
            <button
              key={key}
              onClick={() => { setActiveCup(key); play('tab'); }}
              disabled={!hasRoster}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all flex-1 justify-center ${
                activeCup === key
                  ? 'text-white shadow-lg'
                  : hasRoster
                    ? 'text-gray-400 hover:text-white hover:bg-white/5'
                    : 'text-gray-600 cursor-not-allowed'
              }`}
              style={activeCup === key ? { backgroundColor: meta.color + '33', boxShadow: `0 4px 15px ${meta.color}22` } : {}}
            >
              <span>{meta.emoji}</span>
              <span className="hidden sm:inline">{meta.name}</span>
              <span className="sm:hidden">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
            </button>
          );
        })}
      </div>

      {/* Record + points summary */}
      {roster && (
        <div className="flex justify-center gap-6 mb-4 text-center">
          <div>
            <p className="text-lg font-bold text-white">{roster.wins}-{roster.losses}</p>
            <p className="text-[10px] text-gray-500">Record</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">{roster.fpts.toFixed(1)}</p>
            <p className="text-[10px] text-gray-500">Total Pts</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">{roster.players.length}</p>
            <p className="text-[10px] text-gray-500">Players</p>
          </div>
        </div>
      )}

      {/* League type badge */}
      <div className="text-center mb-4">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-white/5 px-3 py-1 rounded-full">
          {LEAGUE_META[activeCup]?.type} League · Week {cupInfo?.lastWeek || '—'}
        </span>
      </div>

      {/* Roster table */}
      {roster ? (
        <div className="bg-mk-dark rounded-2xl border border-white/10 overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[2.5rem_1fr_3rem_3.5rem_3.5rem_3rem] gap-1.5 px-3 py-1.5 border-b border-white/10 text-[9px] text-gray-600 font-bold uppercase tracking-wider">
            <span>Pos</span>
            <span>Player</span>
            <span className="text-right">Pts</span>
            <span className="text-right">Avg</span>
            <span className="text-right">GP</span>
            <span className="text-right">Trnd</span>
          </div>

          {/* Starters section */}
          {starterCount > 0 && (
            <div className="px-3 py-1.5 bg-white/[0.02] border-b border-white/5">
              <span className="text-[9px] font-bold text-mk-blue uppercase tracking-wider">Starters ({starterCount})</span>
            </div>
          )}
          {sortedPlayers.filter(p => p.section === 'starter').map(({ pid }) => (
            <RosterPlayerRow
              key={pid}
              pid={pid}
              playerDB={playerDB}
              stats={cupInfo?.playerSeasonStats?.[pid]}
              isStarter={true}
            />
          ))}

          {/* Bench section */}
          {sortedPlayers.some(p => p.section === 'bench') && (
            <div className="px-3 py-1.5 bg-white/[0.02] border-b border-white/5 border-t border-white/10">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Bench ({sortedPlayers.filter(p => p.section === 'bench').length})</span>
            </div>
          )}
          {sortedPlayers.filter(p => p.section === 'bench').map(({ pid }) => (
            <RosterPlayerRow
              key={pid}
              pid={pid}
              playerDB={playerDB}
              stats={cupInfo?.playerSeasonStats?.[pid]}
              isStarter={false}
            />
          ))}

          {/* IR section */}
          {sortedPlayers.some(p => p.section === 'reserve') && (
            <div className="px-3 py-1.5 bg-white/[0.02] border-b border-white/5 border-t border-white/10">
              <span className="text-[9px] font-bold text-red-400/60 uppercase tracking-wider">IR ({sortedPlayers.filter(p => p.section === 'reserve').length})</span>
            </div>
          )}
          {sortedPlayers.filter(p => p.section === 'reserve').map(({ pid }) => (
            <RosterPlayerRow
              key={pid}
              pid={pid}
              playerDB={playerDB}
              stats={cupInfo?.playerSeasonStats?.[pid]}
              isStarter={false}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No roster found for this cup.</p>
        </div>
      )}

      <p className="text-center text-[10px] text-gray-600 mt-4">
        Pts = season total · Avg = per-game average · Trend = last 3 weeks vs prior 3
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MAIN PROFILE PAGE
// ═══════════════════════════════════════════════════
const TABS = [
  { key: 'schedule', label: 'My Schedule', emoji: '📅' },
  { key: 'rosters', label: 'My Rosters', emoji: '📋' },
  { key: 'badges', label: 'My Badges', emoji: '🏅' },
  { key: 'powerups', label: 'My Power-Ups', emoji: '🎒' },
];

export default function PlayerProfile({ sleeper }) {
  const { user } = useAuth();
  const { play } = useSound();
  const [activeTab, setActiveTab] = useState('schedule');

  const theme = user ? (CHARACTER_THEMES[user.character] || { primary: '#666' }) : {};

  return (
    <div>
      <LoginGate>
        {/* Profile header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="relative">
              <CharacterBadge character={user?.character} size="lg" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-mk-dark flex items-center justify-center">
                <span className="text-[8px] text-white font-bold">ON</span>
              </div>
            </div>
          </div>
          <h2 className="font-display text-lg text-white">{user?.character}</h2>
          <p className="text-sm text-gray-400">{OWNERS[user?.ownerId]?.name}</p>

          {/* Quick actions */}
          <div className="flex justify-center gap-3 mt-4">
            <a
              href="https://www.leaguesafe.com/league/4454337"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600/20 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-600/30 hover:border-green-500/50 transition-all"
            >
              <span>💰</span> Pay Your Dues
            </a>
            <a
              href="https://discord.gg/DbZ44haYW"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-xs font-bold hover:bg-indigo-600/30 hover:border-indigo-500/50 transition-all"
            >
              <span>💬</span> Discord Server
            </a>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex justify-center gap-1 mb-6 bg-mk-dark rounded-xl border border-white/10 p-1.5 max-w-lg mx-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); play('tab'); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all flex-1 justify-center ${
                activeTab === tab.key
                  ? 'bg-mk-blue text-white shadow-lg shadow-mk-blue/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{tab.emoji}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.replace('My ', '')}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="max-w-4xl mx-auto">
          {activeTab === 'schedule' && <MyScheduleTab sleeper={sleeper} ownerId={user?.ownerId} />}
          {activeTab === 'rosters' && <MyRostersTab sleeper={sleeper} ownerId={user?.ownerId} />}
          {activeTab === 'badges' && <MyBadgesTab sleeper={sleeper} ownerId={user?.ownerId} />}
          {activeTab === 'powerups' && <MyPowerUpsTab />}
        </div>
      </LoginGate>
    </div>
  );
}
