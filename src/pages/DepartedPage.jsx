import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CHARACTER_THEMES } from '../data/leagueConfig';
import { DEPARTED_RACERS } from '../data/racerProfiles';
import CharacterBadge from '../components/CharacterBadge';

// ─── Sub-components ───

function GhostParticle({ delay, left }) {
  return (
    <div
      className="absolute text-2xl opacity-10 animate-float pointer-events-none select-none"
      style={{
        left: `${left}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${3 + delay}s`,
      }}
    >
      👻
    </div>
  );
}

function StatBox({ label, value, icon }) {
  return (
    <div className="bg-mk-darker/60 rounded-lg p-3 text-center">
      <span className="text-lg block mb-1">{icon}</span>
      <p className="font-display text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-white font-bold text-sm mt-1">{value}</p>
    </div>
  );
}

function MemberCard({ member, isExpanded, onToggle }) {
  const theme = CHARACTER_THEMES[member.character] || {};
  const winPct = ((member.careerRecord.wins / (member.careerRecord.wins + member.careerRecord.losses)) * 100).toFixed(0);

  return (
    <div
      className="relative rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{
        borderColor: `${theme.primary}44`,
        background: `linear-gradient(135deg, ${theme.primary}11, ${theme.secondary}08)`,
      }}
    >
      {/* "DNF" banner */}
      <div
        className="absolute top-4 -right-8 rotate-45 px-10 py-1 text-[9px] font-display uppercase tracking-widest z-10"
        style={{ background: theme.primary, color: '#fff', opacity: 0.85 }}
      >
        DNF
      </div>

      {/* Header */}
      <div className="p-6 pb-4">
        <Link to={`/racer/${member.slug}`} className="flex items-center gap-4 mb-4 group">
          <div className="relative">
            <CharacterBadge character={member.character} size="xl" />
            <div className="absolute inset-0 rounded-full bg-black/30 mix-blend-saturation" />
          </div>
          <div>
            <h3 className="font-display text-sm sm:text-base text-white group-hover:text-mk-blue transition-colors">
              {member.character}
            </h3>
            <p className="text-gray-400 text-sm font-body">{member.name}</p>
            <p className="text-gray-600 text-xs font-body mt-0.5">{member.yearsActive}</p>
          </div>
        </Link>

        {/* Epitaph */}
        <p className="text-sm italic font-body mb-4" style={{ color: `${theme.primary}cc` }}>
          "{member.bio}"
        </p>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatBox label="Career Record" value={`${member.careerRecord.wins}-${member.careerRecord.losses}`} icon="📊" />
          <StatBox label="Win %" value={`${winPct}%`} icon="📈" />
          <StatBox label="Total Pts" value={member.totalPoints} icon="🔢" />
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatBox label="Seasons" value={member.seasonsPlayed} icon="📅" />
          <StatBox label="Best League" value={member.bestFinish} icon="🏅" />
          <StatBox label="Worst League" value={member.worstFinish} icon="🍌" />
        </div>

        {/* Season breakdown */}
        <div className="bg-mk-darker/60 rounded-lg px-3 py-2 mb-4 text-center">
          <p className="text-[10px] text-gray-500 font-display uppercase">Season Split</p>
          <p className="text-xs text-gray-300 font-body mt-1">{member.seasonBreakdown}</p>
        </div>

        {/* Expand/collapse */}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-display transition-colors rounded-lg hover:bg-white/5"
          style={{ color: theme.primary }}
        >
          {isExpanded ? 'HIDE EULOGY' : 'READ THE EULOGY'}
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-5 animate-fade-in border-t border-white/5 pt-5">
          {/* Roast */}
          <div className="bg-mk-darker/80 rounded-xl p-4 border border-white/5">
            <p className="font-display text-[10px] text-gray-500 uppercase tracking-wider mb-2">
              🔥 THE ROAST
            </p>
            <p className="text-sm text-gray-300 font-body leading-relaxed italic">
              "{member.roast}"
            </p>
          </div>

          {/* Notable moments */}
          <div>
            <p className="font-display text-[10px] text-gray-500 uppercase tracking-wider mb-3">
              📋 NOTABLE MOMENTS
            </p>
            <div className="space-y-2">
              {member.notableMoments.map((moment, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="text-xs mt-0.5" style={{ color: theme.primary }}>{'>'}</span>
                  <p className="text-xs text-gray-400 font-body leading-relaxed">{moment}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Legacy */}
          <div className="bg-mk-darker/80 rounded-xl p-4 border border-white/5">
            <p className="font-display text-[10px] text-gray-500 uppercase tracking-wider mb-2">
              📜 LEGACY
            </p>
            <p className="text-sm text-gray-300 font-body leading-relaxed">
              {member.legacy}
            </p>
          </div>

          {/* Replaced by */}
          {member.replacedBy && (
            <Link
              to={`/racer/${member.replacedBy.character.toLowerCase().replace(/ /g, '-')}`}
              className="flex items-center gap-3 bg-mk-accent/30 rounded-xl p-3 border border-mk-blue/20 hover:border-mk-blue/40 transition-colors group"
            >
              <span className="text-lg">🔄</span>
              <div>
                <p className="text-[10px] font-display text-gray-500 uppercase">REPLACED BY</p>
                <p className="text-sm text-white font-body font-semibold group-hover:text-mk-blue transition-colors">
                  {member.replacedBy.name}
                  <span className="text-gray-400 ml-1">as {member.replacedBy.character}</span>
                </p>
              </div>
            </Link>
          )}

          {/* Full profile link */}
          <Link
            to={`/racer/${member.slug}`}
            className="block text-center py-2 text-xs font-display transition-colors hover:bg-white/5 rounded-lg"
            style={{ color: theme.primary }}
          >
            VIEW FULL PROFILE {'>'}
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───

export default function DepartedPage() {
  const [expandedIndex, setExpandedIndex] = useState(null);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative text-center py-8 overflow-hidden">
        <GhostParticle delay={0} left={10} />
        <GhostParticle delay={1.5} left={30} />
        <GhostParticle delay={0.8} left={55} />
        <GhostParticle delay={2} left={75} />
        <GhostParticle delay={0.5} left={90} />

        <span className="text-5xl block mb-3">🪦</span>
        <h1 className="font-display text-lg sm:text-xl md:text-2xl text-white mb-2">
          DEPARTED RACERS
        </h1>
        <div className="rainbow-road h-1 w-48 mx-auto mb-3 rounded-full" />
        <p className="text-gray-400 text-sm font-body max-w-lg mx-auto">
          Not everyone finishes the race. These fallen competitors have been eliminated
          from the Mario Kart Fantasy Cup. Pour one out for the homies.
        </p>
        <p className="text-gray-600 text-xs font-body mt-2 italic">
          "It's-a me... gone." — Every departed racer, probably
        </p>
      </div>

      {/* Member cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {DEPARTED_RACERS.map((member, i) => (
          <MemberCard
            key={member.ownerId}
            member={member}
            isExpanded={expandedIndex === i}
            onToggle={() => setExpandedIndex(expandedIndex === i ? null : i)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="text-center py-8">
        <div className="inline-block bg-mk-dark/60 rounded-xl border border-white/10 px-6 py-4 max-w-md">
          <span className="text-2xl block mb-2">🏁</span>
          <p className="text-xs text-gray-500 font-body leading-relaxed">
            Characters and legacy data are preserved forever in the Fantasy Cup record books.
            Once a racer, always a racer — even if you got blue-shelled into retirement.
          </p>
        </div>
      </div>
    </div>
  );
}
