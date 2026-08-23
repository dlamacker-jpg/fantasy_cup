import { POWER_UPS, POWER_UP_RULES, POWER_UP_ACQUISITION, POWER_UP_MECHANICS, TIER_CONFIG } from '../data/leagueConfig';
import { POWER_UP_ICON_MAP } from '../components/PowerUpIcons';
import { ItemBoxSVG, RainbowRoadDivider } from '../components/RacingDecorations';

// Group power-ups by tier
function groupByTier(powerUps) {
  const groups = {};
  powerUps.forEach((pu) => {
    if (!groups[pu.tier]) groups[pu.tier] = [];
    groups[pu.tier].push(pu);
  });
  return Object.entries(groups)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([tier, items]) => ({ tier: Number(tier), items }));
}

// Condensed effect text for the tier-grouped view
const SHORT_EFFECTS = {
  'Mushroom':           '+5 pts to your score',
  'Green Shell':        '50% chance to subtract -5 pts from opponent',
  'Triple Green Shell': '3 shots across leagues (50% each)',
  'Red Shell':          'Guaranteed -5 pts from opponent',
  'Triple Red Shell':   '3 guaranteed shots (-5 each)',
  'Bullet Bill':        '+10 pts to your score',
  'Ghost':              "Steal a random team's power-up",
  'Star':               'Immunity + 5 pts',
  'Lightning':          '-5 pts to everyone (except Star holders)',
  'Super Horn':         'All players guaranteed to hit projections',
  "Kimek's Magic":      'Change your matchup to any team',
  'Blue Spiked Shell':  "Force bench an opponent's starter",
  'Warp Pipe':          'Swap a bench player for a starter (retro)',
};

// Tier border/bg styles for the grouped cards
const TIER_CARD_STYLES = {
  1: 'border-gray-600/50 bg-gray-900/60',
  2: 'border-green-500/40 bg-green-950/40',
  3: 'border-blue-500/40 bg-blue-950/40',
  4: 'border-purple-500/40 bg-purple-950/40',
  5: 'border-yellow-500/40 bg-yellow-950/40',
};

const TIER_DOT_COLORS = {
  1: 'bg-gray-400',
  2: 'bg-green-400',
  3: 'bg-blue-400',
  4: 'bg-purple-400',
  5: 'bg-yellow-400',
};

export default function PowerUps() {
  const tierGroups = groupByTier(POWER_UPS);

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="font-display text-xl md:text-2xl rainbow-text mb-2">POWER-UPS</h2>
        <p className="text-gray-400 text-sm font-body max-w-md mx-auto">
          Mario Kart-inspired items that boost your team or sabotage opponents. Strategy meets chaos.
        </p>
      </div>

      {/* Tier-Grouped Power-Ups */}
      <div className="space-y-5 mb-10 max-w-3xl mx-auto">
        {tierGroups.map(({ tier, items }) => {
          const config = TIER_CONFIG[tier] || TIER_CONFIG[1];
          return (
            <div
              key={tier}
              className={`rounded-2xl border p-5 ${TIER_CARD_STYLES[tier]}`}
            >
              {/* Tier Header */}
              <div className="flex items-center gap-2 mb-4">
                <span className={`w-2.5 h-2.5 rounded-full ${TIER_DOT_COLORS[tier]}`} />
                <h3 className={`font-display text-sm tracking-wider ${config.textClass}`}>
                  {config.name.toUpperCase()}
                </h3>
              </div>

              {/* Power-Up Items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((pu) => {
                  const IconComponent = POWER_UP_ICON_MAP[pu.name];
                  return (
                    <div
                      key={pu.name}
                      className="flex items-center gap-3 bg-black/30 rounded-xl px-3 py-2.5"
                    >
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                        {IconComponent ? (
                          <IconComponent size={32} />
                        ) : (
                          <span className="text-2xl">{pu.icon}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-body font-bold text-white text-xs leading-tight">{pu.name}</p>
                        <p className="text-[11px] text-gray-400 leading-snug mt-0.5">
                          {SHORT_EFFECTS[pu.name] || pu.effect}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Timing Banner */}
      <div className="max-w-3xl mx-auto mb-10">
        <div className="rounded-xl bg-mk-dark/80 border border-white/10 py-3 px-4 text-center">
          <p className="text-sm text-gray-300 font-body">
            <span className="mr-1">🎲</span>
            Power-ups auto-roll every Tuesday. Deploy before Thursday Night Football kickoff.
          </p>
        </div>
      </div>

      <RainbowRoadDivider className="mb-10" />

      {/* Rules Section */}
      <div className="bg-mk-dark/80 rounded-2xl border border-white/10 p-6 md:p-8 max-w-3xl mx-auto">
        <h3 className="font-display text-sm text-mk-blue mb-4">RULES & MECHANICS</h3>
        <div className="space-y-3">
          {POWER_UP_RULES.map((rule, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="text-mk-yellow font-bold text-sm mt-0.5 flex-shrink-0">{i + 1}.</span>
              <p className="text-sm text-gray-300 leading-relaxed">{rule}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-white/10">
          <h4 className="font-body font-bold text-sm text-gray-300 mb-2">How to Acquire Power-Up Rolls (Per League):</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-400">
            {POWER_UP_ACQUISITION.map((method, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 h-5 inline-flex items-center justify-center rounded bg-mk-blue/20 text-[10px]">{i + 1}</span>
                {method}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10">
          <h4 className="font-body font-bold text-sm text-gray-300 mb-2">Weekly Flow:</h4>
          <div className="space-y-2">
            {POWER_UP_MECHANICS.map((step, i) => (
              <div key={i} className="flex gap-3 items-start text-sm text-gray-400">
                <span className="w-5 h-5 flex-shrink-0 inline-flex items-center justify-center rounded bg-mk-yellow/20 text-[10px] text-mk-yellow font-bold">{i + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
