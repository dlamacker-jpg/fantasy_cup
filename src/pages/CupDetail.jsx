import { useParams } from 'react-router-dom';
import { LEAGUES } from '../data/leagueConfig';
import LoadingSpinner from '../components/LoadingSpinner';
import CharacterBadge, { CharacterInline } from '../components/CharacterBadge';
import PlaceBadge from '../components/PlaceBadge';

export default function CupDetail({ sleeper }) {
  const { cupKey } = useParams();
  const cup = LEAGUES[cupKey];
  const cupInfo = sleeper.data?.cupData?.[cupKey];

  if (!cup) return <div className="text-center py-20 text-gray-400">Cup not found.</div>;
  if (sleeper.loading || !cupInfo) return <LoadingSpinner message={`Loading ${cup.name}...`} />;

  const { standings, weeklyTopScorers, topSpeed, playoffWeekStart } = cupInfo;
  const topScorer = [...standings].sort((a, b) => b.fpts - a.fpts)[0];

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <span className="text-5xl mb-3 block">{cup.emoji}</span>
        <h2 className="font-display text-xl md:text-2xl text-white mb-1">{cup.name.toUpperCase()}</h2>
        <p className="text-gray-400 text-sm font-body">{cup.type} Format • 12 Teams • Playoffs Week {playoffWeekStart}+</p>
        <a href={`https://sleeper.com/leagues/${cup.id}`} target="_blank" rel="noopener noreferrer"
          className="inline-block mt-3 px-4 py-1.5 text-xs bg-mk-accent/50 text-mk-blue border border-mk-blue/30 rounded-full hover:bg-mk-accent transition-all font-semibold">
          View on Sleeper →
        </a>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-6 md:mb-8">
        {[
          { label: 'Reg Season Leader', value: standings[0]?.character, sub: `${standings[0]?.wins}W-${standings[0]?.losses}L` },
          { label: 'Playoff Champion', value: standings.find(t => t.playoffPlace === 1)?.character || '—', sub: '1st Place' },
          { label: 'Top Scorer', value: topScorer?.character, sub: `${topScorer?.fpts?.toFixed(1)} pts` },
          { label: 'Top Speed', value: topSpeed?.character || '—', sub: topSpeed ? `${topSpeed.points?.toFixed(2)} pts` : '—' },
        ].map((stat, i) => (
          <div key={i} className="bg-mk-dark/80 rounded-xl border border-white/10 p-3 sm:p-4 text-center card-glow">
            <p className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase leading-tight">{stat.label}</p>
            <p className="font-body font-bold text-sm sm:text-base text-white mt-1 truncate">{stat.value}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Full Standings */}
      <div className="mb-6 md:mb-8">
        <div className="bg-mk-dark/80 backdrop-blur rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-3 sm:p-4 border-b border-white/10">
            <h3 className="font-body font-bold text-white text-sm">Season Standings</h3>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden divide-y divide-white/5">
            {standings.map((team, i) => {
              const borderLeft = i === 0 ? 'border-l-4 border-l-mk-gold' : i === 1 ? 'border-l-4 border-l-mk-silver' : i === 2 ? 'border-l-4 border-l-mk-bronze' : '';
              return (
                <div key={team.ownerId} className={`p-3 ${borderLeft}`}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <PlaceBadge place={team.regRank} size="sm" />
                    <CharacterBadge character={team.character} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm truncate">{team.character}</p>
                      <p className="text-[11px] text-gray-500">{team.wins}W-{team.losses}L &bull; {team.fpts?.toFixed(1)} PF</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display text-base text-white">{team.cupPoints}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 ml-[72px] text-[10px]">
                    <span className="text-gray-400">Reg: <span className="text-white font-bold">{team.regPoints}</span></span>
                    {team.playoffPlace && (
                      <span className="text-gray-400">Playoff #{team.playoffPlace}: <span className="text-mk-blue font-bold">+{team.playoffPoints}</span></span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase">Reg #</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase">Team</th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-gray-400 uppercase">W</th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-gray-400 uppercase">L</th>
                  <th className="text-right py-3 px-3 text-xs font-bold text-gray-400 uppercase">PF</th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-gray-400 uppercase">Reg Pts</th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-gray-400 uppercase">Playoff</th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-gray-400 uppercase">Play Pts</th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-gray-400 uppercase">Cup Total</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((team, i) => {
                  const rowClass = i === 0 ? 'gold-row' : i === 1 ? 'silver-row' : i === 2 ? 'bronze-row' : '';
                  return (
                    <tr key={team.ownerId} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${rowClass}`}>
                      <td className="py-3 px-4"><PlaceBadge place={team.regRank} size="sm" /></td>
                      <td className="py-3 px-4"><CharacterInline character={team.character} ownerName={team.ownerName} /></td>
                      <td className="py-3 px-3 text-center font-bold text-green-400">{team.wins}</td>
                      <td className="py-3 px-3 text-center font-bold text-red-400">{team.losses}</td>
                      <td className="py-3 px-3 text-right text-white font-semibold">{team.fpts?.toFixed(1)}</td>
                      <td className="py-3 px-3 text-center"><span className="bg-mk-accent/40 px-2 py-0.5 rounded text-sm font-bold text-white">{team.regPoints}</span></td>
                      <td className="py-3 px-3 text-center">
                        {team.playoffPlace ? <PlaceBadge place={team.playoffPlace} size="sm" /> : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {team.playoffPoints > 0 ? (
                          <span className="bg-mk-blue/20 text-mk-blue px-2 py-0.5 rounded text-sm font-bold">+{team.playoffPoints}</span>
                        ) : (
                          <span className="text-gray-600 text-xs">{team.playoffPoints}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right"><span className="font-display text-sm text-white">{team.cupPoints}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Weekly Top Scorers */}
      <div className="bg-mk-dark/80 rounded-2xl border border-white/10 p-4 sm:p-6">
        <h3 className="font-body font-bold text-sm text-gray-300 uppercase mb-3 sm:mb-4">🏎️ Weekly Top Scorers</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {weeklyTopScorers.map((w) => {
            const isTopSpeed = topSpeed && w.week === topSpeed.week && w.rosterId === topSpeed.rosterId;
            return (
              <div key={w.week} className={`bg-mk-darker/60 rounded-xl p-3 text-center ${isTopSpeed ? 'ring-2 ring-mk-gold' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-gray-500">WK {w.week}</span>
                  {isTopSpeed && <span className="text-[10px] text-mk-gold font-bold">⚡ TOP SPEED</span>}
                </div>
                <p className="font-body font-bold text-xs text-white truncate">{w.character || 'Unknown'}</p>
                <p className="font-display text-sm mt-0.5" style={{ color: cup.color }}>{w.points?.toFixed(2)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Win Distribution */}
      <div className="mt-8 bg-mk-dark/80 rounded-2xl border border-white/10 p-6">
        <h3 className="font-body font-bold text-sm text-gray-300 uppercase mb-4">Win Distribution</h3>
        <div className="space-y-2">
          {standings.map((team) => {
            const pct = (team.wins / (team.wins + team.losses)) * 100;
            return (
              <div key={team.ownerId} className="flex items-center gap-2 sm:gap-3">
                <span className="w-20 sm:w-28 text-[11px] sm:text-xs text-gray-400 text-right truncate shrink-0">{team.character}</span>
                <div className="flex-1 bg-mk-darker rounded-full h-5 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000 ease-out flex items-center px-2"
                    style={{ width: `${Math.max(pct, 8)}%`, background: `linear-gradient(90deg, ${cup.color}cc, ${cup.color}66)` }}>
                    <span className="text-[10px] font-bold text-white whitespace-nowrap">{team.wins}-{team.losses}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
