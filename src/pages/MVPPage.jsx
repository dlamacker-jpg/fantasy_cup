import { useState } from 'react';
import { CHARACTER_THEMES, LEAGUES, BONUS_CONFIG } from '../data/leagueConfig';
import CharacterBadge from '../components/CharacterBadge';
import LoadingSpinner from '../components/LoadingSpinner';

export default function MVPPage({ sleeper }) {
  const { data, loading } = sleeper || {};
  const [sortBy, setSortBy] = useState('wins');

  if (loading || !data) return <LoadingSpinner message="Computing MVP standings from Sleeper..." />;

  const { mvpStandings, mvpWinners } = data;
  const sorted = [...mvpStandings].sort((a, b) => {
    if (sortBy === 'wins') return b.wins - a.wins || a.losses - b.losses;
    if (sortBy === 'losses') return a.losses - b.losses || b.wins - a.wins;
    const cupKey = sortBy;
    return (b.perCup[cupKey]?.wins || 0) - (a.perCup[cupKey]?.wins || 0);
  });

  const maxWins = Math.max(...mvpStandings.map(m => m.wins), 1);
  const isMvp = (ownerId) => mvpWinners?.some(m => m.ownerId === ownerId);

  const columns = [
    { key: 'mushroom', label: '🍄 MC', color: 'text-red-400' },
    { key: 'flower', label: '🌼 FC', color: 'text-green-400' },
    { key: 'star', label: '⭐ SC', color: 'text-yellow-400' },
    { key: 'wins', label: 'Total W', color: 'text-white' },
    { key: 'losses', label: 'Total L', color: 'text-gray-400' },
  ];

  return (
    <div>
      <div className="text-center mb-8">
        <span className="text-5xl mb-3 block">🎖️</span>
        <h2 className="font-display text-xl md:text-2xl text-white mb-1">MVP STANDINGS</h2>
        <p className="text-gray-400 text-sm font-body">
          Aggregate regular season W/L across all 3 cups — Top earns +{BONUS_CONFIG.mvpBonus} bonus
        </p>
      </div>

      {/* Top 3 */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 md:mb-8">
        {sorted.slice(0, 3).map((player, i) => {
          const medals = ['🥇', '🥈', '🥉'];
          const borders = ['border-mk-gold', 'border-mk-silver', 'border-mk-bronze'];
          const mvp = isMvp(player.ownerId);
          return (
            <div key={player.ownerId} className={`bg-mk-dark/80 rounded-xl sm:rounded-2xl border-2 ${borders[i]} p-2 sm:p-4 md:p-6 text-center card-glow ${mvp ? 'ring-2 ring-purple-500/50' : ''}`}>
              <span className="text-xl sm:text-3xl">{medals[i]}</span>
              {mvp && <span className="block sm:inline sm:ml-2 text-[9px] sm:text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full font-bold mt-1 sm:mt-0">MVP</span>}
              <div className="flex justify-center mt-2 sm:mt-3">
                <CharacterBadge character={player.character} size="md" />
              </div>
              <h3 className="font-body font-bold text-[11px] sm:text-base md:text-lg mt-2 sm:mt-3 leading-tight">{player.character}</h3>
              <p className="text-[10px] sm:text-sm text-gray-400 hidden sm:block">{player.ownerName}</p>
              <div className="mt-2 sm:mt-4 flex justify-center gap-2 sm:gap-4 text-[10px] sm:text-sm">
                {Object.entries(LEAGUES).map(([key, cup]) => (
                  <div key={key}>
                    <span className="font-bold" style={{ color: cup.color }}>{player.perCup[key]?.wins || 0}</span>
                    <span className="text-gray-500">-{player.perCup[key]?.losses || 0}</span>
                    <span className="text-[9px] sm:text-xs text-gray-600 block">{cup.emoji}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 sm:mt-3 font-display text-base sm:text-2xl text-white">
                {player.wins}<span className="text-gray-500 text-xs sm:text-lg">W</span>
                <span className="text-gray-600 mx-0.5 sm:mx-1">-</span>
                {player.losses}<span className="text-gray-500 text-xs sm:text-lg">L</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile card list (below md) */}
      <div className="md:hidden space-y-2">
        {sorted.map((player, i) => (
          <div key={player.ownerId} className={`rounded-xl p-3 flex items-center gap-3 ${isMvp(player.ownerId) ? 'bg-gradient-to-r from-mk-gold/10 to-transparent border border-mk-gold/30' : 'bg-mk-dark/60 border border-white/5'}`}>
            <span className="text-gray-500 font-bold text-sm w-5 text-center shrink-0">{i + 1}</span>
            <CharacterBadge character={player.character} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-white text-sm truncate">{player.character}</p>
                {isMvp(player.ownerId) && <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 py-0.5 rounded font-bold shrink-0">MVP</span>}
              </div>
              <div className="flex gap-2 mt-0.5 text-[10px]">
                {Object.entries(LEAGUES).map(([key, cup]) => (
                  <span key={key} className="text-gray-500">{cup.emoji}{player.perCup[key]?.wins || 0}-{player.perCup[key]?.losses || 0}</span>
                ))}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display text-base text-white">{player.wins}<span className="text-gray-500 text-xs">W</span></p>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table (hidden on mobile) */}
      <div className="hidden md:block bg-mk-dark/80 backdrop-blur rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase">#</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase">Player</th>
                {columns.map(col => (
                  <th key={col.key} onClick={() => setSortBy(col.key)}
                    className={`text-center py-3 px-3 text-xs font-bold uppercase cursor-pointer hover:text-white transition ${sortBy === col.key ? 'text-mk-blue' : 'text-gray-400'}`}>
                    {col.label} {sortBy === col.key ? '▼' : ''}
                  </th>
                ))}
                <th className="text-right py-3 px-4 text-xs font-bold text-gray-400 uppercase w-28">Win %</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((player, i) => (
                <tr key={player.ownerId} className={`border-b border-white/5 hover:bg-white/5 transition ${isMvp(player.ownerId) ? 'gold-row' : ''}`}>
                  <td className="py-3 px-4 text-gray-500 font-bold">{i + 1}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <CharacterBadge character={player.character} size="sm" />
                      <div>
                        <p className="font-body font-bold text-sm text-white">{player.character}</p>
                        <p className="text-xs text-gray-400">{player.ownerName}</p>
                      </div>
                      {isMvp(player.ownerId) && <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold">MVP</span>}
                    </div>
                  </td>
                  {Object.keys(LEAGUES).map(key => (
                    <td key={key} className="py-3 px-3 text-center">
                      <span className="font-bold text-white">{player.perCup[key]?.wins || 0}</span>
                      <span className="text-gray-500">-{player.perCup[key]?.losses || 0}</span>
                    </td>
                  ))}
                  <td className="py-3 px-3 text-center font-display text-sm text-white">{player.wins}</td>
                  <td className="py-3 px-3 text-center text-gray-400">{player.losses}</td>
                  <td className="py-3 px-4 w-28">
                    <div className="bg-mk-darker rounded-full h-4 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-mk-blue to-mk-purple transition-all duration-700"
                        style={{ width: `${(player.wins / maxWins) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
