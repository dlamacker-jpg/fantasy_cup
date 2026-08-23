import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Data ───
const CUPS = [
  {
    name: 'Mushroom Cup',
    emoji: '🍄',
    type: 'Standard',
    color: 'mk-red',
    border: 'border-mk-red/50',
    bg: 'bg-mk-red/10',
    glow: 'hover:shadow-[0_0_30px_rgba(229,37,33,0.3)]',
    description:
      'Classic head-to-head. Set your lineup, manage your roster, earn points for wins and placement.',
  },
  {
    name: 'Flower Cup',
    emoji: '🌼',
    type: 'Best Ball',
    color: 'mk-green',
    border: 'border-mk-green/50',
    bg: 'bg-mk-green/10',
    glow: 'hover:shadow-[0_0_30px_rgba(67,176,71,0.3)]',
    description:
      'Best Ball — your optimal lineup is auto-selected each week. No waiver wire, pure drafting skill.',
  },
  {
    name: 'Star Cup',
    emoji: '⭐',
    type: 'Auction',
    color: 'mk-yellow',
    border: 'border-mk-yellow/50',
    bg: 'bg-mk-yellow/10',
    glow: 'hover:shadow-[0_0_30px_rgba(251,190,0,0.3)]',
    description:
      'Auction draft format. Every manager gets a $200 budget to build their ultimate roster.',
  },
];

const REG_SEASON = [
  { place: '1st', pts: 200 },
  { place: '2nd', pts: 190 },
  { place: '3rd', pts: 180 },
  { place: '4th', pts: 170 },
  { place: '5th', pts: 160 },
  { place: '6th', pts: 150 },
  { place: '7th', pts: 140 },
  { place: '8th', pts: 130 },
  { place: '9th', pts: 120 },
  { place: '10th', pts: 110 },
  { place: '11th', pts: 100 },
  { place: '12th', pts: 90 },
];

const PLAYOFF = [
  { place: '1st', pts: 150 },
  { place: '2nd', pts: 115 },
  { place: '3rd', pts: 90 },
  { place: '4th', pts: 75 },
  { place: '5th', pts: 50 },
  { place: '6th', pts: 40 },
];

const CONSOLATION = [
  { place: '7th', pts: 45 },
  { place: '8th', pts: 35 },
  { place: '9th', pts: 20 },
  { place: '10th', pts: 15 },
  { place: '11th', pts: 5 },
  { place: '12th', pts: 0 },
];

