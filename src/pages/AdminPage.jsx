import { useState } from 'react';
import { OWNERS, LEAGUES, CHARACTER_THEMES, BONUS_CONFIG } from '../data/leagueConfig';
import CharacterBadge from '../components/CharacterBadge';
import AdminPowerUps from '../components/AdminPowerUps';
import { useAuth } from '../hooks/useAuth.jsx';

export default function AdminPage({ sleeper }) {
  const [activeTab, setActiveTab] = useState('overview');
  const { isAdmin, isSuperAdmin } = useAuth();
  const [savedMessage, setSavedMessage] = useState('');
  const owners = Object.entries(OWNERS).map(([id, info]) => ({ id, ...info }));
  const { data } = sleeper;

  // Gate: non-admins can't access
  if (!isAdmin) {
    return (
      <div className="text-center py-20">
        <span className="text-5xl mb-4 block">🔒</span>
        <h2 className="font-display text-xl text-white mb-2">ACCESS RESTRICTED</h2>
        <p className="text-gray-400 text-sm font-body">This page is only available to league administrators.</p>
      </div>
    );
  }

  function handleExportJSON() {
    const exportData = {
      leaderboard: data?.leaderboard,
      cupData: data ? Object.fromEntries(
        Object.entries(data.cupData).map(([k, v]) => [k, { standings: v.standings, weeklyTopScorers: v.weeklyTopScorers, topSpeed: v.topSpeed }])
      ) : null,
      mvpStandings: data?.mvpStandings,
      topSpeeds: data?.topSpeeds,
      teamTopSpeed: data?.teamTopSpeed,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fantasy-cup-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSavedMessage('Data exported!');
    setTimeout(() => setSavedMessage(''), 3000);
  }

  return (
    <div>
      <div className="text-center mb-8">
        <span className="text-5xl mb-3 block">⚙️</span>
        <h2 className="font-display text-xl md:text-2xl text-white mb-1">ADMIN PANEL</h2>
        <p className="text-gray-400 text-sm font-body">Commissioner tools — all data is live from Sleeper API</p>
      </div>

      <div className="mb-6 p-4 bg-green-900/30 border border-green-500/30 rounded-xl text-sm text-green-200">
        ✅ <strong>All data is now live.</strong> Standings, weekly scores, MVP, and Top Speed bonuses are computed automatically from Sleeper matchup data. No more spreadsheet updates needed.
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'overview', label: '📊 Data Overview' },
          { key: 'powerups', label: '🎲 Power-Up Manager' },
          { key: 'adjustments', label: '🔧 Manual Adjustments' },
          { key: 'export', label: '💾 Export' },
          { key: 'links', label: '🔗 League Links' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab.key ? 'bg-mk-blue text-white' : 'bg-mk-dark text-gray-400 hover:text-white'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {savedMessage && (
        <div className="mb-4 p-3 bg-green-900/40 border border-green-500/30 rounded-xl text-sm text-green-300 text-center">✅ {savedMessage}</div>
      )}

      {/* Data Overview */}
      {activeTab === 'overview' && data && (
        <div className="space-y-4">
          <div className="bg-mk-dark/80 rounded-2xl border border-white/10 p-6">
            <h3 className="font-body font-bold text-white mb-4">Scoring Breakdown (Per League)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Regular Season Pts</h4>
                <p className="text-gray-300">1st: 200 → 12th: 90</p>
                <p className="text-gray-500 text-xs mt-1">Based on W/L record (Wks 1-14)</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Playoff Pts</h4>
                <p className="text-gray-300">1st: 150, 2nd: 115, 3rd: 90, 4th: 75, 5th: 50, 6th: 40</p>
                <p className="text-gray-300 mt-1">7th: 45, 8th: 35, 9th: 20, 10th: 15, 11th: 5, 12th: 0</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Bonus Pts</h4>
                <p className="text-gray-300">Top Speed: +{BONUS_CONFIG.topSpeedPerLeague}/league</p>
                <p className="text-gray-300">Team Top Speed: +{BONUS_CONFIG.teamTopSpeed}</p>
                <p className="text-gray-300">MVP: +{BONUS_CONFIG.mvpBonus} (ties split)</p>
              </div>
            </div>
          </div>

          <div className="bg-mk-dark/80 rounded-2xl border border-white/10 p-6">
            <h3 className="font-body font-bold text-white mb-4">Live Bonus Awards</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(data.topSpeeds).map(([key, ts]) => (
                <div key={key} className="flex items-center gap-3 bg-mk-darker/60 rounded-xl p-3">
                  <span className="text-xl">{LEAGUES[key].emoji}</span>
                  <div>
                    <p className="text-xs text-gray-400">{LEAGUES[key].name} Top Speed (+{BONUS_CONFIG.topSpeedPerLeague})</p>
                    <p className="font-bold text-white text-sm">{ts?.character || 'TBD'} — {ts?.points?.toFixed(2) || '—'} pts</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-3 bg-mk-darker/60 rounded-xl p-3 border border-mk-gold/20">
                <span className="text-xl">🏆</span>
                <div>
                  <p className="text-xs text-mk-gold">Team Top Speed (+{BONUS_CONFIG.teamTopSpeed})</p>
                  <p className="font-bold text-white text-sm">{data.teamTopSpeed?.character || 'TBD'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-mk-darker/60 rounded-xl p-3 border border-purple-500/20">
                <span className="text-xl">🏅</span>
                <div>
                  <p className="text-xs text-purple-400">Regular Season MVP (+{BONUS_CONFIG.mvpBonus})</p>
                  <p className="font-bold text-white text-sm">{data.mvpWinners?.map(m => m.character).join(' & ') || 'TBD'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Power-Up Manager */}
      {activeTab === 'powerups' && (
        <div>
          {/* Already gated by isAdmin above — all users here are admins */}
          <AdminPowerUps />
        </div>
      )}

      {/* Manual Adjustments */}
      {activeTab === 'adjustments' && (
        <div className="bg-mk-dark/80 rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="font-body font-bold text-white">Power-Up & Manual Adjustments</h3>
            <p className="text-xs text-gray-400 mt-1">For power-up effects, penalties, or corrections that don't come from Sleeper.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase">Team</th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-gray-400 uppercase">🍄 Adj</th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-gray-400 uppercase">🌼 Adj</th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-gray-400 uppercase">⭐ Adj</th>
                  <th className="text-left py-3 px-3 text-xs font-bold text-gray-400 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((owner) => (
                  <tr key={owner.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <CharacterBadge character={owner.character} size="xs" />
                        <div>
                          <p className="font-bold text-sm text-white">{owner.character}</p>
                          <p className="text-xs text-gray-400">{owner.name}</p>
                        </div>
                      </div>
                    </td>
                    {['mc', 'fc', 'sc'].map(k => (
                      <td key={k} className="py-3 px-3 text-center">
                        <input type="number" className="w-16 bg-mk-darker border border-white/10 rounded-lg px-2 py-1 text-center text-sm text-white focus:border-mk-blue focus:outline-none" placeholder="0" />
                      </td>
                    ))}
                    <td className="py-3 px-3">
                      <input type="text" className="w-full bg-mk-darker border border-white/10 rounded-lg px-2 py-1 text-sm text-gray-300 focus:border-mk-blue focus:outline-none" placeholder="Power-up used, penalty, etc." />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export */}
      {activeTab === 'export' && (
        <div className="bg-mk-dark/80 rounded-2xl border border-white/10 p-6 text-center">
          <h3 className="font-body font-bold text-white mb-2">Export League Data</h3>
          <p className="text-sm text-gray-400 mb-6">Download current standings, playoff results, and all bonus data as JSON</p>
          <div className="flex justify-center gap-3">
            <button onClick={handleExportJSON} className="px-6 py-3 bg-mk-blue text-white rounded-xl font-bold hover:bg-mk-blue/80 transition-all shadow-lg shadow-mk-blue/20">
              💾 Export JSON
            </button>
            <button onClick={sleeper.refresh} className="px-6 py-3 bg-mk-accent text-white rounded-xl font-bold hover:bg-mk-accent/80 transition-all">
              🔄 Refresh from Sleeper
            </button>
          </div>
        </div>
      )}

      {/* League Links */}
      {activeTab === 'links' && (
        <div className="bg-mk-dark/80 rounded-2xl border border-white/10 p-6">
          <h3 className="font-body font-bold text-white mb-4">Sleeper League Links</h3>
          <div className="space-y-3">
            {Object.entries(LEAGUES).map(([key, cup]) => (
              <a key={key} href={`https://sleeper.com/leagues/${cup.id}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-mk-darker/60 rounded-xl border border-white/5 hover:border-white/20 transition-all group">
                <span className="text-2xl">{cup.emoji}</span>
                <div>
                  <p className="font-body font-bold text-white group-hover:text-mk-blue transition">{cup.name}</p>
                  <p className="text-xs text-gray-400">{cup.type} • ID: {cup.id}</p>
                </div>
                <span className="ml-auto text-gray-500 group-hover:text-white transition">→</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
