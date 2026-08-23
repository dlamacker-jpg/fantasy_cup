// ─── Weekly Newsletter System ───
// Each newsletter is a structured object rendered by NewsletterPage.
// Sections are rendered in order. Type determines layout.

export const NEWSLETTERS = [
  {
    slug: 'preseason-2026',
    edition: 'Preseason Edition',
    title: 'The Starting Grid',
    subtitle: 'Season 3 is here. New faces. Old rivalries. One cup.',
    date: 'August 2026',
    season: 2026,
    coverEmoji: '🏁',
    sections: [
      {
        type: 'hero',
        title: 'Welcome to Season 3',
        body: `The engines are revving. The trash talk is flowing. And for the third consecutive year, 12 managers will battle across three leagues for Fantasy Cup supremacy.\n\nAfter two seasons of chaos — from Mario's historic 30-12 campaign to his equally historic collapse, from Koopa Troopa's legendary futility to Funky Kong's quiet dominance — we enter 2026 with fresh blood, unfinished business, and a whole lot of scores to settle.`,
      },
      {
        type: 'roster-moves',
        title: 'New Arrivals & Departures',
        arrivals: [
          {
            character: 'Waluigi',
            name: 'Josh Weinstein',
            slug: 'waluigi',
            headline: 'The New Villain',
            blurb: 'Replacing Jon Dinsdale\'s 29-55 Koopa Troopa disaster. The bar is on the floor — just don\'t go 2-12 in any single league and you\'ve already improved.',
          },
          {
            character: 'King Boo',
            name: 'Shay Melby',
            slug: 'king-boo',
            headline: 'The Ghost Reborn',
            blurb: 'Takes the King Boo mantle from Eric Schwickerath. Inheriting a 43-41 record is a double-edged sword — there\'s a legacy to live up to.',
          },
        ],
        departures: [
          {
            character: 'Koopa Troopa',
            name: 'Jon Dinsdale',
            slug: 'koopa-troopa',
            headline: 'The Slow Shell',
            blurb: '29-55 career record (34.5% win rate). Posted a 2-12 Star Cup — the worst single-league record in Cup history. Retreated into his shell one final time.',
          },
          {
            character: 'King Boo OG',
            name: 'Eric Schwickerath',
            slug: 'king-boo-og',
            headline: 'The Vanishing Act',
            blurb: '43-41 career record — the only departed member with a winning record. Proved you can win more than you lose and still not be missed.',
          },
        ],
      },
      {
        type: 'league-preview',
        title: 'The Three Cups',
        leagues: [
          {
            emoji: '🍄',
            name: 'Mushroom Cup',
            format: 'Standard',
            preview: 'The bread-and-butter league. Set your lineup, manage your waivers, and hope your gut calls pan out. Bowser dominated here in 2025 (11-3). Can anyone dethrone The Final Boss?',
          },
          {
            emoji: '🌼',
            name: 'Flower Cup',
            format: 'Best Ball',
            preview: 'No lineup decisions — your best players auto-slot each week. This is where draft skill shines. Funky Kong owns the Best Ball crown (11-3 in 2024). The format that rewards roster depth.',
          },
          {
            emoji: '⭐',
            name: 'Star Cup',
            format: 'Auction',
            preview: 'Budget your dollars. Build your roster. Live with your decisions. The auction format separates the strategists from the gamblers. Toad surprised everyone with a 10-4 run last year.',
          },
        ],
      },
      {
        type: 'power-rankings',
        title: 'Preseason Power Rankings',
        intro: 'Based on career performance, trajectory, and vibes. These will age poorly.',
        rankings: [
          { rank: 1, character: 'Funky Kong', name: 'Connor Johnson', record: '50-34', rationale: 'Best career win percentage in the league. Only manager above .500 in every single season. The standard.' },
          { rank: 2, character: 'Bowser', name: 'Jamison Thies', record: '47-37', rationale: 'Went from 21-21 to 26-16. The biggest year-over-year leap says the arrow is pointing straight up.' },
          { rank: 3, character: 'Wario', name: 'Drew Kahler', record: '46-37', rationale: 'The Commissioner doesn\'t just run the league — he competes in it. Two 23-win seasons of quiet excellence.' },
          { rank: 4, character: 'Toad', name: 'Ben Nutsch', record: '44-40', rationale: 'The wildcard. Can go 10-4 or 4-10 in the same season. If the ceiling shows up, watch out.' },
          { rank: 5, character: 'Dry Bones', name: 'Dan Housekeeper', record: '43-41', rationale: 'The comeback skeleton flipped 19-23 into 24-18. Momentum is real.' },
          { rank: 6, character: 'Mario', name: 'Lance Sovde', record: '43-41', rationale: 'Fell from 30-12 to 13-29. The question isn\'t whether he bounces back — it\'s whether the 2024 version was the fluke.' },
          { rank: 7, character: 'Luigi', name: 'Justin Harris', record: '42-41', rationale: 'Improved every season. The quiet climber. Player Two might finally have his year.' },
          { rank: 8, character: 'Donkey Kong', name: 'Demar Amacker', record: '41-43', rationale: 'Built the app AND jumped from 17-25 to 24-18. DK is trending up and has something to prove.' },
          { rank: 9, character: 'Yoshi', name: 'Nick Weinmeister', record: '39-45', rationale: 'Highest points-per-win suggests bad luck. If the bounces go his way, Yoshi could leap into the top half.' },
          { rank: 10, character: 'Princess Peach', name: 'Jordan Thies', record: '36-48', rationale: 'Going the wrong direction. Dropped from 19-23 to 17-25. The Thies family rivalry is not close.' },
          { rank: 11, character: 'King Boo', name: 'Shay Melby', record: '0-0', rationale: 'Rookie. Inherits a winning legacy but zero track record. The ghost could haunt — or get haunted.' },
          { rank: 12, character: 'Waluigi', name: 'Josh Weinstein', record: '0-0', rationale: 'Rookie. Replacing the worst record in Cup history means expectations are... manageable.' },
        ],
      },
      {
        type: 'bold-predictions',
        title: 'Bold Predictions',
        predictions: [
          { icon: '🔥', prediction: 'Mario bounces back above .500', detail: 'Lance posted the best season ever in 2024. That kind of talent doesn\'t just vanish. He\'ll finish at least 24-18.' },
          { icon: '💀', prediction: 'A rookie finishes top 6 in total Cup points', detail: 'Whether it\'s Waluigi or King Boo, one of the newcomers is going to surprise people.' },
          { icon: '🏆', prediction: 'Bowser three-peats an 11-3 league', detail: 'Jameson has the trajectory and the talent. He\'ll post at least one dominant league record again.' },
          { icon: '😤', prediction: 'The Thies family lead flips', detail: 'Jordan (36-48) has been getting smoked by Jameson (47-37). This is the year Peach closes the gap.' },
          { icon: '🎯', prediction: 'DK cracks the top 4', detail: 'Demar went from 17-25 to 24-18. Year three is where the leap becomes a landing.' },
          { icon: '👻', prediction: 'King Boo outperforms King Boo OG\'s pace', detail: 'Shay beats Eric\'s first-season 20-22 record. The ghost gets an upgrade.' },
        ],
      },
      {
        type: 'storylines',
        title: 'Storylines to Watch',
        items: [
          { emoji: '📉', title: 'The Mario Redemption Arc', body: 'Can Lance recover from the biggest single-season collapse in Cup history? Going 30-12 to 13-29 is the kind of fall that either breaks you or fuels the comeback tour of a lifetime.' },
          { emoji: '👊', title: 'Thies vs. Thies', body: 'Bowser leads Peach 47-37 to 36-48. That\'s an 11-game gap between brothers. Family dinners must be fun.' },
          { emoji: '🆕', title: 'Rookie Watch', body: 'Waluigi (Josh) and King Boo (Shay) enter the league as complete unknowns. Will fresh eyes and no bad habits be an advantage? Or will the veterans eat them alive?' },
          { emoji: '🦍', title: 'The App Builder\'s Revenge', body: 'Demar built the whole Fantasy Cup platform and went 17-25 in year one. After a 24-18 bounce back, year three is about proving he belongs in the top tier.' },
          { emoji: '🏄', title: 'Can Anyone Catch Funky Kong?', body: 'Connor\'s 50-34 career record sets the pace. He\'s never had a losing season. At what point do we just call him the GOAT?' },
        ],
      },
      {
        type: 'closing',
        title: 'See You on the Track',
        body: 'Drafts are coming. Power-ups are loading. The 2026 Fantasy Cup season is about to begin.\n\nStay tuned for Week 1 — the first weekly newsletter drops after the opening matchups.',
        signoff: '— The Fantasy Cup Newsletter',
      },
    ],
  },
];

export function getNewsletterBySlug(slug) {
  return NEWSLETTERS.find(n => n.slug === slug) || null;
}
