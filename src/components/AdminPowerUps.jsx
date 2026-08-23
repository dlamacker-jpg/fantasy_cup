import { useState, useEffect, useCallback } from 'react';
import { api } from '../hooks/useApi';
import { LEAGUES, OWNERS, TIER_CONFIG, POWER_UPS } from '../data/leagueConfig';
import CharacterBadge from '../components/CharacterBadge';
import { POWER_UP_ICON_MAP } from '../components/PowerUpIcons';
import { useAuth } from '../hooks/useAuth';

const criteriaLabels = {
  marginOfVictory: { label: 'Margin of Victory', emoji: '💥' },
  topPlayerScorer: { label: 'Top Player Scorer', emoji: '🌟' },
  bestRosterAccuracy: { label: 'Best Roster Accuracy', emoji: '🎯' },
  worstOptimalScore: { label: 'Consolation (Worst Optimal)', emoji: '😅' },
};

// ─── Tab 1: Weekly Eligibility + Auto-Roll Trigger ───
function EligibilityTab() {
  const [week, setWeek] = useState(1);
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRolling, setAutoRolling] = useState(false);
  const [autoRollResult, setAutoRollResult] = useState(null);
  const [error, setError] = useState('');

  const fetchEligibility = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getEligibility(week);
      setEligibility(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoRoll = async () => {
    setAutoRolling(true);
    setAutoRollResult(null);
    setError('');
    try {
      const result = await api.triggerAutoRoll(week);
      setAutoRollResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setAutoRolling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Week selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-sm text-gray-400">Week:</label>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeek(Math.max(1, week - 1))}
            className="w-8 h-8 rounded-lg bg-mk-darker text-white hover:bg-mk-dark transition">←</button>
          <span className="font-display text-lg text-white w-8 text-center">{week}</span>
          <button onClick={() => setWeek(Math.min(17, week + 1))}
            className="w-8 h-8 rounded-lg bg-mk-darker text-white hover:bg-mk-dark transition">→</button>
        </div>
        <button onClick={fetchEligibility} disabled={loading}
          className="px-4 py-2 bg-mk-blue text-white rounded-xl text-sm font-bold hover:bg-mk-blue/80 transition disabled:opacity-50">
          {loading ? 'Detecting...' : 'Detect Eligibility'}
        </button>
        <button onClick={handleAutoRoll} disabled={autoRolling || !eligibility}
          className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-500 transition disabled:opacity-50">
          {autoRolling ? '🎲 Rolling All...' : '🎲 Auto-Roll All'}
        </button>
      </div>

      <p className="text-[10px] text-gray-500">
        Auto-roll runs automatically every Tuesday. Use the button above for manual catch-up or re-runs (idempotent — won't double-roll).
      </p>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Auto-roll result */}
      {autoRollResult && (
        <div className="bg-gradient-to-r from-purple-900/40 to-mk-dark/80 border border-purple-500/40 rounded-2xl p-6">
          {autoRollResult.alreadyRan ? (
            <p className="text-yellow-400 text-sm text-center">Auto-roll already completed for Week {week}. No duplicates.</p>
          ) : (
            <>
              <p className="text-xs text-purple-400 uppercase tracking-widest mb-3 text-center">Auto-Roll Results — Week {week}</p>
              <div className="space-y-3">
                {autoRollResult.results?.map((r, i) => (
                  <div key={i} className="bg-mk-darker/40 rounded-xl p-3 flex items-center gap-3">
                    <CharacterBadge character={r.character} size="sm" />
                    <div className="flex-1">
                      <p className="font-bold text-white text-sm">{r.character} <span className="text-gray-400 font-normal">({r.ownerName})</span></p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {r.rolled.map((p, j) => {
                          if (p.skipped) return <span key={j} className="text-[10px] text-gray-600">Skipped: {p.reason}</span>;
                          const tierCfg = TIER_CONFIG[p.tier] || TIER_CONFIG[1];
                          return (
                            <span key={j} className={`text-xs px-2 py-0.5 rounded border ${tierCfg.borderClass} ${tierCfg.textClass}`}>
                              {p.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{r.rollsEarned} earned</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Per-league breakdown */}
      {eligibility && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {Object.entries(LEAGUES).map(([cupKey, cup]) => {
              const cupData = eligibility.perCup?.[cupKey];
              if (!cupData || cupData.noData) return (
                <div key={cupKey} className="bg-mk-dark/80 rounded-xl border border-white/10 p-4">
                  <p className="text-sm text-gray-400">{cup.emoji} {cup.name}</p>
                  <p className="text-xs text-gray-600 mt-2">No data for Week {week}</p>
                </div>
              );
              return (
                <div key={cupKey} className="bg-mk-dark/80 rounded-xl border border-white/10 p-4">
                  <p className="text-sm font-bold text-white mb-3">{cup.emoji} {cup.name}</p>
                  {Object.entries(criteriaLabels).map(([key, meta]) => {
                    const winner = cupData[key];
                    return (
                      <div key={key} className="flex items-center gap-2 mb-2">
                        <span className="text-sm">{meta.emoji}</span>
                        <div className="flex-1">
                          <p className="text-[10px] text-gray-500">{meta.label}</p>
                          {winner ? (
                            <div className="flex items-center gap-1.5">
                              <CharacterBadge character={winner.character} size="xs" />
                              <span className="text-xs text-white font-bold">{winner.character}</span>
                              <span className="text-[10px] text-gray-400">
                                {winner.margin && `(${winner.margin} pts)`}
                                {winner.points && `(${winner.points} pts)`}
                                {winner.accuracy && `(${winner.accuracy}%)`}
                                {winner.optimal && !winner.accuracy && `(${winner.optimal} opt)`}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-600">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Eligible owners summary */}
          <div className="bg-mk-dark/80 rounded-2xl border border-white/10 p-6">
            <h4 className="font-display text-xs text-mk-blue mb-4">ELIGIBLE FOR ROLLS — WEEK {week}</h4>
            {eligibility.eligible?.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No eligible owners detected for this week</p>
            )}
            <div className="space-y-3">
              {(eligibility.eligible || []).map(owner => (
                <div key={owner.ownerId} className="flex items-center gap-4 bg-mk-darker/40 rounded-xl p-4">
                  <CharacterBadge character={owner.character} size="sm" />
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">{owner.character} <span className="text-gray-400 font-normal">({owner.ownerName})</span></p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {owner.reasons.map((r, i) => (
                        <span key={i} className="inline-block bg-mk-darker rounded px-1.5 py-0.5 mr-1 mb-0.5">{r}</span>
                      ))}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 font-bold">{owner.rollsEarned} roll{owner.rollsEarned > 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab 2: All Inventories ───
function InventoriesTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAllInventories().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-400 text-sm text-center py-8">Loading inventories...</p>;
  if (!data) return <p className="text-gray-500 text-sm text-center py-8">Failed to load</p>;

  const owners = Object.values(data).sort((a, b) => b.inventory.length - a.inventory.length);

  return (
    <div className="space-y-3">
      {owners.map(owner => (
        <div key={owner.ownerId} className="bg-mk-dark/80 rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <CharacterBadge character={owner.character} size="sm" />
            <div>
              <p className="font-bold text-white text-sm">{owner.character}</p>
              <p className="text-xs text-gray-400">{owner.name}</p>
            </div>
            <span className="ml-auto text-xs text-gray-500">{owner.inventory.length}/3 slots</span>
          </div>
          {owner.inventory.length === 0 ? (
            <p className="text-xs text-gray-600 ml-10">No items</p>
          ) : (
            <div className="flex gap-2 ml-10 flex-wrap">
              {owner.inventory.map((item, i) => {
                const tierCfg = TIER_CONFIG[item.tier] || TIER_CONFIG[1];
                return (
                  <div key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs ${
                    tierCfg.textClass
                  } border-white/10 bg-mk-darker/40`}>
                    <span>🔒 {tierCfg.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Tab 3: Weekly Power-Up Summary (grouped by team) ───
function FeedTab() {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(1);

  useEffect(() => {
    setLoading(true);
    // Fetch all feed events (unfiltered) so we can group by week + team
    api.getFeed()
      .then(data => setFeed(data || []))
      .catch(() => setFeed([]))
      .finally(() => setLoading(false));
  }, []);

  // Find the latest week with any activity
  useEffect(() => {
    if (feed.length > 0) {
      const maxWeek = Math.max(...feed.map(e => e.week || 0));
      if (maxWeek > 0) setSelectedWeek(maxWeek);
    }
  }, [feed]);

  // Group feed by team (character) for the selected week
  const weekFeed = feed.filter(e => e.week === selectedWeek);
  const allWeeks = [...new Set(feed.map(e => e.week).filter(Boolean))].sort((a, b) => a - b);

  const byTeam = {};
  for (const entry of weekFeed) {
    const key = entry.ownerId || entry.character || 'Unknown';
    if (!byTeam[key]) {
      byTeam[key] = { character: entry.character, ownerId: entry.ownerId, earned: [], spent: [] };
    }
    if (entry.type === 'auto_roll' || entry.type === 'roll') {
      byTeam[key].earned.push(entry);
    } else if (entry.type === 'deploy' || entry.type === 'hold' || entry.type === 'used') {
      byTeam[key].spent.push(entry);
    }
  }

  const teams = Object.values(byTeam).sort((a, b) => {
    // Sort by most activity
    return (b.earned.length + b.spent.length) - (a.earned.length + a.spent.length);
  });

  // Summary stats
  const totalEarned = teams.reduce((s, t) => s + t.earned.length, 0);
  const totalSpent = teams.reduce((s, t) => s + t.spent.length, 0);

  if (loading) return <p className="text-gray-400 text-sm text-center py-8">Loading feed...</p>;

  return (
    <div className="space-y-6">
      {/* Week selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-sm text-gray-400">Week:</label>
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedWeek(w => Math.max(1, w - 1))}
            className="w-8 h-8 rounded-lg bg-mk-darker text-white hover:bg-mk-dark transition">←</button>
          <span className="font-display text-lg text-white w-8 text-center">{selectedWeek}</span>
          <button onClick={() => setSelectedWeek(w => Math.min(17, w + 1))}
            className="w-8 h-8 rounded-lg bg-mk-darker text-white hover:bg-mk-dark transition">→</button>
        </div>
        {allWeeks.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {allWeeks.map(w => (
              <button key={w} onClick={() => setSelectedWeek(w)}
                className={`w-7 h-7 rounded text-xs font-bold transition ${
                  w === selectedWeek ? 'bg-mk-blue text-white' : 'bg-mk-darker text-gray-500 hover:text-white'
                }`}>
                {w}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Week summary banner */}
      <div className="bg-gradient-to-r from-mk-dark to-mk-darker rounded-xl border border-white/10 p-4 flex items-center justify-between">
        <div>
          <h4 className="font-display text-xs text-mk-blue tracking-widest">WEEK {selectedWeek} SUMMARY</h4>
          <p className="text-xs text-gray-500 mt-1">{teams.length} team{teams.length !== 1 ? 's' : ''} with activity</p>
        </div>
        <div className="flex gap-6">
          <div className="text-center">
            <p className="font-display text-lg text-green-400">{totalEarned}</p>
            <p className="text-[10px] text-gray-500 uppercase">Earned</p>
          </div>
          <div className="text-center">
            <p className="font-display text-lg text-orange-400">{totalSpent}</p>
            <p className="text-[10px] text-gray-500 uppercase">Spent</p>
          </div>
        </div>
      </div>

      {/* Teams */}
      {teams.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">No power-up activity for Week {selectedWeek}</p>
      ) : (
        <div className="space-y-3">
          {teams.map(team => (
            <div key={team.ownerId || team.character} className="bg-mk-dark/80 rounded-xl border border-white/10 overflow-hidden">
              {/* Team header */}
              <div className="flex items-center gap-3 p-4 border-b border-white/5">
                <CharacterBadge character={team.character} size="sm" />
                <div className="flex-1">
                  <p className="font-bold text-white text-sm">{team.character}</p>
                  <p className="text-[10px] text-gray-500">{OWNERS[team.ownerId]?.name || ''}</p>
                </div>
                <div className="flex gap-4">
                  {team.earned.length > 0 && (
                    <span className="text-xs text-green-400 font-bold">+{team.earned.length} earned</span>
                  )}
                  {team.spent.length > 0 && (
                    <span className="text-xs text-orange-400 font-bold">{team.spent.length} spent</span>
                  )}
                </div>
              </div>

              {/* Earned section */}
              {team.earned.length > 0 && (
                <div className="px-4 py-2.5 border-b border-white/5">
                  <p className="text-[10px] text-green-500 uppercase tracking-wider mb-1.5">Earned</p>
                  <div className="flex gap-2 flex-wrap">
                    {team.earned.map((e, i) => {
                      const tierCfg = TIER_CONFIG[e.tier] || TIER_CONFIG[1];
                      return (
                        <div key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${tierCfg.borderClass} ${tierCfg.textClass}`}>
                          <span>{e.powerUp}</span>
                          <span className="text-[9px] opacity-60">T{e.tier}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Spent/deployed section */}
              {team.spent.length > 0 && (
                <div className="px-4 py-2.5">
                  <p className="text-[10px] text-orange-500 uppercase tracking-wider mb-1.5">Deployed</p>
                  <div className="space-y-1.5">
                    {team.spent.map((e, i) => {
                      const tierCfg = TIER_CONFIG[e.tier] || TIER_CONFIG[1];
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span>{e.type === 'deploy' ? '🎯' : e.type === 'hold' ? '🛡️' : '✅'}</span>
                          <span className={`font-bold ${tierCfg.textClass}`}>{e.powerUp}</span>
                          {e.targetCharacter && (
                            <span className="text-gray-400">
                              on <span className="text-red-400 font-bold">{e.targetCharacter}</span>
                            </span>
                          )}
                          {e.targetLeague && (
                            <span className="text-gray-600">({LEAGUES[e.targetLeague]?.name || e.targetLeague})</span>
                          )}
                          {e.shotResults && (
                            <span className={`font-bold ${e.shotResults.totalImpact < 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {e.shotResults.totalImpact > 0 ? '+' : ''}{e.shotResults.totalImpact} pts
                            </span>
                          )}
                          {e.notes && <span className="text-gray-500 italic">"{e.notes}"</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab 4: Power-Up Config Editor (super_admin only for destructive edits) ───
const TYPES = ['self-boost', 'offensive', 'defensive', 'offensive-aoe', 'special'];

function ConfigTab() {
  const { user, isSuperAdmin } = useAuth();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingIdx, setEditingIdx] = useState(null);

  // Load config from API
  useEffect(() => {
    fetch('/api/powerup-config')
      .then(r => r.json())
      .then(data => setConfig(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totalProb = config?.powerUps?.reduce((s, p) => s + (p.prob || 0), 0) || 0;

  const updatePowerUp = useCallback((idx, field, value) => {
    setConfig(prev => {
      const updated = { ...prev, powerUps: [...prev.powerUps] };
      updated.powerUps[idx] = { ...updated.powerUps[idx], [field]: value };
      return updated;
    });
  }, []);

  const addPowerUp = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      powerUps: [...prev.powerUps, {
        id: `pu_new_${Date.now()}`,
        name: 'New Power-Up',
        tier: 1,
        prob: 0,
        effect: 'Describe effect here',
        type: 'self-boost',
        holdable: false,
      }],
    }));
    setEditingIdx(config.powerUps.length);
  }, [config]);

  const removePowerUp = useCallback((idx) => {
    setConfig(prev => ({
      ...prev,
      powerUps: prev.powerUps.filter((_, i) => i !== idx),
    }));
    setEditingIdx(null);
  }, []);

  const updateRule = useCallback((field, value) => {
    setConfig(prev => ({
      ...prev,
      rules: { ...prev.rules, [field]: value },
    }));
  }, []);

  const saveConfig = async () => {
    setError('');
    setSuccess('');

    if (totalProb !== 100) {
      setError(`Probabilities must sum to 100 (currently ${totalProb})`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/powerup-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Owner-Id': user?.ownerId || '',
        },
        body: JSON.stringify({
          powerUps: config.powerUps,
          rules: config.rules,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setConfig(data);
      setSuccess('Configuration saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-400 text-sm text-center py-8">Loading config...</p>;
  if (!config) return <p className="text-red-400 text-sm text-center py-8">Failed to load configuration</p>;

  return (
    <div className="space-y-6">
      {/* Probability bar */}
      <div className="bg-mk-dark/80 rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-gray-400 uppercase">Probability Distribution</h4>
          <span className={`text-sm font-bold ${totalProb === 100 ? 'text-green-400' : 'text-red-400'}`}>
            {totalProb}/100%
          </span>
        </div>
        <div className="h-4 bg-mk-darker rounded-full overflow-hidden flex">
          {config.powerUps.map((pu, i) => {
            const tierCfg = TIER_CONFIG[pu.tier] || TIER_CONFIG[1];
            const colors = { gray: '#6b7280', green: '#22c55e', blue: '#3b82f6', purple: '#a855f7', yellow: '#eab308' };
            return pu.prob > 0 ? (
              <div key={i} title={`${pu.name}: ${pu.prob}%`}
                style={{ width: `${pu.prob}%`, backgroundColor: colors[tierCfg.color] || '#6b7280' }}
                className="h-full transition-all duration-300 hover:brightness-125 cursor-pointer"
                onClick={() => setEditingIdx(i)}
              />
            ) : null;
          })}
        </div>
        <div className="flex gap-3 mt-2 flex-wrap">
          {[1, 2, 3, 4, 5].map(tier => {
            const tierCfg = TIER_CONFIG[tier];
            const tierProb = config.powerUps.filter(p => p.tier === tier).reduce((s, p) => s + p.prob, 0);
            return (
              <span key={tier} className={`text-[10px] ${tierCfg.textClass}`}>
                T{tier} {tierCfg.name}: {tierProb}%
              </span>
            );
          })}
        </div>
      </div>

      {/* Power-up list */}
      <div className="space-y-2">
        {config.powerUps.map((pu, idx) => {
          const tierCfg = TIER_CONFIG[pu.tier] || TIER_CONFIG[1];
          const isEditing = editingIdx === idx;

          return (
            <div key={pu.id || idx}
              className={`bg-mk-dark/80 rounded-xl border transition-all ${
                isEditing ? 'border-mk-blue/50 shadow-lg shadow-mk-blue/10' : 'border-white/10'
              }`}
            >
              {/* Header row — always visible */}
              <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setEditingIdx(isEditing ? null : idx)}>
                <span className={`text-xs px-2 py-0.5 rounded border ${tierCfg.borderClass} ${tierCfg.textClass} font-bold`}>
                  T{pu.tier}
                </span>
                <span className="text-sm font-bold text-white flex-1">{pu.name}</span>
                <span className="text-xs text-gray-400">{pu.prob}%</span>
                <span className="text-xs text-gray-500">{pu.type}</span>
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${isEditing ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Edit panel */}
              {isEditing && (
                <div className="border-t border-white/10 p-4 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase block mb-1">Name</label>
                      <input type="text" value={pu.name}
                        onChange={e => updatePowerUp(idx, 'name', e.target.value)}
                        className="w-full bg-mk-darker border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:border-mk-blue focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase block mb-1">Tier (1-5)</label>
                      <select value={pu.tier} onChange={e => updatePowerUp(idx, 'tier', parseInt(e.target.value))}
                        className="w-full bg-mk-darker border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:border-mk-blue focus:outline-none">
                        {[1, 2, 3, 4, 5].map(t => <option key={t} value={t}>T{t} — {TIER_CONFIG[t].name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase block mb-1">Probability %</label>
                      <input type="number" min="0" max="100" value={pu.prob}
                        onChange={e => updatePowerUp(idx, 'prob', parseInt(e.target.value) || 0)}
                        className="w-full bg-mk-darker border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:border-mk-blue focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase block mb-1">Type</label>
                      <select value={pu.type} onChange={e => updatePowerUp(idx, 'type', e.target.value)}
                        className="w-full bg-mk-darker border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:border-mk-blue focus:outline-none">
                        {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 uppercase block mb-1">Effect Description</label>
                    <textarea value={pu.effect}
                      onChange={e => updatePowerUp(idx, 'effect', e.target.value)}
                      rows={2}
                      className="w-full bg-mk-darker border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:border-mk-blue focus:outline-none resize-none" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input type="checkbox" checked={pu.holdable || false}
                        onChange={e => updatePowerUp(idx, 'holdable', e.target.checked)}
                        className="accent-mk-blue" />
                      Holdable
                    </label>
                    {(pu.type === 'offensive' || pu.type === 'offensive-aoe') && (
                      <>
                        <div>
                          <label className="text-[10px] text-gray-500 uppercase block mb-1">Hit Chance</label>
                          <input type="number" step="0.1" min="0" max="1" value={pu.hitChance ?? ''}
                            onChange={e => updatePowerUp(idx, 'hitChance', parseFloat(e.target.value) || 0)}
                            className="w-full bg-mk-darker border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:border-mk-blue focus:outline-none"
                            placeholder="0-1" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 uppercase block mb-1">Shots</label>
                          <input type="number" min="1" max="10" value={pu.shots ?? ''}
                            onChange={e => updatePowerUp(idx, 'shots', parseInt(e.target.value) || undefined)}
                            className="w-full bg-mk-darker border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:border-mk-blue focus:outline-none"
                            placeholder="1" />
                        </div>
                      </>
                    )}
                  </div>

                  {isSuperAdmin && (
                    <button onClick={() => removePowerUp(idx)}
                      className="text-xs text-red-400 hover:text-red-300 transition mt-2">
                      Remove this power-up
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add new + Save */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={addPowerUp}
          className="px-4 py-2 bg-mk-darker border border-dashed border-white/20 rounded-xl text-sm text-gray-400 hover:text-white hover:border-white/40 transition">
          + Add Power-Up
        </button>
        <button onClick={saveConfig} disabled={saving || totalProb !== 100}
          className="px-6 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-500 transition disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {success && <p className="text-green-400 text-sm">{success}</p>}

      {/* League rules */}
      <div className="bg-mk-dark/80 rounded-xl border border-white/10 p-4">
        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">League Rules</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] text-gray-500 uppercase block mb-1">Max Inventory Slots</label>
            <input type="number" min="1" max="10" value={config.rules?.maxInventorySlots ?? 3}
              onChange={e => updateRule('maxInventorySlots', parseInt(e.target.value) || 3)}
              className="w-full bg-mk-darker border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:border-mk-blue focus:outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase block mb-1">Max Rolls/Week</label>
            <input type="number" min="1" max="10" value={config.rules?.maxRollsPerWeek ?? 3}
              onChange={e => updateRule('maxRollsPerWeek', parseInt(e.target.value) || 3)}
              className="w-full bg-mk-darker border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:border-mk-blue focus:outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase block mb-1">Max Deploys/Week</label>
            <input type="number" min="1" max="5" value={config.rules?.maxDeploysPerWeek ?? 1}
              onChange={e => updateRule('maxDeploysPerWeek', parseInt(e.target.value) || 1)}
              className="w-full bg-mk-darker border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:border-mk-blue focus:outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase block mb-1">Playoff Weeks Start</label>
            <input type="number" min="1" max="18" value={config.rules?.playoffWeeksStart ?? 15}
              onChange={e => updateRule('playoffWeeksStart', parseInt(e.target.value) || 15)}
              className="w-full bg-mk-darker border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:border-mk-blue focus:outline-none" />
          </div>
        </div>
      </div>

      {config.updatedAt && (
        <p className="text-[10px] text-gray-600 text-right">
          Last updated: {new Date(config.updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

// ─── Tab 5: Resolution Control ───
function ResolveTab() {
  const { user } = useAuth();
  const [week, setWeek] = useState(null);
  const [status, setStatus] = useState(null);
  const [pending, setPending] = useState([]);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Auto-detect current week on mount
  useEffect(() => {
    (async () => {
      try {
        const nfl = await api.getCurrentWeek();
        setWeek(nfl.week);
      } catch (err) {
        setError('Could not detect NFL week');
        setLoading(false);
      }
    })();
  }, []);

  // Fetch status + pending whenever week changes
  useEffect(() => {
    if (!week) return;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [statusData, pendingData] = await Promise.all([
          api.getResolutionStatus(week),
          api.getPendingDeploys(week),
        ]);
        setStatus(statusData);
        setPending(pendingData || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [week]);

  const handleResolve = async () => {
    if (!user?.ownerId || !week) return;
    setResolving(true);
    setError('');
    try {
      const result = await api.triggerResolve(user.ownerId, week);
      setStatus(result);
      setPending([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setResolving(false);
    }
  };

  const tierColor = (tier) => {
    const colors = { 1: 'text-gray-400', 2: 'text-green-400', 3: 'text-blue-400', 4: 'text-purple-400', 5: 'text-yellow-400' };
    return colors[tier] || 'text-white';
  };

  return (
    <div className="space-y-6">
      {/* Week selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-sm text-gray-400">Week:</label>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeek(Math.max(1, (week || 1) - 1))}
            className="w-8 h-8 rounded-lg bg-mk-darker text-white hover:bg-mk-dark transition">←</button>
          <span className="font-display text-lg text-white w-8 text-center">{week || '?'}</span>
          <button onClick={() => setWeek(Math.min(17, (week || 1) + 1))}
            className="w-8 h-8 rounded-lg bg-mk-darker text-white hover:bg-mk-dark transition">→</button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {loading && <p className="text-gray-500 text-sm animate-pulse">Loading resolution status...</p>}

      {/* Status card */}
      {status && !loading && (
        <div className={`rounded-2xl border p-6 ${
          status.resolved
            ? 'bg-gradient-to-r from-green-900/30 to-mk-dark/80 border-green-500/40'
            : status.pastKickoff
              ? 'bg-gradient-to-r from-yellow-900/30 to-mk-dark/80 border-yellow-500/40'
              : 'bg-gradient-to-r from-mk-dark/80 to-mk-darker/80 border-white/10'
        }`}>
          {status.resolved || status.alreadyResolved ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-display text-lg text-green-400">Week {week} Resolved</p>
                  <p className="text-xs text-gray-400">
                    {status.resolvedAt && `Resolved ${new Date(status.resolvedAt).toLocaleString()}`}
                    {status.resolvedBy && ` by ${status.resolvedBy === 'cron-trigger' ? 'Auto-Trigger (Cron)' : status.resolvedBy === 'auto-trigger' ? 'Auto-Trigger (Lazy)' : OWNERS[status.resolvedBy]?.character || status.resolvedBy}`}
                    {status.autoTriggered && ' (auto-triggered)'}
                  </p>
                </div>
              </div>

              {/* Resolution order */}
              {(status.order || []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 uppercase tracking-widest">Resolution Order</p>
                  {status.order.map((r, i) => (
                    <div key={i} className="bg-mk-darker/60 rounded-xl p-3 flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-6 text-right font-mono">#{r.order}</span>
                      <CharacterBadge character={r.character} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{r.character}</span>
                          <span className={`text-xs ${tierColor(r.tier)}`}>{r.powerUp}</span>
                        </div>
                        {/* Effects */}
                        {r.effects?.map((e, j) => (
                          <p key={j} className="text-[10px] text-gray-400 mt-0.5">
                            {e.type === 'star-active' && '⭐ ' + e.message}
                            {e.type === 'boost' && '🍄 ' + e.message}
                            {e.type === 'held' && '🛡️ ' + e.message}
                            {e.type === 'special' && '🪄 ' + e.message}
                            {e.type === 'lightning' && `⚡ Hit ${e.hits?.filter(h => !h.immune).length} players, ${e.hits?.filter(h => h.immune).length} immune`}
                            {e.type === 'shots' && e.shotResults?.map((s, k) => (
                              <span key={k} className="block">
                                Shot {s.shot} → {s.targetCharacter || '?'}
                                {s.immune ? ' (Star immune)' : s.blocked ? ` (blocked by ${s.blockedBy})` : s.hit ? ` HIT ${s.impact} pts` : ' MISS'}
                                {' '}in {LEAGUES[s.league]?.name || s.league}
                              </span>
                            ))}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Point adjustments */}
              {status.pointAdjustments && Object.keys(status.pointAdjustments).length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Point Adjustments</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(status.pointAdjustments).map(([oid, leagues]) => (
                      <div key={oid} className="bg-mk-darker/40 rounded-lg p-2 flex items-center gap-2">
                        <CharacterBadge character={OWNERS[oid]?.character} size="xs" />
                        <span className="text-xs text-white font-bold">{OWNERS[oid]?.character || oid}</span>
                        <div className="flex gap-1.5 ml-auto">
                          {Object.entries(leagues).map(([lk, pts]) => (
                            <span key={lk} className={`text-[10px] px-1.5 py-0.5 rounded ${pts > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {LEAGUES[lk]?.emoji || lk} {pts > 0 ? '+' : ''}{pts}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{status.pastKickoff ? '⏰' : '📋'}</span>
                <div>
                  <p className="font-display text-lg text-white">
                    Week {week} — {status.pastKickoff ? 'Past Kickoff' : 'Pre-Kickoff'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {status.pendingCount || 0} pending deployment{(status.pendingCount || 0) !== 1 ? 's' : ''}
                    {status.kickoffTime && ` · Kickoff: ${new Date(status.kickoffTime).toLocaleString()}`}
                  </p>
                </div>
              </div>

              {/* Pending deployments list */}
              {pending.length > 0 && (
                <div className="space-y-2 mb-4">
                  <p className="text-xs text-gray-500 uppercase tracking-widest">Queued Deployments</p>
                  {pending.map((dep, i) => (
                    <div key={i} className="bg-mk-darker/40 rounded-xl p-3 flex items-center gap-3">
                      <CharacterBadge character={dep.character} size="sm" />
                      <div className="flex-1">
                        <span className="font-bold text-white text-sm">{dep.character}</span>
                        <span className={`text-xs ml-2 ${tierColor(dep.tier)}`}>{dep.powerUp}</span>
                        {dep.targetLeague && <span className="text-[10px] text-gray-500 ml-2">→ {LEAGUES[dep.targetLeague]?.name}</span>}
                        {dep.targetLeagues?.length > 0 && <span className="text-[10px] text-gray-500 ml-2">→ {dep.targetLeagues.map(l => LEAGUES[l]?.emoji).join(' ')}</span>}
                      </div>
                      <span className="text-[10px] text-gray-600">{new Date(dep.submittedAt).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Resolve button */}
              <button
                onClick={handleResolve}
                disabled={resolving || pending.length === 0}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500"
              >
                {resolving ? '🎲 Resolving...' : `🎲 Resolve Week ${week} (${pending.length} deployments)`}
              </button>
              <p className="text-[10px] text-gray-600 mt-2 text-center">
                Resolution shuffles deployment order randomly then processes sequentially.
                {!status.pastKickoff && ' Auto-triggers at Thursday kickoff (8:15 PM ET).'}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab 6: Commissioner Overrides ───
const PHASE_META = {
  preseason:  { label: 'Preseason',  icon: '🏁', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30', desc: 'Pre-Week 1. Seed starter items, then advance to Week 1.' },
  lock:       { label: 'Lock',       icon: '🔒', color: 'text-red-400',    bg: 'bg-red-500/20 border-red-500/30',    desc: 'Scores finalizing. No deploys.' },
  assignment: { label: 'Assignment', icon: '🎲', color: 'text-blue-400',   bg: 'bg-blue-500/20 border-blue-500/30',   desc: 'Auto-roll runs. Commissioner can grant overrides.' },
  deployment: { label: 'Deployment', icon: '🚀', color: 'text-green-400',  bg: 'bg-green-500/20 border-green-500/30',  desc: 'Racers deploy power-ups before kickoff.' },
  resolution: { label: 'Resolution', icon: '🎯', color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/30', desc: 'Deployments resolve in random order.' },
  complete:   { label: 'Complete',   icon: '✅', color: 'text-gray-400',   bg: 'bg-gray-500/20 border-gray-500/30',   desc: 'Week finalized.' },
};
const PHASE_ORDER = ['preseason', 'lock', 'assignment', 'deployment', 'resolution', 'complete'];

// Filter out departed owners for commissioner actions
const DEPARTED_IDS = new Set(['704557122054057984', '968217113603219456']);
const activeOwnerEntries = Object.entries(OWNERS).filter(([id]) => !DEPARTED_IDS.has(id));

function CommissionerTab() {
  const { user } = useAuth();
  const [week, setWeek] = useState(null);
  const [phase, setPhase] = useState(null);
  const [allInventories, setAllInventories] = useState(null);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Grant form state
  const [grantTarget, setGrantTarget] = useState('');
  const [grantPowerUp, setGrantPowerUp] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [granting, setGranting] = useState(false);

  // Revoke state
  const [revokeTarget, setRevokeTarget] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  // Seed + reset state
  const [seedStatus, setSeedStatus] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Section toggle
  const [activeSection, setActiveSection] = useState('phase');

  // Load current week + phase + inventories + log + seed status
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const nfl = await api.getCurrentWeek();
        const w = nfl.week;
        setWeek(w);
        const [phaseData, invData, logData, seedData] = await Promise.all([
          api.getWeekPhase(w),
          api.getAllInventories(),
          api.getCommissionerLog(),
          api.getSeedStatus(),
        ]);
        setPhase(phaseData);
        setAllInventories(invData);
        setLog(logData || []);
        setSeedStatus(seedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refreshInventories = async () => {
    try {
      const invData = await api.getAllInventories();
      setAllInventories(invData);
    } catch {}
  };

  const refreshLog = async () => {
    try {
      const logData = await api.getCommissionerLog();
      setLog(logData || []);
    } catch {}
  };

  const handleSeed = async (force = false) => {
    setSeeding(true);
    setError('');
    setSeedResult(null);
    try {
      const result = await api.seedAll(force);
      setSeedResult(result);
      setSeedStatus({ seeded: true, data: result.results || result.data });
      if (result.alreadySeeded) {
        setSuccess('Already seeded! Use Re-Seed to override.');
      } else {
        setSuccess('Starter items distributed to all racers!');
      }
      setTimeout(() => setSuccess(''), 4000);
      refreshInventories();
    } catch (err) {
      setError(err.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setError('');
    try {
      await api.clearAllPowerUps();
      setSeedStatus({ seeded: false, data: null });
      setSeedResult(null);
      setConfirmReset(false);
      setSuccess('All power-up data cleared. Ready to seed fresh.');
      setTimeout(() => setSuccess(''), 4000);
      refreshInventories();
      refreshLog();
    } catch (err) {
      setError(err.message);
    } finally {
      setResetting(false);
    }
  };

  const handleSetPhase = async (newPhase) => {
    if (!user?.ownerId || !week) return;
    setError('');
    try {
      const result = await api.setWeekPhase(user.ownerId, week, newPhase);
      setPhase(result);
      setSuccess(`Week ${week} set to ${PHASE_META[newPhase].label}`);
      setTimeout(() => setSuccess(''), 3000);
      refreshLog();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGrant = async () => {
    if (!grantTarget || !grantPowerUp || !user?.ownerId) return;
    setGranting(true);
    setError('');
    try {
      await api.grantPowerUp(user.ownerId, grantTarget, grantPowerUp, {
        week, reason: grantReason,
      });
      setSuccess(`Granted ${grantPowerUp} to ${OWNERS[grantTarget]?.character}`);
      setGrantPowerUp('');
      setGrantReason('');
      setTimeout(() => setSuccess(''), 3000);
      refreshInventories();
      refreshLog();
    } catch (err) {
      setError(err.message);
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (ownerId, index, itemName) => {
    if (!user?.ownerId) return;
    setRevoking(true);
    setError('');
    try {
      await api.revokePowerUp(user.ownerId, ownerId, index, revokeReason);
      setSuccess(`Revoked ${itemName} from ${OWNERS[ownerId]?.character}`);
      setRevokeReason('');
      setTimeout(() => setSuccess(''), 3000);
      refreshInventories();
      refreshLog();
    } catch (err) {
      setError(err.message);
    } finally {
      setRevoking(false);
    }
  };

  if (loading) return <p className="text-gray-400 text-sm text-center py-8 animate-pulse">Loading commissioner panel...</p>;

  const currentPhase = phase?.phase || 'assignment';
  const currentPhaseIdx = PHASE_ORDER.indexOf(currentPhase);

  return (
    <div className="space-y-6">
      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
      {success && <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2">{success}</p>}

      {/* Section nav */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'phase', label: '🏁 Week Phase' },
          { key: 'grant', label: '🎁 Grant Power-Up' },
          { key: 'revoke', label: '🗑 Revoke' },
          { key: 'log', label: '📋 Action Log' },
        ].map(s => (
          <button key={s.key} onClick={() => setActiveSection(s.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSection === s.key ? 'bg-mk-blue text-white' : 'bg-mk-darker/60 text-gray-500 hover:text-white'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ─── Phase Dashboard ─── */}
      {activeSection === 'phase' && (
        <div className="space-y-4">
          <div className="bg-mk-dark/80 rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-display text-sm text-white tracking-widest">WEEK {week} PHASE</h4>
              {phase?.updatedByCharacter && (
                <span className="text-[10px] text-gray-600">
                  Set by {phase.updatedByCharacter} {phase.updatedAt ? new Date(phase.updatedAt).toLocaleString() : ''}
                </span>
              )}
            </div>

            {/* Phase progress bar */}
            <div className="flex items-center gap-1 mb-6">
              {PHASE_ORDER.map((p, i) => {
                const meta = PHASE_META[p];
                const isActive = p === currentPhase;
                const isPast = i < currentPhaseIdx;
                return (
                  <div key={p} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className={`w-full h-2 rounded-full transition-all ${
                      isActive ? 'bg-mk-blue shadow-lg shadow-mk-blue/30' :
                      isPast ? 'bg-green-500/60' : 'bg-mk-darker'
                    }`} />
                    <span className={`text-[10px] font-bold ${isActive ? meta.color : isPast ? 'text-green-500/60' : 'text-gray-600'}`}>
                      {meta.icon} {meta.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Current phase details */}
            <div className={`rounded-xl border p-4 ${PHASE_META[currentPhase].bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{PHASE_META[currentPhase].icon}</span>
                <span className={`font-display text-sm ${PHASE_META[currentPhase].color}`}>
                  {PHASE_META[currentPhase].label.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-gray-400">{PHASE_META[currentPhase].desc}</p>
            </div>

            {/* Phase control buttons */}
            <div className="flex gap-2 mt-4 flex-wrap">
              {PHASE_ORDER.map(p => {
                const meta = PHASE_META[p];
                const isActive = p === currentPhase;
                return (
                  <button key={p} onClick={() => handleSetPhase(p)} disabled={isActive}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isActive ? 'bg-mk-blue/30 text-mk-blue cursor-default' : 'bg-mk-darker text-gray-500 hover:text-white hover:bg-mk-dark'
                    }`}>
                    {meta.icon} {meta.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-600 mt-2">
              Phase is informational and helps coordinate the weekly flow. Auto-roll and resolution still trigger on their own schedules.
            </p>
          </div>

          {/* Preseason Seed Card */}
          <div className="bg-mk-dark/80 rounded-2xl border border-white/10 p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🎰</span>
              <h4 className="font-display text-sm text-white tracking-widest">STARTER ITEMS</h4>
              {seedStatus?.seeded && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 font-bold">SEEDED</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Everyone starts with 1 random power-up. Hit Seed to auto-distribute starter items to all racers.
            </p>

            <div className="flex gap-2 flex-wrap items-center">
              <button onClick={() => handleSeed(false)} disabled={seeding}
                className="px-4 py-2 bg-yellow-600 text-white rounded-xl text-xs font-bold hover:bg-yellow-500 transition disabled:opacity-50">
                {seeding ? 'Seeding...' : seedStatus?.seeded ? 'Already Seeded' : 'Seed Starter Items'}
              </button>
              {seedStatus?.seeded && (
                <button onClick={() => handleSeed(true)} disabled={seeding}
                  className="px-4 py-2 bg-mk-darker border border-white/10 text-gray-400 rounded-xl text-xs font-bold hover:text-white transition disabled:opacity-50">
                  Re-Seed (Force)
                </button>
              )}

              {/* Reset / Nuke */}
              {!confirmReset ? (
                <button onClick={() => setConfirmReset(true)}
                  className="px-3 py-2 text-red-500/60 text-[10px] font-bold hover:text-red-400 transition ml-auto">
                  Reset All Power-Ups
                </button>
              ) : (
                <div className="flex items-center gap-2 ml-auto bg-red-900/20 border border-red-500/30 rounded-xl px-3 py-2">
                  <span className="text-[10px] text-red-400">Wipe ALL inventories, history, and feed?</span>
                  <button onClick={handleReset} disabled={resetting}
                    className="px-3 py-1 bg-red-600 text-white rounded-lg text-[10px] font-bold hover:bg-red-500 transition disabled:opacity-50">
                    {resetting ? 'Clearing...' : 'Yes, Reset'}
                  </button>
                  <button onClick={() => setConfirmReset(false)}
                    className="px-2 py-1 text-gray-500 text-[10px] hover:text-white transition">
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Seed results */}
            {seedResult && !seedResult.alreadySeeded && seedResult.results && (
              <div className="mt-4 space-y-1.5">
                <p className="text-[10px] text-green-500 uppercase tracking-widest">Distributed</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {seedResult.results.map((r, i) => {
                    const tierCfg = TIER_CONFIG[r.tier] || TIER_CONFIG[1];
                    return (
                      <div key={i} className="flex items-center gap-2 bg-mk-darker/40 rounded-lg p-2">
                        <CharacterBadge character={r.character} size="xs" />
                        <span className="text-xs text-white font-bold flex-1">{r.character}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${tierCfg.borderClass} ${tierCfg.textClass}`}>
                          {r.rolled}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Grant Power-Up ─── */}
      {activeSection === 'grant' && (
        <div className="bg-mk-dark/80 rounded-2xl border border-white/10 p-6 space-y-5">
          <div>
            <h4 className="font-display text-sm text-white tracking-widest mb-1">GRANT POWER-UP</h4>
            <p className="text-[10px] text-gray-500">Override the auto-roll and manually assign a specific power-up to any racer.</p>
          </div>

          {/* Pick racer */}
          <div>
            <label className="text-[10px] text-gray-400 uppercase block mb-2">Select Racer</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {activeOwnerEntries.map(([id, owner]) => {
                const inv = allInventories?.[id]?.inventory || [];
                const isFull = inv.length >= 3;
                const isSelected = grantTarget === id;
                return (
                  <button key={id} onClick={() => !isFull && setGrantTarget(id)} disabled={isFull}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                      isSelected ? 'bg-mk-blue/20 border-mk-blue/50 border ring-1 ring-mk-blue/30' :
                      isFull ? 'bg-mk-darker/40 border border-white/5 opacity-40 cursor-not-allowed' :
                      'bg-mk-darker/60 border border-white/5 hover:border-mk-blue/30'
                    }`}>
                    <CharacterBadge character={owner.character} size="xs" />
                    <span className="text-[10px] text-gray-400 truncate w-full text-center">{owner.character}</span>
                    <span className={`text-[9px] ${isFull ? 'text-red-400' : 'text-gray-600'}`}>{inv.length}/3</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pick power-up */}
          {grantTarget && (
            <div>
              <label className="text-[10px] text-gray-400 uppercase block mb-2">Select Power-Up</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {POWER_UPS.map(pu => {
                  const tierCfg = TIER_CONFIG[pu.tier] || TIER_CONFIG[1];
                  const isSelected = grantPowerUp === pu.name;
                  return (
                    <button key={pu.name} onClick={() => setGrantPowerUp(pu.name)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all ${
                        isSelected ? 'bg-mk-blue/20 border-mk-blue/50 border' : 'bg-mk-darker/60 border border-white/5 hover:border-white/20'
                      }`}>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${tierCfg.borderClass} ${tierCfg.textClass}`}>
                        T{pu.tier}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-bold truncate">{pu.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{pu.effect}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reason + submit */}
          {grantTarget && grantPowerUp && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-400 uppercase block mb-1">Reason (optional)</label>
                <input type="text" value={grantReason} onChange={e => setGrantReason(e.target.value)}
                  placeholder="e.g. Week 3 eligibility correction, bonus award..."
                  className="w-full bg-mk-darker border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-mk-blue focus:outline-none" />
              </div>

              <div className="flex items-center gap-3 p-3 bg-yellow-900/20 border border-yellow-500/20 rounded-xl">
                <span className="text-lg">🎁</span>
                <div className="flex-1 text-xs">
                  <p className="text-white">
                    Grant <strong className="text-mk-blue">{grantPowerUp}</strong> to{' '}
                    <strong className="text-mk-blue">{OWNERS[grantTarget]?.character}</strong>
                  </p>
                  <p className="text-gray-500 mt-0.5">This bypasses the auto-roll system and is logged.</p>
                </div>
                <button onClick={handleGrant} disabled={granting}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-500 transition disabled:opacity-50 whitespace-nowrap">
                  {granting ? 'Granting...' : 'Confirm Grant'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Revoke Power-Up ─── */}
      {activeSection === 'revoke' && (
        <div className="space-y-3">
          <div className="mb-2">
            <h4 className="font-display text-sm text-white tracking-widest mb-1">REVOKE POWER-UP</h4>
            <p className="text-[10px] text-gray-500">Remove a power-up from any racer's inventory. This is logged and visible in the action history.</p>
          </div>

          {/* Reason input */}
          <div>
            <label className="text-[10px] text-gray-400 uppercase block mb-1">Revoke Reason (optional, applies to next revoke)</label>
            <input type="text" value={revokeReason} onChange={e => setRevokeReason(e.target.value)}
              placeholder="e.g. Duplicate roll correction, rule violation..."
              className="w-full bg-mk-darker border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-mk-blue focus:outline-none" />
          </div>

          {/* All inventories with revoke buttons */}
          {allInventories && activeOwnerEntries
            .filter(([id]) => (allInventories[id]?.inventory || []).length > 0)
            .map(([id, owner]) => {
              const inv = allInventories[id]?.inventory || [];
              return (
                <div key={id} className="bg-mk-dark/80 rounded-xl border border-white/10 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <CharacterBadge character={owner.character} size="sm" />
                    <div>
                      <p className="font-bold text-white text-sm">{owner.character}</p>
                      <p className="text-xs text-gray-400">{owner.name}</p>
                    </div>
                    <span className="ml-auto text-xs text-gray-500">{inv.length}/3</span>
                  </div>
                  <div className="space-y-2 ml-10">
                    {inv.map((item, idx) => {
                      const tierCfg = TIER_CONFIG[item.tier] || TIER_CONFIG[1];
                      return (
                        <div key={idx} className="flex items-center gap-2 bg-mk-darker/40 rounded-lg p-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${tierCfg.borderClass} ${tierCfg.textClass}`}>
                            T{item.tier}
                          </span>
                          <span className="text-xs text-white font-bold flex-1">{item.name}</span>
                          <span className="text-[10px] text-gray-600">Wk {item.week || '?'}</span>
                          <button
                            onClick={() => handleRevoke(id, idx, item.name)}
                            disabled={revoking}
                            className="px-2 py-1 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-600/40 transition disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

          {allInventories && activeOwnerEntries.every(([id]) => (allInventories[id]?.inventory || []).length === 0) && (
            <p className="text-gray-500 text-sm text-center py-8">All inventories are empty. Nothing to revoke.</p>
          )}
        </div>
      )}

      {/* ─── Commissioner Action Log ─── */}
      {activeSection === 'log' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="font-display text-sm text-white tracking-widest mb-1">ACTION LOG</h4>
              <p className="text-[10px] text-gray-500">All commissioner overrides are logged here for transparency.</p>
            </div>
            <button onClick={refreshLog} className="text-xs text-gray-500 hover:text-white transition">Refresh</button>
          </div>

          {log.length === 0 ? (
            <div className="text-center py-12 bg-mk-dark/80 rounded-2xl border border-white/10">
              <span className="text-4xl block mb-3">📋</span>
              <p className="text-gray-500 text-sm">No commissioner actions yet.</p>
              <p className="text-gray-600 text-xs mt-1">Grants, revokes, and phase changes will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {log.slice(0, 50).map((entry, i) => (
                <div key={i} className="bg-mk-dark/80 rounded-xl border border-white/10 p-3 flex items-start gap-3">
                  <span className="text-sm mt-0.5">
                    {entry.action === 'grant' ? '🎁' : entry.action === 'revoke' ? '🗑' : entry.action === 'setPhase' ? '🏁' : '📝'}
                  </span>
                  <div className="flex-1 min-w-0">
                    {entry.action === 'grant' && (
                      <p className="text-xs text-white">
                        <span className="text-gray-400">{entry.byCharacter}</span> granted{' '}
                        <span className={`font-bold ${(TIER_CONFIG[entry.tier] || TIER_CONFIG[1]).textClass}`}>{entry.powerUp}</span> to{' '}
                        <span className="font-bold text-white">{entry.targetCharacter}</span>
                      </p>
                    )}
                    {entry.action === 'revoke' && (
                      <p className="text-xs text-white">
                        <span className="text-gray-400">{entry.byCharacter}</span> revoked{' '}
                        <span className={`font-bold ${(TIER_CONFIG[entry.tier] || TIER_CONFIG[1]).textClass}`}>{entry.powerUp}</span> from{' '}
                        <span className="font-bold text-white">{entry.targetCharacter}</span>
                      </p>
                    )}
                    {entry.action === 'setPhase' && (
                      <p className="text-xs text-white">
                        <span className="text-gray-400">{entry.byCharacter}</span> set Week {entry.week} to{' '}
                        <span className="font-bold text-mk-blue">{PHASE_META[entry.phase]?.label || entry.phase}</span>
                      </p>
                    )}
                    {entry.reason && <p className="text-[10px] text-gray-500 mt-0.5 italic">"{entry.reason}"</p>}
                    <p className="text-[10px] text-gray-600 mt-0.5">{entry.at ? new Date(entry.at).toLocaleString() : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Admin Power-Ups Component ───
export default function AdminPowerUps() {
  const [tab, setTab] = useState('commissioner');

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'commissioner', label: '👑 Commissioner' },
          { key: 'eligibility', label: '🎯 Eligibility & Auto-Roll' },
          { key: 'inventories', label: '🎒 All Inventories' },
          { key: 'resolve', label: '🎲 Resolution' },
          { key: 'feed', label: '📡 Activity Feed' },
          { key: 'config', label: '⚙️ Config Editor' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === t.key ? 'bg-purple-600 text-white' : 'bg-mk-darker text-gray-400 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'commissioner' && <CommissionerTab />}
      {tab === 'eligibility' && <EligibilityTab />}
      {tab === 'inventories' && <InventoriesTab />}
      {tab === 'resolve' && <ResolveTab />}
      {tab === 'feed' && <FeedTab />}
      {tab === 'config' && <ConfigTab />}
    </div>
  );
}