const POWER_UP_TIERS = [
  {
    tier: 'Common',
    color: 'gray',
    textClass: 'text-gray-400',
    borderClass: 'border-gray-500/40 bg-gray-500/10',
    dotClass: 'bg-gray-400',
    examples: [
      { icon: '🍄', name: 'Mushroom', effect: '+5 pts to your score' },
      { icon: '🟢', name: 'Green Shell', effect: '50% chance to subtract -5 pts from opponent' },
    ],
  },
  {
    tier: 'Uncommon',
    color: 'green',
    textClass: 'text-green-400',
    borderClass: 'border-green-500/40 bg-green-500/10',
    dotClass: 'bg-green-400',
    examples: [
      { icon: '🟢🟢🟢', name: 'Triple Green Shell', effect: '3 shots across leagues (50% each)' },
      { icon: '🔴', name: 'Red Shell', effect: 'Guaranteed -5 pts from opponent' },
    ],
  },
  {
    tier: 'Rare',
    color: 'blue',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/40 bg-blue-500/10',
    dotClass: 'bg-blue-400',
    examples: [
      { icon: '🔴🔴🔴', name: 'Triple Red Shell', effect: '3 guaranteed shots (-5 each)' },
      { icon: '🚀', name: 'Bullet Bill', effect: '+10 pts to your score' },
      { icon: '👻', name: 'Ghost', effect: "Steal a random team's power-up" },
    ],
  },
  {
    tier: 'Epic',
    color: 'purple',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/40 bg-purple-500/10',
    dotClass: 'bg-purple-400',
    examples: [
      { icon: '⭐', name: 'Star', effect: 'Immunity + 5 pts' },
      { icon: '⚡', name: 'Lightning', effect: '-5 pts to everyone (except Star holders)' },
    ],
  },
  {
    tier: 'Legendary',
    color: 'yellow',
    textClass: 'text-yellow-400',
    borderClass: 'border-yellow-500/40 bg-yellow-500/10 shadow-lg shadow-yellow-500/10',
    dotClass: 'bg-yellow-400',
    examples: [
      { icon: '🪄', name: "Kimek's Magic", effect: 'Change your matchup to any team' },
      { icon: '💙', name: 'Blue Spiked Shell', effect: "Force bench an opponent's starter" },
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: 'How do I join the league?',
    a: 'The Mario Kart Fantasy Cup is an invite-only league of 12 managers competing across three separate Sleeper leagues. Each manager participates in all three cups.',
  },
  {
    q: 'How is the overall champion determined?',
    a: 'Points are earned in each cup through regular season placement and playoff finish. Bonus points come from Top Speed awards and the MVP bonus. The manager with the most total points across all three cups wins the Mario Kart Fantasy Cup.',
  },
  {
    q: 'What are power-ups?',
    a: 'Power-ups are a unique Mario Kart-inspired mechanic. Each week, teams can earn randomized power-ups that affect scores — boosts for yourself or attacks on opponents. They add strategy and chaos, just like items on the track.',
  },
  {
    q: 'When does the season start?',
    a: "The 2026 NFL season kicks off in September. Drafts typically happen in late August. Check the Draft page for your league's draft date and format.",
  },
  {
    q: 'How do I set my lineup?',
    a: 'Lineups are managed through the Sleeper app. Download Sleeper on iOS or Android, or visit sleeper.com. The Fantasy Cup app pulls data from Sleeper automatically.',
  },
  {
    q: 'What is the Sacko?',
    a: "The Sacko is the anti-trophy — awarded to the worst overall performer. The Sacko holder faces a punishment decided by the league. Don't finish last!",
  },
  {
    q: 'Can I trade across cups?',
    a: 'No — each cup is a separate Sleeper league with its own roster. Trades only happen within the same cup.',
  },
  {
    q: 'What are the tiebreaker rules?',
    a: 'Tiebreakers for playoff seeding use total points scored. For the overall Fantasy Cup standings, ties are settled by total regular season points. If still tied, it goes to the wheel!',
  },
];

// ─── Sub-components ───

function SectionHeading({ children, sub }) {
  return (
    <div className="text-center mb-8">
      <h2 className="font-display text-lg sm:text-xl md:text-2xl rainbow-text mb-2">
        {children}
      </h2>
      {sub && <p className="text-gray-400 text-sm font-body max-w-xl mx-auto">{sub}</p>}
    </div>
  );
}

function RainbowStrip() {
  return <div className="rainbow-road h-1 w-full rounded-full" />;
}

function EnterButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="
        inline-flex items-center gap-3 px-8 py-4
        bg-gradient-to-r from-mk-red via-mk-yellow to-mk-green
        rounded-xl font-display text-sm sm:text-base text-mk-darker
        shadow-lg hover:scale-105 active:scale-95
        transition-all duration-200
        animate-pulse-gold
      "
    >
      <span>🏁</span>
      ENTER THE CUP
      <span>🏁</span>
    </button>
  );
}

function FAQItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <span className="font-body font-semibold text-sm text-white">{item.q}</span>
        <span
          className={`text-mk-yellow text-xl transition-transform duration-200 shrink-0 ${
            open ? 'rotate-45' : ''
          }`}
        >
          +
        </span>
      </button>
      {open && (
        <div className="px-5 pb-4 animate-fade-in">
          <p className="text-sm text-gray-300 leading-relaxed font-body">{item.a}</p>
        </div>
      )}
    </div>
  );
}

