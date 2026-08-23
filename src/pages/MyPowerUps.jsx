import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { api } from '../hooks/useApi';
import { LEAGUES, OWNERS, POWER_UPS, TIER_CONFIG } from '../data/leagueConfig';
import CharacterBadge from '../components/CharacterBadge';
import { POWER_UP_ICON_MAP } from '../components/PowerUpIcons';
import LoadingSpinner from '../components/LoadingSpinner';

const ownerList = Object.entries(OWNERS)
  .map(([id, info]) => ({ id, ...info }))
  .sort((a, b) => a.name.localeCompare(b.name));

// ─── Login / Register Form ───
function LoginForm() {
  const { login } = useAuth();
  const [step, setStep] = useState('pick');
  const [selected, setSelected] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSelectCharacter = (owner) => {
    setSelected(owner);
    setPassword('');
    setError('');
    setSuccessMsg('');
    setStep('password');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password || password.length < 4) { setError('Password must be at least 4 characters'); return; }
    setError('');
    setLoading(true);
    try {
      const result = await login(selected.sleeper, password);
      if (result.firstLogin) setSuccessMsg('Account created! Welcome to the race.');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'password' && selected) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-mk-dark/80 rounded-2xl border border-white/10 p-5 sm:p-8 text-center">
          <div className="flex justify-center mb-3 sm:mb-4">
            <CharacterBadge character={selected.character} size="lg" />
          </div>
          <h2 className="font-display text-lg text-white mb-1">{selected.character}</h2>
          <p className="text-sm text-gray-400 mb-6">{selected.name}</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-mk-darker border border-white/10 rounded-xl px-4 py-3 text-white text-center focus:border-mk-blue focus:outline-none"
                autoFocus />
              <p className="text-[10px] text-gray-500 mt-2">
                First time? This will create your password. Returning? Enter the password you set.
              </p>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {successMsg && <p className="text-green-400 text-sm">{successMsg}</p>}
            <button type="submit" disabled={loading || password.length < 4}
              className="w-full py-3 bg-mk-blue text-white rounded-xl font-bold hover:bg-mk-blue/80 transition-all disabled:opacity-50">
              {loading ? 'Checking...' : 'Enter the Race'}
            </button>
          </form>
          <button onClick={() => { setStep('pick'); setSelected(null); }}
            className="mt-4 text-xs text-gray-500 hover:text-white transition">
            ← Pick a different character
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-8">
      <div className="bg-mk-dark/80 rounded-2xl border border-white/10 p-5 sm:p-8 text-center">
        <span className="text-4xl sm:text-5xl block mb-3 sm:mb-4">🏎️</span>
        <h2 className="font-display text-base sm:text-lg text-white mb-2">OWNER LOGIN</h2>
        <p className="text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6">Select your character to log in</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
          {ownerList.map(owner => (
            <button key={owner.id} onClick={() => handleSelectCharacter(owner)}
              className="flex flex-col items-center gap-1 sm:gap-1.5 p-2.5 sm:p-3 rounded-xl bg-mk-darker/60 border border-white/5 hover:border-mk-blue/40 hover:bg-mk-darker transition-all active:scale-95 min-h-[72px]">
              <CharacterBadge character={owner.character} size="sm" />
              <span className="text-[10px] sm:text-xs text-gray-400 leading-tight truncate w-full">{owner.character}</span>
              <span className="text-[9px] text-gray-600 hidden sm:block">{owner.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Deploy Power-Up Modal ───
function DeployModal({ powerUp, powerUpIndex, ownerId, onClose, onDeploy }) {
  const [league, setLeague] = useState('');
  const [action, setAction] = useState('use'); // 'use' or 'hold'
  const [notes, setNotes] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [loadingOpponent, setLoadingOpponent] = useState(false);

  // Multi-shot state (triple shells) — one league per shot
  const [shotLeagues, setShotLeagues] = useState(['', '', '']);
  const [shotOpponents, setShotOpponents] = useState([null, null, null]);
  const [loadingShotOpponents, setLoadingShotOpponents] = useState([false, false, false]);

  const puDef = POWER_UPS.find(p => p.name === powerUp.name);
  const isOffensive = puDef?.type === 'offensive' || puDef?.type === 'offensive-aoe';
  const isAOE = puDef?.type === 'offensive-aoe';
  const isHoldable = puDef?.holdable;
  const isMultiShot = (puDef?.shots || 1) > 1;
  const numShots = puDef?.shots || 1;
  const tierCfg = TIER_CONFIG[powerUp.tier] || TIER_CONFIG[1];

  // Fetch current NFL week on mount
  useEffect(() => {
    api.getCurrentWeek()
      .then(data => setCurrentWeek(data.week))
      .catch(() => setError('Could not determine current NFL week'));
  }, []);

  // Auto-lookup opponent for SINGLE-shot shells
  useEffect(() => {
    if (isMultiShot || !league || !currentWeek || !isOffensive || isAOE || action === 'hold') {
      setOpponent(null);
      return;
    }
    setLoadingOpponent(true);
    setOpponent(null);
    api.getOpponent(ownerId, league, currentWeek)
      .then(data => setOpponent(data))
      .catch(err => setOpponent({ error: err.message }))
      .finally(() => setLoadingOpponent(false));
  }, [league, currentWeek, ownerId, isOffensive, isAOE, isMultiShot, action]);

  // Auto-lookup opponents for MULTI-shot shells (per-shot)
  const updateShotLeague = (idx, value) => {
    setShotLeagues(prev => { const n = [...prev]; n[idx] = value; return n; });
  };

  useEffect(() => {
    if (!isMultiShot || !currentWeek || action === 'hold') return;
    shotLeagues.forEach((lk, idx) => {
      if (!lk) {
        setShotOpponents(prev => { const n = [...prev]; n[idx] = null; return n; });
        return;
      }
      setLoadingShotOpponents(prev => { const n = [...prev]; n[idx] = true; return n; });
      api.getOpponent(ownerId, lk, currentWeek)
        .then(data => setShotOpponents(prev => { const n = [...prev]; n[idx] = data; return n; }))
        .catch(err => setShotOpponents(prev => { const n = [...prev]; n[idx] = { error: err.message }; return n; }))
        .finally(() => setLoadingShotOpponents(prev => { const n = [...prev]; n[idx] = false; return n; }));
    });
  }, [shotLeagues[0], shotLeagues[1], shotLeagues[2], currentWeek, ownerId, isMultiShot, action]);

  const handleDeploy = async () => {
    setDeploying(true);
    setError('');
    try {
      let res;
      if (action === 'hold') {
        res = await api.deployPowerUp(ownerId, powerUpIndex, { action: 'hold', notes });
      } else if (isMultiShot && isOffensive && !isAOE) {
        // Multi-shot: send array of leagues
        const activeLanes = shotLeagues.filter(Boolean);
        if (activeLanes.length === 0) { setError('Select at least one league'); setDeploying(false); return; }
        res = await api.deployPowerUp(ownerId, powerUpIndex, { targetLeagues: activeLanes, action: 'use', notes });
      } else {
        if (!league) { setError('Select a league'); setDeploying(false); return; }
        res = await api.deployPowerUp(ownerId, powerUpIndex, { targetLeague: league, action: 'use', notes });
      }
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeploying(false);
    }
  };

  // ─── Result screen ───
  if (result) {
    const isHeld = result.held;
    const isQueued = result.queued;
    const dep = result.deployment;
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-mk-dark rounded-2xl border border-white/10 p-6 max-w-md w-full text-center" onClick={e => e.stopPropagation()}>
          <span className="text-4xl block mb-3">{isHeld ? '🛡️' : '🔒'}</span>
          <h3 className="font-display text-lg text-white mb-2">
            {isHeld ? 'ITEM HELD!' : 'LOCKED IN!'}
          </h3>
          <p className="text-sm text-gray-300 mb-2">
            {powerUp.name} — {isHeld
              ? `Held for defense${isMultiShot ? ` (${numShots} blocking charges)` : ''}`
              : `Week ${dep?.week}`}
          </p>

          {isQueued && (
            <div className="bg-mk-darker/60 rounded-xl p-4 mb-4">
              <p className="text-xs text-yellow-400 font-bold uppercase mb-1">Queued for Resolution</p>
              <p className="text-[11px] text-gray-400">
                All power-ups resolve in random order after Thursday kickoff.
                Results will appear in the feed once the commish triggers resolution.
              </p>
              {dep?.targetLeagues && (
                <div className="mt-2 flex gap-1 justify-center flex-wrap">
                  {dep.targetLeagues.map(lk => (
                    <span key={lk} className="text-xs bg-mk-darker px-2 py-0.5 rounded text-gray-300">
                      {LEAGUES[lk]?.emoji} {LEAGUES[lk]?.name}
                    </span>
                  ))}
                </div>
              )}
              {dep?.targetLeague && !dep?.targetLeagues && (
                <p className="text-xs text-gray-400 mt-1">
                  {LEAGUES[dep.targetLeague]?.emoji} {LEAGUES[dep.targetLeague]?.name}
                </p>
              )}
            </div>
          )}

          <button onClick={() => { onDeploy(); onClose(); }}
            className="w-full py-3 bg-mk-blue text-white rounded-xl font-bold hover:bg-mk-blue/80 transition">
            Back to Garage
          </button>
        </div>
      </div>
    );
  }

  const hasMultiSelection = isMultiShot && shotLeagues.some(Boolean);
  const canDeploy = action === 'hold' || league || hasMultiSelection;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-mk-dark rounded-t-2xl sm:rounded-2xl border border-white/10 p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="font-display text-sm text-mk-blue">DEPLOY POWER-UP</h3>
          {currentWeek && (
            <span className="text-xs text-gray-400 bg-mk-darker px-2 py-1 rounded-lg">Week {currentWeek}</span>
          )}
        </div>

        {/* Power-up card */}
        <div className={`rounded-xl p-3 mb-4 flex items-center gap-3 border ${tierCfg.borderClass}`}>
          {POWER_UP_ICON_MAP[powerUp.name] && (() => { const Icon = POWER_UP_ICON_MAP[powerUp.name]; return <Icon size={32} />; })()}
          <div className="flex-1">
            <p className="font-bold text-white text-sm">{powerUp.name}</p>
            <p className={`text-xs ${tierCfg.textClass}`}>{tierCfg.name}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{puDef?.effect}</p>
          </div>
        </div>

        {/* Action toggle: use vs hold */}
        {isHoldable && (
          <div className="flex gap-2 mb-4">
            <button onClick={() => setAction('use')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${action === 'use' ? 'bg-mk-blue text-white' : 'bg-mk-darker text-gray-400'}`}>
              🎯 Use Now
            </button>
            <button onClick={() => setAction('hold')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${action === 'hold' ? 'bg-yellow-600 text-white' : 'bg-mk-darker text-gray-400'}`}>
              🛡️ Hold for Defense
            </button>
          </div>
        )}

        {action === 'use' && (
          <div className="space-y-3 mb-6">

            {/* ─── MULTI-SHOT: per-shot league selectors (triple shells) ─── */}
            {isMultiShot && isOffensive && !isAOE ? (
              <>
                <p className="text-xs text-gray-400">Assign each shot to a league — each targets your opponent in that cup</p>
                {Array.from({ length: numShots }).map((_, idx) => (
                  <div key={idx} className="bg-mk-darker/40 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 w-14">Shot {idx + 1}</span>
                      <select value={shotLeagues[idx] || ''} onChange={e => updateShotLeague(idx, e.target.value)}
                        className="flex-1 bg-mk-darker border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm focus:border-mk-blue focus:outline-none">
                        <option value="">Skip...</option>
                        {Object.entries(LEAGUES).map(([k, l]) => (
                          <option key={k} value={k}>{l.emoji} {l.name}</option>
                        ))}
                      </select>
                    </div>
                    {/* Show auto-detected opponent for this shot */}
                    {shotLeagues[idx] && (
                      <div className="ml-14">
                        {loadingShotOpponents[idx] ? (
                          <p className="text-[10px] text-gray-500">Looking up opponent...</p>
                        ) : shotOpponents[idx]?.error ? (
                          <p className="text-[10px] text-red-400">{shotOpponents[idx].error}</p>
                        ) : shotOpponents[idx] ? (
                          <div className="flex items-center gap-1.5">
                            <CharacterBadge character={shotOpponents[idx].opponentCharacter} size="xs" />
                            <span className="text-xs text-white font-bold">{shotOpponents[idx].opponentCharacter}</span>
                            <span className="text-[10px] text-red-400 ml-auto">Auto-targeted</span>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <>
                {/* ─── SINGLE-SHOT: standard league selector ─── */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Target League</label>
                  <select value={league} onChange={e => setLeague(e.target.value)}
                    className="w-full bg-mk-darker border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-mk-blue focus:outline-none">
                    <option value="">Select league...</option>
                    {Object.entries(LEAGUES).map(([k, l]) => (
                      <option key={k} value={k}>{l.emoji} {l.name}</option>
                    ))}
                  </select>
                </div>

                {/* Auto-detected opponent (for offensive, non-AOE, single-shot) */}
                {league && isOffensive && !isAOE && (
                  <div className="bg-mk-darker/60 rounded-xl p-3">
                    <p className="text-[10px] text-gray-500 uppercase mb-1.5">Your Opponent This Week</p>
                    {loadingOpponent ? (
                      <p className="text-xs text-gray-400">Looking up matchup...</p>
                    ) : opponent?.error ? (
                      <p className="text-xs text-red-400">{opponent.error}</p>
                    ) : opponent ? (
                      <div className="flex items-center gap-2">
                        <CharacterBadge character={opponent.opponentCharacter} size="sm" />
                        <div>
                          <p className="text-sm font-bold text-white">{opponent.opponentCharacter}</p>
                          <p className="text-[10px] text-gray-400">{opponent.opponentName}</p>
                        </div>
                        <span className="ml-auto text-xs text-red-400">Auto-targeted</span>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Lightning note */}
                {isAOE && league && (
                  <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-xl p-3">
                    <p className="text-xs text-yellow-300">Lightning hits ALL opponents — no specific target needed.</p>
                  </div>
                )}
              </>
            )}

            {/* Notes */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full bg-mk-darker border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-mk-blue focus:outline-none resize-none"
                rows={2} placeholder="Strategy notes, specific players, etc." />
            </div>
          </div>
        )}

        {action === 'hold' && (
          <div className="mb-6">
            <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-xl p-3">
              <p className="text-xs text-yellow-300">
                {isMultiShot
                  ? `This triple shell will be held with ${numShots} defensive charges. If an opponent fires a shell at you, one charge blocks the hit automatically.`
                  : 'This shell will be held and must be deployed before you can use any other power-up.'
                }
              </p>
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 bg-mk-darker text-gray-400 rounded-xl text-sm hover:text-white transition">Cancel</button>
          <button onClick={handleDeploy} disabled={!canDeploy || deploying || !currentWeek}
            className={`flex-1 py-2 text-white rounded-xl font-bold text-sm transition disabled:opacity-50 ${
              action === 'hold' ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-mk-blue hover:bg-mk-blue/80'
            }`}>
            {deploying ? 'Deploying...' : action === 'hold' ? '🛡️ Hold for Defense' : '🎯 Deploy!'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Activity Feed (deployments only — rolls are secret) ───
function ActivityFeed() {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getFeed().then(setFeed).catch(() => setFeed([])).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500 text-sm text-center py-4">Loading feed...</p>;

  // Show earned announcements + deployments — but never reveal WHAT was rolled
  const publicFeed = feed.filter(e => e.type === 'deploy' || e.type === 'hold' || e.type === 'earned');

  if (publicFeed.length === 0) return (
    <div className="text-center py-8">
      <span className="text-3xl block mb-2">🔇</span>
      <p className="text-gray-500 text-sm">No power-up activity yet this season</p>
      <p className="text-gray-600 text-[10px] mt-1">Earned rolls and deployments will appear here</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {publicFeed.slice(0, 30).map((entry, i) => {
        const isDeploy = entry.type === 'deploy';
        const isHold = entry.type === 'hold';
        const isEarned = entry.type === 'earned';
        const tierCfg = entry.tier ? (TIER_CONFIG[entry.tier] || TIER_CONFIG[1]) : null;
        return (
          <div key={i} className="bg-mk-darker/40 rounded-xl p-3 flex items-center gap-3">
            <span className="text-lg">{isEarned ? '🎁' : isDeploy ? '🎯' : '🛡️'}</span>
            <CharacterBadge character={entry.character} size="xs" />
            <div className="flex-1">
              <p className="text-sm text-white">
                <span className="font-bold">{entry.character}</span>
                {isEarned && (
                  <span className="text-gray-400"> earned {entry.count} power-up{entry.count > 1 ? 's' : ''} <span className="text-gray-600">🔒</span></span>
                )}
                {isDeploy && (
                  <>
                    <span className="text-gray-400"> deployed </span>
                    <span className={tierCfg?.textClass}>{entry.powerUp}</span>
                    {entry.targetCharacter && (
                      <span className="text-gray-400"> on <span className="text-red-400">{entry.targetCharacter}</span></span>
                    )}
                  </>
                )}
                {isHold && (
                  <>
                    <span className="text-gray-400"> is holding </span>
                    <span className={tierCfg?.textClass}>{entry.powerUp}</span>
                  </>
                )}
              </p>
              <p className="text-[10px] text-gray-500">
                {entry.week === 0 ? 'Pre-season' : `Week ${entry.week}`}
                {entry.targetLeague && ` • ${LEAGUES[entry.targetLeague]?.name || entry.targetLeague}`}
                {entry.shotResults && ` • Impact: ${entry.shotResults.totalImpact} pts`}
              </p>
            </div>
            <span className="text-[10px] text-gray-600">
              {entry.at ? new Date(entry.at).toLocaleDateString() : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Dashboard (post-login) ───
function Dashboard() {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deployModal, setDeployModal] = useState(null);
  const [error, setError] = useState('');
  const [apiAvailable, setApiAvailable] = useState(true);
  const [tab, setTab] = useState('garage'); // 'garage' | 'feed' | 'rules'

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const inv = await api.getInventory(user.ownerId);
      setData(inv);
      setApiAvailable(true);
    } catch (err) {
      if (err.message?.includes('API error') || err.message?.includes('Failed to fetch') || err.message?.includes('Unexpected token')) {
        setApiAvailable(false);
        setData({ inventory: [], history: [] });
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user.ownerId]);

  if (loading) return <LoadingSpinner message="Loading your power-ups..." />;

  const inventory = data?.inventory || [];
  const history = data?.history || [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <CharacterBadge character={user.character} size="md" />
          <div className="min-w-0">
            <h2 className="font-display text-sm sm:text-lg text-white truncate">{user.character}'s GARAGE</h2>
            <p className="text-[10px] sm:text-xs text-gray-400 truncate">{user.name}</p>
          </div>
        </div>
        <button onClick={logout} className="text-xs text-gray-500 hover:text-white transition px-3 py-2 border border-white/10 rounded-lg shrink-0 active:scale-95">
          Log out
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1">
        {[
          { key: 'garage', label: '🎒 Garage', labelFull: '🎒 My Garage' },
          { key: 'feed',   label: '📡 Feed',   labelFull: '📡 Race Feed' },
          { key: 'rules',  label: '📋 Rules',  labelFull: '📋 Rules' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
              tab === t.key ? 'bg-mk-blue text-white' : 'bg-mk-darker text-gray-400 hover:text-white'
            }`}>
            <span className="sm:hidden">{t.label}</span>
            <span className="hidden sm:inline">{t.labelFull}</span>
          </button>
        ))}
      </div>

      {!apiAvailable && (
        <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-500/30 rounded-xl text-sm text-yellow-200">
          <p className="font-bold mb-1">Backend Not Connected</p>
          <p className="text-yellow-300/80">The Cloudflare KV backend hasn't been deployed yet. Power-up features will be available once deployed.</p>
        </div>
      )}

      {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-xl text-sm text-red-300">{error}</div>}

      {/* ─── GARAGE TAB ─── */}
      {tab === 'garage' && (
        <>
          {/* Inventory — 3 slots */}
          <div className="mb-8">
            <h3 className="font-display text-xs text-mk-blue mb-3">INVENTORY ({inventory.length}/3)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {[0, 1, 2].map(i => {
                const item = inventory[i];
                if (!item) return (
                  <div key={i} className="border-2 border-dashed border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 flex items-center justify-center min-h-[100px] sm:min-h-[160px]">
                    <p className="text-gray-600 text-sm">Empty Slot</p>
                  </div>
                );
                const tierCfg = TIER_CONFIG[item.tier] || TIER_CONFIG[1];
                const Icon = POWER_UP_ICON_MAP[item.name];
                const puDef = POWER_UPS.find(p => p.name === item.name);
                return (
                  <div key={i} className={`border rounded-xl sm:rounded-2xl p-3 sm:p-5 ${tierCfg.borderClass} card-glow`}>
                    <div className="flex items-center gap-3 mb-2">
                      {Icon && <Icon size={32} />}
                      <div className="min-w-0">
                        <p className="font-bold text-white text-sm truncate">{item.name}</p>
                        <p className={`text-xs ${tierCfg.textClass}`}>{tierCfg.name}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-1">{puDef?.effect}</p>
                    <p className="text-[10px] text-gray-600 mb-3">Earned Week {item.week}</p>
                    <div className="flex gap-2">
                      <button onClick={() => setDeployModal({ item, index: i })}
                        className="flex-1 py-2.5 bg-mk-blue/20 text-mk-blue rounded-lg text-xs font-bold hover:bg-mk-blue/30 transition active:scale-95">
                        🎯 Deploy
                      </button>
                      {puDef?.holdable && (
                        <button onClick={() => setDeployModal({ item, index: i, defaultAction: 'hold' })}
                          className="py-2.5 px-3 bg-yellow-600/20 text-yellow-400 rounded-lg text-xs font-bold hover:bg-yellow-600/30 transition active:scale-95">
                          🛡️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* History */}
          <div>
            <h3 className="font-display text-xs text-gray-400 mb-3">YOUR HISTORY</h3>
            {history.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-4">No power-up history yet</p>
            ) : (
              <div className="space-y-2">
                {history.slice(0, 15).map((entry, i) => {
                  const tierCfg = TIER_CONFIG[entry.tier] || TIER_CONFIG[1];
                  return (
                    <div key={i} className="bg-mk-darker/40 rounded-xl p-3 flex items-center gap-3">
                      <span className="text-lg">
                        {entry.type === 'roll' ? '🎲' : entry.type === 'deployed' ? '🎯' : entry.type === 'held' ? '🛡️' : entry.type === 'discard' ? '🗑️' : '📋'}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-white">
                          <span className={tierCfg.textClass}>{entry.powerUp}</span>
                          {entry.type === 'deployed' && entry.targetCharacter && (
                            <span className="text-gray-400"> → <span className="text-red-400">{entry.targetCharacter}</span></span>
                          )}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {entry.type === 'roll' ? (entry.autoRolled ? 'Auto-rolled' : 'Rolled') : entry.type === 'deployed' ? 'Deployed' : entry.type === 'held' ? 'Held' : 'Discarded'}
                          {entry.week && ` • Week ${entry.week}`}
                          {entry.shotResults && ` • Impact: ${entry.shotResults.totalImpact} pts`}
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-600">
                        {entry.at ? new Date(entry.at).toLocaleDateString() : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── FEED TAB ─── */}
      {tab === 'feed' && (
        <div>
          <h3 className="font-display text-xs text-mk-blue mb-3">LEAGUE-WIDE ACTIVITY</h3>
          <p className="text-[10px] text-gray-500 mb-4">All power-up rolls and deployments across the Fantasy Cup</p>
          <ActivityFeed />
        </div>
      )}

      {/* ─── RULES TAB ─── */}
      {tab === 'rules' && (
        <div>
          <h3 className="font-display text-xs text-mk-blue mb-4">POWER-UP RULES</h3>
          <div className="space-y-3 mb-8">
            <div className="bg-mk-dark/80 rounded-xl border border-white/10 p-4">
              <p className="text-xs text-gray-400 font-bold mb-2">HOW IT WORKS</p>
              <div className="space-y-1.5 text-sm text-gray-300">
                <p>• Power-ups auto-roll every Tuesday after Monday Night Football scores finalize</p>
                <p>• Deploy your power-up before Thursday Night Football kickoff (8:15 PM ET)</p>
                <p>• Power-ups can only be used in the current week — no saving for later weeks</p>
                <p>• Offensive power-ups (except Lightning) automatically target your current opponent</p>
                <p>• Shells can be shot across multiple leagues — triple shells assign one shot per league</p>
                <p>• Holding a triple shell gives you defensive charges — if an opponent fires a shell at you, one charge blocks it automatically</p>
                <p>• One power-up per week — choose wisely</p>
                <p>• Shells can be "held" to free up inventory and used for defense</p>
                <p>• Must use your held item before deploying anything else</p>
                <p>• No power-ups during playoffs (Weeks 15-17)</p>
                <p>• Only one power-up can target each owner per league per week (except Lightning)</p>
              </div>
            </div>
          </div>

          <h3 className="font-display text-xs text-gray-400 mb-3">ALL POWER-UPS</h3>
          <div className="space-y-2">
            {POWER_UPS.map((pu, i) => {
              const tierCfg = TIER_CONFIG[pu.tier];
              const Icon = POWER_UP_ICON_MAP[pu.name];
              return (
                <div key={i} className={`rounded-xl p-3 border flex items-center gap-3 ${tierCfg.borderClass}`}>
                  {Icon ? <Icon size={28} /> : <span className="text-xl">{pu.icon}</span>}
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">{pu.name}</p>
                    <p className="text-[10px] text-gray-400">{pu.effect}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold ${tierCfg.textClass}`}>{tierCfg.name}</span>
                    <p className="text-[10px] text-gray-600">{pu.prob}% chance</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Deploy modal */}
      {deployModal && (
        <DeployModal
          powerUp={deployModal.item}
          powerUpIndex={deployModal.index}
          ownerId={user.ownerId}
          onClose={() => setDeployModal(null)}
          onDeploy={fetchData}
        />
      )}
    </div>
  );
}

// ─── Main Export ───
export default function MyPowerUps() {
  const { user } = useAuth();
  if (!user) return <LoginForm />;
  return <Dashboard />;
}
