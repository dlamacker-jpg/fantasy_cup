import { useState } from 'react';
import { LEAGUES, BONUS_CONFIG, CHARACTER_THEMES } from '../data/leagueConfig';
import CharacterBadge from '../components/CharacterBadge';
import LoadingSpinner from '../components/LoadingSpinner';

export default function BonusPage({ sleeper }) {
  const { data, loading } = sleeper || {};
  const [activeCup, setActiveCup] = useState('mushroom');

  if (loading || !data) return <LoadingSpinner message="Computing bonus data from Sleeper..." />;

  const cupInfo = data.cupData[activeCup];
  const cup = LEAGUES[activeCup];
  const weeklyTopScorers = cupInfo?.weeklyTopScorers || [];
  const topSpeed = cupInfo?.topSpeed;
  const maxPoints = Math.max(...weeklyTopScorers.map(w => w.points || 0), 1);

  const { topSpeeds, teamTopSpeed } = data;

  return (
    <div>
      <div className="text-center mb-8">
        <span className="text-5xl mb-3 block">🎁</span>
        <h2 className="font-display text-xl md:text-2xl text-white mb-1">BONUS & TOP SPEED</h2>
        <p className="text-gray-400 text-sm font-body">
          Weekly high scorers per cup — all computed live from Sleeper matchup data
        </p>
      </div>

      {/* Bonus Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {Object.entries(LEAGUES).map(([key, c]) => {
          const ts = topSpeeds[key];
          return (
            <div key={key} className="bg-mk-dark/80 rounded-xl border border-white/10 p-4 card-glow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase" style={{ color: c.color }}>{c.emoji} {c.name} Top Speed</span>
                <span className="text-xs text-mk-gold font-bold">+{BONUS_CONFIG.topSpeedPerLeague}</span>
              </div>
              {ts ? (
                <div className="flex items-center gap-3">
                  <CharacterBadge character={ts.character} size="sm" />
                  <div>
                    <p className="font-bold text-white text-sm">{ts.character}</p>
                    <p className="text-xs text-gray-400">{ts.points?.toFixed(2)} pts (Wk {ts.week})</p>
                  </div>
                </div>
              ) : <p className="text-gray-500 text-sm">TBD</p>}
            </div>
          );
        })}
        <div className="bg-mk-dark/80 rounded-xl border border-mk-gold/30 p-4 card-glow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-mk-gold">🏆 Team Top Speed</span>
            <span className="text-xs text-mk-gold font-bold">+{BONUS_CONFIG.teamTopSpeed}</span>
          </div>
          {teamTopSpeed ? (
            <div className="flex items-center gap-3">
              <CharacterBadge character={teamTopSpeed.character} size="sm" />
              <div>
                <p className="font-bold text-white text-sm">{teamTopSpeed.character}</p>
                <p className="text-xs text-gray-400">{teamTopSpeed.points?.toFixed(2)} pts ({LEAGUES[teamTopSpeed.cup]?.emoji} Wk {teamTopSpeed.week})</p>
              </div>
            </div>
          ) : <p className="text-gray-500 text-sm">TBD</p>}
        </div>
      </div>

      {/* Cup Tabs */}
      <div className="flex justify-center gap-2 mb-6">
        {Object.entries(LEAGUES).map(([key, c]) => (
          <button key={key} onClick={() => setActiveCup(key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeCup === key ? 'bg-white/10 text-white border border-white/20 shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            {c.emoji} {c.name}
          </button>
        ))}
      </div>

      {/* Weekly Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {weeklyTopScorers.map((week) => {
          const pct = (week.points / maxPoints) * 100;
          const isTopSpeed = topSpeed && week.week === topSpeed.week && week.rosterId === topSpeed.rosterId;
          const theme = CHARACTER_THEMES[week.character] || {};
          return (
            <div key={week.week} className={`bg-mk-dark/80 rounded-xl border ${isTopSpeed ? 'border-mk-gold ring-1 ring-mk-gold/40' : 'border-white/10'} p-5 card-glow`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-400 uppercase">Week {week.week}</span>
                {isTopSpeed && <span className="text-[10px] text-mk-gold font-bold bg-mk-gold/10 px-2 py-0.5 rounded-full">⚡ TOP SPEED</span>}
              </div>
              <div className="flex items-center gap-3 mb-2">
                <CharacterBadge character={week.character} size="sm" />
                <div>
                  <p className="font-body font-bold text-white text-sm">{week.character || 'Unknown'}</p>
                  {week.ownerName && <p className="text-xs text-gray-400">{week.ownerName}</p>}
                </div>
              </div>
              <p className="font-display text-xl" style={{ color: cup.color }}>{week.points?.toFixed(2)}</p>
              <div className="mt-3 bg-mk-darker rounded-full h-2 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: cup.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
