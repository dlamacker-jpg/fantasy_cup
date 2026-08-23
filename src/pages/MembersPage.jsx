import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CHARACTER_THEMES } from '../data/leagueConfig';
import { ACTIVE_RACERS } from '../data/racerProfiles';
import CharacterBadge from '../components/CharacterBadge';

// ─── Sub-components ───

function StatBox({ label, value, icon }) {
  return (
    <div className="bg-mk-darker/60 rounded-lg p-3 text-center">
      <span className="text-lg block mb-1">{icon}</span>
      <p className="font-display text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-white font-bold text-sm mt-1">{value}</p>
    </div>
  );
}

function MemberCard({ member }) {
  const theme = CHARACTER_THEMES[member.character] || {};
  const tw = member.careerRecord.wins;
  const tl = member.careerRecord.losses;
  const winPct = (tw + tl) > 0 ? ((tw / (tw + tl)) * 100).toFixed(0) : '—';
  const isRookie = tw === 0 && tl === 0;

  return (
    <Link
      to={`/racer/${member.slug}`}
      className="block relative rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 group cursor-pointer"
      style={{
        borderColor: `${theme.primary}44`,
        background: `linear-gradient(135deg, ${theme.primary}11, ${theme.secondary}08)`,
      }}
    >
      {/* Superlative badge */}
      {member.superlative && (
        <div className="absolute top-3 right-3 z-10">
          <span
            className="text-[9px] font-display uppercase tracking-wider px-2 py-1 rounded-full"
            style={{ background: `${theme.primary}22`, color: theme.primary, border: `1px solid ${theme.primary}44` }}
          >
            {member.superlative}
          </span>
        </div>
      )}

      {/* Rookie badge */}
      {isRookie && (
        <div
          className="absolute top-4 -left-6 -rotate-45 px-8 py-0.5 text-[8px] font-display uppercase tracking-widest z-10"
          style={{ background: theme.primary, color: '#fff' }}
        >
          ROOKIE
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4 pr-16">
          <CharacterBadge character={member.character} size="xl" />
          <div>
            <h3 className="font-display text-sm sm:text-base text-white group-hover:text-mk-blue transition-colors">
              {member.character}
            </h3>
            <p className="text-gray-400 text-sm font-body">{member.name}</p>
            <p className="text-xs font-body mt-0.5" style={{ color: `${theme.primary}cc` }}>
              {member.tagline}
            </p>
          </div>
        </div>

        {/* Bio */}
        <p className="text-sm text-gray-300 font-body leading-relaxed mb-4 line-clamp-2">
          {member.bio}
        </p>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatBox label="Career Record" value={isRookie ? 'TBD' : `${tw}-${tl}`} icon="📊" />
          <StatBox label="Win %" value={isRookie ? '—' : `${winPct}%`} icon="📈" />
          <StatBox label="Total Pts" value={isRookie ? '—' : member.totalPoints} icon="🔢" />
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatBox label="Seasons" value={isRookie ? 'Rookie' : member.seasonsPlayed} icon="📅" />
          <StatBox label="Best League" value={member.bestFinish} icon="🏅" />
          <StatBox label="Worst League" value={member.worstFinish} icon="🍌" />
        </div>

        {/* Season breakdown */}
        <div className="bg-mk-darker/60 rounded-lg px-3 py-2 mb-4 text-center">
          <p className="text-[10px] text-gray-500 font-display uppercase">Season Split</p>
          <p className="text-xs text-gray-300 font-body mt-1">{member.seasonBreakdown}</p>
        </div>

        {/* View profile link */}
        <div className="text-center">
          <span
            className="inline-flex items-center gap-2 text-xs font-display transition-colors"
            style={{ color: theme.primary }}
          >
            VIEW FULL PROFILE
            <span className="group-hover:translate-x-1 transition-transform">{'>'}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Sort Options ───
const SORT_OPTIONS = [
  { key: 'winPct', label: 'Win %' },
  { key: 'wins', label: 'Total Wins' },
  { key: 'name', label: 'Name' },
  { key: 'character', label: 'Character' },
];

function sortMembers(members, sortKey) {
  return [...members].sort((a, b) => {
    switch (sortKey) {
      case 'winPct': {
        const aPct = (a.careerRecord.wins + a.careerRecord.losses) > 0
          ? a.careerRecord.wins / (a.careerRecord.wins + a.careerRecord.losses) : -1;
        const bPct = (b.careerRecord.wins + b.careerRecord.losses) > 0
          ? b.careerRecord.wins / (b.careerRecord.wins + b.careerRecord.losses) : -1;
        return bPct - aPct;
      }
      case 'wins':
        return b.careerRecord.wins - a.careerRecord.wins;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'character':
        return a.character.localeCompare(b.character);
      default:
        return 0;
    }
  });
}

// ─── Main Component ───

export default function MembersPage() {
  const [sortKey, setSortKey] = useState('winPct');
  const sorted = sortMembers(ACTIVE_RACERS, sortKey);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center py-8">
        <span className="text-5xl block mb-3">🏎️</span>
        <h1 className="font-display text-lg sm:text-xl md:text-2xl text-white mb-2">
          ACTIVE RACERS
        </h1>
        <div className="rainbow-road h-1 w-48 mx-auto mb-3 rounded-full" />
        <p className="text-gray-400 text-sm font-body max-w-lg mx-auto">
          The 12 managers currently competing for the Mario Kart Fantasy Cup.
          Click any racer to see their full profile.
        </p>
      </div>

      {/* Sort controls */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500 font-display">SORT BY:</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortKey(opt.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-display transition-all ${
              sortKey === opt.key
                ? 'bg-mk-blue text-white shadow-lg shadow-mk-blue/30'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Member cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {sorted.map((member) => (
          <MemberCard key={member.ownerId} member={member} />
        ))}
      </div>

      {/* League-wide stats */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-mk-dark/60 rounded-xl border border-white/10 p-5">
          <h3 className="font-display text-xs text-mk-gold mb-4 text-center">LEAGUE-WIDE CAREER STATS</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-white">12</p>
              <p className="text-[10px] text-gray-500 font-display uppercase">Active Racers</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">3</p>
              <p className="text-[10px] text-gray-500 font-display uppercase">Seasons</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">59.5%</p>
              <p className="text-[10px] text-gray-500 font-display uppercase">Best Career Win %</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">30-12</p>
              <p className="text-[10px] text-gray-500 font-display uppercase">Best Single Season</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
