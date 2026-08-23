import { createContext, useContext, useState } from 'react';
import { SEASONS, DEFAULT_SEASON } from '../data/leagueConfig';

const SeasonContext = createContext();

export function SeasonProvider({ children }) {
  const [season, setSeason] = useState(DEFAULT_SEASON);

  const availableSeasons = Object.keys(SEASONS).sort((a, b) => b - a); // newest first

  return (
    <SeasonContext.Provider value={{ season, setSeason, availableSeasons }}>
      {children}
    </SeasonContext.Provider>
  );
}

export function useSeason() {
  const ctx = useContext(SeasonContext);
  if (!ctx) throw new Error('useSeason must be used within a SeasonProvider');
  return ctx;
}
