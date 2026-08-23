import { useState } from 'react';
import { RainbowRoadDivider } from '../components/RacingDecorations';

const SECTIONS = [
  { id: 'getting-started', label: 'Getting Started', emoji: '🏁' },
  { id: 'admin-panel', label: 'Admin Panel', emoji: '⚙️' },
  { id: 'power-up-manager', label: 'Power-Up Manager', emoji: '🎲' },
  { id: 'weekly-workflow', label: 'Weekly Workflow', emoji: '📅' },
  { id: 'password-resets', label: 'Password Resets', emoji: '🔑' },
  { id: 'quick-reference', label: 'Quick Reference', emoji: '📋' },
];

function SectionNav({ active, onSelect }) {
  return (
    <div className="flex gap-2 flex-wrap justify-center mb-8">
      {SECTIONS.map(s => (
        <button
          key={s.id}
          onClick={() => {
            onSelect(s.id);
            document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            active === s.id
              ? 'bg-mk-blue text-white'
              : 'bg-mk-dark text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          {s.emoji} {s.label}
        </button>
      ))}
    </div>
  );
}

function Step({ num, children }) {
  return (
    <div className="flex gap-3 items-start mb-2">
      <span className="w-6 h-6 flex-shrink-0 inline-flex items-center justify-center rounded-lg bg-mk-blue/20 text-mk-blue text-xs font-bold">{num}</span>
      <p className="text-sm text-gray-300">{children}</p>
    </div>
  );
}

function Tip({ children }) {
  return (
    <div className="flex gap-2 items-start mt-3 mb-4 ml-9 border-l-2 border-mk-gold/50 pl-3">
      <p className="text-xs text-gray-400 italic"><span className="text-mk-gold font-bold not-italic">TIP:</span> {children}</p>
    </div>
  );
}

function Warning({ children }) {
  return (
    <div className="flex gap-2 items-start mt-3 mb-4 ml-9 border-l-2 border-red-500/50 pl-3">
      <p className="text-xs text-gray-400 italic"><span className="text-red-400 font-bold not-italic">WARNING:</span> {children}</p>
    </div>
  );
}

function SectionCard({ id, title, emoji, children }) {
  return (
    <div id={id} className="scroll-mt-24 mb-8">
      <div className="bg-mk-dark/80 rounded-2xl border border-white/10 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl">{emoji}</span>
          <h2 className="font-display text-sm md:text-base text-mk-blue tracking-wider">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}

function SubSection({ title, children }) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="font-body font-bold text-white text-sm mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-mk-blue" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function PhaseCard({ icon, name, desc, color }) {
  return (
    <div className={`flex items-start gap-2 bg-mk-darker/60 rounded-lg p-2.5 border border-white/5`}>
      <span className="text-sm">{icon}</span>
      <div>
        <p className={`text-xs font-bold ${color}`}>{name}</p>
        <p className="text-[11px] text-gray-500">{desc}</p>
      </div>
    </div>
  );
}

export default function CommishGuide() {
  const [activeSection, setActiveSection] = useState('getting-started');

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <span className="text-5xl mb-3 block">👑</span>
        <h1 className="font-display text-xl md:text-2xl rainbow-text mb-2">COMMISSIONER GUIDE</h1>
        <p className="text-gray-400 text-sm font-body">How to manage the Mario Kart Fantasy Cup site</p>
      </div>

      <SectionNav active={activeSection} onSelect={setActiveSection} />

      {/* ─── GETTING STARTED ─── */}
      <SectionCard id="getting-started" title="GETTING STARTED" emoji="🏁">
        <SubSection title="Logging In">
          <Step num={1}>Go to <span className="text-mk-blue font-bold">mariokartcup.empirefantasy.football</span></Step>
          <Step num={2}>Click <span className="text-white font-bold">"Log In"</span> in the top-right corner (or "My Profile" in the nav)</Step>
          <Step num={3}>Tap your character from the grid</Step>
          <Step num={4}>Enter your password</Step>
          <Tip>Your login persists across tabs and browser sessions. You only need to log in once.</Tip>
        </SubSection>

        <SubSection title="Admin Access">
          <p className="text-sm text-gray-300 mb-2">
            Commissioners have the <span className="text-mk-blue font-bold">admin</span> role, which unlocks the Admin Panel and all commissioner tools. This activates automatically when you log in — no setup needed.
          </p>
          <p className="text-sm text-gray-400">
            Demar (Donkey Kong) has <span className="text-purple-400">super_admin</span>, which adds a few extra destructive options like removing power-ups from the config editor.
          </p>
        </SubSection>
      </SectionCard>

      {/* ─── ADMIN PANEL ─── */}
      <SectionCard id="admin-panel" title="ADMIN PANEL OVERVIEW" emoji="⚙️">
        <p className="text-sm text-gray-300 mb-5">
          Navigate to <span className="text-white font-bold">Admin Panel</span> from the nav menu (under "League Intel" dropdown). The panel has 5 main tabs:
        </p>

        <SubSection title="Data Overview">
          <p className="text-sm text-gray-400">Shows the scoring breakdown (regular season, playoffs, bonuses) and live bonus awards — Top Speed per league, Team Top Speed, and MVP. Read-only, auto-calculated from Sleeper data.</p>
        </SubSection>

        <SubSection title="Power-Up Manager">
          <p className="text-sm text-gray-400">The main commissioner tool. Has its own 6 sub-tabs — covered in detail in the next section.</p>
        </SubSection>

        <SubSection title="Manual Adjustments">
          <p className="text-sm text-gray-400">A table with every racer and input fields for point adjustments per league (Mushroom, Flower, Star) plus a notes column. Use for power-up effects, penalties, or corrections that don't come from Sleeper.</p>
        </SubSection>

        <SubSection title="Export">
          <p className="text-sm text-gray-400"><span className="text-white">Export JSON</span> downloads all current standings, playoff results, and bonus data. <span className="text-white">Refresh from Sleeper</span> forces a fresh data pull.</p>
        </SubSection>

        <SubSection title="League Links">
          <p className="text-sm text-gray-400">Direct links to all three Sleeper leagues with their IDs. Quick access.</p>
        </SubSection>
      </SectionCard>

      {/* ─── POWER-UP MANAGER ─── */}
      <SectionCard id="power-up-manager" title="POWER-UP MANAGER" emoji="🎲">
        <p className="text-sm text-gray-300 mb-5">
          This is where you'll spend most of your time. It has 6 sub-tabs inside the Power-Up Manager:
        </p>

        <SubSection title="Commissioner Tab">
          <p className="text-sm text-gray-400 mb-4">Your main control center with 4 sections:</p>

          {/* Week Phase */}
          <div className="mb-5">
            <h4 className="text-xs font-bold text-mk-gold uppercase tracking-wider mb-3 ml-4">Week Phase</h4>
            <p className="text-sm text-gray-400 mb-3 ml-4">Controls what phase the current week is in. Click any phase button to advance:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 ml-4">
              <PhaseCard icon="🏁" name="Preseason" desc="Seed starter items, then advance" color="text-yellow-400" />
              <PhaseCard icon="🔒" name="Lock" desc="Scores finalizing. No deploys" color="text-red-400" />
              <PhaseCard icon="🎲" name="Assignment" desc="Auto-roll runs. Grant overrides here" color="text-blue-400" />
              <PhaseCard icon="🚀" name="Deployment" desc="Racers deploy before kickoff" color="text-green-400" />
              <PhaseCard icon="🎯" name="Resolution" desc="Deployments resolve randomly" color="text-purple-400" />
              <PhaseCard icon="✅" name="Complete" desc="Week finalized" color="text-gray-400" />
            </div>
            <Tip>Phase is informational — it coordinates the weekly flow but doesn't block auto-roll or resolution triggers.</Tip>
          </div>

          {/* Starter Items */}
          <div className="mb-5">
            <h4 className="text-xs font-bold text-mk-gold uppercase tracking-wider mb-3 ml-4">Starter Items (Seed)</h4>
            <div className="ml-4">
              <p className="text-sm text-gray-400 mb-2">Before Week 1, every racer gets 1 random starter power-up.</p>
              <Step num={1}>Click <span className="text-white font-bold">"Seed Starter Items"</span> to distribute</Step>
              <Step num={2}>The system shows what each racer got</Step>
              <Step num={3}>If you need to redo it, click <span className="text-white font-bold">"Re-Seed (Force)"</span></Step>
              <Warning>"Reset All Power-Ups" wipes ALL inventories, history, and feed. Use only for a completely fresh start.</Warning>
            </div>
          </div>

          {/* Grant */}
          <div className="mb-5">
            <h4 className="text-xs font-bold text-mk-gold uppercase tracking-wider mb-3 ml-4">Grant Power-Up</h4>
            <div className="ml-4">
              <p className="text-sm text-gray-400 mb-2">Manually give any racer a specific power-up (bypasses auto-roll):</p>
              <Step num={1}>Select the racer from the character grid</Step>
              <Step num={2}>Pick the power-up from the list</Step>
              <Step num={3}>Add an optional reason (logged for transparency)</Step>
              <Step num={4}>Click <span className="text-white font-bold">"Confirm Grant"</span></Step>
              <Tip>Racers with 3/3 inventory slots are greyed out — they must use or hold an item first.</Tip>
            </div>
          </div>

          {/* Revoke */}
          <div className="mb-5">
            <h4 className="text-xs font-bold text-mk-gold uppercase tracking-wider mb-3 ml-4">Revoke Power-Up</h4>
            <p className="text-sm text-gray-400 ml-4">Remove a power-up from any racer's inventory. Each item has a "Revoke" button. Add a reason if you want. All revokes are logged.</p>
          </div>

          {/* Action Log */}
          <div>
            <h4 className="text-xs font-bold text-mk-gold uppercase tracking-wider mb-3 ml-4">Action Log</h4>
            <p className="text-sm text-gray-400 ml-4">Shows all commissioner overrides — grants, revokes, and phase changes — with timestamps and reasons. This is your audit trail.</p>
          </div>
        </SubSection>

        <RainbowRoadDivider className="my-6 opacity-40" />

        <SubSection title="Eligibility & Auto-Roll Tab">
          <p className="text-sm text-gray-400 mb-3">Determine who earned power-up rolls each week and trigger the rolling:</p>
          <Step num={1}>Select the week number</Step>
          <Step num={2}>Click <span className="text-white font-bold">"Detect Eligibility"</span> — shows who won each criteria per league</Step>
          <div className="ml-9 mb-3 space-y-1">
            <p className="text-xs text-gray-500">• Best starting roster accuracy</p>
            <p className="text-xs text-gray-500">• Largest margin of victory</p>
            <p className="text-xs text-gray-500">• Worst team optimized score (reverse MPF)</p>
            <p className="text-xs text-gray-500">• Top player scorer (including benches)</p>
          </div>
          <Step num={3}>Review the eligible owners and their roll counts</Step>
          <Step num={4}>Click <span className="text-white font-bold">"Auto-Roll All"</span> to execute the rolls</Step>
          <Tip>Auto-roll is idempotent — it won't double-roll if it already ran. The system also auto-runs every Tuesday via cron.</Tip>
        </SubSection>

        <SubSection title="All Inventories Tab">
          <p className="text-sm text-gray-400">Read-only view of every racer's current power-up inventory (up to 3 slots each). Quick way to see who has what.</p>
        </SubSection>

        <SubSection title="Resolution Tab">
          <p className="text-sm text-gray-400 mb-3">Handles end-of-week power-up deployment resolution:</p>
          <Step num={1}>Auto-detects the current NFL week</Step>
          <Step num={2}>Shows pending deployments (what racers have queued)</Step>
          <Step num={3}>Click <span className="text-white font-bold">"Resolve"</span> to process them in random order</Step>
          <p className="text-sm text-gray-400 mt-2">Resolution shuffles deployment order randomly, then processes sequentially. Star immunity blocks shells, held triple shells block incoming, etc.</p>
          <Tip>Resolution auto-triggers at Thursday kickoff (8:15 PM ET). Use the manual button for early resolution or re-runs.</Tip>
        </SubSection>

        <SubSection title="Activity Feed Tab">
          <p className="text-sm text-gray-400">Week-by-week summary of all power-up activity grouped by team. Shows earned items, deployed items, targets, shot results, and point impacts. Use this for the Discord power-ups channel updates.</p>
        </SubSection>

        <SubSection title="Config Editor Tab">
          <p className="text-sm text-gray-400 mb-2">Edit power-up definitions — name, tier, probability, effect text, type, holdable flag, hit chance, and shots. The probability bar must sum to exactly 100%.</p>
          <p className="text-sm text-gray-400">You can also adjust league rules: max inventory slots, max rolls/week, max deploys/week, and playoff start week.</p>
          <Warning>Changes here affect how the auto-roll system works. The "Remove" button is super_admin only.</Warning>
        </SubSection>
      </SectionCard>

      {/* ─── WEEKLY WORKFLOW ─── */}
      <SectionCard id="weekly-workflow" title="WEEKLY WORKFLOW" emoji="📅">
        <p className="text-sm text-gray-300 mb-5">Here's the typical weekly flow during the regular season:</p>

        <SubSection title="Tuesday — Roll Day">
          <Step num={1}>Auto-roll runs automatically (or manually via Eligibility tab)</Step>
          <Step num={2}>Go to Commissioner {'>'} Eligibility & Auto-Roll to review who earned rolls</Step>
          <Step num={3}>Check the Activity Feed to see what everyone got</Step>
          <Step num={4}>DM each racer their new power-ups (also visible in their "My Power-Ups" page when logged in)</Step>
        </SubSection>

        <SubSection title="Wednesday (by EOD) — Deploy Deadline">
          <Step num={1}>Racers notify you which power-ups they want to deploy</Step>
          <Step num={2}>Racers can deploy from their "My Power-Ups" page on the site</Step>
          <Step num={3}>If they don't notify by EOD Wednesday, assume "don't use"</Step>
        </SubSection>

        <SubSection title="Thursday — Resolution Day">
          <Step num={1}>Review pending deployments in the Resolution tab</Step>
          <Step num={2}>Resolution auto-triggers at kickoff (8:15 PM ET)</Step>
          <Step num={3}>Post results to the Discord power-ups channel</Step>
          <Step num={4}>Apply any point adjustments to Sleeper as needed</Step>
        </SubSection>

        <SubSection title="Preseason (One-Time)">
          <Step num={1}>Go to Commissioner {'>'} Week Phase and set to "Preseason"</Step>
          <Step num={2}>Click "Seed Starter Items" to give everyone their first power-up</Step>
          <Step num={3}>Advance the phase to "Assignment" when ready for Week 1</Step>
        </SubSection>
      </SectionCard>

      {/* ─── PASSWORD RESETS ─── */}
      <SectionCard id="password-resets" title="PASSWORD RESETS" emoji="🔑">
        <p className="text-sm text-gray-300 mb-3">
          If a racer forgets their password, ask Demar to reset it. Password resets are handled through the backend API and require super_admin access.
        </p>
        <p className="text-sm text-gray-400 mb-2">
          Once reset, the racer can set a new password on their next login — the system treats them as a first-time user.
        </p>
        <Tip>The racer just taps their character and enters a new password (4+ characters). No special setup needed on their end.</Tip>
      </SectionCard>

      {/* ─── QUICK REFERENCE ─── */}
      <SectionCard id="quick-reference" title="QUICK REFERENCE" emoji="📋">
        <SubSection title="Key URLs">
          <div className="space-y-2 ml-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-24">Site</span>
              <span className="text-xs text-mk-blue font-bold">mariokartcup.empirefantasy.football</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-24">LeagueSafe</span>
              <span className="text-xs text-green-400 font-bold">leaguesafe.com/league/4454337</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-24">Discord</span>
              <span className="text-xs text-indigo-400 font-bold">discord.gg/DbZ44haYW</span>
            </div>
          </div>
        </SubSection>

        <SubSection title="Power-Up Slots">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 ml-4">
            <div className="bg-mk-darker/60 rounded-lg p-3 border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase">Max Inventory</p>
              <p className="text-sm text-white font-bold">3 slots</p>
            </div>
            <div className="bg-mk-darker/60 rounded-lg p-3 border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase">Max Rolls/Week</p>
              <p className="text-sm text-white font-bold">3</p>
            </div>
            <div className="bg-mk-darker/60 rounded-lg p-3 border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase">Max Deploys/Week</p>
              <p className="text-sm text-white font-bold">1</p>
            </div>
            <div className="bg-mk-darker/60 rounded-lg p-3 border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase">Deploy Deadline</p>
              <p className="text-sm text-white font-bold">EOD Wednesday</p>
            </div>
            <div className="bg-mk-darker/60 rounded-lg p-3 border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase">Resolution</p>
              <p className="text-sm text-white font-bold">Thu Kickoff</p>
            </div>
            <div className="bg-mk-darker/60 rounded-lg p-3 border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase">Starter Items</p>
              <p className="text-sm text-white font-bold">1 per racer</p>
            </div>
          </div>
        </SubSection>

        <SubSection title="Auto-Triggers">
          <div className="space-y-2 ml-4">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-xs text-gray-400"><span className="text-white font-bold">Auto-Roll:</span> Every Tuesday (cron job)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="text-xs text-gray-400"><span className="text-white font-bold">Auto-Resolve:</span> Thursday 8:15 PM ET (kickoff)</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 ml-4">Both can be manually triggered from the admin panel at any time.</p>
        </SubSection>

        <SubSection title="All 13 Power-Ups">
          <div className="space-y-2 ml-4">
            <div className="flex items-start gap-2">
              <span className="text-[10px] text-gray-500 bg-gray-500/20 rounded px-1.5 py-0.5 flex-shrink-0 mt-0.5">Common</span>
              <p className="text-xs text-gray-400">Mushroom (+5 pts), Green Shell (50% hit, -5 pts)</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[10px] text-green-400 bg-green-500/20 rounded px-1.5 py-0.5 flex-shrink-0 mt-0.5">Uncommon</span>
              <p className="text-xs text-gray-400">Triple Green Shell (3 shots), Red Shell (guaranteed -5)</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[10px] text-blue-400 bg-blue-500/20 rounded px-1.5 py-0.5 flex-shrink-0 mt-0.5">Rare</span>
              <p className="text-xs text-gray-400">Triple Red Shell (3 guaranteed), Bullet Bill (+10), Ghost (steal item)</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[10px] text-purple-400 bg-purple-500/20 rounded px-1.5 py-0.5 flex-shrink-0 mt-0.5">Epic</span>
              <p className="text-xs text-gray-400">Star (immunity +5), Lightning (-5 all), Super Horn (hit projections)</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[10px] text-yellow-400 bg-yellow-500/20 rounded px-1.5 py-0.5 flex-shrink-0 mt-0.5">Legendary</span>
              <p className="text-xs text-gray-400">Kimek's Magic (change matchup), Blue Spiked Shell (bench starter), Warp Pipe (swap bench/starter)</p>
            </div>
          </div>
        </SubSection>
      </SectionCard>

      <div className="text-center py-6">
        <p className="text-xs text-gray-600 italic">Questions? Hit up Demar on Discord or text.</p>
      </div>
    </div>
  );
}
