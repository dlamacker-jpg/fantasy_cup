import { useState, useMemo } from 'react';
import { useAllTimeStats } from '../hooks/useAllTimeStats';
import { OWNERS, LEAGUE_META } from '../data/leagueConfig';
import CharacterBadge from '../components/CharacterBadge';
import LoadingSpinner from '../components/LoadingSpinner';

const cupEmoji = (cup) => LEAGUE_META[cup]?.emoji || '';

// Ordered owner list for consistent matrix rendering
const ownerList = Object.entries(OWNERS).map(([id, o]) => ({ id, ...o }));

function H2HMatrix({ h2h, onSelect }) {
  return (
    <div className="bg-mk-dark/80 backdrop-blur rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-4 border-b border-white/10">
        <h3 className="font-display text-xs sm:text-sm text-white uppercase tracking-wide">All-Time Head-to-Head Matrix</h3>
        <p className="text-gray-500 text-[10px] mt-1">Tap any cell to see matchup details</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] sm:text-xs">
          <thead>
            <tr className="border-b border-white/10">
              <th className="sticky left-0 z-10 bg-mk-dark py-2 px-1 sm:px-2 text-gray-400 font-bold text-left min-w-[60px] sm:min-w-[80px]">vs</th>
              {ownerList.map(o => (
                <th key={o.id} className="py-2 px-0.5 sm:px-1 text-center min-w-[40px] sm:min-w-[52px]">
                  <div className="flex flex-col items-center gap-0.5">
                    <CharacterBadge character={o.character} size="xs" />
                    <span className="text-gray-400 text-[8px] sm:text-[9px] truncate max-w-[40px] sm:max-w-[52px]">
                      {o.character.split(' ')[0]}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ownerList.map(row => (
              <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="sticky left-0 z-10 bg-mk-dark/95 py-1.5 px-1 sm:px-2">
                  <div className="flex items-center gap-1">
                    <CharacterBadge character={row.character} size="xs" />
                    <span className="text-white font-semibold text-[9px] sm:text-[10px] truncate hidden sm:inline">{row.character.split(' ')[0]}</span>
                  </div>
                </td>
                {ownerList.map(col => {
                  if (row.id === col.id) {
                    return <td key={col.id} className="text-center bg-white/[0.02] py-1.5 px-0.5"><span className="text-gray-600">—</span></td>;
                  }
                  const rec = h2h[row.id]?.[col.id];
                  if (!rec || (rec.wins === 0 && rec.losses === 0 && rec.ties === 0)) {
                    return <td key={col.id} className="text-center py-1.5 px-0.5"><span className="text-gray-700 text-[9px]">0-0</span></td>;
                  }
                  const isWinning = rec.wins > rec.losses;
                  const isLosing = rec.losses > rec.wins;
                  return (
                    <td key={col.id} className="text-center py-1.5 px-0.5">
                      <button
                        onClick={() => onSelect(row.id, col.id)}
                        className={`px-1 py-0.5 rounded text-[9px] sm:text-[10px] font-bold transition hover:scale-110 cursor-pointer ${
                          isWinning ? 'text-green-400 bg-green-400/10 hover:bg-green-400/20' :
                          isLosing ? 'text-red-400 bg-red-400/10 hover:bg-red-400/20' :
                          'text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20'
                        }`}
                      >
                        {rec.wins}-{rec.losses}{rec.ties > 0 ? `-${rec.ties}` : ''}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function H2HDetail({ h2h, ownerA, ownerB, onBack }) {
  const infoA = OWNERS[ownerA] || {};
  const infoB = OWNERS[ownerB] || {};
  const rec = h2h[ownerA]?.[ownerB];

  if (!rec) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No matchup history found.</p>
        <button onClick={onBack} className="mt-4 text-mk-blue hover:underline text-sm">Back to matrix</button>
      </div>
    );
  }

  const totalGames = rec.wins + rec.losses + rec.ties;
  const winPct = totalGames > 0 ? ((rec.wins / totalGames) * 100).toFixed(1) : '0.0';

  // Sort matchups by season desc, then week desc
  const sortedMatchups = [...rec.matchups].sort((a, b) => {
    if (a.season !== b.season) return b.season.localeCompare(a.season);
    return b.week - a.week;
  });

  return (
    <div>
      {/* Back button */}
      <button onClick={onBack} className="text-mk-blue hover:underline text-sm mb-4 flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
        Back to matrix
      </button>

      {/* Matchup header */}
      <div className="bg-mk-dark/80 backdrop-blur rounded-2xl border border-white/10 p-5 mb-4">
        <div className="flex items-center justify-center gap-4 sm:gap-8 mb-4">
          <div className="text-center">
            <CharacterBadge character={infoA.character} size="md" />
            <p className="text-white font-bold text-sm mt-2">{infoA.character}</p>
            <p className="text-gray-500 text-[10px]">{infoA.name}</p>
          </div>
          <div className="text-center px-4 sm:px-6">
            <p className="text-3xl sm:text-4xl font-display text-white">{rec.wins} - {rec.losses}{rec.ties > 0 ? ` - ${rec.ties}` : ''}</p>
            <p className="text-gray-400 text-xs mt-1">{totalGames} games played</p>
          </div>
          <div className="text-center">
            <CharacterBadge character={infoB.character} size="md" />
            <p className="text-white font-bold text-sm mt-2">{infoB.character}</p>
            <p className="text-gray-500 text-[10px]">{infoB.name}</p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-mk-darker/60 rounded-lg p-3 text-center">
            <p className="text-gray-400 text-[10px] uppercase">Win Rate</p>
            <p className={`text-lg font-bold ${Number(winPct) >= 50 ? 'text-green-400' : 'text-red-400'}`}>{winPct}%</p>
          </div>
          <div className="bg-mk-darker/60 rounded-lg p-3 text-center">
            <p className="text-gray-400 text-[10px] uppercase">Avg PF</p>
            <p className="text-lg font-bold text-white">{(rec.pf / totalGames).toFixed(1)}</p>
          </div>
          <div className="bg-mk-darker/60 rounded-lg p-3 text-center">
            <p className="text-gray-400 text-[10px] uppercase">Avg PA</p>
            <p className="text-lg font-bold text-white">{(rec.pa / totalGames).toFixed(1)}</p>
          </div>
          <div className="bg-mk-darker/60 rounded-lg p-3 text-center">
            <p className="text-gray-400 text-[10px] uppercase">Diff</p>
            <p className={`text-lg font-bold ${rec.pf - rec.pa > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {rec.pf - rec.pa > 0 ? '+' : ''}{(rec.pf - rec.pa).toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      {/* Matchup history */}
      <div className="bg-mk-dark/80 backdrop-blur rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-display text-xs text-white uppercase tracking-wide">Matchup History</h3>
        </div>
        <div className="divide-y divide-white/5">
          {sortedMatchups.map((m, i) => {
            const won = m.scoreA > m.scoreB;
            const tied = m.scoreA === m.scoreB;
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition">
                <div className="text-center shrink-0 w-16 sm:w-20">
                  <p className="text-gray-500 text-[10px]">{m.season} {cupEmoji(m.cup)}</p>
                  <p className="text-gray-400 text-[10px]">Week {m.week}</p>
                </div>
                <div className="flex-1 flex items-center justify-center gap-2 sm:gap-4">
                  <span className={`font-bold text-sm sm:text-base ${won ? 'text-green-400' : tied ? 'text-yellow-400' : 'text-red-400'}`}>
                    {m.scoreA.toFixed(2)}
                  </span>
                  <span className="text-gray-600 text-xs">vs</span>
                  <span className={`font-bold text-sm sm:text-base ${!won && !tied ? 'text-green-400' : tied ? 'text-yellow-400' : 'text-red-400'}`}>
                    {m.scoreB.toFixed(2)}
                  </span>
                </div>
                <div className="shrink-0 w-8 text-center">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${won ? 'text-green-400 bg-green-400/10' : tied ? 'text-yellow-400 bg-yellow-400/10' : 'text-red-400 bg-red-400/10'}`}>
                    {won ? 'W' : tied ? 'T' : 'L'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OwnerSelect({ label, value, onChange }) {
  return (
    <div className="flex-1">
      <label className="text-gray-400 text-[10px] uppercase block mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-mk-darker border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-mk-blue"
      >
        <option value="">Select player...</option>
        {ownerList.map(o => (
          <option key={o.id} value={o.id}>{o.character} ({o.name})</option>
        ))}
      </select>
    </div>
  );
}

export default function H2HPage() {
  const allTime = useAllTimeStats();
  const [selectedA, setSelectedA] = useState('');
  const [selectedB, setSelectedB] = useState('');
  const [detailView, setDetailView] = useState(null); // { a, b }

  if (allTime.loading) return <LoadingSpinner message="Loading head-to-head data..." />;
  if (allTime.error) return (
    <div className="text-center py-20 text-red-400">
      Error loading H2H data: {allTime.error}
      <button onClick={allTime.refresh} className="ml-3 underline hover:text-white">Retry</button>
    </div>
  );

  const { h2h } = allTime.data;

  const handleMatrixSelect = (a, b) => {
    setSelectedA(a);
    setSelectedB(b);
    setDetailView({ a, b });
  };

  const handleDropdownCompare = () => {
    if (selectedA && selectedB && selectedA !== selectedB) {
      setDetailView({ a: selectedA, b: selectedB });
    }
  };

  if (detailView) {
    return (
      <div>
        <div className="text-center mb-6">
          <span className="text-5xl mb-3 block">🏁</span>
          <h2 className="font-display text-xl md:text-2xl text-white mb-1">HEAD-TO-HEAD</h2>
        </div>
        <H2HDetail
          h2h={h2h}
          ownerA={detailView.a}
          ownerB={detailView.b}
          onBack={() => setDetailView(null)}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <span className="text-5xl mb-3 block">🏁</span>
        <h2 className="font-display text-xl md:text-2xl text-white mb-1">HEAD-TO-HEAD</h2>
        <p className="text-gray-400 text-sm font-body">All-time matchup records across every season and cup</p>
      </div>

      {/* Quick Compare Selector */}
      <div className="bg-mk-dark/80 backdrop-blur rounded-2xl border border-white/10 p-4 mb-6">
        <h3 className="font-display text-xs text-white uppercase tracking-wide mb-3">Quick Compare</h3>
        <div className="flex gap-3 items-end flex-wrap sm:flex-nowrap">
          <OwnerSelect label="Player 1" value={selectedA} onChange={setSelectedA} />
          <span className="text-gray-500 text-sm font-bold pb-2 hidden sm:block">vs</span>
          <OwnerSelect label="Player 2" value={selectedB} onChange={setSelectedB} />
          <button
            onClick={handleDropdownCompare}
            disabled={!selectedA || !selectedB || selectedA === selectedB}
            className="px-4 py-2 rounded-lg bg-mk-blue text-white text-sm font-bold transition hover:bg-mk-blue/80 disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap shrink-0 active:scale-95"
          >
            Compare
          </button>
        </div>
      </div>

      {/* Full Matrix */}
      <H2HMatrix h2h={h2h} onSelect={handleMatrixSelect} />

      {/* Rivalry highlights */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <RivalryCard h2h={h2h} title="Most Lopsided Rivalry" type="lopsided" />
        <RivalryCard h2h={h2h} title="Most Games Played" type="most-games" />
        <RivalryCard h2h={h2h} title="Closest Rivalry" type="closest" />
      </div>
    </div>
  );
}

function RivalryCard({ h2h, title, type }) {
  const rivalry = useMemo(() => {
    let best = null;
    const seen = new Set();
    Object.entries(h2h).forEach(([idA, opponents]) => {
      Object.entries(opponents).forEach(([idB, rec]) => {
        const key = [idA, idB].sort().join('-');
        if (seen.has(key)) return;
        seen.add(key);
        const total = rec.wins + rec.losses + rec.ties;
        if (total === 0) return;

        if (type === 'lopsided') {
          const diff = Math.abs(rec.wins - rec.losses);
          if (!best || diff > best.diff) best = { idA, idB, rec, diff, total };
        } else if (type === 'most-games') {
          if (!best || total > best.total) best = { idA, idB, rec, total, diff: Math.abs(rec.wins - rec.losses) };
        } else if (type === 'closest') {
          const diff = Math.abs(rec.wins - rec.losses);
          if (total >= 3 && (!best || diff < best.diff || (diff === best.diff && total > best.total)))
            best = { idA, idB, rec, diff, total };
        }
      });
    });
    return best;
  }, [h2h, type]);

  if (!rivalry) return null;
  const charA = OWNERS[rivalry.idA]?.character || '?';
  const charB = OWNERS[rivalry.idB]?.character || '?';

  return (
    <div className="bg-mk-dark/80 backdrop-blur rounded-2xl border border-white/10 p-4">
      <h4 className="font-display text-[10px] text-mk-blue uppercase tracking-wide mb-3">{title}</h4>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CharacterBadge character={charA} size="sm" />
          <span className="text-white font-bold text-sm">{charA.split(' ')[0]}</span>
        </div>
        <div className="text-center px-2">
          <p className="text-white font-bold text-base">{rivalry.rec.wins}-{rivalry.rec.losses}{rivalry.rec.ties > 0 ? `-${rivalry.rec.ties}` : ''}</p>
          <p className="text-gray-500 text-[10px]">{rivalry.total} games</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm">{charB.split(' ')[0]}</span>
          <CharacterBadge character={charB} size="sm" />
        </div>
      </div>
    </div>
  );
}
