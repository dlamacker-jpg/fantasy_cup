import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSound } from '../hooks/useSoundEffects';
import { useAuth } from '../hooks/useAuth';

// ─── Menu structure ───
// Admin item is gated by role — see useNavGroups()
const BASE_NAV_GROUPS = [
  {
    label: 'Race',
    emoji: '🏁',
    items: [
      { to: '/', label: 'Leaderboard', emoji: '🏆' },
      { to: '/rankings', label: 'Rankings', emoji: '⚡' },
      { to: '/recap', label: 'Recap', emoji: '📰' },
      { to: '/newsletter', label: 'Newsletter', emoji: '📬' },
      { to: '/sacko', label: 'Sacko', emoji: '🍌' },
      { to: '/mvp', label: 'MVP', emoji: '🎖️' },
      { to: '/bonus', label: 'Bonus', emoji: '🎁' },
    ],
  },
  {
    label: 'Cups',
    emoji: '🏅',
    items: [
      { to: '/cup/mushroom', label: 'Mushroom', emoji: '🍄' },
      { to: '/cup/flower', label: 'Flower', emoji: '🌼' },
      { to: '/cup/star', label: 'Star', emoji: '⭐' },
    ],
  },
  {
    label: 'Stats',
    emoji: '📊',
    items: [
      { to: '/standings', label: 'Advanced Stats', emoji: '📊' },
      { to: '/records', label: 'Records', emoji: '📜' },
      { to: '/h2h', label: 'H2H', emoji: '🏁' },
      { to: '/trophies', label: 'Trophies', emoji: '🏆' },
      { to: '/performers', label: 'Top Performers', emoji: '🏈' },
    ],
  },
  {
    label: 'My Profile',
    emoji: '👤',
    items: [
      { to: '/profile', label: 'My Profile', emoji: '👤' },
    ],
  },
  {
    label: 'Racers',
    emoji: '🏎️',
    items: [
      { to: '/members', label: 'Active Racers', emoji: '🏁' },
      { to: '/departed', label: 'Departed', emoji: '🪦' },
    ],
  },
  {
    label: 'League Intel',
    emoji: '🔍',
    items: [
      { to: '/schedule', label: 'Schedule', emoji: '📅' },
      { to: '/rosters', label: 'Rosters', emoji: '📋' },
      { to: '/powerups', label: 'Power-Ups', emoji: '🎮' },
      { to: '/draft', label: 'Draft', emoji: '🎯' },
      { to: '/bylaws', label: 'Bylaws', emoji: '📖' },
      // Admin entry injected dynamically for admins only
    ],
  },
  {
    label: 'Getting Started',
    emoji: '🚀',
    items: [
      { to: '/welcome', label: 'Getting Started', emoji: '🚀' },
    ],
  },
];

// Hook that returns nav groups with Admin conditionally included
function useNavGroups() {
  const { isAdmin } = useAuth();
  return useMemo(() => {
    if (!isAdmin) return BASE_NAV_GROUPS;
    // Clone the League Intel group and append Admin
    return BASE_NAV_GROUPS.map(group => {
      if (group.label !== 'League Intel') return group;
      return {
        ...group,
        items: [...group.items, { to: '/week-summary', label: 'Week Summary', emoji: '📊' }, { to: '/commish-guide', label: 'Commish Guide', emoji: '👑' }, { to: '/admin', label: 'Admin', emoji: '⚙️' }],
      };
    });
  }, [isAdmin]);
}

// ─── Desktop: dropdown menus on hover ───
function DesktopDropdown({ group }) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef(null);
  const { play } = useSound();
  const location = useLocation();

  const isGroupActive = group.items.some(item => {
    if (item.to === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.to);
  });

  const handleEnter = () => {
    clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  // Single-item groups link directly
  if (group.items.length === 1) {
    const item = group.items[0];
    return (
      <NavLink
        to={item.to}
        onClick={() => play('click')}
        className={({ isActive }) =>
          `px-3 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
            isActive
              ? 'bg-mk-blue text-white shadow-lg shadow-mk-blue/30'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`
        }
      >
        {item.emoji} {item.label}
      </NavLink>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1 ${
          isGroupActive
            ? 'bg-mk-blue text-white shadow-lg shadow-mk-blue/30'
            : 'text-gray-300 hover:text-white hover:bg-white/10'
        }`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {group.emoji} {group.label}
        <svg
          className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 py-1.5 bg-mk-dark border border-white/15 rounded-xl shadow-2xl shadow-black/50 min-w-[180px] z-50 animate-fade-in">
          {group.items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => { play('click'); setOpen(false); }}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'text-white bg-mk-blue/20 border-l-2 border-mk-blue'
                    : 'text-gray-300 hover:text-white hover:bg-white/10 border-l-2 border-transparent'
                }`
              }
            >
              <span className="text-base">{item.emoji}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export function DesktopNav() {
  const navGroups = useNavGroups();
  return (
    <nav className="hidden lg:flex items-center gap-1">
      {navGroups.map(group => (
        <DesktopDropdown key={group.label} group={group} />
      ))}
    </nav>
  );
}

// ─── Mobile: full-screen slide-out with collapsible sections ───
export function MobileMenu({ open, onClose }) {
  const [expandedGroup, setExpandedGroup] = useState(null);
  const { play } = useSound();
  const location = useLocation();
  const navGroups = useNavGroups();

  // Close on route change
  useEffect(() => {
    onClose();
  }, [location.pathname]);

  const toggleGroup = useCallback((label) => {
    setExpandedGroup(prev => prev === label ? null : label);
    play('tab');
  }, [play]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div className="fixed top-0 right-0 bottom-0 w-72 z-50 lg:hidden bg-mk-dark border-l border-white/10 shadow-2xl shadow-black/50 overflow-y-auto animate-slide-in-right">
        {/* Close button */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <span className="font-display text-xs text-mk-blue tracking-widest">NAVIGATION</span>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition rounded-lg hover:bg-white/10"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Menu groups */}
        <div className="py-2">
          {navGroups.map(group => {
            const isExpanded = expandedGroup === group.label;
            const isGroupActive = group.items.some(item => {
              if (item.to === '/') return location.pathname === '/';
              return location.pathname.startsWith(item.to);
            });

            // Single-item groups: direct link
            if (group.items.length === 1) {
              const item = group.items[0];
              return (
                <NavLink
                  key={group.label}
                  to={item.to}
                  onClick={() => { play('click'); onClose(); }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-5 py-3 text-sm font-semibold transition-all ${
                      isActive
                        ? 'text-white bg-mk-blue/15 border-l-3 border-mk-blue'
                        : 'text-gray-300 hover:text-white hover:bg-white/5 border-l-3 border-transparent'
                    }`
                  }
                >
                  <span className="text-base">{item.emoji}</span>
                  {item.label}
                </NavLink>
              );
            }

            return (
              <div key={group.label}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={`w-full flex items-center justify-between px-5 py-3 text-sm font-semibold transition-all ${
                    isGroupActive
                      ? 'text-white bg-mk-blue/10'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-base">{group.emoji}</span>
                    {group.label}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Submenu items */}
                {isExpanded && (
                  <div className="bg-black/20">
                    {group.items.map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => { play('click'); onClose(); }}
                        className={({ isActive }) =>
                          `flex items-center gap-3 pl-12 pr-5 py-2.5 text-sm font-medium transition-all ${
                            isActive
                              ? 'text-white bg-mk-blue/20 border-l-2 border-mk-blue'
                              : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                          }`
                        }
                      >
                        <span>{item.emoji}</span>
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
