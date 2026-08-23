import { useParams, Link } from 'react-router-dom';
import { getNewsletterBySlug, NEWSLETTERS } from '../data/newsletters';
import { CHARACTER_THEMES } from '../data/leagueConfig';
import CharacterBadge from '../components/CharacterBadge';

// ─── Section renderers ───

function HeroSection({ section }) {
  return (
    <div className="bg-gradient-to-br from-mk-blue/15 via-transparent to-mk-gold/10 rounded-2xl border border-mk-blue/20 p-6 sm:p-8">
      <h2 className="font-display text-lg sm:text-xl text-white mb-4">{section.title}</h2>
      {section.body.split('\n').filter(Boolean).map((p, i) => (
        <p key={i} className="text-sm sm:text-base text-gray-300 font-body leading-relaxed mb-3 last:mb-0">{p}</p>
      ))}
    </div>
  );
}

function RosterMovesSection({ section }) {
  return (
    <div>
      <h2 className="font-display text-xs text-gray-500 uppercase tracking-wider mb-6">{section.title}</h2>

      {/* Arrivals */}
      <div className="mb-6">
        <p className="text-[10px] text-green-400 uppercase font-bold mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400" /> New Arrivals
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {section.arrivals.map(a => {
            const theme = CHARACTER_THEMES[a.character] || {};
            return (
              <Link
                key={a.slug}
                to={`/racer/${a.slug}`}
                className="bg-mk-dark rounded-xl border border-green-500/20 p-4 hover:border-green-500/40 transition-colors group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <CharacterBadge character={a.character} size="md" noLink />
                  <div>
                    <p className="font-display text-sm text-white group-hover:text-green-400 transition-colors">{a.character}</p>
                    <p className="text-xs text-gray-400">{a.name}</p>
                  </div>
                </div>
                <p className="text-[10px] font-display uppercase tracking-wider mb-1" style={{ color: theme.primary }}>{a.headline}</p>
                <p className="text-xs text-gray-400 font-body leading-relaxed">{a.blurb}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Departures */}
      <div>
        <p className="text-[10px] text-red-400 uppercase font-bold mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-400" /> Departures
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {section.departures.map(d => (
            <Link
              key={d.slug}
              to={`/racer/${d.slug}`}
              className="bg-mk-dark rounded-xl border border-red-500/15 p-4 opacity-70 hover:opacity-100 transition-opacity group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="grayscale">
                  <CharacterBadge character={d.character} size="md" noLink />
                </div>
                <div>
                  <p className="font-display text-sm text-gray-400 group-hover:text-white transition-colors">{d.character}</p>
                  <p className="text-xs text-gray-500">{d.name}</p>
                </div>
              </div>
              <p className="text-[10px] font-display uppercase tracking-wider text-red-400/70 mb-1">{d.headline}</p>
              <p className="text-xs text-gray-500 font-body leading-relaxed">{d.blurb}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function LeaguePreviewSection({ section }) {
  const gradients = {
    'Mushroom Cup': 'from-mk-red/15 to-transparent',
    'Flower Cup': 'from-mk-green/15 to-transparent',
    'Star Cup': 'from-mk-yellow/15 to-transparent',
  };
  const borders = {
    'Mushroom Cup': 'border-mk-red/20',
    'Flower Cup': 'border-mk-green/20',
    'Star Cup': 'border-mk-yellow/20',
  };

  return (
    <div>
      <h2 className="font-display text-xs text-gray-500 uppercase tracking-wider mb-4">{section.title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {section.leagues.map(l => (
          <div
            key={l.name}
            className={`rounded-xl border p-4 bg-gradient-to-b ${gradients[l.name] || ''} ${borders[l.name] || 'border-white/10'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{l.emoji}</span>
              <div>
                <p className="font-display text-sm text-white">{l.name}</p>
                <p className="text-[10px] text-gray-500 uppercase">{l.format}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 font-body leading-relaxed">{l.preview}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PowerRankingsSection({ section }) {
  return (
    <div>
      <h2 className="font-display text-xs text-gray-500 uppercase tracking-wider mb-1">{section.title}</h2>
      <p className="text-xs text-gray-500 font-body italic mb-4">{section.intro}</p>
      <div className="space-y-2">
        {section.rankings.map(r => {
          const theme = CHARACTER_THEMES[r.character] || {};
          const isTop3 = r.rank <= 3;
          return (
            <Link
              key={r.rank}
              to={`/racer/${r.character.toLowerCase().replace(/\s+/g, '-')}`}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-all hover:scale-[1.01] group ${
                isTop3
                  ? 'border-mk-gold/20 bg-gradient-to-r from-mk-gold/5 to-transparent'
                  : 'border-white/5 bg-mk-dark/60 hover:border-white/15'
              }`}
            >
              {/* Rank */}
              <span className={`font-display text-lg w-8 text-center shrink-0 ${
                r.rank === 1 ? 'text-mk-gold' :
                r.rank === 2 ? 'text-gray-300' :
                r.rank === 3 ? 'text-amber-600' :
                'text-gray-600'
              }`}>
                {r.rank}
              </span>

              {/* Avatar */}
              <CharacterBadge character={r.character} size="sm" noLink />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-display text-sm text-white group-hover:text-mk-gold transition-colors truncate">{r.character}</p>
                  <span className="text-[10px] text-gray-500 font-body hidden sm:inline">({r.record})</span>
                </div>
                <p className="text-xs text-gray-400 font-body truncate sm:whitespace-normal">{r.rationale}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function BoldPredictionsSection({ section }) {
  return (
    <div>
      <h2 className="font-display text-xs text-gray-500 uppercase tracking-wider mb-4">{section.title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {section.predictions.map((p, i) => (
          <div key={i} className="bg-mk-dark rounded-xl border border-white/10 p-4 hover:border-mk-gold/20 transition-colors">
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0">{p.icon}</span>
              <div>
                <p className="font-display text-sm text-white mb-1">{p.prediction}</p>
                <p className="text-xs text-gray-400 font-body leading-relaxed">{p.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StorylinesSection({ section }) {
  return (
    <div>
      <h2 className="font-display text-xs text-gray-500 uppercase tracking-wider mb-4">{section.title}</h2>
      <div className="space-y-3">
        {section.items.map((s, i) => (
          <div
            key={i}
            className="bg-mk-dark/60 rounded-xl border border-white/5 p-4 hover:border-white/15 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{s.emoji}</span>
              <h3 className="font-display text-sm text-white">{s.title}</h3>
            </div>
            <p className="text-xs text-gray-400 font-body leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClosingSection({ section }) {
  return (
    <div className="bg-gradient-to-br from-mk-blue/10 via-transparent to-mk-gold/5 rounded-2xl border border-white/10 p-6 sm:p-8 text-center">
      <h2 className="font-display text-lg text-white mb-4">{section.title}</h2>
      {section.body.split('\n').filter(Boolean).map((p, i) => (
        <p key={i} className="text-sm text-gray-300 font-body leading-relaxed mb-3">{p}</p>
      ))}
      <p className="text-xs text-gray-500 font-display tracking-wider mt-4">{section.signoff}</p>
    </div>
  );
}

// ─── Section dispatcher ───
function Section({ section }) {
  switch (section.type) {
    case 'hero': return <HeroSection section={section} />;
    case 'roster-moves': return <RosterMovesSection section={section} />;
    case 'league-preview': return <LeaguePreviewSection section={section} />;
    case 'power-rankings': return <PowerRankingsSection section={section} />;
    case 'bold-predictions': return <BoldPredictionsSection section={section} />;
    case 'storylines': return <StorylinesSection section={section} />;
    case 'closing': return <ClosingSection section={section} />;
    default: return null;
  }
}

// ─── Main page ───
export default function NewsletterPage() {
  const { slug } = useParams();
  const newsletter = getNewsletterBySlug(slug);

  if (!newsletter) {
    return (
      <div className="text-center py-20">
        <span className="text-5xl block mb-4">📰</span>
        <h1 className="font-display text-xl text-white mb-2">NEWSLETTER NOT FOUND</h1>
        <p className="text-gray-400 font-body text-sm mb-6">That edition doesn't exist.</p>
        <Link to="/newsletter" className="text-mk-blue hover:text-white text-sm font-display transition">
          {'<'} ALL EDITIONS
        </Link>
      </div>
    );
  }

  // Find prev/next for navigation
  const idx = NEWSLETTERS.findIndex(n => n.slug === slug);
  const prev = idx > 0 ? NEWSLETTERS[idx - 1] : null;
  const next = idx < NEWSLETTERS.length - 1 ? NEWSLETTERS[idx + 1] : null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        to="/newsletter"
        className="inline-flex items-center gap-2 text-xs font-display text-gray-500 hover:text-white transition mb-6"
      >
        <span>{'<'}</span> ALL EDITIONS
      </Link>

      {/* Newsletter header */}
      <div className="text-center mb-8">
        <span className="text-5xl block mb-3">{newsletter.coverEmoji}</span>
        <p className="text-[10px] font-display text-mk-blue uppercase tracking-widest mb-1">{newsletter.edition}</p>
        <h1 className="font-display text-2xl sm:text-3xl text-white mb-2">{newsletter.title}</h1>
        <p className="text-sm text-gray-400 font-body max-w-lg mx-auto">{newsletter.subtitle}</p>
        <div className="mt-3 flex items-center justify-center gap-3 text-xs text-gray-600">
          <span className="font-display">Season {newsletter.season}</span>
          <span>•</span>
          <span className="font-body">{newsletter.date}</span>
        </div>
        {/* Divider */}
        <div className="mt-6 mx-auto w-32 h-px bg-gradient-to-r from-transparent via-mk-gold/40 to-transparent" />
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {newsletter.sections.map((section, i) => (
          <Section key={i} section={section} />
        ))}
      </div>

      {/* Prev / Next navigation */}
      {(prev || next) && (
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/10">
          {prev ? (
            <Link to={`/newsletter/${prev.slug}`} className="text-sm text-gray-400 hover:text-white font-display transition">
              {'<'} {prev.edition}
            </Link>
          ) : <div />}
          {next ? (
            <Link to={`/newsletter/${next.slug}`} className="text-sm text-gray-400 hover:text-white font-display transition">
              {next.edition} {'>'}
            </Link>
          ) : <div />}
        </div>
      )}
    </div>
  );
}
