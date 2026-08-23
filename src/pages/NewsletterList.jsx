import { Link } from 'react-router-dom';
import { NEWSLETTERS } from '../data/newsletters';

export default function NewsletterList() {
  // Most recent first
  const editions = [...NEWSLETTERS].reverse();

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="text-4xl block mb-3">📰</span>
        <h1 className="font-display text-2xl text-white mb-2">THE NEWSLETTER</h1>
        <p className="text-sm text-gray-400 font-body">Weekly dispatches from the Mario Kart Fantasy Cup.</p>
      </div>

      {/* Edition cards */}
      <div className="space-y-3">
        {editions.map((nl, i) => {
          const isLatest = i === 0;
          return (
            <Link
              key={nl.slug}
              to={`/newsletter/${nl.slug}`}
              className={`block rounded-xl border p-5 transition-all hover:scale-[1.01] group ${
                isLatest
                  ? 'border-mk-gold/30 bg-gradient-to-r from-mk-gold/8 to-transparent'
                  : 'border-white/10 bg-mk-dark/60 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl shrink-0">{nl.coverEmoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-sm text-white group-hover:text-mk-gold transition-colors">{nl.title}</p>
                    {isLatest && (
                      <span className="text-[9px] font-display uppercase tracking-wider px-2 py-0.5 rounded-full bg-mk-gold/20 text-mk-gold border border-mk-gold/30">
                        Latest
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 font-display mt-0.5">{nl.edition}</p>
                  <p className="text-xs text-gray-400 font-body mt-1 truncate">{nl.subtitle}</p>
                </div>
                <span className="text-gray-600 group-hover:text-mk-gold transition-colors text-sm shrink-0">{'>'}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {editions.length === 0 && (
        <div className="text-center py-16 bg-mk-dark/40 rounded-2xl border border-white/5">
          <span className="text-4xl block mb-3">🏗️</span>
          <p className="text-gray-400 font-body text-sm">No editions yet. Check back when the season starts.</p>
        </div>
      )}
    </div>
  );
}