function ScoringColumn({ title, color, data }) {
  return (
    <div className="bg-mk-dark/60 rounded-xl border border-white/10 overflow-hidden">
      <div className={`px-4 py-2.5 border-b border-white/10 bg-${color}/10`}>
        <h4 className="font-display text-[10px] sm:text-xs text-center" style={{ color }}>
          {title}
        </h4>
      </div>
      <div className="divide-y divide-white/5">
        {data.map((row) => (
          <div key={row.place} className="flex justify-between px-4 py-2 text-sm font-body">
            <span className="text-gray-400">{row.place}</span>
            <span className="text-white font-bold">{row.pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Feature Tour Data ───
const TOUR_STEPS = [
  {
    title: 'LEADERBOARD',
    emoji: '🏆',
    tagline: 'Command Center',
    description: 'The heartbeat of the Fantasy Cup. See overall standings across all three cups, track point totals, and watch the championship race unfold in real time.',
    color: '#FFD700',
    gradient: 'from-yellow-500/20 to-yellow-700/10',
    borderColor: 'border-yellow-500/40',
    route: '/',
    highlights: [
      { icon: '📊', text: 'Live point totals across all cups' },
      { icon: '📈', text: 'Rank movement indicators' },
      { icon: '🏅', text: 'Character avatars & team identity' },
    ],
  },
  {
    title: 'CUP DETAILS',
    emoji: '🍄',
    tagline: 'Deep Dive Each Cup',
    description: 'Drill into any cup for full matchup results, win/loss records, weekly scores, and playoff bracket positioning. Every cup tells its own story.',
    color: '#E52521',
    gradient: 'from-red-500/20 to-red-700/10',
    borderColor: 'border-red-500/40',
    route: '/cup/mushroom',
    highlights: [
      { icon: '🆚', text: 'Weekly matchup results' },
      { icon: '🏟️', text: 'Season standings per cup' },
      { icon: '📋', text: 'Playoff picture & seeding' },
    ],
  },
  {
    title: 'POWER RANKINGS',
    emoji: '⚡',
    tagline: 'Who\'s Hot, Who\'s Not',
    description: 'Algorithm-driven weekly power rankings with momentum arrows, strength of schedule, and hot/cold streaks. See who\'s peaking at the right time.',
    color: '#049CD8',
    gradient: 'from-blue-500/20 to-blue-700/10',
    borderColor: 'border-blue-500/40',
    route: '/rankings',
    highlights: [
      { icon: '🔥', text: 'Hot & cold streak tracking' },
      { icon: '📉', text: 'Week-over-week movement' },
      { icon: '💪', text: 'Strength-of-schedule factor' },
    ],
  },
  {
    title: 'WEEKLY RECAP',
    emoji: '📰',
    tagline: 'The Race Report',
    description: 'Mario Kart-themed weekly summaries with top performers, biggest upsets, closest matchups, and who got blue-shelled by their own roster.',
    color: '#43B047',
    gradient: 'from-green-500/20 to-green-700/10',
    borderColor: 'border-green-500/40',
    route: '/recap',
    highlights: [
      { icon: '🥇', text: 'Weekly winners & top scores' },
      { icon: '😱', text: 'Biggest upsets & blowouts' },
      { icon: '🎭', text: 'Heroes & villains of the week' },
    ],
  },
  {
    title: 'POWER-UPS',
    emoji: '🎮',
    tagline: 'Your Item Inventory',
    description: 'View your current power-up inventory, deploy items before Thursday kickoff, and track what everyone else is holding. Strategy meets chaos.',
    color: '#7B2D8E',
    gradient: 'from-purple-500/20 to-purple-700/10',
    borderColor: 'border-purple-500/40',
    route: '/powerups',
    highlights: [
      { icon: '📦', text: 'Personal inventory management' },
      { icon: '🎯', text: 'Deploy against opponents' },
      { icon: '🛡️', text: 'Defensive holds & blocks' },
    ],
  },
  {
    title: 'RECORD BOOK',
    emoji: '📜',
    tagline: 'Legends Live Here',
    description: 'All-time records, season highs, weekly bests, longest win streaks, and biggest blowouts. See where you stand in Fantasy Cup history.',
    color: '#CD7F32',
    gradient: 'from-amber-600/20 to-amber-800/10',
    borderColor: 'border-amber-600/40',
    route: '/records',
    highlights: [
      { icon: '👑', text: 'All-time high scores' },
      { icon: '🔥', text: 'Longest win streaks' },
      { icon: '📅', text: 'Season-by-season records' },
    ],
  },
  {
    title: 'HEAD-TO-HEAD',
    emoji: '🏁',
    tagline: 'Rivalry Tracker',
    description: 'Pick any two managers and see their full head-to-head history — win/loss record, point differentials, and who owns the rivalry.',
    color: '#E52521',
    gradient: 'from-red-600/20 to-red-800/10',
    borderColor: 'border-red-600/40',
    route: '/h2h',
    highlights: [
      { icon: '🆚', text: 'All-time matchup records' },
      { icon: '📊', text: 'Point differential trends' },
      { icon: '🏆', text: 'Playoff meeting history' },
    ],
  },
  {
    title: 'DRAFT CENTER',
    emoji: '🎯',
    tagline: 'Draft Day Relived',
    description: 'Relive every draft pick across all three cups. See draft grades, value picks, reaches, and how each team was built from the ground up.',
    color: '#049CD8',
    gradient: 'from-sky-500/20 to-sky-700/10',
    borderColor: 'border-sky-500/40',
    route: '/draft',
    highlights: [
      { icon: '📝', text: 'Full draft boards' },
      { icon: '💎', text: 'Value picks & steals' },
      { icon: '📉', text: 'Draft grade analysis' },
    ],
  },
  {
    title: 'TROPHY ROOM',
    emoji: '🏆',
    tagline: 'Hall of Champions',
    description: 'The permanent shrine to Fantasy Cup greatness. Past champions, cup winners, MVP awards, and the infamous Sacko wall of shame.',
    color: '#FFD700',
    gradient: 'from-yellow-400/20 to-amber-600/10',
    borderColor: 'border-yellow-400/40',
    route: '/trophies',
    highlights: [
      { icon: '👑', text: 'Past overall champions' },
      { icon: '🏅', text: 'Individual cup winners' },
      { icon: '🍌', text: 'Sacko Hall of Shame' },
    ],
  },
  {
    title: 'TOP PERFORMERS',
    emoji: '🏈',
    tagline: 'Player Spotlight',
    description: 'Track the highest-scoring NFL players across all your leagues. See who\'s carrying teams and which sleepers are breaking out.',
    color: '#43B047',
    gradient: 'from-emerald-500/20 to-emerald-700/10',
    borderColor: 'border-emerald-500/40',
    route: '/performers',
    highlights: [
      { icon: '⭐', text: 'Top scorers by position' },
      { icon: '📈', text: 'Breakout player alerts' },
      { icon: '🔍', text: 'Cross-league comparisons' },
    ],
  },
];

function FeatureTour() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const [animating, setAnimating] = useState(false);
  const navigate = useNavigate();
  const current = TOUR_STEPS[step];
  const total = TOUR_STEPS.length;
  const containerRef = useRef(null);

  function goTo(index) {
    if (animating || index === step) return;
    setDirection(index > step ? 1 : -1);
    setAnimating(true);
    setTimeout(() => {
      setStep(index);
      setAnimating(false);
    }, 200);
  }

  function next() {
    if (step < total - 1) goTo(step + 1);
  }

  function prev() {
    if (step > 0) goTo(step - 1);
  }

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [step, animating]);

  return (
    <section>
      <SectionHeading sub="Click through each feature to see what the Fantasy Cup has to offer.">
        EXPLORE THE APP
      </SectionHeading>

      <div ref={containerRef} className="relative max-w-3xl mx-auto">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-display text-[9px] text-gray-500">{step + 1} / {total}</span>
            <span className="font-display text-[9px]" style={{ color: current.color }}>{current.tagline}</span>
          </div>
          <div className="w-full h-1.5 bg-mk-dark rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${((step + 1) / total) * 100}%`,
                background: `linear-gradient(90deg, ${current.color}, ${current.color}88)`,
              }}
            />
          </div>
        </div>

        {/* Step card */}
        <div
          className={`
            rounded-2xl border p-6 sm:p-8 transition-all duration-300
            bg-gradient-to-br ${current.gradient} ${current.borderColor}
            ${animating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
          `}
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-5">
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-3xl sm:text-4xl"
              style={{ background: `${current.color}22`, border: `1px solid ${current.color}44` }}
            >
              {current.emoji}
            </div>
            <div>
              <h3 className="font-display text-sm sm:text-base text-white tracking-wide">
                {current.title}
              </h3>
              <p className="text-xs font-body mt-0.5" style={{ color: current.color }}>
                {current.tagline}
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm sm:text-base text-gray-300 font-body leading-relaxed mb-6">
            {current.description}
          </p>

          {/* Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {current.highlights.map((h, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 bg-mk-darker/60 rounded-lg px-3 py-2.5"
              >
                <span className="text-lg shrink-0">{h.icon}</span>
                <span className="text-xs text-gray-300 font-body font-medium">{h.text}</span>
              </div>
            ))}
          </div>

          {/* "Try it" link */}
          <button
            onClick={() => {
              localStorage.setItem('mk-cup-visited', 'true');
              navigate(current.route);
            }}
            className="inline-flex items-center gap-2 text-xs font-display px-4 py-2 rounded-lg transition-all hover:scale-105 active:scale-95"
            style={{
              background: `${current.color}22`,
              border: `1px solid ${current.color}55`,
              color: current.color,
            }}
          >
            CHECK IT OUT
            <span className="text-sm">{'>'}</span>
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          {/* Prev button */}
          <button
            onClick={prev}
            disabled={step === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-display text-[10px] transition-all ${
              step === 0
                ? 'text-gray-700 cursor-not-allowed'
                : 'text-gray-300 hover:text-white hover:bg-white/10 active:scale-95'
            }`}
          >
            <span>{'<'}</span> PREV
          </button>

          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((s, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-6 h-2'
                    : 'w-2 h-2 hover:opacity-80'
                }`}
                style={{
                  background: i === step ? current.color : `${current.color}44`,
                }}
                aria-label={`Go to step ${i + 1}: ${s.title}`}
              />
            ))}
          </div>

          {/* Next button */}
          <button
            onClick={next}
            disabled={step === total - 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-display text-[10px] transition-all ${
              step === total - 1
                ? 'text-gray-700 cursor-not-allowed'
                : 'text-gray-300 hover:text-white hover:bg-white/10 active:scale-95'
            }`}
          >
            NEXT <span>{'>'}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Main Component ───

export default function Welcome() {
  const navigate = useNavigate();

  function handleEnter() {
    localStorage.setItem('mk-cup-visited', 'true');
    navigate('/profile');
  }

  return (
    <div className="min-h-screen bg-mk-darker checkered-flag text-white">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 pt-16 pb-12 sm:pt-24 sm:pb-16 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-mk-blue/5 blur-[120px]" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-mk-purple/5 blur-[100px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6">
          <img
            src="/logo-mario-kart.svg"
            alt="Mario Kart Fantasy Cup"
            className="h-24 sm:h-32 md:h-40 w-auto animate-float drop-shadow-[0_0_40px_rgba(255,215,0,0.3)]"
          />
          <h1 className="font-display text-xs sm:text-sm md:text-base tracking-widest text-mk-gold">
            FANTASY FOOTBALL 2026
          </h1>
          <RainbowStrip />
          <EnterButton onClick={handleEnter} />
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 pb-20 space-y-20">
        {/* Feature Tour */}
        <FeatureTour />

        {/* The 3 Cups */}
        <section className="animate-slide-in">
          <SectionHeading sub="Three leagues. One champion. Every manager competes in all three.">
            THE 3 CUPS
          </SectionHeading>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {CUPS.map((cup) => (
              <div
                key={cup.name}
                className={`
                  rounded-2xl border p-6 transition-all duration-300
                  ${cup.border} ${cup.bg} ${cup.glow}
                  hover:-translate-y-1
                `}
              >
                <div className="text-4xl mb-3">{cup.emoji}</div>
                <h3 className="font-display text-xs sm:text-sm text-white mb-1">{cup.name}</h3>
                <span
                  className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mb-3 ${cup.border} ${cup.bg}`}
                >
                  {cup.type}
                </span>
                <p className="text-sm text-gray-300 font-body leading-relaxed">
                  {cup.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Scoring Breakdown */}
        <section>
          <SectionHeading sub="Points are earned per cup. Your total across all three determines the champion.">
            SCORING BREAKDOWN
          </SectionHeading>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <ScoringColumn title="REGULAR SEASON" color="#049CD8" data={REG_SEASON} />
            <ScoringColumn title="PLAYOFFS (TOP 6)" color="#43B047" data={PLAYOFF} />
            <ScoringColumn title="CONSOLATION (7-12)" color="#7B2D8E" data={CONSOLATION} />
          </div>

          {/* Bonus Points */}
          <div className="bg-mk-dark/60 rounded-xl border border-mk-gold/30 p-5 sm:p-6">
            <h4 className="font-display text-xs text-mk-gold mb-4 text-center">
              BONUS POINTS
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">🏎️</span>
                <div>
                  <p className="font-body font-bold text-sm text-white">Top Speed</p>
                  <p className="text-xs text-gray-400">+10 per league for the season-high weekly score</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">🚀</span>
                <div>
                  <p className="font-body font-bold text-sm text-white">Team Top Speed</p>
                  <p className="text-xs text-gray-400">+5 for the highest score across all leagues</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">🏆</span>
                <div>
                  <p className="font-body font-bold text-sm text-white">MVP Award</p>
                  <p className="text-xs text-gray-400">+50 for highest aggregate regular season W/L</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Power-Ups */}
        <section>
          <SectionHeading sub="Mario Kart-inspired items that boost your team or sabotage opponents. Strategy meets chaos.">
            POWER-UPS
          </SectionHeading>

          <div className="space-y-4">
            {POWER_UP_TIERS.map((tier) => (
              <div
                key={tier.tier}
                className={`rounded-xl border p-4 sm:p-5 ${tier.borderClass}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${tier.dotClass}`} />
                  <h4 className={`font-display text-[10px] sm:text-xs ${tier.textClass}`}>
                    {tier.tier.toUpperCase()}
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tier.examples.map((ex) => (
                    <div
                      key={ex.name}
                      className="flex items-start gap-2.5 bg-mk-darker/60 rounded-lg p-3"
                    >
                      <span className="text-xl shrink-0">{ex.icon}</span>
                      <div>
                        <p className="font-body font-bold text-xs text-white">{ex.name}</p>
                        <p className="text-[11px] text-gray-400 leading-snug">{ex.effect}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 bg-mk-accent/40 rounded-xl border border-mk-blue/20 px-5 py-4 text-center">
            <p className="text-sm text-gray-300 font-body">
              <span className="text-mk-yellow font-bold">📦 </span>
              Power-ups auto-roll every Tuesday. Deploy before Thursday Night Football kickoff.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <SectionHeading sub="Everything you need to know before hitting the track.">
            FAQ
          </SectionHeading>

          <div className="space-y-3 max-w-3xl mx-auto">
            {FAQ_ITEMS.map((item) => (
              <FAQItem key={item.q} item={item} />
            ))}
          </div>
        </section>

        {/* Footer CTA */}
        <section className="text-center space-y-4 pb-4">
          <RainbowStrip />
          <div className="pt-6">
            <EnterButton onClick={handleEnter} />
          </div>
          <p className="text-xs text-gray-600 font-body">Powered by Sleeper API</p>
        </section>
      </div>
    </div>
  );
}
