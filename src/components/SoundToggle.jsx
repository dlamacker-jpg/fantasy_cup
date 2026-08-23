import { useSound } from '../hooks/useSoundEffects';

/**
 * Compact sound on/off toggle button for the header.
 * Plays a quick "coin" sound when toggled on so users get immediate feedback.
 */
export default function SoundToggle({ className = '' }) {
  const { enabled, toggle, play } = useSound();

  const handleToggle = () => {
    if (!enabled) {
      // Turning ON — play a coin sound as feedback
      toggle();
      // Small delay so the context enables first
      setTimeout(() => play('coin'), 50);
    } else {
      toggle();
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
        enabled
          ? 'text-mk-gold bg-mk-gold/10 border border-mk-gold/30 hover:bg-mk-gold/20'
          : 'text-gray-500 bg-white/5 border border-white/10 hover:text-gray-300 hover:bg-white/10'
      } ${className}`}
      title={enabled ? 'Sound effects ON — click to mute' : 'Sound effects OFF — click to enable'}
      aria-label={enabled ? 'Mute sound effects' : 'Enable sound effects'}
    >
      {enabled ? (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      )}
      <span className="hidden sm:inline">{enabled ? 'SFX' : 'Muted'}</span>
    </button>
  );
}
