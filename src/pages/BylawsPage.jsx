import { useState } from 'react';

/**
 * League Bylaws page.
 *
 * To add your bylaws content, edit the BYLAWS_SECTIONS array below.
 * Each section has a `title` and `content` (supports basic text).
 * You can add as many sections as you need.
 */

const BYLAWS_SECTIONS = [
  {
    title: 'League Overview',
    content: 'Add your league overview here — league name, number of teams, platform, history, etc.',
  },
  {
    title: 'Scoring',
    content: 'Add scoring rules here — PPR / half-PPR / standard, point values for TDs, yardage, bonuses, etc.',
  },
  {
    title: 'Rosters',
    content: 'Add roster rules here — roster size, starting lineup positions, IR spots, bench size, etc.',
  },
  {
    title: 'Draft',
    content: 'Add draft rules here — draft format (snake, auction, linear), draft order determination, keeper rules, etc.',
  },
  {
    title: 'Trades',
    content: 'Add trade rules here — trade deadline, review period, veto process, trade limits, etc.',
  },
  {
    title: 'Waivers & Free Agency',
    content: 'Add waiver rules here — waiver type (FAAB, rolling), waiver periods, budget, free agent pickup rules, etc.',
  },
  {
    title: 'Regular Season',
    content: 'Add regular season rules here — number of weeks, divisions, schedule format, tiebreakers, etc.',
  },
  {
    title: 'Playoffs',
    content: 'Add playoff rules here — number of playoff teams, seeding, bracket format, bye weeks, championship week, etc.',
  },
  {
    title: 'Cup Points System',
    content: 'Add Mario Kart Cup points rules here — how points are awarded per cup, bonus points, MVP criteria, etc.',
  },
  {
    title: 'Sacko (Last Place)',
    content: 'Add Sacko rules here — how Sacko is determined, punishment details, consolation bracket rules, etc.',
  },
  {
    title: 'Power-Ups',
    content: 'Add power-up rules here — how power-ups are earned, deployment rules, restrictions, timing, etc.',
  },
  {
    title: 'Dues & Payouts',
    content: 'Add financial rules here — buy-in amount, payment deadline, payout structure, side pots, etc.',
  },
  {
    title: 'Code of Conduct',
    content: 'Add conduct rules here — collusion policy, tanking rules, inactive team policy, dispute resolution, etc.',
  },
  {
    title: 'Amendments',
    content: 'Add amendment rules here — how bylaws are changed, voting requirements, off-season rule proposals, etc.',
  },
];

export default function BylawsPage() {
  const [expandedIdx, setExpandedIdx] = useState(null);

  const toggle = (idx) => {
    setExpandedIdx(prev => prev === idx ? null : idx);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="text-3xl mb-2 block">📖</span>
        <h2 className="font-display text-base sm:text-xl rainbow-text mb-2">LEAGUE BYLAWS</h2>
        <p className="text-gray-400 text-xs sm:text-sm font-body">
          The official rules governing the Mario Kart Fantasy Cup
        </p>
      </div>

      {/* Table of Contents */}
      <div className="bg-mk-dark rounded-2xl border border-white/10 p-4 sm:p-5 mb-6">
        <h3 className="font-display text-[10px] sm:text-xs text-mk-blue tracking-widest mb-3">TABLE OF CONTENTS</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {BYLAWS_SECTIONS.map((section, i) => (
            <button
              key={i}
              onClick={() => { setExpandedIdx(i); document.getElementById(`bylaw-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
              className="text-left text-sm text-gray-400 hover:text-white transition px-2 py-1.5 rounded-lg hover:bg-white/5"
            >
              <span className="text-gray-600 font-mono text-xs mr-2">{String(i + 1).padStart(2, '0')}</span>
              {section.title}
            </button>
          ))}
        </div>
      </div>

      {/* Sections — accordion style */}
      <div className="space-y-2">
        {BYLAWS_SECTIONS.map((section, i) => {
          const isOpen = expandedIdx === i;
          return (
            <div
              key={i}
              id={`bylaw-${i}`}
              className="bg-mk-dark rounded-xl border border-white/10 overflow-hidden scroll-mt-24"
            >
              <button
                onClick={() => toggle(i)}
                className={`w-full flex items-center justify-between px-4 sm:px-5 py-3.5 text-left transition-all ${
                  isOpen ? 'bg-mk-blue/10' : 'hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="text-gray-600 font-mono text-xs">{String(i + 1).padStart(2, '0')}</span>
                  <span className={`text-sm font-semibold ${isOpen ? 'text-white' : 'text-gray-300'}`}>
                    {section.title}
                  </span>
                </span>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isOpen && (
                <div className="px-4 sm:px-5 pb-4 pt-1 border-t border-white/5">
                  <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-center text-[10px] text-gray-600 mt-6">
        Last updated: — &middot; Amendments require majority vote
      </p>
    </div>
  );
}
