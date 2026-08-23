import { useState } from 'react';
import { useAllTimeStats } from '../hooks/useAllTimeStats';
import { useSeason } from '../hooks/SeasonContext';
import { LEAGUE_META, OWNERS } from '../data/leagueConfig';
import CharacterBadge from '../components/CharacterBadge';
import LoadingSpinner from '../components/LoadingSpinner';

const cupEmoji = (cup) => LEAGUE_META[cup]?.emoji || '';
const cupName = (cup) => LEAGUE_META[cup]?.name || cup;

function RecordCard({ icon, title, children, accent = 'border-white/10' }) {
  return (
    <div className={`bg-mk-dark/80 backdrop-blur rounded-2xl border ${accent} p-4 sm:p-5`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <h3 className="font-display text-xs sm:text-sm text-white uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function StatLine({ label, value, sub, character }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      {character && <CharacterBadge character={character} size="xs" />}
      <div className="flex-1 min-w-0">
        <p className="text-gray-400 text-xs">{label}</p>
        <p className="text-white font-bold text-sm">{value}</p>
      </div>
      {sub && <p className="text-gray-500 text-[10px] text-right shrink-0">{sub}</p>}
    </div>
  );
}

function TopScoresTable({ scores, title, icon, accent }) {
  return (
    <RecordCard icon={icon} title={title} accent={accent}>
      <div className="space-y-0">
        {scores.map((s, i) => (
          <div key={i} className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
            <span className={`text-xs font-bold w-5 text-center ${i < 3 ? 'text-mk-gold' : 'text-gray-500'}`}>{i + 1}</span>
            <CharacterBadge character={s.character} size="xs" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{s.character}</p>
              <p className="text-gray-500 text-[10px]">{s.season} {cupEmoji(s.cup)} Wk {s.week}</p>
            </div>
            <span className="text-white font-bold text-sm">{s.points.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </RecordCard>
  );
}

function CareerTable({ leaders }) {
  return (
    <RecordCard icon="📊" title="Career Leaderboard">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-gray-400 text-xs py-2 font-bold">#</th>
              <th className="text-left text-gray-400 text-xs py-2 font-bold">Owner</th>
              <th className="text-center text-gray-400 text-xs py-2 font-bold">W</th>
              <th className="text-center text-gray-400 text-xs py-2 font-bold">L</th>
              <th className="text-center text-gray-400 text-xs py-2 font-bold">Win%</th>
              <th className="text-right text-gray-400 text-xs py-2 font-bold">Total PF</th>
              <th className="text-right text-gray-400 text-xs py-2 font-bold">Avg PF</th>
            </tr>
          </thead>
          <tbody>
            {leaders.map((l, i) => (
              <tr key={l.ownerId} className="border-b border-white/5 hover:bg-white/5 transition">
                <td className="py-2 text-gray-500 font-bold">{i + 1}</td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <CharacterBadge character={l.character} size="xs" />
                    <div>
                      <span className="text-white font-semibold">{l.character}</span>
                      <span className="text-gray-500 text-[10px] ml-1.5 hidden lg:inline">{l.ownerName}</span>
                    </div>
                  </div>
                </td>
                <td className="py-2 text-center text-green-400 font-bold">{l.totalWins}</td>
                <td className="py-2 text-center text-red-400 font-bold">{l.totalLosses}</td>
                <td className="py-2 text-center text-white font-bold">{(l.winPct * 100).toFixed(1)}%</td>
                <td className="py-2 text-right text-gray-300">{l.totalFpts.toFixed(1)}</td>
                <td className="py-2 text-right text-gray-300">{l.avgFpts.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {leaders.map((l, i) => (
          <div key={l.ownerId} className="flex items-center gap-3 p-2 rounded-lg bg-mk-darker/40">
            <span className={`text-xs font-bold w-5 text-center ${i < 3 ? 'text-mk-gold' : 'text-gray-500'}`}>{i + 1}</span>
            <CharacterBadge character={l.character} size="xs" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{l.character}</p>
              <p className="text-gray-500 text-[10px]">{l.ownerName}</p>
            </div>
            <div className="text-right">
              <p className="text-white font-bold text-sm">{l.totalWins}-{l.totalLosses}</p>
              <p className="text-gray-400 text-[10px]">{(l.winPct * 100).toFixed(1)}%</p>
            </div>
          </div>
        ))}
      </div>
    </RecordCard>
  );
}

// ─── Tab Button ───
function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap active:scale-95 ${
        active ? 'bg-white/10 text-white border border-white/20 shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}

export default function RecordBook({ sleeper }) {
  const [tab, setTab] = useState('fame');
  const allTime = useAllTimeStats();

  if (allTime.loading) return <LoadingSpinner message="Loading all-time records..." />;
  if (allTime.error) return (
    <div className="text-center py-20 text-red-400">
      Error loading records: {allTime.error}
      <button onClick={allTime.refresh} className="ml-3 underline hover:text-white">Retry</button>
    </div>
  );

  const { records, careerLeaders } = allTime.data;

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <span className="text-5xl mb-3 block">📜</span>
        <h2 className="font-display text-xl md:text-2xl text-white mb-1">ALL-TIME RECORD BOOK</h2>
        <p className="text-gray-400 text-sm font-body">The best, the worst, and everything in between</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 justify-start sm:justify-center">
        <TabButton active={tab === 'fame'} onClick={() => setTab('fame')}>🏆 Hall of Fame</TabButton>
        <TabButton active={tab === 'shame'} onClick={() => setTab('shame')}>🍌 Hall of Shame</TabButton>
        <TabButton active={tab === 'records'} onClick={() => setTab('records')}>📊 Career Stats</TabButton>
      </div>

      {/* ─── Hall of Fame ─── */}
      {tab === 'fame' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Highest Weekly Score */}
            <RecordCard icon="🚀" title="Highest Weekly Score" accent="border-mk-gold/30">
              {records.highestScore && (
                <StatLine
                  character={records.highestScore.character}
                  label={`${records.highestScore.season} ${cupEmoji(records.highestScore.cup)} Week ${records.highestScore.week}`}
                  value={`${records.highestScore.points.toFixed(2)} pts`}
                  sub={records.highestScore.ownerName}
                />
              )}
            </RecordCard>

            {/* Biggest Blowout */}
            <RecordCard icon="💥" title="Biggest Blowout" accent="border-red-500/30">
              {records.biggestBlowout && (
                <StatLine
                  character={records.biggestBlowout.winner}
                  label={`${records.biggestBlowout.winner} vs ${records.biggestBlowout.loser}`}
                  value={`${records.biggestBlowout.winScore.toFixed(2)} - ${records.biggestBlowout.loseScore.toFixed(2)} (${records.biggestBlowout.margin.toFixed(2)} margin)`}
                  sub={`${records.biggestBlowout.season} ${cupEmoji(records.biggestBlowout.cup)} Wk ${records.biggestBlowout.week}`}
                />
              )}
            </RecordCard>

            {/* Closest Game */}
            <RecordCard icon="🎯" title="Closest Game" accent="border-blue-500/30">
              {records.closestGame && (
                <StatLine
                  character={records.closestGame.winner}
                  label={`${records.closestGame.winner} vs ${records.closestGame.loser}`}
                  value={`${records.closestGame.winScore.toFixed(2)} - ${records.closestGame.loseScore.toFixed(2)} (${records.closestGame.margin.toFixed(2)} margin)`}
                  sub={`${records.closestGame.season} ${cupEmoji(records.closestGame.cup)} Wk ${records.closestGame.week}`}
                />
              )}
            </RecordCard>

            {/* Highest Combined Score */}
            <RecordCard icon="🔥" title="Highest Combined Score" accent="border-orange-500/30">
              {records.highestCombined && (
                <StatLine
                  character={records.highestCombined.teamA}
                  label={`${records.highestCombined.teamA} vs ${records.highestCombined.teamB}`}
                  value={`${records.highestCombined.total.toFixed(2)} combined (${records.highestCombined.scoreA.toFixed(2)} - ${records.highestCombined.scoreB.toFixed(2)})`}
                  sub={`${records.highestCombined.season} ${cupEmoji(records.highestCombined.cup)} Wk ${records.highestCombined.week}`}
                />
              )}
            </RecordCard>
          </div>

          {/* Top 10 Scores */}
          <TopScoresTable scores={records.top10Scores || []} title="Top 10 Weekly Scores" icon="🥇" accent="border-mk-gold/20" />
        </div>
      )}

      {/* ─── Hall of Shame ─── */}
      {tab === 'shame' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Lowest Weekly Score */}
            <RecordCard icon="📉" title="Lowest Weekly Score" accent="border-gray-500/30">
              {records.lowestScore && (
                <StatLine
                  character={records.lowestScore.character}
                  label={`${records.lowestScore.season} ${cupEmoji(records.lowestScore.cup)} Week ${records.lowestScore.week}`}
                  value={`${records.lowestScore.points.toFixed(2)} pts`}
                  sub={records.lowestScore.ownerName}
                />
              )}
            </RecordCard>

            {/* Lowest Combined Score */}
            <RecordCard icon="😴" title="Lowest Combined Score" accent="border-gray-500/30">
              {records.lowestCombined && (
                <StatLine
                  character={records.lowestCombined.teamA}
                  label={`${records.lowestCombined.teamA} vs ${records.lowestCombined.teamB}`}
                  value={`${records.lowestCombined.total.toFixed(2)} combined (${records.lowestCombined.scoreA.toFixed(2)} - ${records.lowestCombined.scoreB.toFixed(2)})`}
                  sub={`${records.lowestCombined.season} ${cupEmoji(records.lowestCombined.cup)} Wk ${records.lowestCombined.week}`}
                />
              )}
            </RecordCard>

            {/* Got Blown Out the Worst */}
            <RecordCard icon="💀" title="Worst Blowout Loss" accent="border-red-900/30">
              {records.biggestBlowout && (
                <StatLine
                  character={records.biggestBlowout.loser}
                  label={`Lost to ${records.biggestBlowout.winner} by ${records.biggestBlowout.margin.toFixed(2)}`}
                  value={`${records.biggestBlowout.loseScore.toFixed(2)} - ${records.biggestBlowout.winScore.toFixed(2)}`}
                  sub={`${records.biggestBlowout.season} ${cupEmoji(records.biggestBlowout.cup)} Wk ${records.biggestBlowout.week}`}
                />
              )}
            </RecordCard>

            {/* Career Worst Win % */}
            <RecordCard icon="🐌" title="Lowest Career Win %" accent="border-gray-500/30">
              {careerLeaders.length > 0 && (() => {
                const worst = [...careerLeaders].sort((a, b) => a.winPct - b.winPct)[0];
                return (
                  <StatLine
                    character={worst.character}
                    label={`${worst.totalWins}-${worst.totalLosses} career record`}
                    value={`${(worst.winPct * 100).toFixed(1)}% win rate`}
                    sub={worst.ownerName}
                  />
                );
              })()}
            </RecordCard>
          </div>

          {/* Bottom 10 Scores */}
          <TopScoresTable scores={records.bottom10Scores || []} title="Bottom 10 Weekly Scores" icon="🗑️" accent="border-gray-500/20" />
        </div>
      )}

      {/* ─── Career Stats ─── */}
      {tab === 'records' && (
        <div className="space-y-4">
          <CareerTable leaders={careerLeaders} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Most Total Wins */}
            <RecordCard icon="🏅" title="Most Career Wins">
              {careerLeaders.slice(0, 3).map((l, i) => (
                <StatLine key={l.ownerId} character={l.character} label={l.ownerName} value={`${l.totalWins} wins`} sub={`${(l.winPct * 100).toFixed(1)}%`} />
              ))}
            </RecordCard>

            {/* Highest Career PF */}
            <RecordCard icon="💰" title="Most Career Points">
              {[...careerLeaders].sort((a, b) => b.totalFpts - a.totalFpts).slice(0, 3).map((l, i) => (
                <StatLine key={l.ownerId} character={l.character} label={l.ownerName} value={`${l.totalFpts.toFixed(1)} pts`} sub={`${l.avgFpts.toFixed(1)} avg`} />
              ))}
            </RecordCard>

            {/* Best Win % */}
            <RecordCard icon="🎯" title="Best Win Percentage">
              {[...careerLeaders].sort((a, b) => b.winPct - a.winPct).slice(0, 3).map((l, i) => (
                <StatLine key={l.ownerId} character={l.character} label={`${l.totalWins}-${l.totalLosses}`} value={`${(l.winPct * 100).toFixed(1)}%`} sub={l.ownerName} />
              ))}
            </RecordCard>
          </div>
        </div>
      )}
    </div>
  );
}
