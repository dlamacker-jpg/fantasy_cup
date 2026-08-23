import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useSleeper } from './hooks/useSleeper';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { SeasonProvider, useSeason } from './hooks/SeasonContext';
import SeasonToggle from './components/SeasonToggle';
import SoundToggle from './components/SoundToggle';
import { SoundProvider } from './hooks/useSoundEffects';
import { DesktopNav, MobileMenu } from './components/NavMenu';
import Leaderboard from './pages/Leaderboard';
import CupDetail from './pages/CupDetail';
import MVPPage from './pages/MVPPage';
import BonusPage from './pages/BonusPage';
import PowerUps from './pages/PowerUps';
import MyPowerUps from './pages/MyPowerUps';
import DraftPage from './pages/DraftPage';
import AdminPage from './pages/AdminPage';
import SackoPage from './pages/SackoPage';
import RecordBook from './pages/RecordBook';
import H2HPage from './pages/H2HPage';
import SchedulePage from './pages/SchedulePage';
import PowerRankings from './pages/PowerRankings';
import WeeklyRecap from './pages/WeeklyRecap';
import TrophyRoom from './pages/TrophyRoom';
import BylawsPage from './pages/BylawsPage';
import PlayerProfile from './pages/PlayerProfile';
import TopPerformers from './pages/TopPerformers';
import TeamRosters from './pages/TeamRosters';
import StandingsPage from './pages/StandingsPage';
import Welcome from './pages/Welcome';
import DepartedPage from './pages/DepartedPage';
import MembersPage from './pages/MembersPage';
import RacerPage from './pages/RacerPage';
import NewsletterList from './pages/NewsletterList';
import NewsletterPage from './pages/NewsletterPage';
import CommishGuide from './pages/CommishGuide';
import PostWeekSummary from './pages/PostWeekSummary';
import { FinishLineBanner } from './components/RacingDecorations';

function UserBadge() {
  const { user, logout } = useAuth();
  if (!user) return (
    <Link to="/profile" className="text-xs text-gray-400 hover:text-white transition px-2 py-1 border border-white/10 rounded-lg">
      Log In
    </Link>
  );
  return (
    <div className="flex items-center gap-1.5">
      <Link to="/profile" className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white transition px-2 py-1 border border-white/10 rounded-lg">
        <span className="w-2 h-2 rounded-full bg-green-400"></span>
        {user.character}
      </Link>
      <button onClick={logout} className="text-[10px] text-gray-500 hover:text-red-400 transition px-1.5 py-1" title="Log out">
        ✕
      </button>
    </div>
  );
}

function AuthGate({ children }) {
  const { loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  // First-time visitor → welcome splash (one-time only)
  if (!localStorage.getItem('mk-cup-visited') && location.pathname !== '/welcome') {
    return <Navigate to="/welcome" replace />;
  }
  return children;
}

function AppInner() {
  const { season } = useSeason();
  const sleeper = useSleeper(season);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-mk-darker checkered-flag">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-mk-dark border-b border-white/10">
        <div className="rainbow-road h-1" />
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group shrink-0">
              <img
                src="/logo-mario-kart.svg"
                alt="Mario Kart Cup"
                className="h-8 sm:h-10 lg:h-12 w-auto max-w-[140px] sm:max-w-[180px] lg:max-w-none transition-transform group-hover:scale-105"
              />
              <p className="text-[10px] md:text-xs text-gray-400 font-body font-medium tracking-wider hidden md:block lg:hidden xl:block">
                FANTASY FOOTBALL {season}
              </p>
            </Link>

            {/* Desktop Nav — grouped dropdowns */}
            <DesktopNav />

            {/* Right-side controls */}
            <div className="flex items-center gap-2 shrink-0">
              <SeasonToggle />
              <SoundToggle />
              <UserBadge />
              {/* Mobile hamburger button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-gray-300 hover:text-white rounded-lg hover:bg-white/10 transition"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile slide-out menu */}
      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {sleeper.error && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded-xl text-red-200 text-sm">
            ⚠️ Error loading data: {sleeper.error}
            <button onClick={sleeper.refresh} className="ml-3 underline hover:text-white">Retry</button>
          </div>
        )}

        <AuthGate>
        <Routes>
          <Route path="/" element={
            localStorage.getItem('mk-cup-visited')
              ? <Leaderboard sleeper={sleeper} />
              : <Navigate to="/welcome" replace />
          } />
          <Route path="/cup/:cupKey" element={<CupDetail sleeper={sleeper} />} />
          <Route path="/mvp" element={<MVPPage sleeper={sleeper} />} />
          <Route path="/bonus" element={<BonusPage sleeper={sleeper} />} />
          <Route path="/powerups" element={<PowerUps />} />
          <Route path="/my-powerups" element={<MyPowerUps />} />
          <Route path="/schedule" element={<SchedulePage sleeper={sleeper} />} />
          <Route path="/sacko" element={<SackoPage sleeper={sleeper} />} />
          <Route path="/rankings" element={<PowerRankings sleeper={sleeper} />} />
          <Route path="/recap" element={<WeeklyRecap sleeper={sleeper} />} />
          <Route path="/trophies" element={<TrophyRoom />} />
          <Route path="/records" element={<RecordBook sleeper={sleeper} />} />
          <Route path="/h2h" element={<H2HPage />} />
          <Route path="/draft" element={<DraftPage />} />
          <Route path="/admin" element={<AdminPage sleeper={sleeper} />} />
          <Route path="/bylaws" element={<BylawsPage />} />
          <Route path="/profile" element={<PlayerProfile sleeper={sleeper} />} />
          <Route path="/performers" element={<TopPerformers sleeper={sleeper} />} />
          <Route path="/rosters" element={<TeamRosters />} />
          <Route path="/standings" element={<StandingsPage sleeper={sleeper} />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/departed" element={<DepartedPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/racer/:slug" element={<RacerPage sleeper={sleeper} />} />
          <Route path="/newsletter" element={<NewsletterList />} />
          <Route path="/newsletter/:slug" element={<NewsletterPage />} />
          <Route path="/commish-guide" element={<CommishGuide />} />
          <Route path="/week-summary" element={<PostWeekSummary sleeper={sleeper} />} />
          <Route path="*" element={
            <div className="text-center py-20">
              <span className="text-6xl block mb-4">🍌</span>
              <h1 className="font-display text-xl text-white mb-2">WRONG TURN!</h1>
              <p className="text-gray-400 font-body text-sm mb-6">You slipped on a banana peel and ended up off the track.</p>
              <a href="/" className="inline-block px-6 py-3 bg-mk-blue text-white font-display text-xs rounded-xl hover:bg-mk-blue/80 transition">BACK TO THE RACE</a>
            </div>
          } />
        </Routes>
        </AuthGate>
      </main>

      {/* Footer */}
      <footer className="mt-12">
        <FinishLineBanner className="mb-0" />
        <div className="border-t border-white/10 py-6">
          <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-500">
            <p>Mario Kart Fantasy Cup {season} — Powered by Sleeper API</p>
            {sleeper.lastUpdated && (
              <p className="mt-1">Last updated: {sleeper.lastUpdated.toLocaleTimeString()}</p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <SoundProvider>
      <SeasonProvider>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </SeasonProvider>
    </SoundProvider>
  );
}
