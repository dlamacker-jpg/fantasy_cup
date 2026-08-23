import { createContext, useContext, useState, useCallback, useRef } from 'react';

/**
 * Mario Kart-style sound effects using Web Audio API synthesis.
 * No external audio files needed — all sounds are generated programmatically.
 */

const SoundContext = createContext(null);

// ─── Sound synthesis functions ───
function createOscillator(ctx, type, freq, startTime, duration, gainValue = 0.3) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(gainValue, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

const SOUNDS = {
  // Coin collect — classic ascending ding
  coin: (ctx) => {
    const t = ctx.currentTime;
    createOscillator(ctx, 'square', 988, t, 0.08, 0.15);        // B5
    createOscillator(ctx, 'square', 1319, t + 0.08, 0.15, 0.15); // E6
  },

  // Power-up get — ascending arpeggio
  powerUp: (ctx) => {
    const t = ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      createOscillator(ctx, 'square', freq, t + i * 0.07, 0.12, 0.12);
    });
  },

  // 1-Up / level up — triumphant jingle
  levelUp: (ctx) => {
    const t = ctx.currentTime;
    const notes = [659, 784, 988, 784, 988, 1319]; // E5 G5 B5 G5 B5 E6
    notes.forEach((freq, i) => {
      createOscillator(ctx, 'square', freq, t + i * 0.09, 0.12, 0.1);
    });
  },

  // Navigation click — short blip
  click: (ctx) => {
    const t = ctx.currentTime;
    createOscillator(ctx, 'square', 800, t, 0.04, 0.08);
  },

  // Tab switch — two-tone
  tab: (ctx) => {
    const t = ctx.currentTime;
    createOscillator(ctx, 'square', 600, t, 0.04, 0.08);
    createOscillator(ctx, 'square', 900, t + 0.05, 0.06, 0.08);
  },

  // Race start countdown beep
  countdown: (ctx) => {
    const t = ctx.currentTime;
    createOscillator(ctx, 'sine', 440, t, 0.15, 0.2);
  },

  // Race GO! — higher pitch burst
  go: (ctx) => {
    const t = ctx.currentTime;
    createOscillator(ctx, 'square', 880, t, 0.08, 0.15);
    createOscillator(ctx, 'square', 1760, t + 0.08, 0.2, 0.15);
  },

  // Error / wrong — descending
  error: (ctx) => {
    const t = ctx.currentTime;
    createOscillator(ctx, 'square', 400, t, 0.1, 0.12);
    createOscillator(ctx, 'square', 300, t + 0.1, 0.15, 0.12);
  },

  // Trophy / achievement — fanfare
  trophy: (ctx) => {
    const t = ctx.currentTime;
    const notes = [523, 659, 784, 1047, 1319, 1568]; // C5 E5 G5 C6 E6 G6
    notes.forEach((freq, i) => {
      createOscillator(ctx, 'square', freq, t + i * 0.1, 0.18, 0.1);
      if (i >= 4) createOscillator(ctx, 'sine', freq * 0.5, t + i * 0.1, 0.25, 0.06);
    });
  },

  // Blue shell hit — descending wobble
  blueShell: (ctx) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.4);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  },

  // Boost / mushroom — rising whoosh
  boost: (ctx) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.2);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  },
};

export function SoundProvider({ children }) {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem('mk-sound-enabled') !== 'false';
    } catch {
      return true;
    }
  });
  const ctxRef = useRef(null);

  const getContext = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const play = useCallback((soundName) => {
    if (!enabled) return;
    try {
      const ctx = getContext();
      const soundFn = SOUNDS[soundName];
      if (soundFn) soundFn(ctx);
    } catch (e) {
      // Silently fail — audio is non-critical
    }
  }, [enabled, getContext]);

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      try { localStorage.setItem('mk-sound-enabled', String(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <SoundContext.Provider value={{ enabled, toggle, play, soundNames: Object.keys(SOUNDS) }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) return { enabled: false, toggle: () => {}, play: () => {}, soundNames: [] };
  return ctx;
}
