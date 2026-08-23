import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CHARACTER_THEMES } from '../data/leagueConfig';
import { getRacerBySlug } from '../data/racerProfiles';
import { BADGE_DEFS, evaluateBadges } from '../data/badges';
import CharacterBadge from '../components/CharacterBadge';

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-mk-darker/60 rounded-xl p-4 text-center border border-white/5">
      <span className="text-2xl block mb-2">{icon}</span>
      <p className="font-display text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-white font-bold text-lg mt-1" style={color ? { color } : undefined}>{value}</p>
    </div>
  );
}

function SeasonRow({ data, theme }) {
  return (
    <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
      <td className="py-3 px-4 font-display text-xs" style={{ color: theme.primary }}>{data.season}</td>
      <td className="py-3 px-4 text-sm font-body text-center">
        <span className="px-2 py-1 rounded bg-mk-red/15 text-red-300">{data.mushroom}</span>
      </td>
      <td className="py-3 px-4 text-sm font-body text-center">
        <span className="px-2 py-1 rounded bg-mk-green/15 text-green-300">{data.flower}</span>
      </td>
      <td className="py-3 px-4 text-sm font-body text-center">
        <span className="px-2 py-1 rounded bg-mk-yellow/15 text-yellow-300">{data.star}</span>
      </td>
    </tr>
  );
}

export default function RacerPage({ sleeper }) {
  const { slug } = useParams();
  const racer = getRacerBySlug(slug);

  if (!racer) {
    return (
      <div className="text-center py-20">
        <span className="text-5xl block mb-4">🚫</span>
        <h1 className="font-display text-xl text-white mb-2">RACER NOT FOUND</h1>
        <p className="text-gray-400 font-body text-sm mb-6">That racer doesn't exist on this track.</p>
        <Link to="/members" className="text-mk-blue hover:text-white text-sm font-display transition">
          {'<'} BACK TO RACERS
        </Link>
      </div>
    );
  }

  const theme = CHARACTER_THEMES[racer.character] || {};
  const { earned, locked } = useMemo(() => evaluateBadges(sleeper?.data?.cupData, racer.ownerId), [sleeper?.data, racer.ownerId]);
  const tw = racer.careerRecord.wins;
  const tl = racer.careerRecord.losses;
  const isRookie = tw === 0 && tl === 0;
  const winPct = (tw + tl) > 0 ? ((tw / (tw + tl)) * 100).toFixed(1) : '—';
  const isDeparted = racer.status === 'departed';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back link */}
      <Link
        to={isDeparted ? '/departed' : '/members'}
        className="inline-flex items-center gap-2 text-xs font-display text-gray-500 hover:text-white transition"
      >
        <span>{'<'}</span> {isDeparted ? 'DEPARTED' : 'ACTIVE RACERS'}
      </Link>

      {/* Hero section */}
      <div
        className="relative rounded-2xl border overflow-hidden p-6 sm:p-8"
        style={{
          borderColor: `${theme.primary}44`,
          background: `linear-gradient(135deg, ${theme.primary}15, ${theme.secondary}08, transparent)`,
        }}
      >
        {/* Status badge */}
        {isDeparted && (
          <div
            className="absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-display uppercase tracking-wider"
            style={{ background: '#E5252122', color: '#E55', border: '1px solid #E5252144' }}
          >
            DEPARTED
          </div>
        )}
        {isRookie && (
          <div
            className="absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-display uppercase tracking-wider"
            style={{ background: `${theme.primary}22`, color: theme.primary, border: `1px solid ${theme.primary}44` }}
          >
            ROOKIE
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Character image */}
          <div className="relative shrink-0">
            <div
              className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-2 flex items-center justify-center"
              style={{ borderColor: `${theme.primary}66` }}
            >
              <CharacterBadge character={racer.character} size="xl" />
            </div>
            {isDeparted && (
              <div className="absolute inset-0 rounded-2xl bg-black/30 mix-blend-saturation" />
            )}
          </div>

          {/* Info */}
          <div className="text-center sm:text-left flex-1">
            <h1 className="font-display text-xl sm:text-2xl text-white mb-1">{racer.character}</h1>
            <p className="text-gray-400 font-body text-sm">{racer.name}</p>
            <p className="text-xs font-display mt-2 tracking-wider" style={{ color: theme.primary }}>
              {racer.tagline}
            </p>
            {racer.superlative && (
              <span
                className="inline-block mt-3 text-[9px] font-display uppercase tracking-wider px-2.5 py-1 rounded-full"
                style={{ background: `${theme.primary}22`, color: theme.primary, border: `1px solid ${theme.primary}44` }}
              >
                {racer.superlative}
              </span>
            )}
            <p className="text-sm text-gray-300 font-body leading-relaxed mt-4 max-w-lg">
              {racer.bio}
            </p>
            {racer.roast && (
              <p className="text-sm text-gray-400 font-body leading-relaxed mt-3 italic max-w-lg">
                "{racer.roast}"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Achievement Badges */}
      {(earned.length > 0 || locked.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xs text-gray-500 uppercase tracking-wider">ACHIEVEMENTS</h2>
            <span className="text-sm text-gray-400">{earned.length}/{earned.length + locked.length} unlocked</span>
          </div>

          {/* Progress bar */}
          <div className="mb-6 bg-white/5 rounded-full h-2.5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-mk-blue to-mk-gold rounded-full transition-all duration-700"
              style={{ width: `${(earned.length / (earned.length + locked.length)) * 100}%` }} />
          </div>

          {/* Earned badges */}
          {earned.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-3">Unlocked</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {earned.map((b, i) => (
                  <div key={b.id || i} className={`bg-mk-dark rounded-xl border p-3 text-center ${
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
        </div>
      )}

      {/* Career Stats Grid */}
      <div>
        <h2 className="font-display text-xs text-gray-500 uppercase tracking-wider mb-4">CAREER STATS</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Record" value={isRookie ? 'TBD' : `${tw}-${tl}`} icon="📊" color={theme.primary} />
          <StatCard label="Win %" value={isRookie ? '—' : `${winPct}%`} icon="📈" />
          <StatCard label="Total Pts" value={isRookie ? '—' : racer.totalPoints} icon="🔢" />
          <StatCard label="Seasons" value={isRookie ? 'Rookie' : racer.seasonsPlayed} icon="📅" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
          <StatCard label="Best League" value={racer.bestFinish} icon="🏅" />
          <StatCard label="Worst League" value={racer.worstFinish} icon="🍌" />
          <div className="col-span-2 sm:col-span-1 bg-mk-darker/60 rounded-xl p-4 text-center border border-white/5">
            <span className="text-2xl block mb-2">📆</span>
            <p className="font-display text-[10px] text-gray-500 uppercase tracking-wider">Years Active</p>
            <p className="text-white font-bold text-sm mt-1">{racer.yearsActive}</p>
          </div>
        </div>
      </div>

      {/* Season Breakdown */}
      {racer.seasonBreakdown && (
        <div className="bg-mk-dark/60 rounded-xl border border-white/10 p-5">
          <h2 className="font-display text-xs text-gray-500 uppercase tracking-wider mb-3">SEASON SPLIT</h2>
          <p className="text-sm text-gray-300 font-body">{racer.seasonBreakdown}</p>
        </div>
      )}

      {/* League History Table */}
      {racer.leagueHistory && racer.leagueHistory.length > 0 && (
        <div>
          <h2 className="font-display text-xs text-gray-500 uppercase tracking-wider mb-4">LEAGUE-BY-LEAGUE HISTORY</h2>
          <div className="bg-mk-dark/60 rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 px-4 text-left font-display text-[10px] text-gray-500 uppercase">Season</th>
                  <th className="py-3 px-4 text-center font-display text-[10px] text-gray-500 uppercase">🍄 Mushroom</th>
                  <th className="py-3 px-4 text-center font-display text-[10px] text-gray-500 uppercase">🌼 Flower</th>
                  <th className="py-3 px-4 text-center font-display text-[10px] text-gray-500 uppercase">⭐ Star</th>
                </tr>
              </thead>
              <tbody>
                {racer.leagueHistory.map((season) => (
                  <SeasonRow key={season.season} data={season} theme={theme} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notable Moments */}
      {racer.notableMoments && racer.notableMoments.length > 0 && (
        <div>
          <h2 className="font-display text-xs text-gray-500 uppercase tracking-wider mb-4">NOTABLE MOMENTS</h2>
          <div className="space-y-3">
            {racer.notableMoments.map((moment, i) => (
              <div
                key={i}
                className="flex items-start gap-3 bg-mk-dark/60 rounded-xl border border-white/5 p-4"
              >
                <span className="text-sm mt-0.5 shrink-0" style={{ color: theme.primary }}>{'>'}</span>
                <p className="text-sm text-gray-300 font-body leading-relaxed">{moment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legacy (departed only) */}
      {racer.legacy && (
        <div className="bg-mk-dark/60 rounded-xl border border-white/10 p-5">
          <h2 className="font-display text-xs text-gray-500 uppercase tracking-wider mb-3">LEGACY</h2>
          <p className="text-sm text-gray-300 font-body leading-relaxed">{racer.legacy}</p>
        </div>
      )}

      {/* Replaced by (departed only) */}
      {racer.replacedBy && (
        <Link
          to={`/racer/${racer.replacedBy.character.toLowerCase().replace(/ /g, '-')}`}
          className="flex items-center gap-3 bg-mk-accent/30 rounded-xl p-4 border border-mk-blue/20 hover:border-mk-blue/40 transition-colors group"
        >
          <span className="text-xl">🔄</span>
          <div>
            <p className="text-[10px] font-display text-gray-500 uppercase">REPLACED BY</p>
            <p className="text-sm text-white font-body font-semibold group-hover:text-mk-blue transition-colors">
              {racer.replacedBy.name}
              <span className="text-gray-400 ml-1">as {racer.replacedBy.character}</span>
            </p>
          </div>
          <span className="ml-auto text-gray-600 group-hover:text-mk-blue transition-colors">{'>'}</span>
        </Link>
      )}
    </div>
  );
}
